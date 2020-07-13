import {
  Controller,
  Get,
  Res,
  HttpStatus,
  Post,
  Body,
  Put,
  Query,
  NotFoundException,
  Delete,
  Param,
} from '@nestjs/common';
import { SettingService } from './setting.service';
import { CreateSettingDTO } from './dto/create-setting.dto';
import { notEmptyString } from '../lib/validators';
import { extractDocId } from '../lib/entities';
import { UserService } from '../user/user.service';
import { mongo, backupPath } from '../.config';
import { exportCollection } from 'src/lib/operations';

@Controller('setting')
export class SettingController {
  constructor(
    private settingService: SettingService,
    private userService: UserService,
  ) {}

  // add a setting
  @Post('create')
  async addSetting(@Res() res, @Body() createSettingDTO: CreateSettingDTO) {
    const setting = await this.settingService.addSetting(createSettingDTO);
    return res.status(HttpStatus.OK).json({
      message: 'Setting has been created successfully',
      setting,
    });
  }

  @Put('edit/:settingID')
  async editSetting(
    @Res() res,
    @Param('settingID') settingID,
    @Body() createSettingDTO: CreateSettingDTO,
  ) {
    const setting = await this.settingService.updateSetting(
      settingID,
      createSettingDTO,
    );
    return res.status(HttpStatus.OK).json({
      message: 'Setting has been updated successfully',
      setting,
    });
  }

  @Put('edit-by-key/:key/:userID')
  async editSettingByKey(
    @Res() res,
    @Param('key') key,
    @Param('userID') userID,
    @Body() createSettingDTO: CreateSettingDTO,
  ) {
    let setting: any = {};
    let message = 'Invalid key or user ID';
    if (notEmptyString(userID, 9)) {
      const matchedSetting = await this.settingService.getByKey(key);
      if (matchedSetting) {
        setting = await this.settingService.updateSetting(
          extractDocId(matchedSetting),
          createSettingDTO,
        );
        if (setting) {
          message = 'Setting has been updated successfully';
        }
      } else {
        const settingDTO = {
          ...createSettingDTO,
          key,
        };
        setting = await this.settingService.addSetting(settingDTO);
        if (setting) {
          message = 'Setting has been created successfully';
        }
      }
    }
    return res.status(HttpStatus.OK).json({
      message,
      setting,
    });
  }

  // Retrieve settings list
  @Get('list')
  async getAllSetting(@Res() res) {
    const settings = await this.settingService.getAllSetting();
    return res.status(HttpStatus.OK).json(settings);
  }

  // Retrieve settings list
  @Get('list-custom')
  async getCustomSetting(@Res() res) {
    const settings = await this.settingService.getCustom();
    return res.status(HttpStatus.OK).json(settings);
  }

  // Fetch a particular setting using ID
  @Get('item/:settingID')
  async getSetting(@Res() res, @Param('settingID') settingID) {
    const setting = await this.settingService.getSetting(settingID);
    if (!setting) {
      throw new NotFoundException('Setting does not exist!');
    }
    return res.status(HttpStatus.OK).json(setting);
  }

  // Fetch a particular setting using ID
  @Get('by-key/:key')
  async getByKey(@Res() res, @Param('key') key) {
    const setting = await this.settingService.getByKey(key);
    if (!setting) {
      throw new NotFoundException('Setting does not exist!');
    }
    return res.status(HttpStatus.OK).json(setting);
  }

  // Fetch a particular setting using ID
  @Get('json-file/:key')
  async jsonByKey(@Res() res, @Param('key') key) {
    const setting = await this.settingService.getByKey(key);
    let data: any = { valid: false };
    if (setting) {
      if (setting.value instanceof Object) {
        data = setting.value;
      }
    }
    res.attachment([key,'.json'].join(''));
    res.header('type', 'application/json');
    return res.send(JSON.stringify(data));
  }

  // Fetch a particular setting using ID
  @Delete('delete/:settingID/:userID')
  async delete(@Res() res,@Param('settingID') settingID, @Param('userID') userID) {
    const data = {valid:false, setting: ''};
    if (this.userService.isAdminUser(userID)) {
      data.setting = await this.settingService.delete(settingID);
      data.valid = data.setting.toString().length > 6;
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('backup/:usedID/:key')
  async backup(@Res() res, @Param('userID') userID, @Param('key') key) {
    const data = {valid: false, outfile: ''};
    const filePath = [backupPath, '/', key, '.json'].join('');
    const isAdmin = await this.userService.isAdminUser(userID);
    if (isAdmin) {
      data.outfile = exportCollection(key);
      data.valid = notEmptyString(data.outfile);
    }
    return res.status(HttpStatus.OK).json(data);
  }

}
