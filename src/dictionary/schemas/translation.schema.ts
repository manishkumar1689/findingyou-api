import * as mongoose from 'mongoose';

export const TranslationSchema = new mongoose.Schema({
  lang: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
});
