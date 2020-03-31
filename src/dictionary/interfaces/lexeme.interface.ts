import { Document } from 'mongoose';
import { Translation } from './translation.interface';

export interface Message extends Document {
  readonly key: string;
  readonly name: string;
  readonly original: string;
  readonly translations: Translation[];
  readonly createdAt: Date;
  readonly modifiedAt: Date;
}
