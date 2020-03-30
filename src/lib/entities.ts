export const updateSubEntity = (source, data) => {
  if (data instanceof Object && source instanceof Object) {
    const entries = Object.entries(data);
    entries.forEach(entry => {
      const k = entry[0];
      const v = entry[1];
      source[k] = v;
    });
  }
  return source;
};

export const updateInSubEntities = (items: any[], refID: string, data) => {
  items.forEach((item, index) => {
    if (item._id.toString() === refID) {
      items[index] = updateSubEntity(item, data);
    }
  });
  return items;
};

export const hashMapToObject = (
  hm: Map<string, any>,
  sortKeys: string[] = [],
) => {
  if (sortKeys.length > 0) {
    const hm2 = new Map<string, any>();
    sortKeys.forEach(k => {
      if (hm.has(k)) {
        hm2.set(k, hm.get(k));
      }
    });
    hm = hm2;
  }
  return Object.fromEntries(hm);
};

export const extractObjValue = (obj: any, key: string) => {
  let matchedVal = null;
  if (obj) {
    const keyVals = Object.entries(obj)
      .filter(item => item[0] === key)
      .map(item => item[1]);
    if (keyVals.length > 0) {
      matchedVal = keyVals[0];
    }
  }
  return matchedVal;
};

export const extractObject = (obj: any) => {
  let matchedVal = null;
  if (obj) {
    const keyVals = Object.entries(obj)
      .filter(item => item[0] === '_doc')
      .map(item => item[1]);
    if (keyVals.length > 0) {
      matchedVal = keyVals[0];
    } else if (obj instanceof Object) {
      matchedVal = obj;
    }
  }
  return matchedVal;
};

export const extractSimplified = (obj: any, exclude: string[]) => {
  const matchedVal = extractObject(obj);
  const data = new Map<string, any>();
  return hashMapToObject(extractObjectAndMerge(matchedVal, data, exclude));
};

export const extractObjectAndMerge = (
  obj: any,
  data: Map<string, any>,
  exclude: string[],
) => {
  const matchedObj = extractObject(obj);
  if (matchedObj) {
    Object.entries(matchedObj).forEach(entry => {
      if (exclude.indexOf(entry[0]) < 0 && entry[0] !== '__v') {
        data.set(entry[0], entry[1]);
      }
    });
  }
  return data;
};

export const extractDocId = (matchedModel): string => {
  let idStr = '';
  if (matchedModel) {
    const matchedDoc = extractObjValue(matchedModel, '_doc');

    if (matchedDoc) {
      idStr = extractObjValue(matchedDoc, '_id');
      if (idStr) {
        idStr = idStr.toString();
      }
    }
  }
  return idStr;
};

export const extractPairArrayFromObject = (obj: any, keys: string[]) => {
  const vals = [];
  if (obj instanceof Object) {
    Object.entries(extractObject(obj)).forEach(entry => {
      const [key, val] = entry;
      if (keys.indexOf(key) >= 0) {
        vals.push([key, val]);
      }
    });
  }
  return vals;
};

export const extractArrayFromObject = (obj: any, keys: string[]) => {
  return extractPairArrayFromObject(obj, keys).map(pair => pair[1]);
};

export const simplifyObject = (obj: any, keys: string[]) => {
  const pairs = extractArrayFromObject(obj, keys).map(pair => pair[1]);
  let hm = new Map<string, any>();
  pairs.forEach(pair => {
    hm.set(pair[0], pair[1]);
  });
  return hashMapToObject(hm);
};