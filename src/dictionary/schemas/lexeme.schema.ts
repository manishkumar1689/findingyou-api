import * as mongoose from 'mongoose';
import { TranslationSchema } from './translation.schema';

export const LexemeSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  original: {
    type: String,
    required: false,
  },
  translations: {
    type: [TranslationSchema],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
});
