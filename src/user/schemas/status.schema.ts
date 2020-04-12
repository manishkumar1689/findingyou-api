import * as mongoose from 'mongoose';
import { PaymentSchema } from './payment.schema';

export const StatusSchema = new mongoose.Schema({
  role: String,
  current: {
    type: Boolean,
    default: false,
  },
  payments: {
    type: [PaymentSchema],
    default: [],
    required: false,
  },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: Date.now, required: false },
  modifiedAt: { type: Date, default: Date.now },
});
