import { Injectable, HttpService } from '@nestjs/common';
import { geonames, timezonedb } from '../.config';
import { geonamesApiBase, timezonedbApiBase } from './api';
import { objectToQueryString, mapToQueryString } from '../lib/converters';
import { AxiosResponse } from 'axios';
import * as moment from 'moment-timezone';
import { notEmptyString, isNumeric, objHasKey } from 'src/lib/validators';

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
    let cc = '';
    if (data.valid) {
      const tzData = await this.fetchGeoNames('timezoneJSON', coords);
      if (tzData.valid) {
        const { geonames, ocean } = data;
        let geo = [];
        if (geonames instanceof Array) {
          geo = geonames
            .filter(gn => gn.fcode !== 'AREA')
            .map(row => {
              return {
                name: row.toponymName,
                lat: parseFloat(row.lat),
                lng: parseFloat(row.lng),
              };
            });
          console.log(geonames);
          const ccRow: any = geonames.filter(row =>
            objHasKey(row, 'countryCode'),
          );

          if (ccRow) {
            const { countryCode } = ccRow;
            cc = countryCode;
          }
        } else if (ocean instanceof Object) {
          const { name, distance } = ocean;
          geo = [
            {
              distance: parseFloat(distance),
              name,
            },
          ];
        }
        data = { ...tzData, cc, geo };
      }
    }
    return data;
  }

  async fetchGeoAndTimezone(lat: number, lng: number, datetime: string) {
    const data = await this.fetchGeoData(lat, lng);
    const offset = this.checkGmtOffset(data.timezoneId, datetime);
    return { ...data, offset };
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
    console.log(url);
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
      const mom = moment.utc(datetime).tz(zoneName),
        parts = mom.format('Z').split(':');
      if (parts.length > 1) {
        const hrs = parseInt(parts[0].replace('+', '')) * 3600;
        const mins = parseInt(parts[1]) * 60;
        gmtOffset = hrs + mins;
      }
    }
    return gmtOffset;
  }

  async matchLocations(search: string) {}
}
