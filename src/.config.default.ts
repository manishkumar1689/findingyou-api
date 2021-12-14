/*
 Copy this file to .config.js in the route directory
*/
import * as redisStore from 'cache-manager-redis-store';

export const port = 3043;

export const globalApikey = 'eKabd7G;bd';
export const suffixSplitChars = ['%', '.', ','];
export const authMode = 'dynamic';
export const ipWhitelist = ['84.93.111.229'];
export const pathWhitelist = ['get-file/:directory/:name'];

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

export const googleGeo = {
  apiKey: 'AIzaSyAOeXTgZTB_cJUyV9B2DOiZI_6LoVU2vs8',
};

export const googleTranslate = {
  key: 'AIzaSyA7DMs4bBxSjKd8XwBmH7VWPZniRdxeGIw',
  projectId: 'snippets-319613',
};

export const googleFCMKeyPath =
  '/Users/neil/apps/findingyou/files/findingyou-1ef9a-firebase-adminsdk-8otfv-1e2b882c10.json';

export const googleFCMBase = 'findingyou-1ef9a-default-rtdb';

export const googleFCMDomain = 'europe-west1.firebasedatabase.app';

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

export const imageSizes = {
  thumb: {
    mode: 'resize',
    width: 640,
    height: 640,
    quality: 92,
  },
  half: {
    mode: 'resize',
    width: 1280,
    height: 1280,
    quality: 92,
  },
  large: {
    mode: 'resize',
    width: 2560,
    height: 2560,
    quality: 88,
  },
};

export const webBaseUrl = 'https://www.findingyou.co';

export const backupPath = '/var/www/findingyou.co/backups';

export const mediaDirectory = '/Users/neil/apps/findingyou/backend/media';

export const filesDirectory = '../files';

export const sourcesDirectory =
  '/var/www/dev.findingyou.co/backend/sample-data';

export const exportDirectory = '../exports';

export const logsDirectory = '../logs';

export const validMediaFileExtensions = ['jpg', 'jpeg', 'png', 'svg', 'mp3'];

export const validImageExtensions = ['jpg', 'jpeg', 'png'];

/* Min. remainaing charts after bulk deletion. Increase in production to 1000,0000 */
export const minRemainingPaired = 1000;
