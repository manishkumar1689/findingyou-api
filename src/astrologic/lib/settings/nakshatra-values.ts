/*
Prefixes:
nakshtra key: nakshatra
aksharas: akshara
gender: gender
goal: purushartha
yoni: kuta__yoni_
*/

const nakshatraValues = [
  {
    key: 'n27_01',
    ruler: 'ke',
    goal: 'dharma',
    gender: 'm',
    yoni: 1,
    aksharas: ['n27_01_1', 'n27_01_2', 'n27_01_3', 'n27_01_4'],
    nadi: 'vt',
  },
  {
    key: 'n27_02',
    ruler: 've',
    goal: 'artha',
    gender: 'f',
    yoni: 2,
    aksharas: ['n27_02_1', 'n27_02_2', 'n27_02_3', 'n27_02_4'],
    nadi: 'pt',
  },
  {
    key: 'n27_03',
    ruler: 'su',
    goal: 'kama',
    gender: 'f',
    yoni: 3,
    aksharas: ['n27_03_1', 'n27_03_2', 'n27_03_3', 'n27_03_4'],
    nadi: 'kp',
  },
  {
    key: 'n27_04',
    ruler: 'mo',
    goal: 'moksha',
    gender: 'f',
    yoni: 4,
    aksharas: ['n27_04_1', 'n27_04_2', 'n27_04_3', 'n27_04_4'],
    nadi: 'kp',
  },
  {
    key: 'n27_05',
    ruler: 'ma',
    goal: 'moksha',
    sex: 'None',
    yoni: 4,
    aksharas: ['n27_05_1', 'n27_05_2', 'n27_05_3', 'n27_05_4'],
    nadi: 'pt',
  },
  {
    key: 'n27_06',
    ruler: 'ra',
    goal: 'kama',
    gender: 'f',
    yoni: 5,
    aksharas: ['n27_06_1', 'n27_06_2', 'n27_06_3', 'n27_06_4'],
    nadi: 'vt',
  },
  {
    key: 'n27_07',
    ruler: 'ju',
    goal: 'artha',
    gender: 'm',
    yoni: 6,
    aksharas: ['n27_07_1', 'n27_07_2', 'n27_07_3', 'n27_07_4'],
    nadi: 'vt',
  },
  {
    key: 'n27_08',
    ruler: 'sa',
    goal: 'dharma',
    gender: 'm',
    yoni: 3,
    aksharas: ['n27_08_1', 'n27_08_2', 'n27_08_3', 'n27_08_4'],
    nadi: 'pt',
  },
  {
    key: 'n27_09',
    ruler: 'me',
    goal: 'dharma',
    gender: 'f',
    yoni: 6,
    aksharas: ['n27_09_1', 'n27_09_2', 'n27_09_3', 'n27_09_4'],
    nadi: 'kp',
  },
  {
    key: 'n27_10',
    ruler: 'ke',
    goal: 'artha',
    gender: 'f',
    yoni: 7,
    aksharas: ['n27_10_1', 'n27_10_2', 'n27_10_3', 'n27_10_4'],
    nadi: 'kp',
  },
  {
    key: 'n27_11',
    ruler: 've',
    goal: 'kama',
    gender: 'f',
    yoni: 7,
    aksharas: ['n27_11_1', 'n27_11_2', 'n27_11_3', 'n27_11_4'],
    nadi: 'pt',
  },
  {
    key: 'n27_12',
    ruler: 'su',
    goal: 'moksha',
    gender: 'f',
    yoni: 8,
    aksharas: ['n27_12_1', 'n27_12_2', 'n27_12_3', 'n27_12_4'],
    nadi: 'vt',
  },
  {
    key: 'n27_13',
    ruler: 'mo',
    goal: 'moksha',
    gender: 'm',
    yoni: 9,
    aksharas: ['n27_13_1', 'n27_13_2', 'n27_13_3', 'n27_13_4'],
    nadi: 'vt',
  },
  {
    key: 'n27_14',
    ruler: 'ma',
    goal: 'kama',
    gender: 'f',
    yoni: 10,
    aksharas: ['n27_14_1', 'n27_14_2', 'n27_14_3', 'n27_14_4'],
    nadi: 'pt',
  },
  {
    key: 'n27_15',
    ruler: 'ra',
    goal: 'artha',
    gender: 'f',
    yoni: 9,
    aksharas: ['n27_15_1', 'n27_15_2', 'n27_15_3', 'n27_15_4'],
    nadi: 'kp',
  },
  {
    key: 'n27_16',
    ruler: 'ju',
    goal: 'dharma',
    gender: 'f',
    yoni: 10,
    aksharas: ['n27_16_1', 'n27_16_2', 'n27_16_3', 'n27_16_4'],
    nadi: 'kp',
  },
  {
    key: 'n27_17',
    ruler: 'sa',
    goal: 'dharma',
    gender: 'm',
    yoni: 11,
    aksharas: ['n27_17_1', 'n27_17_2', 'n27_17_3', 'n27_17_4'],
    nadi: 'pt',
  },
  {
    key: 'n27_18',
    ruler: 'me',
    goal: 'artha',
    gender: 'f',
    yoni: 11,
    aksharas: ['n27_18_1', 'n27_18_2', 'n27_18_3', 'n27_18_4'],
    nadi: 'vt',
  },
  {
    key: 'n27_19',
    ruler: 'ke',
    goal: 'kama',
    sex: 'None',
    yoni: 5,
    aksharas: ['n27_19_1', 'n27_19_2', 'n27_19_3', 'n27_19_4'],
    nadi: 'vt',
  },
  {
    key: 'n27_20',
    ruler: 've',
    goal: 'moksha',
    gender: 'f',
    yoni: 12,
    aksharas: ['n27_20_1', 'n27_20_2', 'n27_20_3', 'n27_20_4'],
    nadi: 'pt',
  },
  {
    key: 'n27_21',
    ruler: 'su',
    goal: 'moksha',
    gender: 'f',
    yoni: 14,
    aksharas: ['n27_21_1', 'n27_21_2', 'n27_21_3', 'n27_21_4'],
    nadi: 'kp',
  },
  {
    key: 'n27_22',
    ruler: 'mo',
    goal: 'artha',
    gender: 'm',
    yoni: 12,
    aksharas: ['n27_22_1', 'n27_22_2', 'n27_22_3', 'n27_22_4'],
    nadi: 'kp',
  },
  {
    key: 'n27_23',
    ruler: 'ma',
    goal: 'dharma',
    gender: 'f',
    yoni: 13,
    aksharas: ['n27_23_1', 'n27_23_2', 'n27_23_3', 'n27_23_4'],
    nadi: 'pt',
  },
  {
    key: 'n27_24',
    ruler: 'ra',
    goal: 'dharma',
    sex: 'None',
    yoni: 1,
    aksharas: ['n27_24_1', 'n27_24_2', 'n27_24_3', 'n27_24_4'],
    nadi: 'vt',
  },
  {
    key: 'n27_25',
    ruler: 'ju',
    goal: 'artha',
    gender: 'm',
    yoni: 'siṃha',
    aksharas: ['n27_25_1', 'n27_25_2', 'n27_25_3', 'n27_25_4'],
    nadi: 'vt',
  },
  {
    key: 'n27_26',
    ruler: 'sa',
    goal: 'artha',
    gender: 'm',
    yoni: 8,
    aksharas: ['n27_26_1', 'n27_26_2', 'n27_26_3', 'n27_26_4'],
    nadi: 'pt',
  },
  {
    key: 'n27_27',
    ruler: 'me',
    goal: 'moksha',
    gender: 'f',
    yoni: 2,
    aksharas: ['n27_27_1', 'n27_27_2', 'n27_27_3', 'n27_27_4'],
    nadi: 'kp',
  },
];

const kotaCakraGroups = [
  { key: 'e', flow: 1, nums: [1, 2, 3, 4] },
  { key: 'se', flow: -1, nums: [5, 6, 7] },
  { key: 's', flow: 1, nums: [8, 9, 10, 11] },
  { key: 'sw', flow: -1, nums: [12, 13, 14] },
  { key: 'w', flow: 1, nums: [15, 16, 17, 18] },
  { key: 'nw', flow: -1, nums: [19, 20, 21] },
  { key: 'n', flow: 1, nums: [22, 23, 24, 25] },
  { key: 'ne', flow: -1, nums: [26, 27, 28] },
];

const matchKotaCakraDirection = (type = "s") => {
	const row = kotaCakraGroups.find(row => row.key === type);
	return row instanceof Object ? row.nums : [];
}

export const matchKotaCakraSection = (type = "inner") => {
  switch (type) {
    case "inner":
    case "stambha":
      return kotaCakraGroups.filter(row => row.flow === 1).map(row => row.nums[0]);
    case "inner_middle":
    case "madhya":
      return kotaCakraGroups.map(row => {
        const index = row.flow === 1 ? 1 : 2;
        return row.nums[index];
      });
    case "boundary":
    case "boundary_wall":
    case "prakara":
      return kotaCakraGroups.map(row => {
        const index = row.flow === 1 ? 2 : 1;
        return row.nums[index];
      });
    case "outer":
    case "exterior":
    case "bahya":
      return kotaCakraGroups.map(row => {
        const index = row.flow === 1 ? 3 : 0;
        return row.nums[index];
      });
    default:
    	return matchKotaCakraDirection(type);
  }
}

export const sulaCakraGroups = [
  { key: 'trident', nums: [8, 16, 22, 28] },
  { key: 'next', nums: [1, 7, 9, 15, 17, 21, 23, 27] },
  { key: 'other', nums:    [2,  3,  4,  5,  6, 10, 11, 12, 13, 14, 18, 19, 20, 24, 25, 26] }
];

const matchSulaCakaraGroup = (type = "") => {
	const group = sulaCakraGroups.find(gr => gr.key === type);
	return group instanceof Object ? group.nums : [];
}

export const matchSulaCakaraType = (type = "") => {
	switch (type) {
		case "trident":
		case "next":
			return matchSulaCakaraGroup(type);
		default:
			return matchSulaCakaraGroup('other');
	}
}

export default nakshatraValues;
