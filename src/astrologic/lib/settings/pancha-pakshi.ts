import { GeoPos } from '../../interfaces/geo-pos';
import {
  buildCurrentAndBirthExtendedTransitions,
  calcMoonDataJd,
  getSunMoonSpecialValues,
} from '../core';
import { julToISODate } from '../date-funcs';
import { KeyNum, KeyValueNum } from '../../../lib/interfaces';
import { Chart } from '../models/chart';
import { toIndianTimeJd, TransitionData } from '../transitions';
import {
  matchPPTransitRule,
  translateActionToGerund,
  Condition,
} from '../models/protocol-models';
import { matchDikBalaTransition } from './graha-values';
import { isNumeric, notEmptyString } from '../../../lib/validators';
import { GeoLoc } from '../models/geo-loc';
import { matchCurrentDashaLord } from '../models/dasha-set';
import { PredictiveRuleSet } from '../../../setting/interfaces/predictive-rule-set.interface';

const birdMap = { 1: 'vulture', 2: 'owl', 3: 'crow', 4: 'cock', 5: 'peacock' };

const birdAttributes = [
  {
    waxing: { color: 'white', directions: ['E'] },
    waning: { color: 'black', directions: ['E'] },
  },
  {
    waxing: { color: 'yellow', directions: ['S'] },
    waning: { color: 'red', directions: ['N'] },
  },
  {
    waxing: { color: 'red', directions: ['W', 'NW'] },
    waning: { color: 'yellow', directions: ['S'] },
  },
  {
    waxing: { color: 'green', directions: ['N', 'NE'] },
    waning: { color: 'white', directions: ['M'] },
  },
  {
    waxing: { color: 'black', directions: ['M'] },
    waning: { color: 'green', directions: ['W'] },
  },
];

const waxWaneKey = (isWaxing = true): string =>
  isWaxing ? 'waxing' : 'waning';

const dayNightKey = (isDayTime = true): string => (isDayTime ? 'day' : 'night');

export const birdNakshatraRanges = [
  { range: [1, 5], waxing: 1, waning: 5 },
  { range: [6, 11], waxing: 2, waning: 4 },
  { range: [12, 16], waxing: 3, waning: 3 },
  { range: [17, 21], waxing: 4, waning: 2 },
  { range: [22, 27], waxing: 5, waning: 1 },
];

export const birdRelations = {
  waxing: [
    ['S', 'F', 'E', 'E', 'F'],
    ['F', 'S', 'F', 'E', 'E'],
    ['E', 'F', 'S', 'F', 'E'],
    ['E', 'E', 'F', 'S', 'F'],
    ['F', 'E', 'E', 'F', 'S'],
  ],
  waning: [
    ['S', 'E', 'F', 'E', 'F'],
    ['E', 'S', 'F', 'F', 'E'],
    ['F', 'F', 'S', 'E', 'E'],
    ['E', 'E', 'F', 'S', 'F'],
    ['F', 'E', 'E', 'F', 'S'],
  ],
};

export interface Yama {
  value: number;
  sub: number;
}

export interface SubYama {
  bird: string;
  key: string;
  value: string;
  start: string;
  end: string;
  current?: false;
  direction?: string;
  rulers?: string[];
  relation?: string;
  score?: number;
  isDayTime?: boolean;
}

export const birdActivitiesDirections = [
  {
    num: 1,
    waxing: {
      eating: 'E',
      walking: 'S',
      ruling: 'W',
      sleeping: 'N',
      dying: 'NE',
    },
    waning: {
      eating: 'N',
      walking: 'SW',
      ruling: 'SW',
      sleeping: 'NW',
      dying: 'NE',
    },
  },
  {
    num: 2,
    waxing: {
      eating: 'S',
      walking: 'W',
      ruling: 'N',
      sleeping: 'E',
      dying: 'SW',
    },
    waning: {
      eating: 'N',
      walking: 'SE',
      ruling: 'SW',
      sleeping: 'NW',
      dying: 'NE',
    },
  },
  {
    num: 3,
    waxing: {
      eating: 'W',
      walking: 'N',
      ruling: 'E',
      sleeping: 'SW',
      dying: 'SW',
    },
    waning: {
      eating: 'E',
      walking: 'SE',
      ruling: 'W',
      sleeping: 'NW',
      dying: 'NE',
    },
  },
  {
    num: 4,
    waxing: {
      eating: 'N',
      walking: 'E',
      ruling: 'S',
      sleeping: 'SW',
      dying: 'NW',
    },
    waning: {
      eating: 'S',
      walking: 'SW',
      ruling: 'N',
      sleeping: 'E',
      dying: 'SE',
    },
  },
  {
    num: 5,
    waxing: {
      eating: 'N',
      walking: 'S',
      ruling: 'W',
      sleeping: 'SW',
      dying: 'E',
    },
    waning: {
      eating: 'W',
      walking: 'N',
      ruling: 'E',
      sleeping: 'S',
      dying: 'SW',
    },
  },
];

export const birdDayValues = [
  {
    num: 1,
    waxing: {
      day: {
        ruling: 1,
        dying: 2,
      },
      night: {
        ruling: 3,
        dying: 2,
      },
    },
    waning: {
      day: {
        ruling: 4,
        dying: 3,
      },
      night: {
        ruling: 1,
        dying: 3,
      },
    },
  },
  {
    num: 2,
    waxing: {
      day: {
        ruling: 2,
        dying: 3,
      },
      night: {
        ruling: 4,
        dying: 3,
      },
    },
    waning: {
      day: {
        ruling: 5,
        dying: 2,
      },
      night: {
        ruling: 4,
        dying: 2,
      },
    },
  },
  {
    num: 3,
    waxing: {
      day: {
        ruling: 1,
        dying: 4,
      },
      night: {
        ruling: 3,
        dying: 4,
      },
    },
    waning: {
      day: {
        ruling: 4,
        dying: 1,
      },
      night: {
        ruling: 1,
        dying: 1,
      },
    },
  },
  {
    num: 4,
    waxing: {
      day: {
        ruling: 2,
        dying: 5,
      },
      night: {
        ruling: 4,
        dying: 5,
      },
    },
    waning: {
      day: {
        ruling: 3,
        dying: 5,
      },
      night: {
        ruling: 2,
        dying: 5,
      },
    },
  },
  {
    num: 5,
    waxing: {
      day: {
        ruling: 3,
        dying: 1,
      },
      night: {
        ruling: 5,
        dying: 1,
      },
    },
    waning: {
      day: {
        ruling: 2,
        dying: 4,
      },
      night: {
        ruling: 3,
        dying: 4,
      },
    },
  },
  {
    num: 6,
    waxing: {
      day: {
        ruling: 4,
        dying: 2,
      },
      night: {
        ruling: 1,
        dying: 2,
      },
    },
    waning: {
      day: {
        ruling: 1,
        dying: 5,
      },
      night: {
        ruling: 5,
        dying: 5,
      },
    },
  },
  {
    num: 7,
    waxing: {
      day: {
        ruling: 5,
        dying: 1,
      },
      night: {
        ruling: 2,
        dying: 1,
      },
    },
    waning: {
      day: {
        ruling: 5,
        dying: 4,
      },
      night: {
        ruling: 4,
        dying: 4,
      },
    },
  },
];

export const panchaStrengthBaseValues = [
  {
    nums: {
      waxing: 3,
      waning: 3,
    },
    percent: 100,
    ruling: {
      ruling: 1,
      eating: 0.8,
      walking: 0.6,
      sleeping: 0.4,
      dying: 0.2,
    },
    eating: {
      ruling: 0.8,
      eating: 0.64,
      walking: 0.48,
      sleeping: 0.32,
      dying: 0.16,
    },
    walking: {
      ruling: 0.6,
      eating: 0.48,
      walking: 0.36,
      sleeping: 0.24,
      dying: 0.12,
    },
    sleeping: {
      ruling: 0.4,
      eating: 0.32,
      walking: 0.24,
      sleeping: 0.16,
      dying: 0.08,
    },
    dying: {
      ruling: 0.2,
      eating: 0.16,
      walking: 0.12,
      sleeping: 0.08,
      dying: 0.04,
    },
  },
  {
    nums: {
      waxing: 1,
      waning: 1,
    },
    percent: 75,
    ruling: {
      ruling: 0.75,
      eating: 0.6,
      walking: 0.45,
      sleeping: 0.3,
      dying: 0.15,
    },
    eating: {
      ruling: 0.6,
      eating: 0.48,
      walking: 0.36,
      sleeping: 0.24,
      dying: 0.12,
    },
    walking: {
      ruling: 0.45,
      eating: 0.36,
      walking: 0.27,
      sleeping: 0.18,
      dying: 0.09,
    },
    sleeping: {
      ruling: 0.3,
      eating: 0.24,
      walking: 0.18,
      sleeping: 0.12,
      dying: 0.06,
    },
    dying: {
      ruling: 0.15,
      eating: 0.12,
      walking: 0.09,
      sleeping: 0.06,
      dying: 0.03,
    },
  },
  {
    nums: {
      waxing: 2,
      waning: 4,
    },
    percent: 50,
    ruling: {
      ruling: 0.25,
      eating: 0.2,
      walking: 0.15,
      sleeping: 0.1,
      dying: 0.05,
    },
    eating: {
      ruling: 0.2,
      eating: 0.16,
      walking: 0.12,
      sleeping: 0.08,
      dying: 0.04,
    },
    walking: {
      ruling: 0.15,
      eating: 0.12,
      walking: 0.09,
      sleeping: 0.06,
      dying: 0.03,
    },
    sleeping: {
      ruling: 0.1,
      eating: 0.08,
      walking: 0.06,
      sleeping: 0.04,
      dying: 0.02,
    },
    dying: {
      ruling: 0.05,
      eating: 0.04,
      walking: 0.03,
      sleeping: 0.02,
      dying: 0.01,
    },
  },
  {
    nums: {
      waxing: 4,
      waning: 2,
    },
    percent: 25,
    ruling: {
      ruling: 0.5,
      eating: 0.4,
      walking: 0.3,
      sleeping: 0.2,
      dying: 0.1,
    },
    eating: {
      ruling: 0.4,
      eating: 0.32,
      walking: 0.24,
      sleeping: 0.16,
      dying: 0.08,
    },
    walking: {
      ruling: 0.3,
      eating: 0.24,
      walking: 0.18,
      sleeping: 0.12,
      dying: 0.06,
    },
    sleeping: {
      ruling: 0.2,
      eating: 0.16,
      walking: 0.12,
      sleeping: 0.08,
      dying: 0.04,
    },
    dying: {
      ruling: 0.1,
      eating: 0.08,
      walking: 0.06,
      sleeping: 0.04,
      dying: 0.02,
    },
  },
  {
    nums: {
      waxing: 5,
      waning: 5,
    },
    percent: 12.5,
    ruling: {
      ruling: 0.125,
      eating: 0.1,
      walking: 0.075,
      sleeping: 0.05,
      dying: 0.025,
    },
    eating: {
      ruling: 0.1,
      eating: 0.08,
      walking: 0.06,
      sleeping: 0.04,
      dying: 0.02,
    },
    walking: {
      ruling: 0.075,
      eating: 0.06,
      walking: 0.045,
      sleeping: 0.03,
      dying: 0.015,
    },
    sleeping: {
      ruling: 0.05,
      eating: 0.04,
      walking: 0.03,
      sleeping: 0.02,
      dying: 0.1,
    },
    dying: {
      ruling: 0.025,
      eating: 0.02,
      walking: 0.015,
      sleeping: 0.1,
      dying: 0.005,
    },
  },
];

// { 1: 'vulture', 2: 'owl', 3: 'crow', 4: 'cock', 5: 'peacock' };
export const birdGrahas = {
  waxing: [
    { num: 1, rulers: ['me', 'mo'] },
    { num: 2, rulers: ['ju'] },
    { num: 3, rulers: ['ra', 'sa'] },
    { num: 4, rulers: ['su', 'ma', 'ke'] },
    { num: 5, rulers: ['ve'] },
  ],
  waning: [
    { num: 1, rulers: ['me'] },
    { num: 2, rulers: ['ju'] },
    { num: 3, rulers: ['ra', 'sa', 'mo'] },
    { num: 4, rulers: ['su', 'ma', 'ke'] },
    { num: 5, rulers: ['ve'] },
  ],
};

export const birdRulers = [
  { num: 1, death: ['ju', 'sa'], day: ['su', 'ma'], night: ['ve'] },
  { num: 5, death: ['me'], day: ['sa'], night: ['ju'] },
  { num: 2, death: ['su', 've'], day: ['mo', 'me'], night: ['sa'] },
  { num: 4, death: ['ma'], day: ['ve'], night: ['mo', 'me'] },
  { num: 3, death: ['mo'], day: ['ju'], night: ['su', 'ma'] },
];

export const birdActivities = [
  {
    num: 1,
    waxing: {
      day: ['eating', 'walking', 'ruling', 'sleeping', 'dying'],
      night: ['dying', 'ruling', 'eating', 'sleeping', 'walking'],
    },
    waning: {
      day: ['walking', 'dying', 'ruling', 'eating', 'sleeping'],
      night: ['eating', 'ruling', 'dying', 'walking', 'sleeping'],
    },
  },
  {
    num: 2,
    waxing: {
      day: ['dying', 'eating', 'walking', 'ruling', 'sleeping'],
      night: ['walking', 'dying', 'ruling', 'eating', 'sleeping'],
    },
    waning: {
      day: ['sleeping', 'walking', 'dying', 'ruling', 'eating'],
      night: ['dying', 'walking', 'sleeping', 'eating', 'ruling'],
    },
  },
  {
    num: 3,
    waxing: {
      day: ['eating', 'walking', 'ruling', 'sleeping', 'dying'],
      night: ['dying', 'ruling', 'eating', 'sleeping', 'walking'],
    },
    waning: {
      day: ['walking', 'dying', 'ruling', 'eating', 'sleeping'],
      night: ['eating', 'ruling', 'dying', 'walking', 'sleeping'],
    },
  },
  {
    num: 4,
    waxing: {
      day: ['dying', 'eating', 'walking', 'ruling', 'sleeping'],
      night: ['walking', 'dying', 'ruling', 'eating', 'sleeping'],
    },
    waning: {
      day: ['dying', 'ruling', 'eating', 'sleeping', 'walking'],
      night: ['sleeping', 'eating', 'ruling', 'dying', 'walking'],
    },
  },
  {
    num: 5,
    waxing: {
      day: ['sleeping', 'dying', 'eating', 'walking', 'ruling'],
      night: ['sleeping', 'walking', 'dying', 'ruling', 'eating'],
    },
    waning: {
      day: ['ruling', 'eating', 'sleeping', 'walking', 'dying'],
      night: ['walking', 'sleeping', 'eating', 'ruling', 'dying'],
    },
  },
  {
    num: 6,
    waxing: {
      day: ['ruling', 'sleeping', 'dying', 'eating', 'walking'],
      night: ['eating', 'sleeping', 'walking', 'dying', 'ruling'],
    },
    waning: {
      day: ['eating', 'sleeping', 'walking', 'dying', 'ruling'],
      night: ['ruling', 'dying', 'walking', 'sleeping', 'eating'],
    },
  },
  {
    num: 7,
    waxing: {
      day: ['walking', 'ruling', 'sleeping', 'dying', 'eating'],
      night: ['ruling', 'eating', 'sleeping', 'walking', 'dying'],
    },
    waning: {
      day: ['sleeping', 'walking', 'dying', 'ruling', 'eating'],
      night: ['dying', 'walking', 'sleeping', 'eating', 'ruling'],
    },
  },
];

export const birdActivityYamaCycle = {
  waxing: {
    day: ['eating', 'walking', 'ruling', 'sleeping', 'dying'],
    night: ['dying', 'walking', 'sleeping', 'eating', 'ruling'],
  },
  waning: {
    day: ['walking', 'eating', 'dying', 'sleeping', 'ruling'],
    night: ['eating', 'sleeping', 'walking', 'dying', 'ruling'],
  },
};

export const dayBirdMatches = [
  {
    num: 1,
    waxing: {
      day: 1,
      night: 3,
      dying: 2,
    },
    waning: {
      day: 4,
      night: 1,
      dying: 3,
    },
  },
  {
    num: 2,
    waxing: {
      day: 2,
      night: 4,
      dying: 3,
    },
    waning: {
      day: 5,
      night: 4,
      dying: 2,
    },
  },
  {
    num: 3,
    waxing: {
      day: 1,
      night: 3,
      dying: 4,
    },
    waning: {
      day: 4,
      night: 1,
      dying: 1,
    },
  },
  {
    num: 4,
    waxing: {
      day: 2,
      night: 4,
      dying: 5,
    },
    waning: {
      day: 3,
      night: 2,
      dying: 5,
    },
  },
  {
    num: 5,
    waxing: {
      day: 3,
      night: 5,
      dying: 1,
    },
    waning: {
      day: 2,
      night: 3,
      dying: 4,
    },
  },
  {
    num: 6,
    waxing: {
      day: 4,
      night: 1,
      dying: 2,
    },
    waning: {
      day: 1,
      night: 5,
      dying: 5,
    },
  },
  {
    num: 7,
    waxing: {
      day: 5,
      night: 2,
      dying: 1,
    },
    waning: {
      day: 5,
      night: 4,
      dying: 4,
    },
  },
];

// expressed in 24ths. Multiply by 5 to scale as minutes of 2:24m (144 minutes);
export const yamaSubdivisions = [
  {
    key: 'eating',
    waxing: {
      day: 5,
      night: 5,
    },
    waning: {
      day: 8,
      night: 7,
    },
  },
  {
    key: 'walking',
    waxing: {
      day: 6,
      night: 5,
    },
    waning: {
      day: 6,
      night: 7,
    },
  },
  {
    key: 'ruling',
    waxing: {
      day: 8,
      night: 4,
    },
    waning: {
      day: 3,
      night: 3,
    },
  },
  {
    key: 'sleeping',
    waxing: {
      day: 3,
      night: 4,
    },
    waning: {
      day: 2,
      night: 3,
    },
  },
  {
    key: 'dying',
    waxing: {
      day: 2,
      night: 6,
    },
    waning: {
      day: 5,
      night: 4,
    },
  },
];

const matchBirdKeyByNum = (num = 0) => {
  return num >= 1 && num <= 5 ? birdMap[num] : '';
};

const matchBirdNumByKey = (key = ''): number => {
  const pair = Object.entries(birdMap).find(entry => entry[1] === key);
  return pair instanceof Array ? parseInt(pair[0]) : 0;
};

export const birdGrahasByKey = (birdKey = '', waxing = true) => {
  const bn = matchBirdNumByKey(birdKey);
  if (bn > 0) {
    const segment = waxing ? 'waxing' : 'waning';
    const row = birdGrahas[segment].find(r => r.num === bn);
    return row instanceof Object ? row.rulers : [];
  } else {
    return [];
  }
};

export const matchBirdByNak = (nakNum = 0, waxing = false) => {
  const row = birdNakshatraRanges.find(
    row => nakNum >= row.range[0] && nakNum <= row.range[1],
  );
  const num = row instanceof Object ? (waxing ? row.waxing : row.waning) : 0;
  const key = num > 0 && num <= 5 ? birdMap[num] : '';
  return { num, key };
};

export const matchBirdByLng = (moonLng = 0, waxing = false) => {
  const nakNum = Math.floor(moonLng / (360 / 27)) + 1;
  return matchBirdByNak(nakNum, waxing);
};

export const matchBirdByNum = (num = 0) => {
  const keys = Object.values(birdMap);
  const key = num > 0 && num < keys.length ? keys[num - 1] : '';
  return { num, key };
};

export const matchBirdRelations = (bird1 = 0, bird2 = 0, waxing = true) => {
  let letter = 'N';
  if (bird1 > 0 && bird2 > 0 && bird1 <= 5 && bird2 <= 5) {
    letter = birdRelations[waxWaneKey(waxing)][bird1 - 1][bird2 - 1];
  }
  return letter;
};

export const matchBirdRulers = (
  birdNum = 0,
  isDayTime = false,
  activity = '',
): string[] => {
  const row = birdRulers.find(r => r.num === birdNum);
  const hasRow = row instanceof Object;
  if (hasRow) {
    return activity === 'dying' ? row.death : isDayTime ? row.day : row.night;
  } else {
    return [];
  }
};

export const matchBirdKeyRulers = (
  key = '',
  isDayTime = false,
  activity = '',
): string[] => {
  const birdNum = matchBirdNumByKey(key);
  return matchBirdRulers(birdNum, isDayTime, activity);
};

export const matchBirdRelationsKeys = (bird1 = '', bird2 = '') => {
  const birdValues = Object.values(birdMap);
  const num1 = birdValues.indexOf(bird1) + 1;
  const num2 = birdValues.indexOf(bird2) + 1;
  return matchBirdRelations(num1, num2);
};

export const matchBirdDayValue = (
  dayNum = 0,
  waxing = false,
  isNight = false,
) => {
  const dayRow = birdDayValues.find(row => row.num === dayNum);
  const itemSet =
    dayRow instanceof Object ? (waxing ? dayRow.waxing : dayRow.waning) : null;
  return itemSet instanceof Object
    ? isNight
      ? itemSet.night
      : itemSet.day
    : { ruling: 0, dying: 0 };
};

export const matchBirdDayRuler = (
  dayNum = 0,
  waxing = false,
  isNight = false,
) => {
  const item = matchBirdDayValue(dayNum, waxing, isNight);
  return {
    ruling: matchBirdByNum(item.ruling),
    dying: matchBirdByNum(item.dying),
  };
};

export const matchBirdActivity = (
  birdNum = 0,
  dayNum = 0,
  waxing = true,
  isDayTime = true,
) => {
  const row = birdActivities.find(row => row.num === dayNum);
  const itemSet = row instanceof Object ? row[waxWaneKey(waxing)] : null;
  const actKeys =
    itemSet instanceof Object ? (isDayTime ? itemSet.day : itemSet.night) : [];
  const birdIndex = birdNum - 1;
  const key = birdNum <= 5 && birdNum > 0 ? birdMap[birdNum] : '';
  const activity =
    birdIndex >= 0 && birdIndex < actKeys.length ? actKeys[birdIndex] : '';
  return {
    key,
    activity,
  };
};

export const matchDayBirds = (
  dayNum = 0,
  isWaxing = true,
  isDayTime = true,
) => {
  const row = dayBirdMatches.find(row => row.num === dayNum);
  const isMatched = row instanceof Object;
  const ruling = isMatched
    ? row[waxWaneKey(isWaxing)][dayNightKey(isDayTime)]
    : 0;
  const dying = isMatched ? row[waxWaneKey(isWaxing)].dying : 0;
  return { ruling, dying };
};

export const expandBirdAttributes = (birdNum = 0, isWaxing = true) => {
  const birdIndex = birdNum > 0 && birdNum <= 5 ? birdNum - 1 : 0;
  const attrs = birdAttributes[birdIndex][waxWaneKey(isWaxing)];
  return { key: birdMap[birdNum], ...attrs };
};

export const matchDayBirdKeys = (
  dayNum = 0,
  isWaxing = true,
  isDayTime = true,
) => {
  const { ruling, dying } = matchDayBirds(dayNum, isWaxing, isDayTime);
  const rulingB = expandBirdAttributes(ruling);
  const dyingB = expandBirdAttributes(dying);
  return { ruling: rulingB, dying: dyingB };
};

export const matchBirdActivityKey = (
  birdNum = 0,
  dayNum = 0,
  waxing = false,
  isDayTime = false,
): string => {
  return matchBirdActivity(birdNum, dayNum, waxing, isDayTime).activity;
};

export const matchBirdActivityByKey = (
  birdKey = '',
  dayNum = 0,
  waxing = false,
  isNight = false,
) => {
  const num = Object.values(birdMap).indexOf(birdKey) + 1;
  return matchBirdActivity(num, dayNum, waxing, isNight);
};

export const matchBirdDirectionByActivity = (
  birdNum = 0,
  activity = '',
  waxing = true,
): number => {
  const row = birdActivitiesDirections.find(row => row.num === birdNum);
  const rowIsMatched = row instanceof Object;
  const subSec = rowIsMatched ? row[waxWaneKey(waxing)] : null;
  const activityKeys = subSec instanceof Object ? Object.keys(subSec) : [];
  return activityKeys.includes(activity) ? subSec[activity] : '';
};

export const matchBirdKeyDirectionByActivity = (
  birdKey = '',
  activity = '',
): number => {
  const birdNum = Object.values(birdMap).indexOf(birdKey) + 1;
  return matchBirdDirectionByActivity(birdNum, activity);
};

export const calcTimeBirds = (
  birthBirdNum = 0,
  isWaxing = true,
  isDayTime = true,
) => {
  const items = Object.entries(birdMap).map(entry => {
    const [num, key] = entry;
    return { num: parseInt(num, 10), key: key };
  });
  const first = items.find(item => item.num === birthBirdNum);
  const moreThan = items.filter(item => item.num > birthBirdNum);
  const lessThan = items.filter(item => item.num < birthBirdNum);
  let others = [...moreThan, ...lessThan];
  if (!isDayTime) {
    others.reverse();
  } else if (!isWaxing && isDayTime) {
    others = [others[2], others[0], others[3], others[1]];
  }
  return [first, ...others];
};

export const calcTimeBird = (
  birthBirdNum = 0,
  yama = 0,
  isWaxing = true,
  isDayTime = true,
) => {
  const birds = calcTimeBirds(birthBirdNum, isWaxing, isDayTime);
  const yamaIndex = yama > 0 ? (yama <= 5 ? yama - 1 : 4) : 0;
  return birds[yamaIndex];
};

export const matchSubPeriods = (
  birdNum = 0,
  dayNum = 0,
  isWaxing = true,
  isDayTime = true,
) => {
  const row = birdActivities.find(row => row.num === dayNum);
  const birdIndex = birdNum > 0 ? birdNum - 1 : 0;
  const startAct: string[] =
    row instanceof Object
      ? row[waxWaneKey(isWaxing)][dayNightKey(isDayTime)][birdIndex]
      : [];
  const sequence =
    birdActivityYamaCycle[waxWaneKey(isWaxing)][dayNightKey(isDayTime)];
  const startIndex = sequence.indexOf(startAct);
  const activityKeys = [0, 1, 2, 3, 4].map(
    ki => sequence[(ki + startIndex) % 5],
  );
  return activityKeys.map(ak => {
    const ys = yamaSubdivisions.find(ya => ya.key === ak);
    if (ys instanceof Object) {
      const div = ys[waxWaneKey(isWaxing)][dayNightKey(isDayTime)];
      const { key } = ys;
      const value = div / 24;
      return {
        key,
        value,
      };
    } else {
      return {
        key: '',
        value: 0,
      };
    }
  });
};

export const calcPanchaPakshiStrength = (
  birdNum = 0,
  activityKey = '',
  subKey = '',
  waxing = true,
) => {
  const row = panchaStrengthBaseValues.find(
    row => row.nums[waxWaneKey(waxing)] === birdNum,
  );
  const matched = row instanceof Object;
  const keys = matched ? Object.keys(row) : [];
  let score = 0;
  const percent = matched && keys.includes('percent') ? row.percent : 0;
  if (keys.includes(activityKey) && row[activityKey] instanceof Object) {
    const subKeys = Object.keys(row[activityKey]);
    const multiplier = subKeys.includes(subKey) ? row[activityKey][subKey] : 0;
    score = (percent / 100) * multiplier;
  }
  return score;
};

export const calcSubPeriods = (
  subPeriods: KeyValueNum[],
  birds: KeyNum[],
  birthBirdNum = 0,
  startJd = 0,
  endJd = 0,
  refJd = 0,
  waxing = true,
  isDayTime = true,
  dayActivity: string,
  yamaIndex = 0,
) => {
  const lengthJd = endJd - startJd;
  const numBirds = birds.length;
  let prevJd = startJd;
  const dirKeys = subPeriods.map((period, index) => {
    const birdItem = index < numBirds ? birds[index] : { key: '', num: 0 };
    return matchBirdDirectionByActivity(birdItem.num, period.key, waxing);
  });
  const activityKeys = subPeriods.map(period => {
    return period.key;
  });
  return subPeriods.map((period, index) => {
    const startSubJd = prevJd;
    const endSubJd = prevJd + lengthJd * period.value;
    prevJd = endSubJd;
    const current = refJd >= startSubJd && refJd < endSubJd;
    const birdItem = index < numBirds ? birds[index] : null;
    const birdMatched = birdItem instanceof Object;
    const bird = birdMatched ? birdItem.key : '';
    const birdNum = birdMatched ? birdItem.num : 0;
    const shiftIndex = (index + yamaIndex + 5) % 5;
    const direction = dirKeys[shiftIndex];
    const actKey = activityKeys[shiftIndex];
    const rulers = matchBirdRulers(birdNum, isDayTime, actKey);
    const relation = matchBirdRelations(birthBirdNum, birdNum, waxing);
    const score = calcPanchaPakshiStrength(
      birthBirdNum,
      dayActivity,
      actKey,
      waxing,
    );
    return {
      bird,
      ...period,
      key: actKey,
      start: startSubJd,
      end: endSubJd,
      current,
      direction,
      rulers,
      relation,
      score,
    };
  });
};

export const calcYamaSets = (
  jd = 0,
  startJd = 0,
  endJd = 0,
  isWaxing = true,
  isDayTime = false,
  birthBirdNum = 0,
  dayNum = 0,
) => {
  const lengthJd = endJd - startJd;
  const progressJd = jd - startJd;
  const progress = progressJd / lengthJd;
  const subProgress = (progress % 0.2) * 5;
  const yamas = [1, 2, 3, 4, 5].map((num, yi) => {
    const subLength = lengthJd / 5;
    return {
      num,
      start: startJd + subLength * yi,
      end: startJd + subLength * num,
    };
  });

  const yama = (Math.floor(progress * 5) % 5) + 1;
  const subPeriods = matchSubPeriods(birthBirdNum, dayNum, isWaxing, isDayTime);
  const birds = calcTimeBirds(birthBirdNum, isWaxing, isDayTime);
  const dayActivity = matchBirdActivityKey(
    birthBirdNum,
    dayNum,
    isWaxing,
    isDayTime,
  );
  const yamaSets = yamas.map((yama, index) => {
    const subs = calcSubPeriods(
      subPeriods,
      birds,
      birthBirdNum,
      yama.start,
      yama.end,
      jd,
      isWaxing,
      isDayTime,
      dayActivity,
      index,
    );
    return { ...yama, subs };
  });
  return {
    lengthJd,
    progress,
    subProgress,
    yama,
    yamas: yamaSets,
  };
};

export const panchaPakshiDayNightSet = async (
  jd = 0,
  geo: GeoPos,
  chart: Chart,
  fetchNightAndDay = true,
): Promise<Map<string, any>> => {
  const data: Map<string, any> = new Map();
  const iTime = await toIndianTimeJd(jd, geo);
  const setBefore = fetchNightAndDay ? iTime.rise.jd > iTime.set.jd : false;
  const dayBefore = fetchNightAndDay ? false : iTime.dayBefore;
  const periodStart = dayBefore ? iTime.prevSet.jd : iTime.rise.jd;
  const periodEnd = dayBefore
    ? iTime.rise.jd
    : setBefore
    ? iTime.nextSet.jd
    : iTime.set.jd;
  const riseJd = setBefore ? periodStart : iTime.rise.jd;
  const setJd = setBefore ? periodEnd : iTime.set.jd;
  data.set('rise', riseJd);
  data.set('set', setJd);
  data.set('nextRise', iTime.nextRise.jd);
  data.set('riseDt', julToISODate(riseJd));
  data.set('setDt', julToISODate(setJd));
  data.set('nextRiseDt', julToISODate(iTime.nextRise.jd));
  data.set('isDayTime', iTime.isDayTime);
  data.set('bornDayTime', chart.indianTime.isDayTime);
  data.set('bornWeekDay', chart.indianTime.weekDayNum);
  chart.setAyanamshaItemByNum(27);
  const moon = chart.graha('mo');
  const moonJd = fetchNightAndDay ? iTime.rise.jd : jd;
  const current = await calcMoonDataJd(moonJd);
  data.set('geo', {
    birth: chart.geo,
    current: geo,
  });
  data.set('moon', {
    birth: {
      lng: moon.longitude,
      nakshatra27: moon.nakshatra27,
      waxing: chart.moonWaxing,
    },
    current,
  });
  const isDayTime = fetchNightAndDay ? true : iTime.isDayTime;
  const bird = matchBirdByNak(moon.nakshatra27, chart.moonWaxing);
  const currentBirds = matchDayBirdKeys(
    iTime.weekDayNum,
    current.waxing,
    isDayTime,
  );
  data.set('bird', {
    birth: bird.key,
    current: currentBirds,
  });
  const yamaData = calcYamaSets(
    jd,
    periodStart,
    periodEnd,
    current.waxing,
    isDayTime,
    bird.num,
    iTime.weekDayNum,
  );
  data.set('yamas', yamaData.yamas);
  data.set('lengthJd', yamaData.lengthJd);
  data.set('period', isDayTime ? 'day' : 'night');
  const special: any = {
    day: getSunMoonSpecialValues(moonJd, iTime, current.sunLng, current.lng),
  };

  if (fetchNightAndDay) {
    const jd2 = jd + 0.5;
    //const iTime2 = await toIndianTimeJd(jd2, geo);
    const moon2Jd = iTime.set.jd;
    const next = await calcMoonDataJd(moon2Jd);
    const period2Start = periodEnd;
    const period2End = iTime.nextRise.jd;
    const isDayTime2 = !isDayTime;
    const yamaData2 = calcYamaSets(
      jd2,
      period2Start,
      period2End,
      next.waxing,
      isDayTime2,
      bird.num,
      iTime.weekDayNum,
    );
    data.set('yamas2', yamaData2.yamas);
    data.set('lengthJd2', yamaData2.lengthJd);
    const mn = data.get('moon');
    data.set('moon', { ...mn, next });
    const bd = data.get('bird');
    const nextBirds = matchDayBirdKeys(
      iTime.weekDayNum,
      next.waxing,
      isDayTime2,
    );
    data.set('bird', { ...bd, next: nextBirds });
    data.set('period2', isDayTime2 ? 'day' : 'night');
    special.night = getSunMoonSpecialValues(
      moon2Jd,
      iTime,
      next.sunLng,
      next.lng,
    );
  }
  data.set('special', special);
  data.set('valid', yamaData.yamas.length === 5);
  return data;
};

export const toTransitKey = (abbr: string) => {
  const key = abbr.toLowerCase();
  switch (key) {
    case 'ds':
      return 'set';
    case 'as':
      return 'rise';
    default:
      return key;
  }
};

interface BirdGraha {
  bird: string;
  grahas: string[];
}

interface DayNightBirdGraha {
  day: BirdGraha;
  night: BirdGraha;
}

class BirdGrahaSet {
  birth: BirdGraha;
  ruling: DayNightBirdGraha;
  dying: BirdGraha;

  constructor(ppData: Map<string, any> = new Map()) {
    const bird = ppData.has('bird')
      ? ppData.get('bird')
      : {
          birth: '',
          current: {
            dying: '',
            ruling: '',
          },
        };
    const moon = ppData.get('moon');
    const { birth } = bird;
    const isDayTime = ppData.has('isDayTime') ? ppData.get('isDayTime') : true;
    const firstSegment = isDayTime ? 'current' : 'next';
    const waxing = moon instanceof Object ? moon[firstSegment].waxing : true;
    const dying = bird.current.dying.key;
    const rulingDay = isDayTime
      ? bird.current.ruling.key
      : bird.next.ruling.key;
    const rulingNight = isDayTime
      ? bird.next.ruling.key
      : bird.current.ruling.key;
    const birthBirdGraha = birdGrahasByKey(birth, waxing);
    const rulingDayGraha = birdGrahasByKey(rulingDay, waxing);
    const rulingNightGraha = birdGrahasByKey(rulingNight, waxing);
    const dyingGraha = birdGrahasByKey(dying, waxing);
    this.birth = {
      bird: birth,
      grahas: birthBirdGraha,
    };
    this.ruling = {
      day: {
        bird: rulingDay,
        grahas: rulingDayGraha,
      },
      night: {
        bird: rulingNight,
        grahas: rulingNightGraha,
      },
    };
    this.dying = {
      bird: dying,
      grahas: dyingGraha,
    };
  }

  matchGrahas(type = '', isDayTime = false): string[] {
    switch (type) {
      case 'ruling':
        const segment = isDayTime ? 'day' : 'night';
        return this.ruling[segment].grahas;
      case 'birth':
      case 'dying':
        return this[type].grahas;
      default:
        return [];
    }
  }

  matchBird(type = '', isDayTime = false): string {
    switch (type) {
      case 'ruling':
        const segment = isDayTime ? 'day' : 'night';
        return this.ruling[segment].bird;
      case 'birth':
      case 'dying':
        return this[type].bird;
      default:
        return '';
    }
  }
}

const mapBirdSet = (ppData: Map<string, any> = new Map()): BirdGrahaSet => {
  return new BirdGrahaSet(ppData);
};

export class PPRule {
  from = '';
  to = '';
  key = '';
  context = '';
  action = '';
  onlyAtStart = false;
  always = false;
  score = 0;
  max = 10;
  siblings = [];
  operator = '';
  isMaster = false;

  constructor(rs: PredictiveRuleSet, condRef = null, isMaster = true) {
    const cond = new Condition(condRef);
    let scRow = rs.scores.find(sc => sc.key === 'generic');
    if (!scRow && rs.scores.length > 0) {
      scRow = rs.scores[0];
    }
    if (scRow instanceof Object) {
      this.score = scRow.value;
      this.max = scRow.maxScore;
    }
    if (cond instanceof Object) {
      const condKeys = Object.keys(cond);
      if (condKeys.includes('context')) {
        this.from = cond.fromMode;
        this.to = cond.toMode;
        this.key = cond.c1Key.split('__').pop();
        this.onlyAtStart = this.key === 'yama_action';
        this.context = cond.context;
        this.always = cond.context.startsWith('action_is_');
        if (cond.context.startsWith('action_')) {
          this.action = translateActionToGerund(
            cond.context.replace('action_', ''),
          );
        } else if (this.key.includes('ing_') && this.key.startsWith('yama_')) {
          this.action = this.key.replace(/^yama_([a-z]*?ing)_[a-z]+$/, '$1');
        } else {
          this.action = cond.context;
        }
      }
      if (isMaster) {
        this.isMaster = true;
        this.operator = rs.conditionSet.operator;
        if (rs.conditionSet.conditionRefs.length > 1) {
          this.siblings =
            rs.conditionSet.conditionRefs.length > 1
              ? rs.conditionSet.conditionRefs
                  .slice(1)
                  .map(c => new PPRule(rs, c, false))
              : [];
        }
      }
    }
  }
}

export const mapPPCondition = (condRef = null, rs: PredictiveRuleSet) => {
  return new PPRule(rs, condRef, true);
};

/* const transitContexts = [
  'as',
  'mc',
  'ds',
  'ic',
  'dik_bala_transition',
  'dasha_lord',
  'antardasha_lord',
  'yoga_karaka',
  'lord_5_9',
  'lord_1_4_7_10',
  'lord_6_8_12',
  'yogi_graha',
  'avayogi_graha',
]; */

/*
['birth_bird_graha',
'day_ruling_bird_graha',
'day_dying_bird_graha',
'yama_ruling_graha',
'yama_eating_graha',
'yama_walking_graha',
'yama_sleeping_graha',
'yama_dying_graha',
'fortune',
'spirit',
'brighu_bindu',
'yogi_point',
'yogi_graha',
'avayogi_point',
'avayogi_graha']
*/
const filterDashaLordByObjectType = (
  dashaLord: string,
  allSubs: SubYama[] = [],
  birdsSet: BirdGrahaSet,
  subKey = '',
): SubYama[] => {
  switch (subKey) {
    case 'birth_bird_graha':
      return allSubs.filter(sub =>
        birdsSet.matchGrahas('birth', sub.isDayTime).includes(dashaLord),
      );
      break;
    case 'day_ruling_bird_graha':
      return allSubs.filter(sub =>
        birdsSet.matchGrahas('ruling', sub.isDayTime).includes(dashaLord),
      );
    case 'day_dying_bird_graha':
      return allSubs.filter(sub =>
        birdsSet.matchGrahas('dying', sub.isDayTime).includes(dashaLord),
      );
    case 'yama_ruling_graha':
    case 'yama_eating_graha':
    case 'yama_walking_graha':
    case 'yama_sleeping_graha':
    case 'yama_dying_graha':
      return allSubs.filter(
        sub => sub.rulers.includes(dashaLord) && subKey.includes(sub.key),
      );
    default:
      return [];
  }
};

export class TransitionOrb {
  start = 0;
  end = 0;

  constructor(peak = 0, orb = 0) {
    if (peak > 0 && orb > 0) {
      this.start = peak - orb;
      this.end = peak + orb;
    }
  }

  get valid() {
    return this.start > 0 && this.end > this.start;
  }

  get span(): number {
    return this.end - this.start;
  }

  get halfSpan(): number {
    return this.span / 2;
  }

  get mid(): number {
    return this.end - this.halfSpan;
  }

  inRange(jd = 0) {
    return this.valid && jd >= this.start && jd <= this.end;
  }

  calcScore(jd = 0, score = 0): number {
    const distJd = Math.abs(this.mid - jd);
    const dist = 1 - distJd / this.halfSpan;
    return score * dist;
  }
}

export const matchTransitionPeak = (rk = '', relTr: TransitionData): number => {
  switch (rk) {
    case 'as':
    case 'rise':
    case 'rising':
      return relTr.rise.jd;
    case 'ds':
    case 'set':
    case 'setting':
      return relTr.set.jd;
    case 'mc':
    case 'ic':
      return relTr[rk].jd;
    default:
      return -1;
  }
};

const mapLords = (chart: Chart, key = '') => {
  const houseNums = key
    .split('_')
    .filter(isNumeric)
    .map(n => parseInt(n, 10));
  return houseNums.map(n => chart.matchLord(n));
};

export const matchTransitionRange = (
  rk = '',
  relTr: TransitionData,
): TransitionOrb => {
  const orbMin = (1 / (24 * 60)) * 10;
  const peak = matchTransitionPeak(rk, relTr);
  return new TransitionOrb(peak, orbMin);
};

export const calculatePanchaPakshiData = async (
  chart: Chart,
  jd = 0,
  geo: GeoLoc,
  rules: any[],
  showTransitions = false,
  fetchNightAndDay = true,
): Promise<Map<string, any>> => {
  let data: Map<string, any> = new Map(
    Object.entries({
      jd: 0,
      dtUtc: '',
      valid: false,
      geo: null,
      rise: 0,
      set: 0,
      nextRise: 0,
      riseDt: '',
      setDt: '',
      nextRiseDt: '',
      moon: null,
      bird: null,
      yamas: [],
    }),
  );
  const ppData = await panchaPakshiDayNightSet(
    jd,
    geo,
    chart,
    fetchNightAndDay,
  );
  if (ppData.get('valid')) {
    data = new Map([...data, ...ppData]);
    data.set('message', 'valid data set');
  }
  if (showTransitions) {
    const {
      transitions,
      birthTransitions,
    } = await buildCurrentAndBirthExtendedTransitions(chart, geo, jd);

    data.set('transitions', transitions);
    data.set('birthTransitions', birthTransitions);
    const transitRules = rules.filter(r => r.from.startsWith('pa') === false);
    const ppRules = rules.filter(r => r.from.startsWith('pa'));
    //data.set('rules', rules);
    const ym1 = data.get('yamas');
    const ym2 = data.get('yamas2');
    const hasYamas =
      ym1 instanceof Array &&
      ym1.length > 0 &&
      ym2 instanceof Array &&
      ym2.length > 0;
    if (hasYamas) {
      const allYamasWithSubs = hasYamas
        ? [...ym1.map(y => y.subs), ...ym2.map(y => y.subs)]
        : [];
      const dayFirst = ppData.get('isDayTime');
      const allSubs = allYamasWithSubs
        .reduce((a, b) => a.concat(b))
        .map((s, i) => {
          const isDayTime = dayFirst ? i < 25 : i >= 25;
          return { ...s, isDayTime };
        });

      const rData = [];
      const hasDashaMatches = transitRules.some(r =>
        r.context.startsWith('dasha_'),
      );
      const hasDasha2Matches = transitRules.some(r =>
        r.context.startsWith('antardasha_'),
      );
      const dashaLord = hasDashaMatches
        ? matchCurrentDashaLord(chart, jd, 1).key
        : '';
      const dasha2Lord = hasDasha2Matches
        ? matchCurrentDashaLord(chart, jd, 2).key
        : '';
      const birdGrahaSet = mapBirdSet(data);
      data.set('valid', true);
      for (const r of transitRules) {
        const pp2 = await matchPPTransitRule(
          jd,
          geo,
          ppData,
          chart,
          r.key,
          r.context,
          r.from,
        );
        const isTr = ['as', 'ds', 'ic', 'mc', 'dik_bala_transition'].includes(
          r.action,
        );
        const trRef = isTr ? r.key.replace(/_point$/, '') : '';
        const matchedRanges: TransitionOrb[] = [];
        const relTransItems =
          r.from === 'birth' ? birthTransitions : transitions;
        let subs = [];
        let grahaKeys = [];
        if (r.key.endsWith('_graha')) {
          const trKey = toTransitKey(r.context);
          if (r.key.includes('ing_') && r.key.startsWith('yama')) {
            const actKey = r.key.split('_')[1];
            allSubs
              .filter(s => s.key === actKey)
              .filter(s => {
                const relRows = relTransItems.filter(rt =>
                  s.rulers.includes(rt.key),
                );
                relRows.forEach(rr => {
                  if (Object.keys(rr).includes(trKey)) {
                    if (rr[trKey].jd >= s.start && rr[trKey].jd < s.end) {
                      matchedRanges.push(matchTransitionRange(trKey, rr));
                    }
                  }
                });
              });
          } else if (r.key.startsWith('birth_bird_')) {
            grahaKeys = birdGrahaSet.matchGrahas('birth', true);
          } else if (r.key.includes('ruling_bird_')) {
            grahaKeys = birdGrahaSet.matchGrahas('ruling', true);
          } else if (r.key.includes('dying_bird_')) {
            grahaKeys = birdGrahaSet.matchGrahas('dying', true);
          }
        }
        if (isTr) {
          const relTrs = relTransItems.filter(tr => {
            const rKey = tr.key.toLowerCase();
            return rKey === trRef || grahaKeys.includes(rKey);
          });
          if (relTrs.length > 0) {
            for (const relTr of relTrs) {
              const rk = toTransitKey(r.action);
              if (rk.length < 5 && Object.keys(relTr).includes(rk)) {
                matchedRanges.push(matchTransitionRange(rk, relTr));
              } else if (rk.startsWith('dik')) {
                const dikBalaTrans = matchDikBalaTransition(rk);
                if (
                  notEmptyString(dikBalaTrans) &&
                  Object.keys(relTr).includes(dikBalaTrans)
                ) {
                  matchedRanges.push(matchTransitionRange(dikBalaTrans, relTr));
                }
              }
            }
          }
        }
        const isDahsha = r.context.startsWith('dasha_');
        const isDasha2 = !isDahsha && r.context.startsWith('antardasha_');
        if (isDahsha || isDasha2) {
          const refDashaLord = isDasha2 ? dasha2Lord : dashaLord;
          subs = filterDashaLordByObjectType(
            refDashaLord,
            allSubs,
            birdGrahaSet,
            r.key,
          );
        }
        const isLord = r.context.startsWith('lord');
        let filterByGrahasAndAction = isLord;
        if (isLord) {
          grahaKeys = mapLords(chart, r.context);
        } else if (r.context === 'yoga_karaka') {
          grahaKeys = [chart.yogaKaraka];
          filterByGrahasAndAction = true;
        } else if (r.context.endsWith('yogi_graha')) {
          const objKey = r.context.includes('avayogi') ? 'avayogi' : 'yogi';
          const gk = chart.matchObject(objKey);
          if (gk) {
            grahaKeys = [gk];
            filterByGrahasAndAction = true;
          }
        }
        if (filterByGrahasAndAction) {
          subs = allSubs.filter(
            s =>
              s.key === r.action && s.rulers.some(gk => grahaKeys.includes(gk)),
          );
        }
        const matched =
          matchedRanges.length > 0 || pp2.valid || subs.length > 0;
        if (matched) {
          if (subs.length < 1) {
            if (pp2.yama instanceof Object && pp2.yama.subs instanceof Array) {
              subs = pp2.yama.subs;
            }
          }
          rData.push({
            rule: r,
            isTr,
            isLord,
            matchedRanges,
            matched,
            subs,
            trRef,
            data: pp2,
          });
        }
      }
      //data.set('rules', rData);
      const hasSubs = rData.some(r => r.subs.length > 0);
      const matchedRules = hasSubs
        ? rData.filter(r => r.subs.length > 0 || r.matchedRanges.length > 0)
        : [];
      data.set('numSubMatches', matchedRules.length);
      data.set('hasSubMatches', hasSubs);
      data.set('rules', rules);

      const periods = allYamasWithSubs.map(subs => {
        let yamaScore = 0;
        return subs.map((sub, si) => {
          let subScore = 0;
          for (const r of ppRules) {
            if (r.action === sub.key) {
              if (r.onlyAtStart && si === 0) {
                yamaScore = r.score;
              } else if (!r.onlyAtStart) {
                subScore += r.score;
              }
            }
          }
          let subRuleScore = 0;

          if (hasSubs) {
            const matchedSubRules = matchedRules
              .map(mr => {
                const matchedSubs = mr.subs.filter(
                  s2 => s2.start === sub.start && s2.end === sub.end,
                );
                return {
                  matchedSubs,
                  rule: mr.rule,
                };
              })
              .filter(mr => mr.matchedSubs.length > 0);

            if (matchedSubRules.length > 0) {
              subRuleScore = matchedSubRules
                .map(mr => mr.rule.score)
                .reduce((a, b) => a + b, 0);
            }
          }
          const score = yamaScore + subScore + subRuleScore;
          return { ...sub, score };
        });
      });
      const subPeriods = periods
        .reduce((a, b) => a.concat(b), [])
        .map(p => {
          const { start, end, score } = p;
          return {
            start,
            end,
            score,
          };
        });
      if (subPeriods.length === 50) {
        const startJd = subPeriods[0].start;
        const endJd = subPeriods[49].end;
        const totals = rules.map(r => r.max);
        data.set('totals', totals);
        data.set(
          'max',
          totals.reduce((a, b) => a + b, 0),
        );
        data.set('startJd', startJd);
        data.set('endJd', endJd);
        const minsDay = 24 * 60;
        const minJd = 1 / minsDay;
        const scores = [];
        const dayLength = endJd - startJd;
        const maxMins = Math.ceil(dayLength * minsDay);
        for (let i = 0; i < maxMins; i++) {
          const currJd = startJd + minJd * i;
          const refSub = subPeriods.find(
            sp => currJd >= sp.start && currJd <= sp.end,
          );
          let minuteScore = 0;
          if (refSub instanceof Object) {
            minuteScore += refSub.score;
          }
          matchedRules.forEach(mr => {
            if (mr.matchedRanges.length > 0) {
              for (const mRange of mr.matchedRanges) {
                if (mRange.inRange(currJd)) {
                  minuteScore += mRange.calcScore(currJd, mr.rule.score);
                }
              }
            }
          });
          scores.push(minuteScore);
        }
        data.set('minutes', scores);
      }
    }
  }
  return data;
};
