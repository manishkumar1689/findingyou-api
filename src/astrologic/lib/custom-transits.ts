import * as swisseph from 'swisseph';
import { GeoPos } from '../interfaces/geo-pos';
import { calcAltitudeSE, calcGrahaPos, fetchHouseDataJd } from './core';

export const specialTransitKeys = ["lotOfFortune", "lotOfSpirit", "brghuBindu", "yogi", "avaYogi"];

export const fetchTransitSampleResultSet = async (jd = 0, geo: GeoPos, includeKeys = ['as', 'su', 'mo', 'ra']) => {
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
  return { resultMap, ascendant, sunLng, moonLng, rahuLng, ecliptic };
}

const calcBaseObjectsAltitude = async (key = "", jd = 0, geo: GeoPos, ascendant = 0, sunLng = 0, moonLng = 0, rahuLng = 0) => {
  let longitude = 0;
    const latitude = 0;
    switch (key) {
      case "lotOfFortune":
        longitude = (ascendant + (moonLng - sunLng) + 360) % 360;
        break;
      case "lotOfSpirit":
        longitude = (ascendant + sunLng - moonLng + 360) % 360;
        break;
      case "brghuBindu":
        longitude = ((moonLng + rahuLng) / 2) % 360;
        break;
      case "yogi":
        longitude = (sunLng + moonLng + 93 + 1 / 3) % 360;
        break;
      case "avaYogi":
        longitude = (((sunLng + moonLng + 93 + 1 / 3) % 360) + 560 / 3) % 360
        //latitude = limitValueToRange(limitValueToRange(sunLng + moonLng + 93 + 1 / 3, -90, 90) + 560, -90, 90);
        break;
    }
    const altitude = await calcAltitudeSE(jd, geo, longitude, latitude, true);
    return { longitude, latitude, altitude };
}

export const calcBaseObjects = async(jd = 0, geo: GeoPos) => {
  
  const { resultMap, sunLng, moonLng, rahuLng, ascendant } = await fetchTransitSampleResultSet(jd, geo);
  
  for (const key of specialTransitKeys) {
    const {longitude, latitude, altitude } = await calcBaseObjectsAltitude(key, jd, geo, ascendant, sunLng, moonLng, rahuLng);
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
      return ['as', 'su', 'mo'];
    case 'yogi':
    case 'avaYogi':
    case 'avayogi':
      return ['su', 'mo'];
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
    const { sunLng, moonLng, rahuLng, ascendant } = await fetchTransitSampleResultSet(currJd, geo, gKeys);
    const { altitude } = await calcBaseObjectsAltitude(key, currJd, geo, ascendant, sunLng, moonLng, rahuLng);
    rows.push({ altitude, matchedJd: currJd});
  }
  const vals = rows.map(row => row.altitude);
  const limitVal = minMode ? Math.min(...vals) : Math.max(...vals);
  
  const limitIndex = rows.findIndex(row => row.altitude === limitVal);
  const midIndex = Math.ceil(sampleNum / 2);
  return limitIndex >= 0 ? rows[limitIndex] : rows[midIndex];
}

export const sampleBaseObjects = async (jd = 0, geo: GeoPos) => {
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
  return {jd, transits: Object.fromEntries(entries) };
}