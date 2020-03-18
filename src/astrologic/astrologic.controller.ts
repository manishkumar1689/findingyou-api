import { Controller } from '@nestjs/common';
import { validISODateString, notEmptyString } from './lib/validators';
import { calcAllTransitions } from './lib/core';

@Controller('astrologic')
export class AstrologicController {

/*
app.get("/api/transitions/:loc/:dt", async (req, res) => {
  const { dt, loc } = req.params;
  const geo = locStringToGeo(loc);
  let data = { valid: false };
  if (validISODateString(dt)) {
    data = await calcAllTransitions(dt, geo);
  }
  res.send(data);
});
*/

  @Get('transitions/:loc/:dt')
  async transitions(
    @Res() res,
    @Param('loc') loc,
    @Param('dt') dt,
  ) {
    if (validISODateString(dt) && notEmptyString(geo, 3)) {
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

}
