import { GeoLoc } from './geo-loc';
import { KeyNumValue, AyanamshaItem, SurfaceTSData } from '../interfaces';
import {
  subtractLng360,
  calcVargaSet,
  calcSign,
  subtractSign,
  deepClone,
  midLng,
} from '../helpers';
import { calcJdPeriodRange, relativeAngle } from './../core';
import {
  julToISODate,
  weekDayNum,
  toDateTime,
  shortTzAbbr,
  hourMinTz,
  julToDateFormat,
} from './../date-funcs';
import muhurtaValues from './../settings/muhurta-values';
import caughadiaData from './../settings/caughadia-data';
import kalamData from './../settings/kalam-data';
import karanaData from './../settings/karana-data';
import horaValues from './../settings/hora-values';
import tithiValues from './../settings/tithi-values';
import varaValues from './../settings/vara-values';
import yogaValues from './../settings/yoga-values';
import { Graha } from './graha-set';
import { KaranaSet } from './karana-set';
import { MuhurtaSet, MuhurtaItem } from './muhurta-set';
import { isNumeric, notEmptyString } from './../../../lib/validators';
import { TransitionSet } from './transition-set';
import { UpagrahaValue } from './upagraha-value';
import { matchReference } from './graha-set';

export interface Subject {
  name: string;
  type: string;
  notes?: string;
  gender: string;
  eventType: string;
  roddenScale: string;
}

const emptySubject = {
  name: '',
  type: 'person',
  gender: '-',
  eventType: 'birth',
  roddenScale: 'XX',
};

export interface GrahaTransition {
  type: string;
  jd: number;
  datetime: Date;
}

export interface Placename {
  name: string;
  fullName: string;
  type: string;
  geo: GeoLoc;
}

export interface LngLat {
  lng: number;
  lat: number;
}

export interface BaseGraha {
  key: string;
  num: number;
  lng: number;
  lat: number;
  topo: LngLat;
  lngSpeed: number;
  declination: number;
  variants: Variant[];
  transitions: Array<GrahaTransition>;
}

export interface HouseSystem {
  system: string;
  values: Array<number>;
}

export interface Variant {
  num: number; // ayanamsha ref number
  sign: number;
  house: number;
  nakshatra: number;
  relationship: string;
  charaKaraka?: string;
}

export interface ObjectMatch {
  key: string;
  type: string;
  value: string;
}

export interface ObjectMatchSet {
  num: number;
  items: Array<ObjectMatch>;
}

export interface VariantSet {
  num: number;
  items: KeyNumValue[];
}

interface IndianTime {
  year: number;
  dayNum: number;
  progress: number;
  dayLength: number;
  isDayTime: boolean;
  dayBefore: boolean;
  dayStart: number;
  muhurta: number;
  ghati: number;
  vighati: number;
  lipta: number;
}

interface Muhurta {
  num: number;
  quality: string;
  jd: number;
  dt: string;
  exDays: Array<number>;
  active: boolean;
}

export class Chart {
  _id?: string;
  user: string;
  isDefaultBirthChart: boolean;
  subject = emptySubject;
  datetime: Date;
  jd: number;
  geo = new GeoLoc([0, 0, 0]);
  placenames: Array<Placename> = [];
  tz: string;
  tzOffset: number;
  ascendant: number;
  mc: number;
  vertex: number;
  grahas: Array<BaseGraha> = [];
  houses: Array<HouseSystem> = [];
  indianTime: IndianTime;
  ayanamshas: Array<KeyNumValue> = [];
  upagrahas: Array<KeyNumValue> = [];
  sphutas: Array<VariantSet> = [];
  keyValues: Array<KeyNumValue> = [];
  objects: Array<ObjectMatchSet> = [];
  createdAt?: Date;
  modifiedAt?: Date;
  ayanamshaItem?: AyanamshaItem;
  vargaNum = 1;
  surface: SurfaceTSData = {
    geo: { lat: 0, lng: 0 },
    ascendant: -90,
    tzOffset: 0,
  };
  [key: string]: any;

  constructor(result: any = null, surface = null) {
    if (result instanceof Object) {
      Object.entries(result).forEach(entry => {
        const [k, v] = entry;
        switch (k) {
          case '_id':
          case 'user':
          case 'tz':
            if (typeof v === 'string') {
              this[k] = v;
            }
            break;
          case 'subject':
            if (v instanceof Object) {
              this[k] = v as Subject;
            }
            break;
          case 'indianTime':
            if (v instanceof Object) {
              this[k] = v as IndianTime;
            }
            break;
          case 'geo':
            this.geo = new GeoLoc(v);
            break;
          case 'datetime':
          case 'createdAt':
          case 'modifiedAt':
            if (typeof v === 'string') {
              this[k] = toDateTime(v);
            } else if (v instanceof Date) {
              this[k] = v;
            }
            break;
          case 'jd':
          case 'mc':
          case 'ascendant':
          case 'vertex':
          case 'tzOffset':
            if (typeof v === 'number') {
              this[k] = v;
            } else if (typeof v === 'string') {
              if (isNumeric(v)) {
                this[k] = parseFloat(v);
              }
            }
            break;
          case 'grahas':
            if (v instanceof Array) {
              this.grahas = v.filter(g => g instanceof Object);
            }
            break;
          case 'placenames':
          case 'sphutas':
          case 'upagrahas':
          case 'keyValues':
          case 'objects':
          case 'houses':
          case 'ayanamshas':
            if (v instanceof Array) {
              this[k] = v;
            }
            break;
        }
      });
    }
    if (surface instanceof Object) {
      this.surface = surface;
    }
  }

  setVarga(num = 1) {
    this.vargaNum = num;
  }

  setAyanamshaItem(ayanamshaItem: AyanamshaItem) {
    const value = this.getAyanamshaValue(ayanamshaItem.key);
    const av = value >= 0 ? { ...ayanamshaItem, value } : ayanamshaItem;
    this.ayanamshaItem = Object.assign({}, av);
    return this.ayanamshaItem;
  }

  getAyanamshaValue(key: string): number {
    const item = this.ayanamshas.find(a => a.key === key);
    if (item) {
      return item.value;
    } else {
      return -1;
    }
  }

  get ayanamshaOffset() {
    if (this.ayanamshaItem instanceof Object) {
      return this.ayanamshaItem.value;
    } else {
      return 0;
    }
  }

  get surfaceAscendantGraha() {
    let lng = 0;
    if (this.surface.ascendant >= 0) {
      lng = this.surface.ascendant;
    }
    return this.buildGraha('as', lng, 0);
  }

  get surfaceGeo() {
    return this.surface.geo;
  }

  get ayanamshaNum() {
    if (this.ayanamshaItem instanceof Object) {
      return this.ayanamshaItem.num;
    } else {
      return 0;
    }
  }

  // adjusted ascendant
  get lagna() {
    return subtractLng360(this.ascendant, this.ayanamshaOffset);
  }

  get firstHouseSign() {
    return Math.floor(this.lagna / 30) + 1;
  }

  get ascendantGraha(): Graha {
    return this.buildGraha('as', this.ascendant, 0);
  }

  get descendant() {
    return (this.ascendant + 180) % 360;
  }

  get descendantGraha(): Graha {
    return this.buildGraha('ds', this.descendant, 0);
  }

  get mandiGraha(): Graha {
    const mn = this.upagrahas.find(up => up.key === 'md');
    let lng = 0;
    if (mn) {
      lng = mn.value;
    }
    return this.buildGraha('md', lng);
  }

  get gulikaGraha(): Graha {
    const gu = this.upagrahas.find(u => u.key === 'gu');
    let lng = 0;
    if (gu) {
      lng = gu.value;
    }
    return this.buildGraha('gu', lng);
  }

  get ic() {
    return (this.mc + 180) % 360;
  }

  get mcGraha(): Graha {
    return this.buildGraha('mc', this.mc);
  }

  get icGraha(): Graha {
    return this.buildGraha('ic', this.ic);
  }

  get gender() {
    return this.subject instanceof Object ? this.subject.gender : '';
  }

  get isDayTime() {
    return this.indianTime instanceof Object
      ? this.indianTime.isDayTime
      : false;
  }

  get loFDay() {
    return (
      (this.lagna + (this.moon.longitude - this.sun.longitude) + 360) % 360
    );
  }

  get loFNight() {
    return (this.lagna + this.sun.longitude - this.moon.longitude + 360) % 360;
  }

  get lotOfFortune() {
    return this.isDayTime ? this.loFDay : this.loFNight;
  }

  get lotOfSpirit() {
    return this.isDayTime ? this.loFNight : this.loFDay;
  }

  buildGreekLot(key: string, ref = 'F') {
    const grLng = this.graha(key).longitude;
    const reverse = ref === 'F';
    const refLotLng = ref === 'S' ? this.lotOfSpirit : this.lotOfFortune;
    const bodyFirst =
      (this.isDayTime && !reverse) || (!this.isDayTime && reverse);
    return bodyFirst
      ? (this.lagna + (grLng - refLotLng) + 360) % 360
      : (this.lagna + (refLotLng - grLng) + 360) % 360;
  }

  get lotOfNecessity() {
    return this.buildGreekLot('me', 'F');
  }

  get lotOfEros() {
    return this.buildGreekLot('ve', 'S');
  }

  get lotOfCourage() {
    return this.buildGreekLot('ma', 'F');
  }

  get lotOfVictory() {
    return this.buildGreekLot('ju', 'S');
  }

  get lotOfNemesis() {
    return this.buildGreekLot('sa', 'F');
  }

  get lotOfSexMale() {
    const g1 = this.graha('ve').longitude;
    const g2 = this.graha('su').longitude;
    return (this.lagna + g1 - g2 + 360) % 360;
  }

  get lotOfSexFemale() {
    const g1 = this.graha('ma').longitude;
    const g2 = this.graha('mo').longitude;
    return (this.lagna + g1 - g2 + 360) % 360;
  }

  get lotOfChildren() {
    return this.buildGrahaDayTimeSwitchLot('sa', 'ju');
  }

  get lotOfBasis() {
    const arc1 = subtractLng360(this.lotOfFortune, this.lotOfSpirit);
    const arc2 = subtractLng360(this.lotOfSpirit, this.lotOfFortune);
    const arc = arc1 < arc2 ? arc1 : arc2;
    return (this.lagna + arc + 360) % 360;
  }

  get lotOfExaltation() {
    const secondPart = this.isDayTime
      ? 19 - this.sun.longitude
      : 33 - this.moon.longitude;
    return (this.lagna + secondPart + 360) % 360;
  }

  get lotOfMarriage() {
    return this.buildGrahaDayTimeSwitchLot('ve', 'ju');
  }

  buildGrahaDayTimeSwitchLot(refK1: string, refK2: string) {
    const k1 = this.isDayTime ? refK1 : refK2;
    const k2 = this.isDayTime ? refK2 : refK1;
    const g1 = this.graha(k1).longitude;
    const g2 = this.graha(k2).longitude;
    return (this.lagna + g1 - g2 + 360) % 360;
  }

  buildGraha(key: string, lng: number, houseIndex = -1): Graha {
    const gr = matchReference(key, { lng });
    gr.setAyanamshaItem(this.ayanamshaItem);
    gr.setVarga(this.vargaNum);
    const hi =
      houseIndex < 0
        ? subtractSign(calcSign(gr.longitude), calcSign(this.lagna))
        : houseIndex;
    gr.variants = [
      {
        num: this.ayanamshaNum,
        house: hi + 1,
        sign: calcSign(this.longitude),
        nakshatra: Math.floor(gr.longitude / 27) + 1,
        relationship: '',
        charaKaraka: 0,
      },
    ];
    return gr;
  }

  get name() {
    let str = '';
    if (this.subject instanceof Object) {
      const { name } = this.subject;
      if (notEmptyString(name)) {
        str = name;
      }
    }
    return str;
  }

  get shortName() {
    return this.shortenName(10);
  }

  get mediumName() {
    return this.shortenName(15);
  }

  shortenName(maxLength = 10) {
    let str = this.name.split(' ').shift();
    if (str.length > maxLength) {
      str = str.substring(0, maxLength);
    }
    return str;
  }

  get muhurta() {
    let m = {
      num: 0,
      quality: '',
      jd: 0,
      dt: null,
      exDays: [],
      active: false,
    };
    if (this.hasIndianTime) {
      const { dayStart, dayLength, muhurta } = this.indianTime;
      if (muhurta < muhurtaValues.length) {
        const mv = muhurtaValues[muhurta];
        const jd = dayStart + (dayLength / 30) * muhurta;
        m = { ...mv, jd, dt: julToISODate(jd), active: true };
      }
    }
    return new MuhurtaItem(m);
  }

  get muhurtas(): MuhurtaSet {
    const ms: Array<Muhurta> = [];
    if (this.hasIndianTime) {
      const { dayStart, dayLength, muhurta } = this.indianTime;
      if (muhurta < muhurtaValues.length) {
        for (let i = 0; i < 30; i++) {
          const mv = muhurtaValues[i];
          const jd = dayStart + (dayLength / 30) * i;
          ms.push({
            ...mv,
            jd,
            dt: julToISODate(jd),
            active: muhurta === i,
          });
        }
      }
    }
    return new MuhurtaSet({ values: ms });
  }

  get upagrahaValues(): Array<UpagrahaValue> {
    const items = this.upagrahas.map(
      row => new UpagrahaValue(row, this.ayanamshaItem.value),
    );
    items.sort((a, b) => a.sort - b.sort);
    return items;
  }

  get moonPhase(): number {
    const lng = (this.moon.longitude + 360 - this.sun.longitude) % 360;
    return Math.floor(lng / 90) + 1;
  }

  get overHalfLight() {
    const deg = this.sunMoonAngle;
    return deg > 90 && deg < 270;
  }

  get underHalfLight() {
    return !this.overHalfLight;
  }

  get moonWaxing(): boolean {
    return this.moonPhase <= 2;
  }

  getVargaSet() {
    return this.grahas.map(b =>
      calcVargaSet(subtractLng360(b.lng, this.ayanamshaOffset), b.num, b.key),
    );
  }

  get bodies(): Array<Graha> {
    return this.grahas.map(gr => {
      const graha = new Graha(gr);
      graha.setAyanamshaItem(this.ayanamshaItem);
      graha.setVarga(this.vargaNum);
      return graha;
    });
  }

  grahaRow(key: string) {
    return this.grahas.find(gr => gr.key === key);
  }

  graha(key: string): Graha {
    let graha = new Graha(null);
    switch (key) {
      case 'as':
        graha = this.ascendantGraha;
        break;
      case 'ds':
        graha = this.descendantGraha;
        break;
      case 'md':
        graha = this.mandiGraha;
        break;
      case 'gu':
        graha = this.gulikaGraha;
        break;
      case 'mc':
        graha = this.mcGraha;
        break;
      case 'ic':
        graha = this.icGraha;
        break;
      default:
        graha = new Graha(this.grahaRow(key));
        break;
    }

    graha.setAyanamshaItem(this.ayanamshaItem);
    graha.setVarga(this.vargaNum);
    return graha;
  }

  get sunRow() {
    return this.grahaRow('su');
  }

  get sun(): Graha {
    return this.graha('su');
  }

  get moon(): Graha {
    return this.graha('mo');
  }

  get sunTransitions() {
    let transitions: Array<GrahaTransition> = [];
    if (this.sunRow) {
      transitions = this.sunRow.transitions;
    }
    return transitions;
  }

  sunTransition(key = 'rise'): GrahaTransition {
    let transition = { type: '', jd: 0, datetime: null };
    if (this.sunRow) {
      const tr = this.sunRow.transitions.find(tr => tr.type === key);
      if (tr instanceof Object) {
        transition = tr;
      }
    }
    return transition;
  }

  digBala(key: string) {
    const grLng = this.graha(key).longitude;
    let diff = 0;
    switch (key) {
      case 'su':
      case 'ma':
        diff = this.icGraha.longitude - grLng;
        break;
      case 'me':
      case 'ju':
        diff = this.descendantGraha.longitude - grLng;
        break;
      case 'mo':
      case 've':
        diff = this.mcGraha.longitude - grLng;
        break;
      case 'sa':
        diff = this.ascendantGraha.longitude - grLng;
        break;
    }
    const absVal = Math.abs(diff);
    const dist = absVal > 180 ? 360 - absVal : absVal;
    return dist / 3;
  }

  get sunRise() {
    return this.sunTransition('rise');
  }

  get sunSet() {
    return this.sunTransition('set');
  }

  get sunPrevSet() {
    return this.sunTransition('prevSet');
  }

  get sunPrevRise() {
    return this.sunTransition('prevRise');
  }

  get sunNextRise() {
    return this.sunTransition('nextRise');
  }

  get sunMoonAngle() {
    return relativeAngle(this.sun.longitude, this.moon.longitude);
  }

  get tithi() {
    const tithiVal = this.sunMoonAngle / (360 / 30);
    const sn = (this.moon.longitude + 360 - this.sun.longitude) % 360;
    if (this.hasIndianTime) {
      const tithiPercent = (tithiVal % 1) * 100;
      const tithiNum = Math.floor(tithiVal) + 1;
      const tithiRow = tithiValues.find(t => t.num === tithiNum);
      return {
        ...tithiRow,
        value: tithiVal,
        percent: tithiPercent,
        waxing: this.moonWaxing,
        overHalfLight: this.overHalfLight,
        phase: this.moonPhase,
      };
    } else {
      return {
        num: 0,
        lord: '',
        div: 0,
        percent: 0,
        value: 0,
        waxing: false,
        overHalfLight: false,
      };
    }
  }

  get yoga() {
    const numYogas = yogaValues.length;
    const yogaDeg = 360 / numYogas;
    const yogaVal = (this.sun.longitude + this.moon.longitude) / yogaDeg;
    const index = Math.floor(yogaVal) % numYogas;
    let yogaRow: any = {};
    if (index < numYogas) {
      yogaRow = yogaValues[index];
    }
    const percent = (yogaVal % 1) * 100;
    return {
      ...yogaRow,
      index,
      percent,
    };
  }

  get karana(): KaranaSet {
    const karanaVal = this.sunMoonAngle / (360 / 60);
    const percent = (karanaVal % 1) * 100;
    const num = Math.ceil(karanaVal);
    const row = karanaData.karanas.find(r => r.locations.includes(num));
    return new KaranaSet({
      num,
      ...row,
      percent,
    });
  }

  get hasIndianTime() {
    return this.indianTime instanceof Object;
  }

  localDate(fmt = 'euro1', timePrecision = 's') {
    const opts = {
      time: ['h', 'm', 's'].includes(timePrecision),
      seconds: timePrecision === 's',
    };
    return julToDateFormat(this.jd, this.tzOffset, fmt, opts);
  }

  localTime(timePrecision = 's') {
    const opts = {
      time: ['h', 'm', 's'].includes(timePrecision),
      seconds: timePrecision === 's',
    };
    return julToDateFormat(this.jd, this.tzOffset, '-', opts);
  }

  getObjects(ayanamshaNum: number): Array<ObjectMatch> {
    let items: Array<ObjectMatch> = [];
    if (this.objects.length > 0) {
      const row = this.objects.find(set => set.num === ayanamshaNum);
      if (row) {
        items = row.items;
      }
    }
    return items;
  }

  getSphutaValues(ayanamshaNum: number): Array<KeyNumValue> {
    let items: Array<KeyNumValue> = [];
    if (this.sphutas.length > 0) {
      const row = this.sphutas.find(set => set.num === ayanamshaNum);
      if (row) {
        items = row.items;
      }
    }
    return items;
  }

  get sphutaValues(): Array<KeyNumValue> {
    return this.getSphutaValues(this.ayanamshaNum);
  }

  getVara() {
    if (this.hasIndianTime) {
      const { dayStart, dayLength, dayBefore } = this.indianTime;
      const percent = ((this.jd - dayStart) / dayLength) * 100;
      const weekDay = weekDayNum(this.datetime, dayBefore);
      const weekDayIndex = weekDay % varaValues.length;
      if (weekDayIndex >= 0) {
        const varaRow = varaValues[weekDayIndex];
        if (varaRow) {
          return {
            ...varaRow,
            sunRise: this.sunRise,
            dayLength,
            percent,
          };
        }
      }
    }
  }

  get vara() {
    return this.getVara();
  }

  get hasVara() {
    return this.vara instanceof Object;
  }

  get hora() {
    if (this.hasIndianTime) {
      const { dayLength, isDayTime, dayBefore } = this.indianTime;
      const afterSunSet = this.jd > this.sunSet.jd;
      const startJd = dayBefore
        ? this.sunPrevSet.jd
        : afterSunSet
        ? this.sunSet.jd
        : this.sunRise.jd;
      const weekDay = weekDayNum(this.datetime, dayBefore);
      const horaRow = horaValues.find(row => row.day === weekDay);
      if (horaRow) {
        const numHoras = horaRow.hora.length;
        const horaLength = dayLength / numHoras;
        const difference = this.jd - startJd;
        const horaVal = difference / horaLength;
        const horaIndex = Math.floor(horaVal);
        const ruler = horaRow.hora[horaIndex];
        return {
          ...horaRow,
          ruler,
          index: horaIndex,
          weekDay,
          isDayTime,
        };
      }
    }
  }

  get hasHora() {
    return this.hora instanceof Object;
  }

  get kalam() {
    if (this.hasIndianTime) {
      const { dayBefore } = this.indianTime;
      const jd = this.jd;
      const weekDay = weekDayNum(this.datetime, dayBefore);
      const kalamDayRow = kalamData.values.find(row => row.day === weekDay);
      if (kalamDayRow) {
        const dayTimeStart = dayBefore ? this.sunPrevRise.jd : this.sunRise.jd;
        const dayTimeLength = dayBefore
          ? this.sunPrevSet.jd - dayTimeStart
          : this.sunSet.jd - dayTimeStart;
        const eighthJd = dayTimeLength / 8;
        const ranges = Object.entries(kalamData.dict).map(entry => {
          const [key, name] = entry;
          const range = calcJdPeriodRange(
            kalamDayRow[key],
            dayTimeStart,
            eighthJd,
          );
          const active = jd >= range.start && jd < range.end;
          const num = kalamDayRow[key];
          return { key, name, num, ...range, active };
        });
        return {
          dayTimeStart,
          dayTimeStartDt: julToISODate(dayTimeStart),
          day: kalamDayRow.day,
          ranges,
        };
      }
    }
  }

  get ghatiVal() {
    return this.hasIndianTime ? this.indianTime.progress * 60 : 0;
  }

  get progress() {
    return this.hasIndianTime ? this.indianTime.progress : 0;
  }

  get hasKalam() {
    return this.kalam instanceof Object;
  }

  get gmtOffset(): number {
    return this.tzOffset / 3600;
  }

  get tzText(): string {
    const abbr = shortTzAbbr(this.datetime, this.tz);
    let hoursOffset = '';
    if (/[A-Z]+/.test(abbr)) {
      hoursOffset = hourMinTz(this.tzOffset);
    }
    return [abbr, hoursOffset].join(' ').trim();
  }

  get corePlacenames() {
    const detailTypes = ['PSCD', 'STRT'];
    return this.placenames.length > 0
      ? this.placenames
          .filter(pl => detailTypes.includes(pl.type) === false)
          .map(pl => pl.name)
          .reverse()
          .join(', ')
      : '';
  }

  getTransitions() {
    return this.grahas.map(gr => {
      const { key, num, transitions } = gr;
      const rise = transitions.find(tr => tr.type === 'rise');
      const set = transitions.find(tr => tr.type === 'set');
      const mc = transitions.find(tr => tr.type === 'mc');
      const ic = transitions.find(tr => tr.type === 'ic');
      return new TransitionSet({
        num,
        key,
        rise,
        set,
        mc,
        ic,
      });
    });
  }

  getFullVargaSet() {
    const lagnaVarga = calcVargaSet(this.lagna, -1, 'as');
    const vargas = this.getVargaSet();
    return [lagnaVarga, ...vargas];
  }

  matchCaughadia(showDefault = true) {
    let cRows = [];
    if (this.hasIndianTime) {
      const { dayStart, dayLength, dayBefore, isDayTime } = this.indianTime;
      const jd = this.jd;
      const weekDay = weekDayNum(this.datetime, dayBefore);
      const weekDayIndex = weekDay % caughadiaData.days.length;
      const caughadiaDayRow = caughadiaData.days.find(
        row => row.day === weekDayIndex,
      );
      const useDayTime = showDefault ? isDayTime : !isDayTime;
      if (caughadiaDayRow) {
        const caughadiaStart = isDayTime
          ? caughadiaDayRow.dayStart
          : caughadiaDayRow.nightStart;
        const caughadiaEighths = Array.from(
          { length: 8 },
          (x, i) => ((caughadiaStart - 1 + i) % 7) + 1,
        );
        const periodLength = this.calcPeriodLength(useDayTime, dayBefore);
        const eighthJd = periodLength / 8;
        const periodStart = useDayTime
          ? dayStart
          : dayBefore
          ? this.sunPrevSet.jd
          : this.sunSet.jd;
        cRows = caughadiaEighths.map((num, ri) => {
          const seq = ri + 1;
          const cRow = caughadiaData.values.find(row => row.num === num);
          const increment = ri * eighthJd;
          const startJd = periodStart + increment;
          const active = jd >= startJd && jd < startJd + eighthJd;
          let hasKala = false;
          let kala = '';
          if (useDayTime) {
            const kalaRow = this.kalam.ranges.find(kr => kr.num === seq);
            if (kalaRow) {
              kala = kalaRow.key;
              hasKala = true;
            }
          }
          return {
            seq,
            ...cRow,
            startJd,
            startDt: julToISODate(startJd),
            dayTime: useDayTime,
            hasKala,
            kala,
            active,
          };
        });
      }
    }
    return cRows;
  }

  calcPeriodLength(useDayTime = true, dayBefore = false) {
    const after = this.sunRise.jd < this.sunSet.jd;
    const riseJd = after ? this.sunRise.jd : this.sunPrevRise.jd;
    const prevAfter = this.sunPrevRise.jd < this.sunPrevSet.jd;
    const prevRiseJd = prevAfter
      ? this.sunPrevRise.jd
      : this.sunPrevRise.jd - 1;
    const nextRiseJd =
      this.sunNextRise.jd - this.sunSet.jd > 1
        ? this.sunRise.jd
        : this.sunNextRise.jd;
    return useDayTime
      ? dayBefore
        ? this.sunPrevSet.jd - prevRiseJd
        : this.sunSet.jd - riseJd
      : dayBefore
      ? riseJd - this.sunPrevSet.jd
      : nextRiseJd - this.sunSet.jd;
  }

  matchLng = (key: any, retVal = -1) => {
    const graha = this.graha(key);
    if (graha) {
      return graha.longitude;
    }
    return retVal;
  };

  addBodyLngs(keys: Array<any>) {
    return keys.map(k => this.matchLng(k, 0)).reduce((a, b) => a + b, 0) % 360;
  }

  calcYogiSphuta() {
    const deg = this.addBodyLngs(['su', 'mo']);
    const supplement = 93 + 1 / 3; /// 93 1/3
    return (deg + supplement) % 360;
  }

  calcBijaSphuta() {
    return this.addBodyLngs(['su', 've', 'ju']);
  }

  calcKsetraSphuta() {
    return this.addBodyLngs(['mo', 'ma', 'ju']);
  }
}

export const applyAyanamsha = (
  chart: Chart,
  grahas: Array<Graha>,
  item: AyanamshaItem,
) => {
  const av = chart.setAyanamshaItem(item);
  grahas.forEach(gr => {
    gr.setAyanamshaItem(av);
  });
};

export class Tag {
  slug = '';
  name = '';
  constructor(inData = null) {
    if (inData instanceof Object) {
      const { slug, name } = inData;
      if (typeof slug === 'string') {
        this.slug = slug;
      }
      if (typeof name === 'string') {
        this.name = name;
      }
    }
  }
}

export class PairedChart {
  _id?: string;
  user: string;
  c1: Chart;
  c2: Chart;
  timespace: Chart;
  surfaceGeo: GeoLoc;
  surfaceAscendant: number;
  surfaceTzOffset: number;
  midMode = 'midpoint';
  relType = '';
  tags: Tag[];
  startYear = -1;
  endYear = -1;
  span = 0;
  notes = '';
  createdAt: Date;
  modifiedAt: Date;

  constructor(inData = null) {
    if (inData instanceof Object) {
      let timespace = null;
      Object.entries(inData).forEach(entry => {
        const [key, val] = entry;

        if (val instanceof Array) {
          switch (key) {
            case 'tags':
              this.tags = val.map(tg => new Tag(tg));
              break;
          }
        } else if (val instanceof Object) {
          switch (key) {
            case 'c1':
            case 'c2':
              this[key] = new Chart(val);
              break;
            case 'timespace':
              timespace = val;
              break;
            case 'surfaceGeo':
              this[key] = new GeoLoc(val);
              break;
          }
        } else if (typeof val === 'number') {
          switch (key) {
            case 'surfaceAscendant':
            case 'surfaceTzOffset':
            case 'startYear':
            case 'endYear':
            case 'span':
              this[key] = val;
              break;
          }
        } else if (typeof val === 'string') {
          switch (key) {
            case 'notes':
            case 'midMode':
            case 'relType':
            case '_id':
              this[key] = val;
              break;
            case 'createdAt':
            case 'modifiedAt':
              this[key] = new Date(val);
              break;
          }
        }
      });
      if (timespace instanceof Object) {
        this.timespace = new Chart(timespace, this.surfaceGeo);
      }
    }
  }
}

export const combineCharts = (
  c1: Chart,
  c2: Chart,
  ayanamsha: AyanamshaItem,
) => {
  const grahas = c1.grahas.map(gr => {
    const mb = c2.grahas.find(g2 => g2.key === gr.key);
    const midG = deepClone(gr);
    midG.lng = midLng(gr.lng, mb.lng);
    return midG;
  });

  const ascendant = midLng(c1.ascendant, c2.ascendant);
  const ayanamshas = c1.ayanamshas.map(ay1 => {
    const ay2 = c2.ayanamshas.find(a2 => a2.key === ay1.key);
    const aya = Object.assign({}, ay1);
    if (ay2) {
      aya.value = (ay1.value + ay2.value) / 2;
    }
    return aya;
  });
  const upagrahas = c1.upagrahas.map(up1 => {
    const up2 = c2.upagrahas.find(u2 => u2.key === up1.key);
    const upa = Object.assign({}, up1);
    if (up2) {
      upa.value = midLng(up1.value, up2.value);
    }
    return upa;
  });
  const sphutas = c1.sphutas.map(ss1 => {
    const ss2 = c2.sphutas.find(s1 => s1.num === ss1.num);
    const ss = {
      num: ss1.num,
      items: [],
    };
    if (ss2) {
      ss.items = ss1.items.map(sp1 => {
        const sp2 = ss2.items.find(s2 => s2.key === sp1.key);
        const sp = Object.assign({}, sp1);
        if (sp2) {
          sp.value = midLng(sp1.value, sp2.value);
        }
      });
    }
    return ss;
  });
  const jd = (c1.jd + c2.jd) / 2;
  const houses = c1.houses.map(hs => {
    const house = Object.assign({}, hs);
    const hs2 = c2.houses.find(h => h.system === hs.system);
    switch (hs.system) {
      case 'P':
        house.values = hs.values.map((v, i) => {
          return midLng(v, hs2.values[i]);
        });
        break;
      case 'W':
        house.values = [Math.floor(ascendant / 30) * 30];
        break;
    }
  });
  const chart = {
    jd,
    ascendant,
    houses,
    grahas,
    ayanamshas,
    upagrahas,
    sphutas,
  };
  const nc = new Chart(chart);
  applyAyanamsha(nc, nc.bodies, ayanamsha);
  return nc;
};

export const extractSurfaceData = (paired: any) => {
  let surface = null;
  if (paired instanceof Object) {
    const { surfaceGeo, surfaceAscendant, surfaceTzOffset } = paired;
    if (surfaceGeo instanceof Object) {
      const { lat, lng } = surfaceGeo;
      surface = {
        geo: { lng, lat },
        ascendant: surfaceAscendant,
        tzOffset: surfaceTzOffset,
      };
    }
  }
  return surface;
};