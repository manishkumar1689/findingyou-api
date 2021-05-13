import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BodySpeed } from './interfaces/body-speed.interface';
import { Chart } from './interfaces/chart.interface';
import { BodySpeedDTO } from './dto/body-speed.dto';
import { calcAcceleration, calcStation } from './lib/astro-motion';
import grahaValues from './lib/settings/graha-values';
import roddenScaleValues, {
  matchRoddenKeyValue,
} from './lib/settings/rodden-scale-values';
import {
  addOrbRangeMatchStep,
  buildLngRanges,
  buildPairedChartLookupPath,
  buildPairedChartProjection,
  unwoundChartFields,
  yearSpanAddFieldSteps,
} from './../lib/query-builders';
import {
  calcJulDate,
  calcJulDateFromParts,
  julToISODateObj,
} from './lib/date-funcs';
import {
  emptyString,
  isNumber,
  isNumeric,
  notEmptyString,
  validISODateString,
} from '../lib/validators';
import { CreateChartDTO } from './dto/create-chart.dto';
import moment = require('moment');
import { PairedChartDTO } from './dto/paired-chart.dto';
import { PairedChart } from './interfaces/paired-chart.interface';
import { mapPairedCharts, mapSubChartMeta } from './lib/mappers';
import { RedisService } from 'nestjs-redis';
import {
  extractFromRedisClient,
  extractFromRedisMap,
  storeInRedis,
} from '../lib/entities';
import * as Redis from 'ioredis';
import { SimpleTransition } from './interfaces/simple-transition.interface';
import {
  matchDefaultVocabOptionKeys,
  SlugNameVocab,
  matchVocabKey,
} from './lib/settings/vocab-values';
import { calcAllAspects } from './lib/core';
import { Chart as ChartClass } from './lib/models/chart';
import { Kuta } from './lib/kuta';
import { AspectSet } from './lib/calc-orbs';
import { sanitize, smartCastInt } from '../lib/converters';
import { KeyValue } from './interfaces/key-value';
import { TagDTO } from './dto/tag.dto';
import { shortenName, generateNameSearchRegex } from './lib/helpers';
import { minRemainingPaired } from 'src/.config';

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

  async getCoreAdjustedValues(
    ayanamshaKey = 'true_citra',
    start = 0,
    limit = 100,
  ) {
    const steps = unwoundChartFields(ayanamshaKey, start, limit);
    return await this.chartModel.aggregate(steps);
  }

  async getPairedChartSteps(ids: Array<string> = [], max = 1000) {
    const lookupSteps = buildPairedChartLookupPath();
    const projectionStep = buildPairedChartProjection();
    const steps = [
      ...lookupSteps,
      {
        $project: projectionStep,
      },
    ];
    steps.push({
      $match: {
        _id: {
          $in: ids,
        },
      },
    });
    steps.push({ $limit: max });
    return steps;
  }

  async getPairedCharts(
    start = 0,
    max = 1000,
    fieldFilters: Array<string> = [],
    criteria = null,
    countMode = false,
  ) {
    const hasCriteria =
      criteria instanceof Object && Object.keys(criteria).length > 0;
    const lookupSteps = buildPairedChartLookupPath();
    const addSteps = yearSpanAddFieldSteps();
    const steps = [...lookupSteps, ...addSteps];
    if (!countMode) {
      steps.push({
        $project: buildPairedChartProjection(fieldFilters, true),
      });
    }
    if (hasCriteria) {
      const cm: Map<string, any> = new Map();
      let qualityTags = [];
      const extraTags = [];
      let tagsOp = 'or';
      Object.entries(criteria).forEach(entry => {
        const [k, v] = entry;
        if (typeof v === 'string') {
          switch (k) {
            case 'tags':
              qualityTags = v.split(',');
              break;
            case 'gt':
            case 'lt':
            case 'gte':
            case 'lte':
              const refKey = ['$', k].join('');
              cm.set('yearLength', { [refKey]: smartCastInt(v, 0) });
              break;
            case 'relType':
            case 'type':
              cm.set('relType', v);
              break;
            case 'tagsOp':
              tagsOp = v;
              break;
            case 'endWho':
            case 'endHow':
              extraTags.push(v);
              break;
            case 'rating':
              const roddenItem = matchRoddenKeyValue(v);
              const roddenCompare = {
                [roddenItem.comparison]: roddenItem.value,
              };
              cm.set('$and', [
                {
                  'c1.subject.roddenValue': roddenCompare,
                },
                {
                  'c2.subject.roddenValue': roddenCompare,
                },
              ]);
              break;
            case 'search':
              const pattern = new RegExp(
                '\\b' + generateNameSearchRegex(v),
                'i',
              );
              cm.set('$or', [
                { 'c1.subject.name': { $regex: pattern } },
                {
                  'c2.subject.name': { $regex: pattern },
                },
              ]);
              break;
          }
        }
      });
      if (qualityTags.length > 0 || extraTags.length > 0) {
        const tagsMap: Map<string, any> = new Map();
        const allTags =
          tagsOp === 'and' ? [...qualityTags, ...extraTags] : extraTags;
        const inTags = tagsOp !== 'and' ? qualityTags : [];
        if (inTags.length > 0) {
          tagsMap.set('$in', inTags);
        }
        if (allTags.length > 0) {
          tagsMap.set('$all', allTags);
        }
        cm.set('tags.slug', Object.fromEntries(tagsMap.entries()));
      }
      steps.push({
        $match: Object.fromEntries(cm.entries()),
      });
    }
    if (countMode) {
      steps.push({ $count: 'total' });
    }
    steps.push({ $skip: start });
    steps.push({ $limit: max });
    return await this.pairedChartModel.aggregate(steps);
  }

  async matchPairedIdsByChartId(chartID: string, fetchNames = false) {
    const ids = await this.pairedChartModel
      .find({
        $or: [{ c1: chartID }, { c2: chartID }],
      })
      .select({ _id: 1, c1: 1, c2: 1 });

    const cID = chartID.toString();
    const rows = ids.map(row => {
      const refNum =
        row.c1.toString() === cID ? 1 : row.c2.toString() === cID ? 2 : 0;

      const chartId = refNum === 2 ? row.c1.toString() : row.c2.toString();
      return { id: row._id, chartId, refNum };
    });
    if (fetchNames) {
      const items = [];
      const defaultRow = {
        datetime: '',
        tzOffset: 0,
        subject: { name: '', gender: '' },
      };
      for (const row of rows) {
        const cRow = await this.chartModel
          .findById(row.chartId)
          .select('-_id datetime tzOffset subject.name subject.gender');
        const info = cRow instanceof Object ? cRow.toObject() : defaultRow;
        const { datetime, tzOffset, subject } = info;
        const { name, gender } = subject;

        if (notEmptyString(name)) {
          items.push({ ...row, name, gender, datetime, tzOffset });
        }
      }
      return items;
    } else {
      return rows;
    }
  }

  async numPairedCharts(criteria = null, max = 1) {
    const rows = await this.getPairedCharts(0, max, [], criteria, true);
    if (rows instanceof Array && rows.length > 0) {
      const first = rows.shift();
      if (first instanceof Object) {
        return first.total;
      }
    }
    return 0;
  }

  async getCorePairedFields(start = 0, limit = 1000) {
    const steps = [
      {
        $skip: start,
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: 'charts',
          localField: 'c1',
          foreignField: '_id',
          as: 'c1',
        },
      },
      {
        $lookup: {
          from: 'charts',
          localField: 'c2',
          foreignField: '_id',
          as: 'c2',
        },
      },
      { $unwind: '$c1' },
      { $unwind: '$c2' },
      {
        $project: {
          c1: '$c1._id',
          p1: '$c2.subject.name',
          p1Dob: '$c1.datetime',
          p1Lat: '$c1.geo.lat',
          p1Lng: '$c1.geo.lng',
          c2: '$c2._id',
          p2: '$c1.subject.name',
          p2Dob: '$c2.datetime',
          p2Lat: '$c2.geo.lat',
          p2Lng: '$c2.geo.lng',
          relType: 1,
          tags: '$tags.slug',
        },
      },
    ];
    return this.pairedChartModel.aggregate(steps);
  }

  async getPairedByIds(ids: Array<string> = [], max = 1000) {
    const lookupSteps = buildPairedChartLookupPath();
    const projectionStep = buildPairedChartProjection();
    const steps = [
      ...lookupSteps,
      {
        $project: projectionStep,
      },
    ];
    steps.push({
      $match: {
        _id: {
          $in: ids,
        },
      },
    });
    steps.push({ $limit: max });
    return await this.pairedChartModel.aggregate(steps);
  }

  async getPairedRandom() {
    const count = await this.pairedChartModel.count({});
    const skip = Math.floor(Math.random() * count * 0.999999);
    const lookupSteps = buildPairedChartLookupPath();
    const projectionStep = buildPairedChartProjection();
    const steps = [
      { $skip: skip },
      { $limit: 1 },
      ...lookupSteps,
      {
        $project: projectionStep,
      },
    ];

    const items = await this.pairedChartModel.aggregate(steps);
    return items.length > 0 ? items[0] : null;
  }

  /* 
    c1: chart 1 id in dual mode, paired chart id in single mode
    c2: chart 1 id in dual mode, 'single' flag in single mode
    NB: related charts will not deleted in single mode
  */
  async removePairedAndCharts(c1: string, c2: string, removeCharts = false) {
    const data = { paired: null, chart1: null, chart2: null };
    const singleDeleteMode = c2 === 'single';
    const filter: Map<string, string> = new Map();
    if (singleDeleteMode) {
      filter.set('_id', c1);
    } else {
      filter.set('c1', c1);
      filter.set('c2', c2);
    }
    const criteria = Object.fromEntries(filter.entries());
    data.paired = await this.pairedChartModel.findOneAndDelete(criteria);
    if (removeCharts && !singleDeleteMode) {
      const pairedRefs1 = await this.matchPairedIdsByChartId(c1);
      if (pairedRefs1.length < 1) {
        data.chart1 = await this.deleteChart(c1);
      }
      const pairedRefs2 = await this.matchPairedIdsByChartId(c2);
      if (pairedRefs2.length < 1) {
        data.chart2 = await this.deleteChart(c2);
      }
    }
    return data;
  }

  async findPairings(c1: string, c2: string) {
    const pairing1 = await this.pairedChartModel.aggregate([
      {
        $lookup: {
          from: 'charts',
          localField: 'c1',
          foreignField: '_id',
          as: 'chart1',
        },
      },
      {
        $lookup: {
          from: 'charts',
          localField: 'c2',
          foreignField: '_id',
          as: 'chart2',
        },
      },
      {
        $match: {
          $or: [
            {
              c1,
            },
            {
              c1: c2,
            },
          ],
          'chart1.isDefaultBirthChart': false,
        },
      },
      {
        $project: {
          c1: 1,
          c2: 1,
        },
      },
    ]);
    const pairing2 = await this.pairedChartModel.aggregate([
      {
        $lookup: {
          from: 'charts',
          localField: 'c1',
          foreignField: '_id',
          as: 'chart1',
        },
      },
      {
        $lookup: {
          from: 'charts',
          localField: 'c2',
          foreignField: '_id',
          as: 'chart2',
        },
      },
      {
        $match: {
          $or: [
            {
              c2,
            },
            {
              c2: c1,
            },
          ],
          'chart1.isDefaultBirthChart': false,
          'chart2.isDefaultBirthChart': false,
        },
      },
      {
        $project: {
          c1: 1,
          c2: 1,
        },
      },
    ]);

    const pairEqual = row =>
      (row.c1.toString() === c1.toString() &&
        row.c2.toString() === c2.toString()) ||
      (row.c1.toString() === c2.toString() &&
        row.c2.toString() === c1.toString());

    const pc1 = pairing1.filter(row => !pairEqual(row)).length;
    const pc2 = pairing2.filter(row => !pairEqual(row)).length;
    return { pc1, pc2 };
  }

  async migrateRodden(start = 0, limit = 1000) {
    const mp: Map<string, any> = new Map();
    const items = await this.list(mp, start, limit, true);
    const editedIds = [];
    for (const item of items) {
      const { _id, subject } = item;
      if (subject instanceof Object) {
        const { roddenScale, roddenValue } = subject;
        if (typeof roddenValue !== 'number' || roddenValue < 50) {
          const rKey = notEmptyString(roddenScale) ? roddenScale : 'XX';
          const rv = roddenScaleValues.find(ri => ri.key === rKey);
          if (rv instanceof Object) {
            const { value } = rv;
            const newSubject = { ...subject, roddenValue: value };
            await this.chartModel
              .findByIdAndUpdate(_id.toString(), {
                subject: newSubject,
              })
              .exec();
            editedIds.push(_id.toString());
          }
        }
      }
    }
    return editedIds;
  }

  async filterPairedByAspect(
    aspectKey: string,
    k1: string,
    k2: string,
    orb = 1,
  ) {
    const { steps, outFieldProject, conditions } = addOrbRangeMatchStep(
      aspectKey,
      k1,
      k2,
      orb,
    );
    const projectionStep = {
      $project: outFieldProject,
    };
    const comboSteps = [...steps, projectionStep, ...conditions];
    //const c = conditions.find(cond => Object.keys(cond).includes('$match'));
    return await this.pairedChartModel.aggregate(comboSteps);
  }

  async filterPairedByKutas(
    settingsMap: Map<string, any>,
    kutaKey: string,
    k1: string,
    k2: string,
    range = [0, 0],
  ) {
    const matchMax = (refKey: string) => {
      const row = settingsMap.get(refKey);
      let maxInt = 5;
      if (row instanceof Object) {
        const { max } = row;
        if (isNumber(max)) {
          maxInt = max;
        }
      }
      return maxInt;
    };
    const max = matchMax(kutaKey);
    const percRange =
      range instanceof Array && range.length > 1 ? range : [0, 0];
    const kutaRange = percRange.map(n => (n / 100) * max);
    const steps = this.buildKutaSteps(k1, k2, kutaKey, kutaRange);
    const items = await this.pairedChartModel.aggregate(steps);
    return { items, range, max };
  }

  buildKutaSteps(k1: string, k2: string, kutaKey = '', range = [0, 5]) {
    const [min, max] =
      range instanceof Array && range.length > 1 ? range : [0, 5];
    return [
      {
        $addFields: {
          row: {
            $filter: {
              input: '$kutas',
              as: 'krow',
              cond: {
                $and: [{ $eq: ['$$krow.k1', k1] }, { $eq: ['$$krow.k2', k2] }],
              },
            },
          },
        },
      },
      {
        $unwind: '$row',
      },
      {
        $addFields: {
          kv: {
            $filter: {
              input: '$row.values',
              as: 'vrow',
              cond: { $eq: ['$$vrow.key', kutaKey] },
            },
          },
        },
      },
      {
        $unwind: '$kv',
      },
      {
        $project: {
          key: '$kv.key',
          value: '$kv.value',
        },
      },
      {
        $match: {
          value: { $gte: min, $lte: max },
        },
      },
      {
        $limit: 1000000,
      },
    ];
  }

  async filterPairedByAspectSets(
    aspectSets: Array<AspectSet>,
    start = 0,
    limit = 0,
  ) {
    const projSteps = [];
    const condSteps = [];
    const outFieldProjections = [];
    for (let i = 0; i < aspectSets.length; i++) {
      const { key, k1, k2, orb } = aspectSets[i];
      const { steps, outFieldProject, conditions } = addOrbRangeMatchStep(
        key,
        k1,
        k2,
        orb,
        i,
      );
      steps.forEach(step => {
        projSteps.push(step);
      });
      conditions.forEach(step => {
        condSteps.push(step);
      });
      outFieldProjections.push(outFieldProject);
    }
    let outFieldCombo: any = {};
    for (const outFields of outFieldProjections) {
      outFieldCombo = { ...outFieldCombo, ...outFields };
    }
    const outFieldsProjectStep = {
      $project: outFieldCombo,
    };
    const condStep = {
      $match: {
        $and: condSteps.map(cs => cs.$match),
      },
    };
    const comboSteps = [...projSteps, outFieldsProjectStep, condStep];
    if (start > 0) {
      comboSteps.push({ $skip: start });
    }
    if (limit > 0) {
      comboSteps.push({ $limit: limit });
    }
    return await this.pairedChartModel.aggregate(comboSteps);
  }

  async findAspectMatch(
    k1: string,
    k2: string,
    sourceGrahaLng: number,
    aspect: string,
    orb = -1,
    ayanamshaKey = 'true_citra',
    mode = 'rows',
  ) {
    const ranges = buildLngRanges(aspect, k1, k2, sourceGrahaLng, orb);
    const $project =
      mode !== 'count'
        ? { cid: '$_id', uid: '$user', lng: 1, ayanamsha: '$ayanamshas.value' }
        : { _id: 1 };
    const steps = [
      { $limit: 10000000 },
      { $unwind: '$ayanamshas' },
      { $match: { 'ayanamshas.key': ayanamshaKey } },
      { $unwind: '$grahas' },
      { $match: { 'grahas.key': k2 } },
      {
        $addFields: {
          lng: {
            $mod: [
              {
                $add: [
                  '$grahas.lng',
                  360,
                  { $subtract: [0, '$ayanamshas.value'] },
                ],
              },
              360,
            ],
          },
        },
      },
      { $match: { $or: ranges } },
      { $project },
    ];
    return this.chartModel.aggregate(steps);
  }

  async countByAspectMatch(
    k1: string,
    k2: string,
    sourceGrahaLng: number,
    aspect: string,
    orb = -1,
    ayanamshaKey = 'true_citra',
    mode = 'rows',
  ) {
    return await this.findAspectMatch(
      k1,
      k2,
      sourceGrahaLng,
      aspect,
      orb,
      ayanamshaKey,
      'rows',
    );
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
    const chart = await this.chartModel.findById(chartID);
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

  async bulkUpdatePaired(start = 0, limit = 100, kutaSet = null, idStr = '') {
    const filter: any = notEmptyString(idStr, 16) ? { _id: idStr } : {};
    const records = await this.pairedChartModel
      .find(filter)
      .skip(start)
      .limit(limit);
    let updated = 0;
    const ids: Array<string> = [];
    for (const record of records) {
      const { aspects, kutas } = await this.saveExtraValues(
        record.c1,
        record.c2,
        kutaSet,
      );
      if (aspects.length > 0) {
        const saved = await this.pairedChartModel.findByIdAndUpdate(
          record._id,
          { aspects, kutas },
          {
            new: false,
          },
        );
        ids.push(record._id);
        updated++;
      }
    }
    return {
      start,
      limit,
      updated,
      ids,
    };
  }

  async savePaired(pairedDTO: PairedChartDTO, setting = null, isNew = false) {
    const { c1, c2 } = pairedDTO;
    const numCharts = await this.chartModel
      .count({ _id: { $in: [c1, c2] } })
      .exec();
    let result: any = { valid: false };

    const nowDt = new Date();
    const { aspects, kutas } = await this.saveExtraValues(c1, c2, setting);
    pairedDTO = { ...pairedDTO, aspects, kutas, modifiedAt: nowDt };
    if (numCharts === 2) {
      const currPairedChart = await this.pairedChartModel
        .findOne({
          c1,
          c2,
        })
        .exec();
      if (currPairedChart && !isNew) {
        const { _id } = currPairedChart;
        result = await this.pairedChartModel.findByIdAndUpdate(_id, pairedDTO);
      } else {
        pairedDTO = { ...pairedDTO, createdAt: nowDt };
        const pairedChart = await this.pairedChartModel.create(pairedDTO);
        result = await pairedChart.save();
      }
      if (result) {
        result = await this.pairedChartModel
          .findById(result._id)
          .populate(['c1', 'c2']);
      }
    }
    return result;
  }

  async updatePairedChartIds(pairedID = '', chartID = '', refNum = 0) {
    const params = refNum === 1 ? { c1: chartID } : { c2: chartID };
    return await this.pairedChartModel.findById(pairedID, params);
  }

  async saveExtraValues(c1: string, c2: string, kutaSet = null) {
    let kutas = [];
    let aspects = [];
    if (kutaSet instanceof Map) {
      const c1C = await this.chartModel.findById(c1);
      const c2C = await this.chartModel.findById(c2);
      if (c1C instanceof Object && c2C instanceof Object) {
        const chart1 = new ChartClass(c1C.toObject());
        const chart2 = new ChartClass(c2C.toObject());
        chart1.setAyanamshaItemByNum(27);
        chart2.setAyanamshaItemByNum(27);
        const kutaBuilder = new Kuta(chart1, chart2);
        kutaBuilder.loadCompatibility(kutaSet);
        kutas = kutaBuilder.calcAllSingleKutas();
        aspects = calcAllAspects(chart1, chart2);
      }
    }
    return { aspects, kutas };
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
          case 'ids':
            criteria.set('_id', {
              $in: val,
            });
            break;
        }
      });
    }

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
    relType = '',
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

  async getPairedBySearchString(
    userID: string,
    search = '',
    isAdmin = false,
    limit = 20,
  ) {
    const max = limit > 0 && limit < 1000 ? limit : 1000;
    const rgx = new RegExp('\\b' + search, 'i');
    const criteria: Map<string, any> = new Map();

    if (!isAdmin) {
      criteria.set('user', userID);
    }
    criteria.set('$or', [
      {
        'chart1.subject.name': rgx,
      },
      {
        'chart2.subject.name': rgx,
      },
    ]);

    const chartFields = {
      _id: 1,
      datetime: 1,
      jd: 1,
      geo: {
        lng: 1,
        lat: 1,
      },
      placenames: {
        type: 1,
        name: 1,
      },
      subject: {
        name: 1,
        gender: 1,
      },
    };

    const items = await this.pairedChartModel
      .aggregate([
        {
          $lookup: {
            from: 'charts',
            localField: 'c1',
            foreignField: '_id',
            as: 'chart1',
          },
        },
        {
          $lookup: {
            from: 'charts',
            localField: 'c2',
            foreignField: '_id',
            as: 'chart2',
          },
        },
        {
          $match: Object.fromEntries(criteria),
        },
        {
          $project: {
            _id: 1,
            jd: 1,
            relType: 1,
            timespace: {
              jd: 1,
              tzOffset: 1,
            },
            surfaceTzOffset: 1,
            chart1: chartFields,
            chart2: chartFields,
            modifiedAt: 1,
          },
        },
      ])
      .limit(limit)
      .exec();
    return items.map(item => {
      const { _id, timespace, relType, chart1, chart2, modifiedAt } = item;
      const c1 = mapSubChartMeta(chart1);
      const c2 = mapSubChartMeta(chart2);
      const jd = (c1.jd + c2.jd) / 2;
      const offset =
        typeof timespace.surfaceTzOffset === 'number'
          ? timespace.surfaceTzOffset
          : 0;
      const year = julToISODateObj(jd, offset).year();
      return {
        _id,
        jd,
        year,
        relType,
        timespace,
        c1,
        c2,
        modifiedAt,
      };
    });
  }

  async getPairedByChartIDs(c1: string, c2: string) {
    const charts = await this.getPairedByChart(c1, 'modifiedAt', 1, c2);
    if (charts.length > 0) {
      return charts[0];
    }
  }

  async tagStats(limit = 10000) {
    const pcs = await this.pairedChartModel
      .aggregate([
        {
          $project: {
            _id: 0,
            relType: 1,
            'tags.slug': 1,
            'tags.vocab': 1,
          },
        },
      ])
      .limit(limit)
      .exec();
    const tagTypes: Map<string, KeyValue> = new Map();
    pcs.forEach(pc => {
      const { relType, tags } = pc;
      if (tags instanceof Array) {
        tags.forEach(tg => {
          const slugKey = sanitize(tg.slug, '_');
          if (slugKey.length > 0 && slugKey !== '_') {
            const tagOpt = tagTypes.get(slugKey);
            const value = tagOpt instanceof Object ? tagOpt.value + 1 : 1;
            const key = notEmptyString(tg.vocab, 1) ? tg.vocab : 'trait';
            tagTypes.set(slugKey, {
              key,
              value,
            });
          }
        });
      }
      if (notEmptyString(relType, 2)) {
        const relTypeMatched =
          tags.filter(tg => tg.slug === relType).length > 0;
        if (!relTypeMatched) {
          const relTag = tagTypes.get(relType);
          const value = relTag instanceof Object ? relTag.value + 1 : 1;
          tagTypes.set(relType, {
            key: 'type',
            value,
          });
        }
      }
    });

    const types: Map<string, KeyValue[]> = new Map();
    [...tagTypes.entries()].forEach(entry => {
      const [key, keyVal] = entry;
      const typeSet = types.get(keyVal.key);
      const innerTags = typeSet instanceof Object ? typeSet : [];
      innerTags.push({
        key,
        value: keyVal.value,
      });
      types.set(keyVal.key, innerTags);
    });
    return Object.fromEntries(types);
  }

  async getTraits(shortOnly = true, limit = 100000) {
    const pcs = await this.pairedChartModel
      .aggregate([
        {
          $project: {
            _id: 0,
            'tags.slug': 1,
            'tags.name': 1,
            'tags.vocab': 1,
          },
        },
        {
          $match: {
            'tags.vocab': 'trait',
          },
        },
      ])
      .limit(limit)
      .exec();
    const tagOpts: Map<string, KeyValue> = new Map();
    const descriptiveName = (name: string) => {
      return name.length > 36 || (name.length > 20 && /[.,)()_-]/.test(name));
    };
    pcs.forEach(pc => {
      const { tags } = pc;
      if (tags instanceof Array) {
        tags.forEach(tg => {
          const slugKey = sanitize(tg.slug, '_');
          const valid = shortOnly ? !descriptiveName(tg.name) : true;
          if (valid && slugKey.length > 0 && slugKey !== '_') {
            const tagOpt = tagOpts.get(slugKey);
            const exists = tagOpt instanceof Object;
            const value = exists ? tagOpt.value + 1 : 1;
            const key = exists ? tagOpt.key : tg.name;
            tagOpts.set(slugKey, {
              key,
              value,
            });
          }
        });
      }
    });
    return [...tagOpts.entries()].map(entry => {
      const [key, obj] = entry;
      return {
        key,
        name: obj.key,
        value: obj.value,
      };
    });
  }

  async reassignTags(
    source: TagDTO,
    target: TagDTO = null,
    yearSpan = -1,
    addToNotes = false,
    limit = 1000000,
  ) {
    const pcs = await this.pairedChartModel
      .aggregate([
        {
          $project: {
            _id: 1,
            relType: 1,
            span: 1,
            'tags.slug': 1,
            'tags.name': 1,
            'tags.vocab': 1,
            notes: 1,
          },
        },
        {
          $match: {
            'tags.vocab': source.vocab,
            'tags.slug': source.slug,
          },
        },
      ])
      .limit(limit)
      .exec();
    pcs.forEach(pc => {
      this._reassignTagsInPaired(pc, source, target, yearSpan, addToNotes);
    });
    return pcs.map(pc => pc._id);
  }

  _reassignTagsInPaired(
    pc,
    source: TagDTO,
    target: TagDTO,
    yearSpan = -1,
    addToNotes = false,
  ) {
    const { _id, relType, tags, span, notes } = pc;
    const filteredTags = tags.filter(
      tg => !(tg.slug === source.slug && tg.vocab === source.vocab),
    );
    if (notEmptyString(target.name) && notEmptyString(target.vocab, 2)) {
      filteredTags.push(target);
    }
    const updatedFields: Map<string, any> = new Map();
    const newTags = this.dedupeTags(filteredTags);
    updatedFields.set('tags', newTags);
    if (yearSpan > 0 && span <= 0) {
      updatedFields.set('span', yearSpan);
    }
    const firstRelTag = newTags.find(tg => tg.vocab === 'type');
    if (firstRelTag instanceof Object && firstRelTag.slug !== relType) {
      updatedFields.set('relType', firstRelTag.slug);
    }
    if (addToNotes) {
      const noteParts = notEmptyString(notes) ? [notes] : [];
      noteParts.push(source.name);
      updatedFields.set('notes', noteParts.join('.\n'));
    }
    this.pairedChartModel
      .findByIdAndUpdate(_id, Object.fromEntries(updatedFields))
      .exec();
  }

  dedupeTags(tags: TagDTO[] = []) {
    const filteredTags = [];
    const slugIds: string[] = [];
    tags.forEach(tg => {
      const slugId = [tg.slug, tg.vocab].join('__');
      if (slugIds.includes(slugId) === false) {
        filteredTags.push(tg);
      }
    });
    return filteredTags;
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

  async getCoreChartDataByUser(
    userID: string,
    search: string,
    start = 0,
    limit = 20,
  ) {
    const condMap = new Map<string, any>();
    if (notEmptyString(search)) {
      const nameRgx = RegExp('\\b' + generateNameSearchRegex(search), 'i');
      condMap.set('$or', [
        { 'subject.name': nameRgx },
        { 'subject.altNames': nameRgx },
      ]);
    }
    condMap.set('user', userID);
    return await this.chartModel
      .find(Object.fromEntries(condMap))
      .select({
        _id: 1,
        'subject.name': 1,
        'subject.gender': 1,
        'subject.roddenValue': 1,
        datetime: 1,
        jd: 1,
        tzOffset: 1,
        'geo.lat': 1,
        'geo.lng': 1,
        'geo.alt': 1,
        isDefaultBirthChart: 1,
      })
      .sort({ 'subject.name': 1 })
      .skip(start)
      .limit(limit);
  }

  async getChartNamesByUserAndName(userID: string, search: string, limit = 20) {
    const charts = await this.getCoreChartDataByUser(userID, search, 0, limit);
    const matchedItems = charts
      .filter(c => c instanceof Object)
      .map(c => {
        const year = julToISODateObj(c.jd, c.tzOffset).year();
        const shortName = shortenName(c.subject.name);
        return {
          id: c._id,
          name: `${shortName} (${c.subject.gender})`,
          year,
        };
      });
    // dedupe results
    const items = [];
    const strings: string[] = [];
    matchedItems.forEach(item => {
      const str = sanitize(item.name);
      if (strings.includes(str) === false) {
        strings.push(str);
        items.push(item);
      }
    });
    return items;
  }

  async countCoreChartDataByUser(userID: string, search = '') {
    const condMap = new Map<string, any>();
    if (notEmptyString(search)) {
      condMap.set('subject.name', RegExp('\\b' + search, 'i'));
    }
    condMap.set('user', userID);
    return await this.chartModel.count(Object.fromEntries(condMap));
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

  async list(
    criteria: Map<string, any> = new Map<string, any>(),
    start = 0,
    limit = 100,
    useAggregation = false,
  ) {
    const filter = Object.fromEntries(criteria);
    const sort = { isDefaultBirthChart: -1 };
    if (useAggregation) {
      return await this.chartModel
        .aggregate([
          { $match: filter },
          { $skip: start },
          { $limit: limit },
          { $sort: sort },
        ])
        .allowDiskUse(true)
        .exec();
    } else {
      return await this.chartModel
        .find(filter)
        .skip(start)
        .limit(limit)
        .sort(sort)
        .exec();
    }
  }

  async deleteChart(chartID: string) {
    return await this.chartModel.deleteOne({ _id: chartID }).exec();
  }

  async sanitizePairedCharts(start = 0, limit = 1000) {
    const pcs = await this.getPairedCharts(start, limit);
    const relTypeKeys = matchDefaultVocabOptionKeys('type');
    for (const pc of pcs) {
      const { _id, tags, relType } = pc;
      let newRelType = relType;
      const newTags: SlugNameVocab[] = [];
      if (emptyString(relType)) {
        const first = tags.find(tg =>
          relTypeKeys.includes(tg.slug.replace(/-/g, '_')),
        );
        if (first instanceof Object) {
          newRelType = first.slug.replace(/-/g, '_');
        }
      }
      tags.forEach(tg => {
        if (tg instanceof Object) {
          const { slug, name, vocab } = tg;
          if (notEmptyString(slug)) {
            const slugStr = slug.replace(/-/g, '_');
            const matchedVocab = matchVocabKey(slug);
            const newVocab = notEmptyString(matchedVocab)
              ? matchedVocab
              : notEmptyString(vocab)
              ? vocab
              : 'trait';
            const newTag = {
              slug: slugStr,
              name,
              vocab: newVocab,
            };
            newTags.push(newTag);
          }
        }
      });
      const updated = await this.pairedChartModel
        .findByIdAndUpdate(_id, {
          relType: newRelType,
          tags: newTags,
        })
        .exec();
    }
    return pcs.map(pc => pc._id);
  }

  async uniqueTagSlugs() {
    const slugs = await this.pairedChartModel.distinct('relType', {
      relType: /\w+/,
    });
    return slugs instanceof Array ? slugs : [];
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

  async pairedDuplicates(start = 0, limit = 20000) {
    const steps = [
      {
        $skip: start,
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: 'charts',
          localField: 'c1',
          foreignField: '_id',
          as: 'chart1',
        },
      },
      {
        $lookup: {
          from: 'charts',
          localField: 'c2',
          foreignField: '_id',
          as: 'chart2',
        },
      },
      {
        $unwind: '$chart1',
      },
      {
        $unwind: '$chart2',
      },
      {
        $project: {
          c1: '$chart1._id',
          s1: '$chart1.subject.name',
          d1: '$chart1.datetime',
          c2: '$chart2._id',
          s2: '$chart2.subject.name',
          d2: '$chart2.datetime',
          relTYpe: 1,
        },
      },
    ];
    return await this.pairedChartModel.aggregate(steps);
  }

  async singleDuplicates(start = 0, limit = 20000) {
    const steps = [
      {
        $skip: start,
      },
      {
        $limit: limit,
      },
      {
        $project: {
          id: '$chart1._id',
          name: '$subject.name',
          lat: '$geo.lat',
          lng: '$geo.lng',
          dt: '$datetime',
        },
      },
    ];
    return await this.chartModel.aggregate(steps);
  }

  async bulkDeletePaired(before: string, max = 1000000) {
    //const result = await this.pairedChartModel.deleteMany({ createdAt: {} }).exec();
    const dt = new Date(before);
    const totalAfter = await this.pairedChartModel.count({
      createdAt: { $gte: dt },
    });
    const total = await this.pairedChartModel.count({});
    let deleted = false;
    if (totalAfter > minRemainingPaired) {
      await this.pairedChartModel
        .deleteMany({
          createdAt: {
            $lt: dt,
          },
        })
        .exec();
      deleted = true;
    }
    const totalBefore = total - totalAfter;
    return { total, before: totalBefore, after: totalAfter, deleted };
  }
}
