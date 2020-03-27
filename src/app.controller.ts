import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  welcome(@Res() res): string {
    const welcomeData = {
      valid: true,
      msg: 'Welcome to Finding you API',
    };
    return res.status(HttpStatus.OK).json(welcomeData);
  }
}
