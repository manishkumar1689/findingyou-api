import { Document } from 'mongoose';
import { Geo } from 'src/user/interfaces/geo.interface';
import { Placename } from 'src/user/interfaces/placename.interface';
import { Subject } from './subject.interface';
import { BaseGraha } from './base-graha.interface';
import { HouseSystem } from './house-system.interface';
import { ObjectMatch } from './object-match.interface';
import { ITime } from './i-time.interface';
import { Variant } from './variant.interface';
import { KeyNumValue } from './key-num-value.interface';

export interface Chart extends Document {
  readonly user: string;
  readonly isDefaultBirthChart: boolean;
  readonly subject: Subject;
  readonly datetime: Date;
  readonly jd: number;
  readonly geo: Geo;
  readonly placenames: Placename[];
  readonly tz: string;
  readonly tzOffset: number;
  readonly ascendant: number;
  readonly mc: number;
  readonly vertex: number;
  readonly grahas: Array<BaseGraha>;
  readonly variants: Array<Variant>;
  readonly houses: Array<HouseSystem>;
  readonly indianTime: ITime;
  readonly upagrahas: Array<KeyNumValue>;
  readonly sphutas: Array<KeyNumValue>;
  readonly numValues: Array<KeyNumValue>;
  readonly objects: Array<ObjectMatch>;
}
