import { KeyName, KeyNameMax } from '../interfaces';
import { isNumeric, notEmptyString } from '../../../lib/validators';
import { smartCastFloat } from '../../../lib/converters';
import { contextTypes } from '../settings/compatibility-sets';
import { calcOrb, calcAllAspectRanges } from '../calc-orbs';
import { subtractLng360 } from '../helpers';
import ayanamshaValues from '../settings/ayanamsha-values';
import { SignHouse } from '../../interfaces/sign-house';
import { calcInclusiveTwelfths } from '../math-funcs';
import { PairedChart } from './chart';

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
    const matched = contextTypes.find(ct => ct.key === this.context);
    return new ContextType(matched);
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
    return this.c1Key.startsWith('natbm_');
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
    const aspects = this.grahaDrishtiMap.get(grahaKey);
    if (aspects instanceof Array && signNum > 0 && signNum <= 12) {
      const index = signNum - 1;
      return aspects[index];
    }
    return 0;
  }

  matchRashiDrishti(sign1 = 0, sign2 = 0) {
    const aspects = this.rashiDrishtiMap.get(sign1);
    if (aspects instanceof Array && sign2 > 0 && sign2 <= 12) {
      return aspects.indexOf(sign2);
    }
    return 0;
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

  matchOrb(aspect: string, k1: string, k2: string, aspectData = null) {
    let orbDouble = 1;

    if (this.orbs.length > 0) {
      orbDouble = matchOrbFromGrid(aspect, k1, k2, this.orbs);
    }
    if (orbDouble < 0) {
      const matchedOrbData =
        aspectData instanceof Object ? aspectData : calcOrb(aspect, k1, k2);
      orbDouble = matchedOrbData.orb;
    }
    return orbDouble;
  }

  orbFromGrid(aspect: string, k1: string, k2: string) {
    return matchOrbFromGrid(aspect, k1, k2, this.orbs);
  }

  matchOrbValue(aspect: string, k1: string, k2: string) {
    const aspectData = calcOrb(aspect, k1, k2);
    return this.matchOrb(aspect, k1, k2, aspectData);
  }

  matchRange(aspect: string, k1: string, k2: string) {
    const aspectData = calcOrb(aspect, k1, k2);
    const orb = this.matchOrb(aspect, k1, k2, aspectData);
    const range =
      orb !== aspectData.orb
        ? [subtractLng360(aspectData.deg, orb), (aspectData.deg + orb) % 360]
        : aspectData.range;
    return range;
  }

  matchRanges(aspect: string, k1: string, k2: string) {
    const aspectData = calcOrb(aspect, k1, k2);
    const orb = this.matchOrb(aspect, k1, k2, aspectData);
    const ranges =
      orb !== aspectData.orb
        ? calcAllAspectRanges(aspectData.row, orb, [
            subtractLng360(aspectData.deg, orb),
            (aspectData.deg + orb) % 360,
          ])
        : [aspectData.range];
    return ranges;
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
      .replace(/^dina_/, '');
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
    const keys = ['shubha_kartari_yoga', 'papa_kartari_yoga', 'kartari_yoga'];
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

export const assessChart = (
  protocol: Protocol,
  paired = null,
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
          const resultSet = pairedChart.matchRuleSet(rs, protocol);
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
