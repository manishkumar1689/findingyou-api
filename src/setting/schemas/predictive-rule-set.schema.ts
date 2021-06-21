import * as mongoose from 'mongoose';
import { PredictiveScoreSchema } from './predictive-score.schema';
const { Mixed } = mongoose.Schema.Types;
const { ObjectId } = mongoose.Schema.Types;

export const PredictiveRuleSetSchema = new mongoose.Schema({
  user: {
    type: ObjectId,
    required: true,
    ref: 'User',
  },
  name: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true, // text sent when condition is met
  },
  notes: {
    type: String,
    required: false,
    default: '',
  },
  conditionSet: {
    type: Mixed,
    required: false,
  },
  scores: {
    type: [PredictiveScoreSchema],
    required: false,
  },
});
