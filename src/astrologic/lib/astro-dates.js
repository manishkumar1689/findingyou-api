const swisseph = require('swisseph');
const moment = require('moment');
const { isNumeric, isInteger, validISODateString } = require("./validators");

const defaultDateParts = { year: 0, mmonth: 0, day: 0, hour: 0 };

/*
@param params:Object
*/
const calcJulianDate = (params) => {
  let iso = null;
  let jd = null;
  let dp = defaultDateParts;
  if (params instanceof Object) {
    if (params.hasOwnProperty("dt") && validISODateString(params.dt)) {
      iso = params.dt;
    } else if (params.hasOwnProperty("y")) {
      dp = buildDatePartsFromParams(params);
    }
  }
  if (iso) {
    jd = calcJulDate(iso);
  } else if (dp.year > 0) {
    jd = calcJulDateFromParts(dp);
    iso = buildIsoDateFromParts(dp);
  }
  return {
    iso,
    jd
  };
}

const buildDatePartsFromParams = (query) => {
  const keys = Object.keys(query);
  let dp = defaultDateParts;
  if (keys.includes("y")) {
    if (isNumeric(query.y)) {
      dp.year = parseInt(query.y, 10);
    }
    if (keys.includes("m") && isNumeric(query.m)) {
      dp.month = parseInt(query.m, 10);
    }
    if (keys.includes("d") && isNumeric(query.d)) {
      dp.day = parseInt(query.d, 10);
    }
    if (keys.includes("h") && isNumeric(query.h)) {
      dp.hour = parseFloat(query.h);
    } else if (keys.includes("hrs") && isInteger(query.hrs)) {
      let h = parseInt(query.hrs);
      if (keys.includes("min") && isNumeric(query.min)) {
        h += (parseInt(query.min) / 60);
        if (keys.includes("sec") && isNumeric(query.sec)) {
          h += (parseFloat(query.sec) / 3600);
        }
      }
      dp.hour = h;
    }
  }
  return dp;
}

const toDateParts = (strDate) => {
  let dt = moment.utc(strDate);
  let minSecs = (dt.minutes() * 60) + dt.seconds();
  let decHrs = dt.hours() + (minSecs / 3600);
  return {
    year: dt.year(),
    month: dt.month() + 1,
    day: dt.date(),
    hour: decHrs
  };
}

const buildIsoDateFromParts = (dp) => {
  const hours = Math.floor(dp.hour);
  const minVal = (dp.hour % 1) * 60;
  const mins = Math.floor(minVal);
  const secs = Math.ceil((minVal % 1) * 60);
  return new Date(dp.year, (dp.month - 1), dp.day, hours, mins, secs).toISOString().split(".").shift();
}

const calcJulDate = (strDate, julian = false) => {
  let dp = toDateParts(strDate);
  return calcJulDateFromParts(dp, julian);
}

const calcJulDateFromParts = (dp, julian = false) => {
  const greg_flag = julian === true ? 0 : 1;
  return swisseph.swe_julday(dp.year, dp.month, dp.day, dp.hour, greg_flag);
}

const jdToDateParts = (jd, gregFlag = 1) => {
  return swisseph.swe_revjul(jd, gregFlag);
}

const zero2Pad = (num) => {
  let out = '';
  if (isNumeric(num)) {
    const iVal = parseInt(num);
    if (iVal < 10) {
      out = '0' + iVal;
    } else {
      out = iVal.toString();
    }
  }
  return out;
}

const jdToDateTime = (jd, gregFlag = 1) => {
  const parts = jdToDateParts(jd, gregFlag);
  const dateStr = [parts.year, zero2Pad(parts.month), zero2Pad(parts.day)].join('-');
  const hours = Math.floor(parts.hour);
  const mfl = (parts.hour % 1) * 60;
  const minutes = Math.floor(mfl);
  const sfl = (mfl % 1) * 60;
  const seconds = Math.floor(sfl);
  const millisecs = (sfl % 1).toFixed(3).split('.').pop();
  const timeStr = [zero2Pad(hours), zero2Pad(minutes), zero2Pad(seconds)].join(':');
  return dateStr + 'T' + timeStr + '.' + millisecs;
}

const calcAstroWeekDayIndex = (datetime, afterSunrise = true) => {
  const daySubtract = afterSunrise ? 0 : 1;
  return moment(datetime).subtract(daySubtract, 'day').weekday();
}

module.exports = { calcJulianDate, buildDatePartsFromParams, buildIsoDateFromParts, calcJulDate, calcJulDateFromParts, jdToDateParts, jdToDateTime, calcAstroWeekDayIndex };