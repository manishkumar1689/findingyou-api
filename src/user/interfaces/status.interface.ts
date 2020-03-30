import { Document } from 'mongoose';
import { Role } from './role.interface';

export interface Status extends Document {
  readonly key: string;
  readonly current: boolean;
  readonly role: Role;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly modifiedAt: Date;
}
