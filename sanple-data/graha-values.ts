/*
Mercury	2	87.9691 days
Venus	3	224.701 days
Mars	4	686.971 days
Jupiter	5	11.862 years
Saturn	6	29.4571 years
Rahu	11	18.6129 years	(always retrograde, but goes direct every month for a few hours)
Uranus	7	84.0205 years
Neptune	8	164.8 years
Pluto	9	247.94 years
  { num: 0, yearLength: 0 },
  { num: 1, yearLength: 0 },
  { num: 2, yearLength: 87.9691 },
  { num: 3, yearLength: 224.701 },
  { num: 4, yearLength: 686.971 },
  { num: 5, yearLength: 4332.5029764 },
  { num: 6, yearLength: 10758.97600962 },
  { num: 101, yearLength: 0 },
  { num: 102, yearLength: 0 },
  { num: 7, yearLength: 30687.649644 }
  { num: 8, yearLength: 60191.914560000005 },
  { num: 9, yearLength: 90558.151068 }
*/

const grahaValues = [
  {
    num: 0,
    jyNum: 1,
    name: 'graha__1',
    ref: 'SE_SUN',
    key: 'su',
    icon: '☉',
    nature: ['guna_m'],
    gender: 'gender_m',
    bhuta: '',
    guna: 'guna__sat',
    caste: 'kuta__varna-2',
    dhatu: 'dhatu__2',
    dosha: ['kuta__nadi_2-2'],
    friends: ['mo', 'ma', 'ju'],
    neutral: ['me'],
    enemies: ['ve', 'sa'],
    ownSign: [5],
    exalted: 1,
    exaltedDegree: 10,
    mulaTrikon: 5,
    mulaTrikonDegrees: [0, 10],
    debilitated: 7,
  },
  {
    num: 1,
    jyNum: 2,
    name: 'graha__2',
    key: 'mo',
    ref: 'SE_MOON',
    icon: '☾',
    nature: ['guna_b', 'guna_m'],
    gender: 'gender_f',
    bhuta: '',
    guna: 'guna__sat',
    caste: 'kuta__varna-3',
    dhatu: 'dhatu__1',
    dosha: ['kuta__nadi_2-1', 'kuta__nadi_2-3'],
    friends: ['su', 'me'],
    neutral: ['ma', 'ju', 've', 'sa'],
    enemies: [],
    ownSign: [4],
    exalted: 2,
    exaltedDegree: 3,
    mulaTrikon: 2,
    mulaTrikonDegrees: [4, 30],
    debilitated: 8,
  },
  {
    num: 2,
    jyNum: 4,
    name: 'graha__4',
    key: 'me',
    ref: 'SE_MERCURY',
    icon: '☿',
    nature: ['guna_b', 'guna_m'],
    gender: 'gender_n',
    bhuta: 'bhuta__prithvi',
    guna: 'guna__raj',
    caste: 'kuta__varna-3',
    dhatu: 'dhatu__3',
    dosha: ['kuta__nadi_2-1', 'kuta__nadi_2-2', 'kuta__nadi_2-3'],
    friends: ['su', 've'],
    neutral: ['ma', 'ju', 'sa'],
    enemies: ['mo'],
    ownSign: [3, 6],
    exalted: 6,
    exaltedDegree: 15,
    mulaTrikon: 6,
    mulaTrikonDegrees: [16, 20],
    debilitated: 12,
    yearLength: 87.9691,
  },
  {
    num: 3,
    jyNum: 6,
    name: 'graha__6',
    key: 've',
    ref: 'SE_VENUS',
    icon: '♀',
    nature: ['guna_b'],
    gender: 'gender_f',
    bhuta: 'bhuta__jala',
    guna: 'guna__raj',
    caste: 'kuta__varna-1',
    dhatu: 'dhatu__2',
    dosha: ['kuta__nadi_2-3', 'kuta__nadi_2-1'],
    friends: ['me', 'sa'],
    neutral: ['ma', 'ju'],
    enemies: ['su', 'mo'],
    ownSign: [2, 7],
    exalted: 12,
    exaltedDegree: 27,
    mulaTrikon: 7,
    mulaTrikonDegrees: [0, 15],
    debilitated: 6,
    yearLength: 224.701,
  },
  {
    num: 4,
    jyNum: 3,
    name: 'graha__3',
    key: 'ma',
    ref: 'SE_MARS',
    icon: '♂',
    nature: ['guna_m'],
    gender: 'gender_m',
    bhuta: 'bhuta__agni',
    guna: 'guna__tam',
    caste: 'kuta__varna-2',
    dhatu: 'dhatu__1',
    dosha: ['kuta__nadi_2-2'],
    friends: ['su', 'mo', 'ju'],
    neutral: ['ve', 'sa'],
    enemies: ['me'],
    ownSign: [1, 8],
    exalted: 10,
    exaltedDegree: 28,
    mulaTrikon: 1,
    mulaTrikonDegrees: [0, 12],
    debilitated: 4,
    yearLength: 686.971,
  },
  {
    num: 5,
    jyNum: 5,
    name: 'graha__5',
    key: 'ju',
    ref: 'SE_JUPITER',
    icon: '♃',
    nature: ['guna_b'],
    gender: 'gender_m',
    bhuta: 'bhuta__akasha',
    guna: 'guna__sat',
    caste: 'kuta__varna-1',
    dhatu: 'dhatu__3',
    dosha: ['kuta__nadi_2-3'],
    friends: ['su', 'mo', 'ma'],
    neutral: ['sa'],
    enemies: ['me', 've'],
    ownSign: [9, 12],
    exalted: 4,
    exaltedDegree: 5,
    mulaTrikon: 9,
    mulaTrikonDegrees: [0, 10],
    debilitated: 10,
    yearLength: 4332.5029764,
  },
  {
    num: 6,
    jyNum: 7,
    name: 'graha__7',
    key: 'sa',
    ref: 'SE_SATURN',
    icon: '♄',
    nature: ['guna_m'],
    gender: 'gender_n',
    bhuta: 'bhuta__vayu',
    guna: 'guna__tam',
    caste: 'kuta__varna-4',
    dhatu: 'dhatu__1',
    dosha: ['kuta__nadi_2-1'],
    friends: ['me', 've'],
    neutral: ['ju'],
    enemies: ['su', 'mo', 'ma'],
    ownSign: [10, 11],
    exalted: 7,
    exaltedDegree: 20,
    mulaTrikon: 11,
    mulaTrikonDegrees: [0, 20],
    debilitated: 1,
    yearLength: 10758.97600962,
  },
  {
    num: 101,
    jyNum: 8,
    name: 'graha__8',
    key: 'ra',
    ref: 'SE_TRUE_NODE',
    altRef: 'SE_MEAN_NODE',
    icon: '☊',
    nature: ['guna_m'],
    gender: 'gender_n',
    bhuta: '',
    guna: 'guna__tam',
    caste: 'kuta__varna-5',
    dhatu: 'dhatu__1',
    dosha: ['kuta__nadi_2-1'],
    friends: [],
    neutral: [],
    enemies: [],
    ownSign: [11, 6],
    exalted: 2,
    exaltedDegree: 20,
    mulaTrikon: 11,
    mulaTrikonDegrees: [0, 20],
    debilitated: 8,
    charaKarakaMode: 'reverse',
  },
  {
    num: 102,
    jyNum: 9,
    name: 'graha__9',
    key: 'ke',
    ref: 'SE_TRUE_NODE',
    altRef: 'SE_MEAN_NODE',
    icon: '☋',
    calc: 'opposite',
    nature: ['guna_m'],
    gender: 'gender_n',
    bhuta: '',
    guna: 'guna__tam',
    caste: 'kuta__varna-5',
    dhatu: 'dhatu__3',
    dosha: ['kuta__nadi_2-2'],
    friends: [],
    neutral: [],
    enemies: [],
    ownSign: [8, 12],
    exalted: 8,
    exaltedDegree: 20,
    mulaTrikon: 8,
    mulaTrikonDegrees: [0, 20],
    debilitated: 2,
    charaKarakaMode: 'none',
  },
  {
    num: 7,
    name: 'graha__10',
    key: 'ur',
    ref: 'SE_URANUS',
    icon: '♅',
    friends: [],
    neutral: [],
    enemies: [],
    ownSign: [11],
    yearLength: 30687.649644,
  },
  {
    num: 8,
    name: 'graha__11',
    key: 'ne',
    ref: 'SE_NEPTUNE',
    icon: '♆',
    friends: [],
    neutral: [],
    enemies: [],
    ownSign: [12],
    yearLength: 60191.914560000005,
  },
  {
    num: 9,
    name: 'graha__12',
    key: 'pl',
    ref: 'SE_PLUTO',
    icon: '♇',
    friends: [],
    neutral: [],
    enemies: [],
    ownSign: [8],
    yearLength: 90558.151068,
  },
];

/* const planetYears = [
  { num: 2, v: 87.9691, u: 'days' },
  { num: 3, v: 224.701, u: 'days' },
  { num: 4, v: 686.971, u: 'days' },
  { num: 5, v: 11.862, u: 'years' },
  { num: 6, v: 29.4571, u: 'years' },
  { num: 7, v: 84.020, u: 'years' },
  { num: 11, v: 18.6129, u: 'years' },
  { num: 8, v: 164.8, u: 'years' },
  { num: 9, v: 247.94, u: 'years' }
];
 */
/* const merged = grahas.map(b => {
  b.hasAltRef = b.hasOwnProperty('altRef');
  b.hasCalc = b.hasOwnProperty('calc')
  if (!b.hasOwnProperty('friends')) {
    b.friends = [];
  }
  if (!b.hasOwnProperty('neutral')) {
    b.neutral = [];
  }
  if (!b.hasOwnProperty('enemies')) {
    b.enemies = [];
  }
  if (!b.hasOwnProperty('charaKarakaMode')) {
    b.charaKarakaMode = 'standard';
  }
  const plRow = planetYears.find(p => p.num === b.num);
  b.yearLength = 0;
  if (plRow) {
    let v = parseFloat(plRow.v);
    if (plRow.u === 'years') {
      v *= 365.2422;
    }
    b.yearLength = v;
  }
  return b;
}); */

export default grahaValues;

export const naturalBenefics = ['mo', 've', 'ju'];
export const naturalMalefics = ['su', 'ma', 'sa'];
export const naturalNeutral = ['me'];

export const functionalHouseNatures = [
  { house: 1, nature: 'b', index: 0 },
  { house: 2, nature: 'n', set: 2, index: 0 },
  { house: 3, nature: 'm', index: 0 },
  { house: 4, nature: 'n', set: 1, index: 0 },
  { house: 5, nature: 'b', index: 1 },
  { house: 6, nature: 'm', index: 1 },
  { house: 7, nature: 'n', set: 1, index: 1 },
  { house: 8, nature: 'n', set: 2, index: 2 },
  { house: 9, nature: 'b', index: 2 },
  { house: 10, nature: 'n', set: 1, index: 2 },
  { house: 11, nature: 'm', index: 2 },
  { house: 12, nature: 'n', set: 2, index: 0 },
];

export const aspectGroups = [
  [
    { key: 'conjunction', div: 1, fac: 1, cg: 'red' },
    { key: 'opposition', div: 2, fac: 1, cg: 'red' },
    { key: 'trine', div: 3, fac: 1, cg: 'blue' },
    { key: 'square', div: 4, fac: 1, cg: 'red' },
  ],
  [{ key: 'sextile', div: 6, fac: 1, cg: 'green' }],
  [
    { key: 'sesqui-square', div: 3, fac: 3, cg: 'red' },
    { key: 'quincunx', div: 12, fac: 5, cg: 'black' },
    { key: 'semi-square', div: 8, fac: 1, cg: 'red' },
  ],
  [
    { key: 'semi-sextile', div: 2, fac: 1, cg: 'grey' },
    { key: 'quintile', div: 5, fac: 1, cg: 'grey' },
    { key: 'bi-quintile', div: 5, fac: 2, cg: 'grey' },
  ],
  [
    { key: 'virgintile', div: 20, fac: 1, cg: 'grey' },
    { key: 'quindecile', div: 24, fac: 11, cg: 'grey' },
    { key: 'undecile', div: 11, fac: 1, cg: 'grey' },
    { key: 'dectile', div: 10, fac: 1, cg: 'grey' },
    { key: 'novile', div: 9, fac: 1, cg: 'grey' },
    { key: 'bi-novile', div: 9, fac: 2, cg: 'grey' },
    { key: 'quad-novile', div: 9, fac: 4, cg: 'grey' },
    { key: 'tri-decile', div: 10, fac: 3, cg: 'grey' },
    { key: 'tri-septile', div: 7, fac: 3, cg: 'grey' },
    { key: 'bi-septile', div: 7, fac: 2, cg: 'grey' },
    { key: 'septile', div: 7, fac: 1, cg: 'grey' },
  ],
];

export const orbGrahaMatches = [
  { group: 1, orbs: [12, 5, 3, 1, 0.5], keys: ['su', 'mo'] },
  { group: 2, orbs: [7, 5, 2, 1, 0.5], keys: ['me', 've', 'ma'] },
  { group: 3, orbs: [5, 2, 1, 0.5], keys: ['ju', 'sa'] },
  { group: 4, orbs: [3, 2, 1, 1, 0.5], keys: ['ur', 'ne', 'pl'] },
  { group: 6, orbs: [1, 0, 0, 0, 0], keys: ['ra', 'ke'] },
  { group: 7, orbs: [7, 5, 2, 1, 0.5], keys: ['as', 'ds', 'mc', 'ic'] },
];

export const rulerSignsMap = (): Map<string, number[]> => {
  const mp = new Map<string, number[]>();
  grahaValues.forEach(gr => {
    if (gr instanceof Object) {
      const { ownSign, jyNum } = gr;
      if (jyNum) {
        if (jyNum > 0 && jyNum <= 9 && ownSign instanceof Array) {
          mp.set(gr.key, ownSign);
        }
      }
    }
  });
  return mp;
};
