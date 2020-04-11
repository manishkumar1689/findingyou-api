import { Document } from 'mongoose';
import { Status } from './status.interface';
import { Profile } from './profile.interface';
import { Placename } from './placename.interface';
import { Geo } from './geo.interface';

export interface User extends Document {
  readonly fullName: string;
  readonly nickName: string;
  readonly identifier: string;
  readonly password: string;
  readonly mode: string;
  readonly roles: string[];
  readonly active: boolean;
  readonly test: boolean;
  readonly status: Status[];
  readonly geo?: Geo;
  readonly placenames?: Placename[];
  readonly profiles: Profile[];
  readonly preview: string;
  readonly token: string;
  readonly login: Date;
  readonly createdAt: Date;
  readonly modifiedAt: Date;
}
