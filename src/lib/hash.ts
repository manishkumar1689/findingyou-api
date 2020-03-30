import { hashSalt } from '../.config';
import * as bcrypt from 'bcrypt';

export const encryptPassword = password => {
  return bcrypt.hashSync(password, hashSalt);
};

export const toBase64 = str => Buffer.from(str).toString('base64');

export const fromBase64 = str => Buffer.from(str, 'base64').toString('ascii');

export const generateHash = () =>
  (new Date().getTime() + Math.round(Math.random() * 100) / 100).toString();
