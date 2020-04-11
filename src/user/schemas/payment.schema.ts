import * as mongoose from 'mongoose';

export const PaymentSchema = new mongoose.Schema({
  service: {
    type: String,
    default: true,
  },
  ref: {
    type: String,
    default: false,
  },
  amount: {
    type: Number,
    default: 0,
    required: true,
  },
  curr: {
    type: String,
    default: false,
  },
  createdAt: { type: Date, default: Date.now },
});
