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