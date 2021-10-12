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
import { mapLikeability, pushFlag } from '../lib/notifications';
import { notEmptyString } from '../lib/validators';
import { SwipeDTO } from './dto/swipe.dto';
import { sanitize, smartCastInt } from '../lib/converters';
import { Model } from 'mongoose';

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
      data.fcm = this.sendNotification(createFlagDTO);
    }
    return res.json(data);
  }

  async sendNotification(createFlagDTO: CreateFlagDTO) {
    const targetDeviceToken = await this.userService.getUserDeviceToken(createFlagDTO.targetUser);
    let fcm: any = { valid: false, reason: 'missing device token' };
    const {key, type, value, user, targetUser} = createFlagDTO;
    if (notEmptyString(targetDeviceToken, 5)) {
      fcm = await pushFlag(targetDeviceToken, {
        key,
        type,
        value,
        user,
        targetUser,
      });
    }
    return fcm;
  }

  // Fetch a particular user using ID
  @Post('swipe')
  async saveSwipe(@Res() res, @Body() swipeDTO: SwipeDTO) {
    const {to, from, value, context} = swipeDTO;
    const minRatingValue = -3;
    const contextKey = notEmptyString(context)? sanitize(context, '_') : 'swipe';
    const prevSwipe = await this.feedbackService.prevSwipe(from, to);
    const recipSwipe = await this.feedbackService.prevSwipe(to, from);
    let intValue = smartCastInt(value, 0);
    const maxKey = ['swipe', mapLikeability(intValue, true)].join('_');
    const hasLimits = notEmptyString(maxKey);
    let numSwipes = await this.feedbackService.countRecentLikeability(from, value);
    const roles = await this.userService.memberRoles(from);
    const perms = await this .settingService.getPermissions(roles);
    const likePerms = Object.keys(perms).filter(p => p === maxKey);
    const maxRating = hasLimits && likePerms.length > 0? perms[maxKey] : 1;
    const hasPaidRole = roles.some(rk => rk.includes('member'));
    let data: any = {valid: false}
    const hasPrevPass = prevSwipe.valid && prevSwipe.value < 1;
    let isPass = intValue <= 0;
    // for free members set pass value to 0 if the other has liked them
    if (isPass && !hasPaidRole && recipSwipe.value > 0) {
      intValue = 0;
      isPass = false;
    }
    const prevPass = isPass && hasPrevPass ? prevSwipe.value : 0;
    if (contextKey.includes('like') === false && hasPaidRole && intValue < 1 && isPass) {
      const isHardPass = intValue <= minRatingValue;
      if (isHardPass) {
        intValue = minRatingValue;
      } else if (hasPrevPass) {
        intValue = prevSwipe.value - 1;
      } else {
        intValue--;
      }
    }
    if ((numSwipes < maxRating || maxRating < 1) && prevPass > minRatingValue) {
      const flagData = {
        user: from,
        targetUser: to,
        key: 'likeability',
        type: 'int',
        isRating: true,
        value: intValue
      } as CreateFlagDTO;
      const flag = await this.feedbackService.saveFlag(flagData);
      const valid = Object.keys(flag).includes('value');
      data = { 
        valid,
        flag,
        fcm: await this.sendNotification(flagData),
        count: numSwipes,
        roles,
        maxRating,
        prevSwipe
      }
      if (valid) {
        numSwipes++;
      }
    }
    return res.status(HttpStatus.OK).json(data);
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
