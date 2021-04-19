/*
 * Methods to convert Maps to objects and to simplify complex objects
 */
import { notEmptyString } from '../../lib/validators';
import { jdToDateParts } from './date-funcs';
import { shortenName } from './helpers';
import { KeyValueNum } from './models/chart';
import { LngLat, Toponym } from './interfaces';
import { sanitize } from '../../lib/converters';

export const mapToObject = map => {
  if (map instanceof Map) {
    return Object.fromEntries(map);
  } else {
    return {};
  }
};

export const objectToMap = obj => {
  if (obj instanceof Object) {
    return new Map(Object.entries(obj));
  } else {
    return new Map();
  }
};

export const simplifyObject = (obj, keys = []) => {
  let newObj = {};
  if (obj instanceof Object) {
    Object.entries(obj).forEach(entry => {
      const [k, v] = entry;
      if (keys.includes(k)) {
        newObj[k] = v;
      }
    });
  }
  return newObj;
};

export const mapPairedCharts = (pairedObject: any) => {
  if (pairedObject instanceof Object) {
    let title = '';
    if (
      pairedObject.c1 instanceof Object &&
      pairedObject.c2 instanceof Object
    ) {
      title = [pairedObject.c1.subject.name, pairedObject.c2.subject.name].join(
        ' / ',
      );
    }
    return { ...pairedObject.toObject(), title };
  }
};

export const mapSubChartMeta = (chart: any) => {
  let chartObj: any = {};
  if (
    chart instanceof Array &&
    chart.length > 0 &&
    chart[0] instanceof Object
  ) {
    chartObj = chart[0];
  } else if (chart instanceof Object) {
    chartObj = chart;
  }
  if (chartObj instanceof Object) {
    const { _id, jd, subject, geo, placenames } = chartObj;
    const jdInt = typeof jd === 'number' ? jd : 0;
    const dateParts = jdToDateParts(jdInt);
    const { year } = dateParts;
    const filteredPlacenames =
      placenames instanceof Array
        ? placenames
            .filter(pl => ['PCLI', 'ADM1', 'ADM2'].includes(pl.type))
            .map(pl => pl.name)
        : [];
    if (subject instanceof Object && geo instanceof Object) {
      chartObj = {
        _id,
        ...subject,
        name: shortenName(subject.name),
        year,
        jd,
        ...geo,
        placenames: filteredPlacenames,
      };
    }
  }
  return chartObj;
};

export class KaranaTithiYoga {
  karana: KeyValueNum = { key: '', value: 0 };
  tithi: KeyValueNum = { key: '', value: 0 };
  yoga: KeyValueNum = { key: '', value: 0 };
  sunMoonAngle = 0;

  constructor(inData = null) {
    if (inData instanceof Object) {
      if (inData.tithi instanceof Object) {
        this.tithi = inData.tithi;
      }
      if (inData.karana instanceof Object) {
        this.karana = inData.karana;
      }
      if (inData.yoga instanceof Object) {
        this.yoga = inData.yoga;
      }
      if (typeof inData.sunMoonAngle === 'number') {
        this.sunMoonAngle = inData.sunMoonAngle;
      }
    }
  }
}

export class PairedKTY {
  c1: KaranaTithiYoga;
  c2: KaranaTithiYoga;
  timespace: KaranaTithiYoga;
  midpoint: KaranaTithiYoga;

  constructor() {
    this.c1 = new KaranaTithiYoga();
    this.c2 = new KaranaTithiYoga();
    this.timespace = new KaranaTithiYoga();
    this.midpoint = new KaranaTithiYoga();
  }
}

const extractFromKeyValueArray = (
  keyValueArray: Array<any>,
  key: string,
  defVal = null,
) => {
  const row = keyValueArray.find(v => v.key === key);
  if (row instanceof Object) {
    return row.value;
  } else {
    return defVal;
  }
};

export const mapKaranaTithiYoga = (inData = null) => {
  const kty = new KaranaTithiYoga();
  const keys = Object.keys(inData);
  let tithi = { num: 0, lord: '' };
  let yoga = { num: 0, lord: '' };
  let karana = { num: 0, lord: '' };
  let sunMoonAngle = 0;
  if (inData instanceof Object) {
    if (keys.includes('numValues') && inData.numValues instanceof Array) {
      tithi.num = extractFromKeyValueArray(inData.numValues, 'tithi', 0);
      karana.num = extractFromKeyValueArray(inData.numValues, 'karana', 0);
      yoga.num = extractFromKeyValueArray(inData.numValues, 'yoga', 0);
      sunMoonAngle = extractFromKeyValueArray(
        inData.numValues,
        'sunMoonAngle',
        0,
      );
    }
    if (keys.includes('numValues') && inData.stringValues instanceof Array) {
      tithi.lord = extractFromKeyValueArray(
        inData.stringValues,
        'tithiLord',
        '',
      );
      karana.lord = extractFromKeyValueArray(
        inData.stringValues,
        'karanaLord',
        '',
      );
      yoga.lord = extractFromKeyValueArray(inData.stringValues, 'yogaLord', '');
    }
  }
  return new KaranaTithiYoga({ yoga, tithi, karana, sunMoonAngle });
};

export const mapNestedKaranaTithiYoga = (row = null) => {
  const pairedKTY = new PairedKTY();
  if (row instanceof Object) {
    const keys = Object.keys(row);
    if (keys.includes('c1')) {
      pairedKTY.c1 = mapKaranaTithiYoga(row.c1);
    }
    if (keys.includes('c2')) {
      pairedKTY.c2 = mapKaranaTithiYoga(row.c2);
    }
    if (keys.includes('timespace')) {
      pairedKTY.timespace = mapKaranaTithiYoga(row.timespace);
    }
  }
  return pairedKTY;
};

export const mapToponyms = (
  toponyms: Toponym[],
  geo: LngLat,
  locality = '',
) => {
  const placenames = toponyms.map(tp => {
    return {
      name: tp.name,
      fullName: tp.fullName,
      type: tp.type,
      geo: { lat: tp.lat, lng: tp.lng },
    };
  });

  if (notEmptyString(locality)) {
    const numToponyms = placenames.length;
    const [place, country] = locality.split(',').map(s => s.trim());
    if (numToponyms > 0) {
      let locIndex = numToponyms - 1;
      if (['PSCD', 'STRT'].includes(placenames[locIndex].type)) {
        const li = placenames
          .slice()
          .reverse()
          .findIndex(pl => pl.type.startsWith('PP'));
        if (li >= 0) {
          locIndex = numToponyms - 1 - li;
        }
      }
      placenames[locIndex].name = place;
      placenames[locIndex].fullName = place;
      if (numToponyms < 2) {
        placenames.unshift({
          name: country,
          fullName: country,
          type: 'ADM1',
          geo: { lat: geo.lat, lng: geo.lng },
        });
      }
    }
    const slugs = placenames.map((pl, index) => {
      return { index, slug: sanitize(pl.name) };
    });
    slugs.forEach(item => {
      const oi = slugs.find(
        sl => sl.slug === item.slug && sl.index < item.index,
      );
      if (oi) {
        placenames.splice(oi.index, 1);
      }
    });
  }
  return placenames;
};
