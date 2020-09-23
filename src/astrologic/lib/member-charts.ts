const removeIds = item => {
  if (item instanceof Object) {
    delete item._id;
  }
  return item;
};

export const simplifyChart = (chart = null, ayanamshaKey = 'true_citra') => {
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

  chart.grahas = grahas.map(gr => {
    gr.lng = gr.lng - ayanamshaVal;
    gr.topo = {
      lng: gr.topo.lng - ayanamshaVal,
      lat: gr.topo.lat,
    };
    delete gr._id;
    gr.transitions = gr.transitions.map(removeIds);
    let extra: any = {};
    if (gr.variants instanceof Array) {
      extra = Object.assign({}, removeIds(gr.variants[ayanamshaIndex]));
    }
    delete gr.variants;
    return { gr, ...extra };
  });
  chart.placenames = chart.placenames.map(pl => {
    delete pl._id;
    delete pl.geo._id;
    return pl;
  });
  chart.subject = removeIds(chart.subject);
  chart.geo = removeIds(chart.geo);
  delete chart._id;
  chart.ayanamshas = chart.ayanamshas.map(removeIds);
  chart.upagrahas = chart.upagrahas.map(removeIds);
  if (chart.sphutas instanceof Array && ayanamshaIndex < chart.sphutas.length) {
    chart.sphutas = chart.sphutas[ayanamshaIndex].items.map(removeIds);
  }
  if (chart.objects instanceof Array && ayanamshaIndex < chart.objects.length) {
    chart.objects = chart.objects[ayanamshaIndex].items.map(removeIds);
  }
  if (
    chart.numValues instanceof Array &&
    ayanamshaIndex < chart.numValues.length
  ) {
    chart.numValues = chart.numValues[ayanamshaIndex].items.map(removeIds);
  }
  delete chart.__v;
  return chart;
};
