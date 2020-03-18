import * as swisseph from 'swisseph';
import { isNumeric, isInteger, validLocationParameter, validISODateString } from "./validators";
import { calcAsync, calcUtAsync } from './sweph-async';
import { calcJulDate, calcJulDateFromParts } from './date-funcs';

const planet = async (jd, planetId) => {
  let data = { valid: false };

  await calcUtAsync(jd, planetId, swisseph.SEFLG_SIDEREAL)
    .catch(res => {
      data = res;
    });
  return data;
}

export const planetData = async (params) => {
  let data = { valid: false, error: "invalid parameters" };
  if (params.dt) {
    let jd = calcJulDate(params.dt);
    if (params.planet) {
      let planetId = parseInt(params.planet);
      const result = await planet(jd, planetId);
      const dp = validISODateString(params.dt) ? toDateParts(params.dt) : defaultDateParts;
      if (result instanceof Object) {
        const valid = Object.keys(result).indexOf("error") < 0;
        data = { jd, dp, ...result, valid };
      }
    } else {
      data.error = "no planet (numeric planet id) parameter"
    }
  } else {
    data.error = "no dt (datetime) parameter"
  }
  return data;
}

export const calcData = async (getVars) => {
  if (getVars.dt) {
    getVars.date = {
      gregorian: {
        terrestrial: toDateParts(getVars.dt)
      }
    }
    if (!getVars.body) {
      getVars.body = {
        position: {}
      }
    }
    if (!getVars.planet) {
      getVars.planet = 1;
    }
    if (getVars.planet) {
      getVars.body.id = parseInt(getVars.planet);
    }
    if (!getVars.observer) {
      getVars.observer = {
        ephemeris: 'swisseph',
        geographic: {
          longitude: 0.0,
          latitude: 0.0,
          height: 0.0
        }
      }
    }
    if (getVars.loc) {

      if (typeof getVars.loc == 'string' && validLocationParameter(getVars.loc)) {
        let parts = getVars.loc.split(',');
        let height = 0;
        if (parts.length > 2) {
          height = parseInt(parts[2]);
        }
        getVars.observer.geographic = {
          longitude: parseFloat(parts[1]),
          latitude: parseFloat(parts[0]),
          height: height
        }
      }
    }
  }
  return await calcAsync(getVars);
}

const polymorphicParseFunc = (funcname, getVars) => {
  let exists = false;
  let inParams = [];
  if (typeof funcname == 'string') {
    if (funcname.indexOf('swe_') < 0) {
      funcname = 'swe_' + funcname;
    }
    if (swisseph[funcname]) {
      if (typeof swisseph[funcname] == 'function') {
        exists = true;
      }
    }
  }
  if (exists) {
    let result = null;
    if (getVars.params) {
      if (getVars.params.length > 0) {
        const parts = getVars.params.split(',').map(p => {
          if (isNumeric(p)) {
            p = parseFloat(p);
          } else if (isInteger(p)) {
            p = parseInt(p);
          } else if (p === 'null') {
            p = null;
          }
          return p;
        });
        if (parts.length > 0) {
          try {
            result = swisseph[funcname](...parts);
          } catch (e) {
            result = "invalid parameters";
          }

        }
        inParams = parts;
      }
    }
    return {
      name: funcname,
      exists: true,
      result,
      params: inParams
    };
  } else {
    return {
      name: funcname,
      exists: false
    };
  }
}

export const parseFunc = async (funcname, params) => {
  let data = { valid: false };
  switch (funcname) {
    case 'planet':
      data = await planetData(params);
      break;
    case 'calc':
      await calcData(params)
        .then(d => {
          data = d
        })
        .catch(e => {
          data = e;
        });
      break;
    default:
      data = polymorphicParseFunc(funcname, params);
      break;
  }
  return data;
}

export const getFuncNames = () => {
  let vals = [];
  if (swisseph instanceof Object) {
    for (name in swisseph) {
      const func = swisseph[name];
      if (func instanceof Function) {
        vals.push(name);
      }
    }
  }
  return vals;
}

export const getConstantVals = () => {
  let vals = [];
  if (swisseph instanceof Object) {
    for (name in swisseph) {
      const value = swisseph[name];
      if (typeof value === 'number') {
        vals.push({ name, value })
      }
    }
  }
  return vals;
}
