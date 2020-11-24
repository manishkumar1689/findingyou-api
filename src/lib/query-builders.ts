import { matchAspectAngle } from 'src/astrologic/lib/calc-orbs';
import { subtractLng360 } from 'src/astrologic/lib/math-funcs';

const defaultGrahaKeys = [
  'su',
  'mo',
  'me',
  've',
  'ma',
  'ju',
  'ur',
  'ne',
  'pl',
  'ra',
  'ke',
];

export const unwoundChartFields = (
  ayanamshaKey = 'true_citra',
  start = 0,
  limit = 100,
  grahaKeys = [],
) => {
  const keys =
    grahaKeys instanceof Array && grahaKeys.length > 0
      ? grahaKeys
      : defaultGrahaKeys;

  const baseFields = [
    'jd',
    'geo',
    'subject',
    'ayanamshas',
    'grahas',
    'ascendant',
  ];

  const startFields = Object.fromEntries(baseFields.map(k => [k, 1]));

  const steps: Array<any> = [{ $project: startFields }];

  const addFields: Map<string, any> = new Map();

  addFields.set('ayanamsha', {
    $filter: {
      input: '$ayanamshas',
      as: 'item',
      cond: { $eq: ['$$item.key', ayanamshaKey] },
    },
  });

  keys.forEach(key => {
    addFields.set(key, {
      $filter: {
        input: '$grahas',
        as: 'graha',
        cond: { $eq: ['$$graha.key', key] },
      },
    });
  });

  steps.push({
    $addFields: Object.fromEntries(addFields.entries()),
  });
  steps.push({ $unwind: '$ayanamsha' });
  keys.forEach(key => {
    steps.push({ $unwind: ['$', key].join('') });
  });

  const projFields: Map<string, any> = new Map();

  projFields.set('name', '$subject.name');
  projFields.set('gender', '$subject.gender');
  projFields.set('ayanamsha', '$ayanamsha.value');
  projFields.set('jd', '$jd');
  projFields.set('geo', {
    lat: 1,
    lng: 1,
    alt: 1,
  });
  keys.forEach(key => {
    projFields.set(key, {
      $sum: {
        $mod: [
          {
            $subtract: [
              {
                $add: [`$${key}.lng`, 360],
              },
              '$ayanamsha.value',
            ],
          },
          360,
        ],
      },
    });
  });
  projFields.set('as', {
    $sum: {
      $mod: [
        {
          $subtract: [
            {
              $add: [
                {
                  $convert: {
                    input: '$ascendant',
                    to: 'double',
                  },
                },
                360,
              ],
            },
            '$ayanamsha.value',
          ],
        },
        360,
      ],
    },
  });
  steps.push({ $project: Object.fromEntries(projFields.entries()) });
  steps.push({ $skip: start });
  steps.push({ $limit: limit });
  return steps;
};

export const addOrbRangeMatchStep = (
  aspectKey: string,
  k1: string,
  k2: string,
  orb = 0,
) => {
  const aspectAngle = matchAspectAngle(aspectKey);
  const range = [subtractLng360(aspectAngle, orb), (aspectAngle + orb) % 360];
  const baseFields = ['_id', 'aspects'];
  const steps: Array<any> = [
    { $project: Object.fromEntries(baseFields.map(k => [k, 1])) },
  ];

  const addFields: Map<string, any> = new Map();

  addFields.set('angleRow', {
    $filter: {
      input: '$aspects',
      as: 'item',
      cond: {
        $and: [{ $eq: ['$$item.k1', k2] }, { $eq: ['$$item.k2', k2] }],
      },
    },
  });
  steps.push({
    $addFields: Object.fromEntries(addFields.entries()),
  });
  steps.push({
    $unwind: '$angleRow',
  });
  steps.push({
    $project: {
      _id: 1,
      angle: '$angleRow.value',
      diff: {
        $subtract: ['$angleRow.value', aspectAngle],
      },
    },
  });
  steps.push({
    $match: {
      angle: {
        $gte: range[0],
        $lte: range[1],
      },
    },
  });
  return steps;
};
