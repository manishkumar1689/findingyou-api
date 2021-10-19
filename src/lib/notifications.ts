import * as admin from "firebase-admin";
import { googleFCMKeyPath } from '../.config'

const initApp = () => {
  admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      databaseURL: 'https://flags.firebaseio.com'
  });
}

initApp();

export interface IFlag {
  key?: string;
  user: string;
  targetUser?: string;
  value: any;
  type?: string;
  modifiedAt?: string;
  createdAt?: string;
}

export interface FlagVal {
  key?: string;
  value: any;
  type?: string;
  modifiedAt?: string;
}

export interface FlagItem {
  key: string;
  value: number | boolean;
  op: string;
}

export const mapUserFlag = (item, toMode = false, likeMode = false): IFlag => {
  if (item instanceof Object) {
    const { key, value, type, user, targetUser, modifiedAt } = item;
    const refUser = toMode? user : targetUser;
    return likeMode? { value, user: refUser, modifiedAt } : { key, type, value, user: refUser, modifiedAt };
  } else {
    return { value: 0, user: '' };
  }
}

export const mapLikeability = (value = -1, zeroAsPass = false) => {
  switch (value) {
    case 2:
      return 'superlike';
    case 1:
      return 'like';
    case 0:
      return zeroAsPass? 'pass': 'ignore';
    case -1:
    case -2:
    case -3:
    case -4:
    case -5:
      return 'pass';
    default:
      return '';
  }
}

const filterLike = (row = null, userID = '') => {
  const keys = row instanceof Object ? Object.keys(row) : [];
  const user = keys.includes('user') ? row.user : '';
  return user.toString() === userID;
}

export const mapLikeabilityRelations = (rows: any[] = [], userID = '') => {
  
  const items = rows.filter(row => filterLike(row, userID)).map(row => mapLikeabilityRelation(row));

  return items.length > 0 ? items[0] : { value: ''};
}

export const mapLikeabilityRelation = (item = null): FlagVal => {
  if (item instanceof Object) {
    const { value, modifiedAt } = item;
    const keyVal = mapLikeability(value);
    return { value: keyVal, modifiedAt };
  } else {
    return { value: '' };
  }
}

const castValueToString = (val: any, type: string): string => {
  switch (type) {
    case 'boolean':
    case 'bool':
      return val? '1' : '0';
    default: 
    return val !== null && val !== undefined ? val.toString() : '';
  }
}

export const pushFlag = async (token: string, flag: IFlag) => {
  const entries = flag instanceof Object? Object.entries(flag) : [];
  const hasType = entries.some(entry => entry[0] === 'type');
  const type = hasType ? flag.type : '';
  const strEntries: string[][] = hasType? entries.map(entry => {
    const [key, val] = entry;
    const value = typeof val === 'string'? val : castValueToString(val, type);
    return [ 
      key,
      value
    ]
  }) : [];
  const data = Object.fromEntries(strEntries);
  const message = {
    data,
    token,
  };
  const result: any = { valid: false, error: null, data: null };
  try {
    await admin.messaging().send(message)
    .then((response) => {
      result.data = response;
    }).catch(e => {
      result.error = e;
    });
  } catch (e) {
    result.error = e;
  }
  return result;
}

export const mapFlagItems = (flagKey = ""): FlagItem => {
  const defVal = { key: flagKey, value: true, op: "eq" };
  switch (flagKey) {
    case 'like':
      return {...defVal, value: 1 };
    case 'superlike':
      return {...defVal, value: 2 };
    case 'ignore':
    case 'not_interested':
      return {...defVal, value: 0 };
    case 'pass':
    case 'passed':
        return {...defVal, value: 0, op: "lt"  };
    case 'passed3':
      return {...defVal, value: -2, op: "lt"  };
    default:
      return defVal;
  }
}

export const subFilterFlagItems = (flag: IFlag, fi: FlagItem) => {
  return flag.key === 'likeability' && ((fi.op === "eq" && fi.value === flag.value) || (fi.op === "lt" && flag.value < fi.value));
}

export const filterLikeabilityFlags = (flag: IFlag, flagItems: FlagItem[]) => flagItems.some(fi => subFilterFlagItems(flag, fi))

export const filterLikeabilityContext = (context = '') => {
  switch (context) {
    case 'liked':
      return { liked1: 1, unrated: 1 };
    case 'superliked':
    case 'starred':
    case 'superstarred':
      return { liked2: 1, unrated: 1 };
    case 'matched':
    case 'match':
      return { liked: 1, mutual: 1 };
    default:
      return {};
  }
}