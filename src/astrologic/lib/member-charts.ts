import { smartCastFloat } from '../../lib/converters';
import { extractObject } from '../../lib/entities';
import { subtractLng360 } from './helpers';
import { matchAyanamshaNum } from './settings/ayanamsha-values';

const removeIds = item => {
  if (item instanceof Object) {
    delete item._id;
  }
  return item;
};

export const simplifyGraha = (gr, ayanamshaVal = 0, ayanamshaIndex = 0) => {
  const lng = subtractLng360(gr.lng, ayanamshaVal);
  const topo = {
    lng: subtractLng360(gr.topo.lng, ayanamshaVal),
    lat: gr.topo.lat,
  };
  const transitions = gr.transitions.map(tr => {
    return {
      type: tr.type,
      jd: tr.jd,
    };
  });
  let extra: any = {};
  if (gr.variants instanceof Array) {
    extra = Object.assign(
      {},
      removeIds(extractObject(gr.variants[ayanamshaIndex])),
    );
    delete extra.num;
  }
  const { key, lat, lngSpeed, declination } = gr;
  return {
    key,
    lng,
    lat,
    lngSpeed,
    declination,
    topo,
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

export const simplifyChart = (chartRef = null, ayanamshaKey = 'true_citra') => {
  const isModel = chartRef instanceof Object && chartRef.constructor.name === 'model';
  const chart = isModel? chartRef.toObject() : chartRef;
  let ayanamshaVal = 0;
  let ayanamshaIndex = 0;
  const { grahas, ayanamshas } = chart;

  if (ayanamshas instanceof Array) {
    const ayaIndex = ayanamshas.findIndex(ay => ay.key === ayanamshaKey);
    if (ayaIndex >= 0) {
      ayanamshaVal = ayanamshas[ayaIndex].value;
      ayanamshaIndex = ayaIndex + 1;
    }
  }
  const ayanamshaNum = matchAyanamshaNum(ayanamshaKey);
  chart.grahas = grahas.map(gr =>
    simplifyGraha(gr, ayanamshaVal, ayanamshaIndex)
  );
  chart.placenames = chart.placenames.map(pl => {
    delete pl._id;
    delete pl.geo._id;
    return pl;
  });
  chart.subject = removeIds(chart.subject);
  chart.geo = removeIds(chart.geo);

  chart.ascendant = subtractLng360(
    smartCastFloat(chart.ascendant),
    ayanamshaVal,
  );
  chart.mc = subtractLng360(smartCastFloat(chart.mc), ayanamshaVal);
  chart.vertex = subtractLng360(smartCastFloat(chart.vertex), ayanamshaVal);
  delete chart._id;
  chart.ayanamshas = chart.ayanamshas.map(removeIds);
  chart.upagrahas = chart.upagrahas.map(removeIds);
  /* if (chart.sphutas instanceof Array && ayanamshaIndex < chart.sphutas.length) {
    chart.sphutas = chart.sphutas[ayanamshaIndex].items.map(removeIds);
  } */
  chart.sphutas = matchAyanamshaDataSet(chart, 'sphutas', ayanamshaNum);
  chart.objects = matchAyanamshaDataSet(chart, 'objects', ayanamshaNum);
  chart.numValues = chart.numValues.map(removeIds);
  chart.stringValues = chart.stringValues.map(removeIds);
  chart.rashis = matchAyanamshaDataSet(chart, 'rashis', ayanamshaNum);
  delete chart.__v;
  return chart;
};


export const simplifyAstroChart = (data: any = null) => {
  if (data instanceof Object) {
    const keys = Object.keys(data);
    if (keys.includes("grahas") && data.grahas instanceof Array) {
      data.grahas = data.grahas.map(row => {
        const {
          num,
          key,
          lng,
          lat,
          lngSpeed,
          topo,
          declination,
          transitions,
          variants
        } = row;

        return {key, num, lng, lat, lngSpeed, transitions, ...variants[0]};
      });
    }
    if (keys.includes("rashis") && data.rashis instanceof Array) {
      data.rashis = data.rashis[0].items;
    }
    if (keys.includes("objects") && data.objects instanceof Array) {
      data.objects = data.objects[0].items;
    }
    
  }
  return data;
}