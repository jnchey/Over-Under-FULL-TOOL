// ============================================================
// Over/Under Hedge Calculator — Calculation Engine
// Ported from calcEngine.ts (TypeScript → vanilla JS)
// ============================================================

const DEFAULT_HEDGE_ADMIN = {
  seedPostMoney: 15_000_000,
  stepUpMultiple: 3,
  seedOwnership: 0.25,
  dilutionSeriesA: 0.25,
  dilutionSeriesB: 0.25,
  optionPoolDilution: 0,
  hedgePayoutCap: 0,
  hedgeMultiplierLow: 1.2,
  hedgeMultiplierMed: 2.0,
  hedgeMultiplierHigh: 2.8,
  liqPrefStructure: '1x Non-Participating',
  liqPrefMultiple: 1,
  exitMultiples: [0, 0.5, 1, 2.5],
  // probSeed / probSeriesA / probSeriesB / gradRate* are derived at runtime
  // from the Founder Path assumptions (single source of truth)
};

const DEFAULT_HEDGE_USER = {
  hedgeSeed: true,
  hedgeSeriesA: true,
  hedgeSeriesB: true,
  hedgePctSeed: 0.25,
  hedgePctSeriesA: 0.25,
  hedgePctSeriesB: 0.25,
  lastRound: 'Seed',
  exitMultiple: 0.5,
  hedgePayoutScenario: 'Med',
};

function getHedgeMultiplier(admin, scenario) {
  if (scenario === 'High') return admin.hedgeMultiplierHigh;
  if (scenario === 'Med') return admin.hedgeMultiplierMed;
  return admin.hedgeMultiplierLow;
}

function getStageIndex(stage) {
  if (stage === 'Seed') return 0;
  if (stage === 'Series A') return 1;
  return 2;
}

function computeRoundEconomics(admin, user) {
  const seedPM = admin.seedPostMoney;
  const seriesAPM = seedPM * admin.stepUpMultiple;
  const seriesBPM = seriesAPM * admin.stepUpMultiple;

  const seedOwn = admin.seedOwnership;
  const seriesAOwn = seedOwn * (1 - admin.dilutionSeriesA);
  const seriesBOwn = seriesAOwn * (1 - admin.dilutionSeriesB);

  const seedPV = seedPM * seedOwn;
  const seriesAPV = seriesAPM * seriesAOwn;
  const seriesBPV = seriesBPM * seriesBOwn;

  const seedCum = seedPV;
  const seriesACum = seriesAPV;
  const seriesBCum = seriesBPV;

  const seedInc = seedCum;
  const seriesAInc = seriesACum - seedCum;
  const seriesBInc = seriesBCum - seriesACum;

  const hbSeed = user.hedgeSeed ? seedInc * user.hedgePctSeed : 0;
  const hbA    = user.hedgeSeriesA ? seriesAInc * user.hedgePctSeriesA : 0;
  const hbB    = user.hedgeSeriesB ? seriesBInc * user.hedgePctSeriesB : 0;

  const cap = admin.hedgePayoutCap;
  const applyCapRound = (basis, mult) => {
    const raw = basis * mult;
    return cap > 0 ? Math.min(raw, cap) : raw;
  };

  const hpLow  = [applyCapRound(hbSeed, admin.hedgeMultiplierLow),  applyCapRound(hbA, admin.hedgeMultiplierLow),  applyCapRound(hbB, admin.hedgeMultiplierLow)];
  const hpMed  = [applyCapRound(hbSeed, admin.hedgeMultiplierMed),  applyCapRound(hbA, admin.hedgeMultiplierMed),  applyCapRound(hbB, admin.hedgeMultiplierMed)];
  const hpHigh = [applyCapRound(hbSeed, admin.hedgeMultiplierHigh), applyCapRound(hbA, admin.hedgeMultiplierHigh), applyCapRound(hbB, admin.hedgeMultiplierHigh)];

  const scenario = user.hedgePayoutScenario;
  const payRow = scenario === 'High' ? hpHigh : scenario === 'Med' ? hpMed : hpLow;
  const cumHP0 = payRow[0];
  const cumHP1 = cumHP0 + payRow[1];
  const cumHP2 = cumHP1 + payRow[2];

  const prefSeed = seedInc;
  const prefA = seriesAInc;
  const prefB = seriesBInc;
  const cumPref0 = prefSeed;
  const cumPref1 = cumPref0 + prefA;
  const cumPref2 = cumPref1 + prefB;

  return {
    postMoney: [seedPM, seriesAPM, seriesBPM],
    ownership: [seedOwn, seriesAOwn, seriesBOwn],
    totalPositionValue: [seedPV, seriesAPV, seriesBPV],
    incrementalNewMoney: [seedInc, seriesAInc, seriesBInc],
    cumulativeNewMoney: [seedCum, seriesACum, seriesBCum],
    hedgeBasisPerRound: [hbSeed, hbA, hbB],
    cumulativeHedgeBasis: [hbSeed, hbSeed + hbA, hbSeed + hbA + hbB],
    hedgePayoutLow: hpLow,
    hedgePayoutMed: hpMed,
    hedgePayoutHigh: hpHigh,
    cumulativeHedgePayout: [cumHP0, cumHP1, cumHP2],
    liqPrefClaim: [cumPref0 * admin.liqPrefMultiple, cumPref1 * admin.liqPrefMultiple, cumPref2 * admin.liqPrefMultiple],
    totalPreferred: [cumPref0, cumPref1, cumPref2],
  };
}

function computeEquityValue(grossExitValue, ownership, liqPrefClaim, exitMultiple) {
  if (grossExitValue <= 0) return 0;
  if (exitMultiple < 1) {
    return ownership * Math.max(0, grossExitValue - liqPrefClaim);
  }
  return ownership * grossExitValue;
}

function computeSensitivity(admin, user, re, si, postMoney, ownership, liqPrefClaim, cumNewMoney, totalHedgeBasis, hedgePayoutAfterCap, blendedPct) {
  return admin.exitMultiples.map(mult => {
    const gross = postMoney * mult;
    const equity = computeEquityValue(gross, ownership, liqPrefClaim, mult);
    const hedgeCost = equity * blendedPct;
    const netEquity = equity - hedgeCost;
    const hedgedTotal = netEquity + hedgePayoutAfterCap;
    const diff = hedgedTotal - equity;
    const pct = equity > 0 ? diff / equity : null;
    return {
      exitMultiple: mult,
      exitMultipleLabel: mult.toFixed(1) + 'x',
      hedgedPayout: hedgedTotal,
      unhedgedPayout: equity,
      hedgeDiff: diff,
      pctImpact: pct,
    };
  });
}

function computeExpectedValue(admin, user, sensitivity, si) {
  const probs = si === 0 ? admin.probSeed : si === 1 ? admin.probSeriesA : admin.probSeriesB;
  const rows = sensitivity.map((s, i) => ({
    exitMultiple: s.exitMultiple,
    exitMultipleLabel: s.exitMultipleLabel,
    probability: probs[i] || 0,
    hedgeDiff: s.hedgeDiff,
    weightedDiff: s.hedgeDiff * (probs[i] || 0),
    helpsOrHurts: s.hedgeDiff > 0 ? 'helps' : s.hedgeDiff < 0 ? 'hurts' : 'neutral',
  }));

  const totalEV = rows.reduce((sum, r) => sum + r.weightedDiff, 0);
  const pHedgeHelps = rows.filter(r => r.helpsOrHurts === 'helps').reduce((s, r) => s + r.probability, 0);
  const pHedgeHurts = rows.filter(r => r.helpsOrHurts === 'hurts').reduce((s, r) => s + r.probability, 0);

  let verdict = '';
  if (totalEV > 0) {
    verdict = `The hedge is +EV: across all probable outcomes, hedging adds ${fmtCurrency(totalEV)} in expected value. The hedge helps in ${(pHedgeHelps * 100).toFixed(1)}% of weighted scenarios vs. hurts in ${(pHedgeHurts * 100).toFixed(1)}%.`;
  } else if (totalEV < 0) {
    verdict = `The hedge is -EV: across all probable outcomes, hedging costs ${fmtCurrency(Math.abs(totalEV))} in expected value.`;
  } else {
    verdict = 'The hedge is neutral in expected value across all probable outcomes.';
  }

  return { rows, totalEV, pHedgeHelps, pHedgeHurts, verdict };
}

function computeOutcomeProbability(admin, user) {
  const si = getStageIndex(user.lastRound);
  const pReachA = admin.gradRateSeedToA;
  const pReachB = admin.gradRateSeedToA * admin.gradRateAToB;
  const pReachByStage = [1, pReachA, pReachB];
  const pReachStage = pReachByStage[si];

  const probs = si === 0 ? admin.probSeed : si === 1 ? admin.probSeriesA : admin.probSeriesB;
  const exitIdx = admin.exitMultiples.indexOf(user.exitMultiple);
  const pExitMultipleGivenStage = exitIdx >= 0 ? probs[exitIdx] : 0;
  const pCombined = pReachStage * pExitMultipleGivenStage;

  return { pReachStage, pExitMultipleGivenStage, pCombined, pReachByStage };
}

function computeCalculator(admin, user, re) {
  const si = getStageIndex(user.lastRound);
  const postMoney = re.postMoney[si];
  const ownership = re.ownership[si];
  const exitMultiple = user.exitMultiple;
  const grossExitValue = postMoney * exitMultiple;
  const impliedExitValuation = grossExitValue;

  const cumulativeLiqPref = re.liqPrefClaim[si];
  const founderEquityValue = computeEquityValue(grossExitValue, ownership, cumulativeLiqPref, exitMultiple);

  const cumulativeNewMoneyInvested = si === 0
    ? re.incrementalNewMoney[0]
    : si === 1
      ? re.incrementalNewMoney[0] + re.incrementalNewMoney[1]
      : re.incrementalNewMoney[0] + re.incrementalNewMoney[1] + re.incrementalNewMoney[2];

  const hedgeBasisSeed    = user.hedgeSeed    ? re.incrementalNewMoney[0] * user.hedgePctSeed    : 0;
  const hedgeBasisSeriesA = (user.hedgeSeriesA && si >= 1) ? re.incrementalNewMoney[1] * user.hedgePctSeriesA : 0;
  const hedgeBasisSeriesB = (user.hedgeSeriesB && si >= 2) ? re.incrementalNewMoney[2] * user.hedgePctSeriesB : 0;
  const totalCumulativeHedgeBasis = hedgeBasisSeed + hedgeBasisSeriesA + hedgeBasisSeriesB;

  const hedgePayoutMultiplier = getHedgeMultiplier(admin, user.hedgePayoutScenario);
  const grossHedgePayout = totalCumulativeHedgeBasis * hedgePayoutMultiplier;
  const hedgePayoutAfterCap = admin.hedgePayoutCap > 0 ? Math.min(grossHedgePayout, admin.hedgePayoutCap) : grossHedgePayout;

  const effectiveBlendedHedgePct = cumulativeNewMoneyInvested > 0 ? totalCumulativeHedgeBasis / cumulativeNewMoneyInvested : 0;
  const totalHedgeCost = founderEquityValue * effectiveBlendedHedgePct;
  const netEquityAfterHedgeCost = founderEquityValue - totalHedgeCost;

  const hedgedPayout  = netEquityAfterHedgeCost + hedgePayoutAfterCap;
  const unhedgedPayout = founderEquityValue;
  const difference    = hedgedPayout - unhedgedPayout;
  const hedgedMultiple   = cumulativeNewMoneyInvested > 0 ? hedgedPayout  / cumulativeNewMoneyInvested : 0;
  const unhedgedMultiple = cumulativeNewMoneyInvested > 0 ? unhedgedPayout / cumulativeNewMoneyInvested : 0;
  const pctImpact = unhedgedPayout > 0 ? difference / unhedgedPayout : null;

  let verdict = '';
  if (difference > 0) {
    verdict = `The hedge added ${fmtCurrency(difference)} to your outcome (${fmtPct(pctImpact)} vs. unhedged)`;
  } else if (difference < 0) {
    verdict = `The hedge cost you ${fmtCurrency(Math.abs(difference))} at this exit (${fmtPct(pctImpact)} vs. unhedged)`;
  } else {
    verdict = 'The hedge had no impact at this exit';
  }

  const sensitivity = computeSensitivity(admin, user, re, si, postMoney, ownership, cumulativeLiqPref, cumulativeNewMoneyInvested, totalCumulativeHedgeBasis, hedgePayoutAfterCap, effectiveBlendedHedgePct);
  const expectedValue = computeExpectedValue(admin, user, sensitivity, si);
  const prob = computeOutcomeProbability(admin, user);

  return {
    postMoneyOfExitRound: postMoney,
    ownershipAtExitRound: ownership,
    grossExitValue,
    impliedExitValuation,
    cumulativeLiqPref,
    founderEquityValue,
    cumulativeNewMoneyInvested,
    hedgeBasisSeed,
    hedgeBasisSeriesA,
    hedgeBasisSeriesB,
    totalCumulativeHedgeBasis,
    hedgePayoutMultiplier,
    grossHedgePayout,
    hedgePayoutAfterCap,
    effectiveBlendedHedgePct,
    totalHedgeCost,
    netEquityAfterHedgeCost,
    hedgedPayout,
    unhedgedPayout,
    difference,
    hedgedMultiple,
    unhedgedMultiple,
    pctImpact,
    verdict,
    sensitivity,
    expectedValue,
    likelihoodOfOutcome: prob.pCombined,
    likelihoodLabel: prob.pCombined > 0 ? `1 in ${Math.round(1 / prob.pCombined)}` : 'N/A',
  };
}

// ── Formatting helpers ──
function fmtCurrency(value) {
  if (Math.abs(value) >= 1_000_000) return '$' + (value / 1_000_000).toFixed(2) + 'M';
  return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtCurrencyFull(value) {
  return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtPct(value) {
  if (value === null) return 'N/A';
  return (value >= 0 ? '+' : '') + (value * 100).toFixed(1) + '%';
}

function fmtMultiple(value) {
  return value.toFixed(2) + 'x';
}

function fmtValuation(v) {
  if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(0) + 'M';
  if (v >= 1_000)     return '$' + (v / 1_000).toFixed(0) + 'K';
  return '$' + v.toFixed(0);
}
