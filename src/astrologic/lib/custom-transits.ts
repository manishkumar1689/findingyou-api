import * as swisseph from 'swisseph';
import { GeoPos } from '../interfaces/geo-pos';
import { calcAltitudeSE, calcGrahaPos, fetchHouseDataJd } from './core';
import { julToISODate } from './date-funcs';
import { calcDeclinationFromLngLatEcl } from './math-funcs';

export const specialTransitKeys = ["lotOfFortune", "lotOfSpirit", "brghuBindu", "yogi", "avaYogi"];

const extractRaFromResultMap = (resultMap: Map<string, any> = new Map()) => {
  const sunRa = resultMap.has('su')? resultMap.get('su').rectAscension : 0;
  const moonRa = resultMap.has('mo')? resultMap.get('mo').rectAscension : 0;
  const rahuRa = resultMap.has('ra')? resultMap.get('ra').rectAscension : 0;
  const ascRa = resultMap.has('as')? resultMap.get('as').rectAscension : 0;
  const ecliptic = resultMap.has('ec')? resultMap.get('ec').rectAscension : 0;
  return { ecliptic, ascRa, sunRa, moonRa, rahuRa };
}

export const fetchTransitSampleResultSet = async (jd = 0, geo: GeoPos, includeKeys = ['as', 'su', 'mo', 'ra']): Promise<Map<string, any>> => {
  const grahaSet = {
    su: swisseph.SE_SUN,
    mo: swisseph.SE_MOON,
    ra: swisseph.SE_MEAN_NODE
  };
  const resultMap: Map<string, any> = new Map();
  let ascendant = 0;
  let ecliptic = 0;
  if (includeKeys.includes('as')) {
    const houseData = await fetchHouseDataJd(jd, geo);
    const {
      mc,
      ascDeclination,
      ascRectAscension,
      mcRectAscension
    } = houseData;
    ecliptic = houseData.ecliptic;
    ascendant = houseData.ascendant;

    resultMap.set('as', {
      longitude: ascendant,
      latitude: 0,
      declination: ascDeclination,
      rectAscension: ascRectAscension,
      altitude: await calcAltitudeSE(jd, geo, ascendant, 0, true),
    });
    resultMap.set('ec', {
      longitude: ecliptic,
      latitude: ecliptic,
    });
    resultMap.set('mc', {
      longitude:  mc,
      latitude: 0,
      declination: ascDeclination,
      rectAscension: mcRectAscension
    });
  }
  for (const pair of Object.entries(grahaSet).filter(entry => includeKeys.includes(entry[0]))) {
    const [key, num] = pair;
    const result = await calcGrahaPos(jd, num);
    const altitude = await calcAltitudeSE(jd, geo, result.longitude, result.latitude);
    resultMap.set(key, {...result, altitude } );
  }
  
  const sunLng = resultMap.get('su').longitude;
  const moonLng = resultMap.get('mo').longitude;
  const rahuLng = resultMap.has('ra')? resultMap.get('ra').longitude : 0;
  return resultMap;
}

const calcBaseObjectsAltitude = async (key = "", jd = 0, geo: GeoPos, resultMap: Map<string,any> = new Map()) => {
  const { ascRa, moonRa, sunRa, rahuRa, ecliptic } = extractRaFromResultMap(resultMap);
  let ra = 0;
    switch (key) {
      case "lotOfFortune":
        ra = (ascRa + (moonRa - sunRa) + 360) % 360;
        break;
      case "lotOfSpirit":
        ra = (ascRa + sunRa - moonRa + 360) % 360;
        break;
      case "brghuBindu":
        ra = ((moonRa + rahuRa) / 2) % 360;
        break;
      case "yogi":
        ra = (sunRa + moonRa + 93 + 1 / 3) % 360;
        break;
      case "avaYogi":
        ra = (((sunRa + moonRa + 93 + 1 / 3) % 360) + 560 / 3) % 360
        break;
    }

    const declination = calcDeclinationFromLngLatEcl(ra, 0, ecliptic);
    const altitude = await calcAltitudeSE(jd, geo, ra, declination, true);
    return { longitude: ra, latitude: declination, altitude };
}

export const calcBaseObjects = async(jd = 0, geo: GeoPos) => {
  const resultMap= await fetchTransitSampleResultSet(jd, geo);  
  for (const key of specialTransitKeys) {
    const {longitude, latitude, altitude } = await calcBaseObjectsAltitude(key, jd, geo, resultMap );
    resultMap.set(key, { longitude, latitude, altitude } );
  }
  return Object.fromEntries(resultMap.entries());
}

class SampleTracker {
  jd = 0;
  val = 0;
  prevJd = 0;
  prevVal = 0;
  polarity = 0;
  prevPolarity = 0;

  setIfRise(newJd = 0, newVal = 0, setMode = false, prevJd = 0, prevVal = 0) {
    this.polarity = newVal < 0 ? -1 : 1;
    if (this.prevPolarity !== 0 && this.polarity !== this.prevPolarity) {
      if ((!setMode && this.prevPolarity < 0) || (setMode && this.prevPolarity > 0)) {
        this.val = newVal;
        this.jd = newJd;
        this.prevJd = prevJd;
        this.prevVal = prevVal;
      }
    }
    
    this.prevPolarity = newVal < 0 ? -1 : 1;
  }

  adjustRiseSet() {
    const diff = this.val - this.prevVal;
    const progress = Math.abs(this.val / diff);
    const diffJd = (this.jd - this.prevJd) * progress;
    this.jd = this.jd - diffJd;
  }

  setIfMaxMin(newJd = 0, newVal = 0, minMode = false, prevJd = 0, prevVal = 0) {
    if ((!minMode && newVal > this.val) || (minMode && newVal < this.val)) {
      this.jd = newJd;
      this.val = newVal;
      this.prevJd = prevJd;
      this.prevVal = prevVal;
    }
  }

  setIfMax(newJd = 0, newVal = 0, prevJd = 0, prevVal = 0) {
    this.setIfMaxMin(newJd, newVal, false, prevJd, prevVal);
  }

  setIfMin(newJd = 0, newVal = 0, prevJd = 0, prevVal = 0) {
    this.setIfMaxMin(newJd, newVal, true, prevJd, prevVal);
  }
}

class SampleTrackerGroup {
  rise = new SampleTracker();
  set = new SampleTracker();
  mc = new SampleTracker();
  ic = new SampleTracker();

  setSamplePoints(newJd = 0, newVal = 0, prevJd = 0, prevVal = 0) {
    this.rise.setIfRise(newJd, newVal, false, prevJd, prevVal);
    this.set.setIfRise(newJd, newVal, true, prevJd, prevVal);
    this.mc.setIfMax(newJd, newVal, prevJd, prevVal);
    this.ic.setIfMin(newJd, newVal, prevJd, prevVal);
  }

  adjustJds() {
    this.rise.adjustRiseSet();
    this.set.adjustRiseSet();
  }

  toTransits() {
    return { 
      rise: this.rise.jd,
      set: this.set.jd,
      mc: this.mc.jd,
      ic: this.ic.jd
    }
  }
}

const matchKeysForSampleTransit = (key = "") => {
  switch (key) {
    case 'lotOfFortune':
    case 'lotOfSpirit':
    case 'yogi':
    case 'avaYogi':
    case 'avayogi':
      return ['as', 'su', 'mo'];
    case 'brghuBindu':
    case 'brighuBindu':
    case 'brighubindu':
      return ['su', 'mo', 'ra'];
    default:
      return ['as', 'su', 'mo', 'ra'];
  }
}

const innerTransitLimit = async (key = "", geo: GeoPos, startJd = 0, endJd = 0, minMode = false) => {
  const sampleNum = 48;
  const sampleSpanNum = sampleNum * 2;
  const jdStep = (endJd - startJd) / sampleNum;
  const rows = [];
  for (let i = 0; i <= sampleSpanNum; i++) {
    const currJd = startJd + (i * jdStep);
    const gKeys = matchKeysForSampleTransit(key);
    const resultMap = await fetchTransitSampleResultSet(currJd, geo, gKeys);
    const { altitude } = await calcBaseObjectsAltitude(key, currJd, geo, resultMap );
    rows.push({ altitude, matchedJd: currJd});
  }
  const vals = rows.map(row => row.altitude);
  const limitVal = minMode ? Math.min(...vals) : Math.max(...vals);
  
  const limitIndex = rows.findIndex(row => row.altitude === limitVal);
  const midIndex = Math.ceil(sampleNum / 2);
  return limitIndex >= 0 ? rows[limitIndex] : rows[midIndex];
}

export const sampleBaseObjects = async (jd = 0, geo: GeoPos, showSamples = false) => {
  const refJd = jd + 0.5;
  const startJd = Math.floor(refJd) - 0.5;
  const numUnits = 144;
  const unit = 1 / numUnits;
  const samples = [];
  let currJd = startJd;
  const transitMap: Map<string, SampleTrackerGroup>  = new Map();
  
  specialTransitKeys.forEach(key => {
    transitMap.set(key, new SampleTrackerGroup() );
  });
  
  const startSampleIndex = -1;
  const endSampleNum = (numUnits * 1.25) + 1;
  let prevJd = startJd + (-1 * unit);
  const prevAlts: Map<string, number> = new Map();
  specialTransitKeys.forEach(key => {
    prevAlts.set(key, 0);
  });
  for (let i = startSampleIndex; i < endSampleNum; i++) {
    currJd = startJd + (i * unit);
    const sample = await calcBaseObjects(currJd, geo);
    
    
    specialTransitKeys.forEach(key => {
      const curr = transitMap.get(key);
      const prevAlt = prevAlts.get(key);
      const currAlt = sample[key].altitude;
      curr.setSamplePoints(currJd, currAlt, prevJd, prevAlt);
      transitMap.set(key, curr);
      prevAlts.set(key, currAlt);
    });
    samples.push({ jd: currJd, sample});
    prevJd = currJd + 0;
  }
  for (const key of specialTransitKeys) {
    const transitItem = transitMap.get(key);
    for (const sk of ['mc', 'ic']) {
      const minMode = sk === 'ic';
      const startJd = minMode ? transitItem.ic.prevJd : transitItem.mc.prevJd;
      const endJd = minMode ? transitItem.ic.jd: transitItem.mc.jd;
      const { matchedJd, altitude } = await innerTransitLimit(key, geo, startJd, endJd, minMode);
      transitItem[sk].jd = matchedJd;
      transitItem[sk].val = altitude;
    }
    transitItem.adjustJds();
  };
  const entries = [...transitMap.entries()].map(entry => {
    const [k, trItem] = entry;
    return [k, trItem.toTransits()];
  });
  const sampleData = showSamples ? samples.map(row => {
    const dt = julToISODate(row.jd);
    return { dt, ...row };
  }) : [];
  return {jd, transits: Object.fromEntries(entries), sampleData};
}