import {
  Controller,
  Get,
  Res,
  HttpStatus,
  Post,
  Body,
  Put,
  Query,
  Delete,
  Param,
} from '@nestjs/common';
import { AstrologicService } from './astrologic.service';
import { GeoService } from './../geo/geo.service';
import { UserService } from './../user/user.service';
import { SettingService } from './../setting/setting.service';
import { CreateChartDTO } from './dto/create-chart.dto';
import {
  isNumeric,
  validISODateString,
  notEmptyString,
  isNumber,
  inRange,
} from '../lib/validators';
import { latLngParamsToGeo, locStringToGeo } from './lib/converters';
import { applyAscendantToSimpleChart, simplifyAstroChart, simplifyChart } from './lib/member-charts';
import {
  calcAllTransitions,
  fetchHouseData,
  calcBodiesInHouses,
  calcVargas,
  calcUpagrahas,
  calcHoras,
  calcPanchanga,
  calcMrityubhaga,
  calcMrityubhagaValues,
  calcSphutaData,
  fetchAllSettings,
  calcCompactChartData,
  calcAllAspects,
  calcBodyJd,
  calcBodiesJd,
  calcAyanamsha,
  fetchHouseDataJd,
  calcCoreGrahaPositions,
} from './lib/core';
import {
  calcJulianDate,
  calcJulDate,
  applyTzOffsetToDateString,
  toShortTzAbbr,
  jdToDateTime,
  utcDate,
  julToDateFormat,
  julToISODate,
  currentISODate,
  durationStringToDays,
  matchJdAndDatetime,
  matchEndJdAndDatetime,
} from './lib/date-funcs';
import { chartData } from './lib/chart';
import { getFuncNames, getConstantVals } from './lib/sweph-test';
import { calcGrahaSignTimeline, calcRetroGrade, calcStation, matchNextTransitAtLng } from './lib/astro-motion';
import { toIndianTime, calcTransition } from './lib/transitions';
import { readEpheFiles } from './lib/files';
import { ChartInputDTO } from './dto/chart-input.dto';
import {
  smartCastInt,
  sanitize,
  smartCastFloat,
  smartCastBool,
  roundNumber,
} from '../lib/converters';
import { PairedChartInputDTO } from './dto/paired-chart-input.dto';
import { midPointSurface, medianLatlng, subtractLng360 } from './lib/math-funcs';
import { PairedChartDTO } from './dto/paired-chart.dto';
import {
  mapPairedChartInput,
  mapToChartInput,
  parseAstroBankJSON,
  Record,
} from '../lib/parse-astro-csv';
import { Kuta } from './lib/kuta';
import { Chart, matchGrahaEquivalent, PairedChart } from './lib/models/chart';
import { AspectSet, calcOrb } from './lib/calc-orbs';
import { AspectSetDTO } from './dto/aspect-set.dto';
import {
  assessChart,
  compatibilityResultSetHasScores,
  Condition,
  matchDrishtiCondition,
  matchDrishtiConditionSignLngs,
  matchOrbFromGrid,
  PredictiveRule,
  processTransitDashaRuleSet,
  processTransitMatch,
  Protocol,
  RuleSet,
} from './lib/models/protocol-models';
import { mapNestedKaranaTithiYoga, mapToponyms } from './lib/mappers';
import { CreateSettingDTO } from '../setting/dto/create-setting.dto';
import typeTags from './lib/settings/relationship-types';
import { KeyName, ProtocolSettings } from './lib/interfaces';
import { TagReassignDTO } from './dto/tag-reassign.dto';
import { TagDTO } from './dto/tag.dto';
import { RuleSetDTO } from '../setting/dto/rule-set.dto';
import { SingleCore } from './interfaces/single-core';
import { AssignPairedDTO } from './dto/assign-paired.dto';
import { matchPlanetNum } from './lib/settings/graha-values';
import { CreateUserDTO } from '../user/dto/create-user.dto';
import { assignDashaBalances, calcDashaSetByKey, DashaBalance, mapDashaItem } from './lib/models/dasha-set';
import { calcAscendantTimelineItems, calcNextAscendantLng, calcOffsetAscendant } from './lib/calc-ascendant';
import { GeoLoc } from './lib/models/geo-loc';
import { Graha } from './lib/models/graha-set';
import ayanamshaValues from './lib/settings/ayanamsha-values';
import { calcBavGraphData, calcBavSignSamples } from './lib/settings/ashtakavarga-values';
import { GeoPos } from './interfaces/geo-pos';
import { Model } from 'mongoose';
import { currentJulianDay } from './lib/julian-date';
import { calcDist360 } from './lib/helpers';
import { settings } from 'cluster';

@Controller('astrologic')
export class AstrologicController {
  constructor(
    private astrologicService: AstrologicService,
    private geoService: GeoService,
    private userService: UserService,
    private settingService: SettingService,
  ) {}

  @Get('juldate/:isodate?')
  async juldate(@Res() res, @Param('isodate') isodate, @Query() query) {
    const params = validISODateString(isodate) ? { dt: isodate } : query;
    const data = calcJulianDate(params);
    res.send(data);
  }

  @Get('swisseph/constants')
  async listConstants(@Res() res) {
    const constants = getConstantVals();
    const data = {
      constants,
    };
    res.send(data);
  }

  @Get('swisseph/functions')
  async showFunctions(@Res() res, @Param('isodate') isodate, @Query() query) {
    const functions = getFuncNames();
    const data = {
      functions,
    };
    res.send(data);
  }

  @Post('create-chart')
  async createChart(@Res() res, @Body() chartDTO: CreateChartDTO) {
    const chart = await this.astrologicService.createChart(chartDTO);
    res.send({
      valid: chart instanceof Object,
      chart,
    });
  }

  @Put('edit-chart/:chartID')
  async updateChart(
    @Res() res,
    @Param('chartID') chartID,
    @Body() chartDTO: ChartInputDTO,
  ) {
    const currChart = await this.astrologicService.getChart(chartID);
    let valid = false;
    let chart: any = null;
    if (currChart instanceof Object) {
      const currData = currChart.toObject();
      const currInputData = {
        datetime: currData.datetime,
        jd: currData.jd,
        ...currData.geo,
        ...currData.subject,
      };
      const inData = {
        ...currInputData,
        ...chartDTO,
      } as ChartInputDTO;
      const saveData = await this.saveChartData(inData, true, chartID);
      valid = saveData.valid;
      chart = saveData.chart;
    }
    res.send({
      valid,
      chart,
    });
  }

  @Get('swisseph/files/:subDir?')
  async ephemerisFiles(@Res() res, @Param('subDir') subDir) {
    const subDirRef = notEmptyString(subDir, 2) ? subDir : '';
    const data = await readEpheFiles(subDirRef);
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('chart/:loc/:dt')
  async chart(@Res() res, @Param('loc') loc, @Param('dt') dt) {
    if (validISODateString(dt) && notEmptyString(loc, 3)) {
      const data = await chartData(dt, loc);
      return res.status(HttpStatus.OK).json(data);
    } else {
      const result = {
        valid: false,
        message: 'Invalid parameters',
      };
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }
  }

  @Get('transition/:loc/:dt/:planet')
  async transition(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
    @Param('planet') planet,
  ) {
    let planetNum = 0;
    const geo = locStringToGeo(loc);
    let data: any = { valid: false };
    if (isNumeric(planet)) {
      planetNum = parseInt(planet);
      data = await calcTransition(dt, geo, planetNum);
    }
    res.send(data);
  }

  @Get('transitions/:loc/:dt')
  async transitions(@Res() res, @Param('loc') loc, @Param('dt') dt) {
    if (validISODateString(dt) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      const data = await calcAllTransitions(dt, geo);
      return res.status(HttpStatus.OK).json(data);
    } else {
      const result = {
        valid: false,
        message: 'Invalid parameters',
      };
      return res.status(HttpStatus.BAD_REQUEST).json(result);
    }
  }

  @Get('houses/:loc/:dt/:system?')
  async housesByDateGeo(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
    @Param('system') system,
  ) {
    let data: any = { valid: false };
    if (notEmptyString(dt, 6) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      const sysRef = notEmptyString(system) ? system : 'W';
      data = await fetchHouseData(dt, geo, sysRef);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('bodies-in-houses/:loc/:dt/:system?/:ayanamsha?')
  async bodiesInhousesByDateGeo(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
    @Param('system') system,
    @Param('ayanamsha') ayanamsha,
  ) {
    let data: any = { valid: false };
    if (notEmptyString(dt, 6) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      const sysRef = notEmptyString(system) ? system : 'W';
      const ayanamshaNum = isNumeric(ayanamsha) ? parseInt(ayanamsha, 10) : 27;
      data = await calcBodiesInHouses(dt, geo, sysRef, ayanamshaNum);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('core-grahas/:loc/:dt/:ayanamsha?')
  async coreGrahasByDateGeo(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
    @Param('ayanamsha') ayanamsha,
  ) {
    let data: any = { valid: false };
    if (notEmptyString(dt, 6) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      const ayanamshaKey = notEmptyString(ayanamsha) ? ayanamsha : 'true_citra';
      data = await calcCoreGrahaPositions(dt, geo, ayanamshaKey);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('all/:loc/:dt/:system?')
  async allByDateGeo(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
    @Param('system') system,
  ) {
    let data: any = { valid: false, jd: -1, geo: {} };
    if (notEmptyString(dt, 6) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      data.geo = await this.geoService.fetchGeoAndTimezone(
        geo.lat,
        geo.lng,
        dt,
      );
      const dtUtc = applyTzOffsetToDateString(dt, data.geo.offset);
      const sysRef = notEmptyString(system) ? system : 'W';
      const bd = await calcBodiesInHouses(dtUtc, geo, sysRef);
      if (bd instanceof Object && bd.jd > 0) {
        data.valid = true;
        data.jd = bd.jd;
        data = { ...data, ...bd };
      }
      const vd = await calcVargas(dtUtc, geo, sysRef);

      const td = await calcAllTransitions(dtUtc, data.bodies);
      data.transitions = td.bodies;
      data.vargas = vd.vargas;
      const pd = await calcPanchanga(dtUtc, geo);
      data.yoga = pd.yoga;
      data.karana = pd.karana;
      data.vara = pd.vara;
      data.hora = pd.hora;
      data.caughadia = pd.caughadia;
      data.muhurta = { ...pd.muhurta, values: pd.muhurtaRange.values };
      const md = await calcMrityubhagaValues(data.bodies, data.ascendant);
      data.mrityubhaga = {
        standardRange: md.standardRange,
        altRange: md.altRange,
      };
      const ds = await calcSphutaData(dtUtc, geo);
      const entries = Object.entries(ds).filter(
        entry => !(entry[1] instanceof Object),
      );
      data.sphutas = Object.fromEntries(entries);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('compact/:loc/:dt/:ayanamshaMode?/:topList?/:suppress?/:simple?')
  async compactDataSet(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
    @Param('ayanamshaMode') ayanamshaMode,
    @Param('topList') topList,
    @Param('suppress') suppress,
    @Param('simple') simple,
  ) {
    const fetchFull = smartCastInt(suppress, 0) < 1;
    const simplify = smartCastInt(simple, 0) > 0;
    const chartData = await this.fetchCompactChart(loc, dt, ayanamshaMode, topList, fetchFull);
    const data = simplify? simplifyChart(chartData, ayanamshaMode, 'complete', false, false) : chartData;
    return res.status(HttpStatus.OK).json(data);
  }

  /**
   * Fetch previously matched placenames and tz data if within 1km
   * Otherwise search new geo info
   */
  async fetchGeoInfo(geo = null, dt = "") {
    const placeMatches = await this.astrologicService.matchExistingPlaceNames(new GeoLoc(geo), 4, 1);
    let geoInfo = { toponyms: [], tz: "", offset: 0 };
    let distance = 0;
    if (placeMatches.length > 0) {
      const geoPlace = placeMatches[0];
      const tzOffset = this.geoService.checkLocaleOffset(geoPlace.tz, dt, geoPlace.placenames);
      distance = geoPlace.distance;
      geoInfo = { toponyms: geoPlace.placenames, tz: geoPlace.tz, offset: tzOffset};
    } else {
      geoInfo = await this.geoService.fetchGeoAndTimezone(
        geo.lat,
        geo.lng,
        dt,
      );
    }
    return geoInfo;
  }

  async fetchCompactChart(loc: string, dt: string, ayanamshaMode = "true_citra", topList = "", fetchFull = true, addExtraSets = true) {
    let data: any = { valid: false };
    if (validISODateString(dt) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      const geoInfo = await this.fetchGeoInfo(geo, dt);
      const dtUtc = applyTzOffsetToDateString(dt, geoInfo.offset);

      const ayanamshaKey = notEmptyString(ayanamshaMode, 3)
        ? ayanamshaMode.toLowerCase().replace(/-/g, '_')
        : '';
      const topMode = ayanamshaKey === 'top';
      const topKeys =
        topMode && notEmptyString(topList, 5) ? topList.split(',') : [];
      data = await calcCompactChartData(
        dtUtc,
        geo,
        ayanamshaKey,
        topKeys,
        geoInfo.offset,
        fetchFull,
        addExtraSets,
      );
      data = {
        tzOffset: geoInfo.offset,
        tz: geoInfo.tz,
        placenames: geoInfo.toponyms,
        ...data,
      };
    }
    return data;
  }

  @Get('current-chart/:loc/:dt?/:mode?')
  async fetchCurrent(@Res() res, @Param('loc') loc, @Param('dt') dt, @Param('mode') mode) {
    const dtUtc = validISODateString(dt)? dt : currentISODate();
    const simplify = mode !== "all";
    const ayanamshaKey = notEmptyString(mode, 5)? mode : simplify ? "true_citra" : "top";
    const topList = !simplify ? "top" : ayanamshaKey;
    const data = await this.fetchCompactChart(loc, dtUtc, "top", topList, false, false);
    const chart = simplify? simplifyAstroChart(data, true, true) : data;
    return res.json(chart);
  }

  @Get('snapshot/:loc/:dt?/:mode?')
  async fetchShapshot(@Res() res, @Param('loc') loc, @Param('dt') dt, @Param('mode') mode) {
    const dtUtc = validISODateString(dt)? dt : currentISODate();
    const simplify = mode !== "all";
    const ayanamshaKey = notEmptyString(mode, 5)? mode : simplify ? "true_citra" : "top";
    const data = await this.astrologicService.getChartSnapshot(dtUtc, ayanamshaKey);
    const chart = simplify? simplifyAstroChart(data, false, false) : data;
    const ayaRow = chart.ayanamshas.find(r => r.key === ayanamshaKey);
    const ayanamshaVal = ayaRow instanceof Object? ayaRow.value : 0;
    const geo = locStringToGeo(loc);
    const jd = calcJulDate(dtUtc);
    const asc = calcOffsetAscendant(geo.lat, geo.lng, jd, ayanamshaVal);
    const adjusted = applyAscendantToSimpleChart(chart, geo, ayanamshaKey);
    return res.json({chart: adjusted });
  }

  @Get('existing-placenames/:loc/:maxDistance?')
  async fetchPlacenames(@Res() res, @Param('loc') loc, @Param('maxDistance') maxDistance ) {
    const latLngAlt = locStringToGeo(loc);
    const maxDistanceInt = smartCastInt(maxDistance, 3);
    const geo = new GeoLoc(latLngAlt);
    const data = await this.astrologicService.matchExistingPlaceNames(geo, maxDistanceInt);
    return res.json(data);
  }

  @Post('save-user-chart')
  async saveUserChart(@Res() res, @Body() inData: ChartInputDTO) {
    const { _id } = inData;
    const chartID = notEmptyString(_id, 12) ? _id : '';
    const status = notEmptyString(inData.status)? inData.status : 'user';
    const data = await this.saveChartData({...inData, status}, true, chartID);
    return res.status(HttpStatus.OK).json(data);
  }

  @Post('save-member-chart/:ayanamsha?/:mode?')
  async saveUserChartSimple(@Res() res,
    @Body() inData: ChartInputDTO,
    @Param('mode') mode: string,
    @Param('ayanamsha') ayanamsha: string,
  ) {
    const { _id } = inData;
    const chartID = notEmptyString(_id, 12) ? _id : '';
    // basic | simple | complete
    const ayaKey = notEmptyString(ayanamsha, 5)? ayanamsha : 'true_citra';
    const simpleMode = notEmptyString(mode, 3)? mode : 'basic';
    const data = await this.saveChartData({...inData, status: 'member'}, true, chartID, 'true_citra', false);
    const {valid, shortTz } = data;
    const chart = valid ? simplifyChart(data.chart, ayaKey, simpleMode) : {};
    return res.status(HttpStatus.OK).json({valid, shortTz, chart});
  }

  @Get('save-user-birth-chart/:userID/:loc/:dt/:g')
  async saveUserBirthChart(
    @Res() res,
    @Param('userID') userID: string,
    @Param('loc') loc: string,
    @Param('dt') dt: string,
    @Param('g') g: string,
  ) {
    let data: any = { valid: false };
    const user = await this.userService.getUser(userID);
    const geo = locStringToGeo(loc);
    const gender = notEmptyString(g) && g.length === 1 ? g : 'n';
    if (user instanceof Object) {
      const inData = {
        user: user._id,
        name: user.nickName,
        datetime: dt,
        lat: geo.lat,
        lng: geo.lng,
        alt: geo.alt,
        notes: '',
        type: 'person',
        isDefaultBirthChart: true,
        gender,
        eventType: 'birth',
        roddenValue: 100,
      } as ChartInputDTO;
      data = await this.saveChartData(inData);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('save-test-users-birth-chart/:start?/:limit?')
  async saveTestUsersBirthChart(@Res() res, @Param('start') start, @Param('limit') limit) {
    const startInt = smartCastInt(start, 0);
    const limitInt = smartCastInt(limit, 100);
    const users = await this.userService.list(startInt, limitInt, {test: true}, true);
    const chartIds = [];
    const numUsers = users.length;
    const valid = numUsers > 0;
    for (const user of users) {
      if (user instanceof Object) {
        const geo = user.geo;
        if (user.dob) {
          const inData = {
            user: user._id,
            name: user.nickName,
            datetime: user.dob.toISOString().split('.').shift(),
            lat: geo.lat,
            lng: geo.lng,
            alt: geo.alt,
            notes: '',
            type: 'person',
            status: 'test',
            isDefaultBirthChart: true,
            gender: user.gender,
            eventType: 'birth',
            roddenValue: 100,
          } as ChartInputDTO;
          const saved = await this.saveChartData(inData, true, '', 'true_citra', false);
          if (saved.valid) {
            chartIds.push({
              _id: saved.chart._id,
              uid: user._id,
              name: user.nickName
            });
          }
        }
         
      }
    }
    const num = chartIds.length;
    return res.json({ chartIds, num, valid});
  }

  async saveChartData(inData: ChartInputDTO, save = true, chartID = '', ayanamsha = 'top', fetchFull = true) {
    let data: any = { valid: false, message: '', chart: null };
    const {
      user,
      datetime,
      lat,
      lng,
      alt,
      isDefaultBirthChart,
      locality,
      notes,
      tz,
      tzOffset,
      placenames,
      parent,
      status,
    } = inData;
    let { name, type, gender, eventType, roddenValue } = inData;
    const userRecord = await this.userService.getUser(user);

    if (userRecord instanceof Object) {
      if (userRecord.active) {
        if (validISODateString(datetime) && isNumeric(lat) && isNumeric(lng)) {
          const geo = { lat, lng, alt };
          if (isDefaultBirthChart) {
            name = userRecord.nickName;
            type = 'person';
            eventType = 'birth';
            if (notEmptyString(userRecord.gender, 1)) {
              gender = userRecord.gender;
            }
            if (typeof roddenValue !== 'number') {
              roddenValue = 10000;
            }
          }
          const subject = {
            name,
            type,
            gender,
            eventType,
            roddenValue,
            notes,
          };
          const hasGeoTzData =
            notEmptyString(tz) &&
            isNumeric(tzOffset) &&
            placenames instanceof Array && placenames.length > 1;
          const geoInfo = await this.fetchGeoInfo(
            geo,
            datetime,
          );
          const dtUtc = applyTzOffsetToDateString(datetime, geoInfo.offset);
          const topKeys = (!fetchFull && ayanamsha !== 'top')? [ayanamsha] : [];
          // always fetch chart data with tropical grahas, but apply ayanamsha(s)
          // for derived value sets. For member charts only fetch one set of ayanamsha variants 
          // as the others will never be used and 
          // tropical values can easily be adjusted by known ayanamsha offsets
          const chartData = await calcCompactChartData(
            dtUtc,
            geo,
            'top',
            topKeys,
            geoInfo.offset,
            fetchFull
          );
          if (chartData instanceof Object) {
            data.shortTz = toShortTzAbbr(dtUtc, geoInfo.tz);
            // Update DOB field in the user table
            const userData = {
              dob: dtUtc,
            } as CreateUserDTO;
            
            this.userService.updateUser(user, userData);
            const placenames = mapToponyms(geoInfo.toponyms, geo, locality);

            data.chart = {
              user,
              isDefaultBirthChart,
              subject,
              tz: geoInfo.tz,
              tzOffset: geoInfo.offset,
              placenames,
              status,
              ...chartData,
            };
            if (notEmptyString(parent, 16)) {
              data.chart.parent = parent;
            }
            let saved = null;
            if (save) {
              if (notEmptyString(chartID, 8)) {
                saved = await this.astrologicService.updateChart(
                  chartID,
                  data.chart,
                );
              } else {
                saved = await this.astrologicService.createChart(data.chart);
              }
            }
            if (saved instanceof Object) {
              const { _id } = saved;
              const strId = _id instanceof Object ? _id.toString() : _id;
              if (notEmptyString(strId, 8)) {
                data.chart = { _id: strId, ...data.chart };
                data.valid = true;
              }
            }
          } else {
            data.message = 'Invalid input values';
          }
        } else {
          data.message = 'Invalid date, time, latitude or longitude';
        }
      } else {
        data.message = 'User account is inactive';
      }
    } else {
      data.message = 'User account cannot be verified';
    }
    return data;
  }

  async quickSaveChart(inData: ChartInputDTO, chart = null) {
    let data: any = { valid: false, recalculated: false, chart: null };
    const {
      user,
      datetime,
      lat,
      lng,
      alt,
      isDefaultBirthChart,
      notes,
      tzOffset,
      name,
      type,
      gender,
      eventType,
      roddenValue,
    } = inData;
    if (
      validISODateString(datetime) &&
      isNumeric(lat) &&
      isNumeric(lng) &&
      chart instanceof Object
    ) {
      const geo = { lat, lng, alt };
      const dt =
        chart.datetime instanceof Date ? chart.datetime.toISOString() : '';
      const dtLocStrSource = [
        dt.split('.').shift(),
        roundNumber(chart.geo.lat, 8),
        roundNumber(chart.geo.lng, 8),
      ].join('_');
      /* const geoInfo = await this.geoService.fetchGeoAndTimezone(
        geo.lat,
        geo.lng,
        datetime,
      ); */
      const dtUtc = applyTzOffsetToDateString(datetime, tzOffset);
      const dtLocStrNew = [
        dtUtc.split(' ').join('T'),
        roundNumber(lat, 8),
        roundNumber(lng, 8),
      ].join('_');
      const recalcChart = dtLocStrSource !== dtLocStrNew;
      const subject = {
        name,
        type,
        gender,
        eventType,
        roddenValue,
        notes,
      };
      if (recalcChart) {
        const chartData = await calcCompactChartData(
          dtUtc,
          geo,
          'top',
          [],
          tzOffset,
        );
        if (chartData instanceof Object) {
          data.recalculated = true;
          const placenames = chart.placenames;
          data.chart = {
            user,
            isDefaultBirthChart,
            subject,
            tz: chart.tz,
            tzOffset,
            placenames,
            ...chartData,
          };
        }
        data.chart = {
          user,
          isDefaultBirthChart,
          subject,
          tz: chart.tz,
          tzOffset,
          placenames: chart.placenames,
          ...chartData,
        };
      } else {
        data.chart = { ...chart, subject };
      }

      if (data.chart instanceof Object) {
        const saved = await this.astrologicService.updateChart(
          chart._id,
          data.chart,
        );
        if (saved instanceof Object) {
          const { _id } = saved;
          const strId = _id instanceof Object ? _id.toString() : _id;
          if (notEmptyString(strId, 8)) {
            data.chart = { _id: strId, ...data.chart };
            data.valid = true;
          }
        }
      }
    }
    return data;
  }

  /**
   * Fetch a full set of dashas to given level. PLease note this can be slow beyond the 3rd level (pratyantardasha)
   * 
   */
  @Get('dasha-set')
  async fetchDashSet(@Res() res, @Query() query) {
    const { dt, transitJd, system, key, chartData, maxLevel, durDays } = await this.matchDashaQueryParams(query);
    let data: any = {};
    let nak = -1;
    let lng = -1;
    if (chartData instanceof Object) {
      const chart = new Chart(chartData);
      chart.setAyanamshaItemByNum(27);
      const graha = chart.graha(key);
      const scanStartJd = transitJd;
      const scanEndJd = durDays > 0? scanStartJd + durDays : -1;
      nak = graha.nakshatra27;
      lng = graha.longitude;
      data = calcDashaSetByKey(system, graha, chart.jd);
      if (data.dashas instanceof Array) {
        data.dashas = data.dashas.filter(sp => scanStartJd < 1 || (scanStartJd <= sp.endJd  && scanEndJd >= sp.startJd)).map(span =>
          mapDashaItem(
            span,
            chart.jd,
            data.set,
            1,
            maxLevel,
            chart.tzOffset,
            scanStartJd,
            false,
            scanEndJd
          )
        );
      }
    }
    return res.json({...data, nak, lng });
  }

  async matchDashaQueryParams(query) {
    const hasQuery = query instanceof Object && Object.keys(query).length > 1;
    const criteria: Map<string, string> = hasQuery ? new Map(Object.entries(query)) : new Map();
    const dt = criteria.has('dt')? criteria.get('dt') : '';
    const hasDt = validISODateString(dt);
    const hasLoc = criteria.has('loc');
    const hasLatLng = criteria.has('lat') && criteria.has('lng');
    const geo = hasLoc? locStringToGeo(criteria.get('loc')) : hasLatLng? latLngParamsToGeo(criteria.get('lat'), criteria.get('lng'), criteria.get('alt')) : { lat: 0, lng: 0, alt: 0 };
    let levelInt = criteria.has('level')? smartCastInt(criteria.get('level'), 4) : 4
    const transitDt = criteria.has('transit')? criteria.get('transit') : criteria.has('after') ? criteria.get('after') : '';
    const hasTransitDt = validISODateString(transitDt);
    const transitJd = hasTransitDt? calcJulDate(transitDt) : -1;
    const system = criteria.has('system') ? criteria.get('system') : 'vimshottari';
    const key = criteria.has('key') ? criteria.get('key') : 'mo';
    const chartId = criteria.has('chart')? criteria.get('chart') : '';
    const userId = criteria.has('user')? criteria.get('user') : '';
    const hasChartId = notEmptyString(chartId, 16);
    const hasUserId = notEmptyString(userId, 16);
    const validRefs = hasDt && (hasLoc || hasLatLng);
    const balanceRef = new DashaBalance(criteria);
    const duration = criteria.has('duration') ? criteria.get('duration') : '';
    const durDays = notEmptyString(duration) ? durationStringToDays(duration) : '';
    if (balanceRef.maxLevel > 0) {
      levelInt = balanceRef.maxLevel;
    }
    let chartData: any = null;
    if (hasChartId || hasUserId) {
      const chartModel = hasUserId ? await this.astrologicService.getUserBirthChart(userId) : await this.astrologicService.getChart(chartId);
      if (chartModel instanceof Model) {
        chartData = chartModel.toObject();
      }
    } else if (validRefs) {
      chartData = await calcCompactChartData(
        dt,
        geo,
        'top',
        ['true_citra'],
        0,
        false,
        false,
      );
    }
    return { dt, transitJd, chartId, userId, system, key, maxLevel: levelInt, chartData, balanceRef, durDays };
  }

  /*
  * Fetch the dasha balance for a given date or when the mahadasha, antardasha or priantarddasha 
  * next match specified graha keys
  * All named parameters are added to the query string
  * Charts may identified by chart id (chart=[chartID]), user if (user=[userID]) or by location + datetime time (&loc=65.15,-13.4&dt=1967-08-23:04:09:34) or (&lat=65.15&lng-13.4&dt=1967-08-23:04:09:34)
  * The default system is vimshottari, but other systems may be specified with the system parameter
  * The default base graha is the mmon, but other grahas may be specified with key and a two letter code (key=ma)
  * If no target dasha grahas are specified, we need a reference transit date with transit=2021-07-18T12:00:00
  * The level parameter determines the maximum depth
  * To find the occurrence of a given dasha graha after a given date, use the lv1, lv2, lv3 and lv4 parameters
  * in combination with either transit or after, (lv2=ma&after=2021-06-30T00:00:00). The maximum depth is the highest level specified
  */
  @Get('dasha-balance')
  async getDashBalance(@Res() res, @Query() query) {
    const { dt, transitJd, system, key, chartData, balanceRef, maxLevel } = await this.matchDashaQueryParams(query);
    
    let data: any = {};
    let nak = -1;
    let lng = -1;
    let balances = [];
    if (chartData instanceof Object) {
      const chart = new Chart(chartData);
      nak = chart.graha(key).nakshatra27;
      lng = chart.graha(key).longitude;
      balances = assignDashaBalances(chart, transitJd, maxLevel, balanceRef, system, key);
    }
    return res.json({dt, balances, nak, lng, yearLength: data.yearLength, system, key});
  }

  @Get('next-ascendant/:lng/:loc/:dt?')
  async fetchNextAscendant(@Res() res, @Param('lng') lng, @Param('loc') loc, @Param('dt') dt) {
    const { dtUtc, jd } = matchJdAndDatetime(dt);
    const geo = locStringToGeo(loc);
    const lngFl = smartCastFloat(lng, 0)
    const data = await calcNextAscendantLng(lngFl, geo.lat, geo.lng, jd, "true_citra")
    
    return res.json({data});
  }

  @Get('predictive-rule-check/:ruleID/:chartID/:loc?')
  async checkRulesetForChart(@Res() res, @Param('ruleID') ruleID, @Param('chartID') chartID, @Param('loc') loc) {
    const ruleData = await this.settingService.getRuleSet(ruleID);
    const hasRuleData = ruleData instanceof Model;
    const rule = new PredictiveRule(ruleData);
    const settings = await this.settingService.getProtocolSettings();
    const chartRecord = await this.astrologicService.getChart(chartID);
    const hasChart = chartRecord instanceof Model;
    const andMode = rule.conditionSet.operator  !== "or";
    const chartData = hasChart? chartRecord.toObject() : {};
    const chart = new Chart(chartData);
    const geo = typeof loc === 'string' && /^\d(\.\d),d(\.\d),\d?$/.test(loc)? locStringToGeo(loc) : chart.geo;
    const outerConditions = rule.conditionSet.conditionRefs.filter(cr => !cr.isSet);
    const outerItems = [];
    for (const cond of outerConditions) {
      if (cond instanceof Condition) {
        const newOuterItem = await this.processPredictiveRuleSet(cond, rule.type, chart, geo, settings);
        outerItems.push(newOuterItem);
      }
    }
    const valid = hasRuleData &&  hasChart;
    const numOuterValid = outerItems.filter(oi => oi.valid).length;
    const matches = andMode ? numOuterValid === outerItems.length : numOuterValid > 0;
    return res.json({ valid , matches, items: outerItems });
  }

  async processPredictiveRuleSet(cond: Condition, ruleType = "", chart: Chart, geo: GeoPos, settings: ProtocolSettings) {
    const result = { valid: false, start: null, end: null, score: 0 };
    switch (ruleType) {
      case 'transit':
        return await this.processTransitRuleSet(cond, chart, geo, settings);
      default:
        return result;
    }
  }

  async processTransitRuleSet(cond: Condition, chart: Chart, geo: GeoPos, settings: ProtocolSettings) {
    const [fromCat, subType] = cond.fromMode.split("_");
    switch (fromCat) {
      case "level":
        return await processTransitDashaRuleSet(cond, parseInt(subType, 10), chart, settings);
      case "transit":
        return await processTransitMatch(cond, chart, geo, settings);
      default:
        return { valid: false };
    }
  }

  @Get('recalc-charts/:start?/:limit?')
  async recalcCharts(@Res() res, @Param('start') start, @Param('limit') limit) {
    const criteria: Map<string, any> = new Map();
    const startInt = smartCastInt(start, 0);
    const limitInt = smartCastInt(limit, 100);
    const sourceCharts = await this.astrologicService.list(
      criteria,
      startInt,
      limitInt,
      true,
    );
    const statusCode =
      sourceCharts.length > 0 ? HttpStatus.OK : HttpStatus.NOT_ACCEPTABLE;
    const items = [];
    for (const ch of sourceCharts) {
      const newChart = await this.recalcChart(ch);
      items.push(newChart);
    }
    return res.status(statusCode).send({
      valid: items.length > 0,
      items,
    });
  }

  @Get('life-events/:chartID')
  async getRelated(@Res() res, @Param('chartID') chartID, @Param('start') start, @Param('limit') limit) {
    const criteria: Map<string, any> = new Map();
    criteria.set('$or', [
      { _id: chartID },
      { parent: chartID },
    ]);
    const items = await this.astrologicService.relatedChartSubjects(chartID);
    const num = items.length;
    return res.json({
      valid: num > 0,
      num,
      items,
    });
  }

  /**
   * Bulk assigments of pairs
   */
  @Post('bulk-assign-paired/:userID/:commit?')
  async assignPaired(
    @Res() res,
    @Param('userID') userID,
    @Param('commit') commit,
    @Body() items: AssignPairedDTO[],
  ) {
    let deleted = 0;
    let added = 0;
    const matchedItems: any[] = [];
    const commitToDB = commit === 'commit';
    if (items instanceof Array && this.userService.isAdminUser(userID)) {
      for (const item of items) {
        const keys = Object.keys(item);
        const pairedItems = await this.astrologicService.matchPairedIdsByChartId(
          item.id,
          true,
        );

        const toBeRemoved = pairedItems.filter(
          pi => item.paired.includes(pi.chartId) === false,
        );
        const toKeep = pairedItems.filter(pi =>
          item.paired.includes(pi.chartId),
        );
        const toBeAdded = item.paired.filter(chId => {
          return toKeep.map(it => it.chartId).includes(chId) === false;
        });
        matchedItems.push({
          ...item,
          toBeRemoved,
          toKeep,
          toBeAdded,
        });
        if (commitToDB) {
          for (const otherId of toBeAdded) {
            const relType = keys.includes('relType') ? item.relType : 'spouse';
            const pairedDTO = {
              c1: item.id,
              c2: otherId,
              relType,
              tags: [],
              startYear: 0,
              endYear: 0,
              span: 0,
            } as PairedChartDTO;
            await this.astrologicService.savePaired(pairedDTO);
            added++;
          }
          for (const pItem of toBeRemoved) {
            await this.astrologicService.deletePaired(pItem.id);
            deleted++;
          }
        }
      }
    }
    return res.send({
      valid: items.length > 0,
      matchedItems,
      deleted,
      added,
    });
  }

  @Get('bulk-delete-paired/:before/:max?')
  async bulkDeletePaired(
    @Res() res,
    @Param('before') before,
    @Param('max') max,
  ) {
    const data = { valid: false, result: null };
    const maxInt = smartCastInt(max, 1000000);
    if (validISODateString(before)) {
      data.result = await this.astrologicService.bulkDeletePaired(
        before,
        maxInt,
      );
    }
    return res.status(HttpStatus.OK).json(data);
  }

  async recalcChart(chart) {
    const core = await calcCompactChartData(
      julToISODate(chart.jd),
      chart.geo,
      'top',
      [],
      chart.tzOffset,
    );
    const {
      grahas,
      ascendant,
      mc,
      vertex,
      houses,
      indianTime,
      ayanamshas,
      upagrahas,
      sphutas,
      numValues,
      stringValues,
      objects,
      rashis,
    } = core;
    const merged = {
      ...chart,
      grahas,
      ascendant,
      mc,
      vertex,
      houses,
      indianTime,
      ayanamshas,
      upagrahas,
      sphutas,
      numValues,
      stringValues,
      objects,
      rashis,
    };
    this.astrologicService.updateChart(chart._id, merged);
    return await this.astrologicService.getChart(chart._id);
  }

  @Get('core-values/:ayanamsha?/:start?/:limit?')
  async getCoreValues(
    @Res() res,
    @Param('ayanamsha') ayanamsha,
    @Param('start') start,
    @Param('limit') limit,
  ) {
    const ayanamshaKey = notEmptyString(ayanamsha, 4)
      ? ayanamsha.replace(/-+/g, '_')
      : 'true_citra';
    const startInt = smartCastInt(start, 0);
    const limitInt = smartCastInt(limit, 100);
    const items = await this.astrologicService.getCoreAdjustedValues(
      ayanamshaKey,
      startInt,
      limitInt,
    );
    return res.send(items);
  }

  @Post('aspect-match')
  async getByAspectRanges(@Res() res, @Body() inData: AspectSetDTO) {
    let resultItems: Array<any>;
    let items: Array<AspectSet> = [];
    if (inData instanceof Object) {
      const hasProtocolID = notEmptyString(inData.protocolID, 12);
      const isAuto = inData.protocolID === 'auto';
      const hasOverride = hasProtocolID || isAuto;
      const protocolRef = hasOverride ? inData.protocolID : '';
      for (const aspSet of inData.items) {
        const orbRef = hasOverride ? protocolRef : aspSet.orb;
        const orb = await this.matchOrb(
          aspSet.key,
          aspSet.k1,
          aspSet.k2,
          orbRef,
        );
        items.push({
          key: aspSet.key,
          k1: aspSet.k1,
          k2: aspSet.k2,
          orb,
        });
      }
      const start = isNumber(inData.start) ? inData.start : 0;
      const limit = isNumber(inData.limit) ? inData.limit : 100;
      const data = await this.astrologicService.filterPairedByAspectSets(
        items,
        start,
        limit,
      );

      const results = await this.astrologicService.getPairedByIds(
        data.map(row => row._id),
        limit,
      );
      resultItems = results.map(item => {
        const row = data.find(row => row._id === item._id);
        const diff = row instanceof Object ? row.diff : 0;
        return {
          ...item,
          diff,
        };
      });
    }
    return res.status(200).send({
      valid: resultItems.length > 0,
      items: resultItems,
      input: items,
    });
  }

  @Get('aspect-match/:aspect/:k1/:k2/:orb?/:max?')
  async getByAspectRange(
    @Res() res,
    @Param('aspect') aspect,
    @Param('k1') k1,
    @Param('k2') k2,
    @Param('orb') orb,
    @Param('max') max,
  ) {
    const maxInt = smartCastInt(max, 1000);
    const orbDouble = await this.matchOrb(aspect, k1, k2, orb);

    const data = await this.astrologicService.filterPairedByAspect(
      aspect,
      k1,
      k2,
      orbDouble,
    );
    const num = data instanceof Array ? data.length : 0;
    const results =
      num > 0
        ? await this.astrologicService.getPairedByIds(
            data.map(row => row._id),
            maxInt,
          )
        : [];
    return res.status(200).send({
      valid: results.length > 0,
      orb: orbDouble,
      num,
      aspect,
      numResults: results.length,
      results,
    });
  }

  @Get('aspect-match-count/:aspect/:k1/:k2/:orb?/:max?')
  async countByAspectRange(
    @Res() res,
    @Param('aspect') aspect,
    @Param('k1') k1,
    @Param('k2') k2,
    @Param('orb') orb,
    @Param('max') max,
  ) {
    const maxInt = smartCastInt(max, 100);
    const orbDouble = await this.matchOrb(aspect, k1, k2, orb);
    const data = await this.astrologicService.filterPairedByAspect(
      aspect,
      k1,
      k2,
      orbDouble,
    );
    return res.status(200).send({
      valid: data.length > 0,
      orb: orbDouble,
      aspect,
      num: data.length,
    });
  }

  @Get(
    'discover-aspect-matches/:aspect/:k1/:k2/:sourceLng/:orb?/:ayanamshaKey?/:max?',
  )
  async discoverAspectMatches(
    @Res() res,
    @Param('aspect') aspect,
    @Param('k1') k1,
    @Param('k2') k2,
    @Param('sourceLng') sourceLng,
    @Param('orb') orb,
    @Param('ayanamshaKey') ayanamshaKey,
    @Param('max') max,
  ) {
    const maxInt = smartCastInt(max, 100);
    const orbDouble = await this.matchOrb(aspect, k1, k2, orb);
    const aKey = notEmptyString(ayanamshaKey, 3) ? ayanamshaKey : 'true_citra';
    const items = await this.astrologicService.findAspectMatch(
      k1,
      k2,
      sourceLng,
      aspect,
      orbDouble,
      aKey,
    );
    return res.status(200).send({
      num: items.length,
      items,
    });
  }

  /*
    Discover charts with a planet within specified degree range
  */
  @Get(
    'discover-degree-range-matches/:key/:lng/:orb?/:ayanamshaKey?/:max?',
  )
  async discoverDegreeRangeMatches(
    @Res() res,
    @Param('key') key,
    @Param('lng') lng,
    @Param('orb') orb,
    @Param('ayanamshaKey') ayanamshaKey,
    @Param('max') max,
  ) {
    const maxInt = smartCastInt(max, 100);
    const lngs = notEmptyString(lng)? lng.split(',').filter(lng => isNumeric(lng)).map(parseFloat) : [];
    const aKey = notEmptyString(ayanamshaKey, 3) ? ayanamshaKey : 'true_citra';
    const orbDouble = isNumeric(orb)? parseFloat(orb) : 1;
    const items = await this.astrologicService.findPredictiveRangeMatch(
      key,
      lngs,
      orbDouble,
      aKey,
    );
    return res.status(200).send({
      num: items.length,
      items,
    });
  }

  @Get(
    'discover-ascendant-matches/:dt?/:lng?/:orb?/:ayanamshaKey?/:max?',
  )
  async discoverAscendantMatches(
    @Res() res,
    @Param('dt') dt,
    @Param('lng') lng,
    @Param('orb') orb,
    @Param('ayanamshaKey') ayanamshaKey,
    @Param('max') max,
  ) {
    const maxInt = smartCastInt(max, 100);
    
    const orbDouble = isNumeric(orb)? parseFloat(orb) : 1;

    const lngs = notEmptyString(lng)? lng.split(',').filter(lng => isNumeric(lng)).map(parseFloat) : [];
    
    const aKey = notEmptyString(ayanamshaKey, 3) ? ayanamshaKey : 'true_citra';
    
    const items = await this.astrologicService.matchAscendantsbyDate(
      dt,
      lngs,
      orbDouble,
      aKey,
      maxInt,
    );
    return res.status(200).send({
      num: items.length,
      items,
    });
  }

  @Get('kuta-match/:subtype/:k1/:k2/:minMax?/:limit?')
  async listPairedByKutas(
    @Res() res,
    @Param('subtype') subtype,
    @Param('k1') k1,
    @Param('k2') k2,
    @Param('minMax') minMax,
    @Param('limit') limit,
  ) {
    const kutaMap = await this.settingService.getKutaSettings();
    const pcRange = minMax
      .split(',')
      .filter(isNumeric)
      .map(parseFloat);
    const limitInt = smartCastInt(limit, 1000);
    const range = pcRange.length > 1 ? pcRange : [0, 0];
    const result = await this.astrologicService.filterPairedByKutas(
      kutaMap,
      subtype,
      k1,
      k2,
      range,
    );
    const ids = result.items.map(item => item._id);
    const items = await this.astrologicService.getPairedByIds(ids, limitInt);
    return res.status(200).send({
      num: result.items.length,
      max: result.max,
      numItems: items.length,
      items,
    });
  }

  @Get('test-kuta/:subtype/:c1/:c2/:k1/:k2')
  async calcSingleKuta(
    @Res() res,
    @Param('subtype') subtype,
    @Param('c1') c1,
    @Param('c2') c2,
    @Param('k1') k1,
    @Param('k2') k2,
  ) {
    const kutaSet = await this.settingService.getKutaSettings();

    const co1 = await this.astrologicService.getChart(c1);
    const co2 = await this.astrologicService.getChart(c2);
    let result: any = {};
    if (co1 instanceof Object && co2 instanceof Object) {
      const chart1 = new Chart(co1);
      const chart2 = new Chart(co2);
      const kutaBuilder = new Kuta(chart1, chart2);
      kutaBuilder.loadCompatibility(kutaSet);
      const g1 = chart1.graha(k1);
      const g2 = chart2.graha(k2);
      result = kutaBuilder.calcSingleKuta(subtype, g1, g2);
    }
    return res.status(200).send(result);
  }

  @Get('condition-match/:type/:subtype/:k1/:k2/:opts?/:max?')
  async listByCondtion(
    @Res() res,
    @Param('type') type,
    @Param('subtype') subtype,
    @Param('k1') k1,
    @Param('k2') k2,
    @Param('opts') opts,
    @Param('max') max,
  ) {
    const maxInt = smartCastInt(max, 1000);
    let num = 0;
    let ids: string[] = [];
    if (type === 'aspect') {
      const orb = isNumeric(opts) ? smartCastInt(opts, 1) : 1;
      const orbDouble = await this.matchOrb(subtype, k1, k2, orb);
      const data = await this.astrologicService.filterPairedByAspect(
        subtype,
        k1,
        k2,
        orbDouble,
      );
      num = data instanceof Array ? data.length : 0;
      ids = data.map(row => row._id);
    }
    const results =
      num > 0 ? await this.astrologicService.getPairedByIds(ids, maxInt) : [];
    return res.status(200).send({
      valid: results.length > 0,
      opts,
      num,
      type,
      subtype,
      numResults: results.length,
      results,
    });
  }

  async matchOrb(
    aspect: string,
    k1: string,
    k2: string,
    orbRef: string | number,
  ) {
    let orbDouble = 1;
    const protocolId = typeof orbRef === 'string' ? orbRef : '';
    if (notEmptyString(protocolId, 12)) {
      const orbs = await this.settingService.getProtocolCustomOrbs(protocolId);
      if (orbs.length > 0) {
        orbDouble = matchOrbFromGrid(aspect, k1, k2, orbs);
      }
    } else if (isNumeric(orbRef)) {
      orbDouble = smartCastFloat(orbRef, -1);
    }
    if (orbDouble < 0) {
      if (orbRef === 'auto') {
        const matchedOrbData = calcOrb(aspect, k1, k2);
        orbDouble = matchedOrbData.orb;
      }
    }
    return orbDouble;
  }

  @Get('translate-conditions/:protocolID')
  async translateConditions(
    @Res() res,
    @Param('protocolID') protocolID: string,
  ) {
    const randomPairedChart = await this.astrologicService.getPairedRandom();
    const protocol = await this.buildProtocol(protocolID);
    const kutaSet = await this.settingService.getKutaSettings();
    const data = assessChart(protocol, randomPairedChart, kutaSet);
    return res.json(data);
  }

  // merge with preferences / psychometric data
  @Get('compatibility/:protocolID/:c1/:c2')
  async matchCompatibility(
    @Res() res,
    @Param('protocolID') protocolID: string,
    @Param('c1') c1: string,
    @Param('c2') c2: string,
  ) {
    const randomPairedChart = await this.astrologicService.getPairedByChartIDs(
      c1,
      c2,
    );
    const protocol = await this.buildProtocol(protocolID);
    const kutaSet = await this.settingService.getKutaSettings();
    const data = assessChart(protocol, randomPairedChart, kutaSet);
    return res.json(data);
  }

  // merge with preferences / psychometric data
  @Get('test-rule/:protocolID/:colRef/:ruleIndex/:start?/:limit')
  async testCompatibilityRule(
    @Res() res,
    @Param('protocolID') protocolID: string,
    @Param('colRef') colRef: string,
    @Param('ruleIndex') ruleIndex,
    @Param('start') start,
    @Param('limit') limit,
    @Query() query,
  ) {
    const startInt = smartCastInt(start, 0);
    const limitInt = smartCastInt(limit, 1000);
    const filterRuleIndex = smartCastInt(ruleIndex, -1);
    const data = await this.matchByProtocol(
      protocolID,
      query,
      startInt,
      limitInt,
      colRef,
      filterRuleIndex,
    );
    return res.json(data);
  }

  async matchByProtocol(
    protocolID = '',
    query = null,
    start = 0,
    limit = 1000,
    colRef = '',
    filterRuleIndex = -1,
  ) {
    const pairedcCharts = await this.astrologicService.getPairedCharts(
      start,
      limit,
      [],
      query,
    );
    const protocol = await this.buildProtocol(protocolID);
    const data = { num: 0, items: [], rule: null };
    const kutaSet = await this.settingService.getKutaSettings();
    pairedcCharts.forEach(pc => {
      const row = assessChart(protocol, pc, kutaSet, colRef, filterRuleIndex);
      if (compatibilityResultSetHasScores(row)) {
        data.items.push(row);
      }
    });
    if (notEmptyString(colRef) && filterRuleIndex >= 0) {
      const col = protocol.collections.find(cl => cl.type === colRef);
      if (col instanceof Object) {
        if (col.rules instanceof Array) {
          if (filterRuleIndex < col.rules.length) {
            data.rule = col.rules[filterRuleIndex];
          }
        }
      }
    }
    data.num = data.items.length;
    return data;
  }

  @Get('test-protocols/:protocolID/:start?/:limit?/:status?')
  async testProtocols(
    @Res() res,
    @Param('protocolID') protocolID: string,
    @Param('start') start,
    @Param('limit') limit,
    @Param('status') status: string,
    @Query() query,
  ) {
    const startInt = smartCastInt(start, 0);
    const limitInt = smartCastInt(limit, 100);
    const pairedcCharts = await this.astrologicService.getPairedCharts(
      startInt,
      limitInt,
      [],
      query,
    );
    const protocol = await this.buildProtocol(protocolID);
    const kutaSet = await this.settingService.getKutaSettings();
    const data = { items: [], total: 0 };
    pairedcCharts.forEach(pc => {
      const row = assessChart(protocol, pc, kutaSet);
      data.items.push(row);
    });
    data.total = await this.astrologicService.numPairedCharts(query);
    return res.json(data);
  }

  @Get('num-paired-charts')
  async numPairedCharts(@Res() res) {
    const criteria = res.query instanceof Object ? res.query : {};
    const num = await this.astrologicService.numPairedCharts(criteria);
    return res.json({ num });
  }

  /*
  Save new protocol with nested rules-collections
  */
  @Put('protocol/rule/:itemID/:colRef/:ruleIndex/:saveFlag?/:max?')
  async saveProtcolRule(
    @Res() res,
    @Body() ruleSet: RuleSetDTO,
    @Param('itemID') itemID,
    @Param('colRef') colRef,
    @Param('ruleIndex') ruleIndex,
    @Param('saveFlag') saveFlag,
    @Param('max') max,
    @Query() query,
  ) {
    const index = smartCastInt(ruleIndex, 0);
    const saveRuleInProtocol = smartCastInt(saveFlag, 0) > 0;
    const limitInt = smartCastInt(max, 1000);
    const limit = limitInt > 100 && limitInt < 1000000 ? limitInt : 1000;
    const result = {
      valid: false,
      item: null,
      matches: [],
      num: -1,
      limit,
    };
    let hasValidRule = false;
    if (saveRuleInProtocol) {
      const saved = await this.settingService.saveRuleSet(
        itemID,
        colRef,
        index,
        ruleSet,
      );
      hasValidRule = saved.valid;
      result.item = saved.item;
    } else {
      hasValidRule = true;
    }
    if (hasValidRule) {
      result.valid = true;
      const matchData = await this.matchByProtocol(
        itemID,
        query,
        0,
        limit,
        colRef,
        index,
      );
      if (!saveRuleInProtocol) {
        result.item = matchData.rule;
      }
      if (matchData.num > 0) {
        result.matches = matchData.items;
        result.num = matchData.num;
      }
    }
    return res.status(HttpStatus.OK).send(result);
  }

  async buildProtocol(protocolID: string): Promise<Protocol> {
    const result = await this.settingService.getProtocol(protocolID);
    const settings = await this.settingService.getProtocolSettings();
    let protocol = new Protocol(null, settings);
    if (result instanceof Object) {
      const keys = Object.keys(result.toObject());
      if (keys.includes('collections')) {
        protocol = new Protocol(result, settings);
      }
    }
    return protocol;
  }

  @Get('karana-yogas/:start?/:limit?')
  async showKaranaYogas(
    @Res() res,
    @Param('start') start,
    @Param('limit') limit,
  ) {
    const startInt = smartCastInt(start, 0);
    const maxInt = smartCastInt(limit, 1000);
    const limitInt = maxInt > 0 ? maxInt : 1000;
    const items = await this.astrologicService.getPairedCharts(
      startInt,
      limitInt,
      ['numValues', 'stringValues'],
    );

    const result = {
      valid: items.length > 0,
      num: items.length,
      items: items.map(mapNestedKaranaTithiYoga),
    };
    return res.json(result);
  }

  @Get('paired-charts-steps')
  async showPairedChartSteps(@Res() res) {
    const steps = await this.astrologicService.getPairedChartSteps();
    return res.json(steps);
  }

  @Get('get-paired-charts/:start/:limit')
  async getPairedCharts(
    @Res() res,
    @Param('start') start,
    @Param('limit') limit,
    @Query() query,
  ) {
    const startInt = smartCastInt(start, 0);
    const limitInt = smartCastInt(limit, 10);
    const steps = await this.astrologicService.getPairedCharts(
      startInt,
      limitInt,
      [],
      query,
    );

    return res.json(steps);
  }

  @Post('save-paired')
  async savePairedChart(
    @Res() res,
    @Body() inData: PairedChartInputDTO,
    @Query() query,
  ) {
    const { relName } = query;
    if (notEmptyString(relName, 2)) {
      const newType = {
        key: inData.relType,
        name: relName,
      };
      this.settingService.saveRelationshipType(newType);
    }
    const data = await this.savePairedChartData(inData);
    const statusCode = data.valid ? HttpStatus.OK : HttpStatus.NOT_ACCEPTABLE;
    return res.status(statusCode).send(data);
  }

  @Get('recalc-paired-charts/:userID/:start?/:limit?')
  async recalcPairedCharts(
    @Res() res,
    @Param('userID') userID,
    @Param('start') start,
    @Param('limit') limit,
  ) {
    const startInt = smartCastInt(start, 0);
    const limitInt = smartCastInt(limit, 0);
    const pairedCharts = await this.astrologicService.getPairedCharts(
      startInt,
      limitInt,
    );
    const data = {
      updated: 0,
    };
    for (const pc of pairedCharts) {
      const inData = {
        user: userID,
        c1: pc.c1._id,
        c2: pc.c2._id,
        relType: pc.relType,
        span: pc.span,
        startYear: pc.startYear,
        endYear: pc.endYear,
        tags: pc.tags,
        notes: pc.notes,
        isNew: false,
      } as PairedChartInputDTO;
      await this.savePairedChartData(inData);
      data.updated++;
    }
    return res.send(data);
  }

  async savePairedChartData(inData: PairedChartInputDTO) {
    const c1 = await this.astrologicService.getChart(inData.c1);
    const c2 = await this.astrologicService.getChart(inData.c2);
    const midMode = inData.mode === 'surface' ? 'surface' : 'median';
    if (c1 && c2) {
      const midJd = (c1.jd + c2.jd) / 2;
      const midLng = midPointSurface(c1.geo, c2.geo);
    }
    const validC1 = c1 instanceof Object;
    const validC2 = c2 instanceof Object;
    let surfaceGeo = { lat: 0, lng: 0 };
    let surfaceAscendant = 0;
    let surfaceTzOffset = 0;
    if (validC1 && validC2) {
      const midJd = (c1.jd + c2.jd) / 2;
      const datetime = jdToDateTime(midJd);

      surfaceGeo = midPointSurface(c1.geo, c2.geo);
      const mid =
        midMode === 'surface' ? surfaceGeo : medianLatlng(c1.geo, c2.geo);
      const dtUtc = applyTzOffsetToDateString(datetime, 0);
      const { tz, tzOffset } = await this.geoService.fetchTzData(
        mid,
        dtUtc,
        true,
      );
      const tsData = await calcCompactChartData(
        dtUtc,
        { ...mid, alt: 0 },
        'top',
        [],
        tzOffset,
      );
      let surfaceTzOffset = 0;
      if (midMode !== 'surface') {
        const surfaceTime = await this.geoService.fetchTzData(
          surfaceGeo,
          dtUtc,
          true,
        );
        const surfaceData = await fetchHouseData(
          dtUtc,
          { ...surfaceGeo, alt: 0 },
          'W',
        );
        if (surfaceData instanceof Object) {
          surfaceAscendant = surfaceData.ascendant;
          surfaceTzOffset = surfaceTime.tzOffset;
        }
      }
      const { user } = inData;
      let { notes, tags } = inData;
      if (!tags) {
        tags = [];
      }
      if (!notes) {
        notes = '';
      }
      const baseChart = {
        ...tsData,
        datetime: utcDate(dtUtc),
        tz,
        tzOffset,
      };
      const pairedDTO = {
        user,
        c1: inData.c1,
        c2: inData.c2,
        timespace: this.astrologicService.assignBaseChart(baseChart),
        surfaceGeo,
        surfaceAscendant,
        surfaceTzOffset,
        midMode,
        notes,
        startYear: inData.startYear,
        endYear: inData.endYear,
        span: inData.span,
        relType: inData.relType,
        tags,
      } as PairedChartDTO;
      const { isNew } = inData;
      const createNew = isNew === true;
      const setting = await this.settingService.getByKey('kuta_variants');
      const paired = await this.astrologicService.savePaired(
        pairedDTO,
        setting,
        createNew,
      );
      return {
        valid: true,
        paired,
        msg: `saved`,
      };
    } else {
      const invalidKeys = [];
      if (!validC1) {
        invalidKeys.push(c1);
      }
      if (!validC2) {
        invalidKeys.push(c2);
      }
      const chartIds = invalidKeys.join(', ');
      return {
        valid: false,
        msg: `Chart IDs not matched ${chartIds}`,
      };
    }
  }

  @Get('paired-tag-options/:reset?/:userID?')
  async pairedTagOptions(
    @Res() res,
    @Param('reset') reset,
    @Param('userID') userID,
  ) {
    const useDefaultOpts = smartCastBool(reset, false);
    const resetOpts =
      useDefaultOpts &&
      notEmptyString(userID, 12) &&
      (await this.userService.isAdminUser(userID));
    const data = await this.settingService.getPairedVocabs(
      useDefaultOpts,
      resetOpts,
    );
    return res.json(data);
  }

  @Get('tag-stats/:limit?')
  async getTagStats(@Res() res, @Param('limit') limit) {
    const limitInt = smartCastInt(limit, 100 * 1000);
    const data = await this.astrologicService.tagStats(limitInt);
    return res.json(data);
  }

  @Get('trait-tags/:mode?/:limit?')
  async getTraitTags(@Res() res, @Param('mode') mode, @Param('limit') limit) {
    const limitInt = smartCastInt(limit, 100 * 1000);
    const shortOnly = mode !== 'long';
    const data = await this.astrologicService.getTraits(shortOnly, limitInt);
    return res.json(data);
  }

  @Post('reassign-paired-tags')
  async reassignPairedTags(@Res() res, @Body() tagReassignDto: TagReassignDTO) {
    const { source, target, years, notes, remove } = tagReassignDto;

    const emptyTagDTO = { slug: '', name: '', vocab: '' } as TagDTO;
    const hasSource = source instanceof Object;
    const sourceTag = hasSource ? source : emptyTagDTO;
    const hasTarget = target instanceof Object;
    const targetTag = hasTarget ? target : emptyTagDTO;
    const yearSpan = typeof years === 'number' && years > 0 ? years : -1;
    const removeTag = remove === true && !hasTarget;
    const addToNotes = notes === true;
    const validInput =
      hasSource && (hasTarget || yearSpan > 0 || addToNotes || removeTag);
    const data = {
      source: sourceTag,
      target: targetTag,
      years: yearSpan,
      validInput,
    };
    let ids: string[] = [];
    if (validInput) {
      ids = await this.astrologicService.reassignTags(
        source,
        target,
        years,
        addToNotes,
      );
    }
    return res.json({
      ids,
      source: sourceTag,
      target: targetTag,
      years: yearSpan,
      notes: addToNotes,
      valid: validInput,
    });
  }

  @Get('sanitize-tags/:start?/:limit?')
  async sanitizeTags(@Res() res, @Param('start') start, @Param('limit') limit) {
    const startInt = smartCastInt(start, 0);
    const limitInt = smartCastInt(limit, 1000);
    const data = await this.astrologicService.sanitizePairedCharts(
      startInt,
      limitInt,
    );
    return res.json(data);
  }

  @Get('has-other-pairings/:c1/:c2')
  async hasOtherPairings(@Res() res, @Param('c1') c1, @Param('c2') c2) {
    const data = await this.astrologicService.findPairings(c1, c2);
    return res.json(data);
  }

  @Delete('delete-paired/:c1/:c2/:userID/:remCharts?')
  async deletePairedAndRelated(
    @Res() res,
    @Param('c1') c1,
    @Param('c2') c2,
    @Param('userID') userID,
    @Param('remCharts') remCharts,
  ) {
    const data = { valid: false, paired: null, chart1: null, chart2: null };
    if (this.userService.isAdminUser(userID)) {
      const removeCharts = smartCastBool(remCharts);
      const result = await this.astrologicService.removePairedAndCharts(
        c1,
        c2,
        removeCharts,
      );
      data.paired = result.paired;
      data.chart1 = result.chart1;
      data.chart2 = result.chart2;
      data.valid = true;
    }
    return res.json(data);
  }

  /*
    Delete chart by paired id with userID to check permissions
  */
  @Delete('delete-paired/:pairedID/:userID')
  async deletePairedChart(
    @Res() res,
    @Param('pairedID') pairedID: string,
    @Param('userID') userID: string,
  ) {
    const data = { valid: false, pairedID: '' };
    let status = HttpStatus.NOT_ACCEPTABLE;
    if (this.userService.isAdminUser(userID)) {
      const deleted = await this.astrologicService.deletePaired(pairedID);
      if (deleted) {
        data.pairedID = deleted;
        data.valid = true;
        status = HttpStatus.OK;
      }
    }
    return res.status(status).json(data);
  }

  @Get('calc-paired/:loc1/:dt1/:loc2/:dt2/:mode?')
  async calcPairedChart(
    @Res() res,
    @Param('loc1') loc1: string,
    @Param('dt1') dt1: string,
    @Param('loc2') loc2: string,
    @Param('dt2') dt2: string,
    @Param('mode') mode: string,
  ) {
    const midMode = mode === 'median' ? 'median' : 'surface';

    let data: any = { valid: false };
    const validC1 = validISODateString(dt1) && notEmptyString(loc1);
    const validC2 = validISODateString(dt2) && notEmptyString(loc2);

    if (validC1 && validC2) {
      const geo1 = locStringToGeo(loc1);
      const geo2 = locStringToGeo(loc2);
      const jd1 = calcJulDate(dt1);
      const jd2 = calcJulDate(dt2);
      const midJd = (jd2 + jd1) / 2;
      const datetime = jdToDateTime(midJd);
      const mid =
        midMode === 'surface'
          ? midPointSurface(geo1, geo2)
          : medianLatlng(geo1, geo2);

      const dtUtc = applyTzOffsetToDateString(datetime, 0);
      const { tz, tzOffset } = await this.geoService.fetchTzData(mid, dtUtc);
      data = await calcCompactChartData(
        dtUtc,
        { ...mid, alt: 0 },
        'top',
        [],
        tzOffset,
      );

      return res.json({
        c1: {
          jd: jd1,
          geo: geo1,
        },
        c2: { jd: jd2, geo: geo2 },
        timespace: data,
      });
    } else {
      return res.json({
        valid: false,
        msg: `Invalid dates or coordinates`,
      });
    }
  }

  @Get('paired/:userID/:max?')
  async getPairedByUser(
    @Res() res,
    @Param('userID') userID: string,
    @Param('max') max: string,
    @Query() query,
  ) {
    const limit = smartCastInt(max, 0);
    const items = await this.astrologicService.getPairedByUser(
      userID,
      limit,
      query,
    );
    return res.json({
      valid: true,
      items,
    });
  }

  @Get('kutas/:c1/:c2')
  async getKutas(@Res() res, @Param('c1') c1: string, @Param('c2') c2: string) {
    const paired = await this.astrologicService.getPairedByChartIDs(c1, c2);
    const result: Map<string, any> = new Map();
    if (paired instanceof Object) {
      const c1 = new Chart(paired.c1);
      const c2 = new Chart(paired.c2);
      c1.setAyanamshaItemByNum(27);
      c2.setAyanamshaItemByNum(27);
      /* const kutas = c1.grahas.map(gr1 => {
        return matchNaturalGrahaMaitri(gr1, gr2);
      }); */
      const kutaBuilder = new Kuta(c1, c2);
      const kutaSet = await this.settingService.getKutas();
      kutaBuilder.loadCompatibility(kutaSet);
      const kutas = kutaBuilder.calcAllSingleKutas();
      result.set('kutas', kutas);
      const simpleC1 = simplifyChart(paired.c1, 'true_citra');
      const simpleC2 = simplifyChart(paired.c2, 'true_citra');
      result.set('c1', simpleC1);
      result.set('c2', simpleC2);
    }
    return res.json(Object.fromEntries(result));
  }

  @Post('save-charts')
  async bulkSaveCoreCharts(@Res() res, @Body('items') items: ChartInputDTO[]) {
    const data = { valid: false, itemIds: [], recalculatedIds: [] };
    if (items instanceof Array) {
      for (const item of items) {
        const chart = await this.astrologicService.getChart(item._id);
        if (chart instanceof Object) {
          const obj = chart.toObject();
          const { subject, geo } = obj;
          const inData = {
            _id: item._id,
            isDefaultBirthChart: item.isDefaultBirthChart,
            user: chart.user,
            name: item.name,
            gender: item.gender,
            datetime: item.datetime,
            eventType: subject.eventType,
            type: subject.type,
            roddenValue: item.roddenValue,
            notes: item.notes,
            lat: item.lat,
            lng: item.lng,
            alt: chart.geo.alt,
            tz: chart.tz,
            tzOffset: item.tzOffset,
          } as ChartInputDTO;
          const chartItem = await this.quickSaveChart(inData, obj);
          if (chartItem.valid) {
            data.itemIds.push(item._id);
            if (chartItem.recalculated) {
              data.recalculatedIds.push(item._id);
            }
          }
        }
      }
    }
    return res.json(data);
  }

  @Get('recalc-paired/:startRef/:limit?')
  async recalcPaired(
    @Res() res,
    @Param('startRef') startRef: string,
    @Param('limit') limit: string,
  ) {
    const startFromInt = /^\d+$/.test(startRef);
    const startInt = startFromInt ? smartCastInt(startRef, 0) : 0;
    const limitInt = smartCastInt(limit, 10);
    const hasIdStr = !startFromInt && notEmptyString(startRef, 16);
    const idStr = hasIdStr ? startRef : '';
    const kutaSet = await this.settingService.getKutas();
    const data = await this.astrologicService.bulkUpdatePaired(
      startInt,
      limitInt,
      kutaSet,
      idStr,
    );
    return res.json(data);
  }

  @Get('aspects/:c1/:c2')
  async getAspects(
    @Res() res,
    @Param('c1') c1: string,
    @Param('c2') c2: string,
  ) {
    const paired = await this.astrologicService.getPairedByChartIDs(c1, c2);
    const result: Map<string, any> = new Map();
    if (paired instanceof Object) {
      const c1 = new Chart(paired.c1);
      const c2 = new Chart(paired.c2);
      c1.setAyanamshaItemByNum(27);
      c2.setAyanamshaItemByNum(27);
      /* const kutas = c1.grahas.map(gr1 => {
        return matchNaturalGrahaMaitri(gr1, gr2);
      }); */
      const kutaBuilder = new Kuta(c1, c2);
      const kutaSet = await this.settingService.getKutas();
      kutaBuilder.loadCompatibility(kutaSet);
      const aspects = calcAllAspects(c1, c2);
      result.set('aspects', aspects);
      const simpleC1 = simplifyChart(paired.c1, 'true_citra');
      const simpleC2 = simplifyChart(paired.c2, 'true_citra');
      result.set('c1', simpleC1);
      result.set('c2', simpleC2);
    }
    return res.json(Object.fromEntries(result));
  }

  @Get('paired-by-chart/:chartID/:max?')
  async getPairedByChart(
    @Res() res,
    @Param('chartID') chartID: string,
    @Param('max') max: string,
  ) {
    const limit = smartCastInt(max, 0);
    const items = await this.astrologicService.getPairedByChart(
      chartID,
      'modifiedAt',
      limit,
    );
    return res.json({
      valid: true,
      items,
    });
  }

  @Get('paired-by-charts/:chartID1/:chartID2/:relType?')
  async getPairedByChartIDs(
    @Res() res,
    @Param('chartID1') chartID1: string,
    @Param('chartID2') chartID2: string,
    @Param('relType') relType: string,
  ) {
    const items = await this.astrologicService.getPairedByChart(
      chartID1,
      'modifiedAt',
      1,
      chartID2,
    );
    const item = items.length > 0 ? items[0] : null;
    return res.json({
      valid: items.length > 0,
      item,
    });
  }

  @Get('search-paired/:userID/:search')
  async getPairedBySearch(
    @Res() res,
    @Param('userID') userID: string,
    @Param('search') search: string,
  ) {
    const isAdmin = await this.userService.isAdminUser(userID);
    const items = await this.astrologicService.getPairedBySearchString(
      userID,
      search,
      isAdmin,
      20,
    );
    return res.json({
      valid: items.length > 0,
      items,
    });
  }

  @Get('chart/:chartID')
  async fetchChart(@Res() res, @Param('chartID') chartID: string) {
    const data: any = { valid: false, shortTz: '', chart: null, user: null };
    const chart = await this.astrologicService.getChart(chartID);
    if (chart instanceof Object) {
      data.chart = chart;
      let user = null;
      const userID = chart.user.toString();
      user = await this.userService.getUser(userID);
      data.shortTz = toShortTzAbbr(chart.datetime, chart.tz);
      data.valid = true;
    }
    return res.json(data);
  }

  @Get('charts-by-user/:userID/:start?/:limit?/:defaultOnly?')
  async fetchChartsByUser(
    @Res() res,
    @Param('userID') userID: string,
    @Param('start') start = '0',
    @Param('limit') limit = '100',
    @Param('defaultOnly') defaultOnly = '0',
    @Query() query,
  ) {
    const data: any = { valid: false, items: [], message: 'invalid user ID' };
    const user = await this.userService.getUser(userID);
    const isDefaultBirthChart = smartCastInt(defaultOnly) > 0;
    const isAdmin = this.userService.hasAdminRole(user);
    if (user instanceof Object) {
      if (user.active) {
        const startVal = smartCastInt(start, 0);
        const limitVal = smartCastInt(limit, 10);
        const charts = await this.astrologicService.getChartsByUser(
          userID,
          startVal,
          limitVal,
          isDefaultBirthChart,
          query,
          isAdmin
        );
        if (charts instanceof Array) {
          data.items = charts;
          data.valid = true;
          data.message = 'OK';
        } else {
          data.message = 'Inactive account';
        }
      }
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('chart-names-by-user/:userID/:search/:nameMode?')
  async fetchChartsByName(
    @Res() res,
    @Param('userID') userID: string,
    @Param('search') search: string,
    @Param('nameMode') nameMode: string,
  ) {
    const result: Map<string, any> = new Map();
    const longNameMode = nameMode === 'long';
    const charts = await this.astrologicService.getChartNamesByUserAndName(
      userID,
      search,
      20,
      longNameMode,
    );
    result.set('items', charts);
    const data = Object.fromEntries(result);
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('chart-core-by-user/:userID/:start?/:limit?')
  async fetchChartsCoreData(
    @Res() res,
    @Param('userID') userID: string,
    @Param('start') start,
    @Param('limit') limit,
    @Query() query,
  ) {
    const result: Map<string, any> = new Map();
    const limitInt = smartCastInt(limit, 100);
    const startInt = smartCastInt(start, 0);
    const criteria = query instanceof Object ? query : {};
    const criteriaKeys = Object.keys(criteria);
    const name = criteriaKeys.includes('name') ? criteria.name : '';
    const search = notEmptyString(name)
      ? name
      : criteriaKeys.includes('search')
      ? criteria.search
      : '';
    const statusRef = criteriaKeys.includes('status')
      ? criteria.status.toLowerCase()
      : '';
    const charts = await this.astrologicService.getCoreChartDataByUser(
      userID,
      search,
      statusRef,
      startInt,
      limitInt,
    );
    const items = [];
    for (const row of charts) {
      const item = row.toObject();
      const {
        _id,
        isDefaultBirthChart,
        datetime,
        jd,
        tzOffset,
        geo,
        subject,
      } = item;
      const { name, gender, roddenValue } = subject;
      const { lat, lng, alt } = geo;
      const paired = await this.astrologicService.matchPairedIdsByChartId(
        item._id,
        true,
      );
      items.push({
        _id,
        isDefaultBirthChart,
        datetime,
        jd,
        tzOffset,
        lat,
        lng,
        alt,
        name,
        gender,
        roddenValue,
        paired,
      });
    }
    result.set('items', items);
    const total = await this.astrologicService.countCoreChartDataByUser(
      userID,
      search,
      statusRef,
    );
    const data = Object.fromEntries(result);
    return res.status(HttpStatus.OK).json({ ...data, total });
  }

  @Get('get-paired-items/:chartID')
  async getPairedItemsByChartId(@Res() res, @Param('chartID') chartID: string) {
    const data = await this.astrologicService.matchPairedIdsByChartId(
      chartID,
      true,
    );
    return res.status(HttpStatus.OK).json(data);
  }

  @Delete('delete-chart/:userID/:chartID')
  async deleteChart(
    @Res() res,
    @Param('userID') userID: string,
    @Param('chartID') chartID: string,
  ) {
    const data: any = { valid: false, message: 'invalid user ID', id: '' };
    const user = await this.userService.getUser(userID);
    if (user instanceof Object) {
      if (user.active) {
        const chart = await this.astrologicService.getChart(chartID);
        if (chart instanceof Object) {
          if (
            chart.user.toString() === userID ||
            this.userService.hasAdminRole(user)
          ) {
            this.astrologicService.deleteChart(chartID);
            data.valid = true;
            data.id = chartID;
            data.message = 'Chart deleted';
          } else {
            data.message = 'Permission denied';
          }
        } else {
          data.message = 'Chart not found';
        }
      } else {
        data.message = 'Inactive account';
      }
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('vargas/:loc/:dt/:system?')
  async vargasByDateGeo(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
    @Param('system') system,
  ) {
    let data: any = { valid: false };
    if (notEmptyString(dt, 6) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      const sysRef = notEmptyString(system) ? system : 'W';
      data = await calcVargas(dt, geo, sysRef);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('upagrahas/:loc/:dt/:test?')
  async upagrahasByDateGeo(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
    @Param('test') test,
  ) {
    let data = { valid: false };
    if (notEmptyString(dt, 6) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      const showPeriods = test === 'test';
      data = await calcUpagrahas(dt, geo, 0, showPeriods);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('horas/:loc/:dt')
  async horasByDateGeo(@Res() res, @Param('loc') loc, @Param('dt') dt) {
    let data: any = { valid: false };
    if (notEmptyString(dt, 6) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      data = await calcHoras(dt, geo);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('panchanga/:loc/:dt')
  async panchangaByDateGeo(@Res() res, @Param('loc') loc, @Param('dt') dt) {
    let data: any = { valid: false };
    if (notEmptyString(dt, 6) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      data = await calcPanchanga(dt, geo);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('mrityu/:loc/:dt')
  async mrityubhagaByDateGeo(@Res() res, @Param('loc') loc, @Param('dt') dt) {
    let data: any = { valid: false };
    if (notEmptyString(dt, 6) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      data = await calcMrityubhaga(dt, geo);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('sphutas/:loc/:dt')
  async sphutasByDateGeo(@Res() res, @Param('loc') loc, @Param('dt') dt) {
    let data: any = { valid: false };
    if (notEmptyString(dt, 6) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      data = await calcSphutaData(dt, geo);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('indian-time/:loc/:dt')
  async indianTimeByGeo(@Res() res, @Param('loc') loc, @Param('dt') dt) {
    const data: any = {
      valid: false,
      localDateTime: '',
      tzOffset: null,
      tz: null,
    };
    if (notEmptyString(dt, 6) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      const geoInfo = await this.geoService.fetchGeoAndTimezone(
        geo.lat,
        geo.lng,
        dt,
      );
      const dtUtc = applyTzOffsetToDateString(dt, geoInfo.offset);
      data.localDateTime = dt;
      data.tzOffset = geoInfo.offset;
      data.tz = geoInfo.tz;

      data.indianTime = await toIndianTime(dtUtc, geo);
      data.valid = true;
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('tzdata/:loc/:dt')
  async timeZoneByGeo(@Res() res, @Param('loc') loc, @Param('dt') dt) {
    if (notEmptyString(dt, 6) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      const data = await this.geoService.fetchTzData(geo, dt);
      if (data.valid) {
        const shortTz = toShortTzAbbr(dt, data.tz);
        return res.status(HttpStatus.OK).json({ ...data, shortTz });
      } else {
        return res.status(HttpStatus.NOT_ACCEPTABLE).json(data);
      }
    } else {
      return res.status(HttpStatus.NOT_ACCEPTABLE).json({ valid: false });
    }
  }

  @Get('retrograde/:dt/:planet')
  async retrogradeStations(
    @Res() res,
    @Param('dt') dt,
    @Param('planet') planet,
  ) {
    let data: any = { valid: false };
    if (notEmptyString(dt, 6) && isNumeric(planet)) {
      const num = parseInt(planet);
      data = await calcRetroGrade(dt, num);
    }
    res.send(data);
  }

  @Get('speed-samples/:dt/:planet/:years?')
  async saveRetrogradeSamples(
    @Res() res,
    @Param('dt') dt,
    @Param('planet') planet,
    @Param('years') years,
  ) {
    let data: any = { valid: false };
    let days = isNumeric(years) ? parseInt(years) * 367 : 367;
    if (validISODateString(dt) && isNumeric(planet)) {
      const num = parseInt(planet);
      data = await this.astrologicService.savePlanetStations(num, dt, days);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('predictive/:key/:lng/:start?/:ayanamsha?')
  async predictiveGrahaLng(@Res() res, @Param('key') key, @Param('lng') lng, @Param('start') start, @Param('ayanamsha') ayanamsha) {
    //const useJd = isNumeric(jd) && jd > 0;
    const { dtUtc, jd } = matchJdAndDatetime(start);
    /* const dtVal = !useJd ? validISODateString(jd)? jd : new Date().toISOString() : "";
    const jdFl = useJd ? parseInt(jd) : calcJulDate( dtVal.split(".").shift()); */
    const lngFl = isNumeric(lng)? parseInt(lng) : 0;
    const data = await matchNextTransitAtLng(key, lngFl, jd, ayanamsha);
    const targetDt = julToISODate(data.targetJd);
    return res.status(HttpStatus.OK).json({...data, startDt: dtUtc, targetDt});
  }

  @Get('ayanamsha/:dt?/:ayanamsha?')
  async ayanamsha(@Res() res, @Param('dt') dt, @Param('ayanamsha') ayanamsha) {
    const { dtUtc, jd } = matchJdAndDatetime(dt);
    const ayanamshaKey = notEmptyString(ayanamsha, 5)? ayanamsha : "true_citra";
    const ayaRow = ayanamshaValues.find(row => row.key === ayanamshaKey);
    const ayaItem = ayaRow instanceof Object ? ayaRow : {key: "", value: 0, name: "" };
    const { name}  = ayaItem;
    const value = await calcAyanamsha(jd, ayanamshaKey);
    return res.status(HttpStatus.OK).json({ dt: dtUtc, jd: jd, value, num: ayaItem.value, name, key: ayanamshaKey });
  }

  @Get('sign-timeline/:loc/:start?/:end?/:ayanamsha?')
  async signSwitches(@Res() res, @Param('loc') loc, @Param('start') start, @Param('end') end, @Param('ayanamsha') ayanamsha) {
    const { dtUtc, jd } = matchJdAndDatetime(start);
    const startJd = jd;
    const { endJd, endDt } = matchEndJdAndDatetime(end, jd);
    const geo = locStringToGeo(loc);
    const ayanamshaKey = notEmptyString(ayanamsha, 5)? ayanamsha : "true_citra";
    const grahas = await calcGrahaSignTimeline(geo, startJd, endJd, ayanamshaKey);
    return res.status(HttpStatus.OK).json({ start: dtUtc, end: endDt, grahas });
  }

  @Get('kaksha-transit-timeline/:chartID/:loc/:start?/:end?/:exclude?/:ayanamsha?')
  async kakshaTimeline(@Res() res, @Param('chartID') chartID, @Param('loc') loc, @Param('start') start, @Param('end') end, @Param('exclude') exclude, @Param('ayanamsha') ayanamsha) {
    const { dtUtc, jd } = matchJdAndDatetime(start);
    const startJd = jd;
    const { endJd, endDt } = matchEndJdAndDatetime(end, jd);
    const ayanamshaKey = notEmptyString(ayanamsha, 5)? ayanamsha : "true_citra";
    const excludeKeys = notEmptyString(exclude)? exclude.split(',').filter(p => p.length === 2) : []; 
    const currGeo: GeoPos = locStringToGeo(loc);
    const {rows, datetime, geo } = await this.astrologicService.fetchKakshaTimelineData(chartID, currGeo, startJd, endJd, excludeKeys, ayanamshaKey);
    return res.status(HttpStatus.OK).json({ dt: datetime, geo: geo, currGeo,  start: dtUtc, end: endDt, rows });
  }

  @Get('kaksha-transit-graph/:chartID/:loc/:start?/:end?/:ayanamsha?')
  async kakshaTimelineGraph(@Res() res, @Param('chartID') chartID, @Param('loc') loc, @Param('start') start, @Param('end') end, @Param('exclude') exclude, @Param('ayanamsha') ayanamsha) {
    const { dtUtc, jd } = matchJdAndDatetime(start);
    const startJd = jd;
    const { endJd, endDt } = matchEndJdAndDatetime(end, jd);
    const ayanamshaKey = notEmptyString(ayanamsha, 5)? ayanamsha : "true_citra";
    const excludeKeys = []; 
    const currGeo: GeoPos = locStringToGeo(loc);
    const {rows, datetime, geo } = await this.astrologicService.fetchKakshaTimelineData(chartID, currGeo, startJd, endJd, excludeKeys, ayanamshaKey);
    const samples = [];
    const hasAscendant = excludeKeys.includes("as") === false;
    const hasMoon = excludeKeys.includes("mo") === false;
    const stepsPerDay = hasAscendant ? 192 : hasMoon ? 48 : 12;
    const sampleInterval = 1 / stepsPerDay;
    const numSteps = Math.ceil(endJd - startJd) * stepsPerDay;
    for (let i = 0; i < numSteps; i++) {
      const refJd = startJd + (i * sampleInterval);
      const rowIndex = i < 1 ? 0 : rows.findIndex(row => row.jd >= refJd);
      if (rowIndex >= 0) {
        const row = rows[rowIndex];
        const bindus = row.items.filter(item => item.hasBindu).map(item => item.key);
        const total = bindus.length;
        const lords = row.items.map(item => item.lord);
        samples.push({
          jd: row.jd,
          total,
          lords,
          bindus,
        });
      }
    }
    return res.status(HttpStatus.OK).json({ dt: datetime, geo: geo, currGeo,  start: dtUtc, end: endDt, items: samples, numSteps, stepsPerDay });
  }

  @Get('object-sign-timeline/:loc/:start?/:end?')
  async fetchObjectTimeline(@Res() res, @Param('loc') loc, @Param('start') start, @Param('end') end) {
    const geo = locStringToGeo(loc);
    const { jd } = matchJdAndDatetime(start);
    const { endJd } = matchEndJdAndDatetime(end, jd);
    const data = await this.astrologicService.fetchBavTimeline(geo, jd, endJd);
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('kaksha-timeline/:loc/:start?/:end?')
  async fetchKakshaTimeline(@Res() res, @Param('loc') loc, @Param('start') start, @Param('end') end) {
    const geo = locStringToGeo(loc);
    const { jd } = matchJdAndDatetime(start);
    const { endJd } = matchEndJdAndDatetime(end, jd);
    const data = await this.astrologicService.fetchKakshaTimeline(geo, jd, endJd);
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('bav-sign-timeline/:loc/:dt?')
  async fetchBavTimeline(
      @Res() res,
      @Param('loc') loc,
      @Param('dt') dt,
      @Query() query
    ) {
    const geo = locStringToGeo(loc);
    const queryEntries = query instanceof Object ? Object.entries(query) : [];
    const queryKeys = queryEntries.map(entry => entry[0]);
    const mode = queryKeys.includes('mode') ? query.mode : 'mid';
    const span = queryKeys.includes('span') ? query.span : 28;
    const sample = queryKeys.includes('sample') ? query.span : 8;
    const isMidMode = ['start', 'start-sample'].includes(mode) === false;
    const returnGrahaRefValues = ['start-sample','sample'].includes(mode);
    const { jd } = matchJdAndDatetime(dt, -1, true, isMidMode);
    const spanJd = smartCastInt(span, 28);
    const offset = isMidMode ? 0 - (spanJd / 2) : 0;
    const startJd = jd + offset;
    const coreKeys = ['sa', 'ju', 'ma', 'su', 've', 'me', 'mo', 'as', 'ke', 'ra'];
    const refBodies: Map<string, number> = new Map();
    queryEntries.filter(entry => coreKeys.includes(entry[0]) && isNumeric(entry[1])).forEach(entry => {
      const [key, val] = entry;
      refBodies.set(key, smartCastInt(val.toString(), 0));
    });
    const endJd = jd + + spanJd + offset;
    const sampleRate = smartCastInt(sample, 8);
    const data = await this.astrologicService.fetchBavTimeline(geo, startJd, endJd);
    const graphData = returnGrahaRefValues? calcBavSignSamples(data, startJd, endJd, sampleRate) : calcBavGraphData(data, refBodies, startJd, endJd, sampleRate);
    return res.status(HttpStatus.OK).json({ items: graphData, valid: graphData.length > 0 });
  }

  @Get('ascendant-timeline/:loc/:start?/:end?/:ayanamsha?')
  async fetchAscendantTimeline(@Res() res, @Param('loc') loc, @Param('start') start, @Param('end') end, @Param('ayanamsha') ayanamsha) {
    const geo = locStringToGeo(loc);
    const { dtUtc, jd } = matchJdAndDatetime(start);
    const startJd = jd;
    const { lat, lng } = geo;
    const ayanamshaKey = notEmptyString(ayanamsha, 5)? ayanamsha : "true_citra";
    const ayanamshaVal = await calcAyanamsha(startJd, ayanamshaKey);
    const { endJd, endDt } = matchEndJdAndDatetime(end, jd);
    const data = calcAscendantTimelineItems(12, lat, lng, startJd, endJd, ayanamshaVal);
    return res.status(HttpStatus.OK).json({startDt: dtUtc, endDt, ...data});
  }

  @Get('ascendant/:loc/:dt?/:ayanamsha?')
  async fetchAscendant(@Res() res, @Param('loc') loc, @Param('dt') dt, @Param('ayanamsha') ayanamsha) {
    const geo = locStringToGeo(loc);
    const { dtUtc, jd } = matchJdAndDatetime(dt);
    const { lat, lng } = geo;
    const ayanamshaKey = notEmptyString(ayanamsha, 5)? ayanamsha : "true_citra";
    const ayanamshaVal = await calcAyanamsha(jd, ayanamshaKey);
    const ascendant = calcOffsetAscendant(lat, lng, jd, ayanamshaVal);
    const hd = await fetchHouseDataJd(jd, geo);
    const lagna = subtractLng360(hd.ascendant, ayanamshaVal);
    return res.status(HttpStatus.OK).json({ ascendant, lagna, dt: dtUtc });
  }
    

  @Get('speed-patterns/:planet')
  async motionPatternsByPlanet(@Res() res, @Param('planet') planet) {
    let data: any = { valid: false, values: [] };
    if (isNumeric(planet)) {
      const num = parseInt(planet);
      data.values = await this.astrologicService.speedPatternsByPlanet(num);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('transitions-by-planet/:planet/:startYear?/:endYear?')
  async transitionsByPlanet(
    @Res() res,
    @Param('planet') planet,
    @Param('startYear') startYear,
    @Param('endYear') endYear,
  ) {
    let data: any = { valid: false, values: [] };
    const num = isNumeric(planet)? parseInt(planet) : matchPlanetNum(planet);
    if (num >= 0) {
      const startYearInt = isNumeric(startYear)
        ? parseInt(startYear, 10)
        : 2000;
      const endYearInt = isNumeric(endYear) ? parseInt(endYear, 10) : 2100;
      data.values = await this.astrologicService.transitionsByPlanet(
        num,
        startYearInt,
        endYearInt,
      );
    }
    return res.status(HttpStatus.OK).json({...data, planet, num});
  }

  @Get('calc-body/:key/:dt/:ayanamsha?')
  async calcBodyPosition(@Res() res, @Param('key') key: string, @Param('dt') dt: string, @Param('ayanamsha') ayanamsha) {
    const isJd = /^\d+(\.\d+)?$/.test(dt);
    const jd = isJd? smartCastInt(dt) : calcJulDate(dt);
    const ayanamshaKey = notEmptyString(ayanamsha, 2)? ayanamsha : "true_citra";
    let ayaVal = 0;
    if (["raw", "tropical"].includes(ayanamshaKey) === false) {
      ayaVal = await calcAyanamsha(jd, ayanamshaKey);
    }
    const data = await calcBodyJd(jd, key, true);
    const graha = new Graha(data);
    const ayaRow = ayanamshaValues.find(av => av.key === ayanamshaKey);
    const ayaItem = {...ayaRow, num: ayaRow.value, value: ayaVal};
    graha.setAyanamshaItem(ayaItem);
    return res.json({longitude: graha.longitude, ...graha});
  }

  @Get('planet-station-test/:planet/:startDt/:station')
  async planetStationTest(
    @Res() res,
    @Param('planet') planet,
    @Param('startDt') startDt,
    @Param('station') station,
  ) {
    let data: any = { valid: false, values: [] };
    if (isNumeric(planet) && validISODateString(startDt)) {
      const num = parseInt(planet);
      const jd = calcJulDate(startDt);
      const row = await calcStation(jd, num, station);
      if (row instanceof Object) {
        const { num, jd, datetime, lng, speed, station } = row;
        data = { valid: jd > 0, num, jd, datetime, lng, speed, station };
      }
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('planet-station/:planet/:dt/:station/:mode?')
  async planetStation(
    @Res() res,
    @Param('planet') planet,
    @Param('dt') dt,
    @Param('station') station,
    @Param('mode') mode,
  ) {
    let data: any = { valid: false, values: [] };
    if (isNumeric(planet) && validISODateString(dt)) {
      const num = parseInt(planet);
      const jd = calcJulDate(dt);
      const isPrev = mode === 'prev';
      const row = await this.astrologicService.nextPrevStation(
        num,
        jd,
        station,
        isPrev,
      );
      if (row instanceof Object) {
        const { num, jd, datetime, lng, speed, station } = row;
        data = {
          valid: jd > 0,
          num,
          jd,
          datetime,
          lng,
          speed,
          retro: speed < 0,
          station,
        };
      }
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('planet-stations/:planet/:dt/:current?')
  async planetStationSet(
    @Res() res,
    @Param('planet') planet,
    @Param('dt') dt,
    @Param('current') current,
  ) {
    let results = [];
    if (isNumeric(planet)) {
      const num = parseInt(planet);
      const showCurrent = current === 'current';
      results = await this.astrologicService.planetStations(
        num,
        dt,
        showCurrent,
      );
    }
    return res.status(HttpStatus.OK).json({
      valid: results.length > 1,
      results,
    });
  }

  @Get('all-planet-stations/:dt/:current?')
  async allPlanetStationSets(
    @Res() res,
    @Param('dt') dt,
    @Param('current') current,
  ) {
    let rows = new Map<number, any>();
    const nums = [2, 3, 4, 5, 6, 7, 8, 9];
    let valid = false;
    const showCurrent = current === 'current';
    for (const num of nums) {
      const rs = await this.astrologicService.planetStations(
        num,
        dt,
        showCurrent,
      );
      if (rs instanceof Object) {
        rows.set(num, rs);
        valid = true;
      }
    }
    const results = Object.fromEntries(rows);
    return res.status(HttpStatus.OK).json({
      valid,
      results,
    });
  }

  @Get('relationship-types')
  async getRelTypes(@Res() res) {
    const key = 'relationship_types';
    const setting = await this.settingService.getByKey(key);
    let defaultTags: KeyName[] = [];
    if (setting.value instanceof Array) {
      defaultTags = setting.value;
    } else {
      defaultTags = typeTags;
      const newSetting = {
        key,
        value: typeTags,
        type: 'lookup_set',
        weight: 11,
      } as CreateSettingDTO;
      this.settingService.addSetting(newSetting);
    }
    const existing = await this.astrologicService.uniqueTagSlugs();
    const usedTags = existing.map(key => {
      const tag = defaultTags.find(tg => tg.key === key);
      const name =
        tag instanceof Object ? tag.name : key.replace(/[_-]+/g, ' ').trim();
      return { key, name };
    });
    usedTags.forEach(kn => {
      const tagIndex = existing.findIndex(tg => tg.key === kn.key);
      if (tagIndex < 0) {
        defaultTags.push(kn);
      }
    });
    return res.status(HttpStatus.OK).json(defaultTags);
  }

  @Get('settings/:filter?')
  async listSettings(@Res() res, @Param('filter') filter) {
    let filters: Array<string> = [];
    if (notEmptyString(filter, 3)) {
      filters = filter.split(',');
    }
    const data = fetchAllSettings(filters);
    return res.status(HttpStatus.OK).json(data);
  }

  async mapAstroDatabankRecord(
    rec: Record,
    rows: Array<Record>,
    userID: string,
    timeoutMs = 500,
  ) {
    const inData = mapToChartInput(rec, userID);

    const d1 = await this.saveChartData(inData);
    if (d1.valid && rec.relations.length > 0) {
      rec.relations.forEach(async (rel, relIndex) => {
        const relRec = rows.find(
          r => r.identifier.trim() === rel.identifier.trim(),
        );
        if (relRec instanceof Object) {
          const inData2 = mapToChartInput(relRec, userID);
          setTimeout(async () => {
            const d2 = await this.saveChartData(inData2);

            if (d2.valid) {
              const pd = mapPairedChartInput(
                relRec,
                d1.chart._id,
                d2.chart._id,
                rel,
                userID,
              );
              const pData = await this.savePairedChartData(pd);
            }
          }, relIndex * timeoutMs);
        }
      });
    }
  }

  @Get('test-records/match/:userID')
  async matchTestRecords(@Res() res, @Param('userID') userID) {
    const result = await parseAstroBankJSON();
    const start = 100;
    const timeoutMs = 800;
    let numRows = 0;
    if (result.has('numRows')) {
      numRows = result.get('numRows');
      if (numRows > 0) {
        const rows = result.get('rows');
        if (rows instanceof Array) {
          for (let i = start; i < numRows; i++) {
            const rec: Record = rows[i];
            const numRels = rec.relations.length;
            let ts = (i - start) * (1 + numRels) * timeoutMs;
            if (ts < 0) {
              ts = 0;
            }
            setTimeout(() => {
              this.mapAstroDatabankRecord(rec, rows, userID, timeoutMs * 0.9);
            }, ts);
          }
        }
      }
    }
    return res.send(Object.fromEntries(result.entries()));
  }

  @Get('migrate-rodden/:start?/:limit?')
  async migrateRoddenScale(
    @Res() res,
    @Param('start') start,
    @Param('limit') limit,
  ) {
    const startInt = smartCastInt(start, 0);
    const limitInt = smartCastInt(limit, 1000);
    const data = await this.astrologicService.migrateRodden(startInt, limitInt);

    return res.json(data);
  }

  @Get('build-charts/:start?/:limit?')
  async bulkBuildCharts(
    @Res() res,
    @Param('start') start,
    @Param('limit') limit,
  ) {
    const startInt = smartCastInt(start, 0);
    const limitInt = smartCastInt(limit, 10);
    const users = await this.userService.findWithoutCharts(startInt, limitInt);
    let delay = 500;
    for (const user of users) {
      setTimeout(async () => {
        const { lat, lng, alt } = user.geo;
        const inData = {
          user: user._id,
          datetime: user.dob.toISOString(),
          lat,
          lng,
          alt,
          isDefaultBirthChart: true,
          name: user.nickName,
          type: 'person',
          gender: user.gender,
          eventType: 'birth',
          roddenValue: 200,
        } as ChartInputDTO;
        const c = await this.saveChartData(inData);
      }, delay);
      delay += 2000;
    }
    return res.json({ users });
  }

  @Get('paired-duplicates/:start?/:limit?/:remove?')
  async listPairedDuplicates(
    @Res() res,
    @Param('start') start,
    @Param('limit') limit,
    @Param('remove') remove,
  ) {
    const startInt = smartCastInt(start, 0);
    const limitInt = smartCastInt(limit, 10);
    const removeItems = remove === 'remove';
    const keys: string[] = [];
    const items = await this.astrologicService.pairedDuplicates(
      startInt,
      limitInt,
    );
    const rows = items.map(row => {
      const hasDobs = row.d1 instanceof Date && row.d2 instanceof Date;
      const dtStr = hasDobs
        ? [
            row.d1
              .toISOString()
              .split('T')
              .shift(),
            row.d2
              .toISOString()
              .split('T')
              .shift(),
          ].join('--')
        : 'dt';
      const refKey = [sanitize(row.s1, '-'), sanitize(row.s2, '-'), dtStr].join(
        '__',
      );
      const index = keys.indexOf(refKey);
      const duplicate = index >= 0;
      if (!duplicate) {
        keys.push(refKey);
      }
      return { ...row, refKey, hasDobs, duplicate };
    });
    if (removeItems) {
      for (const row of rows) {
        if (row.duplicate) {
          await this.astrologicService.deletePaired(row._id);
          const otherHasC1 =
            rows.filter(r => r.duplicate === false && r.c1 === row.c1).length >
            0;
          if (!otherHasC1) {
            await this.astrologicService.deleteChart(row.c1);
          }
          const otherHasC2 =
            rows.filter(r => r.duplicate === false && r.c2 === row.c2).length >
            0;
          if (!otherHasC2) {
            await this.astrologicService.deleteChart(row.c2);
          }
        }
      }
    }
    const numDuplicates = rows.filter(item => item.duplicate).length;
    return res.json({ num: items.length, numDuplicates, items: rows });
  }

  @Get('single-duplicates/:start?/:limit?/:remove?')
  async listSingleDuplicates(
    @Res() res,
    @Param('start') start,
    @Param('limit') limit,
    @Param('remove') remove,
  ) {
    const startInt = smartCastInt(start, 0);
    const limitInt = smartCastInt(limit, 10);
    const removeItems = remove === 'remove';
    const keys: string[] = [];
    const items = await this.astrologicService.singleDuplicates(
      startInt,
      limitInt,
    );
    const drows: SingleCore[] = items.map(row => {
      const hasDobs = row.dt instanceof Date;
      const dtStr = hasDobs
        ? row.dt
            .toISOString()
            .split('T')
            .shift()
        : 'dt';
      const refKey = [sanitize(row.name, '-'), dtStr].join('__');
      const index = keys.indexOf(refKey);
      const duplicate = index >= 0;
      if (!duplicate) {
        keys.push(refKey);
      }
      return { ...row, refKey, duplicate };
    });

    const rows: SingleCore[] = [];
    for (const row of drows) {
      const refRow = row.duplicate
        ? drows.find(r => r.refKey === row.refKey && !r.duplicate)
        : null;
      const mainId =
        row.duplicate && refRow instanceof Object ? refRow._id : '';
      const paired = await this.astrologicService.matchPairedIdsByChartId(
        row._id,
      );
      rows.push({ ...row, mainId, paired });
    }

    if (removeItems) {
      for (const row of rows) {
        if (row.duplicate) {
          if (row.paired.length > 0) {
            for (const pc of row.paired) {
              await this.astrologicService.updatePairedChartIds(
                pc.id,
                row.mainId,
                pc.refNum,
              );
            }
          }
          await this.astrologicService.deleteChart(row._id);
        }
      }
    }
    const filteredRows = rows.filter(item => item.duplicate);
    const numDuplicates = filteredRows.length;
    const numWithPaired = filteredRows.filter(row => row.paired.length > 0)
      .length;
    return res.json({
      num: items.length,
      numDuplicates,
      numWithPaired,
      items: filteredRows,
    });
  }

  @Get('paired-flat/:start?/:limit?')
  async pairedFlatList(
    @Res() res,
    @Param('start') start,
    @Param('limit') limit,
  ) {
    const startInt = smartCastInt(start, 0);
    const limitInt = smartCastInt(limit, 1000);
    const items = await this.astrologicService.getCorePairedFields(
      startInt,
      limitInt,
    );
    const simplifyCoreFields = row => {
      if (row instanceof Object) {
        const {
          _id,
          c1,
          p1,
          p1Dob,
          p1Lat,
          p1Lng,
          c2,
          p2,
          p2Dob,
          p2Lat,
          p2Lng,
          relType,
          tags,
        } = row;
        return {
          _id,
          c1,
          p1,
          p1Dob,
          p1Lat,
          p1Lng,
          c2,
          p2,
          p2Dob,
          p2Lat,
          p2Lng,
          relType,
          tags: tags.join(', '),
        };
      } else {
        return {};
      }
    };
    return res.json(items.map(simplifyCoreFields));
  }
}
