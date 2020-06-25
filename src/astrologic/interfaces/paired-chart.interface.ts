import { Document } from 'mongoose';
import { BaseChart } from './base-chart.interface';
import { Tag } from './tag.interface';

export interface PairedChart extends Document {
  readonly user: string;
  readonly c1: string;
  readonly c2: string;
  readonly timespace: BaseChart;
  readonly midMode: string;
  readonly tags: Tag[];
  readonly notes: string;
  readonly createdAt: Date;
  readonly modifiedAt: Date;
}
