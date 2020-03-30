import { Document } from 'mongoose';

export interface Message extends Document {
  readonly key: string;
  readonly subject: string;
  readonly body: string;
  readonly fromName: string;
  readonly fromMail: string;
  readonly createdAt: Date;
  readonly modifiedAt: Date;
}
