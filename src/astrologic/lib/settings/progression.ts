import { keyValuesToSimpleObject } from '../../../lib/converters';
import { calcAyanamsha, calcLngsJd } from '../core';
import { julToISODate } from '../date-funcs';
import { KeyLng } from '../interfaces';
import { dateStringToJulianDay } from '../julian-date';

export interface JDProgress {
  pd: number;
  jd: number;
  dt?: string;
  progressDt?: string;
}

export interface ProgressBodySet extends JDProgress {
  bodies: KeyLng[];
  ayanamsha: number;
}

/*
Tropical year (Sun passage from one mean vernal equinox to the next): 365.242199
Sidereal Year (Earth's complete orbit around the Sun relative to fixed stars): 365.256366
Anomalistic year (Earth's passage from one perihelion to another): 365.259636
*/
export const astroYearLength = {
  tropical: 365.242199,
  sidereal: 365.256366,
  anomalistic: 365.259636,
};

export const getYearLength = (yearType = 'tropical') => {
  switch (yearType) {
    case 'sidereal':
      return astroYearLength.sidereal;
    case 'anomalistic':
      return astroYearLength.anomalistic;
    default:
      return astroYearLength.tropical;
  }
};

export const toProgressionJD = (
  birthJd = 0,
  refJd = 0,
  yearType = 'tropical',
) => {
  const ageInDays = refJd - birthJd;
  const projectedDuration = ageInDays / getYearLength(yearType);
  return birthJd + projectedDuration;
};

export const toProgressionJdIntervals = (
  birthJd = 0,
  numYears = 20,
  numPerYer = 4,
  inFuture = 0.25,
  yearType = 'tropical',
): JDProgress[] => {
  //const refJd = currentJulianDay();
  const currYear = new Date().getFullYear();
  const yl = getYearLength(yearType);
  const numYearsAgo = numYears * (1 - inFuture);
  const startYear = currYear - numYearsAgo;
  const dateStr = [
    [startYear.toString(), '01', '01'].join('-'),
    '00:00:00',
  ].join('T');
  const startJd = dateStringToJulianDay(dateStr);
  //const startJd = refJd - numYears * (1 - inFuture) * yl;
  const startProgressionJd = toProgressionJD(birthJd, startJd);
  const jdPairs: JDProgress[] = [{ pd: startProgressionJd, jd: startJd }];
  const numExtraSteps = numYears * numPerYer;
  const stepSize = 1 / numPerYer;
  const yearStep = stepSize * yl;
  for (let i = 1; i <= numExtraSteps; i++) {
    const pd = startProgressionJd + i * stepSize;
    const jd = startJd + i * yearStep;
    jdPairs.push({ pd, jd });
  }
  return jdPairs;
};

export const mergeIsoDatestoProgressSet = (row: JDProgress): JDProgress => {
  const progressDt = julToISODate(row.pd);
  const dt = julToISODate(row.jd);
  return {
    ...row,
    dt,
    progressDt,
  };
};

export const buildProgressBodySets = async (
  intervals: JDProgress[] = [],
  grahaKeys = ['su', 've', 'ma'],
  addISODates = false,
  ayanamsaKey = 'true_citra',
) => {
  const progressSets = [];
  for (const row of intervals) {
    const ayanamsha = await calcAyanamsha(row.pd, ayanamsaKey);
    const bodies = await calcLngsJd(row.pd, grahaKeys);
    const rowObj = addISODates ? mergeIsoDatestoProgressSet(row) : row;
    if (bodies.length > 0) {
      progressSets.push({
        ...rowObj,
        bodies: keyValuesToSimpleObject(bodies, 'lng'),
        ayanamsha,
      });
    }
  }
  return progressSets;
};

export const buildProgressSetPairs = async (
  jd1 = 0,
  jd2 = 0,
  yearsInt,
  perYear = 4,
  futureFrac = 0.25,
  progressKeys = ['su', 've', 'ma'],
  showIsoDates = false,
) => {
  const intervalsP1 = toProgressionJdIntervals(
    jd1,
    yearsInt,
    perYear,
    futureFrac,
  );
  const intervalsP2 = toProgressionJdIntervals(
    jd2,
    yearsInt,
    perYear,
    futureFrac,
  );
  const p1Set = await buildProgressBodySets(
    intervalsP1,
    progressKeys,
    showIsoDates,
  );
  const p2Set = await buildProgressBodySets(
    intervalsP2,
    progressKeys,
    showIsoDates,
  );
  return {
    p1: p1Set,
    p2: p2Set,
  };
};

export const mergeProgressSets = async (
  data: any = null,
  cKey = 'astro_pair_ 1',
  yearsInt = 20,
  perYear = 4,
  futureFrac = 0.25,
) => {
  if (
    data instanceof Object &&
    Object.keys(data).includes('miniCharts') &&
    data.miniCharts instanceof Array &&
    data.miniCharts.length > 0
  ) {
    const matchedIndex = data.miniCharts.findIndex(mc => mc.key === cKey);
    const mcIndex = matchedIndex >= 0 ? matchedIndex : 0;
    const miniC = data.miniCharts[mcIndex];
    if (miniC instanceof Object && data instanceof Object) {
      const { p1, p2 } = miniC;
      if (p1 instanceof Object && p2 instanceof Object) {
        const pData = await buildProgressSetPairs(
          p1.jd,
          p2.jd,
          yearsInt,
          perYear,
          futureFrac,
        );
        data.miniCharts[mcIndex] = {
          ...miniC,
          p1: {
            ...p1,
            progressSets: pData.p1,
          },
          p2: {
            ...p2,
            progressSets: pData.p2,
          },
        };
      }
    }
  }
  return data;
};
