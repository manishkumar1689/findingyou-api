import { Schema } from 'mongoose';
import { stringify } from 'querystring';
import { matchAspectAngle } from 'src/astrologic/lib/calc-orbs';
import { subtractLng360 } from 'src/astrologic/lib/math-funcs';
import { ChartSchema } from 'src/astrologic/schemas/chart.schema';
import { UserSchema } from 'src/user/schemas/user.schema';
import { PairedChartSchema } from '../astrologic/schemas/paired-chart.schema';

interface schemaItem {
  key: string;
  subPaths: Array<string>;
  type?: string;
}

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
  index = 0,
) => {
  const aspectAngle = matchAspectAngle(aspectKey);
  const aspectAngles = [aspectAngle];
  if (aspectAngle < 180) {
    const maxSteps = Math.floor(360 / aspectAngle);
    for (let i = 2; i <= maxSteps; i++) {
      const targetAngle = i * aspectAngle;
      if (targetAngle < 360) {
        aspectAngles.push(targetAngle);
      }
    }
  }

  const baseFields = ['_id', 'aspects'];
  const steps: Array<any> = [];
  if (index < 1) {
    steps.push({ $project: Object.fromEntries(baseFields.map(k => [k, 1])) });
  }

  const conditions: Array<any> = [];

  const addFields: Map<string, any> = new Map();
  const angleRowName = ['angleRow', index].join('');
  const angleFieldName = ['angle', index].join('');
  const diffFieldName = ['diff', index].join('');
  addFields.set(angleRowName, {
    $filter: {
      input: '$aspects',
      as: 'item',
      cond: {
        $and: [{ $eq: ['$$item.k1', k1] }, { $eq: ['$$item.k2', k2] }],
      },
    },
  });
  steps.push({
    $addFields: Object.fromEntries(addFields.entries()),
  });
  steps.push({
    $unwind: '$' + angleRowName,
  });
  const outFieldProject = {
    _id: 1,
    [angleFieldName]: '$' + angleRowName + '.value',
    [diffFieldName]: {
      $mod: [
        { $subtract: ['$' + angleRowName + '.value', aspectAngle] },
        aspectAngle,
      ],
    },
  };
  const orConditions = [];
  for (const aspAngle of aspectAngles) {
    const range = [subtractLng360(aspAngle, orb), (aspAngle + orb) % 360];
    if (range[1] >= range[0]) {
      orConditions.push({
        [angleFieldName]: {
          $gte: range[0],
          $lte: range[1],
        },
      });
    } else {
      orConditions.push({
        [angleFieldName]: {
          $gte: range[0],
          $lte: 360,
        },
      });
      orConditions.push({
        [angleFieldName]: {
          $gte: 0,
          $lte: range[1],
        },
      });
    }
  }
  conditions.push({
    $match: {
      $or: orConditions,
    },
  });

  return { steps, outFieldProject, conditions };
};

export const combineKey = (key: string, prefix = '') => {
  const parts = [key];
  if (prefix.length > 0) {
    parts.unshift(prefix);
  }
  return parts.join('.');
};

export const buildPairedChartLookupPath = (): Array<any> => {
  return [
    {
      $lookup: {
        from: 'charts',
        localField: 'c1',
        foreignField: '_id',
        as: 'c1',
      },
    },
    {
      $lookup: {
        from: 'charts',
        localField: 'c2',
        foreignField: '_id',
        as: 'c2',
      },
    },
    {
      $unwind: '$c1',
    },
    {
      $unwind: '$c2',
    },
    {
      $lookup: {
        from: 'users',
        localField: 'c1.user',
        foreignField: '_id',
        as: 'c1.user',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'c2.user',
        foreignField: '_id',
        as: 'c2.user',
      },
    },
    {
      $unwind: '$c1.user',
    },
    {
      $unwind: '$c2.user',
    },
  ];
};

export const buildChartLookupPath = () => {
  return [
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: 'user',
    },
  ];
};

export const buildPairedChartProjection = () => {
  const chartFields = deconstructSchema(PairedChartSchema);
  const mp: Map<string, any> = new Map();
  chartFields.forEach(item => {
    const baseKey = item.key;
    switch (baseKey) {
      case 'c1':
      case 'c2':
      case 'timespace':
        buildInnerChartProjection(mp, baseKey, true);
        break;
      default:
        buildFromSchema(item, mp);
        break;
    }
  });
  return Object.fromEntries(mp.entries());
};

export const buildFromSchema = (
  item: schemaItem,
  mp: Map<string, any>,
  prefix = '',
  skipFields: Array<string> = [],
) => {
  const baseKey = combineKey(item.key, prefix);
  if (skipFields.indexOf(item.key) < 0) {
    if (item.subPaths.length < 1) {
      mp.set(baseKey, 1);
    } else {
      mp.delete(baseKey);
      item.subPaths.forEach(sp => {
        const cp = [baseKey, sp].join('.');
        switch (sp) {
          case 'items':
          case 'variants':
          case 'transitions':
          case 'geo':
          case 'topo':
          case 'contacts':
            addThirdLevel(mp, baseKey, sp);
            break;
          default:
            mp.set(cp, 1);
            break;
        }
      });
    }
  }
};

export const buildChartProjection = (prefix = '', expandUser = false) => {
  const mp: Map<string, any> = new Map();
  buildInnerChartProjection(mp, prefix, expandUser);
  return Object.fromEntries(mp.entries());
};

export const buildInnerChartProjection = (
  mp: Map<string, any>,
  prefix = '',
  expandUser = false,
) => {
  const chartFields = deconstructSchema(ChartSchema);
  mp.set('_id', 1);
  chartFields.forEach(item => {
    switch (item.key) {
      case 'user':
        if (expandUser) {
          buildInnerUserProjection(mp, 'user');
        } else {
          buildFromSchema(item, mp, prefix, ['password']);
        }
        break;
      default:
        buildFromSchema(item, mp, prefix);
        break;
    }
  });
};

export const buildUserProjection = (prefix = '') => {
  const mp: Map<string, any> = new Map();
  buildInnerUserProjection(mp, prefix);
  return Object.fromEntries(mp.entries());
};

export const buildInnerUserProjection = (mp: Map<string, any>, prefix = '') => {
  const chartFields = deconstructSchema(UserSchema);
  mp.delete(prefix);
  chartFields.forEach(item => {
    buildFromSchema(item, mp, prefix, ['password']);
  });
};

export const addThirdLevel = (
  mp: Map<string, any>,
  baseKey: string,
  key: string,
) => {
  let subFields = [];
  const coreKey = baseKey.split('.').pop();
  switch (key) {
    case 'items':
      switch (coreKey) {
        case 'rashis':
          subFields = [
            'houseNum',
            'sign',
            'lordInHouse',
            'arudhaInHouse',
            'arudhaInSign',
            'arudhaInLord',
          ];
          break;
        default:
          subFields = ['type', 'key', 'value', 'refVal'];
          break;
      }
      break;
    case 'variants':
      subFields = [
        'num',
        'charaKaraka',
        'sign',
        'house',
        'nakshatra',
        'relationship',
      ];
      break;
    case 'transitions':
      subFields = ['type', 'jd'];
      break;
    case 'geo':
      subFields = ['lat', 'lng', 'alt'];
      break;
    case 'topo':
      subFields = ['lat', 'lng'];
      break;
    case 'contacts':
      subFields = ['identifier', 'mode', 'type'];
      break;
  }
  mp.delete([baseKey, key].join('.'));
  subFields.forEach(sk => {
    mp.set([baseKey, key, sk].join('.'), 1);
  });
};

export const deconstructSchema = (schemaClass: Schema) => {
  return Object.entries(schemaClass.obj).map(entry => {
    const [key, item] = entry;
    let subPaths = [];
    let dataRef = '';
    if (item instanceof Object) {
      const typeMatches = Object.entries(item)
        .filter(entry => entry[0] === 'type')
        .map(entry => entry[1]);
      const type = typeMatches.length > 0 ? typeMatches.shift() : '';
      if (type instanceof Array && type.length > 0) {
        const matchedType = type.shift();
        if (matchedType instanceof Object) {
          if (Object.keys(matchedType).includes('obj')) {
            subPaths = Object.keys(matchedType.obj);
          }
        }
        dataRef = 'Nested';
      } else {
        subPaths = [];
        if (type instanceof Function) {
          dataRef = type.toString().replace(/^function\s+(\w+)\([^§]*?$/, '$1');
        } else if (type instanceof Object) {
          if (type.singleNestedPaths instanceof Object) {
            subPaths = Object.keys(type.singleNestedPaths)
              .map(path => path.split('.').pop())
              .filter(key => key !== '_id');
            dataRef = 'SingleNested';
          }
          if (subPaths.length < 1 && type.obj instanceof Object) {
            subPaths = Object.keys(type.obj).map(path => path.split('.').pop());
            dataRef = 'SingleNested';
          }
        }
      }
    }
    return { key, subPaths, type: dataRef };
  });
};

/* export const buildChartProjection = (prefix = '') => {
  const mp: Map<string, string> = new Map();

  const chartEntries = Object.entries(PairedChartSchema.obj);
  const chartKeys = [
    'user',
    'isDefaultBirthChart',
    'datetime',
    'jd',
    'tz',
    'tzOffset',
    'ascendant',
    'mc',
    'vertex',
    'notes',
    'createdAt',
    'modifiedAt',
  ];

  const nestedObjKeys = ['subject', 'geo'];

  const nestedSetKeys = [
    'placenames',
    'grahas',
    'houses',
    'indianTime',
    'ayanamshas',
    'upagrahas',
    'sphutas',
    'numValues',
    'stringValues',
    'objects',
    'rashis',
  ];

  const subjectKeys = [
    'name',
    'notes',
    'type',
    'gender',
    'eventType',
    'roddenScale',
  ];
}; */
