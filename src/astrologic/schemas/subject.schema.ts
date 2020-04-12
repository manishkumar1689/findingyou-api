import * as mongoose from 'mongoose';

export const SubjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  eventType: {
    type: String,
    required: true,
  },
  roddenScale: {
    type: String,
    required: false,
  },
});
