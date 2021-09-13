const birdMap = { 1: 'vulture', 2: 'owl', 3: 'crow', 4: 'cock', 5: 'peacock' };

export const birdNakshatraRanges = [
  { range: [1, 5], waxing: 1, waning: 5 },
  { range: [6, 11], waxing: 2, waning: 4 },
  { range: [12, 16], waxing: 3, waning: 3 },
  { range: [17, 21], waxing: 4, waning: 2 },
  { range: [22, 27], waxing: 5, waning: 1 },
];

export const birdRelations = [
  ['S', 'E',	'F', 'E', 'F'],
  ['E', 'S',	'F', 'F', 'E'],
  ['F', 'F',	'S', 'E', 'E'],
  ['E', 'E',	'F', 'S', 'F'],
  ['F', 'E',	'E', 'F', 'S']
];

export interface Yama {
  value: number;
  sub: number;
}

export const birdActivitiesDirections = [
  {
    num: 1,
    eating: 'E',
    walking: 'S',
    ruling: 'W',
    sleeping: 'N',
    dying: 'NE'
  },
  {
    num: 2,
    eating: 'S',
    walking: 'W',
    ruling: 'N',
    sleeping: 'E',
    dying: 'SW'
  },
  {
    num: 3,
    eating: 'W',
    walking: 'N',
    ruling: 'E',
    sleeping: 'SW',
    dying: 'SW'
  },
  {
    num: 4,
    eating: 'N',
    walking: 'E',
    ruling: 'S',
    sleeping: 'SW',
    dying: 'NW'
  },
  {
    num: 5,
    eating: 'N',
    walking: 'S',
    ruling: 'W',
    sleeping: 'SW',
    dying: 'E'
  }
];

export const birdDayValues = [
  {
      num: 7,
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
      num: 1,
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
      num: 2,
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
      num: 3,
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
      num: 4,
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
      num: 5,
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
      num: 6,
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

export const strength = [
  {
    num: 3,
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
    num: 1,
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
    num: 2,
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
    num: 4,
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
    num: 5,
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

export const birdActivities = [
  {
      num: 7,
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
      num: 1,
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
      num: 2,
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
      num: 3,
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
      num: 4,
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
      num: 5,
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
      num: 6,
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

export const matchBird = (moonLng = 0, waxing = false) => {
  const nakNum = Math.floor(moonLng / (360/27)) + 1;
  const row = birdNakshatraRanges.find(row =>  nakNum >= row.range[0] && nakNum <= row.range[1]);
  const num = row instanceof Object ? waxing ? row.waxing : row.waning : 0;
  const key = num > 0 && num <= 5? birdMap[num] : "";
  return { num, key };
}

export const matchBirdRelations = (bird1 = 0, bird2 = 0) => {
  let letter = 'N';
  if (bird1 > 0 && bird2 > 0 && bird1 <= 5 && bird2 <= 5) {
    letter = birdRelations[(bird1 - 1)][(bird2 - 1)];
  }
  return letter;
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
    ruling: matchBird(item.ruling),
    dying: matchBird(item.dying)
  }
}

export const matchBirdActivity = (birdNum = 0, dayNum = 0, waxing = false, isNight = false) => {
  const row = birdActivities.find(row => row.num === dayNum);
  const itemSet = row instanceof Object ? waxing ? row.waxing : row.waning : null;
  const actKeys = itemSet instanceof Object ? isNight ? itemSet.night : itemSet.day : [];
  const birdIndex = birdNum - 1;
  const key = birdNum <= 5 && birdNum > 0 ? birdMap[birdNum] : "";
  const activity = birdIndex > 0 && birdIndex < actKeys.length? actKeys[birdIndex] : "";
  return { 
    key,
    activity,
  }
}

export const matchBirdActivityByKey = (birdKey = "", dayNum = 0, waxing = false, isNight = false) => {
  const num = Object.values(birdMap).indexOf(birdKey) + 1;
  return matchBirdActivity(num, dayNum, waxing, isNight);
}

export const matchBirdDirectionByActivity = (birdNum = 0, activity = ""): number => {
  const row = birdActivitiesDirections.find(row => row.num === birdNum);
  const rowIsMatched = row instanceof Object;
  const activityKeys = rowIsMatched ? Object.keys(row) : [];
  return activityKeys.includes(activity)? row[activity] : "";
}

export const matchBirdKeyDirectionByActivity = (birdKey = "", activity = ""): number => {
  const birdNum = Object.values(birdMap).indexOf(birdKey) + 1;
  return matchBirdDirectionByActivity(birdNum, activity);
}

export const calcYama = (jd = 0, startJd = 0, endJd = 0, isWaxing = true, isDayTime = false) => {
  const lengthJd = endJd - startJd;
  const progressJd = jd - startJd;
  const progress = progressJd / lengthJd;
  const subProgress = (progress % 0.2) * 5;
  const waneWax = isWaxing? 'waxing' : 'waning';
  const dayNight = isDayTime? 'day' : 'night';
  const periods = yamaSubdivisions.map(ys => {
    const div = ys[waneWax][dayNight];
    const { key } = ys;
    return {
      key,
      value: (div / 24)
    }
  });
  const yama = (Math.floor(progress * 5) % 5) + 1;
  let startProgress = 0;
  let endProgress = 0;
  let sub = 0;
  for (let i = 0; i < 5; i++) {
    const { key, value } = periods[i];
    endProgress += value;
    if (subProgress >= startProgress && subProgress < endProgress) {
      sub = (i + 1);
      break;
    }
    startProgress += value;
  };
  const key = sub > 0? yamaSubdivisions[(sub - 1)].key : "";
  return {
    progress,
    subProgress,
    key,
    yama,
    sub
  };
}