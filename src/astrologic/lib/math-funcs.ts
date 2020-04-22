import vargaValues from './settings/varga-values';

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
  (lng - offset) % 360;

export const calcAllVargas = lng => {
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

export const calcInclusiveNakshatras = (posOne: number, posTwo: number) =>
  calcInclusiveDistance(posOne, posTwo, 27);
