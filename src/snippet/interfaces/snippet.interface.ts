import { Document } from 'mongoose';

export interface Snippet extends Document {
  readonly key: string;
  value: string;
  readonly format: string;
  readonly createdAt: Date;
  readonly modifiedAt: Date;
}
