import {
  Controller,
  Get,
  Res,
  HttpStatus,
  Post,
  Body,
  Put,
  Delete,
  Param,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDTO } from './dto/create-message.dto';
import { isValidObjectId } from 'mongoose';
import { notEmptyString } from '../lib/validators';

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

  @Put('/edit/:msgRef')
  async edit(
    @Res() res,
    @Param('msgRef') msgRef,
    @Body() createMessageDTO: CreateMessageDTO,
  ) {
    const hasRef = notEmptyString(msgRef, 3);
    const useID = hasRef && isValidObjectId(msgRef);
    const useKey = hasRef && /^[a-z0-9]+[a-z0-9_]+[a-z0-9]+$/.test(msgRef);
    const hasValidRef = useID || useKey;
    let message = null;
    if (hasValidRef) {
      if (useID) {
        message = await this.messageService.updateMessage(
          msgRef,
          createMessageDTO,
        );
      } else {
        message = await this.messageService.updateByKey(
          msgRef,
          createMessageDTO,
        );
      }
    }
    const msg =
      message instanceof Object
        ? 'Message has been updated successfully'
        : 'Message not found';
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
    const status =
      message instanceof Object ? HttpStatus.OK : HttpStatus.NOT_FOUND;
    return res.status(status).json(message);
  }

  // Fetch a particular Message by key
  @Get('/item/:key')
  async getByKey(@Res() res, @Param('key') key) {
    const message = await this.messageService.getByKey(key);
    const status =
      message instanceof Object ? HttpStatus.OK : HttpStatus.NOT_FOUND;
    return res.status(status).json(message);
  }
}
