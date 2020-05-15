import { Toponym } from '../interfaces/toponym.interface';
import { notEmptyString } from 'src/lib/validators';

export const filterDefaultName = (
  name: string,
  longName: string,
  fcode: string,
  countryCode: string,
) => {
  let str = name;
  switch (fcode) {
    case 'PCLI':
      switch (countryCode) {
        case 'GB':
        case 'UK':
          str = 'UK';
          break;
        case 'US':
        case 'USA':
          str = 'USA';
          break;
      }
      break;
    case 'ADM2':
      switch (countryCode) {
        case 'IS':
          str = '';
          break;
        default:
          str = longName;
          break;
      }
      break;
  }

  return str;
};

export const filterToponyms = (toponyms: Array<Toponym>, locality = '') => {
  const items = toponyms.filter(row => notEmptyString(row.name));
  if (items.length > 0 && notEmptyString(locality)) {
    console.log(items, locality);
  }
  const adm1Index = toponyms.findIndex(
    tp => tp.name.toLowerCase() === 'scotland',
  );
  if (adm1Index > 0) {
    return items.filter(tp => tp.type !== 'PCLI');
  } else {
    return items;
  }
};

export const correctOceanTz = (toponyms: Array<Toponym>, tz: number) => {
  let adjustedTz = tz;
  if (toponyms.length === 1) {
    const tp = toponyms[0];
    if (tp.type === 'SEA' && tz === 0 && (tp.lng > 7.5 || tp.lng < -7.5)) {
      if (/\bocean\b/i.test(tp.name)) {
        adjustedTz = Math.floor((tp.lng + 7.5) / 15) * 3600;
      }
    }
  }
  return adjustedTz;
};
