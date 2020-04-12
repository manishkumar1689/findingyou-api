import * as mongoose from 'mongoose';

export const ObjectMatchSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    default: 'graha',
  },
  value: {
    type: String,
    required: true,
  },
});
