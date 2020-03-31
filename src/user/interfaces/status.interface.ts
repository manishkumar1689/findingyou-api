import { Document } from 'mongoose';

export interface Status extends Document {
  readonly role: string;
  readonly current: boolean;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly modifiedAt: Date;
}
