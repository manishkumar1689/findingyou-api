/* Ancient Indian Time Units - starting from Sun-rise  */
const ghatiValues = [
  {
    key: 'mu',
    name: 'muhurta__0',
    formula: {
      unit: 'dayLength',
      op: '/',
      operand: 30,
      description:
        '2 x ghaṭi -- - 30 muhūrtas in duration from SunRise to next day SunRise',
    },
  },
  {
    key: 'gh',
    name: 'muhurta__ghati',
    formula: {
      unit: 'dayLength',
      op: '/',
      operand: 60,
      description: '(duration from SunRise to SunRise (next day)) / 60',
    },
  },
  {
    key: 'vi',
    name: 'muhurta__vighati',
    formula: {
      unit: 'gh',
      op: '/',
      operand: 60,
      description: 'ghaṭi / 60',
    },
  },
  {
    key: 'li',
    name: 'muhurta__lipta',
    formula: {
      unit: 'vi',
      op: '/',
      operand: 60,
      description: 'vighaṭi / 60',
    },
  },
];

export default ghatiValues;
