import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
/*import * as htmlToText from 'html-to-text';*/
import { InjectModel } from '@nestjs/mongoose';
import { Message } from './interfaces/message.interface';
import { MailerService } from '@nest-modules/mailer';
import { CreateMessageDTO } from './dto/create-message.dto';
import { mail, webBaseUrl, testMode, mailService } from '../config/config';
import { logMail, logMailError } from '../lib/logger';
import { sendElasticMail } from '../lib/elasticmail';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel('Message') private readonly messageModel: Model<Message>,
    private readonly mailerService: MailerService,
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
  async getMessage(snippetID): Promise<Message> {
    const snippet = await this.messageModel.findById(snippetID).exec();
    return snippet;
  }
  // post a single Message
  async addMessage(createMessageDTO: CreateMessageDTO): Promise<Message> {
    const newMessage = await this.messageModel(createMessageDTO);
    return newMessage.save();
  }
  // Edit Message details
  async updateMessage(
    messageID,
    createMessageDTO: CreateMessageDTO,
  ): Promise<Message> {
    const updatedMessage = await this.messageModel.findByIdAndUpdate(
      messageID,
      createMessageDTO,
      { new: true },
    );
    return updatedMessage;
  }

  async mail(
    key: string,
    email: string,
    toName: string,
  ): Promise<void> {
    const message = await this.messageModel.findOne({ key });
    const sendParams = this.transformMailParams(message, email, toName);

    this.sendMail(sendParams, key);
  }

  async resetMail(email: string, toName: string, link: string = ''): Promise<void> {
    const message = await this.messageModel.findOne({key: 'password_reset'});
    
    const sendParams = this.transformMailParams(message, email, toName, link);

    this.sendMail(sendParams, 'password_reset');
  }

  public sendMail(sendParams, key: string = '') {
    switch (mailService) {
      case 'elasticmail/api':
        sendElasticMail(sendParams, (response, type) => {
          switch (type) {
            case 'error':
              logMailError(response, key)
              break;
            default:
              
              if (response.data instanceof Object) {
                let data = {
                  ...sendParams,
                  ...response.data
                }
                logMail(data, key);
              } else {
                logMail(response, key);
              }
              
              break;
          }
        });
        break;
      default:
        this.mailerService
          .sendMail(sendParams)
          .then((data) => {
            logMail(data, key);
          })
          .catch(e => {
            logMailError(e, key);
          });
          break;
    }
    
  }

  public transformMailParams(message: Message, email: string, toName: string, resetLink: string = '') {
    let params = {
      to: email,
      from: mail.fromAddress,
      subject: '',
      html: '',
      toName,
      fromName: message.fromName
      // plain: '',
    }
    if (message) {
      params.from = message.fromMail;
      params.subject = message.subject;
      
      let body = message.body.replace('%full_name', toName).replace('%email', email);
      if (resetLink) {
        const fullLink = webBaseUrl + resetLink;
        body = body.replace('%reset_link', fullLink);
      }
      if (body.indexOf('%access_link') > 0) {
          const fullAccessUrl = webBaseUrl + '/#login';
          const linkTag = '<a href="'+fullAccessUrl+'">'+fullAccessUrl+'</a>';
         body = body.replace('%access_link', linkTag);
      }
      body = body.replace(/<p[^>]*?>\s*<br[^>]*?>\s*<\/p>/gi, '<p></p>');
      params.html = body;
    }
    return params;
  }

}
