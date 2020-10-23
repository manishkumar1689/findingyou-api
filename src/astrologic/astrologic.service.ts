import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BodySpeed } from './interfaces/body-speed.interface';
import { Chart } from './interfaces/chart.interface';
import { BodySpeedDTO } from './dto/body-speed.dto';
import { calcAcceleration, calcStation } from './lib/astro-motion';
import grahaValues from './lib/settings/graha-values';
import { calcJulDate, calcJulDateFromParts } from './lib/date-funcs';
import {
  isNumeric,
  notEmptyString,
  validISODateString,
} from '../lib/validators';
import { CreateChartDTO } from './dto/create-chart.dto';
import moment = require('moment');
import { PairedChartDTO } from './dto/paired-chart.dto';
import { PairedChart } from './interfaces/paired-chart.interface';
import { mapPairedCharts } from './lib/mappers';
import { RedisService } from 'nestjs-redis';
import {
  extractFromRedisClient,
  extractFromRedisMap,
  storeInRedis,
} from '../lib/entities';
import * as Redis from 'ioredis';
import { SimpleTransition } from './interfaces/simple-transition.interface';

@Injectable()
export class AstrologicService {
  constructor(
    @InjectModel('BodySpeed') private bodySpeedModel: Model<BodySpeed>,
    @InjectModel('Chart') private chartModel: Model<Chart>,
    @InjectModel('PairedChart') private pairedChartModel: Model<PairedChart>,
    private readonly redisService: RedisService,
  ) {}

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

  async createChart(data: CreateChartDTO) {
    let isNew = true;
    const adjustedDate = this.adjustDatetimeByServerTz(data);
    const saveData = { ...data, datetime: adjustedDate };
    if (data.isDefaultBirthChart) {
      const chart = await this.chartModel
        .findOne({
          user: data.user,
          isDefaultBirthChart: true,
        })
        .exec();
      if (chart instanceof Object) {
        const { _id } = chart;
        isNew = false;
        await this.chartModel
          .findByIdAndUpdate(_id, saveData, { new: false })
          .exec();
        return await this.chartModel.findById(_id);
      }
    }
    if (isNew) {
      return this.chartModel.create(saveData);
    }
  }

  adjustDatetimeByServerTz(data: any = null) {
    const tzMins = new Date().getTimezoneOffset();
    if (tzMins !== 0 && data instanceof Object) {
      /* const adjustedDate = moment
        .utc(data.datetime)
        .subtract(tzMins, 'minutes')
        .toISOString()
        .replace(/:\.\w+$/, ':00Z'); */
      const adjustedDate = moment
        .utc(data.datetime)
        .toISOString()
        .replace(/\.\w+$/, '.00Z');

      data = { ...data, datetime: new Date(adjustedDate) };
    }
    return data.datetime;
  }

  assignBaseChart(data: any) {
    const mp = new Map<string, any>();
    if (data instanceof Object) {
      Object.entries(data).forEach(entry => {
        const [key, value] = entry;
        switch (key) {
          case 'datetime':
          case 'jd':
          case 'geo':
          case 'tz':
          case 'tzOffset':
          case 'ascendant':
          case 'mc':
          case 'vertex':
          case 'grahas':
          case 'houses':
          case 'indianTime':
          case 'ayanamshas':
          case 'upagrahas':
          case 'sphutas':
          case 'numValues':
          case 'objects':
            mp.set(key, value);
            break;
        }
      });
    }
    return Object.fromEntries(mp);
  }

  // update existing with unique chartID
  async updateChart(chartID: string, data: CreateChartDTO) {
    const chart = await this.chartModel.findById(chartID).exec();
    if (chart instanceof Object) {
      const adjustedDate = this.adjustDatetimeByServerTz(data);
      await this.chartModel
        .findByIdAndUpdate(
          chartID,
          { ...data, datetime: adjustedDate, modifiedAt: new Date() },
          { new: false },
        )
        .exec();
      return await this.chartModel.findById(chartID);
    }
  }

  // get chart by ID
  async getChart(chartID: string): Promise<Chart> {
    let chart = null;
    await this.chartModel
      .findById(chartID)
      .then(c => (chart = c))
      .catch(console.log);
    return chart;
  }

  async savePaired(pairedDTO: PairedChartDTO) {
    const { c1, c2 } = pairedDTO;
    const numCharts = await this.chartModel
      .count({ _id: { $in: [c1, c2] } })
      .exec();
    let result: any = { valid: false };

    const nowDt = new Date();
    pairedDTO = { ...pairedDTO, modifiedAt: nowDt };
    if (numCharts === 2) {
      const currPairedChart = await this.pairedChartModel
        .findOne({
          c1,
          c2,
        })
        .exec();
      if (currPairedChart) {
        const { _id } = currPairedChart;
        result = await this.pairedChartModel.findByIdAndUpdate(_id, pairedDTO);
      } else {
        pairedDTO = { ...pairedDTO, createdAt: nowDt };
        const pairedChart = await this.pairedChartModel.create(pairedDTO);
        result = await pairedChart.save();
      }
      if (result) {
        result = await this.pairedChartModel.findById(result._id);
      }
    }
    return result;
  }

  async getPairedByUser(userID: string, limit = 0, params = null) {
    const max = limit > 0 && limit < 1000 ? limit : 1000;
    const criteria: Map<string, any> = new Map();
    if (notEmptyString(userID, 16)) {
      criteria.set('user', userID);
    }
    if (params instanceof Object) {
      Object.entries(params).forEach(entry => {
        const [key, val] = entry;
        switch (key) {
          case 'type':
            criteria.set('relType', val);
            break;
          case 'tag':
            criteria.set('tags.slug', val);
            break;
          case 'length_gt':
            criteria.set('span', {
              $gt: val,
            });
            break;
          case 'length_lt':
            criteria.set('span', {
              $lt: val,
            });
            break;
        }
      });
    }
    console.log(params, criteria);
    const items = await this.pairedChartModel
      .find(Object.fromEntries(criteria))
      .limit(max)
      .populate(['c1', 'c2'])
      .sort([['modifiedAt', -1]])
      .populate(['c1', 'c2'])
      .exec();
    return items.map(mapPairedCharts);
  }

  async getPairedByChart(
    chartID: string,
    sort = 'modifiedAt',
    limit = 0,
    chartID2 = '',
  ) {
    const max = limit > 0 && limit < 1000 ? limit : 1000;
    let sortDir = -1;
    switch (sort) {
      case 'subject.name':
        sortDir = 1;
        break;
    }
    const hasMatchC2 = notEmptyString(chartID2, 8);
    const cond1 = hasMatchC2 ? { c1: chartID, c2: chartID2 } : { c1: chartID };
    const cond2 = hasMatchC2 ? { c2: chartID, c1: chartID2 } : { c2: chartID };
    const items = await this.pairedChartModel
      .find({
        $or: [cond1, cond2],
      })
      .limit(limit)
      .sort([[sort, sortDir]])
      .populate(['c1', 'c2'])
      .exec();
    return items.map(mapPairedCharts);
  }

  async deletePaired(pairedID: string) {
    await this.pairedChartModel.findByIdAndDelete(pairedID);
    return pairedID;
  }

  async getChartsByUser(
    userID: string,
    start = 0,
    limit = 20,
    defaultOnly = false,
    queryParams = null,
  ) {
    const condMap = new Map<string, any>();
    let showUserFirst = start < 1;
    if (queryParams instanceof Object) {
      Object.entries(queryParams).map(entry => {
        const [key, val] = entry;
        if (typeof val === 'string') {
          showUserFirst = false;
          switch (key) {
            case 'name':
              condMap.set('subject.name', RegExp(val, 'i'));
              break;
            case 'id':
              condMap.set('_id', val);
              break;
          }
        }
      });
    }
    let first = null;
    if (showUserFirst) {
      first = await this.chartModel
        .findOne({ user: userID, isDefaultBirthChart: true })
        .exec();
    }

    condMap.set('user', userID);
    if (defaultOnly) {
      condMap.set('isDefaultBirthChart', true);
    }
    const others = await this.chartModel
      .find(Object.fromEntries(condMap))
      .sort({ modifiedAt: -1 })
      .skip(start)
      .limit(limit)
      .exec();
    const charts: Array<Chart> = [];
    if (first) {
      charts.push(first);
    }
    if (others.length > 0) {
      others.forEach(c => {
        charts.push(c);
      });
    }
    return charts;
  }

  // save a single body speed record
  async saveBodySpeed(data: BodySpeedDTO): Promise<BodySpeed> {
    const record = await this.bodySpeedModel
      .findOne({ jd: data.jd, num: data.num })
      .exec();
    if (record instanceof Object) {
      const { _id } = record;
      await this.bodySpeedModel
        .findByIdAndUpdate(_id, data, { new: false })
        .exec();
      return await this.bodySpeedModel.findById(_id);
    } else {
      const newBodySpeed = await this.bodySpeedModel.create(data);
      return newBodySpeed.save();
    }
  }

  async listByUser(userID: string) {
    return await this.chartModel
      .find({ user: userID })
      .sort({ isDefaultBirthChart: -1 })
      .exec();
  }

  async list(criteria: Map<string, any> = new Map<string, any>()) {
    const filter = Object.fromEntries(criteria);
    return await this.chartModel
      .find(filter)
      .sort({ isDefaultBirthChart: -1 })
      .exec();
  }

  async deleteChart(chartID: string) {
    return await this.chartModel.deleteOne({ _id: chartID });
  }

  async savePlanetStations(
    num: number,
    datetime: string,
    days: number,
  ): Promise<any> {
    const jd = calcJulDate(datetime);
    const body = grahaValues.find(b => b.num === num);
    let prevSpeed = 0;
    let data: any = { valid: false };
    for (let i = 0; i < days; i++) {
      const refJd = jd + i;
      data = await calcAcceleration(refJd, body);
      const { start, end } = data;

      if (i > 0) {
        const sd1: BodySpeedDTO = {
          num,
          speed: start.spd,
          lng: start.lng,
          jd: start.jd,
          datetime: start.datetime,
          acceleration: start.speed / prevSpeed,
          station: 'sample',
        };
        await this.saveBodySpeed(sd1);
      }

      const sd2: BodySpeedDTO = {
        num,
        speed: end.speed,
        lng: end.lng,
        jd: end.jd,
        datetime: end.datetime,
        acceleration: data.rate,
        station: 'sample',
      };
      await this.saveBodySpeed(sd2);
      prevSpeed = end.spd;
    }
    return data;
  }

  async saveBodySpeedStation(
    jd: number,
    num: number,
    station: string,
  ): Promise<BodySpeed> {
    const bs = await calcStation(jd, num, station);
    const saved = await this.saveBodySpeed(bs);
    return saved;
  }

  async nextPrevStation(
    num: number,
    jd: number,
    station: string,
    prev: boolean,
  ): Promise<BodySpeed> {
    const relCondition = prev ? { $lte: jd } : { $gte: jd };
    const sortDir = prev ? -1 : 1;
    return await this.bodySpeedModel
      .findOne({ num, jd: relCondition, station })
      .sort({ jd: sortDir })
      .limit(1)
      .exec();
  }

  async transitionsByPlanet(
    num: number,
    startYear = 2000,
    endYear = 2100,
  ): Promise<Array<SimpleTransition>> {
    const key = ['all-transitions-by-planet', num, startYear, endYear].join(
      '_',
    );
    const storedResults = await this.redisGet(key);
    let results = [];
    if (storedResults instanceof Array && storedResults.length > 0) {
      results = storedResults;
    } else {
      const dbResults = await this._transitionsByPlanet(
        num,
        startYear,
        endYear,
      );
      if (dbResults instanceof Array && dbResults.length > 0) {
        results = dbResults.map(item => {
          const { jd, datetime, num, speed, lng, acceleration, station } = item;
          return { jd, datetime, num, speed, lng, acceleration, station };
        });
        this.redisSet(key, results);
      }
    }
    return results;
  }

  async _transitionsByPlanet(
    num: number,
    startYear = 2000,
    endYear = 2100,
  ): Promise<Array<BodySpeed>> {
    const station = { $ne: 'sample' };
    const otherParams = { month: 1, day: 1, hour: 0 };
    const startJd = calcJulDateFromParts({ year: startYear, ...otherParams });
    const endJd = calcJulDateFromParts({ year: endYear, ...otherParams });
    const jd = { $gte: startJd, $lte: endJd };
    const criteria = num > 0 ? { num, station, jd } : { station, jd };
    const data = await this.bodySpeedModel
      .find(criteria)
      .sort({ jd: 1 })
      .limit(25000)
      .exec();
    return data;
  }

  async speedPatternsByPlanet(num: number): Promise<Array<BodySpeed>> {
    let minJd = 0;
    const last2 = await this.bodySpeedModel
      .find({ num, station: { $ne: 'sample' } })
      .sort({ jd: -1 })
      .limit(2)
      .exec();

    if (last2 instanceof Array && last2.length > 1) {
      minJd = last2[1].jd;
    }
    const data = await this.bodySpeedModel
      .find({ num, station: 'sample', jd: { $gt: minJd } })
      .sort({ jd: 1 })
      .limit(5000)
      .exec();
    let results: Array<BodySpeed> = [];
    if (data instanceof Array && data.length > 0) {
      let maxSpd = 0;
      let minSpd = 0;
      let maxMatched = false;
      let minMatched = false;
      let currPolarity = 1;
      let prevPolarity = 1;
      let prevRow: any = null;
      let rowsMatched = 0;
      data.forEach(row => {
        currPolarity = row.speed >= 0 ? 1 : -1;
        if (currPolarity > 0) {
          if (row.speed > maxSpd) {
            maxSpd = row.speed;
          } else if (!maxMatched && prevRow instanceof Object) {
            maxMatched = true;
            if (rowsMatched < 4) {
              results.push(prevRow);
              this.saveBodySpeedStation(prevRow.jd, num, 'peak');
            }
            rowsMatched++;
            maxSpd = -1;
          }
        }
        if (currPolarity < 0) {
          if (row.speed < minSpd) {
            minSpd = row.speed;
          } else if (!minMatched && prevRow instanceof Object) {
            minMatched = true;
            if (rowsMatched < 4) {
              results.push(prevRow);
              this.saveBodySpeedStation(prevRow.jd, num, 'retro-peak');
            }
            rowsMatched++;
            minSpd = 1;
          }
        }
        if (currPolarity !== prevPolarity && prevRow instanceof Object) {
          rowsMatched++;
          maxMatched = false;
          minMatched = false;
          maxSpd = -1;
          minSpd = 1;
          const rs = prevPolarity < 0 ? 'retro-end' : 'retro-start';
          this.saveBodySpeedStation(prevRow.jd, num, rs);
          results.push(row);
        }
        prevPolarity = currPolarity;
        prevRow = Object.assign({}, row.toObject());
        if (rowsMatched >= 4) {
          rowsMatched = 0;
        }
      });
    }
    return results;
  }

  async planetStations(
    num: number,
    datetime: string,
    fetchCurrent = false,
  ): Promise<Array<any>> {
    const fetchCurrentStr = fetchCurrent ? 'curr' : 'not';
    const key = ['planet-stations', num, datetime, fetchCurrentStr].join('_');
    let results = await this.redisGet(key);
    const valid = results instanceof Array && results.length > 0;
    if (valid) {
      return results;
    } else {
      results = await this._planetStations(num, datetime, fetchCurrent);
      if (results instanceof Array) {
        this.redisSet(key, results);
      }
    }
    return results;
  }

  async _planetStations(
    num: number,
    datetime: string,
    fetchCurrent = false,
  ): Promise<Array<any>> {
    let data = new Map<string, any>();
    data.set('valid', false);
    const stations = ['peak', 'retro-start', 'retro-peak', 'retro-end'];
    const assignDSRow = (
      data: Map<string, any>,
      station: string,
      mode: string,
      row: any,
    ) => {
      const { num, jd, datetime, lng, speed } = row;
      const ds = { num, jd, datetime, lng, speed, retro: speed < 0 };
      data.set([mode, station].join('__'), ds);
    };
    if (isNumeric(num) && validISODateString(datetime)) {
      const jd = calcJulDate(datetime);
      if (fetchCurrent) {
        const current = await calcAcceleration(jd, { num });
        if (current instanceof Object) {
          const { start, end } = current;
          if (start instanceof Object) {
            data.set('current__spot', {
              ...start,
              retro: start.speed < 0,
              num,
            });
            data.set('current__plus-12h', {
              ...end,
              retro: end.speed < 0,
              num,
              acceleration: current.rate,
              rising: current.rising,
              switching: current.switching,
            });
          }
        }
      }
      for (const station of stations) {
        const row = await this.nextPrevStation(num, jd, station, true);
        if (row instanceof Object) {
          assignDSRow(data, station, 'prev', row);
        }
        const row2 = await this.nextPrevStation(num, jd, station, false);
        if (row2 instanceof Object) {
          assignDSRow(data, station, 'next', row2);
        }
      }
    }
    const results: Array<any> = [];
    [...data.entries()].forEach(entry => {
      const [key, row] = entry;
      if (row instanceof Object) {
        results.push({
          station: key,
          ...row,
        });
      }
    });
    results.sort((a, b) => a.jd - b.jd);
    return results;
  }
}
