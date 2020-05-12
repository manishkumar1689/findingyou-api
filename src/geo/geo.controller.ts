import {
  Controller,
  Get,
  Res,
  HttpStatus,
  Post,
  Put,
  Query,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { GeoService } from './geo.service';
import { isNumeric } from '../lib/validators';

@Controller('geo')
export class GeoController {
  constructor(private geoService: GeoService) {}

  @Get('by-coords/:loc')
  async byCoordinate(@Res() res, @Param('loc') loc) {
    let data: any = { valid: false };
    const coords = loc
      .split(',')
      .filter(isNumeric)
      .map(parseFloat);

    if (coords.length > 1) {
      const [lat, lng] = coords;
      data = await this.geoService.fetchGeoData(lat, lng);
    }
    return res.send(data);
  }

  @Get('geo-tz/:dt/:loc')
  async geoTzByCoordsDatetime(@Res() res, @Param('loc') loc, @Param('dt') dt) {
    let data: any = { valid: false };
    const coords = loc
      .split(',')
      .filter(isNumeric)
      .map(parseFloat);

    if (coords.length > 1) {
      const [lat, lng] = coords;
      data = await this.geoService.fetchGeoAndTimezone(lat, lng, dt);
    }
    return res.send(data);
  }

  @Get('by-coords-date/:dt/:loc')
  async byCoordsDatetime(@Res() res, @Param('loc') loc, @Param('dt') dt) {
    let data: any = { valid: false };
    const coords = loc
      .split(',')
      .filter(isNumeric)
      .map(parseFloat);

    if (coords.length > 1) {
      const [lat, lng] = coords;
      data = await this.geoService.fetchTimezoneOffset([lat, lng], dt);
    }
    return res.send(data);
  }

  @Get('placename/:search')
  async byPlacename(@Res() res, @Param('search') search) {
    const data = { valid: false, items: [] };
    if (search.length > 1) {
      const items = await this.geoService.searchByPlaceName(search);
      if (items instanceof Array) {
        data.items = items;
        data.valid = true;
      }
    }
    return res.send(data);
  }

  @Get('address/:search')
  async byFuzzyAddress(@Res() res, @Param('search') search) {
    const data = { valid: false, items: [] };
    if (search.length > 1) {
      const result = await this.geoService.searchByFuzzyAddress(search);
      if (result.items instanceof Array) {
        data.items = result.items;
        data.valid = true;
      }
    }
    return res.send(data);
  }
}
