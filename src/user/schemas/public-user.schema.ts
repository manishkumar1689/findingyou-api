import * as mongoose from 'mongoose';
import { GeoSchema } from './geo.schema';
import { PreferenceSchema } from './preference.schema';

export const PublicUserSchema = new mongoose.Schema({
  nickName: String, // display name, alias, stage name
  identifier: {
    type: String,
    required: true,
    unique: true,
  },
  useragent: {
    type: String,
    required: false,
  },
  geo: {
    type: GeoSchema,
    required: false,
  },
  dob: { type: Date, default: null, required: false },
  gender: {
    type: String,
    enum: ['f', 'm', '-', 'nb', 'tf', 'tm', 'o'],
    default: '-',
    required: false,
  },
  active: {
    type: Boolean,
    default: true,
  },
  preferences: {
    type: [PreferenceSchema],
    default: [],
    required: false,
  },
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
});
