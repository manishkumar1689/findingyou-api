import { nakshatra28ToDegrees } from "./helpers";
import { Chart } from "./models/chart";
import { Graha } from "./models/graha-set";
import { matchNak28PadaSet } from "./settings/nakshatra-values";
import { sbcDefaultBenefics, sbcDefaultMalefics, sbcGrid } from "./settings/sbc-values";
import { calcTithi } from "./settings/tithi-values";


const findCell = (num = 0) => {
	const matchedCells = sbcGrid.map(row => row.map((r, index) => {
		return {...r, index }
	}).filter(cell => cell.type === 'nk' && cell.value === num));
	const x = matchedCells.findIndex(row => row.length > 0);
	const y = x >= 0 ? matchedCells[x][0].index : -1;
	return {
		x,
		y
	}
}

const moonIsBenefic = (chart: Chart): boolean => {
  const gr = chart.graha('mo');
  const tithi = calcTithi(gr.longitude, chart.sun.longitude);
  return tithi.num >= 6 && tithi.num <= 20;
}

const mercuryIsBenefic = (chart: Chart): boolean => {
  const gr = chart.graha('me');
  return sbcDefaultMalefics.some(gk => chart.graha(gk).sign === gr.sign);
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

const matchTraversedNak28Cells = (nakNum = 1) => {
  const xy = findCell(nakNum);
  const hasVertical = [0, 8].includes(xy.x);
  const hasHorizontal = [0, 8].includes(xy.y);
  const groups = new Map();
  const startEndIndices = [...new Array(9)].map((_, i) => i);
  if (hasHorizontal) {
    const cells = startEndIndices.map(index => sbcGrid[xy.x][index]);
    groups.set('horizontal',  cells);
  } else if (hasVertical) {
    const cells = startEndIndices.map(index => sbcGrid[index][xy.y]);
    groups.set('vertical',  cells);
  }
  const diagDirs = [];
  if (hasHorizontal) {
    if (xy.y === 0) {
      diagDirs.push({ x: 1,y: 1, dir: 'ne'},{ x: -1, y: 1, dir: 'se'});
    } else {
      diagDirs.push({ x: 1,y: -1, dir: 'nw'},{ x: -1, y: -1, dir: 'sw'});
    }
  } else if (hasVertical) {
    if (xy.x === 0) {
      diagDirs.push({ x: 1,y: 1, dir: 'se' },{ x: 1, y: -1, dir: 'sw'});
    } else {
      diagDirs.push({ x: -1,y: 1, dir: 'ne'},{ x: -1, y: -1, dir: 'nw'});
    }
  }
  diagDirs.forEach(diag => {
    let x = xy.x;
    let y = xy.y;
    const cells = [];
    while (x >=0 && x < 9 && y >= 0 && y < 9) {
      y += diag.y;
      x += diag.x;
      if (x >= 0 && x < 9 && y >= 0 && y < 9) {
        cells.push(sbcGrid[y][x]);
      }
    }
    groups.set(['diagonal', diag.dir].join('_'), cells);
  });
  const isCorner = ([0,8].includes(xy.y) && [1,7].includes(xy.x)) || ([0,8].includes(xy.x) && [1,7].includes(xy.y));
  if (isCorner) {
    const x = xy.x === 1 ? 0 : xy.x < 4? 0 : 8;
    const y = xy.y === 1 ? 0 : xy.y < 4? 0 : 8;
    groups.set('corner_1_4', [sbcGrid[x][y]]);
  }
  return Object.fromEntries(groups);
}

export const traverseAllNak28Cells = (c1: Chart, c2: Chart, ayanamshaKey = 'true_citra') => {
  c1.setAyanamshaItemByKey(ayanamshaKey);
  c2.setAyanamshaItemByKey(ayanamshaKey);
  const keys = ['su', 'mo', 'ma', 'me', 'ju', 've', 'sa', 'ke', 'ra', 'as'];
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
    const transit = transitGrahas.filter(g => g.nakshatra28 === num).map(g => mapToPadaItem(g, c1));
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