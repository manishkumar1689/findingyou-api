import { isNumeric, notEmptyString } from '../../lib/validators';
import vargaValues from './settings/varga-values';
import { zeroPad } from '../../lib/converters';
import { SignValue, SignHouse } from '../interfaces/sign-house';
import { NakshatraItem } from '../interfaces/nakshatra-item';
import grahaValues, {
  functionalHouseNatures,
  rulerSignsMap,
  aspectGroups,
} from './settings/graha-values';
import { Graha } from './models/graha-set';

export const extractString = (obj: any, key: string): string => {
  let str = '';
  if (obj instanceof Object) {
    if (notEmptyString(obj[key])) {
      str = obj[key];
    }
  }
  return str;
};

export const extractBool = (obj: any, key: string): boolean => {
  let val = false;
  if (obj instanceof Object) {
    if (obj[key]) {
      switch (typeof obj[key]) {
        case 'boolean':
          val = obj[key];
          break;
        case 'number':
          val = obj[key] > 0;
          break;
        case 'string':
          if (isNumeric(obj[key])) {
            val = parseInt(obj[key]) > 0;
          } else {
            switch (obj[key].toLowerCase()) {
              case 'true':
              case 'yes':
                val = true;
                break;
            }
          }
          break;
      }
    }
  }
  return val;
};

export const stripHtml = (val: string) => {
  let str = '';
  if (typeof val === 'string') {
    str = val.trim();
    if (/<\w+[^>]*?>/.test(str)) {
      str = str.replace(/<\/?\w+[^>]*?>/g, ' ').replace(/\s\s+/g, ' ');
    }
  }
  return str;
};

export const capitalize = (str: string) => {
  return str.substring(0, 1).toUpperCase() + str.substring(1);
};

export const extractKeyValue = (obj: any, key: string, defVal: any) => {
  let output = defVal;
  if (obj instanceof Object) {
    const matchedVals = Object.entries(obj)
      .filter(entry => entry[0] === key)
      .map(pair => pair[1]);
    if (matchedVals.length > 0) {
      output = matchedVals.shift();
    }
  }
  return output;
};

export const extractId = (obj: any): string => {
  let id = '';
  if (obj instanceof Object) {
    if (obj._id) {
      id = obj._id;
    }
  }
  return id;
};

export const hasObjectId = (obj: any) => {
  return extractId(obj).length > 3;
};

export const toWords = (val: any): string => {
  let str = '';
  if (typeof val === 'string') {
    str = val
      .replace(/_+/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .toLowerCase();
  }
  return str;
};

export const buildWHousesFromAscendant = (ascendant: number): Array<number> => {
  const firstW = Math.floor(ascendant / 30) * 30;
  const houses = [];
  for (let i = 0; i < 12; i++) {
    houses.push((firstW + i * 30) % 360);
  }
  return houses;
};

export const calcSign = (lng: number) => {
  return Math.floor((lng % 360) / 30) + 1;
};

export const matchHouseNum = (lng: number, houses: Array<number>): number => {
  const len = houses.length;
  const minIndex = houses.indexOf(Math.min(...houses));
  const matchedIndex = houses.findIndex((deg, index) => {
    const nextIndex = (index + 1) % len;
    const next = houses[nextIndex];
    const end = next < deg ? next + 360 : next;
    const lngPlus = lng + 360;
    const refLng =
      next < deg && next > 0 && lngPlus < end && minIndex === nextIndex
        ? lngPlus
        : lng;
    return refLng > deg && refLng <= end;
  });
  return matchedIndex + 1;
};

export const mapSignToHouse = (sign: number, houses: Array<number>): number => {
  const numH = houses.length;
  let hn = 0;
  if (numH > 0) {
    const diff = houses[0] / 30;
    const hnr = (sign - diff) % numH;
    hn = hnr < 1 ? hnr + numH : hnr;
  }
  return hn;
};

export const calcAspectIsApplying = (gr1: Graha, gr2: Graha): boolean => {
  const firstFaster = gr1.lngSpeed > gr2.lngSpeed;
  const firstHigher = gr1.longitude > gr2.longitude;
  return firstFaster ? !firstHigher : firstHigher;
};

export const calcVargaValue = (lng: number, num: number) => (lng * num) % 360;

export const subtractLng360 = (lng: number, offset = 0) =>
  (lng + 360 - offset) % 360;

export const subtractSign = (sign1: number, sign2: number) =>
  (sign1 + 12 - sign2) % 12;

export const calcAllVargas = (lng: number) => {
  return vargaValues.map(v => {
    const value = calcVargaValue(lng, v.num);
    return { num: v.num, key: v.key, value };
  });
};

export const calcVargaSet = (lng: number, num, key) => {
  const values = calcAllVargas(lng);
  return {
    num,
    key,
    values,
  };
};

export const calcInclusiveDistance = (
  posOne: number,
  posTwo: number,
  base: number,
) => ((posTwo - posOne + base) % base) + 1;

export const calcInclusiveTwelfths = (posOne: number, posTwo: number) =>
  calcInclusiveDistance(posOne, posTwo, 12);

export const calcInclusiveNakshatras = (posOne: number, posTwo: number) =>
  calcInclusiveDistance(posOne, posTwo, 27);

export const nakashatra27Fraction = (lng: number) =>
  (lng % (360 / 27)) / (360 / 27);

export const toSignValues = (
  values: Array<number>,
  houseSign = 0,
): Array<SignValue> => {
  return values.map((value, index) => {
    const sign = index + 1;
    const house = calcInclusiveTwelfths(sign, houseSign);
    return {
      sign,
      value,
      house,
    };
  });
};

export const matchNakshatra28 = (index: number, offset = 0) => {
  const num = index + 1;
  const dictNum = num > 22 ? num - 1 : num;
  const ref = zeroPad(num);
  const itemKey = num < 22 ? 'n27_' + ref : 'n28_' + num;
  const dictKey =
    num < 22
      ? 'n27_' + ref
      : num === 22
      ? 'n28_' + ref
      : 'n27_' + zeroPad(dictNum);
  return { num, ref, itemKey, dictKey };
};

export const matchNakshatra28Item = (
  nakshatraValues: Array<NakshatraItem>,
  num = 0,
  itemKey = '',
) => {
  return nakshatraValues.find(nv => {
    if (num <= 22) {
      return nv.key === itemKey;
    } else {
      return nv.key28 === itemKey;
    }
  });
};

export const calcDist360 = (lng1: number, lng2: number) => {
  const lngs = [lng1, lng2];
  lngs.sort((a, b) => (a < b ? -1 : 1));
  const [low, high] = lngs;
  const results = [high - low, low + 360 - high];
  const minDiff = Math.min(...results);
  return minDiff;
};

export const loopShift = (arr: Array<any>, index: number) => {
  const s1 = arr.slice(index, arr.length);
  const s2 = arr.slice(0, index);
  return [...s1, ...s2];
};

export const loopShiftInner = (arr: Array<SignValue>, index) => {
  const values = arr.map(p => p.value);
  const shifted = loopShift(arr, index);
  return shifted.map((p, i) => {
    const value = values[i];
    return {
      sign: p.sign,
      house: p.house,
      value,
    };
  });
};

export const plotOnCircle = (
  radius: number,
  angle: number,
  offsetX = 0,
  offsetY = 0,
  counterClockwise = true,
) => {
  const deg = counterClockwise ? 540 - angle : angle;
  const x = radius * Math.cos((deg * Math.PI) / 180) + 50 + offsetX;
  const y = radius * Math.sin((deg * Math.PI) / 180) + 50 + offsetY;
  return { x, y };
};

export const renderOffsetStyle = (x: number, y: number, deg = 0) => {
  const suffix = deg !== 0 ? `transform:rotate(${deg}deg)` : '';
  return `top: ${y}%;left: ${x}%;${suffix};`;
};

export const deepClone = (obj = null) => {
  if (obj instanceof Object) {
    return Object.assign(
      Object.create(
        // Set the prototype of the new object to the prototype of the instance.
        // Used to allow new object behave like class instance.
        Object.getPrototypeOf(obj),
      ),
      // Prevent shallow copies of nested structures like arrays, etc
      JSON.parse(JSON.stringify(obj)),
    );
  }
};

export const midLng = (lng1: number, lng2: number) => {
  const lngs = [lng1, lng2];
  lngs.sort();
  const [l1, l2] = lngs;
  const median = ((l1 + l2) / 2) % 360;
  const dist = Math.abs(median - l1);
  return dist > 90 ? ((360 + l1 + l2) / 2) % 360 : median;
};

export const extractSurfaceData = (paired: any) => {
  let surface = null;
  if (paired instanceof Object) {
    const { surfaceGeo, surfaceAscendant, surfaceTzOffset } = paired;
    if (surfaceGeo instanceof Object) {
      const { lat, lng } = surfaceGeo;
      surface = {
        geo: { lng, lat },
        ascendant: surfaceAscendant,
        tzOffset: surfaceTzOffset,
      };
    }
  }
  return surface;
};

export const degToSign = (lng: number) => Math.floor(lng / 30) + 1;

export const calcAspects = (lng1: number, lng2: number) => {
  const aspectFracs = aspectGroups.reduce((a, b) => a.concat(b), []);
  const diff = calcDist360(lng1, lng2);
  const aspects = aspectFracs.map(row => {
    const { div, fac } = row;
    const deg = ((1 / div) * fac * 360) % 360;
    const positive = diff >= 0;
    const orb = positive ? deg - diff : 0 - (deg - Math.abs(diff));
    const absOrb = Math.abs(orb);
    return {
      div,
      fac,
      target: deg,
      orb,
      absOrb,
    };
  });
  aspects.sort((a, b) => a.absOrb - b.absOrb);
  const topAspects = aspects.filter(aspect => aspect.absOrb <= 15);
  return { deg: diff, aspects: topAspects };
};

export const inSignDegree = (lng: number) => {
  return lng % 30;
};

export const abhijitNakshatraRange = () => {
  return [(360 / 27) * 20.75, (360 / 27) * (21 + 1 / 15)];
};

export const nakshatra27 = (lng: number) => {
  return Math.floor(lng / (360 / 27)) + 1;
};

export const nakshatra28 = (lng: number) => {
  let nkVal = nakshatra27(lng);
  const [minAbhjit, maxAbhjit] = abhijitNakshatraRange();
  if (lng >= minAbhjit) {
    nkVal = lng < maxAbhjit ? 22 : nkVal + 1;
  }
  return nkVal;
};

export const withinNakshatra27 = (lng: number) => {
  return lng % (360 / 27);
};

export const nakshatra27Progress = (lng: number) => {
  return withinNakshatra27(lng) / (360 / 27);
};

export const withinNakshatra28 = (lng: number) => {
  const nkVal = nakshatra28(lng);
  const [abStart, abEnd] = abhijitNakshatraRange();
  switch (nkVal) {
    case 22:
      return lng - abStart;
    case 23:
      return lng - abEnd;
    default:
      return withinNakshatra27(lng);
  }
};

export const nakshatra28Progress = (lng: number) => {
  const nkVal = nakshatra28(lng);
  const [abStart, abEnd] = abhijitNakshatraRange();
  switch (nkVal) {
    case 21:
      return (lng - (360 / 27) * 20) / (abStart - (360 / 27) * 20);
    case 22:
      return (lng - abStart) / (abEnd - abStart);
    case 23:
      return (lng - abEnd) / ((360 / 27) * 22 - abEnd);
    default:
      return nakashatra27Fraction(lng);
  }
};
