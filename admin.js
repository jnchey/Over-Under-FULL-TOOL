// === COMBINED ADMIN PANEL ===
const ADMIN_PIN = '1234';

document.addEventListener('DOMContentLoaded', () => {
  const trigger  = document.getElementById('admin-trigger');
  const overlay  = document.getElementById('admin-overlay');
  const gate     = document.getElementById('admin-gate');
  const content  = document.getElementById('admin-content');
  const pinInput = document.getElementById('admin-pin');
  const pinSubmit = document.getElementById('pin-submit');
  const pinError = document.getElementById('pin-error');
  const closeBtn = document.getElementById('admin-close');

  // ── Open/Close ──
  trigger.addEventListener('click', () => {
    overlay.classList.remove('hidden');
    gate.classList.remove('hidden');
    content.classList.add('hidden');
    pinInput.value = '';
    pinError.classList.add('hidden');
    setTimeout(() => pinInput.focus(), 80);
  });

  function closeAdmin() { overlay.classList.add('hidden'); }
  closeBtn.addEventListener('click', closeAdmin);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeAdmin(); });

  // ── PIN auth ──
  function tryUnlock() {
    if (pinInput.value === ADMIN_PIN) {
      gate.classList.add('hidden');
      content.classList.remove('hidden');
      populateFP();
      populateHedge();
    } else {
      pinError.classList.remove('hidden');
      pinInput.value = '';
      pinInput.focus();
    }
  }
  pinSubmit.addEventListener('click', tryUnlock);
  pinInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') tryUnlock();
    pinError.classList.add('hidden');
  });

  // ── Admin tab toggle ──
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.adminTab;
      document.getElementById('admin-section-founder-path').classList.toggle('hidden', tab !== 'founder-path');
      document.getElementById('admin-section-hedge').classList.toggle('hidden', tab !== 'hedge');
    });
  });

  // ══════════════════════════════
  //  FOUNDER PATH ADMIN
  // ══════════════════════════════
  function populateFP() {
    const a = loadAssumptions();
    document.getElementById('admin-cohort').value = a.cohortSize || 10000;
    ['Seed', 'Series A', 'Series B', 'Series C'].forEach(stage => {
      const el = document.getElementById(`grad-${stage}`);
      if (el) el.value = (a.graduationRates[stage] * 100).toFixed(2);
    });
    renderExitTable(a);
    updateFPOutputs(a);
  }

  function renderExitTable(a) {
    const body = document.getElementById('exit-dist-body');
    const stages = ['Seed', 'Series A', 'Series B', 'Series C'];
    body.innerHTML = stages.map(stage => {
      const d = a.exitDistributions[stage];
      const sum = (d.failed + d.half + d.one + d.twohalf) * 100;
      const sumClass = Math.abs(sum - 100) < 1.5 ? 'sum-ok' : 'sum-warn';
      return `<tr>
        <td class="admin-table-stage">${stage}</td>
        <td><input type="number" class="admin-input admin-input-sm exit-input" data-stage="${stage}" data-key="failed" value="${(d.failed * 100).toFixed(1)}" step="0.1" min="0" max="100"></td>
        <td><input type="number" class="admin-input admin-input-sm exit-input" data-stage="${stage}" data-key="half" value="${(d.half * 100).toFixed(1)}" step="0.1" min="0" max="100"></td>
        <td><input type="number" class="admin-input admin-input-sm exit-input" data-stage="${stage}" data-key="one" value="${(d.one * 100).toFixed(1)}" step="0.1" min="0" max="100"></td>
        <td><input type="number" class="admin-input admin-input-sm exit-input" data-stage="${stage}" data-key="twohalf" value="${(d.twohalf * 100).toFixed(1)}" step="0.1" min="0" max="100"></td>
        <td class="sum-cell ${sumClass}" id="fp-sum-${stage}">${sum.toFixed(1)}%</td>
      </tr>`;
    }).join('');

    body.querySelectorAll('.exit-input').forEach(input => {
      input.addEventListener('input', () => {
        const stage = input.dataset.stage;
        const row = body.querySelectorAll(`[data-stage="${stage}"]`);
        let sum = 0;
        row.forEach(el => sum += parseFloat(el.value) || 0);
        const cell = document.getElementById(`fp-sum-${stage}`);
        cell.textContent = sum.toFixed(1) + '%';
        cell.className = 'sum-cell ' + (Math.abs(sum - 100) < 1.5 ? 'sum-ok' : 'sum-warn');
        updateFPOutputs(readFPValues());
      });
    });
  }

  function readFPValues() {
    const a = { cohortSize: parseInt(document.getElementById('admin-cohort').value) || 10000, graduationRates: {}, exitDistributions: {} };
    ['Seed', 'Series A', 'Series B', 'Series C'].forEach(stage => {
      const gradEl = document.getElementById(`grad-${stage}`);
      a.graduationRates[stage] = (parseFloat(gradEl.value) || 0) / 100;
      a.exitDistributions[stage] = {};
      ['failed', 'half', 'one', 'twohalf'].forEach(key => {
        const el = document.querySelector(`.exit-input[data-stage="${stage}"][data-key="${key}"]`);
        a.exitDistributions[stage][key] = (parseFloat(el.value) || 0) / 100;
      });
    });
    return a;
  }

  function updateFPOutputs(a) {
    const el = document.getElementById('admin-outputs-fp');
    const cohort = a.cohortSize || 10000;
    const stages = ['Seed', 'Series A', 'Series B', 'Series C'];
    let remaining = 1.0;
    const stageRows = stages.map(stage => {
      const entering = remaining;
      const gradRate = a.graduationRates[stage];
      const graduating = entering * gradRate;
      remaining = graduating;
      return `<div class="output-row"><span class="output-label">${stage}</span><span class="output-value">${Math.round(entering * cohort).toLocaleString()} enter → ${Math.round(graduating * cohort).toLocaleString()} advance (${(gradRate * 100).toFixed(1)}%)</span></div>`;
    }).join('');

    const paths = buildPaths(a);
    const outcomes = [
      { key: 'advanced', label: 'Unicorn Status' },
      { key: 'twohalf', label: '2.5X Return' },
      { key: 'one', label: '1X Return' },
      { key: 'half', label: '0.5X Return' },
      { key: 'failed', label: 'Failed (0X)' },
    ];
    const totalCheck = paths.reduce((s, p) => s + p.probability, 0);
    const outcomeRows = outcomes.map(o => {
      const total = paths.filter(p => p.outcome === o.key).reduce((s, p) => s + p.probability, 0);
      return `<div class="output-row"><span class="output-label">${o.label}</span><span class="output-value">${(total * 100).toFixed(2)}% (${Math.round(total * cohort).toLocaleString()} founders)</span></div>`;
    }).join('');

    el.innerHTML = `
      <div class="output-group"><div class="output-group-label">Stage Flow</div>${stageRows}</div>
      <div class="output-group"><div class="output-group-label">Aggregate Outcomes</div>${outcomeRows}
        <div class="output-row output-row-total"><span class="output-label">Total</span><span class="output-value ${Math.abs(totalCheck - 1) < 0.005 ? 'sum-ok' : 'sum-warn'}">${(totalCheck * 100).toFixed(2)}%</span></div>
      </div>`;
  }

  document.querySelectorAll('[id^="grad-"]').forEach(input => {
    input.addEventListener('input', () => updateFPOutputs(readFPValues()));
  });
  document.getElementById('admin-cohort').addEventListener('input', () => updateFPOutputs(readFPValues()));

  document.getElementById('admin-save-fp').addEventListener('click', () => {
    const a = readFPValues();
    saveAssumptions(a);
    refreshAll();
    closeAdmin();
  });

  document.getElementById('admin-reset-fp').addEventListener('click', () => {
    _activeAssumptions = null;
    refreshAll();
    populateFP();
  });

  // ══════════════════════════════
  //  HEDGE ADMIN
  // ══════════════════════════════
  function populateHedge() {
    const a = loadHedgeAdmin();
    // Round economics
    setHedgeField('hadmin-seedPostMoney', a.seedPostMoney);
    setHedgeField('hadmin-stepUpMultiple', a.stepUpMultiple);
    setHedgeField('hadmin-seedOwnership', a.seedOwnership * 100);
    setHedgeField('hadmin-dilutionSeriesA', a.dilutionSeriesA * 100);
    setHedgeField('hadmin-dilutionSeriesB', a.dilutionSeriesB * 100);
    // Hedge params
    setHedgeField('hadmin-hedgeMultiplierLow', a.hedgeMultiplierLow);
    setHedgeField('hadmin-hedgeMultiplierMed', a.hedgeMultiplierMed);
    setHedgeField('hadmin-hedgeMultiplierHigh', a.hedgeMultiplierHigh);
    setHedgeField('hadmin-hedgePayoutCap', a.hedgePayoutCap);
    // Liq pref
    setHedgeField('hadmin-liqPrefStructure', a.liqPrefStructure);
    setHedgeField('hadmin-liqPrefMultiple', a.liqPrefMultiple);
    updateHedgeOutputs(a);
  }

  function setHedgeField(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  function readHedgeValues() {
    const a = {
      seedPostMoney:       parseFloat(document.getElementById('hadmin-seedPostMoney').value) || DEFAULT_HEDGE_ADMIN.seedPostMoney,
      stepUpMultiple:      parseFloat(document.getElementById('hadmin-stepUpMultiple').value) || DEFAULT_HEDGE_ADMIN.stepUpMultiple,
      seedOwnership:       (parseFloat(document.getElementById('hadmin-seedOwnership').value) || 0) / 100,
      dilutionSeriesA:     (parseFloat(document.getElementById('hadmin-dilutionSeriesA').value) || 0) / 100,
      dilutionSeriesB:     (parseFloat(document.getElementById('hadmin-dilutionSeriesB').value) || 0) / 100,
      optionPoolDilution:  DEFAULT_HEDGE_ADMIN.optionPoolDilution,
      hedgeMultiplierLow:  parseFloat(document.getElementById('hadmin-hedgeMultiplierLow').value) || DEFAULT_HEDGE_ADMIN.hedgeMultiplierLow,
      hedgeMultiplierMed:  parseFloat(document.getElementById('hadmin-hedgeMultiplierMed').value) || DEFAULT_HEDGE_ADMIN.hedgeMultiplierMed,
      hedgeMultiplierHigh: parseFloat(document.getElementById('hadmin-hedgeMultiplierHigh').value) || DEFAULT_HEDGE_ADMIN.hedgeMultiplierHigh,
      hedgePayoutCap:      parseFloat(document.getElementById('hadmin-hedgePayoutCap').value) || 0,
      liqPrefStructure:    document.getElementById('hadmin-liqPrefStructure').value,
      liqPrefMultiple:     parseFloat(document.getElementById('hadmin-liqPrefMultiple').value) || DEFAULT_HEDGE_ADMIN.liqPrefMultiple,
      exitMultiples: DEFAULT_HEDGE_ADMIN.exitMultiples,
    };

    // Probabilities always derived from Founder Path (single source of truth)
    const fpA = loadAssumptions();
    const d = fpA.exitDistributions;
    a.probSeed    = [d['Seed'].failed,     d['Seed'].half,     d['Seed'].one,     d['Seed'].twohalf];
    a.probSeriesA = [d['Series A'].failed, d['Series A'].half, d['Series A'].one, d['Series A'].twohalf];
    a.probSeriesB = [d['Series B'].failed, d['Series B'].half, d['Series B'].one, d['Series B'].twohalf];
    a.gradRateSeedToA = fpA.graduationRates['Seed'];
    a.gradRateAToB    = fpA.graduationRates['Series A'];

    return a;
  }

  function updateHedgeOutputs(a) {
    const el = document.getElementById('admin-outputs-hedge');
    const re = computeRoundEconomics(a, DEFAULT_HEDGE_USER);
    const rounds = ['Seed', 'Series A', 'Series B'];
    el.innerHTML = `<div class="output-group"><div class="output-group-label">Round Overview</div>
      ${rounds.map((r, i) => `<div class="output-row">
        <span class="output-label">${r}</span>
        <span class="output-value">Post-money ${fmtCurrencyFull(re.postMoney[i])} · Ownership ${(re.ownership[i] * 100).toFixed(1)}% · Position ${fmtCurrencyFull(re.totalPositionValue[i])}</span>
      </div>`).join('')}
    </div>`;
  }

  // Live updates on hedge admin field changes
  ['hadmin-seedPostMoney','hadmin-stepUpMultiple','hadmin-seedOwnership','hadmin-dilutionSeriesA','hadmin-dilutionSeriesB'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => updateHedgeOutputs(readHedgeValues()));
  });

  document.getElementById('admin-save-hedge').addEventListener('click', () => {
    const a = readHedgeValues();
    saveHedgeAdmin(a);
    refreshHedge();
    closeAdmin();
  });

  document.getElementById('admin-reset-hedge').addEventListener('click', () => {
    _hedgeAdmin = null;
    populateHedge();
    refreshHedge();
  });
});
