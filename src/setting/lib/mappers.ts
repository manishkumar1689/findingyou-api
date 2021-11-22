import { notEmptyString } from '../../lib/validators';
import { Big5ScaleMap, JungianScaleMap, ScaleScores } from './interfaces';

export const transformUserPreferences = (
  pref,
  surveys = [],
  multiscaleData = [],
) => {
  let score = null;
  let surveyKey = '';
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
      if (notEmptyString(type) && type.startsWith('multiple_key_scale')) {
        const optData = question.options.find(opt => opt.key === value);
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
            const total = values
              .map(entry => entry[1])
              .reduce((a, b) => a + b, 0);
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
      }
    }
  }
  return notEmptyString(surveyKey)
    ? score !== null
      ? { survey: surveyKey, ...pref, score }
      : { survey: surveyKey, ...pref }
    : pref;
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
