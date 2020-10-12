import * as mongoose from 'mongoose';
import { CategorySchema } from './category.schema';
import { RulesCollectionSchema } from './rules-collection.schema';
const { Mixed, ObjectId } = mongoose.Schema.Types;

export const ProtocolSchema = new mongoose.Schema({
  user: {
    type: ObjectId,
    required: true,
    ref: 'User',
  },
  name: {
    type: String,
    required: true,
  },
  notes: {
    type: Mixed,
    required: false,
  },
  collections: {
    type: [RulesCollectionSchema],
    default: [],
  },
  categories: {
    type: [CategorySchema],
    default: [],
  },
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
});