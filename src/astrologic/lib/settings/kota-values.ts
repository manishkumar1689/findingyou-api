import { smartCastFloat } from "../../../lib/converters";
import { KeyNumValue } from "../../../lib/interfaces";
import { calcInclusiveDistance } from "../math-funcs";
import { Chart } from "../models/chart";

const kotaPaalaValues = [
  ["ve","ve","ve","mo"],
  ["mo","mo","mo","mo"],
  ["su","su","su","su"],
  ["su","mo","mo","mo"],
  ["mo","mo","ma","ma"],
  ["ma","ma","ma","ve"],
  ["ma","ma","mo","mo"],
  ["mo","mo","mo","me"],
  ["me","me","me","me"],
  ["sa","sa","sa","sa"],
  ["sa","me","me","me"],
  ["me","me","sa","sa"],
  ["sa","mo","me","me"],
  ["sa","sa","mo","mo"],
  ["mo","mo","mo","ju"],
  ["ju","ju","ju","ju"],
  ["ju","ju","ju","ju"],
  ["ju","mo","mo","mo"],
  ["mo","mo","sa","sa"],
  ["sa","ju","sa","me"],
  ["sa","sa","ve","ve"],
  ["ma","ma","ma","ma"],
  ["ma","ma","ma","ma"],
  ["ma","mo","mo","mo"],
  ["mo","mo","ju","ju"],
  ["ju","ju","ve","ve"],
  ["ju","ju","ve","ve"]
];

const padNakIndices = (deg: number): number[] => {
	const degPerNak = (360/27);
	const padaIndex = Math.floor(deg / (degPerNak / 4))  % 4;
	const nakIndex = Math.floor(deg / degPerNak);
	return [nakIndex, padaIndex];
}

export const matchKotaPala = (deg: number): string => {
	const [nakIndex, padaIndex] = padNakIndices(deg);
	return nakIndex < kotaPaalaValues.length && padaIndex < 4? kotaPaalaValues[nakIndex][padaIndex] : "";
}
export class KotaCakraScoreItem {

  direct = 0;

  retro = 0;

  constructor(inData = null) {
    if (inData instanceof Object) {
      Object.entries(inData).forEach(([k, v]) => {
        if (typeof v === 'number') {
          switch (k) {
            case "direct":
              this.direct = v;
              break;
            case "retro":
              this.retro = v;
              break;
          }
        }
      })
    } else if (typeof inData === 'number') {
      this.direct = inData;
      this.retro = inData;
    }
  }

  getValue(retro = false) {
    return retro? this.retro : this.direct;
  }

}

export class KotaCakraScore {

  distance = 0;

  malefic = new KotaCakraScoreItem();

  benefic = new KotaCakraScoreItem();

  svami = new KotaCakraScoreItem();

  pala = new KotaCakraScoreItem();

  node = new KotaCakraScoreItem();

  constructor(inData = null, distance = 0) {
    this.distance = distance;
    if (inData instanceof Object) {
      Object.entries(inData).forEach(([k, v]) => {
        switch (k) {
          case "mal":
            this.malefic = new KotaCakraScoreItem(v); ;
            break;
          case "ben":
            this.benefic = new KotaCakraScoreItem(v); ;
            break;
          case "svami":
            this.svami = new KotaCakraScoreItem(v); ;
            break;
          case "pala":
            this.pala = new KotaCakraScoreItem(v); ;
            break;
          case "node":
            this.node = new KotaCakraScoreItem(v); ;
            break;
        }
      })
    }
  }
}

export class KotaCakraScoreSet {

  scores: KotaCakraScore[] = [];

  svamiOffsets: KeyNumValue[] = [];

  palaOffsets: KeyNumValue[] = [];

  malefics: string[] = [];

  benefics: string[] = [];

  constructor(inData = null) {
    if (inData instanceof Object) {
      
      Object.entries(inData).forEach(([k, v]) => {
        const key = k.toLowerCase();
        switch (key) {
          case 'scores':
            this.setScores(v);
            break;
          case 'svami_pala':
          case 'svamipala':
            this.setSvamiPala(v);
            break;
          case 'grahas':
          case 'graha':
            this.setMalBen(v);
            break;
        }
      })
    }
  }

  setScores(scores = null) {
    if (scores instanceof Array) {
      this.scores = scores.map((sc, si) => new KotaCakraScore(sc, si + 1));
    }
  }

  setSvamiPala(value = null) {
    if (value instanceof Object) {
      if (value.svami instanceof Object) {
        this.svamiOffsets = Object.entries(value.svami).map(([key,value]) => {
          return { 
            key,
            value: smartCastFloat(value)
          }
        })
      }
      if (value.pala instanceof Object) {
        this.palaOffsets = Object.entries(value.pala).map(([key,value]) => {
          return { 
            key,
            value: smartCastFloat(value)
          }
        })
      }
    }
  }

  setMalBen(value = null) {
    if (value instanceof Object) {
      if (value.ben instanceof Array) {
        this.benefics = value.ben;
      }
      if (value.mal instanceof Array) {
        this.malefics = value.mal;
      }
    }
  }

  svamiPalaOffset(key = '', svami = true): number {
    const rows = svami? this.svamiOffsets : this.palaOffsets;
    const row = rows.find(row => row.key === key);
    return row instanceof Object ? row.value : 0;
  }

  svamiOffset(key = ''): number {
    return this.svamiPalaOffset(key, true);
  }

  palaOffset(key = ''): number {
    return this.svamiPalaOffset(key, false);
  }

  calc(key = '', distance = 0, retro = false, svami = '', pala = ''): number {
    const scoreRow = this.scores.find(sc => sc.distance === distance);
    let score = 0;
    if (scoreRow instanceof KotaCakraScore) {
      const isNode = ['ra', 'ke'].includes(key);
      const isPala = key === pala;
      const isSvami = key === svami;
      const isNotSpecial = !isNode && !isSvami && !isPala;
      const isMalefic = isNotSpecial && this.malefics.includes(key);
      const isBenefic = isNotSpecial && this.benefics.includes(key);
      if (isNode) {
        score = scoreRow.node.getValue(retro);
      } else if (isPala) {
        score = scoreRow.pala.getValue(retro) + this.palaOffset(key);
      } else if (isSvami) {
        score = scoreRow.svami.getValue(retro) + this.svamiOffset(key);
      } else if (isBenefic) {
        score = scoreRow.benefic.getValue(retro);
      }  else if (isMalefic) {
        score = scoreRow.malefic.getValue(retro);
      }
    }
    return score;
  }
}

export const calcKotaChakraScores = (birth: Chart, transit: Chart, ruleData = null) => {
  birth.setAyanamshaItemByKey('true_citra');
  transit.setAyanamshaItemByKey('true_citra');
  const scoreSet = new KotaCakraScoreSet(ruleData);
  const pala = birth.kotaPala;
  const svami = birth.kotaSvami;
  const grahaKeys = ['su', 'mo', 'ma', 'me', 'ju', 've', 'sa', 'ra', 'ke'];

  const moonNakshatra = birth.moon.nakshatra27Num;
  const scores = grahaKeys.map(key => {
    const currGr = transit.graha(key);
    const pos2 = currGr.nakshatra27Num;
    const diff = calcInclusiveDistance(pos2, moonNakshatra, 27);
    const retro = currGr.lngSpeed < 0;
    return {
      key,
      transitNak: pos2,
      diff,
      retro,
      score: scoreSet.calc(key, diff, retro, svami, pala)
    }
  });
  return {scores, moonNakshatra, svami, pala, scoreSet };
}

export default kotaPaalaValues;