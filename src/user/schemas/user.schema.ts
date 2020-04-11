import * as mongoose from 'mongoose';
import * as validator from 'validator';
import { StatusSchema } from './status.schema';
import { ProfileSchema } from './profile.schema';
import { GeoSchema } from './geo.schema';
import { PlacenameSchema } from './placename.schema';

export const UserSchema = new mongoose.Schema({
  fullName: String,
  nickName: String,
  identifier: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: validator.isEmail,
      message: '{VALUE} is not a valid email',
    },
  },
  mode: {
    type: String,
    enum: ['local', 'google', 'facebook'],
  },
  password: {
    type: String,
    required: false,
  },
  roles: [String],
  geo: {
    type: GeoSchema,
    required: false,
  },
  placenames: {
    type: [PlacenameSchema],
    default: [],
    required: false,
  },
  profiles: {
    type: [ProfileSchema],
    default: [],
    required: false,
  },
  preview: {
    type: String,
    required: false,
    default: '',
  },
  active: Boolean,
  test: Boolean,
  status: [StatusSchema],
  token: String,
  login: { type: Date, default: null, required: false },
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
});
