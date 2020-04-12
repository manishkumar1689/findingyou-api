import * as mongoose from 'mongoose';

export const SphutaSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
  },
  value: {
    type: Number,
    required: true,
  },
});
