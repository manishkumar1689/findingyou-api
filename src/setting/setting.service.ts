import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Setting } from './interfaces/setting.interface';
import { CreateSettingDTO } from './dto/create-setting.dto';
import defaultFlags from './sources/flags';
import { notEmptyString } from '../lib/validators';
import { Protocol } from './interfaces/protocol.interface';
import { ProtocolDTO } from './dto/protocol.dto';
import { mergeRoddenValues } from '../astrologic/lib/settings/rodden-scale-values';
import { KeyName } from '../astrologic/lib/interfaces';
import {
  extractDocId,
  extractFromRedisClient,
  extractFromRedisMap,
  storeInRedis,
} from '../lib/entities';
import { defaultPairedTagOptionSets } from '../astrologic/lib/settings/vocab-values';
import { RuleSetDTO } from './dto/rule-set.dto';
import { PredictiveRuleSet } from './interfaces/predictive-rule-set.interface';
import { PredictiveRuleSetDTO } from './dto/predictive-rule-set.dto';
import getDefaultPreferences, {
  buildSurveyOptions,
  translateItemKey,
} from '../user/settings/preference-options';
import multipleKeyScales from '../user/settings/multiscales';
import { PreferenceOption } from '../user/interfaces/preference-option.interface';
import { RedisService } from 'nestjs-redis';
import * as Redis from 'ioredis';
import { ProtocolSettings } from '../astrologic/lib/models/protocol-models';
import { smartCastInt } from '../lib/converters';
import permissionValues from '../user/settings/permissions';
import {
  analyseAnswers,
  filterMapSurveyByType,
  normalizeFacetedAnswer,
  transformUserPreferences,
} from './lib/mappers';
import { FacetedItemDTO } from './dto/faceted-item.dto';
import eventTypeValues from 'src/astrologic/lib/settings/event-type-values';

@Injectable()
export class SettingService {
  constructor(
    @InjectModel('Setting') private readonly settingModel: Model<Setting>,
    @InjectModel('Protocol')
    private readonly protocolModel: Model<Protocol>,
    @InjectModel('PredictiveRuleSet')
    private readonly predictiveRuleSetModel: Model<PredictiveRuleSet>,
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
  // fetch all Settings
  async getAllSetting(): Promise<Setting[]> {
    const Settings = await this.settingModel
      .find()
      .sort({ weight: 1 })
      .exec();
    return Settings;
  }
  // fetch all Settings with keys and values only
  async getAll(): Promise<Setting[]> {
    const Settings = await this.settingModel
      .find()
      .select({ key: 1, value: 1, _id: 0 })
      .sort({ weight: 1 })
      .exec();
    return Settings;
  }

  // fetch all Settings with keys and values only
  async getCustom(): Promise<Setting[]> {
    const Settings = await this.settingModel
      .find({ type: 'custom' })
      .select({
        key: 1,
        type: 1,
        notes: 1,
        weight: 1,
        createdAt: 1,
        modifiedAt: 1,
      })
      .sort({ weight: 1 })
      .exec();
    return Settings;
  }

  // Get a single Setting
  async getSetting(settingID): Promise<Setting> {
    const setting = await this.settingModel.findById(settingID).exec();
    return setting;
  }

  // Match many pattern
  async getByKeyPattern(pattern: string): Promise<Setting[]> {
    const rgx = new RegExp(pattern, 'i');
    return await this.settingModel.find({ key: rgx }).exec();
  }

  // get a single setting by key
  async getByKey(key: string): Promise<Setting> {
    const data = await this.settingModel.findOne({ key }).exec();
    let newValue = null;
    let result: any = {};
    if (data instanceof Object) {
      result = data.toObject();
      switch (key) {
        case 'rodden_scale_values':
          newValue = mergeRoddenValues(data.value);
          break;
        default:
          newValue = data.value;
          break;
      }
    }
    return { ...result, value: newValue };
  }

  // get a single setting by key
  async getKutaSettings(): Promise<Map<string, any>> {
    const data = await this.getByKey('kuta_variants');
    const itemObj =
      data instanceof Object &&
      Object.keys(data).includes('value') &&
      data.value instanceof Object
        ? data.value
        : {};
    return new Map(Object.entries(itemObj));
  }

  async getSubjectDataSetsRaw() {
    const roddenData = await this.getByKey('rodden_scale_values');
    const rodItems = roddenData.value instanceof Array ? roddenData.value : [];
    const relData = await this.getByKey('relationship_types');
    const relItems = relData.value instanceof Array ? relData.value : [];
    const eventTypes = eventTypeValues;
    return {
      rodden: rodItems.filter(r => r instanceof Object && r.enabled),
      relations: relItems,
      eventTypes,
    };
  }

  async getSubjectDataSets() {
    const cKey = 'subject-data-sets';
    const data = await this.redisGet(cKey);
    if (data instanceof Object && Object.keys(data).includes('relations')) {
      return data;
    } else {
      const result = await this.getSubjectDataSetsRaw();
      this.redisSet(cKey, result);
      return result;
    }
  }

  async getPreferences() {
    const setting = await this.getByKey('preference_options');
    return setting instanceof Object ? setting.value : [];
  }

  async getPreferenceKeys() {
    const items = await this.settingModel
      .find({ type: 'preferences' })
      .select({ _id: 0, key: 1 });
    return items instanceof Array
      ? items
          .map(item => item.key)
          .filter(key => key !== '_new')
          .filter((x, i, a) => a.indexOf(x) === i)
      : [];
  }

  async getPreferenceOptions(
    surveyKey = 'preference_options',
  ): Promise<Array<PreferenceOption>> {
    const setting = await this.getByKey(surveyKey);
    let data: Array<PreferenceOption> = [];
    if (!setting) {
      data = getDefaultPreferences(surveyKey);
    } else {
      if (setting.value instanceof Array) {
        data = setting.value.map(row => {
          if (
            row instanceof Object &&
            row.type === 'multiple_key_scale' &&
            Object.keys(row).includes('options') &&
            row.options instanceof Array
          ) {
            row.options = row.options.map(opt => {
              return { ...opt, name: translateItemKey(opt.key) };
            });
          }
          return row;
        });
      }
    }
    return data;
  }

  async getPsychometricSurveys() {
    const surveys = await this.getSurveys();
    const big5 = surveys.find(sv => sv.key === 'faceted_personality_options');
    const jungian = surveys.find(sv => sv.key === 'jungian_options');
    const facetedQuestions = big5 instanceof Object ? big5.items : [];
    const jungianQuestions = jungian instanceof Object ? jungian.items : [];

    return { facetedQuestions, jungianQuestions };
  }

  async processPreferences(preferences: any[]) {
    const multiscaleData = await this.surveyMultiscales();
    const surveys = await this.getSurveys();
    const big5 = surveys.find(sv => sv.key === 'faceted_personality_options');
    const jungian = surveys.find(sv => sv.key === 'jungian_options');
    const preferenceItems = preferences
      .filter(
        pr => pr instanceof Object && ['faceted', 'jungian'].includes(pr.type),
      )
      .map(pref => transformUserPreferences(pref, surveys, multiscaleData));

    const facetedQuestions = big5 instanceof Object ? big5.items : [];
    const jungianQuestions = jungian instanceof Object ? jungian.items : [];
    let facetedAnswers = [];
    let facetedAnalysis = {};
    let jungianAnswers = [];
    let jungianAnalysis = {};

    if (facetedQuestions instanceof Array && facetedQuestions.length > 0) {
      facetedAnswers = filterMapSurveyByType(
        preferences,
        'faceted',
        facetedQuestions,
      );
      facetedAnalysis = analyseAnswers('faceted', facetedAnswers);
      jungianAnswers = filterMapSurveyByType(
        preferences,
        'jungian',
        jungianQuestions,
      );
      const jungianCompleted = jungianAnswers.length >= jungianQuestions.length;
      jungianAnalysis = jungianCompleted
        ? analyseAnswers('jungian', jungianAnswers)
        : {};
    }
    return {
      preferences: preferenceItems,
      facetedAnswers,
      facetedAnalysis,
      jungianAnswers,
      jungianAnalysis,
    };
  }

  async getSurveys() {
    const key = 'pr_surveys';
    const stored = await this.redisGet(key);
    const hasStored = stored instanceof Array && stored.length > 0;
    const rows = hasStored ? stored : await this.getAllSurveys();
    if (!hasStored && rows.length > 0) {
      this.redisSet(key, rows);
    }
    return rows;
  }

  async getAllSurveys() {
    const keys = await this.getPreferenceKeys();
    const surveys: Array<any> = [];
    for (const key of keys) {
      const setting = await this.getByKey(key);
      if (setting instanceof Object) {
        const { value } = setting;
        if (value instanceof Array) {
          const num = value.length;
          const valid = num > 0;
          surveys.push({ key, items: value, num, valid });
        }
      }
    }
    return surveys;
  }

  async getSurveyItems(surveyKey = '', cached = true) {
    const key = ['survey_items', surveyKey].join('_');
    const stored = cached ? await this.redisGet(key) : [];
    let items = [];
    if (stored instanceof Array && stored.length > 0) {
      items = stored;
    } else {
      items = await this.getSurveyItemsRaw(surveyKey);
      if (items.length > 0) {
        this.redisSet(key, items);
      }
    }
    return items;
  }

  async analyseFacetedByType(
    type = 'faceted',
    items: FacetedItemDTO[] = [],
    feedbackItems = [],
    cached = true,
  ) {
    let responses = [];
    let analysis = {};
    const surveyKey =
      type === 'jungian' ? 'jungian_options' : 'faceted_personality_options';
    if (items instanceof Array) {
      const surveyItems = await this.getSurveyItems(surveyKey, cached);
      responses = items.map(item =>
        normalizeFacetedAnswer(item, surveyItems, false),
      );
      analysis = analyseAnswers(type, responses, feedbackItems);
    }
    return { responses, analysis };
  }

  async getSurveyItemsRaw(surveyKey = '') {
    const setting = await this.getByKey(surveyKey);
    let items = [];
    if (setting instanceof Object) {
      const { value } = setting;
      if (value instanceof Array) {
        items = value;
      }
    }
    return items;
  }

  async surveyMultiscales() {
    const key = 'survey_multiscales';
    const stored = await this.redisGet(key);
    const hasStored = stored instanceof Array && stored.length > 0;
    const rows = hasStored ? stored : await this.surveyMultiscaleList();
    if (!hasStored && rows.length > 0) {
      this.redisSet(key, rows);
    }
    return rows;
  }

  async surveyMultiscaleList() {
    const key = 'survey_multiscales';
    const setting = await this.getByKey(key);
    const hasValue =
      setting instanceof Object &&
      Object.keys(setting).includes('value') &&
      setting.value instanceof Array &&
      setting.value.length > 0;
    let data: Array<any> = [];
    if (!hasValue) {
      data = multipleKeyScales;
    } else {
      if (setting.value instanceof Array) {
        data = setting.value;
      }
    }
    const dataWithOptions = data.map(item => {
      const valueOpts = buildSurveyOptions(item.key);
      return { ...item, options: valueOpts };
    });
    return dataWithOptions;
  }

  async getPermissionData(skipCache = false) {
    const key = 'permissions';
    const stored = skipCache ? null : await this.redisGet(key);
    if (stored instanceof Object) {
      return stored;
    } else {
      const roleData = await this.getByKey('roles');
      const roles = roleData.value instanceof Array ? roleData.value : [];
      const limitData = await this.getByKey('permission_limits');
      const limits = limitData.value instanceof Array ? limitData.value : [];
      const data = { roles, limits };
      this.redisSet(key, data);
      return data;
    }
  }

  async getPermissions(roleKeys: string[] = [], skipCache = false) {
    const data = await this.getPermissionData(skipCache);
    const permKeys = [];
    if (roleKeys instanceof Array) {
      roleKeys.forEach(roleKey => {
        this.filterOverrides(permKeys, data, roleKey);
      });
    }
    const entries = permKeys.map(key => {
      const limitRow = data.limits.find(lm => lm.key === key);
      const value =
        limitRow instanceof Object ? smartCastInt(limitRow.value, 0) : true;
      return [key, value];
    });
    const otherKeys = permissionValues
      .map(pm => pm.key)
      .filter(k => permKeys.includes(k) === false)
      .map(k => {
        const limitRow = data.limits.find(lm => lm.key === k);
        const value = limitRow instanceof Object ? 0 : false;
        return [k, value];
      });
    const rgx = /^(basic|extended|premium)_/;
    const coreEntries = [...entries, ...otherKeys].filter(([k, v]) => {
      return rgx.test(k) === false && typeof v === 'boolean';
    });
    const limitEntries = [...entries, ...otherKeys].filter(([k, v]) => {
      return rgx.test(k) && typeof v === 'number';
    });
    const limitRows: any[][] = [];
    limitEntries.forEach(([k, v]) => {
      const key = k.replace(rgx, '');
      const mIndex = limitRows.findIndex(([k, v]) => k === key);
      if (mIndex >= 0) {
        if (limitRows[mIndex][1] < v) {
          limitRows[mIndex][1] = v;
        }
      } else {
        limitRows.push([key, smartCastInt(v)]);
      }
    });
    return Object.fromEntries([...limitRows, ...coreEntries]);
  }

  filterOverrides(permKeys: string[] = [], permData = null, roleKey = '') {
    if (permData instanceof Object) {
      const excludeKeys = ['all'];
      const { roles, limits } = permData;
      const current = roles.find(r => r.key === roleKey);
      if (current instanceof Object) {
        const { overrides, permissions, appAccess, adminAccess } = current;
        if (permissions instanceof Array) {
          if (appAccess) {
            if (!permKeys.includes('app_access')) {
              permKeys.push('app_access');
            }
          }
          if (adminAccess) {
            if (!permKeys.includes('admin_access')) {
              permKeys.push('admin_access');
            }
          }
          permissions.forEach(pk => {
            if (
              permKeys.includes(pk) === false &&
              excludeKeys.includes(pk) === false
            ) {
              permKeys.push(pk);
            }
          });
        }
        if (overrides instanceof Array) {
          overrides.forEach(rk => {
            this.filterOverrides(permKeys, permData, rk);
          });
        }
      }
    }
    return permKeys;
  }

  async saveRelationshipType(newType: KeyName) {
    const setting = await this.getByKey('relationship_types');
    let types: KeyName[] = [];
    if (setting instanceof Object) {
      if (setting.value instanceof Array) {
        types = setting.value;
        const typeIndex = types.findIndex(tp => tp.key === newType.key);
        if (typeIndex < 0) {
          types.push(newType);
          const _id = extractDocId(setting);
          this.updateSetting(_id, {
            value: types,
            modifiedAt: new Date(),
          } as CreateSettingDTO);
        }
      }
    }
    return types;
  }

  async getProtocolSettings(): Promise<ProtocolSettings> {
    return {
      kuta: await this.getKutas(),
      grahaDrishti: await this.getDrishtiMatches(),
      rashiDrishti: await this.getRashiDrishtiMatches(),
    };
  }

  async getKutas() {
    const data = await this.getByKey('kuta_variants');
    const settingValue = data instanceof Object ? data.value : {};
    return new Map(Object.entries(settingValue));
  }

  async getDrishtiMatches(): Promise<Map<string, number[]>> {
    const data = await this.getByKey('graha__drishti');
    const settingValue = data instanceof Object ? data.value : {};
    const entries = settingValue.map(row => [row.key, row.aspects]);
    return new Map(entries);
  }

  async getRashiDrishtiMatches(): Promise<Map<number, number[]>> {
    const data = await this.getByKey('rashi__drishti');
    const settingValue = data instanceof Object ? data.value : {};
    const entries = settingValue.map(row => [row.sign, row.aspects]);
    return new Map(entries);
  }

  async getPairedVocabs(useDefaultOpts = false, resetOpts = false) {
    const key = 'paired_vocabs';

    const skipStored = useDefaultOpts && !resetOpts;
    const data = await this.getByKey(key);
    if (
      data instanceof Object &&
      data.value instanceof Array &&
      data.value.length > 0
    ) {
      if (useDefaultOpts) {
        const settingDTO = {
          value: defaultPairedTagOptionSets,
          modifiedAt: new Date(),
        } as CreateSettingDTO;
        if (!skipStored) {
          const { _id } = data;
          this.updateSetting(_id, settingDTO);
        }
      }
      return useDefaultOpts ? defaultPairedTagOptionSets : data.value;
    } else {
      const settingDTO = {
        key,
        type: 'custom',
        value: defaultPairedTagOptionSets,
        createdAt: new Date(),
        modifiedAt: new Date(),
      } as CreateSettingDTO;
      const setting = new this.settingModel(settingDTO);
      setting.save();
      return settingDTO.value;
    }
  }

  // post a single Setting
  async addSetting(createSettingDTO: CreateSettingDTO): Promise<Setting> {
    const newSetting = new this.settingModel(createSettingDTO);
    return newSetting.save();
  }
  // post a single Setting
  async delete(settingID: string): Promise<string> {
    let returnId = '';
    const result = await this.settingModel.findByIdAndDelete(settingID);
    if (result instanceof Object) {
      const { _id } = result;
      if (_id) {
        returnId = _id;
      }
    }
    return returnId;
  }
  // Edit Setting details
  async updateSetting(
    settingID,
    createSettingDTO: CreateSettingDTO,
  ): Promise<Setting> {
    const settingDTO = {
      ...createSettingDTO,
      modifiedAt: new Date(),
    } as CreateSettingDTO;
    const updatedSetting = await this.settingModel.findByIdAndUpdate(
      settingID,
      settingDTO,
      { new: true },
    );
    return updatedSetting;
  }

  async getFlags(skipCache = false) {
    let flags = defaultFlags;
    const cKey = 'flags';
    const stored = skipCache ? null : await this.redisGet(cKey);
    if (stored instanceof Array && stored.length > 0) {
      return stored;
    } else {
      const setting = await this.getByKey('flags');
      if (setting) {
        if (setting.value instanceof Array && setting.value.length > 0) {
          flags = setting.value;
          this.redisSet(cKey, flags);
        }
      }
    }
    return flags;
  }

  async getFlagInfo(key = '') {
    const flags = await this.getFlags();
    const flag = flags.find(fl => fl.key === key);
    const defaultFlag = {
      key: '',
      type: 'boolean',
      defaultValue: false,
      range: [],
      options: [],
      valid: false,
    };
    return flag instanceof Object ? { ...flag, valid: true } : defaultFlag;
  }

  async minPassValue() {
    let minValue = -3;
    const likeability = await this.getFlagInfo('likeability');
    if (likeability.range instanceof Array && likeability.range.length > 1) {
      minValue = likeability.range[0];
    }
    return minValue;
  }

  async getProtocol(itemID: string) {
    return await this.protocolModel.findById(itemID);
  }

  async matchProtocolSetting(
    itemID: string,
    settingKey = '',
    defaultVal = null,
  ) {
    const protocol = await this.getProtocol(itemID);
    let hasProtocol = false;
    if (protocol instanceof Object) {
      hasProtocol = true;
      const value = this.matchSettingInProtocol(protocol, settingKey);
      return { hasProtocol: true, protocol, value };
    }
    return { hasProtocol, protocol, value: defaultVal };
  }

  matchSettingInProtocol(protocol, settingKey = '', defaultVal = null) {
    const { settings } = protocol;
    if (settings instanceof Array) {
      const settingRow = settings.find(s => s.key === settingKey);
      if (settingRow instanceof Object) {
        return settingRow.value;
      }
    }
    return defaultVal;
  }

  async getProtocolSetting(itemID: string, settingKey = '', defaultVal = null) {
    const { value } = await this.matchProtocolSetting(
      itemID,
      settingKey,
      defaultVal,
    );
    return value;
  }

  async getProtocolCustomOrbs(itemID: string) {
    const { value, protocol, hasProtocol } = await this.matchProtocolSetting(
      itemID,
      'custom_orbs',
      false,
    );
    if (hasProtocol) {
      if (value) {
        const { settings } = protocol;
        if (settings instanceof Array) {
          const settingRow = settings.find(s => s.key === 'customOrbs');
          if (
            settingRow instanceof Object &&
            settingRow.value instanceof Array
          ) {
            return settingRow.value;
          }
        }
      }
    }
    return [];
  }

  async getProtcols(userID = null) {
    const mp: Map<string, any> = new Map();
    const userNotMatched = userID === '-';
    if (!userNotMatched && notEmptyString(userID, 8)) {
      mp.set('user', userID);
    }
    if (userNotMatched) {
      return [];
    } else {
      const criteria = Object.fromEntries(mp.entries());
      return await this.protocolModel
        .find(criteria)
        .select({ __v: 0 })
        .populate({
          path: 'user',
          select: {
            identifier: 1,
            roles: 1,
            fullName: 1,
            nickName: 1,
            active: 1,
          },
        });
    }
  }

  async saveProtcol(protocolDTO: ProtocolDTO, id = '') {
    let result: any = null;
    if (notEmptyString(id, 8)) {
      const updated = { ...protocolDTO, modifiedAt: new Date() };
      await this.protocolModel.findByIdAndUpdate(id, updated);
      result = await this.protocolModel.findById(id);
    } else {
      const protocol = new this.protocolModel(protocolDTO);
      result = await protocol.save();
    }
    return result;
  }

  async getRuleSet(ruleID = '') {
    return await this.predictiveRuleSetModel.findById(ruleID);
  }

  async saveRuleSet(id = '', colRef = '', ruleIndex = 0, ruleSet: RuleSetDTO) {
    const protocol = await this.protocolModel.findById(id);
    const result: any = { valid: false, protocol: null, matches: [] };
    if (protocol instanceof Object) {
      const protocolObj = protocol.toObject();
      const { collections } = protocolObj;
      if (collections instanceof Array && collections.length > 0) {
        const colIndex = collections.findIndex(col => col.type === colRef);
        const collection = collections[colIndex];
        if (collection instanceof Object) {
          if (Object.keys(collection).includes('rules')) {
            if (ruleIndex < collection.rules.length) {
              collection.rules[ruleIndex] = ruleSet;
            } else if (ruleIndex === 0) {
              collection.rules.push(ruleSet);
            }
          }
        }
      }
      const saved = await this.protocolModel.findByIdAndUpdate(id, protocolObj);
      result.item = ruleSet;
      result.valid = saved instanceof Object;
    }
    return result;
  }

  async savePredictiveRuleSet(ruleSetDTO: PredictiveRuleSetDTO, id = '') {
    let result: any = null;
    if (notEmptyString(id, 8)) {
      const updated = { ...ruleSetDTO, modifiedAt: new Date() };
      await this.predictiveRuleSetModel.findByIdAndUpdate(id, updated);
      result = await this.predictiveRuleSetModel.findById(id);
    } else {
      const predictiveRuleSet = new this.predictiveRuleSetModel(ruleSetDTO);
      result = await predictiveRuleSet.save();
    }
    return result;
  }

  async deletePredictiveRuleSet(id = '', userID = '', isAdmin = false) {
    const result: any = { valid: false, deleted: false, item: null };
    if (notEmptyString(id, 16)) {
      const rule = await this.predictiveRuleSetModel.findById(id);
      if (rule instanceof Object) {
        result.item = rule;
        result.valid = true;
        if (isAdmin || rule.user === userID) {
          const deleted = await this.predictiveRuleSetModel.deleteOne({
            _id: id,
          });
          if (deleted.ok) {
            result.deleted = true;
          }
        }
      }
    }
    return result;
  }

  async getRuleSets(userRef = null, activeOnly = false) {
    const byUsers = userRef instanceof Array;
    const byUser = !byUsers && notEmptyString(userRef, 16);
    const filter: Map<string, any> = new Map();
    if (byUsers) {
      filter.set('user', { $in: userRef });
    } else if (byUser) {
      filter.set('user', userRef);
    }
    if (activeOnly) {
      filter.set('active', true);
    }
    const criteria = Object.fromEntries(filter);
    const items = await this.predictiveRuleSetModel.find(criteria);
    return items;
  }

  async deleteProtocol(id = '') {
    const item = await this.protocolModel.findById(id);
    if (!notEmptyString(id, 8)) {
      await this.protocolModel.findByIdAndDelete(id);
    }
    return item;
  }
}
