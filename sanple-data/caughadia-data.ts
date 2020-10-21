const caughadiaData = {
  values: [
    /* Daytime:   (sunset - sunrise) / 8. 
       First part ruled by the ruler of the day, then next etc. 
       Last part (8th) also ruled by the day ruler */

    /* Nighttime: (sunrise (next day) - sunset) / 8. 
       First and last part ruled by the ruler of the day +5 (or -2) (night attribute) */

    /* Sunday daytime starts with "udvega", nightime with "śubha",
       Monday starts with "amṛta", nightime with "cala",
       Tuesday starts with "roga", nightime with "kāla",
       Wednesday starts with "lābha", nightime with "udvega",
       Thursday starts with "śubha", nightime with "amṛta",
       Friday starts with "cala", nightime with "roga",
       Saturday starts with "kāla", nightime with "lābha",
       */
    { num: 1, name: 'caughadia_1', ruler: 'su', result: 'guna__m' },
    { num: 2, name: 'caughadia_2', ruler: 've', result: 'guna__n' },
    { num: 3, name: 'caughadia_3', ruler: 'me', result: 'guna__b' },
    { num: 4, name: 'caughadia_4', ruler: 'mo', result: 'guna__b' },
    { num: 5, name: 'caughadia_5', ruler: 'sa', result: 'guna__m' },
    { num: 6, name: 'caughadia_6', ruler: 'ju', result: 'guna__b' },
    { num: 7, name: 'caughadia_7', ruler: 'ma', result: 'guna__m' },
    /*
      { num:1, name:"udvega", ruler:"su", night:"śubha", res:"aśubha", result:"inauspicious" },
      { num:2, name:"cala", ruler:"ve", night:"roga", res:"sāmānya", result:"average" },
      { num:3, name:"lābha", ruler:"me", night:"kāla", res:"śubha ", result:"auspicious" },
      { num:4, name:"amṛta", ruler:"mo", night:"udvega", res:"śubha", result:"auspicious" },
      { num:5, name:"kāla", ruler:"sa", night:"amṛta", res:"aśubha", result:"inauspicious" },
      { num:6, name:"śubha", ruler:"ju", night:"", res:"śubha", result:"auspicious" },
      { num:7, name:"roga", ruler:"ma", night:"lābha", res:"aśubha", result:"inauspicious" },
      */
  ],
  days: [
    { day: 0, dayStart: 1, nightStart: 6 },
    { day: 1, dayStart: 4, nightStart: 2 },
    { day: 2, dayStart: 7, nightStart: 5 },
    { day: 3, dayStart: 3, nightStart: 1 },
    { day: 4, dayStart: 6, nightStart: 4 },
    { day: 5, dayStart: 2, nightStart: 7 },
    { day: 6, dayStart: 5, nightStart: 3 },
  ],
};

export default caughadiaData;
