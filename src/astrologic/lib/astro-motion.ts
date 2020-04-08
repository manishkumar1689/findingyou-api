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

export const calcAcceleration = async (jd, body) => {
  const { num } = body;
  let spds = [];
  for (let i = 0; i < 2; i++) {
    const refJd = jd + i * 0.5;
    await calcBodySpeed(refJd, num, (speed, lng) => {
      spds.push({ speed, lng, jd: refJd, dt: jdToDateTime(refJd) });
    });
  }
  const [start, end] = spds;
  const rate = end.spd / start.spd;
  return { start, end, rate, rising: rate >= 1, switching: rate < 0 };
};

export const calcStation = async (jd, num, station) => {
  const max = 4 * 24 * 60;
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
          if (absSpd < minAbsSpd) {
            minAbsSpd = absSpd;
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
    num,
    speed: saveSpd,
    lng: saveLng,
    acceleration: saveAccel,
    station,
  };
  return returnData;
};

const calcSwitchover = async (jd, body) => {
  const { num, yearLength } = body;
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
  const accel = await calcAcceleration(jd, body);
  let nx: any = { jd: 0, lng: 0 };
  let refJd = jd;
  const nextSwitches = [];

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
