/* 
parivṛtti (cyclical) 

 (Classical Ca/Le (Standard Parāśara), Umā-Śambhu)

   dreṣkāṇa (Standard Parāśara, Umā-Śambhu)
   turyāṃśa (Standard Parāśara, Parivṛtti (cyclical) D4 / H4)
   (Standard Parāśara, Parivṛtti (cyclical) D5 / H5)
   (Standard Parāśara, Phala Dīpika / Iyer, Parivṛtti (cyclical)??)
   (Iyer Labhāṁśa, Tajik Ekadaśāṁśa, Zodiacal Pt. Rath, Anti-Zodiacal Dr. B.V. Raman)
*/
const vargaValues = [
  {
    key: "d01", num: 1, name: "janma", alt: [""],
    parashari: true, tajik: true, nadi: true
  },
  {
    key: "d02", num: 2, name: "hora", alt: ["umā-śambhu"],
    parashari: true, tajik: true, nadi: true
  },
  {
    key: "d03", num: 3, name: "drekkāṇa", alt: ["dreṣkāṇa"],
    parashari: true, tajik: true, nadi: true
  },
  {
    key: "d04", num: 4, name: "caturthāṃśa", alt: ["turyāṃśa"],
    parashari: true, tajik: true, nadi: true
  },
  {
    key: "d07", num: 7, name: "saptāṃśa", alt: [""],
    parashari: true, tajik: true, nadi: true
  },
  {
    key: "d09", num: 9, name: "navāṃśa", alt: [""],
    parashari: true, tajik: true, nadi: true
  },
  {
    key: "d10", num: 10, name: "daśāṃśa", alt: [""],
    parashari: true, tajik: true, nadi: true
  },
  {
    key: "d12", num: 12, name: "dvādaśāṃśa", alt: [""],
    parashari: true, tajik: true, nadi: true
  },
  {
    key: "d16", num: 16, name: "ṣoḍāśāṃśa", alt: ["kalamsa"],
    parashari: true, tajik: true, nadi: true
  },
  {
    key: "d20", num: 20, name: "viṁśāṃśa", alt: [""],
    parashari: true, tajik: true, nadi: true
  },
  {
    key: "d24", num: 24, name: "caturviṃśāṃśa", alt: ["siddhāṁśa"],
    parashari: true, tajik: true, nadi: true
  },
  {
    key: "d27", num: 27, name: "saptaviṃśāṃśa", alt: ["nakṣatrāṁśa", "bhamśa"],
    parivritti: false, parashari: true, tajik: true, nadi: true
  },
  // (Standard Parāśara, Parivṛtti (cyclical), Ṣaṣṭyaṁśa like Triṁṣāṁśa)
  {
    key: "d30", num: 30, name: "triṁśāṃśa", alt: ["triṁṣāṁśa"],
    parashari: true, tajik: true, nadi: true
  },
  {
    key: "d40", num: 40, name: "khavedāṃśa", alt: [""],
    parashari: true, tajik: true, nadi: true
  },
  {
    key: "d45", num: 45, name: "akṣavedāṃśa", alt: [""],
    parashari: true, tajik: true, nadi: true
  },
  {
    key: "d60", num: 60, name: "ṣaṣṭhāṃśa", alt: ["ṣaṣṭyaṁśa"],
    parashari: true, tajik: false, nadi: true
  },
  {
    key: "d05", num: 5, name: "pañcāṁśa", alt: [""],
    parashari: false, tajik: true, nadi: false
  },
  {
    key: "d06", num: 6, name: "ṣaṣtāṁśa", alt: [""],
    parashari: false, tajik: true, nadi: false
  },
  {
    key: "d08", num: 8, name: "aṣṭhāṁśa", alt: [""],
    parashari: false, tajik: true, nadi: false
  },
  // (Parivṛtti (cyclical) D8/ H8, Continuous & regular, Tattva based Discontinuous Dṛ. B.V. Raman)
  {
    key: "d11", num: 11, name: "rudrāṁśa", alt: ["labhāṁśa", "ekadaśāṁśa"],
    parashari: false, tajik: true, nadi: false
  },
  {
    key: "d72", num: 72, name: "aṣṭha-navāṁśa", alt: [""],
    parashari: false, tajik: false, nadi: true
  },
  {
    key: "d81", num: 81, name: "nava-navāṁśa", alt: [""],
    parashari: false, tajik: false, nadi: true
  },
  {
    key: "d108", num: 108, name: "aṣṭoṭṭarāṁśa", alt: ["nava-dvādaśāṃśa", "dvādaśa-navāṁśa"],
    parashari: false, tajik: false, nadi: true
  },
  {
    key: "d144", num: 144, name: "dvadaśa-dvadaśāṁśa", alt: [""],
    parashari: false, tajik: false, nadi: true
  },
  {
    key: "d150", num: 150, name: "naḍiaṁśa", alt: ["candraa-kalāṁśa"],
    parashari: false, tajik: false, nadi: true
  },
  {
    key: "d300", num: 300, name: "ardha naḍiaṁśa", alt: [""],
    parashari: false, tajik: false, nadi: true
  },
];

export default vargaValues;