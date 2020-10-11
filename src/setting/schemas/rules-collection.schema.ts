import * as mongoose from 'mongoose';
import { CategorySchema } from './category.schema';
import { RuleSetSchema } from './rule-set.schema';
const { Mixed, ObjectId } = mongoose.Schema.Types;

export const RulesCollectionSchema = new mongoose.Schema({
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
    required: true,
  },
  rules: {
    type: [RuleSetSchema],
  },
  categories: {
    type: [CategorySchema],
  },
  weight: {
    type: Number,
    default: 0,
  },
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
});
