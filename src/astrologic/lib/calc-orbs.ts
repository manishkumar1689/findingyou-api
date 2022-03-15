import { mapLngRange } from '../../lib/query-builders';
import { calcAyanamsha, calcLngsJd, relativeAngle } from './core';
import { KeyLng, ProgressResult } from './interfaces';
import { subtractLng360 } from './math-funcs';
import { Chart } from './models/chart';
import { buildCurrentProgressPositions } from './settings/progression';

export interface AspectRow {
  key: string;
  deg: number;
  weight?: number;
}

export interface AspectAngles {
  key: string;
  angles: number[];
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

export interface AspectResult {
  k1?: string;
  k2?: string;
  lng1: number;
  lng2: number;
  aspectDiff: number;
  diff: number;
  aspected?: boolean;
  neg?: boolean;
}

export interface AspectResultSet {
  key: string;
  results: AspectResult[];
}

export interface AspectMatchItem {
  key: string;
  diff: number;
  diffKey?: string;
  neg?: boolean;
}

export interface PairMatchSet {
  k1: string;
  k2: string;
  value: number;
  lngs?: number[];
  matches: AspectMatchItem[];
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

const aspectMap = {
  opposition: 'hard',
  trine: 'soft',
  square: 'hard',
  conjunction: 'soft'
}

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

export const coreAspects = [
  { key: 'conjunction', angles: [0] },
  { key: 'opposition', angles: [180] },
  { key: 'trine', angles: [120, 240] },
  { key: 'square', angles: [90, 270] },
  { key: 'quincunx', angles: [150] },
];

export const calcDist360 = (lng1: number, lng2: number): number => {
  const lngs = [lng1, lng2];
  lngs.sort((a, b) => (a < b ? -1 : 1));
  const [low, high] = lngs;
  const results = [high - low, low + 360 - high];
  const minDiff = Math.min(...results);
  return minDiff;
};

export const calcAspect = (
  lng1: number,
  lng2: number,
  aspectKey = 'conjunction',
): AspectResult => {
  const aspectRow = coreAspects.find(
    (row: AspectAngles) => row.key === aspectKey,
  );
  let aspectDiff = 360;
  const diff = calcDist360(lng1, lng2);
  if (aspectRow instanceof Object) {
    const aspectVals = aspectRow.angles.map(angle => calcDist360(diff, angle));
    aspectDiff = Math.min(...aspectVals);
  }
  return { lng1, lng2, diff, aspectDiff };
};

export const buildCoreAspects = (
  p1Set: ProgressResult,
  p2Set: ProgressResult,
  tolerance = 2 + 1 / 60,
  showAll = false,
): AspectResultSet[] => {
  const p2Keys = Object.keys(p2Set.bodies);
  return coreAspects
    .map(row => {
      const results = Object.entries(p1Set.bodies)
        .map(([k1, lng]) => {
          if (p2Keys.includes('ve')) {
            return {
              k1,
              k2: 've',
              ...calcAspect(lng, p2Set.bodies.ve, row.key),
            };
          } else {
            return {
              k1: '',
              k2: '',
              lng1: -1,
              lng2: -1,
              diff: -1,
              aspectDiff: -1,
              neg: false
            };
          }
        })
        .filter(row => row.lng1 >= 0 && row.lng2 >= 0)
        .map(row => {
          const aspected = row.aspectDiff <= tolerance;
          return { ...row, aspected };
        })
        .filter(row => showAll || row.aspected);
      return {
        key: row.key,
        results,
      };
    })
    .filter(row => row.results.length > 0);
};

const matchAspectKey = (key: string) => {
  const matchedKey = key
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
};

export const buildLngRange = (degree: number, orb = 0) => {
  return mapLngRange(buildDegreeRange(degree, orb));
};

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

export const calcAllAspectsFromLngs = (
  firstSet: KeyLng[] = [],
  secondSet: KeyLng[] = [],
  aspectRows: AspectRow[] = [],
  orb = 2 + 1 / 60,
  notSame = false,
  onlyWithMatches = true,
) => {
  const aspects = [];
  firstSet.forEach(r1 => {
    let diffKeys = [];
    secondSet.forEach(r2 => {
      const excludeSame = notSame && r1.key === r2.key;
      if (!excludeSame) {
        const angle = relativeAngle(r1.lng, r2.lng);
        const matches = aspectRows
          .map(ar => {
            const diff1 = calcDist360(angle, ar.deg);
            const diff2 = calcDist360(ar.deg, angle);
            const diff = Math.min(...[diff1, diff2]);
            const neg = diff === diff1 ? (angle - ar.deg) < 0 : (ar.deg - angle) < 0;
            return {
              key: ar.key,
              diff,
              diffKey: [ar.key, diff].join('_'),
              neg
            };
          })
          .filter(
            ar => ar.diff < orb && diffKeys.includes(ar.diffKey) === false,
          );
        diffKeys = diffKeys.concat(matches.map(match => match.diffKey));
        aspects.push({
          k1: r1.key,
          k2: r2.key,
          value: angle,
          lngs: [r1.lng, r2.lng],
          matches: matches.map(row => {
            const { key, diff, neg } = row;
            return { key, diff, neg };
          }),
        });
      }
    });
  });
  return aspects.filter(as => !onlyWithMatches || as.matches.length > 0);
};

export const buildCurrentTrendsSnippetKeyPair = (
  pair: string[] = [],
  k1 = '',
  aspect = '',
  k2 = '',
): string[] => {
  let subKey = '';
  let subCat = '';
  if (pair.length === 2) {
    subCat = pair.includes('transit') ? 'transit' : 'progressed';
    subKey = [k1, aspect, k2].join('_');
  }
  return [subCat, subKey];
};

const mapAspectMatchPairsAndKeys = (
  row: PairMatchSet,
  typePair: string[] = [],
) =>
  row.matches.map(rm => {
    const aspKey = aspectMap[rm.key];
    const snippetKey = buildCurrentTrendsSnippetKeyPair(
      typePair,
      row.k1,
      aspKey,
      row.k2,
    );
    const reverse = typePair.length === 2 && typePair[0] === typePair[1];
    const relation = typePair.join('_');
    if (reverse && snippetKey.length === 2) {
      const subKey = snippetKey[1];
      snippetKey.push(
        subKey
          .split('_')
          .reverse()
          .join('_'),
      );
    }
    const { k1, k2, value, lngs } = row;
    return {
      k1,
      k2,
      value,
      lngs,
      ...rm,
      snippetKey,
      relation
    };
  });

export const buildCurrentTrendsData = async (
  jd = 0,
  chart: Chart = new Chart(),
  showMode = 'matches',
  ayanamsaKey = 'true_citra',
  tropical = false,
  buildMatchRange = false,
) => {
  
  const rsMap: Map<string, any> = new Map();
  const baseGrahaKeys = ['su', 'mo', 'ma', 'me', 'ju', 've', 'sa'];

  const currentGrahaKeys = [...baseGrahaKeys, 'ur', 'ne', 'pl'];

  const birthGrahaKeys = [...currentGrahaKeys, 'mc', 'as'];

  const showPositions = ['charts', 'all'].includes(showMode);
  const showAspectGroups = ['groups', 'all'].includes(showMode);

  const lngMode = tropical ? 'tropical' : 'sidereal';

  const progressData = await buildCurrentProgressPositions(
    chart.jd,
    jd,
    baseGrahaKeys,
    ayanamsaKey,
    tropical
  );
  
  const ayaRow = chart.ayanamshas.find(row => row.key === ayanamsaKey);
  const natalAyaVal = ayaRow instanceof Object ? ayaRow.value : 24;
  const natalAyaValUsed = tropical? 0 : natalAyaVal;
  const transitAyaVal = await calcAyanamsha(jd, ayanamsaKey)
  const transitAyaValUsed = tropical ? 0 : transitAyaVal;
  const progAyaVal = tropical? 0 : progressData.ayanamshaValue;
  
  rsMap.set('lngMode', lngMode);

  rsMap.set('ayanamshas', {
    key: ayaRow.key,
    natal: natalAyaVal,
    transit: transitAyaVal,
    progressed: progAyaVal,
  });
  const aspectKeys = Object.keys(aspectMap);
  const currentPos = await calcLngsJd(jd, currentGrahaKeys, transitAyaValUsed);

  let birthPos = [];
  birthPos = chart.grahas.map(gr => {
    const { key, lng } = gr;
    return {
      key,
      lng: subtractLng360(lng, natalAyaValUsed),
    };
  });
  birthPos.push({ key: 'as', lng: chart.ascendant });
  birthPos.push({ key: 'mc', lng: chart.mc });

  const filteredBirthPos = birthPos.filter(row =>
    birthGrahaKeys.includes(row.key),
  );
  
  const progressPos = progressData.bodies;
  const filteredAspects = aspects.filter(as => aspectKeys.includes(as.key));
  
  if (showPositions) {
    rsMap.set('current', currentPos);
    rsMap.set('birth', filteredBirthPos);
    rsMap.set('progress', progressPos);
  }

  const currentToBirth = calcAllAspectsFromLngs(
    currentPos,
    filteredBirthPos,
    filteredAspects,
    1,
  );
  const currentToProgressed = calcAllAspectsFromLngs(
    currentPos,
    progressPos,
    filteredAspects,
    1,
  );
  const progressedToBirth = calcAllAspectsFromLngs(
    progressPos,
    filteredBirthPos,
    filteredAspects,
    2 + 1 / 60,
  );
  const progressedToProgressed = calcAllAspectsFromLngs(
    progressPos,
    progressPos,
    filteredAspects,
    2 + 1 / 60,
    true,
  );
  if (showAspectGroups) {
    rsMap.set('currentToBirth', currentToBirth);
    rsMap.set('currentToProgressed', currentToProgressed);
    rsMap.set('progressedToBirth', progressedToBirth);
    rsMap.set('progressedToProgressed', progressedToProgressed);
  }

  const matches1 = currentToBirth.map(row =>
    mapAspectMatchPairsAndKeys(row, ['transit', 'natal']),
  );

  const matches2 = currentToProgressed.map(row =>
    mapAspectMatchPairsAndKeys(row, ['transit', 'progressed']),
  );

  const matches3 = progressedToBirth.map(row =>
    mapAspectMatchPairsAndKeys(row, ['progressed', 'natal']),
  );

  const matches4 = progressedToProgressed.map(row =>
    mapAspectMatchPairsAndKeys(row, ['progressed', 'progressed']),
  );
  const matches = [
    ...matches1,
    ...matches2,
    ...matches3,
    ...matches4,
  ].reduce((a, b) => a.concat(b));
  const matchRanges:Map<string, any[]> = new Map();
  if (buildMatchRange && matches.length > 0) {
    for (let i = -1; i < 15; i++) {
      const cd = await buildCurrentTrendsData(jd + i, chart, showMode, ayanamsaKey, tropical, false);
      const negToMultiple = (neg: boolean): number => neg ? -1 : 1;
      const ms = cd.get('matches');
      ms.forEach(m => {
        const lk = [m.relation, m.k1, m.k2, m.key].join('_');
        const mItems = matchRanges.has(lk)? matchRanges.get(lk) : [];
        const orb = m.relation.includes('transit')? 1 : 2 + 1/60;
        
        const prev =  mItems.length > 0 ? mItems[mItems.length - 1].diff * negToMultiple(m.neg) : 0;
        const curr = m.diff * negToMultiple(m.neg);
        const rate = mItems.length > 0 ? Math.abs(prev - curr) : 0;
        if (mItems.length === 1) {
          mItems[0].rate = rate;
        }
        const prog = ((curr / orb  * 1) + 1) / 2;
        const pc = prog * 100;
        mItems.push({diff: m.diff, neg: m.neg, orb, day: i, rate, pc });
        matchRanges.set(lk, mItems);
      });
    }
    for (const k of matchRanges.keys()) {
      const subItems = matchRanges.get(k);
      const numItems = subItems.length;
      const first = subItems[0];
      const limit = first.orb / first.rate;
      const outerItems = [{...first, limit}];
      if (numItems > 1) {
        const last = subItems[numItems - 1];
        const limit = last.orb / last.rate;
        if (first.pc > last.pc) {
          const fpc = first.pc - 0;
          outerItems[0] = {...first, pc: last.pc }
          last.pc = fpc;
        }
        outerItems.push({...last, limit});
      }
      matchRanges.set(k, outerItems);
    }
  }
  rsMap.set('matches', matches);
  if (buildMatchRange) {
    rsMap.set('ranges', Object.fromEntries(matchRanges.entries()));
  }
  return rsMap;
};
