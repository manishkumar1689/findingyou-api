import { Document } from 'mongoose';
import { BaseChart } from './base-chart.interface';
import { Tag } from './tag.interface';
import { Geo } from 'src/user/interfaces/geo.interface';

export interface PairedChart extends Document {
  readonly user: string;
  readonly c1: string;
  readonly c2: string;
  readonly timespace: BaseChart;
  readonly surfaceGeo: Geo;
  readonly surfaceAscendant: number;
  readonly surfaceTzOffset: number;
  readonly midMode: string;
  readonly tags: Tag[];
  readonly startYear?: number;
  readonly span?: number;
  readonly notes: string;
  readonly createdAt: Date;
  readonly modifiedAt: Date;
}
