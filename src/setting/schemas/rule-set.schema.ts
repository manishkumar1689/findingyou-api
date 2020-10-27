import * as mongoose from 'mongoose';
import { ScoreSchema } from './score.schema';
const { Mixed } = mongoose.Schema.Types;

export const RuleSetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    default: 'synastry',
  },
  conditionSet: {
    type: Mixed,
    required: false,
  },
  scores: {
    type: [ScoreSchema],
    required: false,
  },
});
