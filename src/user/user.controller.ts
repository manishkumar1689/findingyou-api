import {
  Controller,
  Get,
  Res,
  Req,
  HttpStatus,
  Post,
  Body,
  Put,
  Query,
  NotFoundException,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { MessageService } from '../message/message.service';
import { SettingService } from '../setting/setting.service';
import { GeoService } from '../geo/geo.service';
import { CreateUserDTO } from './dto/create-user.dto';
import { LoginDTO } from './dto/login.dto';
import { validEmail, notEmptyString } from '../lib/validators';
import { smartCastInt } from '../lib/converters';
import { Request } from 'express';
import { fromBase64, toBase64 } from '../lib/hash';
import { maxResetMinutes } from '../.config';
import * as bcrypt from 'bcrypt';
import {
  extractDocId,
  extractSimplified,
  extractObjectAndMerge,
  hashMapToObject,
} from '../lib/entities';
import roleValues from './settings/roles';
import paymentValues from './settings/payments-options';
import countryValues from './settings/countries';
import getDefaultPreferences from './settings/preference-options';
import surveyList from './settings/survey-list';
import multipleKeyScales from './settings/multiscales';
import permissionValues from './settings/permissions';
import { Role } from './interfaces/role.interface';
import { EditStatusDTO } from './dto/edit-status.dto';
import { PaymentOption } from './interfaces/payment-option.interface';
import { RemoveStatusDTO } from './dto/remove-status.dto';
import { CountryOption } from './interfaces/country-option.interface';
import { PreferenceOption } from './interfaces/preference-option.interface';
import { AstrologicService } from '../astrologic/astrologic.service';
import { SurveyItem } from './interfaces/survey-item';
import { SnippetService } from '../snippet/snippet.service';
import { ProfileDTO } from './dto/profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { generateFileName, readRawFile, uploadMediaFile } from '../lib/files';
import { PreferenceDTO } from './dto/preference.dto';
import { SampleDataDTO } from './dto/sample-data.dto';
import { SampleRecordDTO } from './dto/sample-record.dto';
import { simplifyChart } from 'src/astrologic/lib/member-charts';
import { MediaItemDTO } from './dto/media-item.dto';

@Controller('user')
export class UserController {
  constructor(
    private userService: UserService,
    private messageService: MessageService,
    private settingService: SettingService,
    private snippetService: SnippetService,
    private astrologicService: AstrologicService,
    private geoService: GeoService,
  ) {}

  // add a user
  @Post('create')
  async addUser(@Res() res, @Body() createUserDTO: CreateUserDTO) {
    let msg = 'N/A';
    let userData = {};
    let valid = false;
    const existing = await this.userService.findOneByEmail(
      createUserDTO.identifier,
      false,
    );
    if (existing) {
      msg = 'A user with this email address already exists';
    } else {
      if (validEmail(createUserDTO.identifier)) {
        const roles = await this.getRoles();
        const user = await this.userService.addUser(createUserDTO, roles);
        if (user) {
          msg = 'User has been created successfully';
          userData = extractSimplified(user, ['password']);
          valid = true;
        } else {
          msg = 'Could not create a new user';
        }
      } else {
        msg = 'Please enter a valid email address';
      }
    }
    return res.status(HttpStatus.OK).json({
      message: msg,
      user: userData,
      valid,
    });
  }

  // add a user
  @Post('auth-user')
  async authUser(@Res() res, @Body() createUserDTO: CreateUserDTO) {
    let msg = 'N/A';
    let userData: any = {};
    let valid = false;
    const existing = await this.userService.findOneByEmail(
      createUserDTO.identifier,
      false,
    );
    if (existing) {
      const userID = extractDocId(existing);
      const loginDt = await this.userService.registerLogin(userID);
      valid = existing.active;
      const user = extractSimplified(existing, ['password']);
      const ud: Map<string, any> = new Map(Object.entries(user));
      ud.set('login', loginDt);
      const charts = await this.astrologicService.getChartsByUser(
        userID,
        0,
        10,
        true,
      );
      if (charts.length > 0) {
        ud.set('chart', simplifyChart(charts[0]));
      }
      userData = hashMapToObject(ud);
    }
    if (!valid) {
      if (validEmail(createUserDTO.identifier)) {
        const roles = await this.getRoles();
        const user = await this.userService.addUser(createUserDTO, roles);
        if (user) {
          msg = 'User has been created successfully';
          userData = extractSimplified(user, ['password']);
          valid = true;
        } else {
          msg = 'Could not create a new user';
        }
      } else {
        msg = 'Please enter a valid email address';
      }
    }
    return res.status(HttpStatus.OK).json({
      message: msg,
      user: userData,
      valid,
    });
  }

  @Put('edit/:userID')
  async editUser(
    @Res() res,
    @Param('userID') userID,
    @Body() createUserDTO: CreateUserDTO,
  ) {
    const user = await this.userService.updateUser(userID, createUserDTO);
    return res.status(HttpStatus.OK).json({
      message: 'User has been updated successfully',
      user,
    });
  }

  // Retrieve users list
  @Get('list/:start?/:limit?')
  async getUsersByCriteria(
    @Res() res,
    @Param('start') start,
    @Param('limit') limit,
    @Req() request: Request,
  ) {
    start = smartCastInt(start, 0);
    limit = smartCastInt(limit, 100);
    const criteria = request.query;
    let activeOnly = true;
    if (criteria.admin) {
      activeOnly = false;
    }
    const users = await this.userService.list(
      start,
      limit,
      criteria,
      activeOnly,
    );
    const total = await this.userService.count(criteria, activeOnly);
    return res.status(HttpStatus.OK).json({
      start,
      total,
      perPage: limit,
      num: users.length,
      items: users,
    });
  }

  /**
   * Optional query string parameters include:
   * roles: comma-separated list of role keys
    fullName: fuzzy match full name from beginning
    nickName: fuzzy match display name from beginning
    usearch: fuzzy match on fullName, nickName or email
    gender: f/m
    age: comma-separated age range, e.g. 20,30
    near: [lat],[lng],[km] e.g. 77,28,5 => within a 5km radius of 77º E 28º N
   * @param res 
   * @param start 
   * @param limit 
   * @param request 
   * @returns 
   */
  @Get('members/:start?/:limit?')
  async listMembers(
    @Res() res,
    @Param('start') start,
    @Param('limit') limit,
    @Req() request: Request,
  ) {
    const { query } = request;
    const startInt = smartCastInt(start, 0);
    const limitInt = smartCastInt(limit, 100);
    const data = await this.userService.members(startInt, limitInt, query);
    const prefOptions = await this.settingService.getPreferences();
    const users = this.userService.filterByPreferences(
      data,
      query,
      prefOptions,
    );
    const items = [];
    for (const user of users) {
      const chartObj = await this.astrologicService.getUserBirthChart(user._id);
      const hasChart = chartObj instanceof Object;
      const chart = hasChart ? simplifyChart(chartObj) : {};
      items.push({...user, chart, hasChart});
    }
    items.sort((a,b) => b.hasChart ? 1 : -1);
    return res.json(items);
  }

  // Fetch a particular user using ID
  @Get('role-options')
  async listRoles(@Res() res) {
    const paymentOpts = await this.getPaymentOptions();
    const roles = await this.getRoles();
    const data = roles.map(role => {
      const payOpts = paymentOpts.filter(
        po => po.key.split('__').shift() == role.key,
      );
      return { ...role, payOpts };
    });
    return res.status(HttpStatus.OK).json(data);
  }

  // Fetch a particular user using ID
  @Get('payment-options')
  async listPaymentOptions(@Res() res) {
    const items = await this.getPaymentOptions();
    return res.status(HttpStatus.OK).json(items);
  }

  @Get('country-options')
  async listCountryOptions(@Res() res) {
    const data = {
      valid: countryValues instanceof Array,
      items: countryValues,
    };
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('permissions')
  async listPermissions(@Res() res) {
    const data = {
      valid: permissionValues instanceof Array,
      items: permissionValues,
    };
    return res.status(HttpStatus.OK).json(data);
  }

  // Fetch a particular user using ID
  @Get('item/:userID')
  async getUser(@Res() res, @Param('userID') userID) {
    const user = await this.userService.getUser(userID);
    if (!user) {
      throw new NotFoundException('User does not exist!');
    }
    return res.status(HttpStatus.OK).json(user);
  }

  // Fetch preference options
  @Get('survey-list')
  async listSurveys(@Res() res) {
    const setting = await this.settingService.getByKey('survey_list');
    let data: Array<SurveyItem> = [];
    if (!setting) {
      data = surveyList;
    } else {
      if (setting.value instanceof Array) {
        data = setting.value;
      }
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('survey-multiscales')
  async getSurveryMultiscales(@Res() res) {
    const key = 'survey_multiscales';
    const setting = await this.settingService.getByKey(key);
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
    return res.status(HttpStatus.OK).json(data);
  }

  async getPreferencesByKey(surveyKey = '', key = '') {
    const prefOpts = await this.getPreferenceOptions(surveyKey);
    const data = { valid: false, num: 0, items: [] };
    const mapLocalised = v => {
      return {
        lang: v.lang,
        text: v.text,
      };
    };
    if (prefOpts instanceof Array) {
      data.num = prefOpts.length;
      data.valid = data.num > 0;
      data.items = [];
      for (const po of prefOpts) {
        const comboKey = [key, po.key].join('__');
        const vData = await this.snippetService.getSnippetByKeyStart(comboKey);
        const hasVersions = vData.snippet instanceof Object;
        const hasOptionVersions = vData.options.length > 0;
        const versions = {
          prompt: hasVersions ? vData.snippet.values.map(mapLocalised) : [],
          options: {},
        };
        const optMap = new Map<string, Array<any>>();
        if (hasOptionVersions) {
          vData.options.forEach(optSet => {
            const vals = optSet.values
              .filter(v => v instanceof Object)
              .map(mapLocalised);
            optMap.set(optSet.key.split('_option_').pop(), vals);
          });
          versions.options = Object.fromEntries(optMap.entries());
        }
        data.items.push({
          ...po,
          hasVersions,
          versions,
        });
      }
    }
    return data;
  }

  // Fetch preference options
  @Get('preferences/:key?')
  async listPreferenceOptions(@Res() res, @Param('key') key) {
    const showAll = key === 'all';
    const surveyKey = notEmptyString(key, 4) ? key : 'preference_options';
    let data: any = { valid: false };
    if (showAll) {
      const keys = await this.settingService.getPreferenceKeys();
      const surveys: Map<string, any> = new Map();
      const keyNums: Map<string, number> = new Map();
      for (const sk of keys) {
        const sd = await this.getPreferencesByKey(sk, sk);
        if (sd.valid) {
          surveys.set(sk, sd.items);
          keyNums.set(sk, sd.items.length);
        }
      }
      data.surveys = Object.fromEntries(surveys.entries());
      data.valid = surveys.size > 0;
      data.keyNums = Object.fromEntries(keyNums.entries());
    } else {
      const isSimple = key === 'simple';
      const refKey = isSimple ? '' : key;
      const refSurveyKey = isSimple ? 'preference_options' : surveyKey;
      data = await this.getPreferencesByKey(refSurveyKey, refKey);
      if (isSimple) {
        data.items = data.items.map(item => {
          const {key, type} = item;
          let value: any = 'plain text';
          switch (type) {
            case 'range_number':
              value = [18, 30];
              break;
            case 'uri':
              value = 'https://resource.com/03736335/video/393737';
              break;
            case 'string':
              value = 'word_of_mouth';
              break;
            case 'array_string':
              value = ['no_beef', 'no_pork'];
              break;
            case 'integer':
              value = 15;
              break;
            case 'float':
              value = 2.5;
              break;
            case 'key_scale':
              value = { never: 0};
              break;
            case 'scale':
              value = 2;
              break;
            case 'array_key_scale':
              value = { cricket: 5, football: 3, tennis: 1 };
              break;
            case 'boolean':
              value = true;
              break;
            case 'multiple_key_scales':
              value = { 
                key: 'optimistic',
                values: {
                  happiness: 4,
                  success: 2,
                  reliability: 1,
                  aspiration: 2
                }
              };
              break;
            case 'array_float':
              value = [2.8, 11.9];
              break;
            case 'array_integer':
              value = [30, 40, 12];
              break;
            case 'text':
              value = "Cambridge University";
              break;
          }
          return { key, type, value };
        })
      }
    }
    return res.status(HttpStatus.OK).json(data);
  }

  // Fetch a particular user using ID
  @Post('login')
  async login(@Res() res, @Body() loginDTO: LoginDTO) {
    const data = await this.processLogin(loginDTO);
    const status = data.valid? HttpStatus.OK : HttpStatus.NOT_ACCEPTABLE;
    return res.status(status).json(data);
  }

  @Post('member-login')
  async memberLogin(@Res() res, @Body() loginDTO: LoginDTO) {
    const data = await this.processLogin(loginDTO, 'member');
    const status = data.valid? HttpStatus.OK : HttpStatus.NOT_ACCEPTABLE;
    return res.status(status).json(data);
  }

  async processLogin(loginDTO: LoginDTO, mode = 'editor') {
    const user = await this.userService.findOneByEmail(loginDTO.email, false);
    const userData = new Map<string, any>();
    let valid = false;
    const isMemberLogin = mode === 'member';
    const maxCharts = isMemberLogin? 10 : 100;
    if (!user) {
      userData.set('msg', 'User not found');
      userData.set('key', 'not-found');
    } else {
      valid = user.active;
      if (!valid) {
        userData.set('msg', 'Inactive account');
        userData.set('key', 'inactive');
      }
      if (user.password) {
        if (valid) {
          valid = bcrypt.compareSync(loginDTO.password, user.password);

          if (!valid) {
            userData.set('msg', 'Invalid password');
          }
        }
      } else {
        valid = false;
        userData.set('msg', 'Invalid password');
      }
      if (valid) {
        extractObjectAndMerge(user, userData, ['password', 'status', 'token']);
        const userID = extractDocId(user);
        const loginDt = await this.userService.registerLogin(userID);
        userData.set('login', loginDt);

        const chart = await this.astrologicService.getUserBirthChart(userID);
        if (chart instanceof Object) {
          const chartObj = isMemberLogin? simplifyChart(chart) : chart;
          userData.set('chart', chartObj);
        }
      }
    }
    userData.set('valid', valid);
    return hashMapToObject(userData);
  }

  // Fetch a particular user using ID
  @Post('edit-status')
  async editStatus(@Res() res, @Body() editStatusDTO: EditStatusDTO) {
    const roles = await this.getRoles();
    const paymentOptions = await this.getPaymentOptions();
    const { user, role, paymentOption, payment, expiryDate } = editStatusDTO;
    let expiryDt = null;
    if (expiryDate) {
      expiryDt = new Date(expiryDate);
    }
    const matchedPO = paymentOptions.find(po => po.key === paymentOption);
    let data: any = { valid: false };
    if (roles.some(r => r.key === role)) {
      const userData = await this.userService.updateStatus(
        user,
        role,
        roles,
        matchedPO,
        payment,
        expiryDt,
      );
      data = {
        valid: true,
        userData,
      };
    }

    return res.status(HttpStatus.OK).json(data);
  }

  // Fetch a particular user using ID
  @Post('remove-status')
  async removeStatus(@Res() res, @Body() removeStatusDTO: RemoveStatusDTO) {
    const { user, role } = removeStatusDTO;

    const userData = await this.userService.removeStatus(user, role);
    const data = {
      valid: userData instanceof Object,
      userData,
    };
    return res.status(HttpStatus.OK).json(data);
  }

  async matchUserByHash(hash: string) {
    const idStr = fromBase64(hash);
    let user = null;
    let matched = false;
    if (idStr.includes('__')) {
      const [userID, tsStr] = idStr.split('__');
      const ts = Math.floor(parseFloat(tsStr));
      const currTs = new Date().getTime();
      const tsAgo = currTs - ts;
      const maxTs = maxResetMinutes * 60 * 1000;
      if (tsAgo <= maxTs) {
        user = await this.userService.findOneByToken(tsStr);
        if (user) {
          const matchedUserId = extractDocId(user);
          matched = matchedUserId === userID;
        }
      }
    }
    return { user, matched };
  }

  @Get('reset/:hash')
  async resetMatch(@Res() res, @Param('hash') hash) {
    const { user, matched } = await this.matchUserByHash(hash);
    const userData = new Map<string, any>();
    let valid = false;
    if (!user) {
      userData.set('msg', 'User not found');
      userData.set('key', 'not-found');
    } else {
      if (matched) {
        valid = user.active;
        if (!valid) {
          userData.set('msg', 'Inactive account');
          userData.set('key', 'inactive');
        }
      }
      if (valid) {
        extractObjectAndMerge(user, userData, ['password', 'status']);
      }
    }
    userData.set('valid', valid);
    return res.status(HttpStatus.OK).json(hashMapToObject(userData));
  }

  @Put('reset-pass/:hash')
  async resetPassword(
    @Res() res,
    @Param('hash') hash,
    @Body() loginDTO: LoginDTO,
  ) {
    let { user, matched } = await this.matchUserByHash(hash);
    const userData = new Map<string, any>();
    let valid = false;
    if (!user) {
      userData.set('msg', 'User not found');
      userData.set('key', 'not-found');
    } else {
      if (matched) {
        valid = user.active;
        if (!valid) {
          userData.set('msg', 'Inactive account');
          userData.set('key', 'inactive');
        } else {
          const password = loginDTO.password;
          if (password.length > 7) {
            const userID = extractDocId(user);
            const updatedUser = await this.userService.updatePassword(
              userID,
              password,
            );
            if (updatedUser) {
              user = updatedUser;
            }
          }
        }
      }
      if (valid) {
        extractObjectAndMerge(user, userData, ['password', 'status']);
      }
    }
    userData.set('valid', valid);
    return res.status(HttpStatus.OK).json(hashMapToObject(userData));
  }

  async triggerResetRequest(userID: string, @Res() res) {
    const user = await this.userService.requestReset(userID, 'forgotten');
    const data = new Map<string, any>();
    data.set('valid', false);
    if (user) {
      if (user.token) {
        const resetLink = '/#reset/' + toBase64(userID + '__' + user.token);
        data.set('token', user.token);
        data.set('reset', true);
        data.set('link', resetLink);
        data.set('valid', true);
        const userName = [user.fullName, user.nickName].join(' ');
        this.messageService.resetMail(user.identifier, userName, resetLink);
      }
    }
    return res.status(HttpStatus.OK).json(hashMapToObject(data));
  }

  @Put('reset/:userID')
  async reset(@Res() res, @Param('userID') userID) {
    return this.triggerResetRequest(userID, res);
  }

  @Post('reset-request')
  async resetRequest(@Res() res, @Body() loginDTO: LoginDTO) {
    const user = await this.userService.findOneByEmail(loginDTO.email);
    let userID = '';
    if (user) {
      userID = extractDocId(user);
    }
    if (userID.length > 3) {
      return this.triggerResetRequest(userID, res);
    } else {
      return res
        .status(HttpStatus.OK)
        .json({ valid: false, message: 'Not found' });
    }
  }

  /*   @Put('status/:userID/:status')
  async updateStatus(
    @Res() res,
    @Param('userID') userID,
    @Param('status') status,
  ) {
    const user = await this.userService.updateStatus(userID, status);
    let userData = {};
    let message = '';
    if (user) {
      userData = extractSimplified(user, ['password', 'status']);
      message = "User's status has been updated successfully";
    } else {
      message = "User's status has not been updated";
    }
    return res.status(HttpStatus.OK).json({
      message,
      user: userData,
    });
  } */

  async matchRole(key: string) {
    const roles = await this.getRoles();
    let role: Role = {
      key: '',
      name: '',
      overrides: [],
      adminAccess: false,
      appAccess: false,
      permissions: [''],
    };
    const matched = roles.find(r => r.key === key);
    if (matched) {
      role = matched;
    }
    return role;
  }

  async getRoles(): Promise<Array<Role>> {
    const setting = await this.settingService.getByKey('roles');
    let data: Array<Role> = [];
    if (!setting) {
      data = roleValues;
    } else if (setting instanceof Object) {
      if (setting.value instanceof Array) {
        data = setting.value;
      }
    }
    return data;
  }

  async getPaymentOptions(): Promise<Array<PaymentOption>> {
    const setting = await this.settingService.getByKey('payments');
    let data: Array<PaymentOption> = [];
    if (!setting) {
      data = paymentValues;
    } else if (setting instanceof Object) {
      if (setting.value instanceof Array) {
        data = setting.value.map(st => {
          if (!st.isFallback) {
            st.isFallback = false;
          }
          if (!st.ccodes) {
            st.ccodes = [];
          }
          return st;
        });
      }
    }
    return data;
  }

  async getCountryOptions(): Promise<Array<CountryOption>> {
    const setting = await this.settingService.getByKey('countries');
    let data: Array<CountryOption> = [];
    if (!setting) {
      data = countryValues;
    } else if (setting instanceof Object) {
      if (setting.value instanceof Array) {
        data = setting.value;
      }
    }
    return data;
  }

  async getPreferenceOptions(
    surveyKey = 'preference_options',
  ): Promise<Array<PreferenceOption>> {
    const setting = await this.settingService.getByKey(surveyKey);
    let data: Array<PreferenceOption> = [];
    if (!setting) {
      data = getDefaultPreferences(surveyKey);
    } else {
      if (setting.value instanceof Array) {
        data = setting.value;
      }
    }
    return data;
  }

  @Put('profile/save/:userID')
  async saveProfile(
    @Res() res,
    @Param('userID') userID,
    @Body() profileDTO: ProfileDTO,
  ) {
    const data = await this.userService.saveProfile(userID, profileDTO);
    return res.json(data);
  }

  @Put('preference/save/:userID')
  async savePreference(
    @Res() res,
    @Param('userID') userID,
    @Body() preferenceDTO: PreferenceDTO,
  ) {
    const data = await this.userService.savePreference(userID, preferenceDTO);
    return res.json(data);
  }

  @Get('fix-preferences/:start?/:limit?')
  async fixPreferences(
    @Res() res,
    @Param('start') start,
    @Param('limit') limit,
  ) {
    const startInt = smartCastInt(start, 0);
    const limitInt = smartCastInt(limit, 10);
    const preferences = await this.settingService.getPreferences();
    const data = await this.userService.fixPreferences(
      startInt,
      limitInt,
      preferences,
    );
    return res.json(data);
  }

  @Post('profile-upload/:userID/:type/:name?/:title?')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Res() res,
    @Param('userID') userID,
    @Param('type') type,
    @Param('name') name = '',
    @Param('title') title = '',
    @UploadedFile() file,
  ) {
    let data: any = { valid: false, fileData: null };
    if (file instanceof Object) {
      const { originalname, mimetype, size, buffer } = file;
      const fn = notEmptyString(name, 5)
        ? name
        : generateFileName(userID, originalname);

      const fileData = {
        filename: fn,
        mime: mimetype,
        size,
        title,
      };
      data = { valid: false, fileData };
      const intSize = parseInt(size, 10);
      const { filename, attributes, variants } = uploadMediaFile(
        userID,
        originalname,
        buffer,
        'image',
      );
      if (filename.length > 5) {
        const fileData = {
          filename,
          mime: mimetype,
          size: intSize,
          source: 'local',
          attributes,
          variants,
        };
        const savedSub = await this.userService.saveProfileImage(
          userID,
          type,
          fileData,
        );
        if (savedSub.valid) {
          data.user = savedSub.user;
        }
        data.valid = true;
      }
    }
    return res.json(data);
  }

  @Delete('media-item/delete/:userID/:mediaRef')
  async deleteMediaItem(
    @Res() res,
    @Param('userID') userID,
    @Param('mediaRef') mediaRef,
  ) {
    let data: any = { valid: false, fileData: null };
    const item = await this.userService.deleteMediaItemByRef(userID, mediaRef);
    return res.json(item);
  }

  @Put('media-item/edit/:userID/:mediaRef?/:type?')
  async editMediaItem(
    @Res() res,
    @Param('userID') userID,
    @Param('mediaRef') mediaRef,
    @Param('type') type,
    @Body() mediaItem: MediaItemDTO,
  ) {
    const profileType = notEmptyString(type, 2)? type : 'public';
    const mediaRefName = notEmptyString(mediaRef, 5)? mediaRef : '';
    const result = await this.userService.editMediaItemByRef(userID, mediaRefName, mediaItem, profileType);
    return res.json(result);
  }

  @Post('bulk/sample-import')
  async bulkSampleImprt(@Res() res, @Body() sampleDataDTO: SampleDataDTO) {
    const data: Map<string, any> = new Map();
    if (sampleDataDTO.items.length > 0) {
      for (const item of sampleDataDTO.items) {
        await this.saveImportedUser(item);
      }
    }
    return res.status(HttpStatus.OK).json(hashMapToObject(data));
  }

  @Get('bulk/test-import')
  async bulkTestImport(@Res() res) {
    const items = [];
    const json = readRawFile('test-users.json', 'source');
    const sourceData = JSON.parse(json);
    if (sourceData instanceof Array) {
      for (const row of sourceData) {
        const result = await this.userService.create(row);
        items.push(result);
      }
    }
    return res.status(HttpStatus.OK).json(items);
  }

  async saveImportedUser(item: SampleRecordDTO) {
    const astrobankPart = 'astro-databank/';
    const identifier = item.url.includes(astrobankPart)
      ? '/' + astrobankPart + item.url.split(astrobankPart).pop()
      : item.url;
    const user = {
      identifier,
      nickName: item.name,
      fullName: item.name,
      testMode: true,
      mode: 'local',
    };
    this.userService.create(user);
  }
}
