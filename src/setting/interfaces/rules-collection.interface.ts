import { Document } from 'mongoose';
import { Category } from './category.interface';
import { RuleSet } from './rule-set.interface';

export interface RulesCollection extends Document {
  readonly user: string;
  readonly name: string;
  readonly notes?: string;
  readonly rules: RuleSet[];
  readonly categories: Category[];
  readonly weight: number;
  readonly createdAt: Date;
  readonly modifiedAt: Date;
}
