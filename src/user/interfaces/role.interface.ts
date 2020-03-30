import { Document } from 'mongoose';

export interface Role extends Document {
  readonly key: string;
  readonly name: string;
}
