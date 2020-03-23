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
  Req,
} from '@nestjs/common';
import { AstrologicService } from './astrologic.service';
import { BodySpeed } from './interfaces/body-speed.interface';
import { BodySpeedDTO } from './dto/body-speed.dto';
import { 
  isNumeric,
  validISODateString,
  notEmptyString,
} from './lib/validators';
import { locStringToGeo } from './lib/converters';
import { 
  calcAllTransitions,
  fetchHouseData,
  calcBodiesInHouses,
  calcVargas,
  calcUpagrahas,
  calcHoras,
  calcPanchanga,
  calcMrityubhaga,
  calcSphutaData,
  fetchAllSettings,
} from './lib/core';
import { 
  calcJulianDate,
  calcJulDate,
} from './lib/date-funcs';
import {
  chartData,
} from './lib/chart';
import { getFuncNames, getConstantVals } from './lib/sweph-test';
import { calcRetroGrade, calcAcceleration } from './lib/astro-motion'
import { 
  toIndianTime,
  calcTransition,
} from './lib/transitions';
import { generateApiRouteMap } from './lib/route-map'; 
import { readEpheFiles } from './lib/files';

@Controller('astrologic')
export class AstrologicController {

  constructor(
    private astrologicService: AstrologicService,
  ) {}

  @Get('juldate/:isodate?')
  async juldate(
    @Res() res,
    @Param('isodate') isodate,
    @Query() query,
  ) {
    const params = validISODateString(isodate) ? { dt: isodate } : query;
    const data = calcJulianDate(params);
    res.send(data);
  }

  @Get('swisseph/constants')
  async listConstants(@Res() res) {
    const constants = getConstantVals();
    const data = {
      constants
    };
    res.send(data);
  }

  @Get('swisseph/functions')
  async showFunctions(
    @Res() res,
    @Param('isodate') isodate,
    @Query() query,
  ) {
    const functions = getFuncNames();
    const data = {
      functions
    };
    res.send(data);
  }

  @Get('swisseph/files')
  async ephemerisFiles(@Res() res) {
    const data = await readEpheFiles();
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('chart/:loc/:dt')
  async chart(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
  ) {
    if (validISODateString(dt) && notEmptyString(loc, 3)) {
      const data = await chartData(dt, loc);
      return res.status(HttpStatus.OK).json(data);
    } else {
      const result = {
        valid: false,
        message: 'Invalid parameters'
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
    let data:any = { valid: false };
    if (isNumeric(planet)) {
      planetNum = parseInt(planet);
      data = await calcTransition(dt, geo, planetNum);
    }
    res.send(data);
  }

  @Get('transitions/:loc/:dt')
  async transitions(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
  ) {
    if (validISODateString(dt) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      const data = await calcAllTransitions(dt, geo);
      return res.status(HttpStatus.OK).json(data);
    } else {
      const result = {
        valid: false,
        message: 'Invalid parameters'
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
    let data:any = { valid: false };
    if (notEmptyString(dt, 6) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      const sysRef = notEmptyString(system) ? system : 'W';
      data = await fetchHouseData(dt, geo, sysRef);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('bodies-in-houses/:loc/:dt/:system?')
  async bodiesInhousesByDateGeo(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
    @Param('system') system,    
    ) {
    let data:any = { valid: false };
    if (notEmptyString(dt, 6) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      const sysRef = notEmptyString(system) ? system : 'W';
      data = await calcBodiesInHouses(dt, geo, sysRef);
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
    let data:any = { valid: false };
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
      data = await calcUpagrahas(dt, geo, showPeriods);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('horas/:loc/:dt')
  async horasByDateGeo(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
    ) {
    let data:any = { valid: false };
    if (notEmptyString(dt, 6) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      data = await calcHoras(dt, geo);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('panchanga/:loc/:dt')
  async panchangaByDateGeo(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
    ) {
    let data:any = { valid: false };
    if (notEmptyString(dt, 6) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      data = await calcPanchanga(dt, geo);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('mrityu/:loc/:dt')
  async mrityubhagaByDateGeo(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
    ) {
    let data:any = { valid: false };
    if (notEmptyString(dt, 6) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      data = await calcMrityubhaga(dt, geo);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('sphutas/:loc/:dt')
  async sphutasByDateGeo(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
    ) {
    let data:any = { valid: false };
    if (notEmptyString(dt, 6) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      data = await calcSphutaData(dt, geo);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('indian-time/:loc/:dt')
  async indianTimeByGeo(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
    ) {
    let data:any = { valid: false };
    if (notEmptyString(dt, 6) && notEmptyString(loc, 3)) {
      const geo = locStringToGeo(loc);
      data = await toIndianTime(dt, geo);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('retrograde/:dt/:planet')
  async retrogradeStations(
    @Res() res,
    @Param('dt') dt,
    @Param('planet') planet,
    ) {
    let data:any = { valid: false };
    if (notEmptyString(dt, 6) && isNumeric(planet)) {
      const num = parseInt(planet);
      data = await calcRetroGrade(dt, num);
    }
    console.log(data)
    //this.AstrologicService.saveBodySpeed(saveData);
    res.send(data);
  }

  @Get('speed-samples/:dt/:planet/:years?')
  async saveRetrogradeSamples(
    @Res() res,
    @Param('dt') dt,
    @Param('planet') planet,
    @Param('years') years,
    ) {
    let data:any = { valid: false };
    let days = isNumeric(years)? parseInt(years) * 366 : 366;
    if (notEmptyString(dt, 6) && isNumeric(planet)) {
      const num = parseInt(planet);
      data = await this.astrologicService.savePlanetStations(num, dt, days);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('speed-patterns/:planet')
  async motionPatternsByPlanet(
    @Res() res,
    @Param('planet') planet,
    ) {
    let data:any = { valid: false, values: [] };
    if (isNumeric(planet)) {
      const num = parseInt(planet);
      data.values = await this.astrologicService.speedPatternsByPlanet(num);
    }
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('settings/:filter?')
  async listSettings(
    @Res() res,
    @Param('filter') filter,
    ) {
    const data = fetchAllSettings(filter);
    return res.status(HttpStatus.OK).json(data);
  }

  @Get('routes')
  async routes(@Res() res) {
    const data = await generateApiRouteMap();
    return res.status(HttpStatus.OK).json(data);
  }

}
