import { notEmptyString } from '../../lib/validators';

export const transformUserPreferences = (
  pref,
  surveys = [],
  multiscaleData = [],
) => {
  let score: any = {};
  let surveyKey = '';
  if (pref instanceof Object) {
    const { key, value } = pref;
    const survey = surveys.find(s => s.items.some(opt => opt.key === key));
    const hasSurvey = survey instanceof Object;
    const question = hasSurvey
      ? survey.items.find(opt => opt.key === key)
      : null;
    surveyKey = hasSurvey ? survey.key : 'core';
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
  return { survey: surveyKey, ...pref, score };
};
