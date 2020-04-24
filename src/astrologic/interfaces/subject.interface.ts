import { Document } from 'mongoose';

export interface Subject extends Document {
  readonly name: string;
  readonly type: string;
  readonly gender: string;
  readonly eventType: string;
  readonly roddenScale: string;
}
