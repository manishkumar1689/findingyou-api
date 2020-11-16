import * as mongoose from 'mongoose';

export const RashiSchema = new mongoose.Schema({
  houseNum: {
    type: Number,
    required: true,
  },
  sign: {
    type: Number,
    required: true,
  },
  lordInHouse: {
    type: Number,
    required: true,
  },
  arudhaInHouse: {
    type: Number,
    required: true,
  },
});
