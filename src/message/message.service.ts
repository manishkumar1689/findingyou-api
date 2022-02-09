import { Injectable, HttpService } from '@nestjs/common';
import { Model } from 'mongoose';
import * as htmlToText from 'html-to-text';
import { InjectModel } from '@nestjs/mongoose';
import { Message } from './interfaces/message.interface';
import { CreateMessageDTO } from './dto/create-message.dto';
import { isNumeric } from '../lib/validators';
import { mailDetails, mailService, webBaseUrl } from '../.config';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel('Message') private readonly messageModel: Model<Message>,
    private http: HttpService,
  ) {}
  // fetch all Messages
  async getAllMessage(): Promise<Message[]> {
    const Messages = await this.messageModel.find().exec();
    return Messages;
  }
  // fetch all snippets with core fields only
  async getAll(): Promise<Message[]> {
    const Messages = await this.messageModel
      .find()
      .select({ key: 1, value: 1, format: 1, _id: 0 })
      .exec();
    return Messages;
  }
  // Get a single Message
  async getMessage(snippetID = ''): Promise<Message> {
    const snippet = await this.messageModel.findById(snippetID).exec();
    return snippet;
  }

  async getByKey(key = ''): Promise<Message> {
    const snippet = await this.messageModel.findOne({ key }).exec();
    return snippet;
  }
  // post a single Message
  async addMessage(createMessageDTO: CreateMessageDTO): Promise<Message> {
    const newMessage = new this.messageModel(createMessageDTO);
    return newMessage.save();
  }
  // Edit Message details
  async updateMessage(
    messageID = '',
    createMessageDTO: CreateMessageDTO,
  ): Promise<Message> {
    const updatedMessage = await this.messageModel.findByIdAndUpdate(
      messageID,
      createMessageDTO,
      { new: true },
    );
    return updatedMessage;
  }

  // Edit Message details
  async updateByKey(
    key = '',
    createMessageDTO: CreateMessageDTO,
  ): Promise<Message> {
    const updatedMessage = await this.messageModel.findOneAndUpdate(
      { key },
      createMessageDTO,
      { new: true },
    );
    return updatedMessage;
  }

  async resetMail(email: string, toName: string, link = ''): Promise<void> {
    const message = await this.getByKey('password_reset');
    const mode = isNumeric(link) ? 'number' : 'web';
    const sendParams = this.transformMailParams(
      message,
      email,
      toName,
      link,
      mode,
    );
    this.sendMail(sendParams, 'password_reset');
  }

  public sendMail(sendParams, key = '') {
    switch (mailService.provider) {
      case 'google/appengine':
        this.http.post(mailService.uri, sendParams);
        break;
    }
  }

  public transformMailParams(
    message: Message,
    email: string,
    toName: string,
    resetLink = '',
    mode = 'web',
  ) {
    const params = {
      to: email,
      from: mailDetails.fromAddress,
      subject: '',
      html: '',
      text: '',
      toName,
      fromName: message.fromName,
      // plain: '',
    };
    if (message) {
      params.from = message.fromMail;
      params.subject = message.subject;

      let body = message.body
        .replace('%full_name', toName)
        .replace('%email', email);
      if (resetLink) {
        const fullLink = webBaseUrl + resetLink;
        if (mode === 'web') {
          body = body.replace('%reset_link', fullLink);
        } else {
          body = body.replace('%reset_link', resetLink);
        }
      }
      body = body.replace(/<p[^>]*?>\s*<br[^>]*?>\s*<\/p>/gi, '<p></p>');
      params.html = body;
      params.text = htmlToText(body, { wordwrap: 80 });
    }
    return params;
  }
}
