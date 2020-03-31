import * as mongoose from 'mongoose';
import * as validator from 'validator';
import { StatusSchema } from './status.schema';

export const UserSchema = new mongoose.Schema({
  uid: Number,
  firstName: String,
  lastName: String,
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
  active: Boolean,
  status: [StatusSchema],
  token: String,
  login: { type: Date, default: null, required: false },
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
});
