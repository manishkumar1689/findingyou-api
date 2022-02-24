export interface KeyLang {
  key: string;
  lang: string;
  [key: string]: any;
}

export const filterByLang = (values: KeyLang[], lang = 'en') => {
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
