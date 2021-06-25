import { Document } from 'mongoose';
import { Status } from './status.interface';
import { Profile } from './profile.interface';
import { Placename } from './placename.interface';
import { Geo } from './geo.interface';
import { Preference } from './preference.interface';
import { Contact } from './contact.interface';

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
  readonly coords?: number[];
  readonly contacts?: Contact[];
  readonly placenames?: Placename[];
  readonly gender: string;
  readonly preferences: Preference[];
  readonly profiles: Profile[];
  readonly preview: string;
  readonly dob: Date;
  readonly token: string;
  readonly login: Date;
  readonly createdAt: Date;
  readonly modifiedAt: Date;
}
