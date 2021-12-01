import { Model } from 'mongoose';
import { smartCastInt } from '../../lib/converters';
import { PreferenceOption } from '../../user/interfaces/preference-option.interface';
import { Preference } from '../../user/interfaces/preference.interface';
import { isNumeric, notEmptyString } from '../../lib/validators';
import {
  Big5ScaleMap,
  FacetedBig5Set,
  JungianScaleMap,
  ScalePreferenceAnswer,
} from './interfaces';
import { FacetedItemDTO } from '../dto/faceted-item.dto';
import { Snippet } from '../../snippet/interfaces/snippet.interface';
import {
  facetedBig5Categories,
  facetedJungianCategories,
} from '../settings/faceted-big5';

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

const calcBig5ItemPercent = (score = 0, count = 0): number => {
  const max = count * big5FacetedScaleRange;
  return Math.round(100 * 100000 * (score / max)) / 100000;
};

/* export const reduceFacetedFactors = (a: any = null, b: any = null) => {
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
}; */

const matchBig5Feedback = (
  feedbackItems: Snippet[],
  domain = '',
  facet = 0,
  result = 'neutral',
) => {
  if (
    isNumeric(facet) &&
    domain.length === 1 &&
    ['low', 'high', 'neutral'].includes(result)
  ) {
    const domLetter = domain.toLowerCase();
    const midKey = facet > 0 ? ['facet', facet].join('_') : 'all';
    const key = ['big5_results_', domLetter, midKey, result].join('_');
    const fbItem = feedbackItems.find(item => item.key === key);
    if (fbItem instanceof Object) {
      return fbItem.values.map(v => {
        const { lang, text } = v;
        return { lang, text };
      });
    }
  }
  return [];
};

const analyseBig5Answers = (
  answers: FacetedBig5Set[] = [],
  feedbackItems: Snippet[] = [],
) => {
  const hasFeedback =
    feedbackItems instanceof Array && feedbackItems.length > 5;
  const domainItems: Map<string, any> = new Map();
  const domains = ['O', 'C', 'E', 'A', 'N'];
  const facets = [1, 2, 3, 4, 5, 6];
  domains.forEach(domKey => {
    const dItems = answers.filter(an => an.domain === domKey);
    const score = dItems.map(item => item.score).reduce((a, b) => a + b, 0);
    const count = dItems.length;
    const labelItem = facetedBig5Categories.find(ct => ct.key === domKey);
    if (labelItem instanceof Object) {
      const result = calculateFacetedResult(score, count);
      const item = {
        score,
        count,
        pc: calcBig5ItemPercent(score, count),
        title: labelItem.title,
        result,
        feedback: hasFeedback
          ? matchBig5Feedback(feedbackItems, domKey, 0, result)
          : [],
      };
      const facetResults = facets.map(facet => {
        const fItems = dItems.filter(an => an.facet === facet);
        const score = fItems.map(item => item.score).reduce((a, b) => a + b, 0);
        const count = fItems.length;
        const result = calculateFacetedResult(score, count);
        const flItem = labelItem.facets.find(fc => fc.num === facet);
        const facetTitle =
          flItem instanceof Object ? flItem.title : facet.toString();
        return {
          num: facet,
          title: facetTitle,
          score,
          count,
          pc: calcBig5ItemPercent(score, count),
          result: calculateFacetedResult(score, count),
          feedback: hasFeedback
            ? matchBig5Feedback(feedbackItems, domKey, facet, result)
            : [],
        };
      });
      domainItems.set(domKey, {
        ...item,
        facets: facetResults,
      });
    }
  });
  return domainItems;
};

const analyseJungianAnswers = (
  answers: FacetedBig5Set[] = [],
  feedbackItems: Snippet[] = [],
) => {
  const hasFeedback =
    feedbackItems instanceof Array && feedbackItems.length > 5;
  const domainItems: Map<string, any> = new Map();
  const domains = ['IE', 'SN', 'FT', 'JP'];
  domains.forEach(domKey => {
    const dItems = answers.filter(an => an.domain === domKey);
    const score = dItems.map(item => item.score).reduce((a, b) => a + b, 0);
    const count = dItems.length;
    const labelItem = facetedJungianCategories.find(ct => ct.key === domKey);
    const result = calculateFacetedResult(score, count);
    if (labelItem instanceof Object) {
      const item = {
        score,
        count,
        pc: calcBig5ItemPercent(score, count),
        title: labelItem.title,
        result,
        feedback: hasFeedback
          ? matchBig5Feedback(feedbackItems, domKey, 0, result)
          : [],
      };
      domainItems.set(domKey, {
        ...item,
      });
    }
  });
  return domainItems;
};

export const analyseAnswers = (
  type = 'faceted',
  answers: FacetedBig5Set[],
  feedbackItems: Snippet[] = [],
) => {
  console.log(type);
  const domainItems =
    type === 'jungian'
      ? analyseJungianAnswers(answers, feedbackItems)
      : analyseBig5Answers(answers, feedbackItems);
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
