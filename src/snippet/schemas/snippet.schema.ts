import * as mongoose from 'mongoose';

export const SnippetSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: true,
  },
  format: {
    type: String,
    enum: ['text', 'html'],
    default: 'text',
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
});
