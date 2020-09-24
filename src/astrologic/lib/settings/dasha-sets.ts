const dashaSets = [
  {
    key: 'vimshottari',
    years: 120,
    mode: 'repeat',
    lengthType: 'graha',
    length: 9,
    nakshatraMatches: [
      { years: 7, key: 'ke' },
      { years: 20, key: 've' },
      { years: 6, key: 'su' },
      { years: 10, key: 'mo' },
      { years: 7, key: 'ma' },
      { years: 18, key: 'ra' },
      { years: 16, key: 'ju' },
      { years: 19, key: 'sa' },
      { years: 17, key: 'me' },
    ],
  },
  /*
  SU3, MA3, JU3, SA3, KE3, MO3, ME3, VE3
  */
  {
    key: 'shodshottari',
    years: 116,
    mode: 'exact',
    startIndex: 7,
    lengthType: 'nakshatra',
    length: 8,
    nakshatraMatches: [
      { key: 'ke', years: 15 },
      { key: 'ma', years: 16 },
      { key: 'me', years: 17 },
      { key: 've', years: 18 },
      { key: 'su', years: 11 },
      { key: 'ma', years: 12 },
      { key: 'ju', years: 13 },
      { key: 'su', years: 11 }, // 8
      { key: 'ma', years: 12 },
      { key: 'ju', years: 13 },
      { key: 'sa', years: 14 },
      { key: 'ke', years: 15 },
      { key: 'ma', years: 16 },
      { key: 'me', years: 17 },
      { key: 've', years: 18 },
      { key: 'su', years: 11 }, // 16
      { key: 'ma', years: 12 },
      { key: 'ju', years: 13 },
      { key: 'sa', years: 14 },
      { key: 'ke', years: 15 },
      { key: 'ma', years: 16 },
      { key: 'me', years: 17 },
      { key: 've', years: 18 },
      { key: 'su', years: 11 }, // 24
      { key: 'ma', years: 12 },
      { key: 'ju', years: 13 },
      { key: 'sa', years: 14 },
    ],
  },
  {
    key: 'dvadashottari',
    years: 112,
    mode: 'reverse',
    lengthType: 'nakshatra',
    length: 8,
    nakshatraMatches: [
      { key: 'ke', years: 11 },
      { key: 'ju', years: 9 },
      { key: 'su', years: 7 },
      { key: 'mo', years: 21 }, // -24
      { key: 'sa', years: 19 },
      { key: 'ma', years: 17 },
      { key: 'me', years: 13 },
      { key: 'ra', years: 15 },
      { key: 'ke', years: 11 },
      { key: 'ju', years: 9 },
      { key: 'su', years: 7 },
      { key: 'mo', years: 21 }, // -16
      { key: 'sa', years: 19 },
      { key: 'ma', years: 17 },
      { key: 'ra', years: 15 },
      { key: 'me', years: 13 },
      { key: 'ke', years: 11 },
      { key: 'ju', years: 9 },
      { key: 'su', years: 7 },
      { key: 'mo', years: 21 }, // -8
      { key: 'sa', years: 19 },
      { key: 'ma', years: 17 },
      { key: 'ra', years: 15 },
      { key: 'me', years: 13 },
      { key: 'ke', years: 11 },
      { key: 'ju', years: 9 },
      { key: 'su', years: 7 },
    ],
  },
  {
    key: 'panchottari',
    years: 105,
    mode: 'exact',
    lengthType: 'nakshatra',
    length: 7,
    nakshatraMatches: [
      { key: 've', years: 16 },
      { key: 'mo', years: 17 },
      { key: 'ju', years: 18 },
      { key: 'su', years: 12 },
      { key: 'me', years: 13 },
      { key: 'sa', years: 14 },
      { key: 'ma', years: 15 },
      { key: 've', years: 16 },
      { key: 'mo', years: 17 },
      { key: 'ju', years: 18 },
      { key: 'su', years: 12 },
      { key: 'me', years: 13 },
      { key: 'sa', years: 14 },
      { key: 'ma', years: 15 },
      { key: 've', years: 16 },
      { key: 'mo', years: 17 },
      { key: 'su', years: 12 },
      { key: 'me', years: 13 },
      { key: 'sa', years: 14 },
      { key: 'ma', years: 15 },
      { key: 've', years: 16 },
      { key: 'mo', years: 17 },
      { key: 'ju', years: 18 },
      { key: 'su', years: 12 },
      { key: 'me', years: 13 },
      { key: 'sa', years: 14 },
      { key: 'ma', years: 15 },
    ],
  },
  {
    key: 'shadabtika',
    years: 100,
    mode: 'exact',
    lengthType: 'nakshatra',
    length: 7,
    nakshatraMatches: [
      { key: 'mo', years: 5 },
      { key: 've', years: 10 },
      { key: 'me', years: 10 },
      { key: 'ju', years: 20 },
      { key: 'ma', years: 20 },
      { key: 'sa', years: 30 },
      { key: 'su', years: 5 },
      { key: 'mo', years: 5 },
      { key: 've', years: 10 },
      { key: 'me', years: 10 },
      { key: 'ju', years: 20 },
      { key: 'ma', years: 20 },
      { key: 'sa', years: 30 },
      { key: 'su', years: 5 },
      { key: 'mo', years: 5 },
      { key: 've', years: 10 },
      { key: 'me', years: 10 },
      { key: 'ju', years: 20 },
      { key: 'ma', years: 20 },
      { key: 'sa', years: 30 },
      { key: 'su', years: 5 },
      { key: 'mo', years: 5 },
      { key: 've', years: 10 },
      { key: 'me', years: 10 },
      { key: 'ju', years: 20 },
      { key: 'ma', years: 20 },
      { key: 'su', years: 5 },
    ],
  },
  {
    key: 'chaturashitisama',
    years: 84,
    mode: 'exact',
    lengthType: 'nakshatra',
    length: 7,
    nakshatraMatches: [
      { key: 'sa', years: 12 },
      { key: 'su', years: 12 },
      { key: 'mo', years: 12 },
      { key: 'ma', years: 12 },
      { key: 'me', years: 12 },
      { key: 'ju', years: 12 },
      { key: 've', years: 12 },
      { key: 'sa', years: 12 },
      { key: 'su', years: 12 },
      { key: 'mo', years: 12 },
      { key: 'ma', years: 12 },
      { key: 'me', years: 12 },
      { key: 'ju', years: 12 },
      { key: 've', years: 12 },
      { key: 'su', years: 12 },
      { key: 'mo', years: 12 },
      { key: 'ma', years: 12 },
      { key: 'me', years: 12 },
      { key: 'ju', years: 12 },
      { key: 've', years: 12 },
      { key: 'sa', years: 12 },
      { key: 'su', years: 12 },
      { key: 'mo', years: 12 },
      { key: 'ma', years: 12 },
      { key: 'me', years: 12 },
      { key: 'ju', years: 12 },
      { key: 've', years: 12 },
    ],
  },
  {
    key: 'dvisaptisama',
    years: 72,
    mode: 'exact',
    lengthType: 'nakshatra',
    length: 7,
    nakshatraMatches: [
      { key: 'mo', years: 9 },
      { key: 'ma', years: 9 },
      { key: 'me', years: 9 },
      { key: 'ju', years: 9 },
      { key: 've', years: 9 },
      { key: 'sa', years: 9 },
      { key: 'ra', years: 9 },
      { key: 'su', years: 9 },
      { key: 'mo', years: 9 },
      { key: 'ma', years: 9 },
      { key: 'me', years: 9 },
      { key: 'ju', years: 9 },
      { key: 've', years: 9 },
      { key: 'sa', years: 9 },
      { key: 'ra', years: 9 },
      { key: 'su', years: 9 },
      { key: 'mo', years: 9 },
      { key: 'ma', years: 9 },
      { key: 'su', years: 9 },
      { key: 'mo', years: 9 },
      { key: 'ma', years: 9 },
      { key: 'me', years: 9 },
      { key: 'ju', years: 9 },
      { key: 've', years: 9 },
      { key: 'sa', years: 9 },
      { key: 'ra', years: 9 },
      { key: 'su', years: 9 },
    ],
  },
  {
    key: 'shadtrimshasama',
    years: 36,
    mode: 'exact',
    lengthType: 'nakshatra',
    length: 8,
    nakshatraMatches: [
      { key: 've', years: 7 },
      { key: 'ra', years: 8 },
      { key: 'mo', years: 1 },
      { key: 'su', years: 2 },
      { key: 'ju', years: 3 },
      { key: 'ma', years: 4 },
      { key: 'me', years: 5 },
      { key: 'sa', years: 6 },
      { key: 've', years: 7 },
      { key: 'ra', years: 8 },
      { key: 'mo', years: 1 },
      { key: 'su', years: 2 },
      { key: 'ju', years: 3 },
      { key: 'ma', years: 4 },
      { key: 'me', years: 5 },
      { key: 'sa', years: 6 },
      { key: 've', years: 7 },
      { key: 'ra', years: 8 },
      { key: 'mo', years: 1 },
      { key: 'su', years: 2 },
      { key: 'ju', years: 3 },
      { key: 'mo', years: 1 },
      { key: 'su', years: 2 },
      { key: 'ju', years: 3 },
      { key: 'ma', years: 4 },
      { key: 'me', years: 5 },
      { key: 'sa', years: 6 },
    ],
  },
  {
    key: 'ashtottari',
    years: 108,
    mode: 'range',
    lengthType: 'nakshatra28',
    length: 8,
    nakshatraMatches: [
      { key: 'ra', from: 26, to: 2, years: 12 },
      { key: 've', from: 3, to: 5, years: 21 },
      { key: 'su', from: 6, to: 9, years: 6 },
      { key: 'mo', from: 10, to: 12, years: 15 },
      { key: 'ma', from: 13, to: 16, years: 8 },
      { key: 'me', from: 17, to: 19, years: 17 },
      { key: 'sa', from: 20, to: 23, years: 10 },
      { key: 'ju', from: 24, to: 26, years: 19 },
    ],
  },
  {
    key: 'shashtihayani',
    years: 60,
    mode: 'range',
    lengthType: 'nakshatra28',
    length: 8,
    nakshatraMatches: [
      { key: 'ju', from: 1, to: 3, years: 10 },
      { key: 'su', from: 4, to: 7, years: 10 },
      { key: 'ma', from: 8, to: 10, years: 10 },
      { key: 'mo', from: 11, to: 14, years: 6 },
      { key: 'me', from: 15, to: 17, years: 6 },
      { key: 've', from: 18, to: 21, years: 6 },
      { key: 'sa', from: 22, to: 24, years: 6 },
      { key: 'ra', from: 25, to: 28, years: 6 },
    ],
  },
];

export default dashaSets;