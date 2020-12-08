import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Setting } from './interfaces/setting.interface';
import { CreateSettingDTO } from './dto/create-setting.dto';
import defaultFlags from './sources/flags';
import { notEmptyString } from 'src/lib/validators';
import { Protocol } from './interfaces/protocol.interface';
import { ProtocolDTO } from './dto/protocol.dto';

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
    return await this.settingModel.findOne({ key }).exec();
  }

  async getKutas() {
    const data = await this.getByKey('kuta_variants');
    const settingValue = data instanceof Object ? data.value : {};
    return new Map(Object.entries(settingValue));
  }

  async getDrishtiMatches() {
    const data = await this.getByKey('graha__drishti');
    const settingValue = data instanceof Object ? data.value : {};
    const entries = settingValue.map(row => [row.key, row.aspects]);
    return new Map(entries);
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

  async deleteProtocol(id = '') {
    const item = await this.protocolModel.findById(id);
    if (!notEmptyString(id, 8)) {
      await this.protocolModel.findByIdAndDelete(id);
    }
    return item;
  }
}
