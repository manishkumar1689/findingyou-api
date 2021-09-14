import * as admin from "firebase-admin";
import { googleFCMKeyPath } from '../.config'

const initApp = () => {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: 'https://flags.firebaseio.com'
});
}

export interface IFlag {
  key: string;
  user: string;
  targetUser: string;
  value: any;
  type: string;
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

export const pushFlag = (token: string, flag: IFlag) => {
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

  admin.messaging().send(message)
  .then((response) => {
    console.log(response);
  });
}