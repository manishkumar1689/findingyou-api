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
  Param,
} from '@nestjs/common';
import { Request } from 'express';
import { FeedbackService } from './feedback.service';
import { UserService } from 'src/user/user.service';
import { SettingService } from 'src/setting/setting.service';
import { CreateFlagDTO } from './dto/create-flag.dto';

@Controller('feedback')
export class FeedbackController {
  constructor(
    private feedbackService: FeedbackService,
    private userService: UserService,
    private settingService: SettingService,
  ) {}

  @Get('list-by-target/:user?/:key?')
  async getTargetUsersByCriteria(
    @Res() res,
    @Param('user') user,
    @Param('key') key,
    @Req() request: Request,
  ) {
    const { query } = request;
    const data = await this.feedbackService.getByTargetUserOrKey(
      user,
      key,
      query,
    );
    return res.json(data);
  }

  @Get('member-set/:user/:uid')
  async getMemberRatingsAndFlags(
    @Res() res,
    @Param('user') user,
    @Param('uid') uid,
  ) {
    const data = await this.feedbackService.getMemberSet(user, uid);
    return res.json(data);
  }

  @Post('save-flag')
  async saveFlag(@Res() res, @Body() createFlagDTO: CreateFlagDTO) {
    const data = await this.feedbackService.saveFlag(createFlagDTO);
    return res.json(data);
  }

  @Get('deactivate/:user?/?')
  async getUsersByCriteria(
    @Res() res,
    @Param('user') user,
    @Param('key') key,
    @Req() request: Request,
  ) {
    const { query } = request;
    const data = await this.feedbackService.getByTargetUserOrKey(
      user,
      key,
      query,
    );
    return res.json(data);
  }
}
