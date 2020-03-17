const util = require("util");
const swisseph = require('swisseph');

const calcAsync = util.promisify(swisseph.calc);

const calcUtAsync = util.promisify(swisseph.swe_calc_ut);

const riseTransAsync = util.promisify(swisseph.swe_rise_trans);

const fixedStarUtAsync = util.promisify(swisseph.swe_fixstar_ut);

const fixedStar2UtAsync = util.promisify(swisseph.swe_fixstar2_ut);

const fixstar2MagAsync = util.promisify(swisseph.swe_fixstar2_mag);

const getHouses = util.promisify(swisseph.swe_houses_ex);

module.exports = { calcAsync, calcUtAsync, riseTransAsync, fixedStarUtAsync, fixedStar2UtAsync, fixstar2MagAsync, getHouses };