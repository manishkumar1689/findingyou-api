import * as swisseph from 'swisseph';
import { calcUtAsync } from './sweph-async';
import { calcJulDate, jdToDateTime } from './date-funcs';
import { withinTolerance } from '../../lib/validators';
import grahaValues from './settings/graha-values';

const calcBodySpeed = async (jd, num, callback) => {
  const flag =
    swisseph.SEFLG_SWIEPH + swisseph.SEFLG_SIDEREAL + swisseph.SEFLG_SPEED;
  await calcUtAsync(jd, num, flag).catch(async result => {
    if (result instanceof Object) {
      if (!result.error) {
        callback(result.longitudeSpeed, result.longitude);
      }
    }
  });
};

const calcRetroGradeInRange = async (
  num,
  currVal,
  dir = 1,
  mode = 'start',
  unit = 'day',
) => {
  let refSpeed = 1;
  let counter = 1;
  let divisor = 1;
  let end: any = {};
  switch (unit) {
    case 'hour':
      divisor = 24;
      break;
    case 'min':
      divisor = 1440;
      break;
    case 'sec':
      divisor = 86400;
      break;
  }
  while (refSpeed > 0 && counter < 50000) {
    const refJdOffset = end.jd + (counter * dir) / 1440;
    await calcBodySpeed(refJdOffset, num, (spd, lng) => {
      refSpeed = spd;
      if (refSpeed <= 0) {
        end = {
          speed: refSpeed,
          lng,
          jd: refJdOffset,
          dt: jdToDateTime(refJdOffset),
        };
      }
      counter++;
    });
  }
};

export const calcAcceleration = async (jd, body) => {
  const { num, yearLength } = body;
  let spds = [];
  for (let i = 0; i < 2; i++) {
    const refJd = jd + i * 0.5;
    await calcBodySpeed(refJd, num, (spd, lng) => {
      spds.push({ spd, lng, jd: refJd, dt: jdToDateTime(refJd) });
    });
  }
  const [start, end] = spds;
  const rate = end.spd / start.spd;
  return { start, end, rate, rising: rate >= 1, switching: rate < 0 };
};

export const calcStation = async (jd, num, station) => {
  let spds = [];
  const max = 2 * 24 * 60;
  const startJd = jd - 1;
  let maxSpd = 0;
  let minSpd = 0;
  let saveSpd = 0;
  let saveLng = 0;
  let saveJd = 0;
  let prevAbsSpd = 10;
  let minAbsSpd = 10;
  let prevSpd = 0;
  let prevPolarity = 0;
  let matched = false;
  let saveAccel = 0;
  for (let i = 0; i < max; i++) {
    const refJd = startJd + i / (24 * 60);

    await calcBodySpeed(refJd, num, (spd, lng) => {
      const currPolarity = spd >= 0 ? 1 : -1;
      const absSpd = Math.abs(spd);
      // ['sample', 'peak','retro-start','retro-peak','retro-end'],
      switch (station) {
        case 'peak':
          if (spd > maxSpd && spd >= 0) {
            maxSpd = spd;
          } else {
            matched = true;
            maxSpd = -1;
          }
          break;
        case 'retro-peak':
          if (spd < minSpd && spd < 0) {
            minSpd = spd;
          } else {
            matched = true;
            minSpd = 1;
          }
          break;
        case 'retro-start':
        case 'retro-end':
          if (absSpd < minAbsSpd && spd < 0.1) {
            minAbsSpd = spd;
          } else {
            matched = true;
            minSpd = 1;
          }
          break;
      }
      saveLng = lng;
      saveSpd = prevSpd;
      saveJd = refJd;
      prevAbsSpd = absSpd;
      prevSpd = spd;
      prevPolarity = currPolarity;
    });
    if (matched) {
      await calcBodySpeed(saveJd - 0.5, num, (spd2, lng2) => {
        saveAccel = saveSpd / spd2;
      });
      break;
    }
  }
  const returnData = {
    jd: saveJd,
    datetime: jdToDateTime(saveJd),
    speed: saveSpd,
    lng: saveLng,
    acceleration: saveAccel,
    station,
  };
  console.log(returnData);
  return returnData;
};

const calcSwitchover = async (jd, body) => {
  const { num, yearLength } = body;
  let spds = [];
  const max = Math.ceil(body.yearLength);
  let rate = 0;
  let refSpeed = null;
  let polarity = 0;
  let prevPolarity = 0;
  let switched = false;
  let row: any = {
    spd: 0,
    lng: 0,
    jd: 0,
    polarity: -1,
  };
  for (let i = 0; i < max; i++) {
    const multiplier =
      rate > 0 ? (rate > 1.25 && refSpeed < 1 ? refSpeed : rate) : 1 / 288;
    const refJd = jd + i * multiplier;
    await calcBodySpeed(refJd, num, (spd, lng) => {
      rate = refSpeed !== null ? refSpeed / spd : 0;
      polarity = spd < 0 ? -1 : 1;
      switched = polarity !== prevPolarity && prevPolarity !== 0;
      if (switched) {
        row = {
          spd,
          dt: jdToDateTime(refJd),
          jd: refJd,
          lng,
          polarity,
          rate,
          multiplier,
        };
      }
      refSpeed = spd;
      prevPolarity = polarity;
    });
    if (switched) {
      break;
    }
  }
  return row;
};

const calcPeakSpeed = async (jd, body) => {
  const { num, yearLength } = body;
  const max = Math.ceil(body.yearLength);
  let rate = 0;
  let refSpeed = null;
  let polarity = 0;
  let prevPolarity = 0;
  let row: any = {
    spd: 0,
    lng: 0,
    jd: 0,
    polarity: -1,
  };
  let prevRate = 0;
  for (let i = 0; i < max; i++) {
    const multiplier = rate > 0 ? rate : 1 / 288;
    const refJd = jd + i * multiplier;
    await calcBodySpeed(refJd, num, (spd, lng) => {
      rate = refSpeed !== null ? refSpeed / spd : 0;
      polarity = spd < 0 ? -1 : 1;

      const peaked = prevRate !== 0 && withinTolerance(rate, 1, 0.02);
      if (peaked) {
        row = {
          spd,
          dt: jdToDateTime(refJd),
          jd: refJd,
          lng,
          polarity,
          rate,
          multiplier,
        };
      }
      refSpeed = spd;
      prevRate = rate;
    });
  }
  return row;
};

export const calcRetroGrade = async (datetime, num) => {
  const jd = calcJulDate(datetime);
  const body = grahaValues.find(b => b.num === num);

  /* let refSpeed = 1;
  let days = 0;
  let start = { speed: 0, jd: -1 };
  let end = { speed: 0, jd: -1 };
  let endMatched = false;
  let negMatched = false;
  while (!endMatched && days < 5000) {
    const refJd = (jd + days);
    await calcBodySpeed(refJd, num, (spd) => {
      refSpeed = spd;
      endMatched = negMatched && spd >= 0;
      if (!endMatched) {
        negMatched = true;
        end = { speed: refSpeed, jd: refJd, dt: jdToDateTime(refJd) }
      }
      days++;
    })
  }
  if (end.jd >= 0) {
    refSpeed = -1;
    let mins = 1;
    while (refSpeed < 0 && mins < 50000) {
      const refJdOffset = end.jd - (mins / 1440);
      await calcBodySpeed(refJdOffset, num, (spd) => {
        refSpeed = spd;
        if (refSpeed > 0) {
          end = { speed: refSpeed, jd: refJdOffset, dt: jdToDateTime(refJdOffset) }
        }
        mins++;
      })
    }
    refSpeed = -1;
    let min5s = 1;
    while (refSpeed < 0 && min5s < 50000) {
      const refJdOffset = end.jd - (min5s / 288);
      await calcBodySpeed(refJdOffset, num, (spd) => {
        refSpeed = spd;
        if (refSpeed >= 0) {
          start = { speed: refSpeed, jd: refJdOffset, dt: jdToDateTime(refJdOffset) };
        }
        min5s++;
      })
    }
  } */
  const accel = await calcAcceleration(jd, body);

  let nx: any = { jd: 0, lng: 0 };
  let refJd = jd;
  const nextSwitches = [];
  /* for (let i = 0; i < 8; i++) {

    refJd = jd + (i + 1);
    nx = await calcAcceleration(refJd, body);
    if (nx) {
      nextSwitches.push(nx);
    }
  } */

  for (let i = 0; i < 8; i++) {
    nx = await calcSwitchover(refJd, body);
    if (nx) {
      refJd = nx.jd;
      nextSwitches.push(nx);
      nx = await calcPeakSpeed(refJd, body);
      if (nx) {
        refJd = nx.jd;
        nextSwitches.push(nx);
      }
    }
  }

  return {
    key: body.key,
    name: body.name,
    accel,
    nextSwitches,
    // start,
    // end
  };
};