import { Snippet } from '../snippet/interfaces/snippet.interface';

export interface LangText {
  text: string;
  lang: string;
  [key: string]: any;
}

export const filterByLang = (values: LangText[], lang = 'en') => {
  const langRoot = lang.split('-').shift();
  const hasLocale = langRoot !== lang && langRoot.length > 1;
  let value = '';
  if (values instanceof Array) {
    let index = values.findIndex(v => v.lang === lang);
    if (index < 0 && hasLocale) {
      index = values.findIndex(v => v.lang.startsWith(langRoot));
    }
    if (index >= 0) {
      value = values[index].text;
    } else if (values.length > 0) {
      value = values[0].text;
    }
  }
  return value;
};

export const extractSnippet = (
  items: Snippet[] = [],
  keyEnd = '',
  lang = 'en',
) => {
  const snippet = items.find(sn => sn.key.endsWith(keyEnd));
  let text = '';
  if (snippet instanceof Object && snippet.values instanceof Array) {
    text = filterByLang(snippet.values, lang);
  }
  return text;
};

export const filterCorePreference = (pr: any) =>
  pr instanceof Object &&
  ['faceted', 'jungian', 'simple_astro_pair'].includes(pr.type) === false;
