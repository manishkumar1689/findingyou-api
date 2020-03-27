export const isString = str => typeof str === 'string' || str instanceof String;

export const notEmptyString = (str, min = 1) =>
  isString(str) && str.length >= min;

export const emptyString = (str, min = 1) => !notEmptyString(str, min);

export const objHasKeys = (obj: any, keys: Array<string>) => {
  let valid = false;
  if (obj instanceof Object) {
    const objKeys = Object.keys(obj);
    valid = keys.every(k => objKeys.indexOf(k) >= 0);
  }
  return valid;
};

export const objHasKey = (obj: any, key: string) => {
  return objHasKeys(obj, [key]);
};

const numPattern = `\s*-?\\d+(\\.\\d+)?`;

const intPattern = `\s*-?\\d+\s*$`;

const numRgx = new RegExp('^' + numPattern);

const intRgx = new RegExp('^' + intPattern);

export const isNumericType = inval =>
  typeof inval === 'number' || inval instanceof Number;

export const isNumber = inval => isNumericType(inval) && !isNaN(inval);

export const isNumeric = inval => isNumber(inval) || numRgx.test(inval);

export const isInteger = inval =>
  isNumber(inval) ? inval % 1 === 0 : intRgx.test(inval);

export const approximate = (inval, precision = 6) => {
  const multiplier = Math.pow(10, precision);
  return Math.floor(inval * multiplier) / multiplier;
};

export const isApprox = (iv1, iv2, precision) =>
  approximate(iv1, precision) === approximate(iv2, precision);

export const numericStringInRange = (numStr, min = -180, max = 180) => {
  const flVal = parseFloat(numStr);
  let valid = false;
  if (!isNaN(flVal)) {
    valid = flVal >= min && flVal <= max;
  }
  return valid;
};

export const inRange = (num, range) => {
  let valid = false;
  if (isNumeric(num) && range instanceof Array && range.length > 1) {
    num = parseFloat(num);
    valid = num >= range[0] && num <= range[1];
  }
  return valid;
};

export const withinTolerance = (num, target, tolerance) => {
  let valid = false;
  if (isNumeric(num) && isNumeric(target) && isNumeric(tolerance)) {
    num = parseFloat(num);
    target = parseFloat(target);
    tolerance = parseFloat(tolerance);
    valid = num >= target - tolerance && num <= target + tolerance;
  }
  return valid;
};

export const validLocationParameter = loc => {
  let valid = false;
  if (notEmptyString(loc, 3)) {
    const rgx = new RegExp(
      `^(${numPattern}),(${numPattern})(,(${numPattern}))?$`,
    );
    const match = loc.match(rgx);
    if (match) {
      if (match[1]) {
        valid = numericStringInRange(match[1], -90, 90);
      }
      if (valid) {
        if (match[3]) {
          valid = numericStringInRange(match[1], -179.9999999999999, 180);
        }
        if (match[6]) {
          valid = isNumeric(match[6]);
        }
      }
    }
  }
  return valid;
};

export const validISODateString = str => {
  return /^\d\d\d\d+-\d\d-\d\d((T|\s)\d\d:\d\d(:\d\d)?)?/.test(str);
};
