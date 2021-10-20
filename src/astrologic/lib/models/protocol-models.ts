import { KeyNameMax } from '../interfaces';
import { inRange, isNumeric, notEmptyString } from '../../../lib/validators';
import { smartCastFloat } from '../../../lib/converters';
import { contextTypes } from '../settings/compatibility-sets';
import { calcOrb, calcAllAspectRanges } from '../calc-orbs';
import { subtractLng360, addLng360, calcDist360, nakshatra28, numbersToNakshatraDegreeRanges } from '../helpers';
import ayanamshaValues from '../settings/ayanamsha-values';
import { BmMatchRow, SignHouse } from '../../interfaces/sign-house';
import { calcInclusiveSignPositions, calcInclusiveTwelfths } from '../math-funcs';
import { Chart, filterBmMatchRow, matchGrahaEquivalent, matchSignNums, PairedChart } from './chart';
import { currentJulianDay } from '../julian-date';
import { assignDashaBalances, DashaBalance, matchCurrentDashaLord } from './dasha-set';
import { matchNextTransitAtLng, matchNextTransitAtLngRanges, RangeSet } from '../astro-motion';
import { GeoPos } from '../../interfaces/geo-pos';
import { calcNextAscendantLng } from '../calc-ascendant';
import { buildFunctionalBMMap, naturalBenefics, naturalMalefics } from '../settings/graha-values';
import { coreIndianGrahaKeys } from './graha-set';
import { mapRelationships } from '../map-relationships';
import { matchKotaCakraSection } from '../settings/nakshatra-values';
import { panchaPakshiDayNightSet } from '../settings/pancha-pakshi';

export interface KeyNumVal {
  key: string;
  value: number;
}

export interface KeyOrbs {
  key: string;
  orbs: KeyNumVal[];
}

export interface KeyNumPair {
  key: string;
  pair: number[];
}

export const matchContextType = (context: string) => {
  const matched = contextTypes.find(ct => ct.key === context);
  return new ContextType(matched);
}

export class SectionScore {
  type = '';
  scores: Array<KeyNumPair> = [];
  percent = 0;

  constructor(inData = null) {
    if (inData instanceof Object) {
      if (typeof inData.type === 'string') {
        this.type = inData.type;
      }
      if (typeof inData.percent === 'number') {
        this.percent = inData.percent;
      }
    }
  }

  addScores(scores: Array<KeyNumPair> = []) {
    if (scores instanceof Array) {
      scores.forEach(sp => {
        const currSpIndex = this.scores.findIndex(sc => sc.key === sp.key);

        let currPair = [0, 0];
        if (currSpIndex >= 0) {
          currPair = this.scores[currSpIndex].pair;
          this.scores[currSpIndex].pair = [
            currPair[0] + sp.pair[0],
            currPair[1] + sp.pair[1],
          ];
        } else {
          this.scores.push(sp);
        }
      });
    }
  }
}

export const funcBmMap = (chart: Chart, build = true): Map<string, Array<string>> => {
  const hsRows = build ? chart.buildSignHouseRows() : [];
  return build
    ? buildFunctionalBMMap(coreIndianGrahaKeys, hsRows)
    : new Map();
}

export const matchBmGrahaKeys = (key: string, condition: Condition, chart: Chart) => {

  if (key.length === 2) {
    return [key];
  } else {
    if (condition.isNatural) {
      switch (key) {
        case 'benefics':
          return naturalBenefics;
        case 'malefics':
          return naturalMalefics;
        default:
          return [];
      }
    } else if (condition.isFunctional) {
      const bm = funcBmMap(chart);
      switch (key) {
        case 'benefics':
          return bm.get('b');
        case 'malefics':
          return bm.get('m');
        default:
          return bm.get('n');
      }
    }
  }
  return [];
}

export const matchDrishti = (grahaKey: string, signNum = 0, drishtiMap: Map<string, number[]> = new Map()) => {
  const aspects = drishtiMap.get(grahaKey);
  if (aspects instanceof Array && signNum > 0 && signNum <= 12) {
    const index = signNum - 1;
    return aspects[index];
  }
  return 0;
}

export const matchRashiDrishti = (sign1 = 0, sign2 = 0, drishtiMap: Map<number, number[]> = new Map()) => {
  const aspects = drishtiMap.get(sign1);
  if (aspects instanceof Array && sign2 > 0 && sign2 <= 12) {
    return aspects.indexOf(sign2);
  }
  return 0;
}

export class Condition {
  isTrue = true;
  fromMode = '';
  toMode = '';
  c1Key = '';
  c2Key = '';
  varga1 = 1;
  varga2 = 1;
  context = '';
  aspectQuality = '';
  orb = -1;
  lordRev = false; // reverse lordship order from A => B to B <= A
  isSet = false;
  kutaRange = [-1, -1];
  outcome = false;

  constructor(inData = null) {
    if (inData instanceof Object) {
      Object.entries(inData).forEach(entry => {
        const [key, val] = entry;
        switch (typeof val) {
          case 'string':
            switch (key) {
              case 'fromMode':
              case 'toMode':
              case 'c1Key':
              case 'c2Key':
              case 'context':
              case 'aspectQuality':
                this[key] = val;
                break;
            }
            break;
          case 'number':
            switch (key) {
              case 'varga1':
              case 'varga2':
              case 'orb':
                this[key] = val;
                break;
            }
            break;
          case 'boolean':
            switch (key) {
              case 'lordRev':
              case 'isTrue':
                this[key] = val;
                break;
            }
            break;
        }
        if (key === 'kutaRange' && val instanceof Array && val.length === 2) {
          this.kutaRange = val;
        }
      });
    }
  }

  // may match multiple objects
  mayMatchMultiple(num = 1) {
    const obj = num === 2 ? this.object2 : this.object1;
    switch (obj.type) {
      case 'num_grahas':
        return true;
      default:
        return false;
    }
  }

  get fromFirstHouseStructure() {
    return this.object2.isLordship && !this.lordRev;
  }

  get stateCompare() {
    return this.contextType.stateCompare;
  }

  get isDignityBala() {
    return this.contextType.isDignityBala;
  }

  get bothSingleGrahaMatch() {
    return !this.matchesMultiple1 && !this.matchesMultiple2;
  }

  get matchesMultiple1() {
    return this.mayMatchMultiple(1);
  }

  get matchesMultiple2() {
    return this.mayMatchMultiple(2);
  }

  get singleMode() {
    return this.fromMode === 'single';
  }

  get contextType() {
    return matchContextType(this.context)
  }

  get object1() {
    return new ObjectType(this.c1Key);
  }

  get object2() {
    return new ObjectType(this.c2Key);
  }

  get compareGrahas() {
    return this.object1.type === 'graha' && this.object2.type === 'graha';
  }

  get hasContext() {
    return this.context.length > 1 && this.context !== '-';
  }

  get isDeclination() {
    return this.contextType.isDeclination;
  }

  get sameSign() {
    return this.contextType.sameSign;
  }

  get matchBirthSign() {
    return this.c1Key.endsWith("birth_asc")
  }

  get usesMidChart() {
    const midModes = ['midpoint', 'timespace'];
    return (
      [this.fromMode, this.toMode].filter(md => midModes.includes(md)).length >
      0
    );
  }

  get isDivisional() {
    return this.contextType.isDivisional;
  }

  get isIndianAspect() {
    return this.contextType.isIndianAspect;
  }

  get isDrishtiAspect() {
    return this.contextType.isDrishtiAspect;
  }

  get isRashiDrishti() {
    return this.contextType.isRashiDrishti;
  }

  get isKartariYoga() {
    return this.contextType.isKartariYoga;
  }

  get isYuti() {
    return this.contextType.isYuti;
  }

  get isNeutral() {
    switch (this.aspectQuality) {
      case 'applying':
      case 'separating':
        return false;
      default:
        return true;
    }
  }

  get mayHaveAspectQuality() {
    return this.object1.mayBeGraha && this.object2.mayBeGraha;
  }

  get isSeparating() {
    switch (this.aspectQuality) {
      case 'separating':
        return true;
      default:
        return false;
    }
  }

  get isApplying() {
    switch (this.aspectQuality) {
      case 'applying':
        return true;
      default:
        return false;
    }
  }

  get isAspectGroup() {
    switch (this.context) {
      case 'soft_aspect':
      case 'hard_aspect':
      case 'any_aspect':
        return true;
      default:
        return false;
    }
  }

  get matchedAspects() {
    switch (this.context) {
      case 'soft_aspect':
        return ['trine', 'sextile', 'quincunx'];
      case 'hard_aspect':
        return ['opposition', 'square', 'conjunction'];
      case 'any_aspect':
        return [
          'opposition',
          'square',
          'trine',
          'sextile',
          'conjunction',
          'quincunx',
        ];
      default:
        return this.contextType.isAspect ? [this.context] : [];
    }
  }

  get isLongAspect() {
    return this.contextType.isAspect && !this.contextType.isDeclination;
  }

  matchedNum(target = 1) {
    const refKey = target === 1 ? this.c1Key : this.c2Key;
    const refVal = refKey.split('_').pop();
    return isNumeric(refVal) ? parseInt(refVal) : -1;
  }

  get c1Num() {
    return this.matchedNum(1);
  }

  get c2Num() {
    return this.matchedNum(2);
  }

  get isFunctional() {
    return this.c1Key.startsWith('funcbm_');
  }

  get isNatural() {
    return this.c1Key.startsWith('natbm_') || this.context.endsWith('kartari_yoga');
  }

  get sendsDrishti() {
    return this.contextType.sendsDrishti;
  }

  get receivesDrishti() {
    return this.contextType.receivesDrishti;
  }

  get mutualDrishti() {
    return this.contextType.mutualDrishti;
  }

  setOutcome(matched: boolean) {
    this.outcome = matched;
  }

  toJson() {
    return {
      isTrue: this.isTrue,
      fromMode: this.fromMode,
      toMode: this.toMode,
      c1Key: this.c1Key,
      c2Key: this.c2Key,
      varga1: this.varga1,
      varga2: this.varga2,
      context: this.context,
      aspectQuality: this.aspectQuality,
      lordRev: this.lordRev,
      kutaRange: this.kutaRange[0] >= 0 ? this.kutaRange : [],
      outcome: this.outcome,
    };
  }
}

export class ConditionSet {
  conditionRefs: Array<ConditionRef> = [];
  operator = 'and';
  min = 0; // min. that must be true
  isSet = true;

  constructor(conditionRef = null, operatorRef = 'and', min = 0) {
    const isConditionClass = this.isValidConditionReference(conditionRef);

    if (!isConditionClass && conditionRef instanceof Array) {
      this.operator = operatorRef;
      if (conditionRef instanceof Array) {
        const cr = conditionRef
          .map(this.mapConditionRefs)
          .filter(this.isValidConditionReference);
        this.conditionRefs = cr;
      }
    } else {
      if (isConditionClass) {
        this.conditionRefs = [conditionRef];
      } else if (conditionRef instanceof Array) {
        this.conditionRefs = conditionRef.filter(
          this.isValidConditionReference,
        );
      }
    }
    this.operator = operatorRef;
    if (min > 0 && operatorRef === 'min') {
      this.min = min;
    }
  }

  add(condRef: Condition | ConditionSet, operator = '', min = 0) {
    this.conditionRefs.push(condRef);
    if (operator.length > 1) {
      this.operator = operator;
    }
    if (min > 0 && operator === 'min') {
      this.min = min;
    }
  }

  update(index = 0, condRef: Condition | ConditionSet, operator = '') {
    if (index >= 0 && index < this.length) {
      this.conditionRefs[index] = condRef;
    }
    if (operator.length > 1) {
      this.operator = operator;
    }
  }

  mapConditionRefs(condRef = null) {
    if (condRef instanceof Object) {
      const { isSet } = condRef;
      if (isSet) {
        const { conditionRefs, operator, min } = condRef;
        if (conditionRefs instanceof Array) {
          return new ConditionSet(conditionRefs, operator, min);
        }
      } else {
        return new Condition(condRef);
      }
    }
  }

  hasConditions() {
    return this.conditionRefs.length > 0;
  }

  isValidConditionReference(condRef = null) {
    return condRef instanceof Condition || condRef instanceof ConditionSet;
  }

  get length() {
    return this.conditionRefs.length;
  }

  get lastIndex() {
    return this.getLastIndex();
  }

  getLastIndex() {
    return this.conditionRefs.length - 1;
  }

  toJson() {
    return {
      operator: this.operator,
      min: this.min,
      numChildren: this.conditionRefs.length,
      conditionRefs: this.conditionRefs.map(cr => cr.toJson()),
    };
  }
}

type ConditionRef = Condition | ConditionSet;

class Score {
  key = 'emotional';
  value = 0;

  constructor(key = 'emotional', value = 0) {
    if (typeof key === 'string') {
      this.key = key;
    }
    if (typeof value === 'number') {
      this.value = value;
    }
  }
}

export class RuleSet {
  name = '';

  notes = '';

  conditionSet: ConditionSet = new ConditionSet();

  scores: Array<Score> = [];

  constructor(inData = null) {
    if (inData instanceof Object) {
      const { name, notes, scores, conditionSet } = inData;
      if (typeof name === 'string') {
        this.name = name;
      }
      if (typeof notes === 'string') {
        this.notes = notes;
      }
      if (scores instanceof Array) {
        this.scores = scores
          .filter(sc => sc instanceof Object)
          .map(sc => {
            const { key, value } = sc;
            return new Score(key, value);
          });
      }

      if (conditionSet instanceof Object) {
        const { conditionRefs, operator } = conditionSet;
        this.conditionSet = new ConditionSet(conditionRefs, operator);
      }
    }
  }

  setScores(scoreSet = null) {
    if (scoreSet instanceof Object) {
      this.scores = Object.entries(scoreSet).map(entry => {
        const [key, val] = entry;
        const value =
          typeof val === 'number'
            ? val
            : typeof val === 'string'
            ? parseFloat(val)
            : 0;
        return new Score(key, value);
      });
    }
  }

  matchConditionSet(parents: Array<number> = []) {
    let cs = this.conditionSet;
    if (parents instanceof Array) {
      if (parents.length > 1) {
        parents.slice(1, parents.length).forEach(itemIndex => {
          if (itemIndex < cs.conditionRefs.length) {
            const inner = cs.conditionRefs[itemIndex];
            if (inner instanceof ConditionSet) {
              cs = inner;
            }
          }
        });
      }
    }
    return cs;
  }

  getScore(key: string) {
    let value = 0;
    const score = this.scores.find(sc => sc.key === key);
    if (score instanceof Score) {
      value = score.value;
    }
    return value;
  }

  get hasConditions() {
    return this.conditionSet.conditionRefs.length > 0;
  }
}

export class PredictiveRule extends RuleSet {
  
  type = "";
  text = "";
  userId = "";

  constructor(inData = null) {
    super(inData);
    if (inData instanceof Object) {
      const {type, text, user} = inData;
      if (typeof type === 'string') {
        this.type = type;
      }
      if (typeof text === 'string') {
        this.text = text;
      }
      if (typeof user === 'string') {
        this.userId = user;
      } else if (user instanceof Object) {
        this.userId = user.toString();
      }
    }
  }
}

export interface SimpleUser {
  _id: string;
  identifier: string;
  nickName: string;
  fullName: string;
  active: boolean;
  roles: string[];
}

export interface ProtocolSettings {
  kuta: Map<string, any>;
  grahaDrishti: Map<string, number[]>;
  rashiDrishti: Map<number, number[]>;
}

const defaultSimpleUser = {
  _id: '',
  identifier: '',
  nickName: '',
  fullName: '',
  active: false,
  roles: [],
};

export class RulesCollection {
  type = '';
  percent: number;
  rules: Array<RuleSet> = [];

  constructor(inData = null) {
    if (inData instanceof Object) {
      const { _id, type, rules, percent } = inData;
      if (notEmptyString(type)) {
        this.type = type;
      }
      if (isNumeric(percent)) {
        this.percent =
          typeof percent === 'number' ? percent : parseFloat(percent);
      }
      if (rules instanceof Object) {
        this.rules = rules
          .filter(r => r instanceof Object)
          .map(r => new RuleSet(r));
      }
    }
  }

  getRule(index: number) {
    if (index >= 0 && index < this.rules.length) {
      return this.rules[index];
    }
  }

  get length() {
    return this.rules.length;
  }
}

export class Protocol {
  _id?: string;
  user: string; // user id
  name = '';
  notes = '';
  categories: Array<KeyNameMax> = [];
  collections: Array<RulesCollection> = [];
  settings: Map<string, any> = new Map();
  userRecord: SimpleUser = defaultSimpleUser;
  kutaData: Map<string, any> = new Map();
  grahaDrishtiMap: Map<string, number[]> = new Map();
  rashiDrishtiMap: Map<number, number[]> = new Map();

  constructor(inData = null, settings: ProtocolSettings) {
    if (inData instanceof Object) {
      const {
        _id,
        user,
        name,
        notes,
        categories,
        collections,
        settings,
        createdAt,
        modifiedAt,
      } = inData;
      if (notEmptyString(_id, 16)) {
        this._id = _id;
      }
      if (notEmptyString(user, 16)) {
        this.user = user;
      } else if (user instanceof Object) {
        const keys = Object.keys(user);
        if (
          keys.includes('_id') &&
          keys.includes('identifier') &&
          keys.includes('nickName') &&
          keys.includes('roles')
        ) {
          this.user = user._id;
          this.userRecord = user;
        }
      }
      if (notEmptyString(name)) {
        this.name = name;
      }
      if (notEmptyString(notes)) {
        this.notes = notes;
      }

      if (categories instanceof Array) {
        this.categories = categories
          .filter(c => c instanceof Object)
          .filter(c => {
            const rawKeys = Object.keys(c);
            const keys = rawKeys.includes('_doc')
              ? Object.keys(c.toObject())
              : [];
            return keys.includes('key') && keys.includes('name');
          })
          .map(c => {
            const { key, name, maxScore } = c;
            return {
              key,
              name,
              maxScore,
            };
          });
      }
      if (collections instanceof Object) {
        this.collections = collections
          .filter(c => c instanceof Object)
          .map(c => new RulesCollection(c));
      }
      if (settings instanceof Array) {
        settings.forEach(item => {
          const { key, value } = item;
          if (notEmptyString(key)) {
            this.settings.set(key, value);
          }
        });
      }
    }
    if (settings.kuta instanceof Map && settings.kuta.size > 0) {
      this.kutaData = settings.kuta;
    }
    if (
      settings.grahaDrishti instanceof Map &&
      settings.grahaDrishti.size > 0
    ) {
      this.grahaDrishtiMap = settings.grahaDrishti;
    }
    if (
      settings.rashiDrishti instanceof Map &&
      settings.rashiDrishti.size > 0
    ) {
      this.rashiDrishtiMap = settings.rashiDrishti;
    }
  }

  matchDrishti(grahaKey: string, signNum = 0) {
    return matchDrishti(grahaKey, signNum, this.grahaDrishtiMap);
  }

  matchRashiDrishti(sign1 = 0, sign2 = 0) {
    return matchRashiDrishti(sign1, sign2, this.rashiDrishtiMap);
  }

  getCollection(index: number) {
    if (index >= 0 && index < this.collections.length) {
      return this.collections[index];
    }
  }

  get length() {
    return this.collections.length;
  }

  setting(settingKey: string, defaultVal = null) {
    const settingRow = this.settings.get(settingKey);
    if (settingRow instanceof Object) {
      return settingRow.value;
    }
    return defaultVal;
  }

  orbFromGrid(aspect: string, k1: string, k2: string) {
    return matchOrbFromGrid(aspect, k1, k2, this.orbs);
  }

  fetchOrbValue(aspect: string, k1: string, k2: string) {
    const aspectData = calcOrb(aspect, k1, k2);
    return matchAspectOrb(aspect, k1, k2, aspectData, this.orbs);
  }

  matchOrbValue(aspect: string, k1: string, k2: string, customOrb = -1) {
    return customOrb >= 0? customOrb : this.fetchOrbValue(aspect, k1, k2);
  }

  kutaMax(kutaType = '', variantKey = '') {
    let maxVal = 0;
    if (this.kutaData.has(kutaType)) {
      const item = this.kutaData.get(kutaType);
      if (item instanceof Object) {
        const keys = Object.keys(item);
        if (keys.includes('max')) {
          maxVal = item.max;
          if (variantKey.length > 0 && keys.includes(variantKey)) {
            if (item[variantKey] instanceof Object) {
              const vKeys = Object.keys(item[variantKey]);
              if (vKeys.includes('max')) {
                maxVal = item[variantKey].max;
              }
            }
          }
        }
      }
    }
    return maxVal;
  }

  get orbs() {
    const useCustom = this.setting('custom_orbs', false);
    let orbs = [];
    if (useCustom) {
      orbs = this.setting('customOrbs', []);
    }
    return orbs;
  }

  get ayanamshaNum() {
    const key = this.setting('ayanamsha', 'true_citra');
    const row = ayanamshaValues.find(ay => ay.key === key);
    let num = 27;
    if (row instanceof Object) {
      num = row.value;
    }
    return num;
  }
}

export class ProtocolResultSet {
  name = '';
  scores: Map<string, number> = new Map();
  operator = 'and';
  min = -1;
  results: BooleanSet[] = [];
  constructor(
    name: string,
    scores: Array<KeyNumVal>,
    operator = 'and',
    min = -1,
  ) {
    this.name = name;
    scores.forEach(row => {
      this.scores.set(row.key, row.value);
    });
    switch (operator) {
      case 'or':
      case 'and':
      case 'min':
        this.operator = operator;
        break;
    }
    this.min = min;
  }

  addBooleanSet(bs: BooleanSet) {
    this.results.push(bs);
  }

  get matched(): boolean {
    if (this.operator === 'or') {
      return this.results.some(rs => rs.matched);
    } else if (this.operator === 'min') {
      return this.results.filter(rs => rs.matched).length >= this.min;
    } else {
      return this.results.length > 0 && this.results.every(rs => rs.matched);
    }
  }
}

export class BooleanSet {
  operator = 'and';
  min = -1;

  matches: Array<BooleanMatch> = [];

  constructor(operator: string, min = -1) {
    switch (operator) {
      case 'or':
      case 'and':
      case 'min':
        this.operator = operator;
        break;
    }
    if (min >= 0) {
      this.min = min;
    }
  }

  addMatch(condRef: Condition | ConditionSet, matched = false) {
    if (!condRef.isSet && condRef instanceof Condition) {
      condRef.setOutcome(matched);
    }
    this.matches.push(new BooleanMatch(condRef, matched));
  }

  get matched(): boolean {
    if (this.operator === 'or') {
      return this.matches.some(bm => bm.matched);
    } else if (this.operator === 'min') {
      return this.matches.length >= this.min;
    } else {
      return this.matches.length > 0 && this.matches.every(bm => bm.matched);
    }
  }
}

export class BooleanMatch {
  matched = false;
  conditionRef: any;

  constructor(condRef: Condition | ConditionSet, matched = false) {
    this.conditionRef = condRef.toJson();
    this.matched = matched;
  }

  get isSet() {
    return this.conditionRef.isSet;
  }
}

export class ObjectType {
  type = '';
  key = '';

  constructor(comboKey = '') {
    const [objectType, objectKey] = comboKey.split('__');
    this.key = objectKey;
    this.type = objectType;
  }

  get mayBeGraha() {
    switch (this.type) {
      case 'lots':
      case 'upapada':
      case 'p_tithi':
      case 'p_karana':
      case 'p_yoga':
      case 'p_vara':
      case 'special':
      case 'kutas':
        return false;
      default:
        return true;
    }
  }

  get isLordship() {
    return this.type.startsWith('lord');
  }

  get isPanchanga() {
    return this.type.startsWith('p_');
  }

  get panchangaType() {
    return this.isPanchanga ? this.type.split('_').pop() : '';
  }

  get endVal() {
    return this.key.indexOf('_') ? this.key.split('_').pop() : '';
  }

  get isNumeric() {
    return isNumeric(this.endVal);
  }

  get numValue(): number {
    return this.isNumeric ? parseInt(this.endVal) : -1;
  }

  // match tithi value (not number)
  get tithiRange() {
    switch (this.key) {
      case 'q_1':
        return [0, 7.5];
      case 'q_2':
        return [7.5, 15];
      case 'q_3':
        return [15, 22.5];
      case 'q_4':
        return [22.5, 30];
      case 'h_1':
        return [0, 15];
      case 'h_2':
        return [15, 30];
      case 'gt_hm':
        return [7.5, 22.5];
      case 'lt_hm':
        return [0, 7.5, 22.5, 30];
      default:
        return [this.numValue - 1, this.numValue];
    }
  }

  matchTithiRange(value: number) {
    const numRanges = this.tithiRange.length / 2;
    if (numRanges < 2) {
      return inRange(value, this.tithiRange);
    } else {
      return (
        inRange(value, this.tithiRange.slice(0, 2)) ||
        inRange(value, this.tithiRange.slice(2, 4))
      );
    }
  }
}

export class ContextType {
  key = '';
  isAspect = false;
  isKuta = false;

  constructor(inData = null) {
    if (inData instanceof Object) {
      Object.entries(inData).forEach(entry => {
        const [k, v] = entry;
        switch (k) {
          case 'key':
            if (typeof v === 'string') {
              this[k] = v;
            }
            break;
          case 'isAspect':
          case 'isKuta':
            if (typeof v === 'boolean') {
              this[k] = v;
            }
            break;
        }
      });
    }
  }

  get kutaKey() {
    return this.key
      .toLowerCase()
      .replace(/_kuta$/, '')
      .replace(/^dina_/, '')
      .replace(/_/, '');
  }

  get isDivisional() {
    switch (this.key) {
      case 'in_sign':
      case 'sign':
      case 'signs':
      case 'in_house':
      case 'house':
      case 'houses':
      case 'nakshatra':
      case 'nakshatras':
      case 'in_nakshatra':
        return true;
      default:
        return false;
    }
  }

  get stateCompare() {
    return this.key === 'state_compare';
  }

  get isDignityBala() {
    return this.key === 'has_dignity_bala_type';
  }

  get isDeclination() {
    switch (this.key) {
      case 'incontra_parallel':
      case 'decl_parallel':
        return true;
      default:
        return false;
    }
  }

  get sameSign() {
    switch (this.key) {
      case 'in_same_sign':
      case 'same_sign':
        return true;
      default:
        return false;
    }
  }

  get isSign() {
    return this.key === "in_sign";
  }

  get bySign() {
    switch (this.key) {
      case 'in_sign':
      case 'sign':
      case 'signs':
        return true;
      default:
        return false;
    }
  }

  get byHouse() {
    switch (this.key) {
      case 'in_house':
      case 'house':
      case 'houses':
        return true;
      default:
        return false;
    }
  }
  get byNakshatra() {
    switch (this.key) {
      case 'nakshatra':
      case 'nakshatras':
      case 'in_nakshatra':
        return true;
      default:
        return false;
    }
  }

  get isYuti() {
    return this.key === 'graha_yuti';
  }

  get isIndianAspect() {
    const keys = [
      'sends_graha_drishti',
      'receives_graha_drishti',
      'mutual_graha_drishti',
      'rashi_drishti',
      'shubha_kartari_yoga',
      'papa_kartari_yoga',
    ];
    return keys.includes(this.key);
  }

  get bmKey() {
    switch (this.key) {
      case 'shubha_kartari_yoga':
        return 'benefics';
      case 'papa_kartari_yoga':
        return 'malefics';
      default:
        return 'neutral';
    }
  }

  get isDrishtiAspect() {
    const keys = [
      'sends_graha_drishti',
      'receives_graha_drishti',
      'mutual_graha_drishti',
      'rashi_drishti',
    ];
    return keys.includes(this.key);
  }

  get isRashiDrishti() {
    return this.key === 'rashi_drishti';
  }

  get isKartariYoga() {
    const keys = ['kartari_yoga', 'papa_kartari_yoga', 'shubha_kartari_yoga'];
    return keys.includes(this.key);
  }

  get sendsDrishti() {
    return this.key.startsWith('sends_');
  }

  get receivesDrishti() {
    return this.key.startsWith('receives_');
  }

  get mutualDrishti() {
    return this.key.startsWith('mutual_');
  }
}

export const matchOrbFromGrid = (
  aspect: string,
  k1: string,
  k2: string,
  orbs: Array<KeyOrbs> = [],
) => {
  let orbDouble = 1;
  const orbRow1 = orbs.find(orbRow => orbRow.key === k1);
  const orbRow2 = orbs.find(orbRow => orbRow.key === k2);
  if (orbRow1 instanceof Object && orbRow2 instanceof Object) {
    const aspRow1 = orbRow1.orbs.find(row => row.key === aspect);
    const aspRow2 = orbRow2.orbs.find(row => row.key === aspect);

    if (aspRow1 instanceof Object && aspRow2 instanceof Object) {
      orbDouble =
        (smartCastFloat(aspRow1.value) + smartCastFloat(aspRow2.value)) / 2;
    }
  }
  return orbDouble;
};

export const matchHouse = (sign: number, firstHouseSign: number) => {
  return calcInclusiveTwelfths(firstHouseSign, sign);
};

export const buildSignHouse = (firstHouseSign = 1): Array<SignHouse> => {
  const signs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  let values = signs.map(sign => {
    return {
      sign,
      house: matchHouse(sign, firstHouseSign),
    };
  });
  return values;
};

const useCollection = (
  filterByRuleSet = false,
  collection: any,
  colRef = '',
): boolean => {
  return filterByRuleSet === false || collection.type === colRef;
};

const useRuleSet = (
  filterByRuleSet = false,
  ruleSetIndex = -1,
  filterIndex = -1,
): boolean => {
  return filterByRuleSet === false || ruleSetIndex === filterIndex;
};

export const  matchAspectOrb = (aspect: string, k1: string, k2: string, aspectData = null, orbs: KeyOrbs[] = []) => {
  let orbDouble = 1;
  if (orbs.length > 0) {
    orbDouble = matchOrbFromGrid(aspect, k1, k2, orbs);
  }
  if (orbDouble < 0) {
    const matchedOrbData =
      aspectData instanceof Object ? aspectData : calcOrb(aspect, k1, k2);
    orbDouble = matchedOrbData.orb;
  }
  return orbDouble;
}

export const matchAspectRange = (aspect: string, k1: string, k2: string, orbs: KeyOrbs[] = []) => {
  const aspectData = calcOrb(aspect, k1, k2);
  const orb = matchAspectOrb(aspect, k1, k2, aspectData, orbs);
  const range =
    orb !== aspectData.orb
      ? [subtractLng360(aspectData.deg, orb), (aspectData.deg + orb) % 360]
      : aspectData.range;
  return range;
}

export const matchAspectRanges = (aspect: string, k1: string, k2: string, orbs: KeyOrbs[] = []) => {
  const isSign = isNumeric(k1);
  if (isSign) {
    const signNum = parseInt(k1, 10);
    return [[((signNum - 1) * 30), (signNum * 30)]];
  } else {
    const aspectData = calcOrb(aspect, k1, k2);
    const orb = matchAspectOrb(aspect, k1, k2, aspectData, orbs);
    const ranges =
      orb !== aspectData.orb
        ? calcAllAspectRanges(aspectData.row, orb, [
            subtractLng360(aspectData.deg, orb),
            (aspectData.deg + orb) % 360,
          ])
        : [aspectData.range];
    return ranges;
  }
}

export const assessChart = (
  protocol: Protocol,
  paired = null,
  kutaSet: Map<string, any> = new Map(),
  colRef = '',
  ruleSetIndex = -1,
) => {
  const pairedChart = new PairedChart(paired);
  const resultRows: Array<any> = [];
  const filterByRuleSet = notEmptyString(colRef, 2) && ruleSetIndex >= 0;
  protocol.collections.forEach(collection => {
    if (useCollection(filterByRuleSet, collection, colRef)) {
      collection.rules.forEach((rs, ruleIndex) => {
        if (useRuleSet(filterByRuleSet, ruleIndex, ruleSetIndex)) {
          const resultSet = pairedChart.matchRuleSet(rs, protocol, kutaSet);
          resultRows.push({ resultSet, collection });
        }
      });
    }
  });
  const results = resultRows.map(row => {
    const { resultSet, collection } = row;
    const ruleMatched = resultSet.matched;
    const scoreEntries = resultSet.scores.entries();
    const resultsEntries = [...scoreEntries].map(entry => {
      const [k, v] = entry;
      const val = ruleMatched ? v : 0;
      return [k, [val, v]];
    });
    return {
      ...resultSet,
      scores: resultsEntries.map(entry => {
        const [key, pair] = entry;
        return {
          key,
          pair,
        };
      }),
      percent: collection.percent,
      type: collection.type,
      matched: ruleMatched,
    };
  });
  const subtotals: Array<SectionScore> = [];

  protocol.collections.forEach(col => {
    if (useCollection(filterByRuleSet, col, colRef)) {
      const subResults = results.filter(rs => rs.type === col.type);
      const secScore = new SectionScore({
        type: col.type,
        percent: col.percent,
      });
      if (subResults instanceof Array) {
        subResults.forEach(rs => {
          secScore.addScores(rs.scores);
        });
      }
      subtotals.push(secScore);
    }
  });
  const totals = protocol.categories
    .map(ct => {
      const scoreRows = subtotals
        .map(st => {
          const scores = st.scores.filter(sc => sc.key === ct.key);
          return {
            ...st,
            scores,
          };
        })
        .filter(sr => sr.scores.length > 0);
      const scores: Map<string, any> = new Map();
      scoreRows.forEach(sr => {
        sr.scores.forEach(sc => {
          const scItem = scores.get(sc.key);
          if (scItem instanceof Object) {
            const currPair = scItem.pair;
            const frac = sr.percent / 100;
            const rowMax = (sc.pair[1] + currPair[1]) * frac;
            const runningTotal = (sc.pair[0] + currPair[0]) * frac;
            const pair = [runningTotal, rowMax];
            scItem.pair = pair;
            scores.set(sc.key, scItem);
          } else {
            scores.set(sc.key, { ...sc, max: ct.maxScore });
          }
        });
      });
      return Object.fromEntries(scores.entries());
    })
    .map(sr => Object.values(sr))
    .filter(rows => rows.length > 0)
    .map(rows => rows[0]);

  const totalRow = {
    key: 'total',
    pair: [0, 0],
    max: 10,
  };
  Object.entries(totals).forEach(entry => {
    const [k, v] = entry;
    const { pair } = v;
    const running = pair[0] + totalRow.pair[0];
    const max = pair[1] + totalRow.pair[1];
    totalRow.pair = [running, max];
  });
  totals.push(totalRow);
  const info = pairedChart.info;
  return {
    results,
    subtotals,
    totals,
    info,
    id: pairedChart._id,
    c1Id: pairedChart.c1._id,
    c2Id: pairedChart.c2._id,
  };
};

export const compatibilityResultSetHasScores = (row: any = null) => {
  if (row instanceof Object && Object.keys(row).includes('totals')) {
    if (row.totals instanceof Array) {
      return row.totals.some(tr => {
        return (
          tr instanceof Object &&
          tr.pair instanceof Array &&
          tr.pair.length > 0 &&
          tr.pair[0] > 0
        );
      });
    }
  }
  return false;
};

export const processTransitDashaRuleSet = (cond: Condition, level = 1, chart: Chart, settings = null) => {
  const transitJd = currentJulianDay();
  const [t1, k1] = cond.c1Key.split("__");
  const criteria: Map<string, any> = new Map();
  criteria.set(`lv${level}`, k1);
  criteria.set(`maxLevel`, level);
  const balanceRef = new DashaBalance(criteria)
  const results = assignDashaBalances(chart, transitJd, level, balanceRef, 'vimshottari', 'mo');
  let start = 0;
  let end = 0;
  let validPeriod = results.length > 0;
  if (validPeriod) {
    const last = results[results.length - 1];
    start = last.startJd;
    end = last.endJd;
  }
  const ayaItem = chart.setAyanamshaItemByKey("true_citra");
  const ct = matchContextType(cond.context);
  const gkTransit = matchGrahaEquivalent(cond.object1, chart);
  const gkBirth = matchGrahaEquivalent(cond.object2, chart);
  const birthKeys = gkBirth.split(',');
  const isDignity = !ct.isKartariYoga && !ct.isSign && gkBirth.length > 3;
  const g1 = chart.graha(gkBirth);
  const g2 = chart.graha(gkTransit);
  g1.setAyanamshaItem(ayaItem);
  g2.setAyanamshaItem(ayaItem);
  let valid = false;
  for (const bKey of birthKeys) {
    if (ct.isAspect) {
      const ranges = matchAspectRanges(cond.context, bKey, gkTransit);
      const dist = calcDist360(g1.longitude, g2.longitude);
      ranges.forEach(range => {
        const inOrb = inRange(dist, range);
        if (inOrb) {
          valid = validPeriod && inOrb;
        }
      });
    } else if (ct.isDrishtiAspect) {
      const ranges = matchDrishtiConditionSignLngs(cond, chart, bKey, gkTransit, settings).map(deg => [deg, deg + 30]);
      valid = ranges.some(range => {
        const [start, end] = range;
        return g1.longitude >= start && g1.longitude < end;
      });
    } else if (isDignity) {
      valid = matchDignity(chart, bKey, gkTransit);
    } else if (ct.isSign) {
      valid = matchByBirthSign(cond, chart);
    } else if (ct.isKartariYoga) {
      chart.setAyanamshaItemByNum(27);
      const keys = matchBmGrahaKeys(ct.bmKey, cond, chart);
      const refGr = chart.graha(gkTransit);
      const adjacentSignIndices =  [(refGr.signIndex + 11) % 12, (refGr.signIndex + 1) % 12];
      const filtered = keys.filter(k => {
        const gr = chart.graha(k);
        return adjacentSignIndices.includes(gr.signIndex);
      });
      valid = filtered.length >= 2;
    }
    if (valid) {
      break;
    }
  }
  return { valid, start, end };
}

export const matchGrahaInTargetRanges = async (targetRanges: number[][], startJd = 0, gkTransit = "", geo: GeoPos) => {
  const nextMatches = [];
  const isAscendant = gkTransit === 'as';
  for (const range of targetRanges) {
    for (const lng of range) {
      const next = isAscendant ? await calcNextAscendantLng(lng, geo.lat, geo.lng, startJd) : await matchNextTransitAtLng(gkTransit, lng, startJd);
      nextMatches.push(next.targetJd);
    }
  }
  return nextMatches;
}

export const matchRelationshipType = (key = '') => {
  const baseKey = key.replace(/_signs?$/, '').toLowerCase().replace(/_/, '');
  switch (baseKey) {
    case 'greatfriend':
    case 'bestfriend':
      return { key: 'bestFriend', type: 'rel' };
    case 'friend':
    case 'enemy':
    case 'neutral':
      return { key: baseKey, type: 'rel' };
    case 'archenemy':
    case 'greatenemy':
      return { key: 'archEnemy', type: 'rel' };
    case 'own':
      return { key: 'ownSign', type: 'arr_attr' };
    case 'mulatrikona':
      return { key: 'mulaTrikona', type: 'attr' };
    case 'exalted':
      return { key: 'exalted', type: 'attr' };
    case 'vargottama':
      return { key: 'vargottamaSign', type: 'attr' };
    case 'retrograde':
      return { key: 'retrograde', type: 'bool' };
    case 'directionalstrength':
      return { key: 'directionalStrengthSign', type: 'method' };
  }
}

export const matchSpecialRanges = (chart: Chart, typeKey = "", grahaKey = "") => {
  chart.setAyanamshaItemByKey('true_citra')
  const graha = chart.graha(grahaKey);
  const signs: number[] = [];
  if (grahaKey.length === 2) {
    const { key, type } = matchRelationshipType(typeKey);
    for (let n = 1; n <= 12; n++) {
      if (type === 'rel') {
        const relationship = mapRelationships(
          graha.sign,
          chart.get(graha.ruler).sign,
          graha.isOwnSign,
          graha.natural,
        );
        if (relationship.compound === key) {
          signs.push(n);
        }
      } else if (type === 'arr_attr') {
        if (graha[type] instanceof Array) {
          graha[type].forEach(sign => {
            signs.push(sign);
          })
        }
      } else if (type === 'attr') {
        if (typeof graha[type] === 'number') {
          signs.push(graha[type]);
        }
      } else if (type === 'method') {
        if (graha[type](chart.firstHouseSign)) {
          signs.push(graha[type]);
        }
      }
    }
  }
  return signs.map(signNum => [((signNum -1) * 30), (signNum * 30)]);
}

export const matchDignity = (chart: Chart, typeKey = "", grahaKey = "") => {
  chart.setAyanamshaItemByKey('true_citra');

  
  const graha = chart.graha(grahaKey);
  if (grahaKey.length === 2) {
    const { key, type } = matchRelationshipType(typeKey);
    if (type === 'rel') {
      const relationship = mapRelationships(
        graha.sign,
        chart.graha(graha.ruler).sign,
        graha.isOwnSign,
        graha.natural,
      );
      return relationship.compound === key;
    } else if (type === 'arr_attr') {
      return graha[key].includes(graha.sign);
    } else if (type === 'attr') {
      return graha[key] === graha.sign;
    } else if (type === 'method') {
      return graha[key](chart.firstHouseSign) === graha.sign;
    } else if (type === 'bool') {
      return graha[key];
    }
  }
  return false;
}

export const processTransitMatch = async (cond: Condition, chart: Chart, geo: GeoPos, settings = null) => {
  const ayaItem = chart.setAyanamshaItemByKey("true_citra");
  const startJd = currentJulianDay();
  const gkTransit = matchGrahaEquivalent(cond.object1, chart);
  const gkBirth = matchGrahaEquivalent(cond.object2, chart);  
  const g1 = chart.graha(gkBirth);
  g1.setAyanamshaItem(ayaItem);
  let nextMatches = [];
  const ct = matchContextType(cond.context);
  let addEnd = false;
  if (ct.isAspect) {
    const ranges = matchAspectRanges(cond.context, gkBirth, gkTransit);
    const targetRanges = ranges.map(range => range.map(num => addLng360(num,g1.longitude)));
    nextMatches = await matchGrahaInTargetRanges(targetRanges, startJd, gkTransit, geo);
    if (nextMatches.length > 1) {
      const diff = Math.abs(nextMatches[1] - nextMatches[0]);
      addEnd = diff < 30;
    }
  } else if (ct.isDrishtiAspect) {
    const ranges = matchDrishtiConditionSignLngs(cond, chart, gkBirth, gkTransit, settings).map(deg => [deg, deg + 30]);
    nextMatches = await matchGrahaInTargetRanges(ranges, startJd, gkTransit, geo);
  }
  nextMatches.sort((a, b) => a - b);
  const valid = nextMatches.length > 0;
  const start = nextMatches.length > 0 ? nextMatches[0] : 0;
  const end = addEnd && nextMatches.length > 1? nextMatches[1] : start;
  return {valid, start, end };
}

export const matchDrishtiConditionSignLngs = (
  condition: Condition,
  fromChart: Chart,
  k1 = '',
  k2 = '',
  settings: ProtocolSettings
) => {
  const degs = [];
  for (let i = 0; i < 12; i++) {
    const deg = i * 30;
    const matched = matchDrishtiCondition(condition, fromChart, deg, k1, k2, settings);
    if (matched) {
      degs.push(deg);
    }
  }
  return degs;
};

export const matchDrishtiCondition = (
  condition: Condition,
  fromChart: Chart,
  toLng: number,
  k1 = '',
  k2 = '',
  settings: ProtocolSettings
) => {
  const grKeys1 = matchBmGrahaKeys(k1, condition, fromChart);
  const grKeys2 = matchBmGrahaKeys(k2, condition, fromChart);
  //let matched = false;
  const bmRows: Array<BmMatchRow> = [];
  grKeys1.forEach(gk1 => {
    grKeys2.forEach(gk2 => {
      const gr1 = fromChart.graha(gk1);
      if (gr1 instanceof Object) {
        const sign2 = Math.floor(toLng / 30) + 1;
        const sendsDiff = calcInclusiveSignPositions(
          gr1.signNum,
          sign2,
        );
        const applyRashi = condition.isRashiDrishti;
        // sends drishti
        const sendsVal = applyRashi
          ? matchRashiDrishti(gr1.signNum, sendsDiff, settings.rashiDrishti)
          : matchDrishti(gk1, sendsDiff, settings.grahaDrishti);
        const getsDiff = calcInclusiveSignPositions(sign2, gr1.signNum);
        // receives / gets drishti
        const getsVal = applyRashi
          ? matchRashiDrishti(gr1.signNum, getsDiff)
          : matchDrishti(gk2, getsDiff, settings.grahaDrishti);
        bmRows.push({
          k1: gk1,
          sendsDiff,
          sendsVal,
          k2: gk2,
          getsDiff,
          getsVal,
        });
      }
    });
  });
  return bmRows.some(row => filterBmMatchRow(row, condition));
}

export const processByBirthSign = (condition: Condition, fromChart: Chart) => {
  const signs = matchSignNums(condition.c2Key);
  fromChart.setAyanamshaItemByKey("true_citra");
  const ascSign = Math.floor(fromChart.lagna / 30) + 1;
  const valid = signs.includes(ascSign);
  const start = fromChart.jd;
  const end = fromChart.jd + (200 * 365.25);
  return { valid, start, end };
}

export const matchByBirthSign = (cond: Condition, chart: Chart) => {
  const refKey = matchGrahaEquivalent(cond.object1, chart);
  chart.setAyanamshaItemByKey("true_citra");
  const graha = chart.graha(refKey);
  const signNums = matchSignNums(cond.c2Key);
  return signNums.includes(graha.signNum);
}

const flipEntryKey = (key: string) => {
  const flipkeys = ['exit', 'entry'];
  return flipkeys.includes(key)? key === 'entry' ? 'exit' : 'entry' : key;
}

export const matchKotaChakra = async (cond: Condition, chart: Chart, geo: GeoPos = {lat: 0, lng: 0}) => {
  chart.setAyanamshaItemByNum(27);
  const ayaKey = 'true_citra';
  let refGrKey = matchGrahaEquivalent(cond.object1, chart);
  const currJd = currentJulianDay();
  // set default max JD to years hence
  let maxJd = currJd + (10 * 365.25);
  if (refGrKey.length > 2) {
    switch (cond.object1.key) {
      case 'lord_dasha':
      case 'lord_bhukti':
        const depth = cond.c1Key.includes('bhukti')? 2 : 1;
        const dsSpan = matchCurrentDashaLord(chart, currJd, depth);
        refGrKey = dsSpan.key;
        maxJd = dsSpan.endJd;
        break;
    }
  }
  const moon = chart.graha('mo');
  
  const nakIndex = nakshatra28(moon.longitude) - 1;
  const kotaOffset = ((27 - nakIndex + 28) % 28);
  const applySpeedMode = ['entry', 'exit'].includes(cond.c2Key);
  const flipDir = cond.context === 'retrograde';
  const alwaysNeg = ['ke', 'ra'].includes(refGrKey)
  const alwaysPos = ['mo', 'su'].includes(refGrKey);
  const filterKey = alwaysNeg &&  applySpeedMode ? flipEntryKey(cond.c2Key) : cond.c2Key;
  const dir1 = applySpeedMode? alwaysNeg? -1 : flipDir? -1 : 1 : 0;
  const dir2 = applySpeedMode? flipDir ? 1 : -1 : 0;
  const fetchMore = applySpeedMode && !alwaysNeg && !alwaysPos;
  
  const nums = matchKotaCakraSection(filterKey);
  
  const rangeSets = numbersToNakshatraDegreeRanges(nums, kotaOffset).map(rng => {
    return new RangeSet(rng, dir1);
  });
  if (fetchMore) {
    const reverseKey = flipEntryKey(cond.c2Key);
    const nums2 = matchKotaCakraSection(reverseKey);
    const ranges2 = numbersToNakshatraDegreeRanges(nums2, kotaOffset);
    if (ranges2.length > 0) {
      ranges2.forEach(rng => {
        rangeSets.push( new RangeSet(rng, dir2) );
      })
    }
  }
  const nextMatch = await matchNextTransitAtLngRanges(refGrKey, rangeSets, currJd, geo, ayaKey);
  const isBeforeMaxEndJd = nextMatch.targetJd <= maxJd;
  const valid = nextMatch.valid && isBeforeMaxEndJd;
  const start = valid ? nextMatch.targetJd : 0;
  const items = [nextMatch];
  return { valid, start, items };
}

const calcCellNum = (num = 1, sunOffset = 0) => {
  return ((num - 1 - sunOffset + 28) % 28) + 1;
}

export const translateShulaChakraNums = (key = "") => {
  const tridentCells = [1, 2, 4, 6, 7, 8, 20, 22, 23, 24, 26, 28];
  const nearTridentCells = [3, 5, 19, 21, 25, 27];
  const otherCells = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  const baseKey = key.split('__').pop().toLowerCase();
  switch (baseKey) {
    case 'trident':
      return tridentCells;
    case 'next':
    case 'next_trident':
      return nearTridentCells;
    default:
      return otherCells;
  }
}

export const translateKalanalaChandraNums = (key = "") => {
  const tridentCells = [1, 2, 3, 8, 9, 10, 15, 16, 17, 22, 23, 24];
  const innerCircleCells = [4, 7, 11, 14, 18, 21, 26, 28];
  const outerCircleCells = [5, 6, 12, 13, 19, 20, 26, 27];
  const baseKey = key.split('__').pop().toLowerCase();
  switch (baseKey) {
    case 'trident':
      return tridentCells;
    case 'outside':
      return outerCircleCells;
    default:
      return innerCircleCells;
  }
}


export const translateChakraNums = (type = "shula", key = "") => {
  switch (type) {
    case "kalanala":
    case 'chandra_kalanala':
    case 'kalanala_chandra':
      return translateKalanalaChandraNums(key);
    default:
      return translateShulaChakraNums(key);
  }
}

const nakashatraGroupStartOffsetKey = (key: string): string => {
  switch (key) {
    case "shula":
      return "su";
    default:
      return "";
  }
}

const nakashatraGroupInnerOffsetKey = (key: string): string => {
  switch (key) {
    case 'kalanala':
    case 'kalanala_candra':
    case 'chandra':
    case 'kanala':
      return 'mo';
    default:
      return '';
  }
}

export const matchNakshatraGroups = async (type = 'shula', cond: Condition, chart: Chart, geo: GeoPos = { lat: 0, lng: 0 } ) => {
  const currJd = currentJulianDay();
  const maxJd = currJd + (20 * 365.25);
  const ayaKey = 'true_citra';
  chart.setAyanamshaItemByKey(ayaKey);
  const refGrKey = matchGrahaEquivalent(cond.object1, chart);
  const startOffsetKey = nakashatraGroupStartOffsetKey(type);
  const startOffset = notEmptyString(startOffsetKey, 1)? chart.graha(startOffsetKey).nakshatra28 - 1 : 0;
  const innerOffsetKey = nakashatraGroupInnerOffsetKey(type);
  const nums = translateChakraNums(type, cond.context);
  const rangeSets = numbersToNakshatraDegreeRanges(nums, startOffset).map(rng => {
    return new RangeSet(rng, 0);
  });
  const nextMatch = await matchNextTransitAtLngRanges(refGrKey, rangeSets, currJd, geo, innerOffsetKey, ayaKey);
  const isBeforeMaxEndJd = nextMatch.targetJd <= maxJd;
  const valid = nextMatch.valid && isBeforeMaxEndJd;
  const start = valid ? nextMatch.targetJd : 0;
  const items = [nextMatch];
  return { valid, start, items };
}



export const matchShulaChakra = async (cond: Condition, chart: Chart) => {
  return await matchNakshatraGroups("shula", cond, chart);
}

export const matchKalanalaChandra = async (cond: Condition, chart: Chart, geo: GeoPos) => {
  return await matchNakshatraGroups("kalanala", cond, chart, geo);
}

const translateActionToGerund = (action: string) => {
  const suffix = action.split('_').pop().trim().toLowerCase();
  switch (suffix) {
    case "dies":
      return "dying";
    case "rules":
      return "ruling";
    default:
      return suffix.replace(/s$/i, "ing");
  }
}

const matchPanchaPakshiBirdAction = async (currJd = 0, geo: GeoPos, chart: Chart, refKey: string, action: string) => {
  const ppData = await panchaPakshiDayNightSet(currJd, geo, chart, true);
  const bird = ppData.get('bird');
  const dayYamas = ppData.get('yamas');
  const nightYamas = ppData.get('yamas2');
  let refBirds = [];
  let valid = false;
  let matchedYama = null;
  let isNight = false;
  let birdKey = '';
  switch (refKey) {
    case 'birth_bird':
      refBirds = [bird.birth];
      break;
    case 'day_night_ruling_bird':
      refBirds = [bird.current.ruling.key, bird.next.ruling.key];
      break;
    case 'day_night_dying_bird':
      refBirds = [bird.current.dying.key, bird.next.dying.key];
      break;
  }
  if (refBirds.length > 0) {
    const refDayBird = refBirds[0];
    const refNightBird = refBirds.length > 1 ? refBirds[1] : refBirds[0];
    matchedYama = dayYamas.find(ym => ym.subs[0].bird === refDayBird && action === ym.subs[0].key);
    birdKey = refDayBird;
    if (!matchedYama) {
      matchedYama = nightYamas.find(ym => ym.subs[0].bird === refNightBird && action === ym.subs[0].key);
      isNight = matchedYama instanceof Object;
      birdKey = refNightBird;
    }
    valid = matchedYama instanceof Object;
  }
  return {valid, yama: matchedYama, isNight, birdKey };
}

export const matchPanchaPakshi = async (cond: Condition, chart: Chart, geo: GeoPos) => {
  let mode = '';
  switch (cond.fromMode) {
    case 'transit':
    case 'birth':
      mode = cond.fromMode;
      break;
    default:
      mode = 'pp';
      break;
  }
  const { context } = cond;
  let start = 0;
  let end = 0;
  const isAction = context.startsWith('action_');
  const action = isAction ? translateActionToGerund(context) : '';
  const currJd = currentJulianDay();
  let matchedBird = '';
  let nightMatched = false;
  if (isAction) {
    const refKey = cond.object1.key;
    let matched = false;
    let counter = 0;
    while (!matched && counter < 20) {
      const { valid, yama, birdKey, isNight } = await matchPanchaPakshiBirdAction(currJd, geo, chart, refKey, action);
      if (valid) {
        matched = true;
        start = yama.start;
        end = yama.end;
        nightMatched = isNight;
        matchedBird = birdKey;
      }
      counter++;
    }
  }
  const valid = start > 0 && end > start;
  return { start, end, action, matchedBird, isNight: nightMatched, valid };
}
