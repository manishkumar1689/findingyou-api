import { naturalBenefics, naturalMalefics } from "./graha-values";
/* import { KeyNumValue } from "../interfaces"; */
import { SignTimelineSet } from "../astro-motion";
import { julToISODate } from "../date-funcs";
import { loopShift, loopShiftInner, toSignValues } from "../helpers";
import { KeyLng, SignValueSet } from "../interfaces";

/* 
    AV = Asthaka Varga
    BAV Bhinna Ashtaka Varga = AV value of a single Graha in house/sign
                               Each GRAHA has a BAV score in each sign
    SAV Sarva Ashtaka Varga  = All BAV summed up for each house/sign
                               Each SIGN has one SAV score
    
    FOR graha = 1 to 9        // ex: ashtakavarga.su      --- graha (from Su to ASC) 
      for fromGraha = 1 to 9  // ex: ashtakavarga.su.key  --- Assign bindu array scores to houses/signs 
        fromGrahaSign = sign of subGraha in chart
        for sign = 1 to 12    // ex: ashtakavarga.su.bindu[sign] --- Assign bindu array scores to houses/signs
          grahaBAVarray(sign) = ashtakavarga.su.bindu[sign] (0 or 1)
       count (inclusively) from the sign of each of the other Grahas points from bindu array
    BAV of each Graha = the sum of points given in each sign
    SAV = the sum of all BAV (of all Grahas+ASC) for each sign
*/
const ashtakavargaValues = [
  {
    key: "su",
    values: [
      /* AV of Sun - counted from each of the Grahas in rows below */
      { key: "su", bindu: [1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0], ex: false },
      { key: "mo", bindu: [0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0], ex: false },
      { key: "ma", bindu: [1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0], ex: false },
      { key: "me", bindu: [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 1], ex: false },
      { key: "ju", bindu: [0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0], ex: false },
      { key: "ve", bindu: [0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1], ex: false },
      { key: "sa", bindu: [1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0], ex: false },
      { key: "as", bindu: [0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1], ex: false },
      { key: "ra", bindu: [], ex: false },
      { key: "ke", bindu: [], ex: false },
    ],
  },
  {
    key: "mo",
    values: [
      { key: "su", bindu: [0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0], ex: false },
      { key: "mo", bindu: [1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0], ex: false },
      { key: "ma", bindu: [0, 1, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0], ex: false },
      { key: "me", bindu: [1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0], ex: false },
      {
        key: "ju",
        bindu: [1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0],
        ex: true,
        vm: [1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 1],
      },
      { key: "ve", bindu: [0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0], ex: false },
      { key: "sa", bindu: [0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0], ex: false },
      { key: "as", bindu: [0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0], ex: false },
      { key: "ra", bindu: [], ex: false },
      { key: "ke", bindu: [], ex: false },
    ],
  },
  {
    key: "ma",
    values: [
      { key: "su", bindu: [0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0], ex: false },
      { key: "mo", bindu: [0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0], ex: false },
      { key: "ma", bindu: [1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0], ex: false },
      { key: "me", bindu: [0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0], ex: false },
      { key: "ju", bindu: [0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1], ex: false },
      { key: "ve", bindu: [0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1], ex: false },
      { key: "sa", bindu: [1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0], ex: false },
      { key: "as", bindu: [1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0], ex: false },
      { key: "ra", bindu: [], ex: false },
      { key: "ke", bindu: [], ex: false },
    ],
  },
  {
    key: "me",
    values: [
      { key: "su", bindu: [0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1], ex: false },
      { key: "mo", bindu: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0], ex: false },
      { key: "ma", bindu: [1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0], ex: false },
      { key: "me", bindu: [1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 1], ex: false },
      { key: "ju", bindu: [0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1], ex: false },
      { key: "ve", bindu: [1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0], ex: false },
      { key: "sa", bindu: [1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0], ex: false },
      { key: "as", bindu: [1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0], ex: false },
      { key: "ra", bindu: [], ex: false },
      { key: "ke", bindu: [], ex: false },
    ],
  },
  {
    key: "ju",
    values: [
      { key: "su", bindu: [1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0], ex: false },
      { key: "mo", bindu: [0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0], ex: false },
      { key: "ma", bindu: [1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0], ex: false },
      { key: "me", bindu: [1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0], ex: false },
      { key: "ju", bindu: [1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0], ex: false },
      { key: "ve", bindu: [0, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0], ex: false },
      { key: "sa", bindu: [0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1], ex: false },
      { key: "as", bindu: [1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0], ex: false },
      { key: "ra", bindu: [], ex: false },
      { key: "ke", bindu: [], ex: false },
    ],
  },
  {
    key: "ve",
    values: [
      { key: "su", bindu: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1], ex: false },
      { key: "mo", bindu: [1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1], ex: false },
      {
        key: "ma",
        bindu: [0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1],
        ex: true,
        vm: [0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1],
      },
      { key: "me", bindu: [0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0], ex: false },
      { key: "ju", bindu: [0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 0], ex: false },
      { key: "ve", bindu: [1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0], ex: false },
      { key: "sa", bindu: [0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0], ex: false },
      { key: "as", bindu: [1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0], ex: false },
      { key: "ra", bindu: [], ex: false },
      { key: "ke", bindu: [], ex: false },
    ],
  },
  {
    key: "sa",
    values: [
      { key: "su", bindu: [1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0], ex: false },
      { key: "mo", bindu: [0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0], ex: false },
      { key: "ma", bindu: [0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1], ex: false },
      { key: "me", bindu: [0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1], ex: false },
      { key: "ju", bindu: [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1], ex: false },
      { key: "ve", bindu: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1], ex: false },
      { key: "sa", bindu: [0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0], ex: false },
      { key: "as", bindu: [1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0], ex: false },
      { key: "ra", bindu: [], ex: false },
      { key: "ke", bindu: [], ex: false },
    ],
  },
  {
    key: "as",
    values: [
      { key: "su", bindu: [0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1], ex: false },
      { key: "mo", bindu: [0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 1], ex: false },
      { key: "ma", bindu: [1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0], ex: false },
      { key: "me", bindu: [1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0], ex: false },
      { key: "ju", bindu: [0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0], ex: false },
      { key: "ve", bindu: [1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0], ex: false },
      { key: "sa", bindu: [1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0], ex: false },
      { key: "as", bindu: [0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0], ex: false },
      { key: "ra", bindu: [0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 1], ex: false },
      { key: "ke", bindu: [0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 1], ex: false },
    ],
  },
  {
    key: "ra",
    values: [
      { key: "su", bindu: [1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0], ex: false },
      { key: "mo", bindu: [1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 0], ex: false },
      { key: "ma", bindu: [0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1], ex: false },
      { key: "me", bindu: [0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1], ex: false },
      { key: "ju", bindu: [1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0], ex: false },
      { key: "ve", bindu: [0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1], ex: false },
      { key: "sa", bindu: [0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1], ex: false },
      { key: "as", bindu: [0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 1], ex: false },
      { key: "ra", bindu: [], ex: false },
      { key: "ke", bindu: [], ex: false },
    ],
  },
  {
    key: "ke",
    values: [
      { key: "su", bindu: [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0], ex: false },
      { key: "mo", bindu: [0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0], ex: false },
      { key: "ma", bindu: [0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1], ex: false },
      { key: "me", bindu: [1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0], ex: false },
      { key: "ju", bindu: [0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1], ex: false },
      { key: "ve", bindu: [0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1], ex: false },
      { key: "sa", bindu: [0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1], ex: false },
      { key: "as", bindu: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], ex: false },
      { key: "ra", bindu: [], ex: false },
      { key: "ke", bindu: [], ex: false },
    ],
  },
];

const getAshtakavargaBodyRow = (graha, tableKey = "", binduSet = "default") => {
  let values = [];
  const tableSet = ashtakavargaValues.find((tv) => tv.key === tableKey);
  if (tableSet) {
    if (tableSet.values instanceof Array) {
      const gv = tableSet.values.find((rv) => rv.key === graha.key);
      if (gv) {
        const binduVals = binduSet === "vm" && gv.ex === true ? gv.vm : gv.bindu;
        const innerVals = loopShiftInner(
          toSignValues(binduVals),
          graha.sign - 1
        );
        values = loopShift(
          innerVals,
          innerVals.findIndex((p) => p.sign === 1)
        );
      }
    }
  }
  return values;
}

const getAshtakavargaBodyRowTotals = (graha: KeyLng, bodies: KeyLng[], binduSet = "default") => {
  const keys = bodies.map(gr => gr.key);
  let row = [];
  keys.forEach((key, keyIndex) => {
    const matchedGraha = bodies.find((gr) => gr.key === key);
    const br = getAshtakavargaBodyRow(matchedGraha, graha.key, binduSet);
    if (keyIndex === 0) {
      row = br;
    } else {
      row = row.map((item, itemIndex) => {
        item.value = item.value + br[itemIndex].value;
        return item;
      });
    }
  });
  return row;
}

export const getAshtakavargaBodyTable = (bodies: KeyLng[] = [], binduSet = "default") => {
   return bodies
        .map((gr) => {
          const values = getAshtakavargaBodyRowTotals(gr, bodies, binduSet);
          return {
            sign: Math.floor(gr.lng / 30) + 1,
            key: gr.key,
            values,
          };
        })
        .filter((row) => row.values.length > 0);
}

export const getAshtakavargaBavItems = (bodies: KeyLng[] = []) => {
  return getAshtakavargaBodyTable(bodies).map(row => {
    const { key, values, sign } = row;
    const signRow = values.find(vr => vr.sign === sign);
    const value = signRow instanceof Object ? signRow.value : 0;
    return { key, sign, value };
  });
}



export const buildAsktakavargaSignSet = (bodies: KeyLng[]): SignValueSet[] => {
  const table = getAshtakavargaBodyTable(bodies);
  const grahaKeys = bodies.map(b => b.key);
  return Array.from(Array(12)).map((_,i) => i + 1).map(sign => {
    const values = grahaKeys.map(gk => {
      const row = table.find(row => row.key === gk);
      const item = row instanceof Object && row.values instanceof Array? row.values.find(r => r.sign === sign) : null;
      const hasItem = item instanceof Object
      return hasItem ? { key: gk, value: item.value } : { key: "", value: 0 };
    });
    return { sign,  values };
  });
}

export interface QualitySet {
  b: number;
  m: number;
  a?: number;
  n?: number;
}

export const getAshtakavargaBavBMN = (bodies: KeyLng[] = []): QualitySet => {
  const items = getAshtakavargaBavItems(bodies);
  const malefic = items.filter(row => naturalBenefics.includes(row.key)).map(row => row.value).reduce((a, b) => a +b, 0) / naturalBenefics.length;
  const benefic = items.filter(row => naturalMalefics.includes(row.key)).map(row => row.value).reduce((a, b) => a +b, 0) / naturalMalefics.length;
  const mean = items.map(row => row.value).reduce((a, b) => a +b, 0) / items.length;
  return {
    b: benefic,
    m: malefic,
    a: mean,
  };
}

const matchBavTimelineBodies = (data: SignTimelineSet[], jd = 0) => {
  const bds = data.map(rs => {
    const { key, nextMatches} = rs;
    const next = nextMatches.find(ri => ri.jd >= jd);
    return next instanceof Object? { 
      key,
      sign: next.sign,
      lng: next.lng
    } : {key, lng: rs.longitude, sign: rs.sign };
  })
  return bds;
}

export const calcBavGraphData = (data: SignTimelineSet[] = [], startJd = 0, endJd = 0, stepsPerDay = 2) => {
  const initBodies = data.map(row => {
    const { key, sign} = row;
    return { key, lng: row.longitude, sign };
  });
  const initValues = getAshtakavargaBavBMN(initBodies);
  const graphData = [{
    jd: startJd,
    refJd: 0,
    dt: julToISODate(startJd),
    ...initValues
  }];
  let signSwitchJds = [];

  if (stepsPerDay  < 1) {
    const signSwitchRows = [];
    data.forEach(row => {
      if (row.nextMatches instanceof Array) {
        row.nextMatches.forEach(nm => {
          if (nm.jd <= endJd) {
            signSwitchRows.push({
              jd: nm.jd,
              bodies: [],
              key: row.key,
            })
          }
        })
      }
    })
    signSwitchRows.sort((a, b) => a.jd - b.jd);
    signSwitchJds = signSwitchRows.map(row => {
      const bodies = row.bodies.length > 0? row.bodies : matchBavTimelineBodies(data, row.jd)
      return {...row, dt: julToISODate(row.jd), bodies};
    })
  } else {
    const days = Math.floor(endJd - startJd);
    const steps = days * stepsPerDay;
    const frac = 1 / stepsPerDay;
    for (let i = 1; i <= steps; i++) {
      const sampleJd = startJd + (frac * i);
      const bodies = matchBavTimelineBodies(data, sampleJd);
      signSwitchJds.push({ jd: sampleJd, dt: julToISODate(sampleJd), bodies });
    }
  }
  signSwitchJds.forEach(row => {
    const {jd, dt, bodies} = row;
    const items = getAshtakavargaBavBMN(bodies);
    graphData.push({
      jd,
      refJd: jd - startJd,
      dt,
      ...items
    });
  });
  return graphData;
}

export default ashtakavargaValues;
