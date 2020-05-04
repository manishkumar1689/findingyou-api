import * as mongoose from 'mongoose';

export const SubjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    default: '',
  },
  type: {
    type: String,
    required: true,
    default: 'person',
  },
  gender: {
    type: String,
    required: true,
    default: '-',
  },
  eventType: {
    type: String,
    required: true,
    default: 'birth',
  },
  roddenScale: {
    type: String,
    required: false,
  },
});
