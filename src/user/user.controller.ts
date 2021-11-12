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
import {
  validEmail,
  notEmptyString,
  isNumeric,
  validISODateString,
} from '../lib/validators';
import { smartCastInt, toStartRef } from '../lib/converters';
import { Request } from 'express';
import {
  fromBase64,
  match6DigitsToken,
  toBase64,
  tokenTo6Digits,
} from '../lib/hash';
import { maxResetMinutes } from '../.config';
import * as bcrypt from 'bcrypt';
import {
  extractDocId,
  extractSimplified,
  extractObjectAndMerge,
  hashMapToObject,
} from '../lib/entities';
import roleValues, { filterLikeabilityKey } from './settings/roles';
import paymentValues from './settings/payments-options';
import countryValues from './settings/countries';
import surveyList from './settings/survey-list';
import { Role } from './interfaces/role.interface';
import { EditStatusDTO } from './dto/edit-status.dto';
import { PaymentOption } from './interfaces/payment-option.interface';
import { RemoveStatusDTO } from './dto/remove-status.dto';
import { CountryOption } from './interfaces/country-option.interface';
import { AstrologicService } from '../astrologic/astrologic.service';
import { SurveyItem } from './interfaces/survey-item';
import { SnippetService } from '../snippet/snippet.service';
import { FeedbackService } from '../feedback/feedback.service';
import { ProfileDTO } from './dto/profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  deleteFile,
  generateFileName,
  matchFileTypeAndMime,
  mediaPath,
  readRawFile,
  uploadMediaFile,
} from '../lib/files';
import { PreferenceDTO } from './dto/preference.dto';
import { SampleDataDTO } from './dto/sample-data.dto';
import { SampleRecordDTO } from './dto/sample-record.dto';
import { simplifyChart } from '../astrologic/lib/member-charts';
import { MediaItemDTO } from './dto/media-item.dto';
import {
  filterLikeabilityContext,
  IFlag,
  mapLikeabilityRelations,
} from '../lib/notifications';
import { Model } from 'mongoose';
import { ActiveStatusDTO } from './dto/active-status.dto';
import { dateAgoString } from 'src/astrologic/lib/date-funcs';

@Controller('user')
export class UserController {
  constructor(
    private userService: UserService,
    private messageService: MessageService,
    private settingService: SettingService,
    private snippetService: SnippetService,
    private astrologicService: AstrologicService,
    private geoService: GeoService,
    private feedbackService: FeedbackService,
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

  /*
    #mobile
    #admin
    #astrotesting
  */
  @Post('auth-user')
  async authUser(@Res() res, @Body() createUserDTO: CreateUserDTO) {
    let msg = 'N/A';
    let userData: any = {};
    let valid = false;
    const existing = await this.userService.findOneByEmail(
      createUserDTO.identifier,
      false,
    );
    const { deviceToken } = createUserDTO;
    if (existing) {
      const userID = extractDocId(existing);
      const loginDt = await this.userService.registerLogin(userID, deviceToken);
      valid = existing.active;
      const user = extractSimplified(existing, ['password', '__v', 'coords']);
      const ud: Map<string, any> = new Map(Object.entries(user));
      ud.set('login', loginDt);
      const charts = await this.astrologicService.getChartsByUser(
        userID,
        0,
        1,
        true,
      );
      if (charts.length > 0) {
        ud.set('chart', simplifyChart(charts[0]));
      }
      const flagItems = await this.feedbackService.getAllUserInteractions(
        userID,
        3 / 12,
      );
      const flags =
        flagItems instanceof Object
          ? flagItems
          : { to: [], from: [], likeability: { to: [], from: [] } };
      const { to, from, likeability } = flags;
      ud.set('flags', {
        to,
        from,
      });
      ud.set('likeability', {
        to: likeability.to,
        from: likeability.from,
      });
      userData = hashMapToObject(ud);
    }
    if (!valid) {
      if (validEmail(createUserDTO.identifier)) {
        const user = await this.userService.addUser(createUserDTO);
        if (user) {
          msg = 'User has been created successfully';
          userData = extractSimplified(user, ['password', 'coords']);
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

  /*
    #mobile
    #admin
    #astrotesting
  */
  @Put('edit/:userID')
  async editUser(
    @Res() res,
    @Param('userID') userID,
    @Body() createUserDTO: CreateUserDTO,
  ) {
    const roles = await this.getRoles();
    const { user, keys, message } = await this.userService.updateUser(
      userID,
      createUserDTO,
      roles,
    );
    const status =
      user instanceof Object && keys.length > 0
        ? HttpStatus.OK
        : HttpStatus.NOT_ACCEPTABLE;

    return res.status(status).json({
      message,
      user,
      editedKeys: keys,
    });
  }

  /*
    #mobile
    #admin
    #astrotesting
  */
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

  @Get('list-csv/:startDt?/:endDt?')
  async listCsv(
    @Res() res,
    @Param('startDt') startDt,
    @Param('endDt') endDt,
    @Req() request: Request,
  ) {
    const startDate = validISODateString(startDt) ? startDt : dateAgoString(92);
    const endDate = validISODateString(endDt) ? endDt : '';
    const hasEndDate = notEmptyString(endDate);
    const { query } = request;
    const filter: Map<string, any> = new Map();
    const activeOnly = true;
    const createdRange = hasEndDate
      ? {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        }
      : {
          $gte: new Date(startDate),
        };
    filter.set('createdAt', createdRange);
    if (query instanceof Object) {
      Object.entries(query).map(([k, v]) => {
        filter.set(k, v);
      });
    }
    const criteria = Object.fromEntries(filter.entries());
    const users = await this.userService.list(0, 10, criteria, activeOnly);
    return res.status(HttpStatus.OK).json({
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
    baseurl/members/0/100?gender=f&age=30,40&near=19.2726,76.38363,50
    #mobile
    #admin
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
    const items = await this.fetchMembers(start, limit, query);
    return res.json(items);
  }

  async fetchMembers(start = 0, limit = 100, queryRef = null) {
    const query: any = queryRef instanceof Object ? queryRef : {};
    const startInt = smartCastInt(start, 0);
    const limitInt = smartCastInt(limit, 100);
    let simpleMode = 'basic';
    let ayanamshaKey = 'true_citra';
    const queryKeys = Object.keys(query);
    let filterIds = [];
    let hasFilterIds = false;
    const notLiked = queryKeys.includes('notliked');
    const hasUser =
      queryKeys.includes('user') && notEmptyString(query.user, 16);
    const userId = hasUser ? query.user : '';
    const isPaidMember = hasUser
      ? await this.userService.isPaidMember(userId)
      : false;
    const context = queryKeys.includes('context') ? query.context : '';
    const hasContext = hasUser && notEmptyString(context, 2);
    const params = hasContext ? filterLikeabilityContext(context) : query;
    const searchMode = context === 'search';
    const paramKeys = Object.keys(params);
    // filter ids by members who have liked or superliked the referenced user
    const likeabilityKeys = [
      'liked',
      'liked1',
      'liked2',
      'passed',
      'likeability',
      'likability',
    ];

    if (
      queryKeys.includes('user') &&
      paramKeys.some(k => likeabilityKeys.includes(k))
    ) {
      const matchedKey = paramKeys.find(k => likeabilityKeys.includes(k));
      const filterByLikeability = notEmptyString(matchedKey);
      if (filterByLikeability) {
        const { refNum, gte } = filterLikeabilityKey(matchedKey);
        const startDate = toStartRef(params[matchedKey]);
        const mutual =
          paramKeys.includes('mutual') && parseInt(params.mutual, 10) > 0;
        const unrated =
          !mutual &&
          paramKeys.includes('unrated') &&
          parseInt(params.unrated, 10) > 0;
        const mutualMode = mutual ? 1 : unrated ? -1 : 0;
        const flags = await this.feedbackService.fetchByLikeability(
          query.user,
          startDate,
          refNum,
          gte,
          mutualMode,
        );
        const skipMutuality = !mutual && !unrated;
        filterIds =
          flags instanceof Array
            ? flags
                .filter(
                  fl =>
                    skipMutuality ||
                    (mutual && fl.isMutual) ||
                    (unrated && !fl.isMutual),
                )
                .map(fl => fl.user)
            : [];
        hasFilterIds = true;
      }
    }
    if (queryKeys.includes('mode') && notEmptyString(query.mode)) {
      switch (query.mode) {
        case 'simple':
        case 'complete':
          simpleMode = query.mode;
          break;
      }
    }
    if (queryKeys.includes('ayanamsha') && notEmptyString(query.ayanamsha)) {
      switch (query.ayanamsha) {
        case 'raw':
        case 'tropical':
          ayanamshaKey = query.ayanamsha;
          break;
      }
    }
    const filterFlagsByUser = (item: IFlag, userId = '') => {
      return item.user.toString() === userId;
    };
    let notFlags = [];
    let trueFlags = [];
    if (hasContext && searchMode) {
      //notFlags = ['like', 'superlike', 'passed3'];
      notFlags = ['passed3'];
      if (isPaidMember) {
        notFlags.push('notliked');
      } else {
        notFlags.push('notliked2');
      }
    } else {
      const notFlagStr = queryKeys.includes('nf')
        ? query.nf
        : queryKeys.includes('not')
        ? query.not
        : '';
      const trueFlagStr = queryKeys.includes('tf')
        ? query.tf
        : queryKeys.includes('flags')
        ? query.not
        : '';
      notFlags = notEmptyString(notFlagStr) ? notFlagStr.split(',') : [];
      trueFlags = notEmptyString(trueFlagStr) ? trueFlagStr.split(',') : [];
    }

    const preFetchFlags = notFlags.length > 0 || trueFlags.length > 0;
    const prefOptions = await this.settingService.getPreferences();
    const {
      userFlags,
      excludedIds,
      includedIds,
    } = await this.feedbackService.fetchFilteredUserInteractions(
      userId,
      notFlags,
      trueFlags,
      preFetchFlags,
      searchMode,
    );
    if (includedIds instanceof Array && trueFlags.length > 0) {
      filterIds = includedIds;
      hasFilterIds = true;
    }
    const queryParams = hasFilterIds ? { query, ids: filterIds } : query;
    if (hasUser) {
      excludedIds.push(userId);
    }
    const data = await this.userService.members(
      startInt,
      limitInt,
      queryParams,
      excludedIds,
    );
    const users = this.userService.filterByPreferences(
      data,
      query,
      prefOptions,
    );
    const otherUserIds = preFetchFlags ? users.map(u => u._id) : [];
    const items = [];

    const flags =
      hasUser && !preFetchFlags
        ? await this.feedbackService.getAllUserInteractions(
            userId,
            1,
            otherUserIds,
          )
        : userFlags;

    for (const user of users) {
      const chartObj = await this.astrologicService.getUserBirthChart(user._id);
      const hasChart = chartObj instanceof Object;
      const chart = hasChart
        ? simplifyChart(chartObj, ayanamshaKey, simpleMode)
        : {};
      const refUserId = user._id.toString();
      let preferences = [];
      if (user.preferences instanceof Array && user.preferences.length > 0) {
        preferences = await this.settingService.processPreferences(
          user.preferences,
        );
      }
      const filteredFlags = hasUser
        ? {
            from: flags.from
              .filter(fl => filterFlagsByUser(fl, refUserId))
              .map(fl => extractSimplified(fl, ['user'])),
            to: flags.to
              .filter(fl => filterFlagsByUser(fl, refUserId))
              .map(fl => extractSimplified(fl, ['user'])),
          }
        : {};
      const filteredLikes = hasUser
        ? {
            from: mapLikeabilityRelations(flags.likeability.from, refUserId),
            to: mapLikeabilityRelations(flags.likeability.to, refUserId),
          }
        : {};
      items.push({
        ...user,
        preferences,
        chart,
        hasChart,
        flags: filteredFlags,
        likeability: filteredLikes,
      });
    }
    items.sort((a, b) => (b.hasChart ? 1 : -1));
    return items;
  }

  /*
    #mobile
    #admin
  */
  @Get('likes/:userID/:startRef?/:mode?/:fullMode')
  async getLikesToUser(
    @Res() res,
    @Param('userID') userID,
    @Param('startRef') startRef,
    @Param('mode') mode,
    @Param('fullMode') fullMode,
  ) {
    const monthRef = /^\d+m$/i;
    const startDate = isNumeric(startRef)
      ? parseFloat(startRef)
      : monthRef.test(startRef)
      ? parseInt(startRef.replace(/[^0-9]\./, ''), 10) / 12
      : startRef;
    const returnFullObjects = fullMode === 'full';
    const { refNum, gte } = filterLikeabilityKey(mode);
    const flags = await this.feedbackService.fetchByLikeability(
      userID,
      startDate,
      refNum,
      gte,
    );
    if (!returnFullObjects) {
      return res.status(HttpStatus.OK).json(flags);
    } else {
      const items = await this.fetchMembers(0, flags.length, {
        ids: flags.map(f => f.user),
        user: userID,
      });
      return res.json(items);
    }
  }

  /*
    Fetch role options and merge related payment options
    #mobile
    #admin    
  */
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

  /*
    #mobile
    #admin
    Fetch a particular user using ID
  */
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

  /*
  #admin
  #mobile
  */
  @Get('permissions')
  async listPermissions(@Res() res) {
    const data = await this.settingService.getPermissionData();
    return res.status(HttpStatus.OK).json(data);
  }

  /*
  #admin
  #mobile
  */
  @Get('max-upload/:userID')
  async maxUpload(@Res() res, @Param('userID') userID) {
    const uploadData = await this.maxUploadByUser(userID);
    return res.status(HttpStatus.OK).json(uploadData);
  }

  /*
  #admin
  #mobile
  */
  async maxUploadByUser(userID: string) {
    const permData = await this.settingService.getPermissionData(true);
    return await this.userService.fetchMaxImages(userID, permData);
  }

  /*
    #admin
    #mobile
    Fetch a particular user using ID
  */
  @Get('item/:userID/:mode?')
  async getUser(@Res() res, @Param('userID') userID, @Param('mode') mode) {
    const result: Map<string, any> = new Map();
    result.set('user', null);
    const validUserId = userID.length === 24 && /^[0-9a-f]+$/i.test(userID);
    const user = validUserId ? await this.userService.getUser(userID) : null;
    let errorMsg = '';
    const valid = user instanceof Model;
    if (!valid) {
      errorMsg = 'User does not exist!';
    }
    const userObj: any = user instanceof Model ? user.toObject() : {};
    result.set('valid', valid);
    const strMode = notEmptyString(mode, 1) ? mode : '';
    const postProcessPreferences = ['full', 'detailed'].includes(strMode);
    const addUserChart = ['member', 'chart', 'full'].includes(strMode);
    let preferences: any[] = [];
    if (postProcessPreferences && user instanceof Object) {
      if (user.preferences instanceof Array && user.preferences.length > 0) {
        if (user.constructor.name === 'model') {
          const userObj = user.toObject();
          preferences = await this.settingService.processPreferences(
            userObj.preferences,
          );
          result.set('preferences', user);
        }
      }
    }
    if (valid && addUserChart) {
      const chart = await this.astrologicService.getUserBirthChart(userID);
      if (chart instanceof Object) {
        const chartObj = simplifyChart(chart);
        userObj.chart = chartObj;
      }
    }
    result.set('user', userObj);
    if (notEmptyString(errorMsg)) {
      result.set('msg', errorMsg);
    }
    const status = valid ? HttpStatus.OK : HttpStatus.NOT_FOUND;
    return res.status(status).json(Object.fromEntries(result.entries()));
  }

  /**
   * #mobile
   * #admin
   * Fetch preference options
   */
  @Get('survey-list/:mode?')
  async listSurveys(@Res() res, @Param('mode') mode) {
    const setting = await this.settingService.getByKey('survey_list');
    const addMultiScaleInfo = mode === 'info';
    let data: Array<SurveyItem> = [];
    if (!setting) {
      data = surveyList;
    } else {
      if (setting.value instanceof Array) {
        data = setting.value;
      }
    }
    if (addMultiScaleInfo) {
      const multiscaleTypes = await this.settingService.surveyMultiscales();
      data = data.map(item => {
        let scaleParams: any = {};
        const { multiscales } = item;
        if (notEmptyString(multiscales)) {
          const multiscaleOptions = multiscaleTypes.find(
            item => item.key === multiscales,
          );
          if (multiscaleOptions instanceof Object) {
            scaleParams = multiscaleOptions;
          }
        }
        return { ...item, scaleParams };
      });
    }
    return res.status(HttpStatus.OK).json(data);
  }

  /**
   * #mobile
   * #admin
   * Fetch multiscale preference options
   */
  @Get('survey-multiscales')
  async getSurveryMultiscales(@Res() res) {
    const dataWithOptions = await this.settingService.surveyMultiscales();
    return res.status(HttpStatus.OK).json(dataWithOptions);
  }

  /**
   * #mobile
   * #admin
   * Fetch preferences by key
   */
  async getPreferencesByKey(surveyKey = '', key = '') {
    const prefOpts = await this.settingService.getPreferenceOptions(surveyKey);
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

  /*
    #mobile
    #admin
    Fetch preference options
  */
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
          const { key, type } = item;
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
              value = { never: 0 };
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
                  aspiration: 2,
                },
              };
              break;
            case 'array_float':
              value = [2.8, 11.9];
              break;
            case 'array_integer':
              value = [30, 40, 12];
              break;
            case 'text':
              value = 'Cambridge University';
              break;
          }
          return { key, type, value };
        });
      }
    }
    return res.status(HttpStatus.OK).json(data);
  }

  /*
    #mobile
    #admin
  */
  @Post('login')
  async login(@Res() res, @Body() loginDTO: LoginDTO) {
    const data = await this.processLogin(loginDTO);
    const status = data.valid ? HttpStatus.OK : HttpStatus.NOT_ACCEPTABLE;
    return res.status(status).json(data);
  }
  /*
    #mobile
  */
  @Post('member-login')
  async memberLogin(@Res() res, @Body() loginDTO: LoginDTO) {
    const data = await this.processLogin(loginDTO, 'member');
    const status = data.valid ? HttpStatus.OK : HttpStatus.NOT_ACCEPTABLE;
    return res.status(status).json(data);
  }

  /*
    #mobile
    #admin
  */
  async processLogin(loginDTO: LoginDTO, mode = 'editor') {
    const user = await this.userService.findOneByEmail(loginDTO.email, false);
    const userData = new Map<string, any>();
    let valid = false;
    const isMemberLogin = mode === 'member';
    const maxCharts = isMemberLogin ? 10 : 100;
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
        const { deviceToken } = loginDTO;
        const loginDt = await this.userService.registerLogin(
          userID,
          deviceToken,
        );
        userData.set('login', loginDt);
        if (notEmptyString(deviceToken, 5)) {
          userData.set('deviceToken', deviceToken);
        }
        const flagItems = await this.feedbackService.getAllUserInteractions(
          userID,
          3 / 12,
        );
        const flags = flagItems instanceof Object ? flagItems : [];
        userData.set('flags', flags);
        const chart = await this.astrologicService.getUserBirthChart(userID);
        if (chart instanceof Object) {
          const chartObj = isMemberLogin ? simplifyChart(chart) : chart;
          userData.set('chart', chartObj);
        }
      }
    }
    userData.set('valid', valid);
    return hashMapToObject(userData);
  }

  /*
    #mobile
    #admin
    Edit user status to update role with optional payment data
  */
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
      let userObj = userData instanceof Model ? userData.toObject() : {};
      const keys = Object.keys(userObj);
      if (keys.includes('password')) {
        userObj = extractSimplified(userObj, [
          'coords',
          'password',
          'preferences',
          'profiles',
          'contacts',
          'placenames',
        ]);
        delete userObj.geo._id;
      }
      data = {
        valid: keys.length > 3,
        ...userObj,
      };
    }
    return res.status(HttpStatus.OK).json(data);
  }

  /*
    #mobile
    #admin
  */
  @Put('toggle-active/:userID')
  async toggleActive(
    @Res() res,
    @Param('userID') userID,
    @Body() activeStatusDTO: ActiveStatusDTO,
  ) {
    const { active, reason, expiryDate, removeBlockHistory } = activeStatusDTO;
    let expiryDt = null;
    let HStatus = HttpStatus.NOT_ACCEPTABLE;
    if (expiryDate) {
      expiryDt = new Date(expiryDate);
    }
    const userData = await this.userService.updateActive(
      userID,
      active,
      reason,
      expiryDt,
      removeBlockHistory === true,
    );
    if (userData instanceof Object) {
      HStatus = HttpStatus.OK;
    }
    const keys = Object.keys(userData);
    let userObj: any = {};
    if (keys.length > 0) {
      userObj = extractSimplified(userData, [
        'coords',
        'password',
        'preferences',
        'profiles',
        'contacts',
        'placenames',
      ]);
      delete userObj.geo._id;
    }
    const data = {
      valid: keys.length > 3,
      ...userObj,
    };
    return res.status(HStatus).json(data);
  }

  /*
    #mobile
  */
  @Get('member-status/:userID/:mode?')
  async memberStatus(@Res() res, @Param('userID') userID, @Param('mode') mode) {
    const data = await this.userService.getUserStatus(userID);
    const keys = Object.keys(data);
    const statusItems =
      keys.includes('status') && data.status instanceof Array
        ? data.status
        : [];
    //const nowTs = new Date().getTime();
    const status = statusItems.filter(st => {
      return st.current;
    });
    return res.status(HttpStatus.OK).json({ ...data, status });
  }

  /*
    #mobile
    #admin
    Remove a role from the status history
  */
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

  /*
    #mobile
    #admin
  */
  async matchUserByHash(hash: string, email = '') {
    let idStr = fromBase64(hash);
    let user = null;
    let matched = false;
    // digit mode is for use with the mobile app
    const digitMode = isNumeric(hash) && validEmail(email);
    if (digitMode) {
      user = await this.userService.findOneByEmail(email);
      if (user instanceof Object) {
        const tokenMatches = match6DigitsToken(user.token, hash);
        if (tokenMatches) {
          idStr = [user._id, user.token].join('__');
        }
      }
    }
    if (idStr.includes('__')) {
      const [userID, tsStr] = idStr.split('__');
      const ts = Math.floor(parseFloat(tsStr));
      const currTs = new Date().getTime();
      const tsAgo = currTs - ts;
      const maxTs = maxResetMinutes * 60 * 1000;
      if (tsAgo <= maxTs) {
        if (digitMode) {
          matched = true;
        } else {
          user = await this.userService.findOneByToken(tsStr);
          if (user) {
            const matchedUserId = extractDocId(user);
            matched = matchedUserId === userID;
          }
        }
      }
    }
    return { user, matched };
  }

  /*
    #mobile
  */
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

  /*
    #mobile
  */
  @Put('reset-pass/:hash')
  async resetPassword(
    @Res() res,
    @Param('hash') hash,
    @Body() loginDTO: LoginDTO,
  ) {
    const { user, matched } = await this.matchUserByHash(hash, loginDTO.email);
    const userData = new Map<string, any>();
    let valid = false;
    let editedUser = user;
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
              editedUser = updatedUser;
            }
          }
        }
      }
      if (valid) {
        extractObjectAndMerge(editedUser, userData, [
          'password',
          'status',
          'preferences',
          'coords',
        ]);
      }
    }
    userData.set('valid', valid);
    return res.status(HttpStatus.OK).json(hashMapToObject(userData));
  }

  /*
    #mobile
  */
  async triggerResetRequest(userID: string, @Res() res, webMode = false) {
    const user = await this.userService.requestReset(userID, 'forgotten');
    const data = new Map<string, any>();
    data.set('valid', false);
    if (user) {
      if (notEmptyString(user.token, 6)) {
        const resetLink = '/user/reset/' + toBase64(userID + '__' + user.token);
        data.set('token', user.token);
        const resetNumber = tokenTo6Digits(user.token);
        data.set('number', resetNumber);

        if (webMode) {
          data.set('link', resetLink);
        } else {
          data.set('reset', true);
        }
        const resetHash = webMode ? resetLink : resetNumber;
        data.set('valid', true);
        const userName = [user.fullName, user.nickName].join(' ');
        this.messageService.resetMail(user.identifier, userName, resetHash);
      }
    }
    return res.status(HttpStatus.OK).json(hashMapToObject(data));
  }

  /*
    #mobile
  */
  @Put('reset/:userID')
  async reset(@Res() res, @Param('userID') userID) {
    return this.triggerResetRequest(userID, res);
  }

  /*
    #mobile
  */
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

  /*
    #mobile
  */
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

  /*
    #mobile
    #admin
  */
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

  /*
    #mobile
  */
  @Put('profile/save/:userID')
  async saveProfile(
    @Res() res,
    @Param('userID') userID,
    @Body() profileDTO: ProfileDTO,
  ) {
    const data = await this.userService.saveProfile(userID, profileDTO);
    return res.json(data);
  }

  /*
    #admin
  */
  @Put('preference/save/:userID')
  async savePreference(
    @Res() res,
    @Param('userID') userID,
    @Body() preferenceDTO: PreferenceDTO,
  ) {
    const data = await this.userService.savePreference(userID, preferenceDTO);
    return res.json(data);
  }

  /*
    #admin
  */
  @Put('preferences/save/:userID')
  async savePreferences(
    @Res() res,
    @Param('userID') userID,
    @Body() preferences: PreferenceDTO[],
  ) {
    const data = await this.userService.savePreferences(userID, preferences);
    return res.json(data);
  }

  /*
    #development
  */
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

  /*
    #mobile
  */
  @Post('profile-upload/:userID/:type/:mediaRef?/:title?')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Res() res,
    @Param('userID') userID,
    @Param('type') type,
    @Param('mediaRef') mediaRef = '',
    @Param('title') title = '',
    @UploadedFile() file,
  ) {
    let data: any = {
      valid: false,
      fileData: null,
      message: 'no file data',
      remaining: 0,
    };
    let status = HttpStatus.NOT_ACCEPTABLE;
    let remaining = 0;
    if (file instanceof Object) {
      const uploadAuth = await this.maxUploadByUser(userID);
      if (!uploadAuth.valid) {
        data.message = 'unmatched user';
      } else if (!uploadAuth.mayUploadMore) {
        data.message = `User has reached maximum upload limit of ${uploadAuth.limit}`;
      } else {
        remaining = uploadAuth.limit - uploadAuth.numUploaded;
        data.remaining = remaining;
      }
      if (uploadAuth.mayUploadMore) {
        const { originalname, mimetype, size, buffer } = file;
        const fn = generateFileName(userID, originalname);
        const { fileType, mime } = matchFileTypeAndMime(originalname, mimetype);
        const fileData = {
          filename: fn,
          mime,
          type: fileType,
          source: 'local',
          size,
          title,
          attributes: {},
          variants: [],
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
          fileData.filename = filename;
          fileData.mime = mimetype;
          fileData.size = intSize;
          fileData.attributes = attributes;
          fileData.variants = variants;
          const savedSub = await this.userService.saveProfileImage(
            userID,
            type,
            fileData,
            mediaRef,
          );
          if (savedSub.valid) {
            data.user = savedSub.user;
            status = HttpStatus.OK;
            data.message = 'success';
            data.remaining = remaining - 1;
          }
          data.valid = true;
        } else {
          data.message = 'File upload failed';
        }
      }
    }
    return res.status(status).json(data);
  }

  /*
    #mobile
  */
  @Delete('media-item/delete/:userID/:mediaRef')
  async deleteMediaItem(
    @Res() res,
    @Param('userID') userID,
    @Param('mediaRef') mediaRef,
  ) {
    const data: any = { valid: false, item: null, fileDeleted: false };
    const result = await this.userService.deleteMediaItemByRef(
      userID,
      mediaRef,
    );
    if (result.deleted) {
      if (result.item instanceof Object) {
        data.item = result.item;
        data.valid = true;
        if (data.item.source === 'local') {
          data.fileDeleted = deleteFile(data.item.filename, 'media');
          if (data.item.variants.length > 0) {
            data.item.variants.forEach(suffix => {
              const parts = data.item.filename.split('.');
              const extension = parts.pop();
              const variantFn = [
                [parts.join('.'), suffix].join('-'),
                extension,
              ].join('.');
              deleteFile(variantFn, 'media');
            });
          }
        }
      }
    }
    return res.json(data);
  }

  /*
    #admin
  */
  @Get('media-path/:type')
  async mediaPathInfo(@Res() res, @Param('type') type) {
    const path = mediaPath(type);
    return res.json({ path });
  }

  /*
    #mobile
  */
  @Put('media-item/edit/:userID/:mediaRef?/:type?')
  async editMediaItem(
    @Res() res,
    @Param('userID') userID,
    @Param('mediaRef') mediaRef,
    @Param('type') type,
    @Body() mediaItem: MediaItemDTO,
  ) {
    const profileType = notEmptyString(type, 2) ? type : 'public';
    const mediaRefName = notEmptyString(mediaRef, 5) ? mediaRef : '';
    const result = await this.userService.editMediaItemByRef(
      userID,
      mediaRefName,
      mediaItem,
      profileType,
    );
    return res.json(result);
  }

  /*
    #development
  */
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

  /*
    #development
  */
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
