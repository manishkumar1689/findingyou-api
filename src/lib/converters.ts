export const objectToQueryString = (obj: any): string => {
  let str = '';
  if (obj instanceof Object) {
    const items = Object.entries(obj).map(entry => {
      const [k, v] = entry;
      let value = '';
      switch (typeof v) {
        case 'string':
          value = v;
          break;
        case 'number':
        case 'boolean':
          value = v.toString();
          break;
      }
      return [k, encodeURIComponent(value)].join('=');
    });
    if (items.length > 0) {
      str = '?' + items.join('&');
    }
  }
  return str;
};

export const mapToQueryString = (map: Map<string, any>): string => {
  return objectToQueryString(Object.fromEntries(map));
};

export const smartCastString = (item: any, defVal: string = '') => {
  let out = defVal;
  switch (typeof item) {
    case 'string':
      out = item;
      break;
    case 'number':
    case 'boolean':
      out = item.toString();
      break;
  }
  return out;
};

export const smartCastInt = (item: string, defVal: number = 0) => {
  let out = defVal;
  if (typeof item === 'string') {
    if (item.length > 0) {
      if (/^\s*\d+(\.\d+)?\s*/.test(item)) {
        out = parseInt(item, 10);
      }
    }
  }
  return out;
};

export const smartCastBool = (item: string | number, defVal = false) => {
  let intVal = defVal ? 1 : 0;
  if (typeof item === 'string') {
    if (item.length > 0) {
      if (/^\s*\d+(\.\d+)?\s*/.test(item)) {
        intVal = parseInt(item, 10);
      }
    }
  } else if (typeof item === 'number') {
    intVal = item;
  }
  return intVal > 0;
};

export const dateTimeSuffix = () =>
  new Date()
    .toISOString()
    .split('.')
    .shift()
    .replace(/[:-]/g, '');

export const sanitize = (str: string, separator = '-') => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, separator);
};

export const zeroPad = (inval: number | string, places = 2) => {
  let num = 0;
  if (typeof inval === 'string') {
    num = parseInt(inval);
  } else if (typeof inval === 'number') {
    num = inval;
  }
  const strs: Array<string> = [];
  const len = num > 0 ? Math.floor(Math.log10(num)) + 1 : 1;
  if (num < Math.pow(10, places - 1)) {
    const ep = places - len;
    strs.push('0'.repeat(ep));
  }
  strs.push(num.toString());
  return strs.join('');
};
