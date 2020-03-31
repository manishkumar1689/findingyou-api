import * as mongoose from 'mongoose';

export const StatusSchema = new mongoose.Schema({
  role: String,
  current: {
    type: Boolean,
    default: false,
  },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
});
