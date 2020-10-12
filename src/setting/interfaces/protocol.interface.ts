import { Document } from 'mongoose';
import { Category } from './category.interface';
import { RulesCollection } from './rules-collection.interface';

export interface Protocol extends Document {
  readonly user: string;
  readonly name: string;
  readonly notes?: string;
  readonly collections: RulesCollection[];
  readonly categories: Category[];
  readonly createdAt: Date;
  readonly modifiedAt: Date;
}
