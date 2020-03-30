import { Document } from 'mongoose';
import { Status } from './status.interface';
import { Role } from './role.interface';

export interface User extends Document {
  readonly uid: number;
  readonly firstName: string;
  readonly lastName: string;
  readonly identifier: string;
  readonly password: string;
  readonly mode: string;
  readonly role: Role[];
  readonly active: boolean;
  readonly status: Status[];
  readonly token: string;
  readonly login: Date;
  readonly createdAt: Date;
  readonly modifiedAt: Date;
}
