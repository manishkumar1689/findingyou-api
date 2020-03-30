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
} from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDTO } from './dto/create-message.dto';
import { readSentLog, readSentLogCsv } from '../lib/logger';
import { smartCastInt, smartCastString, dateTimeSuffix } from '../lib/utils';

@Controller('Message')
export class MessageController {
  constructor(private messageService: MessageService) {}

  // add a Message
  @Post('/create')
  async addMessage(@Res() res, @Body() createMessageDTO: CreateMessageDTO) {
    const message = await this.messageService.addMessage(createMessageDTO);
    return res.status(HttpStatus.OK).json({
      msg: 'Message has been created successfully',
      message,
    });
  }

  @Put('/edit/:messageID')
  async edit(
    @Res() res,
    @Param('messageID') messageID,
    @Body() createMessageDTO: CreateMessageDTO,
  ) {
    const message = await this.messageService.updateMessage(
      messageID,
      createMessageDTO,
    );
    const msg = message instanceof Object? 'Message has been updated successfully' : 'Message not found';
    return res.status(HttpStatus.OK).json({
      msg,
      message,
    });
  }

  // Retrieve Messages list
  @Get('/list')
  async getAllMessage(@Res() res) {
    const messages = await this.messageService.getAllMessage();
    return res.status(HttpStatus.OK).json(messages);
  }

  // Fetch a particular Message using ID
  @Get('/item/:messageID')
  async get(@Res() res, @Param('messageID') messageID) {
    const message = await this.messageService.getMessage(messageID);
    if (!message) {
      throw new NotFoundException('Message does not exist!');
    }
    return res.status(HttpStatus.OK).json(message);
  }

  @Get('/log/:limit?/:format?')
  async readLog(@Res() res, @Param('limit') limit, @Param('format') format) {
    const limitInt = smartCastInt(limit, 100);
    const returnType = smartCastString(format, 'json');
    if (returnType === 'json') {
      const data = await readSentLog(limit);
      return res.status(HttpStatus.OK).json(data);
    } else {
      const data = await readSentLogCsv(limit);
      const filename = 'mail-log-' + dateTimeSuffix() + '.csv';
      res.setHeader('Content-disposition', 'attachment; filename=' + filename);
      res.set('Content-Type', 'text/csv');
      return res.status(HttpStatus.OK).end(data);
    }
  }

}
