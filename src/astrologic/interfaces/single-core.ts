import { GeoLoc } from '../lib/models/geo-loc';

export interface SingleCore {
  _id: string;
  name: string;
  geo: GeoLoc;
  dt: string | Date;
  refKey: string;
  duplicate?: boolean;
  mainId?: string;
  paired?: string[];
}
