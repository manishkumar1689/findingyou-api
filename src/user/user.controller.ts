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
  NotFoundException,
  Delete,
  Param,
} from '@nestjs/common';
import { UserService } from './user.service';
import { MessageService } from '../message/message.service';
import { CreateUserDTO } from './dto/create-user.dto';
import { LoginDTO } from './dto/login.dto';
import { smartCastInt, validEmail } from '../lib/validators';
import { Request } from 'express';
import { fromBase64, toBase64 } from '../lib/hash';
import { maxResetMinutes } from '../.config';
import * as bcrypt from 'bcrypt';

@Controller('user')
export class UserController {
  constructor(
    private userService: UserService,
    private messageService: MessageService,
  ) {}

  // add a user
  @Post('/create')
  async addUser(@Res() res, @Body() createUserDTO: CreateUserDTO) {
    let msg = 'N/A';
    let userData = {};
    let valid = false;
    const existing = await this.userService.findOneByEmail(
      createUserDTO.identifier,
    );
    if (existing) {
      msg = 'A user with this email address already exists';
    } else {
      if (validEmail(createUserDTO.identifier)) {
        const user = await this.userService.addUser(createUserDTO);
        if (user) {
          msg = 'User has been created successfully';
          userData = extractSimplified(user, ['password']);
          valid = true;
        } else {
          msg = 'Could not create a new user';
        }
      } else {
        msg = 'Please enter a valid email address';
      }
    }
    return res.status(HttpStatus.OK).json({
      message: msg,
      user: userData,
      valid,
    });
  }

  @Put('/edit/:userID')
  async editUser(
    @Res() res,
    @Param('userID') userID,
    @Body() createUserDTO: CreateUserDTO,
  ) {
    const user = await this.userService.updateUser(userID, createUserDTO);
    return res.status(HttpStatus.OK).json({
      message: 'User has been updated successfully',
      user,
    });
  }

  // Retrieve users list
  @Get('list/:start?/:limit?')
  async getUsersByCriteria(
    @Res() res,
    @Param('start') start,
    @Param('limit') limit,
    @Req() request: Request,
  ) {
    start = smartCastInt(start, 0);
    limit = smartCastInt(limit, 100);
    const criteria = request.query;
    let activeOnly = true;
    if (criteria.admin) {
      activeOnly = false;
    }
    const users = await this.userService.getAllUser(
      start,
      limit,
      criteria,
      activeOnly,
    );
    const total = await this.userService.count(criteria, activeOnly);
    return res.status(HttpStatus.OK).json({
      start,
      total,
      perPage: limit,
      num: users.length,
      items: users,
    });
  }

  // Fetch a particular user using ID
  @Get('/item/:userID')
  async getUser(@Res() res, @Param('userID') userID) {
    const user = await this.userService.getUser(userID);
    if (!user) {
      throw new NotFoundException('User does not exist!');
    }
    return res.status(HttpStatus.OK).json(user);
  }

  // Fetch a particular user using ID
  @Post('/login')
  async login(@Res() res, @Body() loginDTO: LoginDTO) {
    const user = await this.userService.findOneByEmail(loginDTO.email, false);
    const userData = new Map<string, any>();
    let valid = false;
    if (!user) {
      userData.set('msg', 'User not found');
      userData.set('key', 'not-found');
    } else {
      valid = user.active;
      if (!valid) {
        userData.set('msg', 'Inactive account');
        userData.set('key', 'inactive');
      }
      if (user.password) {
        if (valid) {
          valid = bcrypt.compareSync(loginDTO.password, user.password);

          if (!valid) {
            userData.set('msg', 'Invalid password');
          }
        }
      } else {
        valid = false;
        userData.set('msg', 'Invalid password');
      }
      if (valid) {
        extractObjectAndMerge(user, userData, ['password', 'status', 'token']);
        const userID = extractDocId(user);
        const loginDt = await this.userService.registerLogin(userID);
        userData.set('login', loginDt);
        const submission = await this.submissionService.getSubmissionByUser(
          userID,
        );
        const fileData = matchGeneratedPdfPath(guidToUniqueSeq(userID));
        let downloadPath = '';
        let downloadModifed = null;
        if (fileData.path.length > 5) {
          downloadPath = fileData.path;
          downloadModifed = fileData.modified;
        }
        if (submission) {
          userData.set('submission', mapSubmission(submission));
          userData.set('pdfPath', downloadPath);
          userData.set('pdfModified', downloadModifed);
        }
      }
    }
    userData.set('valid', valid);
    return res.status(HttpStatus.OK).json(hashMapToObject(userData));
  }

  async matchUserByHash(hash: string) {
    const idStr = fromBase64(hash);
    let user = null;
    let matched = false;
    if (idStr.includes('__')) {
      const [userID, tsStr] = idStr.split('__');
      const ts = Math.floor(parseFloat(tsStr));
      const currTs = new Date().getTime();
      const tsAgo = currTs - ts;
      const maxTs = maxResetMinutes * 60 * 1000;
      if (tsAgo <= maxTs) {
        user = await this.userService.findOneByToken(tsStr);
        if (user) {
          const matchedUserId = extractDocId(user);
          matched = matchedUserId === userID;
        }
      }
    }
    return { user, matched };
  }

  @Get('/reset/:hash')
  async resetMatch(@Res() res, @Param('hash') hash) {
    const { user, matched } = await this.matchUserByHash(hash);
    const userData = new Map<string, any>();
    let valid = false;
    if (!user) {
      userData.set('msg', 'User not found');
      userData.set('key', 'not-found');
    } else {
      if (matched) {
        valid = user.active;
        if (!valid) {
          userData.set('msg', 'Inactive account');
          userData.set('key', 'inactive');
        }
      }
      if (valid) {
        extractObjectAndMerge(user, userData, ['password', 'status']);
      }
    }
    userData.set('valid', valid);
    return res.status(HttpStatus.OK).json(hashMapToObject(userData));
  }

  @Put('/reset-pass/:hash')
  async resetPassword(
    @Res() res,
    @Param('hash') hash,
    @Body() loginDTO: LoginDTO,
  ) {
    let { user, matched } = await this.matchUserByHash(hash);
    const userData = new Map<string, any>();
    let valid = false;
    if (!user) {
      userData.set('msg', 'User not found');
      userData.set('key', 'not-found');
    } else {
      if (matched) {
        valid = user.active;
        if (!valid) {
          userData.set('msg', 'Inactive account');
          userData.set('key', 'inactive');
        } else {
          const password = loginDTO.password;
          if (password.length > 7) {
            const userID = extractDocId(user);
            const updatedUser = await this.userService.updatePassword(
              userID,
              password,
            );
            if (updatedUser) {
              user = updatedUser;
            }
          }
        }
      }
      if (valid) {
        extractObjectAndMerge(user, userData, ['password', 'status']);
      }
    }
    userData.set('valid', valid);
    return res.status(HttpStatus.OK).json(hashMapToObject(userData));
  }

  async triggerResetRequest(userID: string, @Res() res) {
    const user = await this.userService.requestReset(userID, 'forgotten');
    const data = new Map<string, any>();
    data.set('valid', false);
    if (user) {
      if (user.token) {
        const resetLink = '/#reset/' + toBase64(userID + '__' + user.token);
        data.set('token', user.token);
        data.set('reset', true);
        data.set('link', resetLink);
        data.set('valid', true);
        const userName = [user.firstName, user.lastName].join(' ');
        this.messageService.resetMail(user.identifier, userName, resetLink);
      }
    }
    return res.status(HttpStatus.OK).json(hashMapToObject(data));
  }

  @Put('/reset/:userID')
  async reset(@Res() res, @Param('userID') userID) {
    return this.triggerResetRequest(userID, res);
  }

  @Post('/reset-request')
  async resetRequest(@Res() res, @Body() loginDTO: LoginDTO) {
    const user = await this.userService.findOneByEmail(loginDTO.email);
    let userID = '';
    if (user) {
      userID = extractDocId(user);
    }
    if (userID.length > 3) {
      return this.triggerResetRequest(userID, res);
    } else {
      return res
        .status(HttpStatus.OK)
        .json({ valid: false, message: 'Not found' });
    }
  }

  @Put('/status/:userID/:status')
  async updateStatus(
    @Res() res,
    @Param('userID') userID,
    @Param('status') status,
  ) {
    const user = await this.userService.updateStatus(userID, status);
    let userData = {};
    let message = '';
    if (user) {
      userData = extractSimplified(user, ['password', 'status']);
      message = "User's status has been updated successfully";
    } else {
      message = "User's status has not been updated";
    }
    return res.status(HttpStatus.OK).json({
      message,
      user: userData,
    });
  }
}
