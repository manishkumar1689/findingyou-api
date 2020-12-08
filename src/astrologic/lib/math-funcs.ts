import vargaValues from './settings/varga-values';
import { GeoPos } from '../interfaces/geo-pos';

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

export const calcVargaValue = (lng, num) => (lng * num) % 360;

export const subtractLng360 = (lng: number, offset: number = 0) =>
  (lng + 360 - offset) % 360;

export const calcAllVargas = (lng: number) => {
  return vargaValues.map(v => {
    const value = calcVargaValue(lng, v.num);
    return { num: v.num, key: v.key, value };
  });
};

export const calcVargaSet = (lng, num, key) => {
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
) => ((posOne - posTwo + base) % base) + 1;

export const calcInclusiveTwelfths = (posOne: number, posTwo: number) =>
  calcInclusiveDistance(posOne, posTwo, 12);

export const calcInclusiveSignPositions = (sign1: number, sign2: number) =>
  calcInclusiveDistance(sign2, sign1, 12);

export const calcInclusiveNakshatras = (posOne: number, posTwo: number) =>
  calcInclusiveDistance(posOne, posTwo, 27);

const toRadians = (degrees: number) => degrees * (Math.PI / 180);

export const toDegrees = (radians: number) => radians / (Math.PI / 180);

export const geoToRadians = (coords: GeoPos) => {
  return {
    lat: toRadians(coords.lat),
    lng: toRadians(coords.lng),
  };
};

export const midPointSurface = (coord1: GeoPos, coord2: GeoPos) => {
  const c1 = geoToRadians(coord1);
  const c2 = geoToRadians(coord2);
  const bx = Math.cos(c2.lat) * Math.cos(c2.lng - c1.lng);
  const by = Math.cos(c2.lat) * Math.sin(c2.lng - c1.lng);
  const midLat = Math.atan2(
    Math.sin(c1.lat) + Math.sin(c2.lat),
    Math.sqrt((Math.cos(c1.lat) + bx) * (Math.cos(c1.lat) + bx) + by * by),
  );
  const midLng = c1.lng + Math.atan2(by, Math.cos(c1.lat) + bx);
  return { lat: toDegrees(midLat), lng: toDegrees(midLng) };
};

export const to360 = lng => (lng >= 0 ? lng + 180 : 180 + lng);

export const from360 = lng => (lng > 180 ? lng - 180 : 0 - (180 - lng));

const medianLat = (v1: number, v2: number) => {
  const offset = 90;
  return (v1 + offset + (v2 + offset)) / 2 - offset;
};

const medianLng = (v1: number, v2: number) => {
  const offset = 180;
  const direction = v1;
  const fullC = offset * 2;
  const lngs = [to360(v2), to360(v1)];
  lngs.sort();
  const [d1, d2] = lngs;
  const reverse = Math.abs(d2 - d1) > offset;
  const isWest = reverse ? v1 + v2 > 0 : v1 + v2 < 0;
  const res360 = ((d1 + d2) % fullC) / 2;
  const resA = from360(res360) % offset;
  const res1 = isWest ? resA : 0 - resA;
  const resB = offset - res1;
  const res2a = isWest ? fullC - resB : resB;
  const res2 = isWest && res2a > 0 ? 0 - res2a : res2a;
  const res2isBetween = to360(res2) > d1 && to360(res2) <= d2;
  const result = reverse || res2isBetween ? res2 : res1;
  return result;
};

export const medianLatlng = (coord1: GeoPos, coord2: GeoPos) => {
  return {
    lat: medianLat(coord1.lat, coord2.lat),
    lng: medianLng(coord1.lng, coord2.lng),
  };
};
