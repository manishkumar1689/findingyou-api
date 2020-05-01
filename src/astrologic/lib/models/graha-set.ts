import { isNumeric, notEmptyString, inRange } from '../../../lib/validators';
import { BaseObject } from './base-object';
import { mapToObject } from '../mappers';
import {
  mapSignToHouse,
  calcAllVargas,
  calcVargaSet,
  calcInclusiveTwelfths,
  matchHouseNum,
} from '../math-funcs';
import { matchNakshatra } from '../core';
import { TransitionData } from '../transitions';
import nakshatraValues from '../settings/nakshatra-values';
import charakarakaValues from '../settings/charakaraka-values';
import grahaValues from '../settings/graha-values';
import { Nakshatra } from './nakshatra';
import { Relationship } from './relationship';
import maitriData from '../settings/maitri-data';
import { GeoPos } from '../../interfaces/geo-pos';
import { BodyTransition } from 'src/astrologic/interfaces/body-transition';
import { HouseSet } from './house-set';

interface VariantGroup {
  num: number;
  sign: number;
  house: number;
  nakshatra: number;
  relationship: string;
  charaKaraka: number;
}

interface withinSignBody {
  key: string;
  deg: number;
  num?: number;
  ck?: string;
}

export class Graha extends BaseObject {
  num: number = -1;
  name: string = '';
  key: string = '';
  ref: string = '';
  altRef: string = '';
  jyNum: number = -1;
  icon: string = '';
  bhuta: string = '';
  guna: string = '';
  caste: string = '';
  dhatu: string = '';
  dosha: string = '';
  lng: number = 0;
  lat: number = 0;
  topo: GeoPos = {
    lng: 0,
    lat: 0,
  };
  distance: number = 1;
  declination?: number = null;
  lngSpeed: number = 0;
  latSpeed: number = 0;
  dstSpeed: number = 0;
  calc: string = '';
  friends = [];
  neutral = [];
  enemies = [];
  relationship = new Relationship();
  mulaTrikon: -1;
  mulaTrikonDegrees: 0;
  exalted = 0;
  exaltedDegree = 0;
  debilitated = 0;
  ownSign = [];
  charaKarakaMode = 'standard';
  charaKaraka = 0;
  ckNum = 0;
  house = 0;
  ownHouses = [];
  transitions: Array<BodyTransition> = [];
  variants?: Array<VariantGroup> = [];

  constructor(body: any = null) {
    super();
    if (body instanceof Object) {
      Object.entries(body).forEach(entry => {
        const [key, value] = entry;
        switch (key) {
          case 'longitude':
          case 'lon':
            if (typeof value === 'number') {
              this.lng = value;
            }
            break;
          case 'latitude':
          case 'lat':
            if (typeof value === 'number') {
              this.lat = value;
            }
            break;
          case 'longitudeSpeed':
            if (typeof value === 'number') {
              this.lngSpeed = value;
            }
            break;
          case 'latitudeSpeed':
            if (typeof value === 'number') {
              this.latSpeed = value;
            }
            break;
          case 'distanceSpeed':
            if (typeof value === 'number') {
              this.dstSpeed = value;
            }
            break;
          case 'sign':
          case 'nakshatra':
            break;
          default:
            this[key] = value;
            break;
        }
      });
    }
  }

  get sign() {
    return Math.floor(this.lng / 30) + 1;
  }

  get nakshatra(): Nakshatra {
    return new Nakshatra(matchNakshatra(this.lng));
  }

  get longitude() {
    return this.lng;
  }

  get latitude() {
    return this.lat;
  }

  get longitudeSpeed() {
    return this.lngSpeed;
  }

  get latitudeSpeed() {
    return this.latSpeed;
  }

  get distanceSpeed() {
    return this.dstSpeed;
  }

  get nakshatraDegrees() {
    return 360 / nakshatraValues.length;
  }

  get padaDegrees() {
    return this.nakshatraDegrees / 4;
  }

  get ruler(): string {
    let str = '';
    const rk = grahaValues.find(b => b.ownSign.includes(this.sign));
    if (rk) {
      str = rk.key;
    }
    return str;
  }

  get natural(): string {
    let natural = '';
    if (this.ruler.length > 1) {
      if (this.friends.includes(this.ruler)) {
        natural = 'friend';
      } else if (this.neutral.includes(this.ruler)) {
        natural = 'neutral';
      } else if (this.enemies.includes(this.ruler)) {
        natural = 'enemy';
      }
    }
    return natural;
  }

  /*
Calculate pachanga values for a body 
@parma body:Object
*/
  get padaFrac() {
    return this.nakshatra.within / this.padaDegrees;
  }

  get padaIndex() {
    return Math.floor(this.padaFrac);
  }

  get padaNum() {
    return this.padaIndex + 1;
  }

  get percent() {
    return this.padaFrac * 25;
  }

  get akshara() {
    return this.nakshatra.aksharas[this.padaIndex];
  }

  get withinSign() {
    return this.lng % 30;
  }
  get isOwnSign(): boolean {
    return this.ownSign.indexOf(this.sign) >= 0;
  }
  get isMulaTrikon(): boolean {
    return (
      this.sign === this.mulaTrikon &&
      inRange(this.withinSign, this.mulaTrikonDegrees)
    );
  }

  get isExalted(): boolean {
    return (
      this.sign === this.exalted &&
      inRange(this.withinSign, [0, this.exaltedDegree + 1])
    );
  }

  get isDebilitated(): boolean {
    return (
      this.sign === this.debilitated &&
      inRange(this.withinSign, [0, this.exaltedDegree + 1])
    );
  }

  setTransitions(transitions: Array<BodyTransition> = []) {
    this.transitions = transitions;
  }

  calcVargas() {
    return calcAllVargas(this.lng);
  }

  hasRuler = () => notEmptyString(this.ruler, 1);
}

/*
Set of grahas with extra methods to add houses and other attributes that require comparisons with other grahas
*/
export class GrahaSet {
  jd = null;
  bodies: Array<Graha> = [];

  constructor(bodyData: any = null) {
    if (bodyData instanceof Object) {
      const { jd, bodies } = bodyData;
      if (jd) {
        this.jd = parseFloat(jd);
      }
      if (bodies instanceof Array) {
        this.bodies = bodies.map(b => new Graha(b));
        this.bodies.sort((a, b) => a.jyNum - b.jyNum);
      }
    }
  }

  get(key: any): Graha {
    let matchFunc = b => false;
    if (isNumeric(key)) {
      matchFunc = b => b.num === parseInt(key);
    } else if (notEmptyString(key, 2)) {
      if (key.length === 2) {
        matchFunc = b => b.key === key;
      } else {
        matchFunc = b => b.name.toLowerCase() === key.toLowerCase;
      }
    }
    const body = this.bodies.find(matchFunc);
    if (body) {
      return body;
    } else {
      return new Graha();
    }
  }

  mergeHouseData(houseData: HouseSet) {
    this.bodies = this.bodies.map(b => {
      b.house = matchHouseNum(b.longitude, houseData.houses);
      if (b.mulaTrikon) {
        if (b.ownSign.indexOf(b.mulaTrikon) > 0) {
          b.ownSign.reverse();
        }
      }
      b.ownHouses = b.ownSign.map(sign =>
        mapSignToHouse(sign, houseData.houses),
      );
      return b;
    });
    return this;
  }

  getBodies = () => this.bodies;

  getRuler(key: string) {
    const body = this.get(key);
    let rulerKey = '';
    if (body) {
      rulerKey = body.ruler;
    }
    return this.get(rulerKey);
  }

  sun = () => this.get('su');

  moon = () => this.get('mo');

  mercury = () => this.get('me');

  venus = () => this.get('ve');

  mars = () => this.get('ma');

  jupiter = () => this.get('ju');

  saturn = () => this.get('sa');

  ketu = () => this.get('ke');

  rahu = () => this.get('ra');

  matchValues() {
    this.matchRelationships();
    this.applyCharaKarakas();
  }

  longitudes() {
    let map = new Map();
    this.bodies.forEach(b => {
      map.set(b.key, b.lng);
    });
    return mapToObject(map);
  }

  matchLng = (key: any, retVal = -1) => {
    const body = this.get(key);
    if (body) {
      return body.longitude;
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

  getVargaSet() {
    return this.bodies.map(b => calcVargaSet(b.lng, b.num, b.key));
  }

  getFullVargaSet(lagnaLng: number) {
    const lagnaVarga = calcVargaSet(lagnaLng, -1, 'as');
    const vargas = this.getVargaSet();
    return [lagnaVarga, ...vargas];
  }

  mergeTransitions(transitionSets: Array<TransitionData> = []) {
    const keys = ['set', 'rise', 'mc', 'ic'];
    transitionSets.forEach(trSet => {
      const trKeys = Object.keys(trSet);
      const trs = keys
        .filter(k => trKeys.includes(k))
        .map(key => {
          const trRow = trSet[key];
          const { jd, dt } = trRow;
          return { type: key, jd, datetime: dt };
        });
      this.get(trSet.num).setTransitions(trs);
    });
  }

  mergeSunTransitions(transitions: Array<BodyTransition>) {
    const sun = this.sun();
    const currKeys = sun.transitions.map(tr => tr.type);
    transitions.forEach(bt => {
      if (!currKeys.includes(bt.type)) {
        sun.transitions.push(bt);
      }
    });
  }

  matchRelationships() {
    this.bodies = this.bodies.map(b => {
      const rulerSign = this.get(b.ruler).sign;

      const numSteps = calcInclusiveTwelfths(b.sign, rulerSign);
      const isTempFriend = maitriData.temporary.friend.includes(numSteps);
      const isTempEnemy = maitriData.temporary.enemy.includes(numSteps);
      b.relationship.natural = b.natural;
      b.relationship.temporary = isTempFriend
        ? 'friend'
        : isTempEnemy
        ? 'enemy'
        : 'neutral';
      const { natural, temporary } = b.relationship;
      const compoundMatches = Object.entries(maitriData.compound).map(entry => {
        const [key, vals] = entry;
        return {
          key,
          values: vals.map(
            cv => cv.natural === natural && cv.temporary === temporary,
          ),
        };
      });

      const compoundKeys = compoundMatches
        .filter(cm => cm.values.some(v => v))
        .map(cm => cm.key);
      b.relationship.compound =
        compoundKeys.length > 0
          ? compoundKeys[0]
          : b.isOwnSign
          ? 'ownSign'
          : '';
      return b;
    });
  }

  applyCharaKarakas() {
    if (this.bodies.some(b => isNumeric(b.withinSign))) {
      const withinSignBodies = this.calcCharaKaraka();
      this.mergeCharaKarakaToBodies(withinSignBodies);
    }
  }

  /*
  Add charaKara data
  @return Array<Object>
  */
  calcCharaKaraka() {
    const validModes = ['forward', 'reverse'];
    const withinSignBodies = this.bodies
      .filter(b => validModes.includes(b.charaKarakaMode))
      .map(b => {
        const deg =
          b.charaKarakaMode === 'reverse' ? 30 - b.withinSign : b.withinSign;
        return {
          key: b.key,
          deg,
        };
      });
    withinSignBodies.sort((a, b) => b.deg - a.deg);
    return withinSignBodies.map((b, index) => {
      const ck =
        index < charakarakaValues.length ? charakarakaValues[index] : '';
      const num = index + 1;
      return { ...b, ck, num };
    });
  }

  mergeCharaKarakaToBodies(withinSignBodies: Array<any>) {
    this.bodies = this.bodies.map(b => {
      const wb = withinSignBodies.find(sb => sb.key === b.key);
      if (wb) {
        b.charaKaraka = wb.num;
      }
      return b;
    });
  }
}
