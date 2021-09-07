import * as swisseph from 'swisseph';
import { calcJulDate, jdToDateTime } from './date-funcs';
import { JyotishDay } from './models/jyotish-day';
import { IndianTime } from './models/indian-time';
import { riseTransAsync } from './sweph-async';
import { isNumeric } from '../../lib/validators';
import { ephemerisDefaults } from '../../.config';
import { GeoLoc } from './models/geo-loc';

export interface TimeSet {
  jd: number;
  dt?: string;
  after: boolean;
}

export interface TransitionData {
  rise: TimeSet;
  set: TimeSet;
  prevRise?: TimeSet;
  prevSet?: TimeSet;
  nextRise?: TimeSet;
  ic?: TimeSet;
  mc?: TimeSet;
  num?: number;
  body?: string;
  key?: string;
  valid?: boolean;
}

export interface SunTransitionData {
  jd: number;
  datetime?: Date;
  geo: GeoLoc;
  rise: TimeSet;
  set: TimeSet;
  prevRise: TimeSet;
  prevSet: TimeSet;
  nextRise: TimeSet;
}

interface TransitionInput {
  jd: number;
  planetNum: 0;
  iflag: 0;
  transType: number;
  longitude: number;
  latitude: number;
  altitude: number;
  pressure: number;
  temperature: number;
}

export const matchTransData = async (
  inData: TransitionInput,
  transType = 0,
  transKey = 'trans',
): Promise<TimeSet> => {
  let data = { valid: false, transitTime: -1 };
  inData.transType = transType;
  const jd = inData.jd;
  await riseTransAsync(...Object.values(inData)).catch(d => {
    data = d;
    if (!d.error) {
      data.valid = true;
    } else {
      data.valid = false;
    }
  });
  let result:TimeSet = { jd: -1, after: false };
  //const offset = Math.floor(jd) < Math.floor(data.transitTime) && transKey === 'set' ? 1 : 0;
  if (data.valid) {
    if (data.transitTime >= 0) {
      result = {
        jd: data.transitTime,
        dt: jdToDateTime(data.transitTime),
        after: jd > data.transitTime,
      };
    }
  }
  return result;
};

const centerDiscRising = () => {
  return (
    swisseph.SE_BIT_DISC_CENTER | swisseph.SE_BIT_NO_REFRACTION ||
    swisseph.SE_BIT_GEOCTR_NO_ECL_LAT
  );
};

export const calcTransition = async (
  datetime,
  geo,
  planetNum,
  showInput = true,
) => {
  const jd = calcJulDate(datetime);
  const data = await calcTransitionJd(jd, geo, planetNum, showInput, true);
  return { jd, ...data };
};

export const calcTransitionJd = async (
  jd: number,
  geo,
  planetNum,
  showInput = true,
  showIcMc = false,
): Promise<TransitionData> => {
  let data = null;
  if (isNumeric(jd)) {
    let valid = false;
    let longitude = 0;
    let latitude = 0;
    let { altitude, temperature, pressure } = ephemerisDefaults;
    if (!planetNum) {
      planetNum = 0;
    }
    if (geo instanceof Object) {
      if (geo.lat) {
        latitude = geo.lat;
      }
      if (geo.lng) {
        longitude = geo.lng;
      }
      if (geo.alt) {
        altitude = geo.alt;
      }
    }
    const inData = {
      jd,
      planetNum,
      star: '',
      iflag: swisseph.SEFLG_TOPOCTR,
      transType: swisseph.SE_CALC_RISE,
      longitude,
      latitude,
      altitude,
      pressure,
      temperature,
    };
    const offset = centerDiscRising();
    let mc = null;
    let ic = null;

    const set = await matchTransData(
      inData,
      swisseph.SE_CALC_SET + offset,
      'set',
    );
    if (showIcMc) {
      mc = await matchTransData(inData, swisseph.SE_CALC_MTRANSIT, 'mc');
      ic = await matchTransData(inData, swisseph.SE_CALC_ITRANSIT, 'ic');
    }
    const rise = await matchTransData(
      inData,
      swisseph.SE_CALC_RISE + offset,
      'rise',
    );
    if (rise.jd >= -1) {
      valid = true;
    }
    if (showIcMc) {
      data = { valid, rise, set, mc, ic };
    } else {
      data = { valid, rise, set };
    }
  }
  return data;
};

export const calcSunTrans = async (datetime, geo, tzOffset = 0) => {
  const jd = calcJulDate(datetime);
  const transData = await calcSunTransJd(jd, geo);
  return { ...transData, datetime, tzOffset };
};

export const calcSunTransJd = async (
  jd,
  geo,
  jdOffset = 0,
): Promise<SunTransitionData> => {
  const curr = await calcTransitionJd(jd, geo, 0, false, false);
  const prev = await calcTransitionJd(jd - 1, geo, 0, false, false);
  const next = await calcTransitionJd(jd + 1, geo, 0, false, false);
  return {
    jd,
    geo,
    ...curr,
    prevRise: prev.rise,
    prevSet: prev.set,
    nextRise: next.rise,
  };
};

export const calcJyotishDay = async (datetime, geo, tzOffset = 0) => {
  const sunData = await calcSunTrans(datetime, geo, tzOffset);
  return new JyotishDay(sunData);
};

export const calcJyotishSunRise = async (datetime, geo) => {
  const jyotishDay = await calcJyotishDay(datetime, geo);
  return jyotishDay.toObject();
};

export const fetchIndianTimeData = async (datetime, geo, tzOffset = 0) => {
  const jyotishDay = await calcJyotishDay(datetime, geo, tzOffset);
  return new IndianTime(jyotishDay);
};

export const toIndianTime = async (datetime, geo) => {
  const iTime = await fetchIndianTimeData(datetime, geo);
  return iTime.toObject();
};
