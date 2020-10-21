const karanaData = {
  karanas: [
    { name: "karana__1", ruler: "su", locations: [2, 9, 16, 23, 30, 37, 44, 51], bm: "guna__b", type: "karana__mov", deity: "devata__indra" },
    { name: "karana__2", ruler: "mo", locations: [3, 10, 17, 24, 31, 38, 45, 52], bm: "guna__b", type: "karana__mov", deity: "devata__brahma" },
    { name: "karana__3", ruler: "ma", locations: [4, 11, 18, 25, 32, 39, 46, 53], bm: "guna__b", type: "karana__mov", deity: "devata__mitra" },
    { name: "karana__4", ruler: "me", locations: [5, 12, 19, 26, 33, 40, 47, 54], bm: "guna__b", type: "karana__mov", deity: "devata__vishvakarma" },
    { name: "karana__5", ruler: "ju", locations: [6, 13, 20, 27, 34, 41, 48, 55], bm: "guna__b", type: "karana__mov", deity: "devata__bhumi" },
    { name: "karana__6", ruler: "ve", locations: [7, 14, 21, 28, 35, 42, 49, 56], bm: "guna__b", type: "karana__mov", deity: "devata__lakshmi" },
    { name: "karana__7", ruler: "sa", locations: [8, 15, 22, 29, 36, 43, 50, 57], bm: "guna__m", type: "karana__mov", deity: "devata__yama" },
    { name: "karana__8", ruler: "ra", locations: [58], bm: "guna__m", type: "karana__fix", deity: "devata__kali" },
    { name: "karana__9", ruler: "ke", locations: [59], bm: "guna__m", type: "karana__fix", deity: "devata__rudra" },
    { name: "karana__10", ruler: "ra", locations: [60], bm: "guna__m", type: "karana__fix", deity: "devata__naga" },
    { name: "karana__11", ruler: "ke", locations: [1], bm: "guna__m", type: "karana__fix", deity: "devata__maruta" },
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