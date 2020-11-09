import { Injectable, HttpService } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { geonames, timezonedb, googleGeo } from '../.config';
import { geonamesApiBase, timezonedbApiBase } from './api';
import { objectToQueryString, mapToQueryString } from '../lib/converters';
import { AxiosResponse } from 'axios';
import * as moment from 'moment-timezone';
import { notEmptyString, isNumeric } from '../lib/validators';
import {
  filterDefaultName,
  filterToponyms,
  correctOceanTz,
} from './api/filters';
import { GeoPos } from 'src/astrologic/interfaces/geo-pos';
import {
  extractFromRedisClient,
  extractFromRedisMap,
  storeInRedis,
} from '../lib/entities';
import * as Redis from 'ioredis';
import { RedisService } from 'nestjs-redis';
import { GeoName } from './interfaces/geo-name.interface';

@Injectable()
export class GeoService {
  constructor(
    @InjectModel('GeoName') private readonly geoNameModel: Model<GeoName>,
    private http: HttpService,
    private readonly redisService: RedisService,
  ) {}

  getHttp(url: string): Promise<AxiosResponse> {
    return this.http.get(url).toPromise();
  }

  async redisClient(): Promise<Redis.Redis> {
    const redisMap = this.redisService.getClients();
    return extractFromRedisMap(redisMap);
  }

  async redisGet(key: string): Promise<any> {
    const client = await this.redisClient();
    return await extractFromRedisClient(client, key);
  }

  async redisSet(key: string, value): Promise<boolean> {
    const client = await this.redisClient();
    return await storeInRedis(client, key, value);
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

  async fetchTzData(coords: GeoPos, datetime: string, skipRemote = false) {
    const tz = await this.fetchGeoNames('timezoneJSON', coords);
    const { timezoneId } = tz;
    const key = ['tzdb', timezoneId, datetime.split(':').shift()].join('_');
    const storedTzData = await this.redisGet(key);
    let tzoData: any = {
      tz: tz.timezoneId,
      tzOffset: 0,
      valid: false,
    };
    const isValidTimezoneDBPayload = payload =>
      payload instanceof Object && Object.keys(payload).includes('offset');
    let valid = isValidTimezoneDBPayload(storedTzData);
    let tzOffset = 0;
    if (valid) {
      tzoData = storedTzData;
      tzOffset = tzoData.offset;
    } else {
      if (skipRemote) {
        tzOffset = this.checkGmtOffset(tz.timezoneId, datetime);
        valid = true;
      } else {
        tzoData = await this.fetchTimezoneOffset(timezoneId, datetime);
        valid = isValidTimezoneDBPayload(tzoData);
        if (valid) {
          this.redisSet(key, tzoData);
          tzOffset = tzoData.offset;
        } else {
          tzOffset = this.checkGmtOffset(tz.timezoneId, datetime);
        }
      }
    }
    return {
      tz: tz.timezoneId,
      tzOffset,
      valid,
    };
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
    const records = await this.matchStoredGeoName(placename);
    if (records.length > 0) {
      return {
        valid: true,
        items: records,
      };
    } else {
      return await this.searchByFuzzyAddressRemote(placename, geo);
    }
  }

  async searchByFuzzyAddressRemote(placename: string, geo: any = null) {
    const params: Map<string, any> = new Map();
    params.set('input', placename);
    params.set('key', googleGeo.apiKey);
    const qStr = mapToQueryString(params);
    const url =
      'https://maps.googleapis.com/maps/api/place/autocomplete/json' + qStr;
    const output = { valid: false, items: [], url };
    await this.getHttp(url).then(async response => {
      if (response) {
        const { data } = response;
        if (data instanceof Object) {
          output.items = await this.extractSuggestedItems(data, placename);
          output.items.sort((a, b) => b.pop - a.pop);
          output.valid = output.items.length > 0;
        }
      }
    });
    if (!output.valid) {
      output.items = await this.searchByPlaceName(placename);
      output.valid = output.items.length > 0;
    }
    if (output.valid) {
      if (output.items instanceof Array && output.items.length > 0) {
        output.items.forEach(item => {
          const altNames = [];
          const nameLength = item.name.length;
          const searchLength = placename.length;
          const minAltNameLength = 2;
          if (searchLength >= minAltNameLength) {
            const name = placename.toLowerCase().trim();
            const weight = (nameLength - name.length) * 10;
            altNames.push({
              name,
              type: 'partial',
              weight,
            });
          }
          this.saveGeoName({ ...item, altNames });
        });
      }
    }
    return output;
  }

  async matchStoredGeoName(search: string) {
    const rgx = new RegExp('\\b' + search);
    /* const criteria = {
      $or: [
        {
          name: rgx,
        },
        {
          'altNames.name': rgx,
        },
      ],
    }; */
    const criteria = { 'altNames.name': search.toLowerCase() };
    const records = await this.geoNameModel

      .find(criteria)
      .select({
        _id: 0,
        region: 1,
        country: 1,
        fcode: 1,
        lat: 1,
        lng: 1,
        pop: 1,
        name: 1,
        fullName: 1,
      })
      .sort({ pop: -1 });
    return records;
  }

  async saveGeoName(inData = null) {
    if (inData instanceof Object) {
      const records = await this.geoNameModel.find({
        name: inData.name,
        lng: inData.lng,
        lat: inData.lat,
      });
      if (records.length < 1) {
        const newGN = new this.geoNameModel(inData);
        newGN.save();
      } else {
        const { altNames } = inData;
        if (altNames.length > 0) {
          const first = records[0];
          const newAltNames =
            first.altNames instanceof Array ? first.altNames : [];
          altNames.forEach(altName => {
            if (
              newAltNames.some(
                an => an.name.toLowerCase() === altName.name.toLowerCase(),
              ) === false
            ) {
              newAltNames.push(altName);
            }
          });
          this.geoNameModel
            .findByIdAndUpdate(first._id, {
              altNames: newAltNames,
            })
            .exec();
        }
      }
    }
  }

  async extractSuggestedItems(data = null, placename = '') {
    const items = [];
    if (data instanceof Object) {
      const rgx = RegExp('\\b' + placename, 'i');
      const { predictions } = data;
      if (predictions instanceof Array) {
        for (const pred of predictions) {
          const results = await this.searchByPlaceName(
            pred.structured_formatting.main_text,
            '',
            0,
            5,
          );
          if (results instanceof Array && results.length > 0) {
            for (const item of results) {
              if (rgx.test(item.fullName)) {
                const isAdded = items.some(pl => {
                  return pl.lng === item.lng && pl.lat === item.lat;
                });
                if (!isAdded) {
                  items.push(item);
                }
              }
            }
          }
        }
      }
    }
    return items;
  }

  async getPlaceByGooglePlaceId(placeId: string) {
    const params: Map<string, any> = new Map();
    params.set('place_id', placeId);
    params.set('fields', 'address_components,geometry');
    params.set('key', googleGeo.apiKey);
    const qStr = mapToQueryString(params);
    const url =
      'https://maps.googleapis.com/maps/api/place/details/json' + qStr;

    let output: any = { valid: false };
    await this.getHttp(url).then(response => {
      if (response) {
        const { data } = response;
        if (data instanceof Object) {
          const { result } = data;
          if (result instanceof Object) {
            output = result;
          }
        }
      }
    });
    return output;
  }

  async searchByPlaceName(placename: string, cc = '', fuzzy = 1, max = 20) {
    const mp = new Map<string, string>();
    mp.set('q', decodeURI(placename));
    if (notEmptyString(cc)) {
      mp.set('countryBias', cc.toUpperCase());
    }
    if (fuzzy > 0) {
      mp.set('fuzzy', fuzzy.toString());
    }
    if (max > 0) {
      mp.set('maxRows', max.toString());
    }
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
