import * as mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;
const { Mixed } = mongoose.Schema.Types;

export const FeedbackSchema = new mongoose.Schema({
  user: {
    type: ObjectId,
    required: true,
    ref: 'User',
  },
  targetUser: {
    type: ObjectId,
    required: true,
    ref: 'User',
  },
  key: {
    type: String,
    required: false,
    default: '',
  },
  type: {
    type: String,
    required: false,
    default: '',
  },
  value: {
    type: Mixed,
    required: true,
    default: null,
  },
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
});
