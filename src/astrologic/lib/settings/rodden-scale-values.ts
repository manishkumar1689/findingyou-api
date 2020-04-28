const roddenScaleValues = [
  {
    key: 'AAA',
    name: 'Highly accurate',
    description: `Birthtime (moment the baby leaves the mother's body and/or time of first breath) clocked to the second with a highly accurate clock`,
  },
  {
    key: 'AA',
    name: 'Recorded time',
    description: `"Data as recorded by the family or state. This includes BC (birth certificate), and BR (birth record), that which is not an official document but a quote of the birth record from the Registrar or Bureau of Records, the baptismal certificate, family Bible, or baby book. These data reflect the best available accuracy.Taeger data groups: 1*,1F"`,
  },
  {
    key: 'AAR',
    name: 'Rectified from recorded time',
    description: `Rectified time from a recorded time`,
  },
  {
    key: 'AAX',
    name: 'Official untimed source',
    description: `"Date from an official source, but no time (??? Same as AX ???)"`,
  },
  {
    key: 'AX',
    name: 'Documented untimed source',
    description: `"Records without a time, such as church records, etc. (same as AAX???)"`,
  },
  {
    key: 'A',
    name: 'Fairly Accurate',
    description: `"Data as quoted by the person, kin, friend, or associate. These data all come from someone's memory, family legend, or hearsay. "`,
  },
  {
    key: 'AR',
    name: 'Rectified from quoted time',
    description: `Rectified time from a quoted time (memory or otherwise)`,
  },
  {
    key: 'B',
    name: 'Biography',
    description: `"Biography or autobiography. When these data are substantiated by a quote that qualifies the information, they are considered reliable. "`,
  },
  {
    key: 'BR',
    name: 'Rectified from biography time',
    description: `Rectified time from a time given in a biography or newspaper (?)`,
  },
  {
    key: 'C',
    name: 'Caution',
    description: `"Caution, no source. These data are also listed as ""OSNK, Original Source Not Known"". They are undocumented data, often given in magazines or journals, with no source, or an ambiguous source such as ""personal"" or ""archives."""`,
  },
  {
    key: 'CR',
    name: 'Rectified from biography time',
    description: `Rectified time from a time given in a biography or newspaper (?)`,
  },
  {
    key: 'DD',
    name: 'Dirty Data',
    description: `Two or more conflicting quotes that are unqualified. These data are offered as a reference in order to document their lack of reliability and prevent their being presented elsewhere as factual.`,
  },
  {
    key: 'DDR',
    name: 'Rectified from confilicting time info',
    description: `Rectified time from conflicting and unqualified time`,
  },
  {
    key: 'X',
    name: 'No known time',
    description: `Data with no time of birth. Untimed data may be of interest in the examination of planetary patterns. (not for rectified time as it used to)`,
  },
  {
    key: 'XR',
    name: 'Rectified from know date / unknown time',
    description: `"Rectified time from unknown time, with only date known"`,
  },
  {
    key: 'XX',
    name: 'No known date/time',
    description: `Data without a known or confirmed date. Historic figures or certain current news figures may be of interest even with speculative birth dates.`,
  },
  {
    key: 'XXR',
    name: 'Rectified from no date/time knowledge',
    description: `"Rectified date and time from unknown date and time (like Jesus, Buddha, etc)"`,
  },
  {
    key: 'R',
    name: 'Rectified from unspecified ',
    description: `Rectified time from unspecified data rating. Rectified times that don't start from an approximate time`,
  },
];

export default roddenScaleValues;
