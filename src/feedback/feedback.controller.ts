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
import { UserService } from '../user/user.service';
import { SettingService } from '../setting/setting.service';
import { CreateFlagDTO } from './dto/create-flag.dto';
import { pushFlag } from '../lib/notifications';
import { notEmptyString } from '../lib/validators';

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

  @Get('flags-by-user/:user?')
  async getAllFlagsByUser(
    @Res() res,
    @Param('user') user
  ) {
    const data = await this.feedbackService.getAllUserInteractions(
      user
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

  @Post('save-member-flag')
  async saveMemberFlag(@Res() res, @Body() createFlagDTO: CreateFlagDTO) {
    const flags = await this.settingService.getFlags();
    const flag = flags.find(fl => fl.key === createFlagDTO.key);
    const { user, targetUser, key, value } = createFlagDTO;
    let type = 'boolean';
    let isRating = false;
    let data: any = { valid: false };
    const isValidValue = (value = null, type = "") => {
      switch (type) {
        case 'boolean':
        case 'bool':
          return value === true || value === false;
        case 'double':
        case 'bool':
          return typeof value === 'number' && isNaN(value) === false;
        default:
          return false;
      }
    }
    if (flag instanceof Object) {
      type = flag.type;
      isRating = flag.isRating === true;
      const isEmpty = value === null || value === undefined;
      const assignedValue = isEmpty ? flag.defaultValue : value;
      const isValid = isValidValue(assignedValue, type);
      if (isValid) {
        data = await this.feedbackService.saveFlag({
          user,
          targetUser,
          key,
          value: assignedValue,
          type,
          isRating,
        });
        if (data instanceof Object) {
          data.valid = true;
        }
      }
      const targetDeviceToken = await this.userService.getUserDeviceToken(createFlagDTO.targetUser);
      
      if (notEmptyString(targetDeviceToken, 5)) {
        data.fcm = await pushFlag(targetDeviceToken, {
          key,
          type,
          value,
          user,
          targetUser,
        });
      }
    }
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
