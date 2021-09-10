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