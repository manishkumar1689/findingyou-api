/*
   Pañcaka-maitri (5 fold Planetary Relationships)

   natural relationship: done (array below)

   temporary relationships: Number of Bhavas/(Rashis) the 2nd planet is
     friend:{ 2,3,4,10,11,12 },
     enemy:{ 1,5,6,7,8,9 },

   Compound relationships: NATURAL + TEMPORARY
     greatFriend:[{natural: "friend",temporary: "friend"}],
          Friend:[{natural: "neutral", temporary: "friend"}],
         Neutral:[{natural: "friend", temporary: "enemy"},{natural: "enemy",temporary: "friend"}]
           Enemy:{"neutral","enemy"},
      greatEnemy:{"enemy","enemy"},

DIGNITIES:
    8. Exaltation         ucca (उच्च)
    7. Root Triangle      mūlatrikona (मूलत्रिकोन)
    6. Own Field (sign)   svakṣetra (स्वक्षेत्र)
    5. Best friend        adhi mitra (अधि मित्र)
    4. Friend             mitra (मित्र)
    3. Neutral            sama (सम)
    2. Enemy              śatru (शत्रु)
    1. Arch enemy        adhi śatru (अधि शत्रु)
    0. Debilitation       nīca (नीच)
*/
const maitriData = {
  natural: [
    { graha: "su", friends: ["mo", "ma", "ju"], neutral: ["me"], enemies: ["ve", "sa"] },
    { graha: "mo", friends: ["su", "me"], neutral: ["ma", "ju", "ve", "sa"], enemies: [], },
    { graha: "ma", friends: ["su", "mo", "ju"], neutral: ["ve", "sa"], enemies: ["me"] },
    { graha: "me", friends: ["su", "ve"], neutral: ["ma", "ju", "sa"], enemies: ["mo"] },
    { graha: "ju", friends: ["su", "mo", "ma"], neutral: ["sa"], enemies: ["me", "ve"] },
    { graha: "ve", friends: ["me", "sa"], neutral: ["ma", "ju"], enemies: ["su", "mo"] },
    { graha: "sa", friends: ["me", "ve"], neutral: ["ju"], enemies: ["su", "mo", "ma"] },
    { graha: "ra", friends: [], neutral: [], enemies: [] },
    { graha: "ke", friends: [], neutral: [], enemies: [] },
  ],
  temporary: {
    friend: [2, 3, 4, 10, 11, 12],
    enemy: [1, 5, 6, 7, 8, 9]
  },
  compound: {
    bestFriend: [{ natural: "friend", temporary: "friend" }],
    friend: [{ natural: "neutral", temporary: "friend" }],
    neutral: [{ natural: "friend", temporary: "enemy" }, { natural: "enemy", temporary: "friend" }],
    enemy: [{ natural: "neutral", temporary: "enemy" }],
    archEnemy: [{ natural: "enemy", temporary: "enemy" }],
  },
  dictName: {
    exalted:     "dignity__8_uc",
    mulaTrikon:  "dignity__7_mt",
    ownSign:     "dignity__6_sv",
    bestFriend:  "dignity__5_am",
    friend:      "dignity__4_mi",
    neutral:     "dignity__3_sa",
    enemy:       "dignity__2_sh",
    archEnemy:   "dignity__1_as",
    debilitated: "dignity__0_ni"
  }
};

export default maitriData;