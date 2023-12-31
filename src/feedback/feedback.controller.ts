import {
  Controller,
  Get,
  Res,
  Req,
  HttpStatus,
  Post,
  Body,
  Query,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { Request } from 'express';
import { FeedbackService } from './feedback.service';
import { UserService } from '../user/user.service';
import { SettingService } from '../setting/setting.service';
import { CreateFlagDTO } from './dto/create-flag.dto';
import { pushMessage, sendNotificationMessage } from '../lib/notifications';
import { isNumeric, notEmptyString } from '../lib/validators';
import { SwipeDTO } from './dto/swipe.dto';
import { sanitize, smartCastInt } from '../lib/converters';
import { objectToMap } from '../lib/entities';
import { isValidObjectId } from 'mongoose';
import { fromBase64 } from '../lib/hash';
import { SnippetService } from '../snippet/snippet.service';
import { buildFullPath, matchFile, matchMimeFromExtension } from '../lib/files';
import { UserPairDTO } from './dto/user-pair.dto';
import { CreateFeedbackDTO } from './dto/create-feedback.dto';

@Controller('feedback')
export class FeedbackController {
  constructor(
    private feedbackService: FeedbackService,
    private userService: UserService,
    private settingService: SettingService,
    private snippetService: SnippetService,
  ) {}

  @Get('list/:start?/:limit?')
  async listAll(
    @Res() res,
    @Param('start') start,
    @Param('limit') limit,
    @Req() request: Request,
  ) {
    const { query } = request;

    const startInt = isNumeric(start) ? smartCastInt(start, 0) : 0;
    const limitInt = isNumeric(limit) ? smartCastInt(limit, 100) : 100;

    const data = await this.feedbackService.listAll(startInt, limitInt, query);
    const total = await this.feedbackService.countAll(query);
    const items = await this.userService.mergeTargetUsersWithFeedbackItems(
      data,
    );
    const num = items.length;
    const valid = num > 0;
    const types = await this.feedbackService.getFeedbackTypes();

    return res.json({
      valid,
      types,
      start: startInt,
      perPage: limitInt,
      num,
      total,
      items,
    });
  }

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

  @Get('reported/:start?/:limit?')
  async listReported(
    @Res() res,
    @Param('start') start,
    @Param('limit') limit,
    @Query() query,
  ) {
    const startInt = smartCastInt(start, 0);
    const limitIntVal = smartCastInt(limit, 100);
    const limitInt = limitIntVal > 0 ? limitIntVal : 100;
    const paramKeys = query instanceof Object ? Object.keys(query) : [];
    const searchStr =
      paramKeys.includes('search') && notEmptyString(query.search, 1)
        ? decodeURIComponent(query.search)
        : '';
    const reasonStr =
      paramKeys.includes('reason') && notEmptyString(query.reason, 1)
        ? decodeURIComponent(query.reason)
        : '';
    const sortKey =
      paramKeys.includes('sort') && notEmptyString(query.sort, 2)
        ? query.sort
        : 'modified';
    const items = await this.userService.getReportedUsers(
      startInt,
      limitInt,
      searchStr,
      reasonStr,
      sortKey,
    );
    const total = await this.userService.totalReportedUsers(
      searchStr,
      reasonStr,
    );
    const valid = total > 0;
    const num = items.length;
    return res.json({
      valid,
      num,
      total,
      items,
    });
  }

  @Get('flags-by-user/:user?')
  async getAllFlagsByUser(@Res() res, @Param('user') user) {
    const data = await this.feedbackService.getAllUserInteractions(user);
    return res.json(data);
  }

  @Get('report-reasons')
  async reportReasons(@Res() res) {
    const data = await this.feedbackService.reportReasonSet();
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

  @Post('report')
  async saveMessage(@Res() res, @Body() createFeedbackDTO: CreateFeedbackDTO) {
    const payload = { ...createFeedbackDTO, key: 'message' };
    const data = await this.feedbackService.saveFeedback(payload);
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
    const isValidValue = (value = null, type = '') => {
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
    };
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

  @Get('send-chat-request/:from/:to/:msg?')
  async sendChatRequest(
    @Res() res,
    @Param('from') from: string,
    @Param('to') to: string,
    @Param('msg') msg: string,
  ) {
    const key = 'chat_request';
    const data: any = { valid: false, fcm: null };
    if (isValidObjectId(from) && isValidObjectId(to)) {
      const infoFrom = await this.userService.getBasicById(from);
      if (
        infoFrom instanceof Object &&
        Object.keys(infoFrom).includes('nickName')
      ) {
        const title = infoFrom.nickName;
        const text = notEmptyString(msg, 2)
          ? fromBase64(msg)
          : 'New chat message';
        const createFlagDTO = {
          user: from,
          targetUser: to,
          key,
          type: 'title_text',
          value: {
            title,
            text,
          },
        } as CreateFlagDTO;
        data.fcm = await this.sendNotification(createFlagDTO);
        if (data.fcm instanceof Object && data.fcm.valid) {
          data.valid = true;
        }
      }
    }
    return res.json(data);
  }

  @Post('block')
  async blockUser(@Res() res, @Body() userPair: UserPairDTO) {
    const { from, to } = userPair;
    let status = HttpStatus.NOT_ACCEPTABLE;
    let result: any = { valid: false };
    if (isValidObjectId(from) && isValidObjectId(to)) {
      result = await this.feedbackService.blockOtherUser(from, to);
      if (result.valid) {
        status = HttpStatus.OK;
      } else {
        status = HttpStatus.NOT_FOUND;
      }
    }
    return res.status(status).json(result);
  }

  // remove block
  @Delete('unblock/:fromId/:toId')
  async unBlockUser(@Res() res, @Param('fromId') fromId, @Param('toId') toId) {
    const result = await this.feedbackService.unblockOtherUser(fromId, toId);
    const status = result.valid ? HttpStatus.OK : HttpStatus.NOT_ACCEPTABLE;
    return res.status(status).json(result);
  }

  async sendNotification(
    createFlagDTO: CreateFlagDTO,
    customTitle = '',
    customBody = '',
    notificationKey = '',
    nickName = '',
    profileImg = '',
  ) {
    const { user, targetUser } = createFlagDTO;
    const blockStatus = await this.feedbackService.isBlocked(user, targetUser);
    const reason = blockStatus.blocked
      ? 'Interaction blocked'
      : 'missing device token(s)';
    const targetDeviceTokens = blockStatus.blocked
      ? []
      : await this.userService.getUserDeviceTokens(targetUser);
    const fcm = {
      valid: false,
      reason,
      results: [],
    };

    for (const token of targetDeviceTokens) {
      const result = await sendNotificationMessage(
        token,
        createFlagDTO,
        customTitle,
        customBody,
        notificationKey,
        nickName,
        profileImg,
      );
      if (result instanceof Object && result.valid) {
        fcm.valid = true;
        fcm.reason = 'success';
        fcm.results.push(result);
      }
    }
    return fcm;
  }

  @Get('test-fcm')
  async testFCM(@Res() res, @Query() query) {
    const params = objectToMap(query);
    const targetDeviceToken = params.has('targetDeviceToken')
      ? params.get('targetDeviceToken')
      : '';
    const title = params.has('title') ? params.get('title') : '';
    const body = params.has('body') ? params.get('body') : '';
    const fcm = await pushMessage(targetDeviceToken, title, body);
    return res.json(fcm);
  }

  // Fetch a particular user using ID
  @Post('swipe')
  async saveSwipe(@Res() res, @Body() swipeDTO: SwipeDTO) {
    const { to, from, value, context } = swipeDTO;
    const minRatingValue = await this.settingService.minPassValue();
    const contextKey = notEmptyString(context)
      ? sanitize(context, '_')
      : 'swipe';
    const prevSwipe = await this.feedbackService.prevSwipe(from, to);
    const recipSwipe = await this.feedbackService.prevSwipe(to, from);
    let intValue = smartCastInt(value, 0);

    const {
      roles,
      likeStartTs,
      superlikeStartTs,
    } = await this.userService.memberRolesAndLikeStart(from);
    const nowTs = new Date().getTime();
    const currStartTs =
      intValue === 1 ? likeStartTs : intValue > 1 ? superlikeStartTs : 0;
    let numSwipes = await this.feedbackService.countRecentLikeability(
      from,
      intValue,
      currStartTs,
    );
    // fetch the max limit for this swipe action associated with a user's current roles
    let maxRating = await this.settingService.getMaxRatingLimit(
      roles,
      intValue,
    );

    // the like Start timestamp is in the future and the action is like
    // set the limit to zero
    if (currStartTs > nowTs && intValue > 0) {
      maxRating = -1;
    }
    const hasPaidRole = roles.some(rk => rk.includes('member'));
    const data: any = { valid: false, updated: false, value: intValue };
    const hasPrevPass = prevSwipe.valid && prevSwipe.value < 1;
    const isPass = intValue <= 0;
    // for free members set pass value to 0 if the other has liked them
    /* if (isPass && !hasPaidRole && recipSwipe.value > 0) {
      intValue = 0;
      isPass = false;
    } */
    const prevPass = isPass && hasPrevPass ? prevSwipe.value : 0;
    if (contextKey.includes('like') === false && intValue < 1 && isPass) {
      const isHardPass = intValue <= minRatingValue;
      if (isHardPass) {
        intValue = minRatingValue;
      } else if (hasPrevPass) {
        intValue = prevSwipe.value - 1;
      }
    }
    data.remaining = maxRating > 0 ? maxRating - numSwipes : 0;
    data.nextStartTs = currStartTs;
    data.secondsToWait =
      maxRating < 1 ? Math.ceil((currStartTs - nowTs - 50) / 1000) : 0;
    data.roles = roles;

    // skip maxRating check only if value is zero. If likes are used up, the value will be -1
    if (
      (numSwipes < maxRating || maxRating === 0) &&
      prevPass > minRatingValue
    ) {
      const flagData = {
        user: from,
        targetUser: to,
        key: 'likeability',
        type: 'int',
        isRating: true,
        value: intValue,
      } as CreateFlagDTO;
      const flag = await this.feedbackService.saveFlag(flagData);
      const valid = Object.keys(flag).includes('value');
      const sendMsg = intValue >= 1;
      let fcm = {};
      if (sendMsg) {
        const {
          lang,
          pushNotifications,
        } = await this.userService.getPreferredLangAndPnOptions(
          flagData.targetUser,
        );
        const pnKey =
          recipSwipe.value > 0
            ? 'been_matched'
            : intValue > 1
            ? 'been_superliked'
            : 'been_liked';
        const maySend = pushNotifications.includes(pnKey);
        if (maySend) {
          const nickName = await this.userService.getNickName(flagData.user);

          const {
            title,
            body,
          } = await this.snippetService.buildRatingTitleBody(
            nickName,
            intValue,
            recipSwipe.value,
            lang,
          );
          fcm = await this.sendNotification(flagData, title, body);
        }
      }
      data.valid = valid;
      data.flag = flag;
      data.fcm = fcm;
      data.prevSwipe = prevSwipe;
      if (valid && prevSwipe.value !== intValue) {
        numSwipes++;
        data.remaining--;
        data.updated = true;
      }
      data.count = numSwipes;
    }
    if (
      intValue > 0 &&
      !hasPaidRole &&
      data.remaining < 1 &&
      data.secondsToWait < 1
    ) {
      const hrsReset = await this.settingService.getFreeMemberLikeResetHours();
      const nextTs = await this.userService.updateLikeStartTs(
        from,
        hrsReset,
        intValue,
      );
      if (nextTs > 0) {
        data.nextStartTs = nextTs;
        data.secondsToWait = Math.ceil((nextTs - nowTs - 50) / 1000);
      }
    }
    return res.status(HttpStatus.OK).json({ ...data, recipSwipe, hasPaidRole });
  }

  @Delete('delete-flag/:key/:user/:user2/:mutual?')
  async deleteFlag(
    @Res() res,
    @Param('key') key,
    @Param('user') user,
    @Param('user2') user2,
    @Param('mutual') mutual,
  ) {
    const isMutual = smartCastInt(mutual, 0) > 0;
    const { result, result2 } = await this.feedbackService.deleteFlag(
      key,
      user,
      user2,
      isMutual,
    );
    const deleted = [];
    let delValue: any = null;
    let delValueRecip: any = null;
    if (result instanceof Object) {
      delValue = result.value;
      deleted.push('from');
    }
    if (result2 instanceof Object) {
      delValueRecip = result.value;
      deleted.push('to');
    }
    return res.json({
      user,
      user2,
      isMutual,
      key,
      deleted,
      delValue,
      delValueRecip,
    });
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

  @Get('view-file/:filename/:userID')
  async showImageFile(
    @Res() res,
    @Param('filename') filename,
    @Param('userID') userID,
  ) {
    const isAdmin = await this.userService.isAdminUser(userID);
    let fp = buildFullPath('no-image.png', 'files');
    let mime = 'image/png';
    if (isAdmin && notEmptyString(filename, 8)) {
      const fileData = matchFile(filename);
      if (fileData.size > 64 && filename.includes('.')) {
        fp = fileData.path;
        const ext = filename
          .split('.')
          .pop()
          .toLowerCase();
        mime = matchMimeFromExtension(ext);
        res.setHeader('Content-Type', mime);
      }
    }
    return res.sendFile(fp);
  }
}
