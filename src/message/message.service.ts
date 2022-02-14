import { Injectable, HttpService } from '@nestjs/common';
import { Model } from 'mongoose';
import * as htmlToText from 'html-to-text';
import { InjectModel } from '@nestjs/mongoose';
import { Message } from './interfaces/message.interface';
import { CreateMessageDTO } from './dto/create-message.dto';
import { isNumeric } from '../lib/validators';
import { mailDetails, mailService, webBaseUrl } from '../.config';

export interface MessageSet {
  key: string;
  items: Message[];
}

@Injectable()
export class MessageService {
  constructor(
    @InjectModel('Message') private readonly messageModel: Model<Message>,
    private http: HttpService,
  ) {}
  // fetch all Messages
  async list(): Promise<Message[]> {
    return await this.messageModel.find({});
  }

  async listByKey(): Promise<MessageSet[]> {
    const items = await this.list();
    const rows: MessageSet[] = [];
    if (items.length > 0) {
      items.forEach(msg => {
        const rowIndex = rows.findIndex(row => row.key === msg.key);
        if (rowIndex < 0) {
          rows.push({ key: msg.key, items: [msg] });
        } else {
          rows[rowIndex].items.push(msg);
        }
      });
      for (const row of rows) {
        let defEngIndex = row.items.findIndex(r => r.lang === 'en');
        if (defEngIndex < 0) {
          defEngIndex = row.items.findIndex(r => r.lang === 'en');
        }
        if (defEngIndex > 0) {
          const defRow = row.items.splice(defEngIndex, 1);
          row.items.unshift(defRow[0]);
          const boolToInt = (b: boolean) => (b ? 1 : -1);
          row.items.sort((a, b) => boolToInt(a.active) - boolToInt(b.active));
        }
      }
    }
    return rows;
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

  async getByKey(key = ''): Promise<Message[]> {
    const snippets = await this.messageModel.find({ key }).exec();
    return snippets;
  }

  async getByKeyLang(key = '', lang = '', exact = false): Promise<Message> {
    const items = await this.getByKey(key);
    const hasLocale = lang.includes('-');
    const langRoot = hasLocale ? lang.split('-').shift() : lang;
    let message = null;
    let index = -1;
    if (items.length > 0) {
      const langVersions = items.map(sn => {
        let root = '';
        let full = '';
        if (typeof sn.lang === 'string') {
          full = sn.lang;
          root = sn.lang.split('-').shift();
        }
        return {
          root,
          full,
        };
      });
      index = langVersions.findIndex(row => row.full === lang);
      if (index < 0 && hasLocale && !exact) {
        index = langVersions.findIndex(row => row.root === langRoot);
        if (index < 0) {
          index = langVersions.findIndex(row => row.root === langRoot);
        }
      }
      if (index >= 0) {
        message = items[index];
      }
    }
    return message;
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
    items: CreateMessageDTO[],
    deleteIds: string[] = [],
  ): Promise<MessageSet> {
    const msgSet: MessageSet = { key, items: [] };
    const modifiedAt = new Date();
    await this.messageModel.updateMany({ key }, { active: false });
    if (deleteIds.length > 0) {
      for (const delId of deleteIds) {
        await this.messageModel.findByIdAndDelete(delId);
      }
    }
    for (const item of items) {
      const msg = await this.getByKeyLang(item.key, item.lang, true);
      const edited = {
        key: item.key,
        lang: item.lang,
        active: item.active,
        subject: item.subject,
        body: item.body,
        fromName: item.fromName,
        fromMail: item.fromMail,
      } as CreateMessageDTO;
      let saved = null;
      if (msg instanceof Object) {
        saved = await this.updateMessage(msg._id, {
          ...edited,
          modifiedAt,
        });
      } else {
        saved = await this.addMessage({
          ...edited,
          createdAt: modifiedAt,
          modifiedAt,
        });
      }
      if (saved instanceof Object) {
        msgSet.items.push(saved);
      }
    }

    return msgSet;
  }

  async resetMail(
    email: string,
    toName: string,
    link = '',
    lang = 'en',
  ): Promise<void> {
    const message = await this.getByKeyLang('password_reset', lang);
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
