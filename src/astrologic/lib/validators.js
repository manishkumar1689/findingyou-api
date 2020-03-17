const isString = str => typeof str === 'string' || str instanceof String;

const notEmptyString = (str, min = 1) => isString(str) && str.length >= min;

const emptyString = (str, min = 1) => !notEmptyString(str, min);

const objHasKeys = (obj, keys) => {
  let valid = false;
  if (obj instanceof Object) {
    const objKeys = Object.keys(obj);
    valid = keys.every(k => objKeys.indexOf(k) >= 0);
  }
  return valid;
}

const numPattern = `\s*-?\\d+(\\.\\d+)?`;

const intPattern = `\s*-?\\d+\s*$`;

const numRgx = new RegExp('^' + numPattern);

const intRgx = new RegExp('^' + intPattern);

const isNumericType = inval => typeof inval === 'number' || inval instanceof Number;

const isNumber = inval => isNumericType(inval) && !isNaN(inval);

const isNumeric = inval => isNumber(inval) || numRgx.test(inval);

const isInteger = inval => isNumber(inval) ? inval % 1 === 0 : intRgx.test(inval);

const approximate = (inval, precision = 6) => {
  const multiplier = Math.pow(10, precision);
  return Math.floor(inval * multiplier) / multiplier;
}

const isApprox = (iv1, iv2, precision) => approximate(iv1, precision) === approximate(iv2, precision);

const numericStringInRange = (numStr, min = -180, max = 180) => {
  const flVal = parseFloat(numStr);
  let valid = false;
  if (!isNaN(flVal)) {
    valid = flVal >= min && flVal <= max;
  }
  return valid;
}

const inRange = (num, range) => {
  let valid = false;
  if (isNumeric(num) && range instanceof Array && range.length > 1) {
    num = parseFloat(num);
    valid = num >= range[0] && num <= range[1];
  }
  return valid;
}

const withinTolerance = (num, target, tolerance) => {
  let valid = false;
  if (isNumeric(num) && isNumeric(target) && isNumeric(tolerance)) {
    num = parseFloat(num);
    target = parseFloat(target);
    tolerance = parseFloat(tolerance);
    valid = num >= (target - tolerance) && num <= (target + tolerance);
  }
  return valid;
}

const validLocationParameter = (loc) => {
  let valid = false;
  if (notEmptyString(loc, 3)) {
    const rgx = new RegExp(`^(${numPattern}),(${numPattern})(,(${numPattern}))?$`);
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
}

const validISODateString = str => {
  return /^\d\d\d\d+-\d\d-\d\d((T|\s)\d\d:\d\d(:\d\d)?)?/.test(str);
}

module.exports = { isNumeric, isInteger, isNumber, notEmptyString, emptyString, numericStringInRange, validLocationParameter, validISODateString, isApprox, inRange, withinTolerance };