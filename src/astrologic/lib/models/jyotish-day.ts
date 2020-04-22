import { BaseObject } from './base-object';
import { calcAstroWeekDayIndex } from '../date-funcs';

export class JyotishDay extends BaseObject {
  jd = 0;

  sunData = null;

  datetime = null;

  geo = null;

  constructor(sunData) {
    super();
    this.sunData = sunData;
    this.jd = sunData.jd;
    this.datetime = sunData.datetime;
    this.geo = sunData.geo;
  }

  rise = () => this.sunData.rise;

  set = () => this.sunData.set;

  prevSet = () => this.sunData.prevSet;

  prevRise = () => this.sunData.prevRise;

  nextRise = () => this.sunData.nextRise;

  dayBefore = () => this.jd < this.rise().jd;

  afterSunSet = () => this.jd > this.set().jd;

  dayStart = () => (this.dayBefore() ? this.prevRise().jd : this.rise().jd);

  dayLength = () =>
    this.dayBefore()
      ? this.rise().jd - this.prevRise().jd
      : this.nextRise().jd - this.rise().jd;

  startJd = () =>
    this.dayBefore()
      ? this.prevSet().jd
      : this.afterSunSet()
      ? this.set().jd
      : this.rise().jd;

  periodLength = () =>
    this.dayBefore()
      ? this.rise().jd - this.prevSet().jd
      : this.afterSunSet()
      ? this.nextRise().jd - this.set().jd
      : this.set().jd - this.rise().jd;

  periodHours = () => this.periodLength() * 24;

  weekDay = () => calcAstroWeekDayIndex(this.datetime, !this.dayBefore());

  startDayJd = () => this.dayStart();

  jdTime = () => this.jd - this.dayStart();

  progress = () => this.jdTime() / this.dayLength();

  isDayTime = () => {
    const diffOffset =
      this.set().jd - this.rise().jd < 0 ? 0 - this.dayLength() : 0;
    return this.jd > this.rise().jd + diffOffset && this.jd < this.set().jd;
  };
}
