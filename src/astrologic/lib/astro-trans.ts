import * as swisseph from 'swisseph';
import { calcJulDate, jdToDateTime, calcAstroWeekDayIndex } from './astro-dates';
import { JyotishDay } from './models/jyotish-day';
import { IndianTime } from './models/indian-time';
import { riseTransAsync } from './sweph-async';
import { isNumeric } from './validators';
import { ephemerisDefaults } from '../../.config';

export const matchTransData = async (inData, transType = 0, transKey = 'trans') => {
  let data = { valid: false };
  inData.transType = transType;
  const jd = inData.jd;
  switch (transKey) {
    case 'rise':
      inData.jd -= 0.5;
      break;
  }

  await riseTransAsync(...Object.values(inData)
  ).catch(d => {
    data = d;
    if (!d.error) {
      data.valid = true;
    } else {
      data.valid = false;
    }
  });
  let result = { jd: -1, dt: null };
  //const offset = Math.floor(jd) < Math.floor(data.transitTime) && transKey === 'set' ? 1 : 0;
  if (data.valid) {
    if (data.transitTime >= 0) {
      result = {
        jd: data.transitTime,
        dt: jdToDateTime(data.transitTime),
        after: jd > data.transitTime,
        //after: (jd + offset) > data.transitTime,
      }
    }
  }
  return result;
}

const centerDiscRising = () => {
  return (swisseph.SE_BIT_DISC_CENTER | swisseph.SE_BIT_NO_REFRACTION) || swisseph.SE_BIT_GEOCTR_NO_ECL_LAT;
}

export const calcTransition = async (datetime, geo, planetNum, showInput = true) => {
  const jd = calcJulDate(datetime);
  const data = await calcTransitionJd(jd, geo, planetNum, showInput, true);
  return { jd, ...data };
}

export const calcTransitionJd = async (jd, geo, planetNum, showInput = true, showIcMc = false) => {
  let data = { valid: false };
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
      temperature
    }
    const offset = centerDiscRising();
    let mc = null;
    let ic = null;

    const set = await matchTransData(inData, swisseph.SE_CALC_SET + offset, 'set');
    if (showIcMc) {
      mc = await matchTransData(inData, swisseph.SE_CALC_MTRANSIT, 'mc');
      ic = await matchTransData(inData, swisseph.SE_CALC_ITRANSIT, 'ic');
    }
    const rise = await matchTransData(inData, swisseph.SE_CALC_RISE + offset, 'rise');

    if (rise.jd >= -1) {
      valid = true;
    }
    if (showIcMc) {
      data = { valid, rise, set, mc, ic };
    } else {
      data = { valid, rise, set };
    }
    if (showInput) {
      data.input = { ...inData, offset };
    }
  }
  return data;
}

const calcSunTrans = async (datetime, geo) => {
  const jd = calcJulDate(datetime);
  return calcSunTransJd(jd, geo);
}

const calcSunTransJd = async (jd, geo) => {
  const prev = await calcTransitionJd(jd - 1, geo, 0, false, false);
  const curr = await calcTransitionJd(jd, geo, 0, false, false);
  const next = await calcTransitionJd(jd + 1, geo, 0, false, false);
  return { jd, geo, ...curr, prevRise: prev.rise, prevSet: prev.set, nextRise: next.rise };
}

export const calcJyotishDay = async (datetime, geo) => {
  const sunData = await calcSunTrans(datetime, geo);
  return new JyotishDay(sunData);
}

export const calcJyotishSunRise = async (datetime, geo) => {
  const jyotishDay = await calcJyotishDay(datetime, geo);
  return jyotishDay.toObject();
}

export const fetchIndianTimeData = async (datetime, geo) => {
  const jyotishDay = await calcJyotishDay(datetime, geo);
  // { jd, startJd, dayStart, sunData, dayLength, dayBefore, isDaytime }
  // { jd, sunData, startJd, dayStart, jdTime, progress, dayLength, isDaytime, year, dayNum, muhurta, ghatiVal, ghati, vighati, lipta }
  return new IndianTime(jyotishDay, datetime);
}

export const toIndianTime = async (datetime, geo) => {
  const iTime = await fetchIndianTimeData(datetime, geo);
  return iTime.toObject();
}
