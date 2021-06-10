import { Document } from 'mongoose';
import { Score } from './score.interface';

export interface PredictiveRuleSet extends Document {
  readonly user: string;
  readonly name: string;
  readonly text: string;
  readonly notes?: string;
  readonly conditionSet: any;
  readonly scores: Score[];
  readonly createdAt: Date;
  readonly modifiedAt: Date;
}
