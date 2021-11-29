import { Model } from 'mongoose';
import { smartCastInt } from '../../lib/converters';
import { PreferenceOption } from '../../user/interfaces/preference-option.interface';
import { Preference } from '../../user/interfaces/preference.interface';
import { notEmptyString } from '../../lib/validators';
import {
  Big5ScaleMap,
  FacetedBig5Set,
  JungianScaleMap,
  ScalePreferenceAnswer,
} from './interfaces';
import { FacetedItemDTO } from '../dto/faceted-item.dto';

/*
  Adding/subtracting this number converts from a -2 to 2 range to 1 to 5
  for compatibility with Big 5 analysis
*/
export const big5FacetedScaleRange = 5;

export const big5FacetedScaleOffset = Math.ceil(big5FacetedScaleRange / 2);

const transformMultipleKeyScaleQuestions = (
  question,
  value,
  multiscaleData,
) => {
  const optData = question.options.find(opt => opt.key === value);
  let score = null;
  if (optData instanceof Object) {
    if (optData.valueOpts instanceof Array) {
      const category = optData.valueOpts[0].category;
      const row = multiscaleData.find(item => item.key === category);
      const values = optData.valueOpts.map(op => {
        const keyEnd = op.key
          .split('_')
          .splice(1)
          .join('_');
        return [keyEnd, op.value];
      });
      const num = values.length;
      const total = values.map(entry => entry[1]).reduce((a, b) => a + b, 0);
      const max = row.range[1] * num;
      const min = row.range[0] * num;
      score = {
        scales: Object.fromEntries(values),
        max,
        min,
        total,
      };
    }
  }
  return score;
};

export const compareSurveyScores = (
  scales1: Big5ScaleMap | JungianScaleMap,
  scales2: Big5ScaleMap | JungianScaleMap,
  mode = 'big5',
) => {
  const entries = Object.entries(scales1);
  const num = entries.length;
  const max = mode === 'big5' ? 4 : 9;
  const totalDiff = entries
    .map(([k, v]) => {
      const v2 = Object.keys(scales2).includes(k) ? scales2[k] : 0;
      return Math.abs(v - v2);
    })
    .reduce((a, b) => a + b, 0);
  return ((max - totalDiff / num) / max) * 100;
};

export const compareSurveyScoreSets = (
  scaleSet1: any[],
  scaleSet2: any[],
  type = 'big5',
) => {
  const scores = scaleSet1
    .filter(
      (scales1, index) =>
        scales1 instanceof Object &&
        index < scaleSet2.length &&
        scaleSet2[index] instanceof Object,
    )
    .map((scales1, index) => {
      const scales2 = scaleSet2[index];
      return compareSurveyScores(scales1, scales2, type);
    });
  return scores.reduce((a, b) => a + b, 0) / scores.length;
};

const applyAdjustedScore = (value = 0, offset = 0, inverted = false) => {
  let score = smartCastInt(value, 0) + offset;
  if (inverted) {
    if (offset === 0) {
      score = big5FacetedScaleRange + 1 - score;
    }
  }
  return score;
};

export const normalizeFacetedAnswer = (
  facetedResponse: ScalePreferenceAnswer,
  sourcePrefs: PreferenceOption[],
  applyOffset = true,
) => {
  const { key, value } = facetedResponse;
  const sq = sourcePrefs.find(s => s.key === key);
  const offset = applyOffset ? big5FacetedScaleOffset : 0;
  if (sq.inverted) {
  }
  if (sq) {
    const { domain, subdomain } = sq;
    return {
      key,
      score: applyAdjustedScore(value, offset, sq.inverted),
      domain,
      facet: smartCastInt(subdomain, 0),
    };
  } else {
    return {};
  }
};

export const normalizedToPreference = (facetedResponse: FacetedItemDTO) => {
  const { key, value } = facetedResponse;
  return {
    type: 'faceted',
    key,
    value: value - big5FacetedScaleOffset,
  };
};

export const normalizeFacetedPromptItem = (
  po: PreferenceOption,
  versionData = null,
  hasVersions = false,
) => {
  const { key, prompt, domain, subdomain, inverted } = po;
  return {
    key,
    prompt,
    domain,
    subdomain: smartCastInt(subdomain),
    inverted,
    versions: versionData.prompt,
    hasVersions,
  };
};

/*
  This assumes a 1 to 5 scale
*/
const calculateFacetedResult = (score: number, count: number): string => {
  const average = Math.round(score / count);
  let result = 'neutral';
  if (average > big5FacetedScaleOffset) {
    result = 'high';
  } else if (average < big5FacetedScaleOffset) {
    result = 'low';
  }
  return result;
};

export const reduceFacetedFactors = (a: any = null, b: any = null) => {
  if (!a[b.domain]) {
    a[b.domain] = { score: 0, count: 0, result: 'neutral', facet: {} };
  }

  a[b.domain].score += parseInt(b.score || 0, 10);
  a[b.domain].count += 1;
  a[b.domain].result = calculateFacetedResult(
    a[b.domain].score,
    a[b.domain].count,
  );

  if (b.facet) {
    if (!a[b.domain].facet[b.facet]) {
      a[b.domain].facet[b.facet] = { score: 0, count: 0, result: 'neutral' };
    }
    a[b.domain].facet[b.facet].score += parseInt(b.score || 0, 10);
    a[b.domain].facet[b.facet].count += 1;
    a[b.domain].facet[b.facet].result = calculateFacetedResult(
      a[b.domain].facet[b.facet].score,
      a[b.domain].facet[b.facet].count,
    );
  }
  return a;
};

export const analyseAnswers = (answers: FacetedBig5Set[]) => {
  const domainItems: Map<string, any> = new Map();
  const domains = ['O', 'C', 'E', 'A', 'N'];
  const facets = [1, 2, 3, 4, 5, 6];
  domains.forEach(domKey => {
    const dItems = answers.filter(an => an.domain === domKey);
    const score = dItems.map(item => item.score).reduce((a, b) => a + b, 0);
    const count = dItems.length;
    const item = {
      score,
      count,
      result: calculateFacetedResult(score, count),
    };
    const facetResults = facets.map(facet => {
      const fItems = dItems.filter(an => an.facet === facet);
      const score = fItems.map(item => item.score).reduce((a, b) => a + b, 0);
      const count = fItems.length;
      return [
        facet,
        {
          score,
          count,
          result: calculateFacetedResult(score, count),
        },
      ];
    });
    domainItems.set(domKey, {
      ...item,
      facets: Object.fromEntries(facetResults),
    });
  });
  return Object.fromEntries(domainItems.entries());
};

export const transformUserPreferences = (
  preference: Preference,
  surveys = [],
  multiscaleData = [],
) => {
  let score = null;
  let surveyKey = '';
  const pref = preference instanceof Model ? preference.toObject() : preference;
  if (pref instanceof Object) {
    const { key, value } = pref;
    const survey = surveys.find(s => s.items.some(opt => opt.key === key));
    const hasSurvey = survey instanceof Object;
    const question = hasSurvey
      ? survey.items.find(opt => opt.key === key)
      : null;
    surveyKey = hasSurvey ? survey.key : '';
    if (question instanceof Object) {
      const { type } = question;
      switch (type) {
        case 'multiple_key_scale':
          score = transformMultipleKeyScaleQuestions(
            question,
            value,
            multiscaleData,
          );
          break;
      }
    }
  }
  return notEmptyString(surveyKey)
    ? score !== null
      ? { survey: surveyKey, ...pref, score }
      : { survey: surveyKey, ...pref }
    : pref;
};
