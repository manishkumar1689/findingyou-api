import { notEmptyString } from '../lib/validators';
import { TransitionItem } from './lib/interfaces';
import { Chart } from './lib/models/chart';
import { matchDikBalaTransition } from './lib/settings/graha-values';
import {
  BirdGrahaSet,
  calcValueWithinOrb,
  filterDashaLordByObjectType,
  mapLords,
  matchTransitionItemRange,
  matchTransitionRange,
  PPRule,
  RuleDataSet,
  toTransitKey,
  TransitionOrb,
  translateTransitionKey,
} from './lib/settings/pancha-pakshi';

export const addTransitionItemsWithinRange = (
  transitions: TransitionItem[],
  items: any[],
  key: '',
  startJd = 0,
  endJd = 0,
  transposed = false,
) => {
  if (items instanceof Array) {
    items.forEach(item => {
      if (
        ['min', 'max'].includes(item.key) === false &&
        item.value >= startJd &&
        item.value <= endJd
      ) {
        transitions.push({
          key,
          type: item.key,
          jd: item.value,
          transposed,
        });
      }
    });
  }
};

export const process5PTransition = (
  r: PPRule,
  chart: Chart,
  allSubs = [],
  transitions: TransitionItem[],
  birdGrahaSet: BirdGrahaSet,
): RuleDataSet => {
  const isTr = ['as', 'ds', 'ic', 'mc', 'dik_bala_transition'].includes(
    r.context,
  );
  const trRef = translateTransitionKey(r.key, isTr);
  const matchedRanges: TransitionOrb[] = [];
  const transposed = r.from === 'birth';
  let subs = [];
  let grahaKeys = [];
  const startJd = allSubs[0].start;
  const endJd = allSubs.length > 49 ? allSubs[49].end : 0;
  /* const midJd = allSubs.length > 49 ? allSubs[24].end : 0;
  let matchDayOnly = false; */
  if (r.key.endsWith('_graha')) {
    const trKey = toTransitKey(r.context);
    if (r.key.includes('ing_') && r.key.startsWith('yama')) {
      const actKey = r.key.split('_')[1];
      allSubs
        .filter(s => s.key === actKey)
        .filter(s => {
          const relRows = transitions.filter(
            rt =>
              s.rulers.includes(rt.key) &&
              rt.transposed === transposed &&
              rt.type === trKey,
          );
          relRows.forEach(rr => {
            if (Object.keys(rr).includes(trKey)) {
              if (rr[trKey].jd >= s.start && rr[trKey].jd < s.end) {
                const mRange = matchTransitionItemRange(rr);
                matchedRanges.push(mRange);
                r.addMatch(mRange.start, mRange.end, 'orb', r.score);
              }
            }
          });
        });
    } else if (r.key.startsWith('birth_bird_')) {
      grahaKeys = birdGrahaSet.matchGrahas('birth', true);
    } else if (r.key.includes('ruling_bird_')) {
      grahaKeys = birdGrahaSet.matchGrahas('ruling', true);
    } else if (r.key.includes('dying_bird_')) {
      grahaKeys = birdGrahaSet.matchGrahas('dying', true);
    }
    //matchDayOnly = r.key.includes('day_');
  } else if (r.key.length === 2) {
    grahaKeys = [r.key];
  }
  const isDahsha = r.context.startsWith('dasha_');
  const isDasha2 = !isDahsha && r.context.startsWith('antardasha_');
  if (isDahsha || isDasha2) {
    const refDashaLord = isDasha2
      ? birdGrahaSet.dasha2Lord
      : birdGrahaSet.dashaLord;
    subs = filterDashaLordByObjectType(
      refDashaLord,
      allSubs,
      birdGrahaSet,
      r.key,
    );
    subs.forEach(sub => {
      r.addMatch(sub.start, sub.end, 'subyama', r.score);
    });
  }
  const isLord = r.context.startsWith('lord');
  let filterByGrahasAndAction = isLord;
  if (isLord) {
    grahaKeys = mapLords(chart, r.context);
  } else if (r.key === 'yoga_karaka') {
    grahaKeys = [chart.yogaKaraka];
    filterByGrahasAndAction = true;
  } else if (r.key === 'brighu_bindu') {
    grahaKeys = ['brghuBindu'];
    filterByGrahasAndAction = true;
  } else if (r.key.endsWith('yogi_point')) {
    grahaKeys = r.context.includes('avayogi') ? ['avayogi'] : ['yogi'];
    filterByGrahasAndAction = true;
  } else if (r.key.endsWith('yogi_graha')) {
    const objKey = r.context.includes('avayogi') ? 'avayogi' : 'yogi';
    const gk = chart.matchObject(objKey);
    if (gk) {
      grahaKeys = [gk];
      filterByGrahasAndAction = true;
    }
  }
  if (filterByGrahasAndAction) {
    subs = allSubs.filter(
      s => s.key === r.action && s.rulers.some(gk => grahaKeys.includes(gk)),
    );
    subs.forEach(sub => {
      r.addMatch(sub.start, sub.end, 'subyama', r.score);
    });
  }
  if (isTr) {
    const lcGrKeys = grahaKeys.map(gk => gk.toLowerCase());
    const relTrs = transitions.filter(tr => {
      const rKey = tr.key.toLowerCase().replace('2', '');
      return rKey === trRef.toLowerCase() || lcGrKeys.includes(rKey);
    });
    if (relTrs.length > 0) {
      for (const relTr of relTrs) {
        const refK = toTransitKey(r.action);
        const rk = refK.startsWith('dik') ? matchDikBalaTransition(refK) : refK;

        if (relTr.type === rk) {
          const mr = matchTransitionItemRange(relTr);
          if (mr instanceof TransitionOrb) {
            console.log({ startJd, endJd });
            if (mr.end > startJd && mr.start < endJd) {
              matchedRanges.push(mr);
              r.addMatch(mr.start, mr.end, 'orb', r.score);
            }
          }
        }
      }
    }
  }
  const matched = matchedRanges.length > 0 || subs.length > 0;

  return {
    rule: r,
    isTr,
    isLord,
    matchedRanges,
    matched,
    subs,
    trRef,
  };
};

export const addMatched5PTransitions = (
  chart: Chart,
  allSubs: any[],
  rules: PPRule[] = [],
  transitions: TransitionItem[] = [],
  birdGrahaSet: BirdGrahaSet,
) => {
  for (const r of rules) {
    for (const subR of r.transitConditions()) {
      process5PTransition(subR, chart, allSubs, transitions, birdGrahaSet);
    }
  }
};

export const addAllTransitionItemsWithinRange = (
  transitions: TransitionItem[] = [],
  transDataItems: any[] = [],
  startJd = 0,
  endJd = 0,
  transposed = false,
) => {
  transDataItems.forEach(row => {
    const { key, items } = row;
    if (items instanceof Array) {
      addTransitionItemsWithinRange(
        transitions,
        items,
        key,
        startJd,
        endJd,
        transposed,
      );
    }
  });
};

export const matchPPRulesToJd = (
  minJd = 0,
  rules: PPRule[],
  endSubJd = -1,
  skipTransitions = false,
) => {
  let score = 0;
  let ppScore = 0;
  const names: string[] = [];
  const peaks = [];
  for (const rule of rules) {
    if (rule.isMatched) {
      // a rule may only match one in a given minute even if valid match spans may overlap
      let isMatched = false;
      for (const match of rule.validMatches) {
        if (!isMatched && minJd >= match.start && minJd <= match.end) {
          if (match.type === 'orb') {
            if (!skipTransitions) {
              const { fraction, peak } = calcValueWithinOrb(
                minJd,
                match.start,
                match.end,
              );
              if (endSubJd < 0 || (peak <= endSubJd && endSubJd > 0)) {
                score += rule.score * fraction;
                names.push(rule.name);
                peaks.push(peak);
              }
            }
          } else {
            if (rule.validateAtMinJd(minJd)) {
              score += rule.score;
              ppScore += rule.score;
              names.push(rule.name);
            }
          }
          isMatched = true;
          break;
        }
      }
    }
  }
  return { minuteScore: score, ppScore, names, peaks };
};
