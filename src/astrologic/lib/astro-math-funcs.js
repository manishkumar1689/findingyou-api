const vargaValues = require('./settings/varga-values');

const longitudeMatchesHouseIndex = (deg, longitude) => longitude >= deg && longitude < ((deg + 30) % 360);

const mapSignToHouse = (deg, sign) => Math.ceil(deg / 30) === sign;

const calcVargaValue = (lng, num) => (lng * num) % 360;

const calcAllVargas = (lng) => {
  return vargaValues.map(v => {
    const value = calcVargaValue(lng, v.num);
    return { num: v.num, key: v.key, value };
  });
}

const calcVargaSet = (lng, num, key) => {
  const values = calcAllVargas(lng);
  return {
    num, key, values
  }
}

const calcInclusiveDistance = (posOne, posTwo, base) => ((posOne - posTwo + base) % base) + 1;

const calcInclusiveTwelfths = (posOne, posTwo) => calcInclusiveDistance(posOne, posTwo, 12);

const calcInclusiveNakshatras = (posOne, posTwo) => calcInclusiveDistance(posOne, posTwo, 27);

module.exports = { longitudeMatchesHouseIndex, mapSignToHouse, calcVargaValue, calcAllVargas, calcVargaSet, calcInclusiveDistance, calcInclusiveTwelfths, calcInclusiveNakshatras };