import * as swisseph from 'swisseph';
import * as moment from 'moment-timezone';
import {
  isNumeric,
  isInteger,
  validISODateString,
} from '../../lib/validators';
import { Moment } from 'moment';
import { zeroPad } from '../../lib/converters';

export const defaultDateParts = { year: 0, month: 0, day: 0, hour: 0 };

/*
@param params:Object
*/
export const calcJulianDate = params => {
  let iso = null;
  let jd = null;
  let dp = defaultDateParts;
  if (params instanceof Object) {
    if (params.hasOwnProperty('dt') && validISODateString(params.dt)) {
      iso = params.dt;
    } else if (params.hasOwnProperty('y')) {
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
    jd,
  };
};

export const buildDatePartsFromParams = query => {
  const keys = Object.keys(query);
  let dp = defaultDateParts;
  if (keys.includes('y')) {
    if (isNumeric(query.y)) {
      dp.year = parseInt(query.y, 10);
    }
    if (keys.includes('m') && isNumeric(query.m)) {
      dp.month = parseInt(query.m, 10);
    }
    if (keys.includes('d') && isNumeric(query.d)) {
      dp.day = parseInt(query.d, 10);
    }
    if (keys.includes('h') && isNumeric(query.h)) {
      dp.hour = parseFloat(query.h);
    } else if (keys.includes('hrs') && isInteger(query.hrs)) {
      let h = parseInt(query.hrs);
      if (keys.includes('min') && isNumeric(query.min)) {
        h += parseInt(query.min) / 60;
        if (keys.includes('sec') && isNumeric(query.sec)) {
          h += parseFloat(query.sec) / 3600;
        }
      }
      dp.hour = h;
    }
  }
  return dp;
};

export const toDateParts = strDate => {
  let dt = moment.utc(strDate);
  let minSecs = dt.minutes() * 60 + dt.seconds();
  let decHrs = dt.hours() + minSecs / 3600;
  return {
    year: dt.year(),
    month: dt.month() + 1,
    day: dt.date(),
    hour: decHrs,
  };
};

export const buildIsoDateFromParts = dp => {
  const hours = Math.floor(dp.hour);
  const minVal = (dp.hour % 1) * 60;
  const mins = Math.floor(minVal);
  const secs = Math.ceil((minVal % 1) * 60);
  const strDate = [dp.year, zero2Pad(dp.month - 1), zero2Pad(dp.day)].join('-');
  const strTime = [zero2Pad(hours), zero2Pad(mins), zero2Pad(secs)].join(':');
  const isoDate = [strDate, strTime].join('T');
  return moment
    .utc(isoDate)
    .format()
    .split('.')
    .shift();
};

export const calcJulDate = (strDate, julian = false) => {
  let dp = toDateParts(strDate);
  return calcJulDateFromParts(dp, julian);
};

export const calcJulDateFromParts = (dp, julian = false) => {
  const greg_flag = julian === true ? 0 : 1;
  return swisseph.swe_julday(dp.year, dp.month, dp.day, dp.hour, greg_flag);
};

export const jdToDateParts = (jd, gregFlag = 1) => {
  return swisseph.swe_revjul(jd, gregFlag);
};

export const zero2Pad = num => {
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
};

export const jdToDateTime = (jd, gregFlag = 1) => {
  const parts = jdToDateParts(jd, gregFlag);
  const dateStr = [parts.year, zero2Pad(parts.month), zero2Pad(parts.day)].join(
    '-',
  );
  const hours = Math.floor(parts.hour);
  const mfl = (parts.hour % 1) * 60;
  const minutes = Math.floor(mfl);
  const sfl = (mfl % 1) * 60;
  const seconds = Math.floor(sfl);
  const millisecs = (sfl % 1)
    .toFixed(3)
    .split('.')
    .pop();
  const timeStr = [zero2Pad(hours), zero2Pad(minutes), zero2Pad(seconds)].join(
    ':',
  );
  return dateStr + 'T' + timeStr + '.' + millisecs;
};

export const calcAstroWeekDayIndex = (datetime, afterSunrise = true) => {
  const daySubtract = afterSunrise ? 0 : 1;
  return moment(datetime)
    .subtract(daySubtract, 'day')
    .weekday();
};

export const weekDayNum = (dt: Date | string, dayBefore = false): number => {
  const isoNum = moment(dt).isoWeekday();
  const dayNum = isoNum < 7 && isoNum > 0 ? isoNum - 1 : isoNum % 7;
  const offset = dayBefore ? -1 : 0;
  return (dayNum + 7 + offset) % 7;
};

export const toDateTime = (dt: Date | string): Date => {
  return moment.utc(dt);
};

export const hourMinTz = (offset = 0) => {
  const secs = Math.abs(offset);
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor(secs / 60) % 60;
  const parts = [offset >= 0 ? '+' : '-', zeroPad(hours, 2)];
  if (minutes > 0) {
    parts.push(':');
    parts.push(zeroPad(minutes, 2));
  }
  return parts.join('');
};

export const shortTzAbbr = (
  dt: string | Date,
  timeZone: string,
  offset = -1,
) => {
  const mt = moment(dt).add({ seconds: offset });
  let abbr = moment.tz(mt.toISOString(), timeZone).zoneAbbr();
  if (abbr) {
    switch (abbr) {
      case '+00':
        abbr = 'GMT';
        break;
    }
  } else if (offset !== -1) {
    abbr = hourMinTz(offset);
  }
  return abbr;
};

export const applyTzOffsetToDateString = (dt, offsetSecs: number) => {
  return moment
    .utc(dt)
    .subtract(offsetSecs, 'seconds')
    .toISOString()
    .split('.')
    .shift();
};

export const utcDate = (dt: Date | string) => {
  return moment.utc(dt);
};

export const toShortTzAbbr = (dt, timezoneRef: string) =>
  moment.tz(dt, timezoneRef).format('z');

export const julToUnixTime = (jd: number, tzOffset = 0): number => {
  const epoch = 2440587.5; // Jan. 1, 1970 00:00:00 UTC
  return jd !== undefined ? (jd - epoch) * 86400 + tzOffset : 0;
};

export const julToISODateObj = (jd: number, tzOffset = 0): Moment => {
  return !isNaN(jd) ? moment.unix(julToUnixTime(jd, tzOffset)) : moment.unix(0);
};

export const julToISODate = (jd: number, tzOffset = 0): string => {
  return julToISODateObj(jd, tzOffset).toISOString();
};

export const julToDateFormat = (
  jd: number,
  tzOffset = 0,
  fmt = 'euro1',
  timeOptions = {
    time: true,
    seconds: true,
  },
): string => {
  const dtS = julToISODate(jd, tzOffset);
  const [dt, tm] = dtS.split('T');
  const [y, m, d] = dt.split('-');

  let dp = [d, m, y];
  let sep = '/';
  switch (fmt) {
    case 'us':
      dp = [m, d, y];
      break;
    case 'euro2':
      sep = '.';
      break;
    case 'iso':
      dp = [y, m, d];
      break;
    case '-':
    case '':
      dp = [];
      break;
  }
  const parts = dp.length > 1 ? [dp.join(sep)] : [];
  if (timeOptions.time) {
    const timeParts = tm
      .split('.')
      .shift()
      .split(':');
    const tp = timeOptions.seconds ? timeParts : timeParts.slice(0, 2);
    parts.push(tp.join(':'));
  }
  return parts.join(' ');
};

export const decimalYear = (strDate = '') => {
  const mom = validISODateString(strDate) ? moment.utc(strDate) : moment.utc();
  const years = mom.year();
  const numDaysInYear = mom.isLeapYear() ? 366 : 365;
  const yearProgress = mom.dayOfYear() / numDaysInYear;
  return years + yearProgress;
};
