import { Injectable, HttpService } from '@nestjs/common';
import { geonames, timezonedb, googleGeo } from '../.config';
import { geonamesApiBase, timezonedbApiBase } from './api';
import { objectToQueryString, mapToQueryString } from '../lib/converters';
import { AxiosResponse } from 'axios';
import * as moment from 'moment-timezone';
import { notEmptyString, isNumeric } from 'src/lib/validators';
import {
  filterDefaultName,
  filterToponyms,
  correctOceanTz,
} from './api/filters';
import { fchmodSync } from 'fs';
import { toDateParts } from 'src/astrologic/lib/date-funcs';

@Injectable()
export class GeoService {
  constructor(private http: HttpService) {}

  getHttp(url: string): Promise<AxiosResponse> {
    return this.http.get(url).toPromise();
  }

  async fetchGeoNames(method: string, params: any) {
    let queryParams: any = {};
    let queryString = '';
    let result: any = { valid: false };
    if (params instanceof Object) {
      queryParams = { username: geonames.username, ...params };
      queryString = objectToQueryString(queryParams);
    }
    const url = [geonamesApiBase, method].join('/') + queryString;
    await this.getHttp(url).then(response => {
      if (response instanceof Object) {
        const { data } = response;
        if (data instanceof Array) {
          result = { valid: true, values: data };
        } else if (data instanceof Object) {
          result = { valid: true, ...data };
        }
      }
    });
    return result;
  }

  async fetchGeoData(lat: number, lng: number) {
    const coords = { lat, lng };
    let data = await this.fetchGeoNames('extendedFindNearbyJSON', coords);
    if (data.valid) {
      const tzData = await this.fetchGeoNames('timezoneJSON', coords);
      if (tzData.valid) {
        const { ocean, address } = data;
        let { geonames } = data;
        const { countryCode, countryName, timezoneId } = tzData;
        const excludeTypes = ['AREA', 'ADM3'];
        let toponyms = [];
        const hasToponyms = geonames instanceof Array && geonames.length;
        if (!hasToponyms && address instanceof Object) {
          const keyMap = {
            adminName1: 'ADM1',
            adminName2: 'ADM2',
            placename: 'PPLL',
            street: 'STRT',
            postalcode: 'PSCD',
          };
          geonames = Object.entries(keyMap)
            .filter(entry => {
              const [k, v] = entry;
              let valid = address.hasOwnProperty(k);
              if (valid) {
                valid = notEmptyString(address[k]);
              }
              return valid;
            })
            .map(entry => {
              const [key, fcode] = entry;
              const name = address[key];
              return {
                lat,
                lng,
                name,
                toponymName: name,
                fcode,
              };
            });
        }
        if (geonames instanceof Array) {
          if (geonames.length > 2) {
            excludeTypes.push('CONT');
          }
          toponyms = geonames
            .filter(gn => !excludeTypes.includes(gn.fcode))
            .map(row => {
              return {
                name: filterDefaultName(
                  row.name,
                  row.toponymName,
                  row.fcode,
                  countryCode,
                ),
                fullName: row.toponymName,
                type: row.fcode,
                lat: parseFloat(row.lat),
                lng: parseFloat(row.lng),
              };
            });
        } else if (ocean instanceof Object) {
          const { name } = ocean;
          toponyms = [
            {
              name,
              fullName: name,
              type: 'SEA',
              lat,
              lng,
            },
          ];
        }

        const zd = {
          countryName,
          cc: countryCode,
          tz: timezoneId,
        };
        data = {
          ...zd,
          toponyms: filterToponyms(toponyms),
        };
      }
    }
    return data;
  }

  async fetchGeoAndTimezone(lat: number, lng: number, datetime: string) {
    const data = await this.fetchGeoData(lat, lng);
    const offset = this.checkGmtOffset(data.tz, datetime);
    return { ...data, offset: correctOceanTz(data.toponyms, offset) };
  }

  async fetchTimezoneOffset(zoneRef: any, datetime: string) {
    const params = new Map<string, any>();
    params.set('key', timezonedb.apiKey);
    params.set('format', 'json');
    const addLatLng = (params: Map<string, any>, lat: number, lng: number) => {
      params.set('lat', lat);
      params.set('lng', lng);
      params.set('by', 'position');
    };
    if (zoneRef instanceof Array) {
      const nums = zoneRef.filter(isNumeric).map(parseFloat);
      if (nums.length > 1) {
        const [lat, lng] = nums;
        addLatLng(params, lat, lng);
      }
    } else if (zoneRef instanceof Object) {
      const { lat, lng } = zoneRef;
      if (isNumeric(lat) && isNumeric(lng)) {
        addLatLng(params, parseFloat(lat), parseFloat(lng));
      }
    } else if (notEmptyString(zoneRef, 4)) {
      params.set('zone', zoneRef);
      params.set('by', 'zone');
    }
    const dp = datetime.split('T');
    let time = '12:00:00';
    const date = dp[0];
    if (dp.length > 1 && /^\d\d?:\d\d*/.test(dp[1])) {
      time = dp[1].split(':').shift() + ':00:00';
    }
    const dt =
      date === 'NOW' ? moment.utc() : moment.utc([date, time].join('T'));
    const ts = parseInt(dt.format('x')) / 1000;
    let result: any = { valid: false };
    params.set('time', ts);
    const url = timezonedbApiBase + mapToQueryString(params);
    await this.getHttp(url).then(response => {
      if (response instanceof Object) {
        const { data } = response;
        if (data instanceof Array) {
          result = { valid: true, values: data };
        } else if (data instanceof Object) {
          result = {
            valid: true,
            offset: data.gmtOffset,
            zone: data.zoneName,
            start: moment(data.dstStart * 1000),
            end: moment(data.dstEnd * 1000),
            dt: data.formatted,
          };
        }
      }
    });
    return result;
  }

  checkGmtOffset(zoneName: string, datetime: any): number {
    let gmtOffset = 0;
    if (notEmptyString(zoneName, 4)) {
      const mom = moment.utc(datetime).tz(zoneName);
      const parts = mom.format('Z').split(':');
      if (parts.length > 1) {
        const hrs = parseInt(parts[0].replace('+', '')) * 3600;
        const mins = parseInt(parts[1]) * 60;
        gmtOffset = hrs + mins;
      }
    }
    return gmtOffset;
  }

  async searchByFuzzyAddress(placename: string, geo: any = null) {
    const apiBase =
      'https://maps.googleapis.com/maps/api/place/autocomplete/json?key=' +
      googleGeo.apiKey +
      '&types=(cities)&input=';
    const url = apiBase + placename;
    const output = { valid: false, items: [], url };
    await this.getHttp(url).then(response => {
      if (response) {
        const { data } = response;
        if (data instanceof Object) {
          const { predictions } = data;
          if (predictions instanceof Array) {
            output.items = predictions;
          }
        }
      }
    });
    return output;
  }

  async searchByPlaceName(placename: string, cc = '') {
    const mp = new Map<string, string>();
    mp.set('q', decodeURI(placename));
    if (notEmptyString(cc)) {
      mp.set('countryBias', cc.toUpperCase());
    }
    mp.set('fuzzy', '1');
    let items = [];
    const data = await this.fetchGeoNames('searchJSON', Object.fromEntries(mp));
    const fcs = [
      'PPL',
      'PPLX',
      'PPLA',
      'PPLA1',
      'PPLA2',
      'PPLA3',
      'PPLC',
      'ADM3',
    ];
    if (data instanceof Object) {
      const { geonames } = data;
      const keys: Array<string> = [];
      if (geonames instanceof Array) {
        const entries = geonames
          .filter(tp => fcs.includes(tp.fcode))
          .forEach(fc => {
            const {
              lat,
              lng,
              name,
              toponymName,
              adminName1,
              countryName,
              population,
              fcode,
            } = fc;
            let country = countryName;
            let region = adminName1;
            switch (fc.countryCode) {
              case 'US':
              case 'USA':
                country = 'USA';
                break;
              case 'GB':
              case 'UK':
                country = 'UK';
                break;
            }
            const regSlug = fc.adminName1.toLowerCase();
            switch (regSlug) {
              case 'scotland':
              case 'wales':
              case 'northern ireland':
              case 'england':
                country = adminName1;
                region = '';
                break;
            }
            const key = [toponymName, region, country].join(' ').toLowerCase();
            if (!keys.includes(key)) {
              keys.push(key);
              items.push({
                lat,
                lng,
                name,
                fullName: toponymName,
                region,
                country,
                pop: population,
                fcode,
              });
            }
          });
      }
      items.sort((a, b) => b.pop - a.pop);
    }
    return items;
  }
}
