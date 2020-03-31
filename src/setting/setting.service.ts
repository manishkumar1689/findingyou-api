import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Setting } from './interfaces/setting.interface';
import { CreateSettingDTO } from './dto/create-setting.dto';

@Injectable()
export class SettingService {
  constructor(
    @InjectModel('Setting') private readonly settingModel: Model<Setting>,
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
  // Get a single Setting
  async getSetting(settingID): Promise<Setting> {
    const setting = await this.settingModel.findById(settingID).exec();
    return setting;
  }

  // Get a single Setting
  async getByKeyPattern(pattern: string): Promise<Setting[]> {
    const rgx = new RegExp(pattern, 'i');
    return await this.settingModel.find({ key: rgx }).exec();
  }

  // post a single Setting
  async addSetting(createSettingDTO: CreateSettingDTO): Promise<Setting> {
    const newSetting = new this.settingModel(createSettingDTO);
    return newSetting.save();
  }
  // Edit Setting details
  async updateSetting(
    settingID,
    createSettingDTO: CreateSettingDTO,
  ): Promise<Setting> {
    const updatedSetting = await this.settingModel.findByIdAndUpdate(
      settingID,
      createSettingDTO,
      { new: true },
    );
    return updatedSetting;
  }
}