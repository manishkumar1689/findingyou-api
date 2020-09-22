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
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SettingService } from './setting.service';
import { CreateSettingDTO } from './dto/create-setting.dto';
import { notEmptyString } from '../lib/validators';
import { extractDocId } from '../lib/entities';
import { UserService } from '../user/user.service';
import { exportCollection, listFiles } from '../lib/operations';
import {
  checkFileExists,
  buildFullPath,
  smartParseJsonFromBuffer,
  extractJsonData,
  mediaPath,
  writeSettingFile,
} from '../lib/files';
import moment = require('moment');
import availableLanguages from './sources/languages';
import defaultLanguageOptions from './sources/lang-options';
import { AdminGuard } from '../auth/admin.guard';
import { ServerResponse } from 'http';
import { extractUidFromResponse } from 'src/auth/auth.utils';

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

  // Return the data from a particular setting identified by key
  // as downloadable JSON file
  @Get('json-file/:key')
  async jsonByKey(@Res() res, @Param('key') key) {
    const setting = await this.settingService.getByKey(key);
    let data: any = { valid: false };
    if (setting) {
      if (setting.value instanceof Object) {
        data = setting.value;
      }
    }
    res.attachment([key, '.json'].join(''));
    res.header('type', 'application/json');
    return res.send(JSON.stringify(data));
  }

  @Get('languages/:mode?')
  async languages(@Res() res, @Param('mode') mode) {
    const mapLangOpts = row => {
      return { ...row, enabled: true, native: '' };
    };
    const setting = await this.settingService.getByKey('languages');
    const showAll = mode === 'all';
    const bothMode = mode === 'both';
    const appMode = mode === 'app' || bothMode;
    const getDictOpts = mode !== 'app' || bothMode;
    const getAppOpts = mode !== 'dict';
    const hasSetting =
      setting instanceof Object && setting.value instanceof Array;
    const appLangs = getAppOpts
      ? hasSetting
        ? setting.value
        : defaultLanguageOptions.map(row => {
            return { ...row, enabled: true, native: '' };
          })
      : [];
    const dictSetting = await this.settingService.getByKey('dictlangs');
    const hasDictSetting =
      dictSetting instanceof Object && dictSetting.value instanceof Array;

    const dictLangs = getDictOpts
      ? hasDictSetting
        ? dictSetting.value
        : defaultLanguageOptions.map(mapLangOpts)
      : [];
    const values = showAll
      ? availableLanguages.map(lang => {
          const { name, code2l } = lang;
          const saved = appLangs.find(lang => lang.key === code2l);
          const dictOpt = dictLangs.find(lang => lang.key === code2l);
          const inApp = saved instanceof Object;
          const inDict = dictOpt instanceof Object;
          const native =
            inApp && notEmptyString(saved.native, 2)
              ? saved.native
              : inDict && notEmptyString(dictOpt.native, 2)
              ? dictOpt.native
              : lang.native;
          return {
            key: code2l,
            name,
            native,
            appWeight: inApp ? saved.weight : 9999,
            dictWeight: inDict ? dictOpt.weight : 9999,
            inApp,
            inDict,
          };
        })
      : appMode
      ? appLangs
      : dictLangs;
    if (bothMode) {
      dictLangs.forEach(row => {
        if (values.some(lang => lang.key === row.key) === false) {
          values.push(row);
        }
      });
    }
    const data = {
      valid: values.length > 0,
      languages: values,
    };

    return res.status(HttpStatus.OK).json(data);
  }

  // Return the data from a particular setting identified by key
  // as downloadable JSON file
  @Get('get-file/:directory/:name')
  async fileByName(
    @Res() res,
    @Param('directory') directory,
    @Param('name') name,
  ) {
    let fullPath = '';
    res.attachment([directory, name].join('-'));
    res.header('type', 'application/json');
    if (checkFileExists(name, directory)) {
      fullPath = buildFullPath(name, directory);
    }
    return res.sendFile(fullPath);
  }

  // Fetch a particular setting using ID
  @Delete('delete/:settingID/:userID')
  async delete(
    @Res() res,
    @Param('settingID') settingID,
    @Param('userID') userID,
  ) {
    const data = { valid: false, setting: '' };
    if (this.userService.isAdminUser(userID)) {
      data.setting = await this.settingService.delete(settingID);
      data.valid = data.setting.toString().length > 6;
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @UseGuards(AdminGuard)
  @Get('list-dir/:directory')
  async listDirectory(@Res() res, @Param('directory') directory) {
    const data = await listFiles(directory);
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('backup/:userID/:key')
  async backup(@Res() res, @Param('userID') userID, @Param('key') key) {
    const data = { valid: false, outfile: '' };
    //const filePath = [backupPath, '/', key, '.json'].join('');
    const isAdmin = await this.userService.isAdminUser(userID);
    if (isAdmin) {
      data.outfile = exportCollection(key);
      data.valid = notEmptyString(data.outfile);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Post('import-custom/:key')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCustom(@Res() res, @Param('key') key, @UploadedFile() file) {
    const jsonData = extractJsonData(file, key, 'replace');
    if (jsonData.get('valid')) {
      const setting = await this.settingService.getByKey(key);
      if (setting) {
        if (setting.value instanceof Object) {
          const customValue = setting.value;
          const dateSuffix = moment().format('YYYY-MM-DD-HH-mm-ss');
          const fileName = [
            'custom-setting-',
            key,
            '-',
            dateSuffix,
            '.json',
          ].join('');
          writeSettingFile(fileName, customValue);
          jsonData.set('restore', fileName);
        }
      }
    }
    return res.status(HttpStatus.OK).json(Object.fromEntries(jsonData));
  }

  @Post('import/:mode/:key')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCollection(
    @Res() res,
    @Param('mode') mode,
    @Param('key') key,
    @UploadedFile() file,
  ) {
    const jsonData = extractJsonData(file, key, mode);
    if (jsonData.get('isArrayOfObjects')) {
      let module = '';
      let schemaName = '';
      switch (key) {
        case 'users':
        case 'user':
          module = 'user';
          schemaName = 'user';
          break;
      }
      const schemas = require('../' +
        module +
        '/schemas/' +
        schemaName +
        '.schema');

      if (schemas.constructor instanceof Function) {
        //const sch = schemas.constructor();
        Object.entries(schemas).forEach(entry => {
          const name = entry[0];
          const item: any = entry[1];
          if (name.endsWith('Schema')) {
            if (item instanceof Object) {
              const objKeys = Object.keys(item);
              if (objKeys.includes('obj')) {
                if (item.obj instanceof Object) {
                  const validKeys = Object.keys(item.obj);
                  jsonData.set('validKeys', validKeys);
                }
              }
            }
          }
        });
      }
    }
    return res.status(HttpStatus.OK).json(Object.fromEntries(jsonData));
  }
}
