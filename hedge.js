// === HEDGE TAB — Over/Under calculator, vanilla JS ===

// In-memory admin settings for hedge (no server)
let _hedgeAdmin = null;

function loadHedgeAdmin() {
  if (_hedgeAdmin) return JSON.parse(JSON.stringify(_hedgeAdmin));
  return JSON.parse(JSON.stringify(DEFAULT_HEDGE_ADMIN));
}

function saveHedgeAdmin(a) {
  _hedgeAdmin = JSON.parse(JSON.stringify(a));
}

// User inputs state
let _hedgeUser = JSON.parse(JSON.stringify(DEFAULT_HEDGE_USER));

// Fill slider track left of thumb with teal, right with border colour
function updateSliderFill(el) {
  const min = parseFloat(el.min) || 0;
  const max = parseFloat(el.max) || 100;
  const val = parseFloat(el.value) || 0;
  const pct = ((val - min) / (max - min)) * 100;
  el.style.background = `linear-gradient(to right, #18181C ${pct}%, #E0E0DE ${pct}%)`;
}

// Derive hedge probability arrays from Founder Path exit distributions (single source of truth)
function injectFPProbs(admin) {
  const fp = loadAssumptions();
  const d = fp.exitDistributions;
  admin.probSeed    = [d['Seed'].failed,     d['Seed'].half,     d['Seed'].one,     d['Seed'].twohalf];
  admin.probSeriesA = [d['Series A'].failed, d['Series A'].half, d['Series A'].one, d['Series A'].twohalf];
  admin.probSeriesB = [d['Series B'].failed, d['Series B'].half, d['Series B'].one, d['Series B'].twohalf];
  admin.gradRateSeedToA = fp.graduationRates['Seed'];
  admin.gradRateAToB    = fp.graduationRates['Series A'];
  return admin;
}

// === RENDER ENGINE ===
function renderHedge() {
  const admin = injectFPProbs(loadHedgeAdmin());
  const user = _hedgeUser;
  const re = computeRoundEconomics(admin, user);
  const result = computeCalculator(admin, user, re);

  renderHedgeRounds(admin, user, re);
  renderExitScenario(admin, user, result);
  renderPayoutScenario(admin, user, result);
  renderRoundEconomicsTable(re);
  renderVerdictCard(result);
  renderSensitivityChart(admin, user, result);
  renderSensitivityTable(result);
  renderAggLikelihoods(admin, user);
  renderEVSection(result, user);
}

// ── Hedging Decisions ──
function renderHedgeRounds(admin, user, re) {
  const container = document.getElementById('hedge-rounds');
  const rounds = ['Seed', 'Series A', 'Series B'];
  const toggleKeys  = ['hedgeSeed', 'hedgeSeriesA', 'hedgeSeriesB'];
  const pctKeys     = ['hedgePctSeed', 'hedgePctSeriesA', 'hedgePctSeriesB'];
  const exitStageIdx = user.lastRound === 'Seed' ? 0 : user.lastRound === 'Series A' ? 1 : 2;

  container.innerHTML = rounds.map((round, idx) => {
    const isActive = user[toggleKeys[idx]];
    const pct = Math.round(user[pctKeys[idx]] * 100);
    const isDimmed = idx > exitStageIdx && isActive;

    return `<div class="hedge-round-row${isDimmed ? ' dimmed' : ''}" data-idx="${idx}">
      <div class="round-toggle-row">
        <div class="round-toggle-group">
          <label class="toggle-switch">
            <input type="checkbox" class="round-toggle" data-key="${toggleKeys[idx]}" ${isActive ? 'checked' : ''}>
            <span class="toggle-track"></span>
          </label>
          <span class="round-label">${round}</span>
        </div>
        <span class="round-pct-display">${isActive ? pct + '%' : 'Off'}</span>
      </div>
      ${isActive ? `<input type="range" class="hedge-slider" data-key="${pctKeys[idx]}" min="0" max="100" step="5" value="${pct}">` : ''}
      ${isDimmed ? `<p class="dimmed-hint">Not factored — exit is at ${user.lastRound}</p>` : ''}
    </div>`;
  }).join('');

  // Valuation context row
  const valRow = document.getElementById('valuation-row');
  valRow.innerHTML = `<div class="valuation-context">
    ${rounds.map((r, i) => `<div class="val-cell">
      <div class="val-stage">${r}</div>
      <div class="val-amount">${fmtValuation(re.postMoney[i])}</div>
    </div>`).join('')}
  </div>`;

  // Bind events
  container.querySelectorAll('.round-toggle').forEach(el => {
    el.addEventListener('change', () => {
      _hedgeUser[el.dataset.key] = el.checked;
      renderHedge();
    });
  });

  container.querySelectorAll('.hedge-slider').forEach(el => {
    // Apply filled-track gradient on init
    updateSliderFill(el);
    el.addEventListener('input', () => {
      _hedgeUser[el.dataset.key] = parseInt(el.value) / 100;
      updateSliderFill(el);
      // Update display without full re-render for performance
      const row = el.closest('.hedge-round-row');
      const disp = row.querySelector('.round-pct-display');
      if (disp) disp.textContent = el.value + '%';
    });
    el.addEventListener('change', () => { renderHedge(); });
  });
}

// ── Exit Scenario ──
function renderExitScenario(admin, user, result) {
  const lastRoundSel = document.getElementById('select-last-round');
  if (lastRoundSel.value !== user.lastRound) lastRoundSel.value = user.lastRound;

  // Populate exit multiples
  const exitSel = document.getElementById('select-exit-multiple');
  const currVal = user.exitMultiple;
  exitSel.innerHTML = admin.exitMultiples.map(m =>
    `<option value="${m}" ${m === currVal ? 'selected' : ''}>${m.toFixed(1)}x</option>`
  ).join('');

  document.getElementById('implied-exit-val').textContent = `Implied exit: ${fmtCurrencyFull(result.impliedExitValuation)}`;

  // Likelihood row
  const lRow = document.getElementById('likelihood-row');
  lRow.innerHTML = `<div class="likelihood-row-inner">
    <span class="likelihood-label">Likelihood of this outcome:</span>
    <span class="likelihood-badge">${(result.likelihoodOfOutcome * 100).toFixed(1)}% (${result.likelihoodLabel})</span>
  </div>
  <p class="hedge-source-note">Derived from real-world Carta data — the same source powering the Journey and Destination tabs</p>`;

  // Implied seed card
  const si = user.lastRound === 'Seed' ? 0 : user.lastRound === 'Series A' ? 1 : 2;
  const re2 = computeRoundEconomics(admin, user);
  const exitValuation = user.exitMultiple * re2.postMoney[si];
  const impliedSeedMultiple = admin.seedPostMoney > 0 ? exitValuation / admin.seedPostMoney : 0;
  document.getElementById('implied-seed-card').innerHTML = `<div class="implied-seed-box">
    <div class="implied-seed-label">Implied exit multiple since Seed round</div>
    <div class="implied-seed-value">${impliedSeedMultiple.toFixed(1)}x</div>
    <div class="implied-seed-sub">${fmtCurrencyFull(exitValuation)} / ${fmtCurrencyFull(admin.seedPostMoney)}</div>
  </div>`;
}

// ── Payout Scenario ──
function renderPayoutScenario(admin, user, result) {
  const sel = document.getElementById('select-payout-scenario');
  sel.innerHTML = [
    ['Low', admin.hedgeMultiplierLow],
    ['Med', admin.hedgeMultiplierMed],
    ['High', admin.hedgeMultiplierHigh],
  ].map(([s, m]) => `<option value="${s}" ${user.hedgePayoutScenario === s ? 'selected' : ''}>${s} (${m}x)</option>`).join('');

  document.getElementById('payout-result-card').innerHTML = `<div class="payout-result-box">
    <div class="pr-label">Hedge payout</div>
    <div class="pr-value" style="color:${result.hedgePayoutAfterCap > 0 ? '#40A684' : 'inherit'}">${fmtCurrencyFull(result.hedgePayoutAfterCap)}</div>
    <div class="pr-sub">${fmtCurrencyFull(result.totalCumulativeHedgeBasis)} × ${result.hedgePayoutMultiplier}x${admin.hedgePayoutCap > 0 && result.grossHedgePayout > admin.hedgePayoutCap ? ' (capped)' : ''}</div>
  </div>`;

  // Hedge contribution + blended pct
  const si = user.lastRound === 'Seed' ? 0 : user.lastRound === 'Series A' ? 1 : 2;
  const rounds = ['Seed', 'Series A', 'Series B'];
  const basisVals = [result.hedgeBasisSeed, result.hedgeBasisSeriesA, result.hedgeBasisSeriesB];
  const anyBasis = basisVals.some(v => v > 0);

  document.getElementById('hedge-contribution').innerHTML = `
    <div class="hc-row">
      <span class="hc-label">Total hedge contribution</span>
      <span class="hc-value">${fmtCurrencyFull(result.totalCumulativeHedgeBasis)}</span>
    </div>
    ${anyBasis ? `<div class="hc-breakdown">
      ${rounds.map((r, i) => {
        if (i > si) return '';
        return `<div class="hc-round"><div class="hc-round-name">${r}</div><div class="hc-round-val">${basisVals[i] > 0 ? fmtCurrencyFull(basisVals[i]) : '—'}</div></div>`;
      }).join('')}
    </div>` : ''}
    <div class="hc-row hc-blended">
      <span class="hc-label">Blended hedge %</span>
      <span class="hc-badge">${(result.effectiveBlendedHedgePct * 100).toFixed(2)}%</span>
    </div>
    <div class="hc-sub">${fmtCurrencyFull(result.totalCumulativeHedgeBasis)} / ${fmtCurrencyFull(result.cumulativeNewMoneyInvested)}</div>`;
}

// ── Round Economics ──
function renderRoundEconomicsTable(re) {
  const el = document.getElementById('round-economics-table');
  const rounds = ['Seed', 'Series A', 'Series B'];
  const rows = [
    { label: 'Post-Money',     vals: re.postMoney.map(v => fmtValuation(v)) },
    { label: 'Ownership',      vals: re.ownership.map(v => (v * 100).toFixed(2) + '%') },
    { label: 'Position Value', vals: re.totalPositionValue.map(v => fmtValuation(v)) },
    { label: 'Hedge Basis',    vals: re.hedgeBasisPerRound.map(v => fmtValuation(v)) },
    { label: 'Liq Pref Claim', vals: re.liqPrefClaim.map(v => fmtValuation(v)) },
  ];
  el.innerHTML = `<table class="re-table">
    <thead><tr><th></th>${rounds.map(r => `<th>${r}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr><td class="re-label">${r.label}</td>${r.vals.map(v => `<td class="re-val">${v}</td>`).join('')}</tr>`).join('')}
    </tbody>
  </table>`;
}

// ── Verdict Card ──
function renderVerdictCard(result) {
  const isPos = result.difference > 0;
  const isNeu = result.difference === 0;
  const borderColor = isPos ? '#40A684' : isNeu ? 'transparent' : '#A13544';
  const iconSvg = isPos
    ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#40A684" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`
    : isNeu
    ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(250,248,245,0.4)" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>`
    : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A13544" stroke-width="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>`;

  document.getElementById('verdict-card').innerHTML = `
    <div class="verdict-inner" style="border-left-color:${borderColor}">
      <div class="verdict-top">
        <div>
          <div class="verdict-label">Verdict</div>
          <p class="verdict-text">${result.verdict}</p>
        </div>
        <div class="verdict-icon">${iconSvg}</div>
      </div>
      <div class="verdict-metrics">
        <div class="vm-cell">
          <div class="vm-label">Hedged Outcome</div>
          <div class="vm-value">${fmtCurrency(result.hedgedPayout)}</div>
          <div class="vm-sub">${fmtMultiple(result.hedgedMultiple)}</div>
        </div>
        <div class="vm-cell">
          <div class="vm-label">Unhedged Outcome</div>
          <div class="vm-value">${fmtCurrency(result.unhedgedPayout)}</div>
          <div class="vm-sub">${fmtMultiple(result.unhedgedMultiple)}</div>
        </div>
        <div class="vm-cell">
          <div class="vm-label">Difference</div>
          <div class="vm-value" style="color:${isPos ? '#40A684' : isNeu ? 'white' : '#A13544'}">${result.difference >= 0 ? '+' : ''}${fmtCurrency(result.difference)}</div>
          <div class="vm-sub">${result.pctImpact !== null ? fmtPct(result.pctImpact) : 'N/A'}</div>
        </div>
      </div>
    </div>`;
}

// ── Sensitivity Chart (D3 bar chart) ──
function renderSensitivityChart(admin, user, result) {
  const container = document.getElementById('sensitivity-chart');
  container.innerHTML = '';

  const data = result.sensitivity.map(s => ({
    name: s.exitMultipleLabel,
    hedged: Math.round(s.hedgedPayout),
    unhedged: Math.round(s.unhedgedPayout),
  }));

  const cW = container.clientWidth || 420;
  const margin = { top: 12, right: 12, bottom: 52, left: 68 };
  const w = cW - margin.left - margin.right;
  const h = 236 - margin.top - margin.bottom; // chart bar area only

  const svg = d3.select(container).append('svg')
    .attr('width', cW).attr('height', h + margin.top + margin.bottom);
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const x0 = d3.scaleBand().domain(data.map(d => d.name)).range([0, w]).padding(0.3);
  const x1 = d3.scaleBand().domain(['hedged', 'unhedged']).range([0, x0.bandwidth()]).padding(0.05);
  const maxVal = d3.max(data, d => Math.max(d.hedged, d.unhedged));
  const y = d3.scaleLinear().domain([0, maxVal * 1.1]).range([h, 0]);

  // Grid lines
  y.ticks(4).forEach(tick => {
    g.append('line').attr('x1', 0).attr('x2', w).attr('y1', y(tick)).attr('y2', y(tick))
      .attr('stroke', 'rgba(250,248,245,0.08)').attr('stroke-width', 0.5);
  });

  // Y axis
  g.append('g').call(
    d3.axisLeft(y).ticks(4).tickFormat(v => {
      if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(0) + 'M';
      if (v >= 1_000) return '$' + (v / 1_000).toFixed(0) + 'K';
      return '$' + v;
    })
  ).call(ax => {
    ax.select('.domain').remove();
    ax.selectAll('.tick line').remove();
    ax.selectAll('.tick text').attr('fill', 'rgba(250,248,245,0.5)').attr('font-size', '11px').attr('font-family', 'var(--font-body)');
  });

  // X axis
  g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x0))
    .call(ax => {
      ax.select('.domain').remove();
      ax.selectAll('.tick line').remove();
      ax.selectAll('.tick text').attr('fill', 'rgba(250,248,245,0.5)').attr('font-size', '11px').attr('font-family', 'var(--font-body)');
    });

  // Bars
  const barG = g.selectAll('.bar-group').data(data).enter().append('g')
    .attr('transform', d => `translate(${x0(d.name)},0)`);

  barG.append('rect')
    .attr('x', x1('hedged')).attr('y', d => y(Math.max(d.hedged, 0)))
    .attr('width', x1.bandwidth()).attr('height', d => Math.max(h - y(Math.max(d.hedged, 0)), 0))
    .attr('rx', 3).attr('fill', '#40A684');

  barG.append('rect')
    .attr('x', x1('unhedged')).attr('y', d => y(Math.max(d.unhedged, 0)))
    .attr('width', x1.bandwidth()).attr('height', d => Math.max(h - y(Math.max(d.unhedged, 0)), 0))
    .attr('rx', 3).attr('fill', 'rgba(250,248,245,0.35)');

  // Legend — sits in the lower portion of margin.bottom, below x-axis labels
  const legY = h + margin.top + margin.bottom - 16;
  [['#40A684', 'Hedged'], ['rgba(250,248,245,0.35)', 'Unhedged']].forEach(([color, label], i) => {
    const lx = w / 2 - 80 + i * 90;
    svg.append('rect').attr('x', margin.left + lx).attr('y', legY).attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', color);
    svg.append('text').attr('x', margin.left + lx + 14).attr('y', legY + 8)
      .attr('font-family', 'var(--font-body)').attr('font-size', '11px').attr('fill', 'rgba(250,248,245,0.7)').text(label);
  });
}

// ── Sensitivity Table ──
function renderSensitivityTable(result) {
  const el = document.getElementById('sensitivity-table');
  el.innerHTML = `<table class="sens-table">
    <thead><tr>
      <th>Exit</th><th>Hedged</th><th>Unhedged</th><th>Hedge +/-</th><th>Impact</th>
    </tr></thead>
    <tbody>
      ${result.sensitivity.map(row => `<tr>
        <td class="sens-exit">${row.exitMultipleLabel}</td>
        <td>${fmtCurrencyFull(row.hedgedPayout)}</td>
        <td>${fmtCurrencyFull(row.unhedgedPayout)}</td>
        <td style="color:${row.hedgeDiff > 0 ? '#40A684' : row.hedgeDiff < 0 ? '#A13544' : 'inherit'}">${row.hedgeDiff >= 0 ? '+' : ''}${fmtCurrencyFull(row.hedgeDiff)}</td>
        <td style="color:${row.hedgeDiff > 0 ? '#40A684' : row.hedgeDiff < 0 ? '#A13544' : 'inherit'}">${row.pctImpact !== null ? fmtPct(row.pctImpact) : 'N/A'}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

// ── Aggregate Outcome Likelihoods ──
function renderAggLikelihoods(admin, user) {
  const subtitle = document.getElementById('agg-likelihood-subtitle');
  subtitle.textContent = user.lastRound === 'Seed'
    ? 'Based on exit probabilities at Seed'
    : `Weighted path from Seed through ${user.lastRound}`;

  const stages = [];
  if (user.lastRound === 'Seed') {
    stages.push({ weight: 1, probs: admin.probSeed });
  } else if (user.lastRound === 'Series A') {
    stages.push({ weight: 1 - admin.gradRateSeedToA, probs: admin.probSeed });
    stages.push({ weight: admin.gradRateSeedToA, probs: admin.probSeriesA });
  } else {
    stages.push({ weight: 1 - admin.gradRateSeedToA, probs: admin.probSeed });
    stages.push({ weight: admin.gradRateSeedToA * (1 - admin.gradRateAToB), probs: admin.probSeriesA });
    stages.push({ weight: admin.gradRateSeedToA * admin.gradRateAToB, probs: admin.probSeriesB });
  }

  const jointByExit = admin.exitMultiples.map((_, ei) =>
    stages.reduce((sum, s) => sum + s.weight * (s.probs[ei] || 0), 0)
  );
  const exactly2_5x = jointByExit[3] || 0;
  const lte1x = (jointByExit[0] || 0) + (jointByExit[1] || 0) + (jointByExit[2] || 0);
  const lte0_5x = (jointByExit[0] || 0) + (jointByExit[1] || 0);
  const exactly0x = jointByExit[0] || 0;

  const items = [
    { label: '2.5x exit', value: exactly2_5x, color: '#40A684' },
    { label: '\u2264 1.0x exit', value: lte1x, color: '#A13544' },
    { label: '\u2264 0.5x exit', value: lte0_5x, color: '#A13544' },
    { label: '0.0x (total loss)', value: exactly0x, color: '#A13544' },
  ];

  const el = document.getElementById('agg-likelihoods');
  el.innerHTML = items.map(row => {
    const pct = (row.value * 100).toFixed(1);
    const odds = getOddsLabel(row.value);
    return `<div class="agg-row">
      <span class="agg-label">${row.label}</span>
      <div class="agg-right">
        <span class="agg-pct" style="color:${row.color}">${pct}%</span>
        ${odds ? `<span class="agg-badge">${odds}</span>` : ''}
      </div>
    </div>`;
  }).join('');
}

function getOddsLabel(p) {
  if (p <= 0 || p >= 0.97) return null;
  const fractions = [[1,2,0.50],[1,3,0.333],[2,3,0.667],[1,4,0.25],[3,4,0.75],[1,5,0.20],[2,5,0.40],[3,5,0.60],[4,5,0.80],[9,10,0.90],[19,20,0.95]];
  let best = '', bestDist = Infinity;
  for (const [n, d, frac] of fractions) {
    const dist = Math.abs(p - frac);
    if (dist < bestDist && dist < 0.06) { bestDist = dist; best = `${n} in ${d}`; }
  }
  if (best) return best;
  const x = Math.round(1 / p);
  if (x >= 2 && x <= 100) return `1 in ${x}`;
  return null;
}

// ── Expected Value ──
let _evOpen = false;

function renderEVSection(result, user) {
  document.getElementById('ev-subtitle').textContent = `Weighted across all probable outcomes for ${user.lastRound}`;

  if (!_evOpen) return;

  const el = document.getElementById('ev-content');
  el.innerHTML = `
    <div class="table-wrap" style="margin-top:16px;">
      <table class="sens-table">
        <thead><tr><th>Exit</th><th>P(Outcome)</th><th>Hedge +/-</th><th>P × $</th><th></th></tr></thead>
        <tbody>${result.expectedValue.rows.map(row => `<tr>
          <td class="sens-exit">${row.exitMultipleLabel}</td>
          <td>${(row.probability * 100).toFixed(0)}%</td>
          <td>${fmtCurrencyFull(row.hedgeDiff)}</td>
          <td style="color:${row.weightedDiff > 0 ? '#40A684' : row.weightedDiff < 0 ? '#A13544' : 'inherit'}">${row.weightedDiff >= 0 ? '+' : ''}${fmtCurrencyFull(row.weightedDiff)}</td>
          <td style="color:${row.helpsOrHurts === 'helps' ? '#40A684' : row.helpsOrHurts === 'hurts' ? '#A13544' : 'inherit'};font-size:12px">${row.helpsOrHurts === 'helps' ? 'Helps' : row.helpsOrHurts === 'hurts' ? 'Hurts' : '—'}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="ev-summary">
      <div class="ev-row">
        <span class="ev-label">Expected Value of Hedge</span>
        <span class="ev-value" style="color:${result.expectedValue.totalEV > 0 ? '#40A684' : result.expectedValue.totalEV < 0 ? '#A13544' : 'inherit'}">${result.expectedValue.totalEV >= 0 ? '+' : ''}${fmtCurrencyFull(result.expectedValue.totalEV)}</span>
      </div>
      <div class="ev-stats">
        <span>Hedge helps: <strong style="color:#40A684">${(result.expectedValue.pHedgeHelps * 100).toFixed(0)}%</strong></span>
        <span>Hedge hurts: <strong style="color:#A13544">${(result.expectedValue.pHedgeHurts * 100).toFixed(0)}%</strong></span>
      </div>
      <p class="ev-verdict">${result.expectedValue.verdict}</p>
    </div>`;
}

// === INIT EVENT LISTENERS ===
document.addEventListener('DOMContentLoaded', () => {
  // Initial render
  renderHedge();

  // Select: last round
  document.getElementById('select-last-round').addEventListener('change', e => {
    _hedgeUser.lastRound = e.target.value;
    renderHedge();
  });

  // Select: exit multiple
  document.getElementById('select-exit-multiple').addEventListener('change', e => {
    _hedgeUser.exitMultiple = parseFloat(e.target.value);
    renderHedge();
  });

  // Select: payout scenario
  document.getElementById('select-payout-scenario').addEventListener('change', e => {
    _hedgeUser.hedgePayoutScenario = e.target.value;
    renderHedge();
  });

  // Round economics toggle
  document.getElementById('btn-toggle-advanced').addEventListener('click', () => {
    const card = document.getElementById('round-economics-card');
    const chevron = document.getElementById('advanced-chevron');
    const btn = document.getElementById('btn-toggle-advanced');
    const isHidden = card.classList.contains('hidden');
    card.classList.toggle('hidden', !isHidden);
    chevron.style.transform = isHidden ? 'rotate(180deg)' : '';
    btn.textContent = '';
    btn.appendChild(chevron);
    btn.append(` ${isHidden ? 'Hide' : 'Show'} round economics`);
  });

  // EV toggle
  document.getElementById('btn-toggle-ev').addEventListener('click', () => {
    _evOpen = !_evOpen;
    const content = document.getElementById('ev-content');
    const chevron = document.getElementById('ev-chevron');
    content.classList.toggle('hidden', !_evOpen);
    chevron.style.transform = _evOpen ? 'rotate(180deg)' : '';
    if (_evOpen) {
      const admin = injectFPProbs(loadHedgeAdmin());
      const re = computeRoundEconomics(admin, _hedgeUser);
      const result = computeCalculator(admin, _hedgeUser, re);
      renderEVSection(result, _hedgeUser);
    }
  });

  // Resize: re-render sensitivity chart
  window.addEventListener('resize', () => {
    const admin = injectFPProbs(loadHedgeAdmin());
    const re = computeRoundEconomics(admin, _hedgeUser);
    const result = computeCalculator(admin, _hedgeUser, re);
    renderSensitivityChart(admin, _hedgeUser, result);
  });
});

// Called by admin.js after hedge settings save
function refreshHedge() {
  renderHedge();
}
