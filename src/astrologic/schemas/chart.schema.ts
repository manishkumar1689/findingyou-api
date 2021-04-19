import * as mongoose from 'mongoose';
import { SubjectSchema } from './subject.schema';
import { GeoSchema } from '../../user/schemas/geo.schema';
import { PlacenameSchema } from '../../user/schemas/placename.schema';
import { BaseGrahaSchema } from './base-graha.schema';
import { HouseSystemSchema } from './house-system.schema';
import { ITimeSchema } from './i-time.schema';
import { KeyNumValueSchema } from './upagraha.schema';
import { VariantSetSchema } from './variant-set.schema';
import { ObjectMatchSetSchema } from './object-match-set.schema';
import { StringValueSchema } from './string-value.schema';
import { RashiSetSchema } from './rashi-set.schema';
const { ObjectId } = mongoose.Schema.Types;

export const ChartSchema = new mongoose.Schema({
  user: {
    type: ObjectId,
    required: true,
    ref: 'User',
  },
  isDefaultBirthChart: {
    type: Boolean,
    default: true,
  },
  subject: {
    type: SubjectSchema,
    required: true,
  },
  // versioning, e.g. variant birth details
  parent: {
    type: ObjectId,
    required: false,
    ref: 'Chart',
  },
  datetime: {
    type: Date,
    required: true,
  },
  jd: {
    type: Number,
    required: true,
  },
  geo: {
    type: GeoSchema,
    required: true,
  },
  placenames: {
    type: [PlacenameSchema],
    required: false,
    default: [],
  },
  tz: {
    type: String,
    required: false,
  },
  tzOffset: {
    type: Number,
    required: true,
  },
  ascendant: {
    type: Number,
    required: false,
  },
  mc: {
    type: Number,
    required: false,
  },
  vertex: {
    type: Number,
    required: false,
  },
  grahas: {
    type: [BaseGrahaSchema],
    required: true,
  },
  houses: {
    type: [HouseSystemSchema],
    required: false,
  },
  indianTime: {
    type: ITimeSchema,
    required: false,
  },
  ayanamshas: {
    type: [KeyNumValueSchema],
    required: false,
    default: [],
  },
  upagrahas: {
    type: [KeyNumValueSchema],
    required: false,
    default: [],
  },
  sphutas: {
    type: [VariantSetSchema],
    required: false,
    default: [],
  },
  numValues: {
    type: [KeyNumValueSchema],
    required: false,
    default: [],
  },
  stringValues: {
    type: [StringValueSchema],
    required: false,
    default: [],
  },
  objects: {
    type: [ObjectMatchSetSchema],
    required: false,
    default: [],
  },
  rashis: {
    type: [RashiSetSchema],
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
