import * as mongoose from 'mongoose';
import { ChartSchema } from './chart.schema';
import { TagSchema } from './tag.schema';
const { ObjectId } = mongoose.Schema.Types;

export const PairedChartSchema = new mongoose.Schema({
  user: {
    type: ObjectId,
    required: true,
    ref: 'User',
  },
  c1: {
    type: ObjectId,
    required: true,
    ref: 'Chart',
  },
  c2: {
    type: ObjectId,
    required: true,
    ref: 'Chart',
  },
  timespace: {
    type: ChartSchema,
    required: false,
  },
  tags: {
    type: [TagSchema],
    required: false,
    default: [],
  },
  notes: {
    type: String,
    required: false,
    default: '',
  },
  createdAt: {
    type: Date,
    default: new Date(),
  },
  modifiedAt: {
    type: Date,
    default: new Date(),
  },
});
