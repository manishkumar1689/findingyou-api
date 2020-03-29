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