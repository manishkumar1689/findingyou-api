import { GeoPos } from "src/astrologic/interfaces/geo-pos";
import { calcMoonDataJd, getSunMoonSpecialValues } from "../core";
import { julToISODate } from "../date-funcs";
import { KeyNum, KeyNumValue } from "../interfaces";
import { Chart } from "../models/chart";
import { toIndianTimeJd } from "../transitions";

const birdMap = { 1: 'vulture', 2: 'owl', 3: 'crow', 4: 'cock', 5: 'peacock' };

const birdAttributes = [
  {
    waxing: { color: 'white', directions: ['E']},
    waning: { color: 'black', directions: ['E']}
  },
  {
    waxing: { color: 'yellow', directions: ['S']},
    waning: { color: 'red', directions: ['N']}
  },
  {
    waxing: { color: 'red', directions: ['W','NW']},
    waning: { color: 'yellow', directions: ['S'] }
  },
  {
    waxing: { color: 'green', directions: ['N','NE']},
    waning: { color: 'white', directions: ['M']}
  },
  {
    waxing: { color: 'black', directions: ['M']},
    waning: { color: 'green', directions: ['W']}
  }
];

const waxWaneKey = (isWaxing = true): string => isWaxing ? 'waxing' : 'waning';

const dayNightKey = (isDayTime = true): string => isDayTime ? 'day' : 'night';

export const birdNakshatraRanges = [
  { range: [1, 5], waxing: 1, waning: 5 },
  { range: [6, 11], waxing: 2, waning: 4 },
  { range: [12, 16], waxing: 3, waning: 3 },
  { range: [17, 21], waxing: 4, waning: 2 },
  { range: [22, 27], waxing: 5, waning: 1 },
];

export const birdRelations = {
  waxing: [
    ['S', 	'F', 	'E', 	'E', 	'F'],
    ['F', 	'S', 	'F', 	'E', 	'E'],
    ['E', 	'F', 	'S', 	'F', 	'E'],
    ['E', 	'E', 	'F', 	'S', 	'F'],
    ['F', 	'E', 	'E', 	'F', 	'S']
  ],
  waning: [
    ['S', 	'E', 	'F', 	'E', 	'F'],
    ['E', 	'S', 	'F', 	'F', 	'E'],
    ['F', 	'F', 	'S', 	'E', 	'E'],
    ['E', 	'E', 	'F', 	'S', 	'F'],
    ['F', 	'E', 	'E', 	'F', 	'S'],
  ]
};

export interface Yama {
  value: number;
  sub: number;
}

export const birdActivitiesDirections = [
  {
    num: 1,
    waxing: {
      eating: 'E',
      walking: 'S',
      ruling: 'W',
      sleeping: 'N',
      dying: 'NE'
    },
    waning: {
      eating: 'N',
      walking: 'SW',
      ruling: 'SW',
      sleeping: 'NW',
      dying: 'NE'
    }
  },
  {
    num: 2,
    waxing: {
      eating: 'S',
      walking: 'W',
      ruling: 'N',
      sleeping: 'E',
      dying: 'SW'
    },
    waning: {
      eating: 'N',
      walking: 'SE',
      ruling: 'SW',
      sleeping: 'NW',
      dying: 'NE'
    },
  },
  {
    num: 3,
    waxing: {
      eating: 'W',
      walking: 'N',
      ruling: 'E',
      sleeping: 'SW',
      dying: 'SW'
    },
    waning: {
      eating: 'E',
      walking: 'SE',
      ruling: 'W',
      sleeping: 'NW',
      dying: 'NE'
    }
  },
  {
    num: 4,
    waxing: {
      eating: 'N',
      walking: 'E',
      ruling: 'S',
      sleeping: 'SW',
      dying: 'NW'
    },
    waning: {
      eating: 'S',
      walking: 'SW',
      ruling: 'N',
      sleeping: 'E',
      dying: 'SE'
    }
  },
  {
    num: 5,
    waxing: {
      eating: 'N',
      walking: 'S',
      ruling: 'W',
      sleeping: 'SW',
      dying: 'E'
    },
    waning: {
      eating: 'W',
      walking: 'N',
      ruling: 'E',
      sleeping: 'S',
      dying: 'SW'
    }
  }
];

export const birdDayValues = [
  {
      num: 1,
      waxing:
      {
          day:
          {
              ruling: 1,
              dying: 2
          },
          night:
          {
              ruling: 3,
              dying: 2
          }
      },
      waning:
      {
          day:
          {
              ruling: 4,
              dying: 3
          },
          night:
          {
              ruling: 1,
              dying: 3
          }
      }
  },
  {
      num: 2,
      waxing:
      {
          day:
          {
              ruling: 2,
              dying: 3
          },
          night:
          {
              ruling: 4,
              dying: 3
          }
      },
      waning:
      {
          day:
          {
              ruling: 5,
              dying: 2
          },
          night:
          {
              ruling: 4,
              dying: 2
          }
      }
  },
  {
      num: 3,
      waxing:
      {
          day:
          {
              ruling: 1,
              dying: 4
          },
          night:
          {
              ruling: 3,
              dying: 4
          }
      },
      waning:
      {
          day:
          {
              ruling: 4,
              dying: 1
          },
          night:
          {
              ruling: 1,
              dying: 1
          }
      }
  },
  {
      num: 4,
      waxing:
      {
          day:
          {
              ruling: 2,
              dying: 5
          },
          night:
          {
              ruling: 4,
              dying: 5
          }
      },
      waning:
      {
          day:
          {
              ruling: 3,
              dying: 5
          },
          night:
          {
              ruling: 2,
              dying: 5
          }
      }
  },
  {
      num: 5,
      waxing:
      {
          day:
          {
              ruling: 3,
              dying: 1
          },
          night:
          {
              ruling: 5,
              dying: 1
          }
      },
      waning:
      {
          day:
          {
              ruling: 2,
              dying: 4
          },
          night:
          {
              ruling: 3,
              dying: 4
          }
      }
  },
  {
      num: 6,
      waxing:
      {
          day:
          {
              ruling: 4,
              dying: 2
          },
          night:
          {
              ruling: 1,
              dying: 2
          }
      },
      waning:
      {
          day:
          {
              ruling: 1,
              dying: 5
          },
          night:
          {
              ruling: 5,
              dying: 5
          }
      }
  },
  {
      num: 7,
      waxing:
      {
          day:
          {
              ruling: 5,
              dying: 1
          },
          night:
          {
              ruling: 2,
              dying: 1
          }
      },
      waning:
      {
          day:
          {
              ruling: 5,
              dying: 4
          },
          night:
          {
              ruling: 4,
              dying: 4
          }
      }
  }
];

export const panchaStrengthBaseValues = [
  {
    nums: {
      waxing: 3,
      waning: 3
    },
    percent: 100,
    ruling: { 
      ruling: 1,
      eating: 0.8,
      walking: 0.6,
      sleeping: 0.4,
      dying: 0.2
    },
    eating: {
      ruling: 0.8,
      eating: 0.64,
      walking: 0.48,
      sleeping: 0.32,
      dying: 0.16
    },
    walking: {
      ruling: 0.6,
      eating: 0.48,
      walking: 0.36,
      sleeping: 0.24,
      dying: 0.12
    },
    sleeping: {
      ruling: 0.4,
      eating: 0.32,
      walking: 0.24,
      sleeping: 0.16,
      dying: 0.08
    },
    dying: {
      ruling: 0.2,
      eating: 0.16,
      walking: 0.12,
      sleeping: 0.08,
      dying: 0.04
    }
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
      dying: 0.15
    },
    eating: {
      ruling: 0.6,
      eating: 0.48,
      walking: 0.36,
      sleeping: 0.24,
      dying: 0.12
    },
    walking: {
      ruling: 0.45,
      eating: 0.36,
      walking: 0.27,
      sleeping: 0.18,
      dying: 0.09
    },
    sleeping: {
      ruling: 0.3,
      eating: 0.24,
      walking: 0.18,
      sleeping: 0.12,
      dying: 0.06
    },
    dying: {
      ruling: 0.15,
      eating: 0.12,
      walking: 0.09,
      sleeping: 0.06,
      dying: 0.03
    }
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
      dying: 0.05
    },
    eating: {
      ruling: 0.2,
      eating: 0.16,
      walking: 0.12,
      sleeping: 0.08,
      dying: 0.04
    },
    walking: {
      ruling: 0.15,
      eating: 0.12,
      walking: 0.09,
      sleeping: 0.06,
      dying: 0.03
    },
    sleeping: {
      ruling: 0.1,
      eating: 0.08,
      walking: 0.06,
      sleeping: 0.04,
      dying: 0.02
    },
    dying: {
      ruling: 0.05,
      eating: 0.04,
      walking: 0.03,
      sleeping: 0.02,
      dying: 0.01
    }
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
      dying: 0.1
    },
    eating: {
      ruling: 0.4,
      eating: 0.32,
      walking: 0.24,
      sleeping: 0.16,
      dying: 0.08
    },
    walking: {
      ruling: 0.3,
      eating: 0.24,
      walking: 0.18,
      sleeping: 0.12,
      dying: 0.06
    },
    sleeping: {
      ruling: 0.2,
      eating: 0.16,
      walking: 0.12,
      sleeping: 0.08,
      dying: 0.04
    },
    dying: {
      ruling: 0.1,
      eating: 0.08,
      walking: 0.06,
      sleeping: 0.04,
      dying: 0.02
    }
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
      dying: 0.025
    },
    eating: {
      ruling: 0.1,
      eating: 0.08,
      walking: 0.06,
      sleeping: 0.04,
      dying: 0.02
    },
    walking: {
      ruling: 0.075,
      eating: 0.06,
      walking: 0.045,
      sleeping: 0.03,
      dying: 0.015
    },
    sleeping: {
      ruling: 0.05,
      eating: 0.04,
      walking: 0.03,
      sleeping: 0.02,
      dying: 0.1
    },
    dying: {
      ruling: 0.025,
      eating: 0.02,
      walking: 0.015,
      sleeping: 0.1,
      dying: 0.005
    }
  }
];

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
      waxing:
      {
          day:
          [
              "eating",
              "walking",
              "ruling",
              "sleeping",
              "dying"
          ],
          night:
          [
              "dying",
              "ruling",
              "eating",
              "sleeping",
              "walking"
          ]
      },
      waning:
      {
          day:
          [
              "walking",
              "dying",
              "ruling",
              "eating",
              "sleeping"
          ],
          night:
          [
              "eating",
              "ruling",
              "dying",
              "walking",
              "sleeping"
          ]
      }
  },
  {
      num: 2,
      waxing:
      {
          day:
          [
              "dying",
              "eating",
              "walking",
              "ruling",
              "sleeping"
          ],
          night:
          [
              "walking",
              "dying",
              "ruling",
              "eating",
              "sleeping"
          ]
      },
      waning:
      {
          day:
          [
              "sleeping",
              "walking",
              "dying",
              "ruling",
              "eating"
          ],
          night:
          [
              "dying",
              "walking",
              "sleeping",
              "eating",
              "ruling"
          ]
      }
  },
  {
      num: 3,
      waxing:
      {
          day:
          [
              "eating",
              "walking",
              "ruling",
              "sleeping",
              "dying"
          ],
          night:
          [
              "dying",
              "ruling",
              "eating",
              "sleeping",
              "walking"
          ]
      },
      waning:
      {
          day:
          [
              "walking",
              "dying",
              "ruling",
              "eating",
              "sleeping"
          ],
          night:
          [
              "eating",
              "ruling",
              "dying",
              "walking",
              "sleeping"
          ]
      }
  },
  {
      num: 4,
      waxing:
      {
          day:
          [
              "dying",
              "eating",
              "walking",
              "ruling",
              "sleeping"
          ],
          night:
          [
              "walking",
              "dying",
              "ruling",
              "eating",
              "sleeping"
          ]
      },
      waning:
      {
          day:
          [
              "dying",
              "ruling",
              "eating",
              "sleeping",
              "walking"
          ],
          night:
          [
              "sleeping",
              "eating",
              "ruling",
              "dying",
              "walking"
          ]
      }
  },
  {
      num: 5,
      waxing:
      {
          day:
          [
              "sleeping",
              "dying",
              "eating",
              "walking",
              "ruling"
          ],
          night:
          [
              "sleeping",
              "walking",
              "dying",
              "ruling",
              "eating"
          ]
      },
      waning:
      {
          day:
          [
              "ruling",
              "eating",
              "sleeping",
              "walking",
              "dying"
          ],
          night:
          [
              "walking",
              "sleeping",
              "eating",
              "ruling",
              "dying"
          ]
      }
  },
  {
      num: 6,
      waxing:
      {
          day:
          [
              "ruling",
              "sleeping",
              "dying",
              "eating",
              "walking"
          ],
          night:
          [
              "eating",
              "sleeping",
              "walking",
              "dying",
              "ruling"
          ]
      },
      waning:
      {
          day:
          [
              "eating",
              "sleeping",
              "walking",
              "dying",
              "ruling"
          ],
          night:
          [
              "ruling",
              "dying",
              "walking",
              "sleeping",
              "eating"
          ]
      }
  },
  {
      num: 7,
      waxing:
      {
          day:
          [
              "walking",
              "ruling",
              "sleeping",
              "dying",
              "eating"
          ],
          night:
          [
              "ruling",
              "eating",
              "sleeping",
              "walking",
              "dying"
          ]
      },
      waning:
      {
          day:
          [
              "sleeping",
              "walking",
              "dying",
              "ruling",
              "eating"
          ],
          night:
          [
              "dying",
              "walking",
              "sleeping",
              "eating",
              "ruling"
          ]
      }
  }
];

export const birdActivityYamaCycle = {
  waxing: {
    day: ['eating', 'walking', 'ruling', 'sleeping', 'dying'],
    night: ['dying', 'walking', 'sleeping', 'eating', 'ruling']
  },
  waning: {
    day: ['walking', 'eating', 'dying', 'sleeping', 'ruling'],
    night: ['eating', 'sleeping', 'walking', 'dying', 'ruling'],
  }
}

export const dayBirdMatches = [ 
  {
    num: 1,
    waxing: {
      day: 1,
      night: 3,
      dying: 2
    },
    waning: {
      day: 4,
      night: 1,
      dying: 3
    }
  },
  { num: 2,
    waxing: {
      day: 2,
      night: 4,
      dying: 3
    },
    waning: {
      day: 5,
      night: 4,
      dying: 2
    }
  },
  { 
    num: 3,
    waxing: {
      day: 1,
      night: 3,
      dying: 4
    },
    waning: {
      day: 4,
      night: 1,
      dying: 1
    }
  },
{ num: 4,
  waxing: {
    day: 2,
    night: 4,
    dying: 5
  },
  waning: {
    day: 3,
    night: 2,
    dying: 5
  }
},
{ num: 5,
  waxing: {
    day: 3,
    night: 5,
    dying: 1
  },
  waning: {
    day: 2,
    night: 3,
    dying: 4
  }
},
{ 
  num: 6,
  waxing: {
    day: 4,
    night: 1,
    dying: 2
  },
  waning: {
    day: 1,
    night: 5,
    dying: 5
  }
},
{
  num: 7,
  waxing: {
    day: 5,
    night: 2,
    dying: 1
  },
  waning: {
    day: 5,
    night: 4,
    dying: 4
    }
  }
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
    }
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
    }
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
    }
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
    }
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
    }
  }
];

const matchBirdKeyByNum = (num = 0) => {
  return (num >= 1 && num <= 5)? birdMap[num] : "";
}

export const matchBirdByNak = (nakNum = 0, waxing = false) => {
  const row = birdNakshatraRanges.find(row =>  nakNum >= row.range[0] && nakNum <= row.range[1]);
  const num = row instanceof Object ? waxing ? row.waxing : row.waning : 0;
  const key = num > 0 && num <= 5? birdMap[num] : "";
  return { num, key };
}

export const matchBirdByLng = (moonLng = 0, waxing = false) => {
  const nakNum = Math.floor(moonLng / (360/27)) + 1;
  return matchBirdByNak(nakNum, waxing);
}

export const matchBirdByNum = (num = 0) => {
  const keys = Object.values(birdMap); 
  const key = num > 0 && num < keys.length? keys[(num - 1)] : "";
  return { num, key };
}

export const matchBirdRelations = (bird1 = 0, bird2 = 0, waxing = true) => {
  let letter = 'N';
  if (bird1 > 0 && bird2 > 0 && bird1 <= 5 && bird2 <= 5) {
    letter = birdRelations[waxWaneKey(waxing)][(bird1 - 1)][(bird2 - 1)];
  }
  return letter;
}

export const matchBirdRulers = (birdNum = 0, isDayTime = false, activity = ""): string[] => {
  const row = birdRulers.find(row => row.num === birdNum);
  return row instanceof Object ? activity === 'dying'? row.death : isDayTime ? row.day : row.night : [];
}


export const matchBirdKeyRulers = (key = "", isDayTime = false, activity = ""): string[] => {
  const birdNum = birdMap[key];
  return matchBirdRulers(birdNum, isDayTime, activity);
}

export const matchBirdRelationsKeys = (bird1 = "", bird2 = "") => {
  const birdValues = Object.values(birdMap);
  const num1 = birdValues.indexOf(bird1) + 1;
  const num2 = birdValues.indexOf(bird2) + 1;
  return matchBirdRelations(num1, num2);
}

export const matchBirdDayValue = (dayNum = 0, waxing = false, isNight = false) => {
  const dayRow = birdDayValues.find(row => row.num === dayNum);
  const itemSet = dayRow instanceof Object ? waxing? dayRow.waxing : dayRow.waning : null;
  return itemSet instanceof Object ? isNight ? itemSet.night : itemSet.day : { ruling: 0, dying: 0 };
}

export const matchBirdDayRuler = (dayNum = 0, waxing = false, isNight = false) => {
  const item = matchBirdDayValue(dayNum, waxing, isNight);
  return { 
    ruling: matchBirdByNum(item.ruling),
    dying: matchBirdByNum(item.dying)
  }
}

export const matchBirdActivity = (birdNum = 0, dayNum = 0, waxing = true, isDayTime = true) => {
  const row = birdActivities.find(row => row.num === dayNum);
  const itemSet = row instanceof Object ? row[waxWaneKey(waxing)] : null;
  const actKeys = itemSet instanceof Object ? isDayTime ? itemSet.day : itemSet.night : [];
  const birdIndex = birdNum - 1;
  const key = birdNum <= 5 && birdNum > 0 ? birdMap[birdNum] : "";
  const activity = birdIndex >= 0 && birdIndex < actKeys.length? actKeys[birdIndex] : "";
  return { 
    key,
    activity,
  }
}

export const matchDayBirds = (dayNum = 0, isWaxing = true, isDayTime = true) => {
  const row = dayBirdMatches.find(row => row.num === dayNum);
  const isMatched = row instanceof Object;
  const ruling = isMatched? row[waxWaneKey(isWaxing)][dayNightKey(isDayTime)] : 0;
  const dying = isMatched? row[waxWaneKey(isWaxing)].dying : 0;
  return { ruling, dying };
}

export const expandBirdAttributes = (birdNum = 0, isWaxing = true) => {
  const birdIndex = birdNum > 0 && birdNum <= 5? birdNum - 1 : 0;
  const attrs = birdAttributes[birdIndex][waxWaneKey(isWaxing)];
  return { key: birdMap[birdNum], ...attrs };
}

export const matchDayBirdKeys = (dayNum = 0, isWaxing = true, isDayTime = true) => {
  const { ruling, dying } = matchDayBirds(dayNum, isWaxing, isDayTime);
  const rulingB = expandBirdAttributes(ruling);
  const dyingB = expandBirdAttributes(dying);
  return { ruling: rulingB, dying: dyingB };
}

export const matchBirdActivityKey = (birdNum = 0, dayNum = 0, waxing = false, isDayTime = false): string => {
  return matchBirdActivity(birdNum, dayNum, waxing, isDayTime).activity;
}

export const matchBirdActivityByKey = (birdKey = "", dayNum = 0, waxing = false, isNight = false) => {
  const num = Object.values(birdMap).indexOf(birdKey) + 1;
  return matchBirdActivity(num, dayNum, waxing, isNight);
}

export const matchBirdDirectionByActivity = (birdNum = 0, activity = "", waxing = true): number => {
  const row = birdActivitiesDirections.find(row => row.num === birdNum);
  const rowIsMatched = row instanceof Object;
  const subSec = rowIsMatched ? row[waxWaneKey(waxing)] : null;
  const activityKeys = subSec instanceof Object? Object.keys(subSec) : [];
  return activityKeys.includes(activity) ? subSec[activity] : "";
}

export const matchBirdKeyDirectionByActivity = (birdKey = "", activity = ""): number => {
  const birdNum = Object.values(birdMap).indexOf(birdKey) + 1;
  return matchBirdDirectionByActivity(birdNum, activity);
}

export const calcTimeBirds = (birthBirdNum = 0, isWaxing = true, isDayTime = true) => {
  const items = Object.entries(birdMap).map(entry => {
    const [num, key] = entry;
    return { num: parseInt(num, 10), key: key}
  });
  const first = items.find(item => item.num === birthBirdNum);
  const moreThan = items.filter(item => item.num > birthBirdNum);
  const lessThan = items.filter(item => item.num < birthBirdNum);
  let others = [...moreThan, ...lessThan];
  if (!isDayTime) {
    others.reverse();
  } else if (!isWaxing && isDayTime) {
    others = [
      others[2],
      others[0],
      others[3],
      others[1]
    ]
  }
  return [first, ...others];  
}

export const calcTimeBird = (birthBirdNum = 0, yama = 0, isWaxing = true, isDayTime = true) => {
  const birds = calcTimeBirds(birthBirdNum, isWaxing, isDayTime);
  const yamaIndex = yama > 0? yama <= 5 ? yama -1 : 4 : 0;
  return birds[yamaIndex];
}

export const matchSubPeriods = (birdNum = 0, dayNum = 0, isWaxing = true, isDayTime = true) => {
  const row = birdActivities.find(row => row.num === dayNum);
  const birdIndex = birdNum > 0? birdNum - 1 : 0;
  const startAct: string[] = row instanceof Object ? row[waxWaneKey(isWaxing)][dayNightKey(isDayTime)][birdIndex] : [];
  const sequence = birdActivityYamaCycle[waxWaneKey(isWaxing)][dayNightKey(isDayTime)];
  const startIndex = sequence.indexOf(startAct)
  const activityKeys = [0, 1, 2, 3, 4].map(ki => sequence[(ki + startIndex) % 5]);
  return activityKeys.map(ak => {
    const ys = yamaSubdivisions.find(ya => ya.key === ak);
    if (ys instanceof Object) {
      const div = ys[waxWaneKey(isWaxing)][dayNightKey(isDayTime)];
      const { key } = ys;
      const value = (div / 24);
      return {
        key,
        value
      }
    } else {
      return {
        key: "",
        value: 0,
      }
    }
  });
}

export const calcPanchaPakshiStrength = (birdNum = 0, activityKey = "", subKey = "", waxing = true) => {
  const row = panchaStrengthBaseValues.find(row => row.nums[waxWaneKey(waxing)] === birdNum);
  const matched = row instanceof Object;
  const keys = matched ? Object.keys(row) : [];
  let score = 0;
  const percent = matched && keys.includes('percent') ? row.percent : 0;
  if (keys.includes(activityKey) && row[activityKey] instanceof Object) {
    const subKeys = Object.keys(row[activityKey]);
    const multiplier = subKeys.includes(subKey)? row[activityKey][subKey] : 0;
    score = (percent / 100) * multiplier;
  }
  return score;
}

export const calcSubPeriods = (subPeriods: KeyNumValue[], birds: KeyNum[], birthBirdNum = 0, startJd = 0, endJd = 0, refJd = 0, waxing = true, isDayTime = true, dayActivity: string, yamaIndex = 0) => {
  const lengthJd = endJd - startJd;
  const numBirds = birds.length;
  let prevJd = startJd;
  const dirKeys = subPeriods.map((period, index) => {
    const birdItem = index < numBirds? birds[index] : { key: "", num: 0 };
    return matchBirdDirectionByActivity(birdItem.num, period.key, waxing);
  })
  const activityKeys = subPeriods.map(period => {
    return period.key;
  });
  return subPeriods.map((period, index) => {
    const startSubJd = prevJd;
    const endSubJd = prevJd + (lengthJd * period.value); 
    prevJd = endSubJd;
    const current = refJd >= startSubJd && refJd < endSubJd;
    const birdItem = index < numBirds? birds[index] : null;
    const birdMatched = birdItem instanceof Object;
    const bird = birdMatched ? birdItem.key : "";
    const birdNum = birdMatched ? birdItem.num : 0;
    const shiftIndex = (index + yamaIndex + 5) % 5;
    const direction = dirKeys[shiftIndex];
    const actKey = activityKeys[shiftIndex];
    const rulers = matchBirdRulers(birdNum, isDayTime, actKey);
    const relation = matchBirdRelations(birthBirdNum, birdNum, waxing);
    const score = calcPanchaPakshiStrength(birthBirdNum, dayActivity, actKey, waxing);
    return { bird, ...period, key: actKey, start: startSubJd, end: endSubJd, current, direction, rulers, relation, score };
  });
}

export const calcYamaSets = (jd = 0, startJd = 0, endJd = 0, isWaxing = true, isDayTime = false, birthBirdNum = 0, dayNum = 0) => {
  const lengthJd = endJd - startJd;
  const progressJd = jd - startJd;
  const progress = progressJd / lengthJd;
  const subProgress = (progress % 0.2) * 5;
  const yamas = [1, 2, 3, 4, 5].map((num, yi) => {
    const subLength = lengthJd / 5;
    return {
      num,
      start: (startJd + (subLength * yi) ),
      end: (startJd + (subLength * num) )
    }
  });
  
  const yama = (Math.floor(progress * 5) % 5) + 1;
  const subPeriods = matchSubPeriods(birthBirdNum, dayNum, isWaxing, isDayTime);
  const birds = calcTimeBirds(birthBirdNum, isWaxing, isDayTime);
  const dayActivity = matchBirdActivityKey(birthBirdNum, dayNum, isWaxing, isDayTime);
  const yamaSets = yamas.map((yama, index) => {
    const subs = calcSubPeriods(subPeriods, birds, birthBirdNum, yama.start, yama.end, jd, isWaxing, isDayTime, dayActivity, index);
    return { ...yama, subs }
  });
  return {
    lengthJd,
    progress,
    subProgress,
    yama,
    yamas: yamaSets,
  };
}

export const panchaPakshiDayNightSet = async (jd = 0, geo: GeoPos, chart:Chart, fetchNightAndDay = true): Promise<Map<string, any>> => {  
  const data: Map<string, any> = new Map();
  const iTime = await toIndianTimeJd(jd, geo);
  const setBefore = fetchNightAndDay ? iTime.rise.jd > iTime.set.jd : false;
  const dayBefore = fetchNightAndDay ? false : iTime.dayBefore;
  const periodStart = dayBefore ? iTime.prevSet.jd : iTime.rise.jd;
  const periodEnd = dayBefore ? iTime.rise.jd : setBefore? iTime.nextSet.jd : iTime.set.jd;
  const riseJd = setBefore ? periodStart : iTime.rise.jd;
  const setJd = setBefore ? periodEnd : iTime.set.jd;
  data.set('rise', riseJd);
  data.set('set', setJd);
  data.set('nextRise', iTime.nextRise.jd);
  data.set('riseDt', julToISODate(riseJd));
  data.set('setDt', julToISODate(setJd));
  data.set('nextRiseDt', julToISODate(iTime.nextRise.jd));
  data.set('isDayTime', iTime.isDayTime);
  chart.setAyanamshaItemByNum(27);
  const moon = chart.graha('mo');
  const moonJd = fetchNightAndDay ? iTime.rise.jd : jd;
  const current = await calcMoonDataJd(moonJd);
  data.set('geo', {
    birth: chart.geo,
    current: geo
  });
  data.set('moon', {
    birth: { 
      lng: moon.longitude,
      nakshatra27: moon.nakshatra27,
      waxing: chart.moonWaxing
    },
    current
  });
  const isDayTime = fetchNightAndDay ? true : iTime.isDayTime;
  const bird = matchBirdByNak(moon.nakshatra27, chart.moonWaxing);
  const currentBirds = matchDayBirdKeys(iTime.weekDayNum, current.waxing, isDayTime); 
  data.set('bird', {
    birth: bird.key,
    current: currentBirds
  });
  const yamaData = calcYamaSets(jd, periodStart, periodEnd, current.waxing, isDayTime, bird.num, iTime.weekDayNum);
  data.set('yamas', yamaData.yamas);
  data.set('lengthJd', yamaData.lengthJd);
  data.set('period', isDayTime ? 'day' : 'night');
  const special: any = {
    day: getSunMoonSpecialValues(moonJd, iTime, current.sunLng, current.lng)
  }
  
  if (fetchNightAndDay) {
    const jd2 = jd + 0.5;
    //const iTime2 = await toIndianTimeJd(jd2, geo);
    const moon2Jd = iTime.set.jd;
    const next = await calcMoonDataJd(moon2Jd);
    const period2Start = periodEnd;
    const period2End = iTime.nextRise.jd;
    const isDayTime2 = !isDayTime;
    const yamaData2 = calcYamaSets(jd2, period2Start, period2End, next.waxing, isDayTime2, bird.num, iTime.weekDayNum);
    data.set('yamas2', yamaData2.yamas);
    data.set('lengthJd2', yamaData2.lengthJd);
    const mn = data.get('moon');
    data.set('moon', {...mn, next});
    const bd = data.get('bird');
    const nextBirds = matchDayBirdKeys(iTime.weekDayNum, next.waxing, isDayTime2);
    data.set('bird', { ...bd, next: nextBirds });
    data.set('period2', isDayTime2 ? 'day' : 'night');
    special.night = getSunMoonSpecialValues(moon2Jd, iTime, next.sunLng, next.lng);
  }
  data.set('special', special);
  data.set('valid', yamaData.yamas.length === 5);
  return data;
}
