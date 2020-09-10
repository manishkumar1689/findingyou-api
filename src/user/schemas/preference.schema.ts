import * as mongoose from 'mongoose';
const { Mixed } = mongoose.Schema.Types;

export const PreferenceSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
  },
  value: {
    type: Mixed,
    required: true,
  },
  type: {
    type: String,
    enum: [
      'string', // key string stored, e.g. f/m for gender
      'integer', // number stored as integer
      'scale', // integer interpreted on a scale e.g. -2 to 2 for degree of agreement (with 0 being neutral)
      'key_scale', // set of keys which arbitary integer values on a custom scale
      'array_key_scale', // array of keys which arbitary scale values may be assigned
      'float', // double
      'currency', // double rounded to exactly 2 dec places
      'boolean', // true/false, yes/no
      'array_string', // any number of string options
      'array_integer', // any number of integer options
      'range_number', // numeric range e.g 18-40 stored as [18,40]
      'array_float',
      'multiple_key_scales', // multiple scales defined by rules
    ],
    default: 'string',
    required: true,
  },
  rules: {
    type: [Mixed],
    default: [],
    required: false,
  },
});
