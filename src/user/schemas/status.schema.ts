import * as mongoose from 'mongoose';
import { RoleSchema } from './role.schema';

export const StatusSchema = new mongoose.Schema({
  role: [RoleSchema],
  current: {
    type: Boolean,
    default: false,
  },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
});
