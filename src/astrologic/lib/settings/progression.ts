import { calcAllBodyLngsJd, calcAyanamsha, calcLngsJd } from '../core';
import { julToISODate } from '../date-funcs';
import { KeyLng } from '../interfaces';
import { currentJulianDay } from '../julian-date';

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
  const refJd = currentJulianDay();
  const yl = getYearLength(yearType);
  const startJd = refJd - numYears * (1 - inFuture) * yl;
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
  ayanamsaKey = 'true_citra',
) => {
  const progressSets = [];
  for (const row of intervals) {
    const ayanamsha = await calcAyanamsha(row.pd, ayanamsaKey);
    const bodies = await calcLngsJd(row.pd, grahaKeys);
    if (bodies.length > 0) {
      progressSets.push({
        ...mergeIsoDatestoProgressSet(row),
        bodies,
        ayanamsha,
      });
    }
  }
  return progressSets;
};
