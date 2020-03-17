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
    num: 0, jyNum: 1, name: "Sun", ref: "SE_SUN", key: "su", icon: "☉",
    nature: ["m"], gender: "m", bhuta: "", guna: "sat", caste: "kṣatriya", dhatu: "mūla", dosha: ["pitta"],
    friends: ["mo", "ma", "ju"], neutral: ["me"], enemies: ["ve", "sa"],
    ownSign: [5], exalted: 1, exaltedDegree: 10, mulaTrikon: 5, mulaTrikonDegrees: [0, 10], debilitated: 7,
  },
  {
    num: 1, jyNum: 2, name: "Moon", key: "mo", ref: "SE_MOON", icon: "☾",
    nature: ["b", "m"], gender: "f", bhuta: "", guna: "sat", caste: "vaishya", dhatu: "dhatu", dosha: ["vata", "kapha"],
    friends: ["su", "me"], neutral: ["ma", "ju", "ve", "sa"], enemies: [],
    ownSign: [4], exalted: 2, exaltedDegree: 3,
    mulaTrikon: 2, mulaTrikonDegrees: [4, 30], debilitated: 8
  },
  {
    num: 2, jyNum: 4, name: "Mercury", key: "me", ref: "SE_MERCURY", icon: "☿",
    nature: ["b", "m"], gender: "n", bhuta: "earth", guna: "raj", caste: "vaishya", dhatu: "jiva", dosha: ["vata", "pitta", "kapha"],
    friends: ["su", "ve"], neutral: ["ma", "ju", "sa"], enemies: ["mo"],
    ownSign: [3, 6], exalted: 6, exaltedDegree: 15,
    mulaTrikon: 6, mulaTrikonDegrees: [16, 20], debilitated: 12,
    yearLength: 87.9691
  },
  {
    num: 3, jyNum: 6, name: "Venus", key: "ve", ref: "SE_VENUS", icon: "♀",
    nature: ["b"], gender: "f", bhuta: "water", guna: "raj", caste: "brahmin", dhatu: "mūla", dosha: ["kapha", "vata"],
    friends: ["me", "sa"], neutral: ["ma", "ju"], enemies: ["su", "mo"],
    ownSign: [2, 7], exalted: 12, exaltedDegree: 27,
    mulaTrikon: 7, mulaTrikonDegrees: [0, 15], debilitated: 6,
    yearLength: 224.701
  },
  {
    num: 4, jyNum: 3, name: "Mars", key: "ma", ref: "SE_MARS", icon: "♂",
    nature: ["m"], gender: "n", bhuta: "fire", guna: "tam", caste: "kṣatriya", dhatu: "dhatu", dosha: ["pitta"],
    friends: ["su", "mo", "ju"], neutral: ["ve", "sa"], enemies: ["me"],
    ownSign: [1, 8], exalted: 10, exaltedDegree: 28,
    mulaTrikon: 1, mulaTrikonDegrees: [0, 12], debilitated: 4,
    yearLength: 686.971
  },
  {
    num: 5, jyNum: 5, name: "Jupiter", key: "ju", ref: "SE_JUPITER", icon: "♃",
    nature: ["b"], gender: "n", bhuta: "akasha", guna: "sat", caste: "brahmin", dhatu: "jiva", dosha: ["kapha"],
    friends: ["su", "mo", "ma"], neutral: ["sa"], enemies: ["me", "ve"],
    ownSign: [9, 12], exalted: 4, exaltedDegree: 5,
    mulaTrikon: 9, mulaTrikonDegrees: [0, 10], debilitated: 10,
    yearLength: 4332.5029764
  },
  {
    num: 6, jyNum: 7, name: "Saturn", key: "sa", ref: "SE_SATURN", icon: "♄",
    nature: ["m"], gender: "n", bhuta: "air", guna: "tam", caste: "sudra", dhatu: "dhatu", dosha: ["vata"],
    friends: ["me", "ve"], neutral: ["ju"], enemies: ["su", "mo", "ma"],
    ownSign: [10, 11], exalted: 7, exaltedDegree: 20,
    mulaTrikon: 11, mulaTrikonDegrees: [0, 20], debilitated: 1,
    yearLength: 10758.97600962
  },
  {
    num: 101, jyNum: 8, name: "Rahu", key: "ra", ref: "SE_TRUE_NODE", altRef: "SE_MEAN_NODE", icon: "☊",
    nature: ["b", "m"], gender: "n", bhuta: "", guna: "tam", caste: "outcaste", dhatu: "dhatu", dosha: ["vata"],
    friends: [], neutral: [], enemies: [],
    ownSign: [11, 6], exalted: 2, exaltedDegree: 20, mulaTrikon: 11, mulaTrikonDegrees: [0, 20], debilitated: 8,
    charaKarakaMode: 'reverse'
  },
  {
    num: 102, jyNum: 9, name: "Ketu", key: "ke", ref: "SE_TRUE_NODE", altRef: "SE_MEAN_NODE", icon: "☋", calc: 'opposite',
    nature: ["b", "m"], gender: "n", bhuta: "", guna: "tam", caste: "outcaste", dhatu: "jiva", dosha: ["pitta"],
    friends: [], neutral: [], enemies: [],
    ownSign: [8, 12], exalted: 8, exaltedDegree: 20, mulaTrikon: 8, mulaTrikonDegrees: [0, 20], debilitated: 2,
    charaKarakaMode: 'none'
  },
  {
    num: 7, name: "Uranus", key: "ur", ref: "SE_URANUS", icon: "♅",
    friends: [], neutral: [], enemies: [],
    ownSign: [11],
    yearLength: 30687.649644
  },
  {
    num: 8, name: "Neptune", key: "ne", ref: "SE_NEPTUNE", icon: "♆",
    friends: [], neutral: [], enemies: [],
    ownSign: [12],
    yearLength: 60191.914560000005
  },
  {
    num: 9, name: "Pluto", key: "pl", ref: "SE_PLUTO", icon: "♇",
    friends: [], neutral: [], enemies: [],
    ownSign: [8],
    yearLength: 90558.151068
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
