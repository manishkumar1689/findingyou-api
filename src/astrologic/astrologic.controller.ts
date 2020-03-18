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
import { validISODateString, notEmptyString } from './lib/validators';
import { locStringToGeo } from './lib/converters';
import { calcAllTransitions, fetchHouseData } from './lib/core';
import { readEpheFiles } from './lib/files';

@Controller('astrologic')
export class AstrologicController {

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



  @Get('ephe-files')
  async ephemerisFiles(@Res() res) {
    const data = await readEpheFiles();
    return res.status(HttpStatus.OK).json(data);
  }

///houses/65.2727,-13.2626/1965-08-13T18:12:34/W
 @Get('houses/:loc/:dt/:system')
  async housesByDateGeo(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
    @Param('system') system,    
    ) {
    let data:any = { valid: false };
    if (notEmptyString(dt, 6) && notEmptyString(loc, 3) && notEmptyString(system)) {
      const geo = locStringToGeo(loc);
      data = await fetchHouseData(dt, geo, system);
    }
    return res.status(HttpStatus.OK).json(data);
  }

}
