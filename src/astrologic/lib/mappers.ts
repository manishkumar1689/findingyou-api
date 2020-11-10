/*
 * Methods to convert Maps to objects and to simplify complex objects
 */

import { Subject } from 'rxjs';
import { PairedChart } from '../interfaces/paired-chart.interface';
import { PairedChartSchema } from '../schemas/paired-chart.schema';

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
    const { _id, datetime, jd, subject, geo, placenames } = chartObj;
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
        year: parseInt(
          datetime
            .toISOString()
            .split('-')
            .shift(),
          10,
        ),
        jd,
        ...geo,
        placenames: filteredPlacenames,
      };
    }
  }
  return chartObj;
};
