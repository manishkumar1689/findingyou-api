import * as mongoose from 'mongoose';
import { GrahaTransitionSchema } from './graha-transition.schema';

export const BaseGrahaSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
  },
  num: {
    type: Number,
    required: true,
  },
  lng: {
    type: Number,
    required: true,
  },
  lat: {
    type: Number,
    required: false,
  },
  speed: {
    type: Number,
    required: false,
  },
  sign: {
    type: Number,
    required: false,
  },
  house: {
    type: Number,
    required: false,
  },
  relationship: {
    type: String,
    required: false,
  },
  transitions: {
    type: [GrahaTransitionSchema],
    required: false,
    default: [],
  },
});
