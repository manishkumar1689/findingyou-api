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
import { extractDocId } from '../lib/entities';
import { defaultPairedTagOptionSets } from '../astrologic/lib/settings/vocab-values';
import { RuleSetDTO } from './dto/rule-set.dto';

@Injectable()
export class SettingService {
  constructor(
    @InjectModel('Setting') private readonly settingModel: Model<Setting>,
    @InjectModel('Protocol')
    private readonly protocolModel: Model<Protocol>,
  ) {}
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
      }
    }
    return { ...result, value: newValue };
  }

  async getPreferences() {
    const setting = await this.getByKey('preference_options');
    return setting instanceof Object ? setting.value : [];
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

  async getProtocolSettings() {
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

  async getFlags() {
    let flags = defaultFlags;
    const setting = await this.getByKey('flags');
    if (setting) {
      if (setting.value instanceof Array && setting.value.length > 0) {
        flags = setting.value;
      }
    }
    return flags;
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

  async deleteProtocol(id = '') {
    const item = await this.protocolModel.findById(id);
    if (!notEmptyString(id, 8)) {
      await this.protocolModel.findByIdAndDelete(id);
    }
    return item;
  }
}
