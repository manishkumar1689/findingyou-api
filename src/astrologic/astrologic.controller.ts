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
import { calcAllTransitions } from './lib/core';
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

/*
app.get("/api/ephe-files", async (req, res) => {
  const data = await readEpheFiles();
  res.send(data);
});
*/

  @Get('ephe-files')
  async transitions(@Res() res) {
    const data = await readEpheFiles();
    return res.status(HttpStatus.BAD_REQUEST).json(data);
  }

}
