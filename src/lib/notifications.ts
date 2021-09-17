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