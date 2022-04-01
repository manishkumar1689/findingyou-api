import { nakshatra28ToDegrees } from "./helpers";
import { Chart } from "./models/chart";
import { Graha } from "./models/graha-set";
import { matchNak28PadaSet } from "./settings/nakshatra-values";
import { sbcDefaultBenefics, sbcDefaultMalefics, sbcGrid } from "./settings/sbc-values";
import { calcTithi } from "./settings/tithi-values";

export interface KeyNumValueRef {
  key: string;
  value: number;
  ref?: string;
  motion?: string;
}

export class XYCell {
  x = 0;
  y = 0;
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  get row() {
    return this.y + 1;
  }

  get column() {
    return this.x + 1;
  }
}

const findCell = (num = 0): XYCell => {
	const matchedCell = sbcGrid.find(cell => cell.type === 'nk' && cell.value === num);
  const matched = matchedCell instanceof Object;
	const x = matched ? matchedCell.column - 1 : -1;
	const y = matched ? matchedCell.row - 1 : -1;
	return new XYCell(x, y);
}

const moonIsBenefic = (chart: Chart): boolean => {
  const gr = chart.graha('mo');
  const tithi = calcTithi(gr.longitude, chart.sun.longitude);
  return tithi.num >= 6 && tithi.num <= 20;
}

const mercuryIsBenefic = (chart: Chart): boolean => {
  const gr = chart.graha('me');
  return sbcDefaultMalefics.some(gk => chart.graha(gk).sign === gr.sign) === false;
}

export const sbcGrahaIsBenefic = (chart: Chart, key = ''): boolean => {
  switch (key) {
    case 'mo':
      return moonIsBenefic(chart);
    case 'me':
      return mercuryIsBenefic(chart);
    default:
      return sbcDefaultBenefics.includes(key);
  }
}

const grahaToNakPada = (lng = 0, key = '') => {
  const item = matchNak28PadaSet(lng);
  return {
    key,
    lng,
    ...item
  }
}

export const matchTraversedNak28Cells = (nakNum = 1, padaNum = 0) => {
  const xy = findCell(nakNum);
  const hasVertical = [1, 9].includes(xy.row);
  const hasHorizontal = [1, 9].includes(xy.column);
  const groups = new Map();
  if (hasHorizontal) {
    const cells = sbcGrid.filter(cell => cell.row === xy.row);
    const lrDir = xy.column < 5 ? 'right' : 'left';
    groups.set([lrDir, 'across'].join('_'),  cells);
  } else if (hasVertical) {
    const cells = sbcGrid.filter(cell => cell.column === xy.column);
    const vhDir = xy.row < 5 ? 'down' : 'up';
    groups.set([vhDir, 'vertical'].join('_'), cells);
  }
  const diagDirs = [];
  if (hasHorizontal) {
    if (xy.column === 1) {
      diagDirs.push({ x: 1,y: 1, dir: 'ne', cw: false },{ x: 1, y: -1, dir: 'se', cw: true });
    } else {
      diagDirs.push({ x: -1,y: 1, dir: 'nw', cw: true },{ x: -1, y: -1, dir: 'sw', cw: false });
    }
  } else if (hasVertical) {
    if (xy.row === 1) {
      diagDirs.push({ x: 1, y: 1, dir: 'se', cw: true  },{ x: -1, y: 1, dir: 'sw', cw: false});
    } else {
      diagDirs.push({ x: 1, y: -1, dir: 'ne', cw: false },{ x: -1, y: -1, dir: 'nw', cw: true });
    }
  }
  diagDirs.forEach(diag => {
    let cl = xy.column;
    let ro = xy.row;
    const cells = [];
    while (cl >=0 && cl <= 10 && ro >= 0 && ro <= 10) {
      if (cl >=1 && cl <= 9 && ro >= 1 && ro <= 9) {
        const c = sbcGrid.find(cell => cell.column === cl && cell.row === ro);
        if (c instanceof Object) {
          cells.push(c);
        }
      }
      ro += diag.y;
      cl += diag.x;
    }
    const cwKey = diag.cw? 'clockwise' : 'anticlockwise';
    groups.set(['diagonal', cwKey].join('_'), cells);
  });
  if (padaNum > 0 && [1,4].includes(padaNum)) {
    const isCorner = ([1,9].includes(xy.row) && [2,8].includes(xy.column)) || ([1,9].includes(xy.column) && [2,8].includes(xy.row));
    if (isCorner) {
      const ro = xy.row < 5? 1 : 9;
      const cl = xy.column < 5? 1 : 9;
      const c = sbcGrid.find(cell => cell.column === cl && cell.row === ro);
      if (c instanceof Object) {
        groups.set('corner', [c]);
      }
    }
  }
  const vedhas = [];
  const keys: string[] = [];
  for (const [group, cells] of groups.entries()) {
    cells.forEach(cell => {
      const ck = [cell.column, cell.row].join('_');
      if (keys.indexOf(ck) < 0) {
        keys.push(ck)
        vedhas.push({
          group,
          ...cell
        });
      }
    })
  }
  return vedhas;
}

export const motionSensitiveGrahas = ['me', 've','ma','ju','sa'];

export const allowedVedhas = (key = '', motion = '') => {
  if (motionSensitiveGrahas.includes(key)) {
    switch (motion) {
      case 'retro':
        return ['anticlockwise'];
      case 'fast':
        return ['clockwise'];  
      default: // normal
        return ['up','down','right', 'left'];  
    }
  } else {
    return ['up','down','right', 'left','anticlockwise', 'clockwise', 'corner']; 
  }
}

export const isInAllowedVedhas = (key = '', motion = '', group = ''): boolean => {
  return allowedVedhas(key, motion).some(vn => group.startsWith(vn + '_') || group.endsWith('_' + vn));
}



interface SbcNakItem {
  num: number;
  start: number;
  end: number;
  vedhas: any[];
  transit: any[];
  natal?: any[];
}

export const traverseAllNak28Cells = (c1: Chart, c2: Chart, ayanamshaKey = 'true_citra'): SbcNakItem[] => {
  c1.setAyanamshaItemByKey(ayanamshaKey);
  c2.setAyanamshaItemByKey(ayanamshaKey);
  const keys = ['su', 'mo', 'ma', 'me', 'ju', 've', 'sa', 'ke', 'ra'];
  const transitGrahas = c1.grahasByKeys(keys);
  const natalGrahas = c2.grahasByKeys(keys);
  const mapToPadaItem = (g: Graha, chart: Chart) => {
    const pItem = grahaToNakPada(g.longitude, g.key);
    const { key, lng, pada, letter } = pItem;
    const isBenefic = sbcGrahaIsBenefic(chart, g.key);
    return { key, lng, pada, letter, isBenefic };
  }
  return [...new Array(28)].map((_,i) => {
    const num = i + 1;
    const [start, end] = nakshatra28ToDegrees(num);
    const vedhas = matchTraversedNak28Cells(num);
    const transit = transitGrahas.filter(g => g.nakshatra28 === num).map(g => {
      const pi = mapToPadaItem(g, c1);
      const score = sbcGrahaIsBenefic(c1, g.key)? 1 : -1;
      return { ...pi, score, motion: g.motion, nakNum: num }
    });
    const natal = natalGrahas.filter(g => g.nakshatra28 === num).map(g => mapToPadaItem(g, c2));
    return {
      num,
      start,
      end,
      vedhas,
      transit,
      natal
    }
  });
}


export const buildSbcScoreGrid = (sbc: SbcNakItem[] = []) => {
  const grid: Map<string, KeyNumValueRef[]> = new Map();
  [...new Array(81)].map((_, i) => {
    const x =  i % 9;
    const y = Math.floor(i / 9);
    const col = x + 1;
    const row = y + 1;
    grid.set([row, col].join('_'), []);
  });
  sbc.forEach(nkRow => {
    if (nkRow.transit instanceof Array && nkRow.transit.length > 0) {
      nkRow.transit.forEach(pi => {
        if (Object.keys(pi).includes('score')) {
          nkRow.vedhas.forEach(vd => {
            const scItem = grid.get([vd.row, vd.column].join('_'));
            if (scItem instanceof Array) {
              if (isInAllowedVedhas(pi.key, pi.motion, vd.group) || pi.nakNum === nkRow.num) {
                if (scItem.findIndex(kv => kv.key === pi.key) < 0) {
                  const motion = motionSensitiveGrahas.includes(pi.key)? pi.motion : '-';
                  scItem.push({key: pi.key, value: pi.score, ref: vd.group, motion});
                }
              }
            }
          });
        }
      })
    }
  });
  const entries = [...grid.entries()].map(([cellRef, scores]) => {
    const hasScore = scores.length > 0;
    const score = scores.map(kv => kv.value).reduce((a, b) => a + b, 0);
    return [
      cellRef,
      { 
        score,
        hasScore,
        scores,
      }
    ]
  });
  return Object.fromEntries(entries);
}