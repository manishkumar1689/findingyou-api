import * as mongoose from 'mongoose';
import { SubjectSchema } from './subject.schema';
import { GeoSchema } from 'src/user/schemas/geo.schema';
import { BaseGrahaSchema } from './base-graha.schema';
import { HouseSystemSchema } from './house-system.schema';
import { GrahaTransitionSchema } from './graha-transition.schema';
import { SphutaSchema } from './sphuta.schema';
import { ObjectMatchSchema } from './object-match.schema';
const { ObjectId } = mongoose.Schema.Types;

export const ChartSchema = new mongoose.Schema({
  user: {
    type: ObjectId,
    required: true,
    ref: 'User',
  },
  subject: {
    type: SubjectSchema,
    required: true,
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
  grahas: {
    type: [BaseGrahaSchema],
    required: true,
  },
  houses: {
    type: [HouseSystemSchema],
    required: false,
  },
  sunTransitions: {
    type: [GrahaTransitionSchema],
    required: false,
    default: [],
  },
  sphutas: {
    type: [SphutaSchema],
    required: false,
    default: [],
  },
  objects: {
    type: [ObjectMatchSchema],
    required: false,
    default: [],
  },
});
