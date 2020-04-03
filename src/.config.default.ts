/*
 Copy this file to .config.js in the route directory
*/
import * as redisStore from 'cache-manager-redis-store';

export const port = 3043;

export const mongo = {
  name: 'findingyou',
  user: 'stargazer',
  pass: 'T0XcJfpIBsFGkUY7',
};

export const redisOptions = {
  store: redisStore,
  host: 'localhost',
  port: 6379,
};

export const ephemerisPath = '/usr/share/libswe/ephe';

export const ephemerisDefaults = {
  altitude: 30,
  pressure: 1000,
  temperature: 10,
  sid_mode: 'SE_SIDM_TRUE_CITRA',
};

export const geonames = {
  username: 'serpentinegallery',
};

export const timezonedb = {
  apiKey: '0NXJ03JE76B4',
};

export const hashSalt = '4jyddhd-90';

export const maxResetMinutes = 180;

export const mailDetails = {
  fromName: 'FindingYou Service Desk',
  fromAddress: 'info@findingyou.co',
  transport: 'smtp://username:password@mailserver.domain',
};

export const mailService = {
  provider: 'elasticmail/api',
  userName: '',
  apiKey: '',
  secret: '',
};

export const webBaseUrl = 'https://www.findingyou.co';
