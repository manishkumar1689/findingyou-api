import * as mongoose from 'mongoose';

export const RoleSchema = new mongoose.Schema({
  key: String,
  name: {
    type: String,
    default: '',
  },
});
