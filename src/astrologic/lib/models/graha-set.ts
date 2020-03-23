import { isNumeric, notEmptyString } from '../validators';
import { BaseObject } from './base-object';
import { mapToObject } from '../mappers';
import {
  longitudeMatchesHouseIndex,
  mapSignToHouse,
  calcAllVargas,
  calcVargaSet,
  calcInclusiveDistance,
  calcInclusiveTwelfths,
  calcInclusiveNakshatras,
} from '../math-funcs';
import nakshatraValues from '../settings/nakshatra-values';
import { Nakshatra } from './nakshatra';
import { Relationship } from './relationship';
import maitriData from '../settings/maitri-data';

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
  longitude: number = 0;
  latitude: number = 0;
  distance: number = 1;
  longitudeSpeed: number = 0;
  latitudeSpeed: number = 0;
  distanceSpeed: number = 0;
  rflag: number = 0;
  sign: number = 0;
  calc: string = '';
  nakshatra = new Nakshatra();
  ruler = '';
  friends = [];
  neutral = [];
  enemies = [];
  relationship = new Relationship();
  withinSign = 0;
  isOwnSign = false;
  mulaTrikon: -1;
  isMulaTrikon = false;
  mulaTrikonDegrees: 0;
  exalted = false;
  exaltedDegree = 0;
  debilitated = false;
  ownSign = [];
  charaKarakaMode = 'standard';
  charaKaraka = '';
  house = 11;
  ownHouses = [];
  padaNum = 0;
  percent = 0;
  akshara = null;

  constructor(body: any = null) {
    super();
    if (body instanceof Object) {
      Object.entries(body).forEach(entry => {
        const [key, value] = entry;
        switch (key) {
          case 'nakshatra':
            this.nakshatra = new Nakshatra(value);
            break;
          case 'relationship':
            this.relationship = new Relationship(value);
            break;
          default:
            this[key] = value;
            break;
        }
      });
      if (this.nakshatra instanceof Object) {
        this.applyPanchanga();
      }
    }
  }

  /*
Calculate pachanga values for a body 
@parma body:Object
*/
  applyPanchanga = () => {
    this.nakshatra.degrees = 360 / nakshatraValues.length;
    const padaDegrees = this.nakshatra.degrees / 4;
    this.nakshatra.within = this.longitude % this.nakshatra.degrees;
    const padaFrac = this.nakshatra.within / padaDegrees;
    const padaIndex = Math.floor(padaFrac);
    this.padaNum = padaIndex + 1;
    this.percent = padaFrac * 25;
    this.akshara = this.nakshatra.aksharas[padaIndex];
    return this;
  };

  calcVargas() {
    return calcAllVargas(this.longitude);
  }

  hasRuler = () => notEmptyString(this.ruler, 1);
}

export class GrahaSet {
  jd = null;
  bodies: Array<Graha> = [];

  constructor(bodyData) {
    if (bodyData instanceof Object) {
      const { jd, bodies } = bodyData;
      if (jd) {
        this.jd = parseFloat(jd);
      }
      if (bodies instanceof Array) {
        this.bodies = bodies.map(b => new Graha(b));
      }
    }
  }

  get(key) {
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

  mergeHouseData(houseData) {
    this.bodies = this.bodies.map(b => {
      b.house =
        houseData.houses.findIndex(deg =>
          longitudeMatchesHouseIndex(deg, b.longitude),
        ) + 1;
      b.ownHouses = b.ownSign.map(s =>
        houseData.houses.findIndex(deg => mapSignToHouse(deg, s)),
      );
      return b;
    });
    return this;
  }

  getBodies = () => this.bodies;

  getRuler(key) {
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

  longitudes() {
    let map = new Map();
    this.bodies.forEach(b => {
      map.set(b.key, b.longitude);
    });
    return mapToObject(map);
  }

  matchLng = (key, retVal = -1) => {
    const body = this.get(key);
    if (body) {
      return body.longitude;
    }
    return retVal;
  };

  addBodyLngs(keys) {
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
    return this.bodies.map(b => calcVargaSet(b.longitude, b.num, b.key));
  }

  getFullVargaSet(lagnaLng) {
    const lagnaVarga = calcVargaSet(lagnaLng, -1, 'as');
    const vargas = this.getVargaSet();
    return [lagnaVarga, ...vargas];
  }

  matchRelationships() {
    this.bodies = this.bodies.map(b => {
      /* const mapRelation = obRef => {
        const ob = this.bodies.find(b2 => b2.key === obRef);
        let valid = false;
        if (ob) {
          valid = ob.sign === b.sign;
        }
        return valid;
      };
      b.friends = b.friends.filter(mapRelation);
      b.neutral = b.neutral.filter(mapRelation);
      b.enemies = b.enemies.filter(mapRelation); */
      const rulerSign = this.get(b.ruler).sign;

      const numSteps = calcInclusiveTwelfths(b.sign, rulerSign);
      const isTempFriend = maitriData.temporary.friend.includes(numSteps);
      const isTempEnemy = maitriData.temporary.enemy.includes(numSteps);
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
      b.relationship.compound = compoundKeys.length > 0 ? compoundKeys[0] : '';
      return b;
    });
  }
}
