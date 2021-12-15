import { isNumeric } from './validators';

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

export const smartCastString = (item = null, defVal = '') => {
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

export const smartCastNumber = (item: any, defVal = 0, isInt = false) => {
  let out = defVal;

  if (typeof item === 'string') {
    if (item.length > 0) {
      if (/^\s*-?\d+(\.\d+)?\s*/.test(item)) {
        out = isInt ? parseInt(item, 10) : parseFloat(item);
      }
    }
  } else if (typeof item === 'number') {
    out = item;
  }
  return out;
};

export const smartCastInt = (item: any, defVal = 0) => {
  return smartCastNumber(item, defVal, true);
};

export const smartCastFloat = (item: any, defVal = 0) => {
  return smartCastNumber(item, defVal, false);
};

export const smartCastBool = (item: any, defVal = false) => {
  let intVal = defVal ? 1 : 0;
  if (typeof item === 'string') {
    if (item.length > 0) {
      if (/^\s*\d+(\.\d+)?\s*/.test(item)) {
        intVal = parseInt(item, 10);
      }
    }
  } else if (typeof item === 'number') {
    intVal = item;
  } else if (typeof item === 'boolean') {
    intVal = item ? 1 : 0;
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
    .replace(/[^a-z0-9]+/g, separator)
    .replace(/([a-z0-9])[^a-z0-9]+$/, '$1');
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

export const roundNumber = (num: number, places = 6) => {
  if (typeof num === 'number') {
    const multiplier = Math.pow(10, places);
    const bigNum =
      places > 7 ? Math.floor(multiplier * num) : Math.round(multiplier * num);
    return bigNum / multiplier;
  } else {
    return 0;
  }
};

export const toStartRef = (startRef = null) => {
  const monthRef = /^\d+m$/i;
  return isNumeric(startRef)
    ? parseFloat(startRef)
    : monthRef.test(startRef)
    ? parseInt(startRef.replace(/[^0-9]\./, ''), 10) / 12
    : startRef;
};

export const keyValuesToSimpleObject = (
  rows: any[] = [],
  valueField = 'value',
) => {
  const rowEntries = rows
    .filter(row => row instanceof Object)
    .map(row => Object.entries(row))
    .filter(
      entries =>
        entries.some(entry => entry[0] === 'key') &&
        entries.some(entry => entry[0] === valueField),
    )
    .map(entries => {
      const k = entries.find(entry => entry[0] === 'key');
      const v = entries.find(entry => entry[0] === valueField);
      return k instanceof Array && v instanceof Array
        ? [k[1], v[1]]
        : ['', null];
    });
  return Object.fromEntries(rowEntries);
};
