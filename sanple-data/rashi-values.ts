/*
   NEIL, I put the dictionary key for the rashis in the en attribute 
         that used to have the english names of the signs.
         Perhaps a better attribute name. I doubt this have been used 
         in calculation of logic
*/
/*
prefixes:
rashi key:  rashi__
element: bhuta__
mobility: rashi__mfd__
*/
const rashiValues = [
  { num: 1, key: 'ar', ruler: 'ma', element: 'agni', mobility: 'movable' },
  { num: 2, key: 'ta', ruler: 've', element: 'prithvi', mobility: 'fixed' },
  { num: 3, key: 'ge', ruler: 'me', element: 'vayu', mobility: 'dual' },
  { num: 4, key: 'ca', ruler: 'mo', element: 'jala', mobility: 'movable' },
  { num: 5, key: 'le', ruler: 'su', element: 'agni', mobility: 'fixed' },
  { num: 6, key: 'vi', ruler: 'me', element: 'prithvi', mobility: 'dual' },
  { num: 7, key: 'li', ruler: 've', element: 'vayu', mobility: 'movable' },
  { num: 8, key: 'sc', ruler: 'ma', element: 'jala', mobility: 'fixed' },
  { num: 9, key: 'sa', ruler: 'ju', element: 'agni', mobility: 'dual' },
  { num: 10, key: 'cp', ruler: 'sa', element: 'prithvi', mobility: 'movable' },
  { num: 11, key: 'aq', ruler: 'sa', element: 'vayu', mobility: 'fixed' },
  { num: 12, key: 'pi', ruler: 'ju', element: 'jala', mobility: 'dual' },
];

export default rashiValues;
