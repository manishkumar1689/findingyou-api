import { smartCastFloat } from '../../lib/converters';
import { extractObject } from '../../lib/entities';
import { GeoPos } from '../interfaces/geo-pos';
import { KeyValue } from '../interfaces/key-value';
import { calcOffsetAscendant } from './calc-ascendant';
import { subtractLng360 } from './helpers';
import { HouseSystem } from './models/chart';
import { matchAyanamshaNum } from './settings/ayanamsha-values';

/*
  Loose check on a temporary object before subsequent processing
*/
export const isChartObject = (chart = null) => {
  let valid = false;
  if (chart instanceof Object) {
    const keys = Object.keys(chart);
    if (keys.includes("jd") && keys.includes("ascendant") && keys.includes("grahas")) {
      valid = chart.grahas instanceof Array && chart.grahas.length > 5;
    }
  }
  return valid;
}

const removeIds = item => {
  if (item instanceof Object) {
    delete item._id;
  }
  return item;
};

export const simplifyUpagraha = (up: KeyValue, ayaOffset = 0) => {
  const {key, value } = up;
  return { key, value: subtractLng360(value, ayaOffset)};
}

export const simplifyGraha = (gr, ayanamshaVal = 0, ayanamshaNum = 9) => {
  const lng = subtractLng360(gr.lng, ayanamshaVal);
  const transitions = gr.transitions.map(tr => {
    return {
      type: tr.type,
      jd: tr.jd,
    };
  });
  let extra: any = {};
  
  if (gr.variants instanceof Array) {
    const variant = gr.variants.find(v => v.num === ayanamshaNum);
    if (variant instanceof Object) {
      extra = Object.assign(
        {},
        removeIds(extractObject(variant)),
      );
      delete extra.num;
    }
    
  }
  const { key, lat, lngSpeed, declination } = gr;
  return {
    key,
    lng,
    lat,
    lngSpeed,
    declination,
    transitions,
    ...extra,
  };
};

const matchAyanamshaDataSet = (chart: any = null, key = "", num = 27) => {
  if (chart instanceof Object) {
    const keys = Object.keys(chart);
    if (keys.includes(key) && chart[key] instanceof Array) {
      const ayaSet = chart[key].find(r => r.num === num);
      if (ayaSet instanceof Object) {
        if (ayaSet.items instanceof Array) {
          return ayaSet.items.map(removeIds);
        }
      }
    }
  }
  return [];
}

export const simplifyChart = (chartRef = null, ayanamshaKey = 'true_citra', mode = 'complete', applyAyanamsha = true, adjustAscendant = true) => {
  const isModel = chartRef instanceof Object && chartRef.constructor.name === 'model';
  const chart = isModel? chartRef.toObject() : chartRef;
  let ayanamshaVal = 0;
  let ayanamshaIndex = 0;
  const { grahas, ayanamshas } = chart;
  const showExtraDataSets = mode === 'complete';
  const showUpagrahas = ['complete', 'simple'].includes(mode);
  if (ayanamshas instanceof Array) {
    const ayaIndex = ayanamshas.findIndex(ay => ay.key === ayanamshaKey);
    if (ayaIndex >= 0) {
      ayanamshaVal = ayanamshas[ayaIndex].value;
      ayanamshaIndex = ayaIndex;
    }
  }
  const ayanamshaNum = matchAyanamshaNum(ayanamshaKey);
  if (applyAyanamsha) {
    chart.grahas = grahas.map(gr =>
      simplifyGraha(gr, ayanamshaVal, ayanamshaNum)
    );
  }
  chart.placenames = chart.placenames.map(pl => {
    delete pl._id;
    if (pl.geo) {
      delete pl.geo._id;
    }
    return pl;
  });
  chart.subject = removeIds(chart.subject);
  chart.geo = removeIds(chart.geo);
  if (adjustAscendant) {
    chart.ascendant = subtractLng360(
      smartCastFloat(chart.ascendant),
      ayanamshaVal,
    );
  }
  chart.mc = subtractLng360(smartCastFloat(chart.mc), ayanamshaVal);
  chart.vertex = subtractLng360(smartCastFloat(chart.vertex), ayanamshaVal);
  delete chart._id;
  chart.ayanamshas = chart.ayanamshas.map(removeIds);
  chart.upagrahas = chart.upagrahas.map(removeIds);
  /* if (chart.sphutas instanceof Array && ayanamshaIndex < chart.sphutas.length) {
    chart.sphutas = chart.sphutas[ayanamshaIndex].items.map(removeIds);
  } */
  chart.sphutas = showExtraDataSets? matchAyanamshaDataSet(chart, 'sphutas', ayanamshaNum) : [];
  chart.objects = showExtraDataSets? matchAyanamshaDataSet(chart, 'objects', ayanamshaNum) : [];
  chart.numValues = showExtraDataSets? chart.numValues.map(removeIds) : [];
  chart.stringValues = showExtraDataSets? chart.stringValues.map(removeIds) : [];
  chart.rashis = showExtraDataSets? matchAyanamshaDataSet(chart, 'rashis', ayanamshaNum) : [];
  if (chart.upagrahas instanceof Array  && chart.upagrahas.length > 0) {
    chart.upagrahas = showUpagrahas? chart.upagrahas.map(up => simplifyUpagraha(up, ayanamshaVal)) : [];
  }
  delete chart.__v;
  return chart;
};

export const simplifyAstroChart = (data: any = null, applyAyanamsha = true, adjustAscendant = true) => {
  if (data instanceof Object) {
    const keys = Object.keys(data);
    let ayaOffset = 0;
    if (applyAyanamsha) {
      const ayaRow = data.ayanamshas.find(ay => ay.key !== "raw");
      if (ayaRow instanceof Object) {
        ayaOffset = ayaRow.value;
      }
    }
    if (keys.includes("grahas") && data.grahas instanceof Array) {
      data.grahas = data.grahas.map(row => {
        const {
          num,
          key,
          lng,
          lat,
          lngSpeed,
          declination,
          transitions,
          variants
        } = row;
        const trs = transitions.map(tr => {
          const { type, jd } = tr;
          return {type, jd};
        });
        return {key, num, lng: subtractLng360(lng, ayaOffset), lat, lngSpeed, declination, transitions: trs, ...variants[0]};
      });
    }
    if (keys.includes("rashis") && data.rashis instanceof Array && data.rashis.length > 0) {
      data.rashis = data.rashis[0].items;
    }
    if (keys.includes("objects") && data.objects instanceof Array  && data.objects.length > 0) {
      data.objects = data.objects[0].items;
    }
    if (applyAyanamsha && keys.includes("upagrahas") && data.upagrahas instanceof Array  && data.upagrahas.length > 0) {
      data.upagrahas = data.upagrahas.map(up => simplifyUpagraha(up, ayaOffset));
    }
    if (adjustAscendant) {
      data.ascendant = subtractLng360(data.ascendant, ayaOffset);
      data.mc = subtractLng360(data.mc, ayaOffset);
      data.vertex = subtractLng360(data.vertex, ayaOffset);
      data.houses = data.houses.map((hs: HouseSystem) => {
        const { system, values } = hs;
        return { system, values: values.map(v => {
          const av = subtractLng360(v, ayaOffset);
          return system === 'W'? Math.floor(av/30) * 30 : av;
        })};
      })
    }
  }
  return data;
}


export const applyAscendantToSimpleChart = (chart = null, geo: GeoPos, ayanamshaKey = "true_citra") => {
  if (isChartObject(chart)) {
    const ayaRow = chart.ayanamshas.find(r => r.key === ayanamshaKey);
    const ayanamshaVal = ayaRow instanceof Object? ayaRow.value : 0;
    const asc = calcOffsetAscendant(geo.lat, geo.lng, chart.jd, ayanamshaVal);
    const firstHouse = Math.floor(asc / 30) * 30;
    const houses = [
      { 
        system: "W",
        values: [firstHouse]
      }
    ]
    return { ...chart, placenames: [], geo, ascendant: asc, houses };
  } else {
    return Object.assign({}, chart);
  }
}