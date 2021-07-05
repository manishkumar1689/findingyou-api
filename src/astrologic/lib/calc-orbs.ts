import { mapLngRange } from "../../lib/query-builders";

export interface AspectRow {
  key: string;
  deg: number;
  weight?: number;
}

export interface OrbSetRow {
  key: string; // aspect key
  value: number;
}

export interface OrbSet {
  key: string; // graha key
  orbs: Array<OrbSetRow>;
}

export interface AspectSet {
  key: string;
  k1: string;
  k2: string;
  orb?: number;
}

export const orbMatrix: Array<Array<number>> = [
  [9.0, 5.0, 1.5, 3.0, 1.0, 0.5],
  [7.0, 5.0, 1.5, 3.0, 1.0, 0.5],
  [8.0, 5.0, 1.5, 3.0, 1.0, 0.5],
  [3.0, 2.0, 1.0, 1.0, 1.0, 0.5],
  [1.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  [7.0, 5.0, 1.5, 3.0, 1.0, 0.5],
];

export const grahaOrbGroups: Array<Array<string>> = [
  ['su', 'mo'],
  ['me', 've', 'ma'],
  ['ju', 'sa'],
  ['ur', 'ne', 'pl'],
  ['ra', 'ke'],
];

export const aspectGroups: Array<Array<string>> = [
  ['conjunction', 'opposition', 'trine', 'square'],
  ['sextile'],
  ['semisextile'],
  ['sesquisquare', 'quincunx', 'semisquare'],
  ['quintile', 'biquintile'],
];

export const aspects: Array<AspectRow> = [
  { key: 'opposition', deg: 180.0, weight: 1 },
  { key: 'quadnovile', deg: 160.0, weight: 10 },
  { key: 'triseptile', deg: (360.0 / 7.0) * 3.0, weight: 12 }, // 154.28571
  { key: 'quincunx', deg: 150.0, weight: 2 },
  { key: 'biquintile', deg: 144.0, weight: 8 },
  { key: 'sesquisquare', deg: 135.0, weight: 6 },
  { key: 'trine', deg: 120.0, weight: 4 },
  { key: 'tridecile', deg: 108.0, weight: 9 },
  { key: 'biseptile', deg: 360.0 / 3.5, weight: 15 }, // 102.85714
  { key: 'square', deg: 90.0, weight: 3 },
  { key: 'binovile', deg: 80.0, weight: 9 },
  { key: 'quintile', deg: 72.0, weight: 8 },
  { key: 'sextile', deg: 60.0, weight: 7 },
  { key: 'septile', deg: 360.0 / 7.0, weight: 11 }, // 51.42857
  { key: 'semisquare', deg: 45.0, weight: 6 },
  { key: 'novile', deg: 40.0, weight: 6 },
  { key: 'dectile', deg: 36.0, weight: 8 },
  { key: 'semisextile', deg: 30.0, weight: 5 },
  { key: 'conjunction', deg: 0.0, weight: 0 },
];

const matchAspectKey = (key: string) => {
  let matchedKey = key
    .toLowerCase()
    .replace(/_+/g, '-')
    .replace(/^bi-/i, 'bi');
  switch (matchedKey) {
    case 'quinquix':
    case 'quincunx':
    case 'inconjunct':
      return 'quincunx';
    default:
      return matchedKey;
  }
};

const matchGrahaGroupIndex = (grahaKey: string): number => {
  const index = grahaOrbGroups.findIndex(keys => keys.includes(grahaKey));
  return index < 0 ? 5 : index;
};

const matchAspectGroupIndex = (aspectKey: string): number => {
  const index = aspectGroups.findIndex(keys => keys.includes(aspectKey));
  return index < 0 ? 5 : index;
};

export const buildDegreeRange = (degree: number, orb = 0) => {
  return [(degree + 360 - orb) % 360, (degree + 360 + orb) % 360];
}

export const buildLngRange = (degree: number, orb = 0) => {
  return mapLngRange(buildDegreeRange(degree, orb));
}

export const calcAllAspectRanges = (
  aspectRow: AspectRow,
  orb = 0,
  range: number[],
) => {
  const ranges = [range];
  if (aspectRow instanceof Object) {
    const overrideAspects = aspects.filter(
      asp => asp.weight < aspectRow.weight,
    );
    if (aspectRow.deg < 180 && aspectRow.deg > 0) {
      const tDeg = 360 - aspectRow.deg;
      const hasBetterMatch = overrideAspects.some(oa => {
        const mx = oa.deg > 0 && oa.deg < 180 ? 2 : 1;
        let nm = 0;
        for (let j = 0; j <= mx; j++) {
          const tg = j === 0 ? oa.deg : 360 - oa.deg;
          if (tg === tDeg) {
            nm++;
          }
        }
        return nm > 0;
      });
      if (!hasBetterMatch) {
        ranges.push(buildDegreeRange(tDeg, orb));
      }
    }
  }
  return ranges;
};

export const calcOrb = (aspectKey: string, k1: string, k2: string) => {
  const matchedKey = matchAspectKey(aspectKey);
  const g1Index = matchGrahaGroupIndex(k1);
  const g2Index = matchGrahaGroupIndex(k2);
  const aspectIndex = matchAspectGroupIndex(matchedKey);
  const orb1 = orbMatrix[aspectIndex][g1Index];
  const orb2 = orbMatrix[aspectIndex][g2Index];
  const orb = (orb1 + orb2) / 2;
  const aspectRow = aspects.find(asp => asp.key === matchedKey);
  const hasMatch = aspectRow instanceof Object;
  const targetDeg = hasMatch ? aspectRow.deg : 0;
  const range = [(targetDeg + 360 - orb) % 360, (targetDeg + orb) % 360];
  const ranges = hasMatch
    ? calcAllAspectRanges(aspectRow, orb, range)
    : [range];
  return {
    key: matchedKey,
    g1: k1,
    g2: k2,
    range,
    orb,
    deg: targetDeg,
    ranges,
    row: aspectRow,
  };
};

/* export const calcOrbs = (aspectKey: string, k1: string, k2: string) => {
  const ad = calcOrb(aspectKey, k1, k2);

  return data;
}; */

export const matchAspectAngle = (aspectKey: string): number => {
  const matchedKey = aspectKey.replace(/_+/g, '-');
  const row = aspects.find(asp => asp.key === matchedKey);
  return row instanceof Object ? row.deg : 0;
};

export const calcOrbByMatrix = (
  aspectKey: string,
  k1: string,
  k2: string,
  matrix: Array<OrbSet>,
) => {
  const matchedKey = aspectKey.replace(/_+/g, '-');
  const or1 = matrix.find(row => row.key === k1);
  const or2 = matrix.find(row => row.key === k2);
  let orb1 = 0;
  let orb2 = 0;
  let targetDeg = 0;
  const aspectRow = aspects.find(asp => asp.key === matchedKey);
  if (
    aspectRow instanceof Object &&
    or1 instanceof Object &&
    or2 instanceof Object
  ) {
    const item1 = or1.orbs.find(row => row.key === matchedKey);
    const item2 = or2.orbs.find(row => row.key === matchedKey);
    if (item1 instanceof Object && item2 instanceof Object) {
      orb1 = item1.value;
      orb2 = item2.value;
      targetDeg = aspectRow.deg;
    }
  }
  const orb = (orb1 + orb2) / 2;
  const range = [(targetDeg + 360 - orb) % 360, (targetDeg + orb) % 360];
  return {
    key: matchedKey,
    g1: k1,
    g2: k2,
    range,
    orb,
    deg: targetDeg,
  };
};
