import moment from "moment";
import { BaseObject } from './base-object';
import { JyotishDay } from "./jyotish-day";

export class IndianTime extends BaseObject {
  /*
    const dayOffset = dayBefore ? -1 : 0;
  const date = moment.utc(datetime).add(dayOffset, 'day');
  const year = date.year();
  const dayNum = date.dayOfYear();
  const muhurtaVal = progress * 30;
  const muhurta = Math.floor(muhurtaVal);
  const ghatiVal = progress * 60;
  const ghati = Math.floor(ghatiVal);
  const ghRemainder = ghatiVal % 1;
  const vighatiVal = ghRemainder * 60;
  const vighati = Math.floor(vighatiVal);
  const viRemainder = vighatiVal % 1;
  const lipta = viRemainder * 60;
  */

  _jDay = null;

  _sunData = null;

  date = null;

  constructor(jDay) {
    super();
    if (jDay instanceof JyotishDay) {
      this._jDay = jDay;
      this._sunData = jDay.sunData;
      const dayOffset = jDay.dayBefore() ? -1 : 0;
      this.date = moment.utc(jDay.datetime).add(dayOffset, 'day');
    }
  }

  jd = () => this._jDay.jd;

  geo = () => this._jDay.geo;

  year = () => this.date.year();

  dayNum = () => this.date.dayOfYear();

  progress = () => this._jDay.progress();

  dayLength = () => this._jDay.dayLength();

  rise = () => this._sunData.rise;

  set = () => this._sunData.set;

  prevRise = () => this._sunData.prevRise;

  prevSet = () => this._sunData.set;

  isDayTime = () => this._jDay.isDayTime();

  dayBefore = () => this._jDay.dayBefore();

  dayStart = () => this._jDay.dayStart();

  ghatiVal = () => this.progress() * 60;

  muhurtaVal = () => this.progress() * 30;

  muhurta = () => Math.floor(this.muhurtaVal());

  ghati = () => Math.floor(this.ghatiVal());

  vighatiVal = () => {
    const remainder = this.ghatiVal() % 1;
    return remainder * 60;
  }

  vighati = () => Math.floor(this.vighatiVal());

  lipta = () => {
    const remainder = this.vighatiVal() % 1;
    return remainder * 60;
  }

}