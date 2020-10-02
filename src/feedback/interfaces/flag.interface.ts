import { Document } from 'mongoose';

export interface Flag extends Document {
  readonly user: string;
  readonly targetUser: any;
  readonly key: string;
  readonly active: boolean;
  readonly type: string;
  readonly value: any;
  readonly isRating: boolean;
  readonly createdAt: Date;
  readonly modifiedAt: Date;
}
