import { Document } from 'mongoose';
import { Chart } from './chart.interface';
import { Tag } from './tag.interface';

export interface PairedChart extends Document {
  readonly user: string;
  readonly c1: string;
  readonly c2: string;
  readonly timespace: Chart;
  readonly tags: Tag[];
  readonly notes: string;
  readonly createdAt: Date;
  readonly modifiedAt: Date;
}
