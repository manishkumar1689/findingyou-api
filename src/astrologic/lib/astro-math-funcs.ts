import vargaValues from './settings/varga-values';

export const longitudeMatchesHouseIndex = (deg, longitude) => longitude >= deg && longitude < ((deg + 30) % 360);

export const mapSignToHouse = (deg, sign) => Math.ceil(deg / 30) === sign;

export const calcVargaValue = (lng, num) => (lng * num) % 360;

export const calcAllVargas = (lng) => {
  return vargaValues.map(v => {
    const value = calcVargaValue(lng, v.num);
    return { num: v.num, key: v.key, value };
  });
}

export const calcVargaSet = (lng, num, key) => {
  const values = calcAllVargas(lng);
  return {
    num, key, values
  }
}

export const calcInclusiveDistance = (posOne, posTwo, base) => ((posOne - posTwo + base) % base) + 1;

export const calcInclusiveTwelfths = (posOne, posTwo) => calcInclusiveDistance(posOne, posTwo, 12);

export const calcInclusiveNakshatras = (posOne, posTwo) => calcInclusiveDistance(posOne, posTwo, 27);