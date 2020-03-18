/*
 Copy this file to .config.js in the route directory
*/

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
  sid_mode: 'SE_SIDM_TRUE_CITRA'
}