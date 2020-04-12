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
  async editSubmission(
    @Res() res,
    @Param('settingID') userID,
    @Body() createSettingDTO: CreateSettingDTO,
  ) {
    const setting = await this.settingService.updateSetting(
      userID,
      createSettingDTO,
    );
    return res.status(HttpStatus.OK).json({
      message: 'Setting has been updated successfully',
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
