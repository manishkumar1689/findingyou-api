const upagrahaData = {
  daytime: [
    { day: 0, parts: ["su", "mo", "ma", "me", "ju", "ve", "sa", ""] },
    { day: 1, parts: ["mo", "ma", "me", "ju", "ve", "sa", "", "su"] },
    { day: 2, parts: ["ma", "me", "ju", "ve", "sa", "", "su", "mo"] },
    { day: 3, parts: ["me", "ju", "ve", "sa", "", "su", "mo", "ma"] },
    { day: 4, parts: ["ju", "ve", "sa", "", "su", "mo", "ma", "me"] },
    { day: 5, parts: ["ve", "sa", "", "su", "mo", "ma", "me", "ju"] },
    { day: 6, parts: ["sa", "", "su", "mo", "ma", "me", "ju", "ve"] },
  ],
  nighttime: [
    { day: 0, parts: ["ju", "ve", "sa", "", "su", "mo", "ma", "me"] },
    { day: 1, parts: ["ve", "sa", "", "su", "mo", "ma", "me", "ju"] },
    { day: 2, parts: ["sa", "", "su", "mo", "ma", "me", "ju", "ve"] },
    { day: 3, parts: ["su", "mo", "ma", "me", "ju", "ve", "sa", ""] },
    { day: 4, parts: ["mo", "ma", "me", "ju", "ve", "sa", "", "su"] },
    { day: 5, parts: ["ma", "me", "ju", "ve", "sa", "", "su", "mo"] },
    { day: 6, parts: ["me", "ju", "ve", "sa", "", "su", "mo", "ma"] },
  ],
  refs: [
    { name: "Kāla", key: "ka", body: "su", position: 0.5 },
    { name: "Mṛtyu", key: "mr", body: "ma", position: 0.5 },
    { name: "Yamaghaṇṭka", key: "ya", body: "ju", position: 0.5 },
    { name: "Ardhaprahara", key: "ar", body: "me", position: 0.5 },
    { name: "Gulika", key: "gu", body: "sa", position: 0 },
  ],
}

export default upagrahaData;