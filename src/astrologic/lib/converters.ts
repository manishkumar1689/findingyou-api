import { isNumeric } from './validators';
import { ephemerisDefaults } from '../../.config';

export const locStringToGeo = (loc) => {
  const [lat, lng, altV] = loc.split(',').filter(isNumeric).map(parseFloat);
  const alt = isNumeric(altV) ? altV : ephemerisDefaults.altitude;
  return { lat, lng, alt };
}

export const dmsToDegrees = (dms) => {
  let v = 0;
  if (dms instanceof Object) {
    const keys = Object.keys(dms);
    if (keys.includes('deg')) {
      v = parseFloat(dms.deg);
    }
    if (keys.includes('min')) {
      v += parseFloat(dms.min / 60);
    }
    if (keys.includes('sec')) {
      v += parseFloat(dms.sec / 3600);
    }
  }
  return v;
}

/*
@param flDeg:number
@return Object
*/
export const decDegToDms = (flDeg) => {
  let dms = { deg: 0, min: 0, sec: 0 };
  if (isNumeric(flDeg)) {
    flDeg = parseFloat(flDeg);
    dms.deg = Math.floor(flDeg);
    const remainder = flDeg % 1;
    const flMins = remainder * 60;
    dms.min = Math.floor(flMins);
    const remainderMins = flMins % 1;
    dms.sec = (remainderMins * 60).toFixed(3);
  }
  return dms;
}

/*
@param flDeg:number
@param mode:string (raw|lat|lng)
@return string
*/
export const degAsDms = (flDeg, mode = 'raw') => {
  const dms = decDegToDms(flDeg);
  let letter = '';
  let hasLetter = false;
  switch (mode) {
    case 'lat':
      letter = flDeg < 0 ? 'S' : 'N';
      hasLetter = true;
      break;
    case 'lng':
    case 'lon':
      letter = flDeg < 0 ? 'W' : 'E';
      hasLetter = true;
      break;
  }
  const degrees = hasLetter ? Math.abs(dms.deg) : dms.deg;
  const suffix = hasLetter ? ' ' + letter : '';
  return `${degrees}º ${dms.min}' ${dms.sec}"${suffix}`;
}