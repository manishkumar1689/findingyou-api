/* const panchangaValues = [
   { num: 1, anga: "Vāra", bhuta: "Agni", ele: "Fire", type: "weekday" },
   { num: 2, anga: "Tithi", bhuta: "Jala", ele: "Water", type: "lunar day" },
   { num: 3, anga: "Karaṇa", bhuta: "Pṛthvi", ele: "Earth", type: "lunar -half day" },
   { num: 4, anga: "Yoga", bhuta: "Ākāśa", ele: "Space", type: "Sun/Moon combination" },
   { num: 5, anga: "Nakṣatra", bhuta: "Vāyu", ele: "Air", type: "lunar mansion" },
];

prefixes:

anga: panchanga
bhuta: bhuta
 */
const panchangaValues = [
  /* pañcāṅga */
  { num: 1, anga: 'vara', bhuta: 'agni', type: 'weekday' },
  { num: 2, anga: 'tithi', bhuta: 'jala', type: 'lunar day' },
  {
    num: 3,
    anga: 'karana',
    bhuta: 'prithvi',
    type: 'lunar-half day',
  },
  {
    num: 4,
    anga: 'yoga',
    bhuta: 'akasha',
    type: 'Sun/Moon combination',
  },
  {
    num: 5,
    anga: 'nakshatra',
    bhuta: 'vayu',
    type: 'lunar mansion',
  },
];

export default panchangaValues;
