

const coreBodies = [
  {
    num: 0,
    name: "Sun",
    ref: "SE_SUN",
    key: "su",
    friends: ["mo", "ma", "ju"],
    neutral: ["me"],
    enemies: ["ve", "sa"],
    ownSign: [5],            /* sign number */
    exalted: 1,          /* sign number */
    exaltedDegree: 10,  /* degree within sign */
    mulaTrikon: 5,       /* sign number */
    mulaTrikonDegrees: [0, 10],
    debilitated: 7,
  },    /* sign number */
  {
    num: 1,
    name: "Moon",
    key: "mo",
    ref: "SE_MOON",
    friends: ["su", "me"],
    neutral: ["ma", "ju", "ve", "sa"],
    enemies: [],
    ownSign: [4],
    exalted: 2,
    exaltedDegree: 3,
    mulaTrikon: 2,
    mulaTrikonDegrees: [4, 30],
    debilitated: 8
  },
  {
    num: 2,
    name: "Mercury",
    key: "me",
    ref: "SE_MERCURY",
    friends: ["su", "ve"],
    neutral: ["ma", "ju", "sa"],
    enemies: ["mo"],
    ownSign: [3, 6],
    exalted: 6,
    exaltedDegree: 15,
    mulaTrikon: 6,
    mulaTrikonDegrees: [16, 20],
    debilitated: 12
  },
  {
    num: 3,
    name: "Venus",
    key: "ve",
    ref: "SE_VENUS",
    friends: ["me", "sa"],
    neutral: ["ma", "ju"],
    enemies: ["su", "mo"],
    ownSign: [2, 7],
    exalted: 12,
    exaltedDegree: 27,
    mulaTrikon: 7,
    mulaTrikonDegrees: [0, 15],
    debilitated: 6
  },
  {
    num: 4,
    name: "Mars",
    key: "ma",
    ref: "SE_MARS",
    friends: ["su", "mo", "ju"],
    neutral: ["ve", "sa"],
    enemies: ["me"],
    ownSign: [1, 8],
    exalted: 10,
    exaltedDegree: 28,
    mulaTrikon: 1,
    mulaTrikonDegrees: [0, 12],
    debilitated: 4
  },
  {
    num: 5,
    name: "Jupiter",
    key: "ju",
    ref: "SE_JUPITER",
    friends: ["su", "mo", "ma"],
    neutral: ["sa"],
    enemies: ["me", "ve"],
    ownSign: [9, 12],
    exalted: 4,
    exaltedDegree: 5,
    mulaTrikon: 9,
    mulaTrikonDegrees: [0, 10],
    debilitated: 10
  },
  {
    num: 6,
    name: "Saturn",
    key: "sa",
    ref: "SE_SATURN",
    friends: ["me", "ve"],
    neutral: ["ju"],
    enemies: ["su", "mo", "ma"],
    ownSign: [10, 11],
    exalted: 7,
    exaltedDegree: 20,
    mulaTrikon: 11,
    mulaTrikonDegrees: [0, 20],
    debilitated: 1
  },
  {
    num: 101,
    name: "Rahu",
    key: "ra",
    ref: "SE_TRUE_NODE",
    altRef: "SE_MEAN_NODE",
    ownSign: [11, 6],
    exalted: 2,
    exaltedDegree: 20,
    mulaTrikon: 11,
    mulaTrikonDegrees: [0, 20],
    debilitated: 8,
    charaKarakaMode: 'reverse'
  },
  {
    num: 102,
    name: "Ketu",
    key: "ke",
    ref: "SE_TRUE_NODE",
    altRef: "SE_MEAN_NODE",
    calc: 'opposite',
    ownSign: [8, 12],
    exalted: 8,
    exaltedDegree: 20,
    mulaTrikon: 8,
    mulaTrikonDegrees: [0, 20],
    debilitated: 2,
    charaKarakaMode: 'none'
  },
];

const merged = coreBodies.map(b => {
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
  return b;
});

export default merged;