import * as swisseph from 'swisseph';
import { calcUtAsync } from './sweph-async';
import { jdToDateTime } from './date-funcs';

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
