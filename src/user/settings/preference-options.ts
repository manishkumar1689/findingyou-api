const preferenceOptions = [
  {
    key: 'age_range',
    prompt: 'Which age range appeals to you?', // user may specify
    type: 'range_number',
    rules: [
      {
        key: 'min',
        value: 18,
      },
    ],
  },
  {
    key: 'gender',
    prompt: 'To which genders are you attracted?',
    type: 'array_string',
    options: ['f', 'm', 'tf', 'tm', 'nb'],
    rules: [
      {
        key: 'custom',
        value: true,
      },
    ],
  },
  {
    key: 'max_distance',
    prompt: 'Only show partners within this range',
    type: 'float', // probably stored in km, but users may select from arbitrary values in km or miles
  },
  {
    key: 'geo_limits',
    prompt: 'Any other practical geographical constraints?',
    type: 'array_string',
    options: ['same_island', 'same_region', 'same_country'],
  },
  {
    key: 'religions',
    prompt:
      "Do you have any preferences about your partner's religious persuasion?",
    type: 'array_key_scale',
    options: [
      'hindu',
      'christian',
      'buddhist',
      'jewish',
      'muslim',
      'sikh',
      'shinto',
      'atheist',
    ],
    rules: [
      {
        key: 'range',
        value: [-2, 2],
      },
      {
        key: 'custom',
        value: true,
      },
    ],
  },
  {
    key: 'member_smoker_status',
    prompt: 'Do you smoke at all?',
    type: 'key_scale',
    options: [
      { key: 'never', value: 0 },
      { key: 'occasionally', value: 1 },
      { key: 'moderately', value: 2 },
      { key: 'passionately', value: 3 },
    ],
  },
  {
    key: 'partner_smoker',
    prompt: 'Do you mind if your partner smokes?',
    type: 'scale',
    rules: [
      {
        key: 'range',
        value: [-2, 2],
      },
    ],
  },
  {
    key: 'member_diet',
    prompt: 'What are your dietary preferences?',
    type: 'array_string',
    options: [
      'vegetarian',
      'vegan',
      'pescatarian',
      'no_beef',
      'no_pork',
      'no_crustaceans',
      'no_junk',
    ],
  },
  {
    key: 'partner_vegetarian',
    prompt: 'Would you like a vegetarian partner?',
    type: 'scale',
    rules: [
      {
        key: 'range',
        value: [-2, 2],
      },
    ],
  },
  {
    key: 'partner_vegan',
    prompt: 'Would you like a vegan partner?',
    type: 'scale',
    rules: [
      {
        key: 'range',
        value: [-2, 2],
      },
    ],
  },
];

export default preferenceOptions;
