/*
* Methods to convert Maps to objects and to simplify complex objects
*/

export const mapToObject = (map) => {
  if (map instanceof Map) {
    return Object.fromEntries(map);
  } else {
    return {};
  }
}

export const objectToMap = (obj) => {
  if (obj instanceof Object) {
    return new Map(Object.entries(obj));
  } else {
    return new Map();
  }
}

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
}
