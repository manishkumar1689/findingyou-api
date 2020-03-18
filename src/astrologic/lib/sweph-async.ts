import * as util from "util";
import * as swisseph from 'swisseph';

export const calcAsync = util.promisify(swisseph.calc);

export const calcUtAsync = util.promisify(swisseph.swe_calc_ut);

export const riseTransAsync = util.promisify(swisseph.swe_rise_trans);

export const fixedStarUtAsync = util.promisify(swisseph.swe_fixstar_ut);

export const fixedStar2UtAsync = util.promisify(swisseph.swe_fixstar2_ut);

export const fixstar2MagAsync = util.promisify(swisseph.swe_fixstar2_mag);

export const getHouses = util.promisify(swisseph.swe_houses_ex);

