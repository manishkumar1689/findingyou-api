import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Setting } from './interfaces/setting.interface';
import { CreateSettingDTO } from './dto/create-setting.dto';
import defaultFlags from './sources/flags';
import { notEmptyString } from 'src/lib/validators';
import { RulesCollection } from './interfaces/rules-collection.interface';
import { RulesCollectionDTO } from './dto/rules-collection.dto';

@Injectable()
export class SettingService {
  constructor(
    @InjectModel('Setting') private readonly settingModel: Model<Setting>,
    @InjectModel('RulesCollection')
    private readonly rulesCollectionModel: Model<RulesCollection>,
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

  async getRuleCollection(itemID: string) {
    return await this.rulesCollectionModel.findById(itemID);
  }

  async getRuleCollections(userID = null) {
    const mp: Map<string, any> = new Map();
    const userNotMatched = userID === '-';
    if (!userNotMatched && notEmptyString(userID, 8)) {
      mp.set('user', userID);
    }
    if (userNotMatched) {
      return [];
    } else {
      const criteria = Object.fromEntries(mp.entries());
      return await this.rulesCollectionModel.find(criteria);
    }
  }

  async saveRuleCollection(rulesCollectionDTO: RulesCollectionDTO, id = '') {
    let result: any = null;
    if (notEmptyString(id, 8)) {
      await this.rulesCollectionModel.findByIdAndUpdate(id, rulesCollectionDTO);
      result = await this.rulesCollectionModel.findById(id);
    } else {
      const rulesCollection = new this.rulesCollectionModel(rulesCollectionDTO);
      result = await rulesCollection.save();
    }
    return result;
  }

  async deleteRuleCollection(id = '') {
    const item = await this.rulesCollectionModel.findById(id);
    if (!notEmptyString(id, 8)) {
      await this.rulesCollectionModel.findByIdAndDelete(id);
    }
    return item;
  }
}
