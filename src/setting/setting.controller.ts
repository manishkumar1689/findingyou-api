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
import { notEmptyString } from 'src/lib/validators';

@Controller('setting')
export class SettingController {
  constructor(private settingService: SettingService) {}

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
      setting = await this.settingService.updateSetting(
        matchedSetting._id,
        createSettingDTO,
      );
      if (setting) {
        message = 'Setting has been updated successfully';
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

  // Fetch a particular setting using ID
  @Get('item/:settingID')
  async getSetting(@Res() res, @Param('settingID') settingID) {
    const setting = await this.settingService.getSetting(settingID);
    if (!setting) {
      throw new NotFoundException('Setting does not exist!');
    }
    return res.status(HttpStatus.OK).json(setting);
  }
}
