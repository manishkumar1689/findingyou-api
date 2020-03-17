const karanaData = {
  karanas: [
    { name: "bava", ruler: "su", locations: [2, 9, 16, 23, 30, 37, 44, 51], bm: "benefic", type: "moving", deity: "Indra" },
    { name: "bālava", ruler: "mo", locations: [3, 10, 17, 24, 31, 38, 45, 52], bm: "benefic", type: "moving", deity: "Brahma" },
    { name: "kaulava", ruler: "ma", locations: [4, 11, 18, 25, 32, 39, 46, 53], bm: "benefic", type: "moving", deity: "Mitra" },
    { name: "taitila", ruler: "me", locations: [5, 12, 19, 26, 33, 40, 47, 54], bm: "benefic", type: "moving", deity: "Viśvakarman" },
    { name: "garaja", ruler: "ju", locations: [6, 13, 20, 27, 34, 41, 48, 55], bm: "benefic", type: "moving", deity: "Bhūmi" },
    { name: "vaṇija", ruler: "ve", locations: [7, 14, 21, 28, 35, 42, 49, 56], bm: "benefic", type: "moving", deity: "Lakṣmi" },
    { name: "viṣṭi", ruler: "sa", locations: [8, 15, 22, 29, 36, 43, 50, 57], bm: "malefic", type: "moving", deity: "Yama" },
    { name: "śakuni", ruler: "ra", locations: [58], bm: "malefic", type: "fixed", deity: "Kāli" },
    { name: "nāga", ruler: "ke", locations: [59], bm: "malefic", type: "fixed", deity: "Rudra" },
    { name: "catuṣpāda", ruler: "ra", locations: [60], bm: "malefic", type: "fixed", deity: "Nāgas" },
    { name: "kiṃstughna", ruler: "ke", locations: [1], bm: "malefic", type: "fixed", deity: "Maruta" },
  ],
  karanesha: [
    { ruler: "su", "5th": "ju", "6th": "ve", },
    { ruler: "mo", "5th": "ve", "6th": "sa", },
    { ruler: "ma", "5th": "sa", "6th": "ra", },
    { ruler: "me", "5th": "ra", "6th": "ke", },
    { ruler: "ju", "5th": "ke", "6th": "su", },
    { ruler: "ve", "5th": "su", "6th": "mo", },
    { ruler: "sa", "5th": "mo", "6th": "ma", },
    { ruler: "ra", "5th": "ma", "6th": "me", },
    { ruler: "ke", "5th": "me", "6th": "ju", }
  ],
}

export default karanaData;