// === FOUNDER PATH VIZ — adapted for merged Over/Under suite ===
// Core visualization logic unchanged; tab wiring updated for 3-tab shell

// === TUNABLE ASSUMPTIONS ===
const DEFAULT_ASSUMPTIONS = {
  cohortSize: 10000,
  graduationRates: {
    'Seed':     0.1976,
    'Series A': 0.2546,
    'Series B': 0.3638,
    'Series C': 0.3443,
  },
  exitDistributions: {
    'Seed':     { failed: 0.7551, half: 0.1238, one: 0.0707, twohalf: 0.0505 },
    'Series A': { failed: 0.6137, half: 0.1792, one: 0.1276, twohalf: 0.0795 },
    'Series B': { failed: 0.3875, half: 0.3156, one: 0.1688, twohalf: 0.1281 },
    'Series C': { failed: 0.2667, half: 0.4417, one: 0.1917, twohalf: 0.1000 },
  },
};

let _activeAssumptions = null;

function loadAssumptions() {
  if (_activeAssumptions) return JSON.parse(JSON.stringify(_activeAssumptions));
  return JSON.parse(JSON.stringify(DEFAULT_ASSUMPTIONS));
}

function saveAssumptions(a) {
  _activeAssumptions = JSON.parse(JSON.stringify(a));
}

function buildPaths(assumptions) {
  const a = assumptions || loadAssumptions();
  const paths = [];
  let remaining = 1.0;
  const stages = ['Seed', 'Series A', 'Series B', 'Series C'];
  stages.forEach((stage, si) => {
    const gradRate = a.graduationRates[stage];
    const entering = remaining;
    const graduating = entering * gradRate;
    const exiting = entering - graduating;
    const dist = a.exitDistributions[stage];
    ['failed', 'half', 'one', 'twohalf'].forEach(key => {
      paths.push({ stage, outcome: key, probability: exiting * dist[key], shortLabel: getShortLabel(key, stage) });
    });
    if (si === stages.length - 1) {
      paths.push({ stage, outcome: 'advanced', probability: graduating });
    }
    remaining = graduating;
  });
  return paths;
}

let PATHS = buildPaths();

const STAGES = ['Seed', 'Series A', 'Series B', 'Series C'];
const OUTCOME_ORDER = ['advanced', 'twohalf', 'one', 'half', 'failed'];
const NEXT_ROUND = { 'Seed': 'Series A', 'Series A': 'Series B', 'Series B': 'Series C', 'Series C': 'Series D' };

const BOX_STYLES = {
  advanced: { fill: '#40A684', stroke: '#2e8a6e', text: '#FAF8F5' },
  twohalf:  { fill: 'hsl(38, 14%, 89%)', stroke: 'hsl(38, 12%, 78%)', text: '#1A1814' },
  one:      { fill: 'hsl(38, 11%, 83%)', stroke: 'hsl(38, 9%, 72%)',  text: '#1A1814' },
  half:     { fill: 'hsl(38, 8%, 77%)',  stroke: 'hsl(38, 6%, 66%)',  text: '#1A1814' },
  failed:   { fill: 'hsl(38, 6%, 71%)',  stroke: 'hsl(38, 4%, 60%)',  text: '#1A1814' },
};

const LINE_COLOR = 'rgba(26, 24, 20, 0.15)';
const LINE_HOVER_COLOR = '#40A684';
const TEAL_ACCENT = '#40A684';

const BOX_NOTES = {
  'Seed-advanced': 'Only 1 in 5 Seed-funded companies raise a Series A within three years of the close of their Seed round. The filter here is brutal \u2014 most startups simply run out of runway before finding product-market fit.',
  'Seed-twohalf': 'A 2.5X return from Seed sounds modest, but it could be lifechanging for you as it implies a $30M\u2013$40M exit where founders very likely own >50% of the business, even after a pre-seed raise and creating a generous employee equity pool. It\u2019s also highly unlikely because if you\u2019re doing this well your VC partner will very likely be pushing you to raise a Series A rather than take an exit.',
  'Seed-one': 'Getting your money back from a Seed-stage exit is better than it sounds. Six out of every hundred founders land here \u2014 not a win, but not a wipeout either. You still get to exit at the post-money price of your seed round without triggering liquidation preference. While it\u2019s not where you wanted to go, it\u2019s as good as it gets in a non-ideal outcome.',
  'Seed-half': 'An acqui-hire or fire sale. You get something back, but the dream didn\u2019t work out. 1 in 10 Seed founders end up here. It\u2019s very likely that liquidation preference wipes out most of your stake here. You\u2019ll be lucky to negotiate a small take home from this, whether it\u2019s cash or all equity in the acquiring company.',
  'Seed-failed': 'The most common outcome by far. 6 out of 10 Seed-funded companies return nothing to investors. The startup graveyard is enormous.',
  'Series A-advanced': 'Making it to Series B means you\u2019ve proven real momentum, likely pushing MRR in the $5M\u2013$10M range. But only 1 in 4 Series A companies get here \u2014 the bar for growth metrics is high.',
  'Series A-twohalf': 'You made it through a Series A and exited at 2.5X the post-money of your Series A, so likely landing you at a $100M+ outcome. A solid result that most VCs would be happy with, but it\u2019s rare \u2014 only 1.2% of all founders who raised a Seed round end up here. You have the same dynamic here where if you\u2019re doing this well, it\u2019s likely your investors will be pushing you to raise a Series B and not take an exit.',
  'Series A-one': 'You raised a Series A and broke even on exit. This means you sold the company for the same as your Series A post-money valuation. Likely in the $40M\u2013$60M range. This is just high enough that the pref stack didn\u2019t get you. What you own is what you get to take home.',
  'Series A-half': 'A post-Series A exit at 0.5X means the company had some value but couldn\u2019t hit your growth metrics well enough to attract Series B investors. You\u2019re just happy to be getting something out of the system, but the pref stack is going to get you good. At this point, you\u2019ve likely raised $10M\u2013$20M, which means that gets paid back first before you get a dime.',
  'Series A-failed': 'You made it through a Series A. Even so, every founder that does still has a 47% chance of walking away with zero. This might take the form of a \u201csustainable\u201d company that is no longer high growth, but has no acquisition prospects.',
  'Series B-advanced': 'Series C is rarified air \u2014 only 35% of Series B companies get here, and only 1.75% of venture backed Seed funded startups. The ones that do are building category-defining businesses.',
  'Series B-twohalf': 'A 2.5X exit multiple on the Series B post-money valuation is likely a 15X\u201320X the Seed round post-money valuation and well in line with your investors\u2019 expectations. At this stage, your personal equity holding has likely diluted by 50%+ from your post-seed holding. But who cares when 10% of $250M is $25M in your pocket (or at least on your tax forms).',
  'Series B-one': 'Breaking even at Series B is bittersweet. You built a company worth hundreds of millions in potential, but the exit didn\u2019t reflect it. Getting out with your dignity intact and a positive outcome for you and your investors, without triggering the liquidation preference is a real win for you, even if it doesn\u2019t have all the glory.',
  'Series B-half': 'It\u2019s not fun to hit major road bumps after getting all the way through a Series B and tens of millions of funding behind you. By this point you have built a lot and made an impact on your industry. Your pref stack is substantial at this point, so even a $50M exit may not put much if anything at all in your pocket. You may only get what you negotiate with your investors.',
  'Series B-failed': 'Failure at the Series B stage is particularly painful. More capital, more employees, more expectations \u2014 and still, some companies hit a wall. What\u2019s more likely though is that you\u2019ve officially turned into a zombie with low growth and hopefully positive margins that will carry it in the future.',
  'Series C-advanced': 'Unicorn Status. You did what less than 1% of Seed founders accomplish. You\u2019ve likely taken money off the table now and possibly prior to this as well. Congratulations.',
  'Series C-twohalf': 'A 2.5X exit after Series C is a substantial outcome in absolute dollars, even if the multiple feels modest. These are typically $500M+ exits.',
  'Series C-one': 'You\u2019ve really built a solid business. But the growth just wasn\u2019t there and you couldn\u2019t build on top of the Series C valuation. BUT this is still a great win for you.',
  'Series C-half': 'The stack of the liquidation preference at this point is likely astounding. You\u2019ve probably done multiple bridges along the way as well, pushing down your equity holding while raising the pref stack bar. Being forced to sell under these circumstances after 5\u20138 years of building is incredibly painful. You\u2019ll likely only get what you negotiate from your investors.',
  'Series C-failed': 'Failure after raising through Series C is the rarest and most painful outcome. These companies had every advantage and still couldn\u2019t make it.',
};

function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }

function getStageFlows() {
  const flows = {};
  let remaining = 1.0;
  STAGES.forEach(stage => {
    flows[stage] = { entering: remaining };
    const exiting = PATHS.filter(p => p.stage === stage).reduce((s, p) => s + p.probability, 0);
    flows[stage].exiting = exiting;
    remaining -= exiting;
    flows[stage].graduating = Math.max(remaining, 0);
  });
  return flows;
}

function getBoxLabel(key, stage, si) {
  if (key === 'advanced') return si < STAGES.length - 1 ? `Raised ${NEXT_ROUND[stage]}` : 'Unicorn Status';
  if (key === 'failed') return `Failed at ${stage}`;
  const m = key === 'twohalf' ? '2.5X' : key === 'one' ? '1X' : '0.5X';
  return `${m} Exit`;
}

function getShortLabel(key, stage) {
  if (key === 'advanced') return 'Advance';
  if (key === 'failed') return `Failed at ${stage === 'Seed' ? 'Seed' : stage.replace('Series ', 'Ser. ')}`;
  return key === 'twohalf' ? '2.5X Exit' : key === 'one' ? '1X Exit' : '0.5X Exit';
}

// === JOURNEY VIEW ===
function renderJourney() {
  const container = document.getElementById('journey-canvas');
  container.innerHTML = '';
  const flows = getStageFlows();

  const MIN_GAP = 70;
  const margin = { top: 48, right: 160, bottom: 16, left: 16 };
  const valueMult = [1, 2.75, 7.56, 20.8];
  const maxMult = valueMult[3];
  const minStackW = 105, maxStackW = 230;
  const stackWidths = valueMult.map(m => minStackW + (maxStackW - minStackW) * Math.pow(m / maxMult, 0.45));
  const minBaseH = 240, maxBaseH = 420;
  const stackBaseHeights = valueMult.map(m => minBaseH + (maxBaseH - minBaseH) * Math.pow(m / maxMult, 0.45));
  const totalStackW = stackWidths.reduce((s, sw) => s + sw, 0);
  const availableW = container.clientWidth - margin.left - margin.right;
  const naturalGap = (availableW - totalStackW) / STAGES.length;
  const baseGap = Math.max(naturalGap, MIN_GAP);
  const ENDPOINT_W = 220;
  const W = Math.max(container.clientWidth, totalStackW + baseGap * STAGES.length + margin.left + margin.right + ENDPOINT_W);
  const w = W - margin.left - margin.right;

  let stackPositions = [];
  let curX = baseGap * 0.4;
  STAGES.forEach((_, i) => {
    stackPositions.push({ x: curX, w: stackWidths[i], baseH: stackBaseHeights[i] });
    curX += stackWidths[i] + baseGap;
  });

  const stepDown = 50;
  const tallestStackH = stackBaseHeights[STAGES.length - 1];
  const totalStepDown = (STAGES.length - 1) * stepDown;
  const svgH = tallestStackH + totalStepDown + 58 + margin.bottom;

  const svg = d3.select(container).append('svg').attr('width', W).attr('height', svgH).style('overflow', 'visible');
  const g = svg.append('g').attr('transform', `translate(${margin.left},0)`);
  const baseTopY = 58;

  const stageData = STAGES.map((stageName, si) => {
    const sp = stackPositions[si];
    const exits = PATHS.filter(p => p.stage === stageName);
    const stageFlow = flows[stageName];
    const outcomes = [];

    OUTCOME_ORDER.forEach(key => {
      if (key === 'advanced') {
        if (si < STAGES.length - 1) {
          const prob = stageFlow.graduating;
          outcomes.push({ key, label: getBoxLabel(key, stageName, si), shortLabel: getShortLabel(key, stageName),
            share: prob / stageFlow.entering, probability: prob, stage: stageName, isAdvance: true });
        } else {
          const ap = exits.find(e => e.outcome === 'advanced');
          if (ap) outcomes.push({ key, label: getBoxLabel(key, stageName, si), shortLabel: getShortLabel(key, stageName),
            share: ap.probability / stageFlow.entering, probability: ap.probability, stage: stageName, isAdvance: true });
        }
      } else {
        const p = exits.find(e => e.outcome === key);
        if (p) outcomes.push({ key, label: getBoxLabel(key, stageName, si), shortLabel: getShortLabel(key, stageName),
          share: p.probability / stageFlow.entering, probability: p.probability, stage: stageName, isAdvance: false });
      }
    });

    const stackH = sp.baseH;
    const stackTop = baseTopY + si * stepDown;
    const boxGap = 3;
    const usableH = stackH - boxGap * (outcomes.length - 1);

    let cy = stackTop;
    const boxes = outcomes.map(o => {
      const h = Math.max(usableH * o.share, 20);
      const box = { ...o, x: sp.x, y: cy, w: sp.w, h, cx: sp.x + sp.w / 2, cy: cy + h / 2, stageIndex: si };
      cy += h + boxGap;
      return box;
    });

    return { name: stageName, index: si, boxes, sp, stackTop, flow: stageFlow };
  });

  const GRAY_MIN_H = 36;
  stageData.forEach(sd => {
    const totalH = sd.boxes.reduce((s, b) => s + b.h, 0);
    const usable = sd.sp.baseH - 3 * (sd.boxes.length - 1);
    if (totalH > 0) {
      const scale = usable / totalH;
      let cy = sd.stackTop;
      sd.boxes.forEach(b => {
        b.h = b.isAdvance ? Math.max(b.h * scale, 18) : Math.max(b.h * scale, GRAY_MIN_H);
        b.y = cy; b.cy = cy + b.h / 2; cy += b.h + 3;
      });
    }
  });

  for (let si = 0; si < stageData.length - 1; si++) {
    const adv = stageData[si].boxes.find(b => b.isAdvance);
    if (!adv) continue;
    const x0 = adv.x + adv.w, y0 = adv.cy;
    stageData[si + 1].boxes.forEach(tb => {
      const x1 = tb.x, y1 = tb.cy, mx = (x0 + x1) / 2;
      const lw = Math.max(1.2, Math.min(tb.h * 0.12, 3.5));
      g.append('path').attr('d', `M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1}`)
        .attr('fill', 'none').attr('stroke', LINE_COLOR)
        .attr('stroke-width', lw).attr('data-base-width', lw)
        .attr('class', `connect-line connect-target-${si+1}-${tb.key}`)
        .style('pointer-events', 'none');
    });
  }

  const lastAdv = stageData[3].boxes.find(b => b.isAdvance);
  if (lastAdv) {
    const x0 = lastAdv.x + lastAdv.w, y0 = lastAdv.cy;
    const txtX = x0 + 16;
    const hitW = 110, hitH = 100;

    g.append('path').attr('d', `M${x0},${y0} Q${x0 + 12},${y0} ${txtX},${y0}`)
      .attr('fill', 'none').attr('stroke', LINE_COLOR).attr('stroke-width', 1.5)
      .attr('class', 'connect-line connect-target-3-advanced-endpoint');

    g.append('text').attr('x', txtX).attr('y', y0 - 6)
      .attr('font-family', 'var(--font-display)').attr('font-size', '36px').attr('font-weight', '400')
      .attr('fill', TEAL_ACCENT).attr('class', 'billion-label').style('pointer-events', 'none').text('$1B+');
    g.append('text').attr('x', txtX).attr('y', y0 + 16)
      .attr('font-family', 'var(--font-body)').attr('font-size', '12px').attr('font-weight', '500')
      .attr('fill', '#6B6964').attr('class', 'billion-label').style('pointer-events', 'none').text('Valuation');
    g.append('text').attr('x', txtX).attr('y', y0 + 32)
      .attr('font-family', 'var(--font-body)').attr('font-size', '11px').attr('font-weight', '500')
      .attr('fill', '#A8A6A1').attr('class', 'billion-label').style('pointer-events', 'none')
      .style('font-variant-numeric', 'tabular-nums')
      .text(`${Math.round(lastAdv.probability * 10000)} of 10,000`);

    g.append('rect')
      .attr('x', txtX - 4).attr('y', y0 - 48)
      .attr('width', hitW).attr('height', hitH)
      .attr('fill', 'transparent').attr('stroke', TEAL_ACCENT)
      .attr('stroke-width', 1).attr('stroke-opacity', 0.35).attr('rx', 4)
      .attr('class', `outcome-box outcome-box-3-advanced`)
      .datum(lastAdv).style('cursor', 'pointer')
      .on('mouseenter', function(_, d) { handleBoxHover(g, d); })
      .on('mouseleave', function(_, d) { handleBoxLeave(g); })
      .on('click', function(event, d) { event.stopPropagation(); handleBoxClick(g, d); });
  }

  stageData.forEach(sd => {
    const count = Math.round(sd.flow.entering * 10000);

    g.append('text').attr('x', sd.sp.x + sd.sp.w / 2).attr('y', sd.stackTop - 24)
      .attr('text-anchor', 'middle').attr('font-family', 'var(--font-display)')
      .attr('font-size', '28px').attr('font-weight', '400').attr('fill', '#1A1814')
      .text(sd.name);

    g.append('text').attr('x', sd.sp.x + sd.sp.w / 2).attr('y', sd.stackTop - 8)
      .attr('text-anchor', 'middle').attr('font-family', 'var(--font-body)')
      .attr('font-size', '11px').attr('font-weight', '500').attr('fill', '#6B6964')
      .style('font-variant-numeric', 'tabular-nums').text(`${count.toLocaleString()} Founders`);

    sd.boxes.forEach(box => {
      const style = BOX_STYLES[box.key];

      g.append('rect').attr('x', box.x).attr('y', box.y).attr('width', box.w).attr('height', box.h)
        .attr('rx', 4).attr('fill', style.fill).attr('stroke', style.stroke).attr('stroke-width', 1)
        .attr('class', `outcome-box outcome-box-${box.stageIndex}-${box.key}`)
        .datum(box).style('cursor', 'pointer')
        .on('mouseenter', function(_, d) { handleBoxHover(g, d); })
        .on('mouseleave', function() { handleBoxLeave(g); })
        .on('click', function(event, d) { event.stopPropagation(); handleBoxClick(g, d); });

      let pct;
      if (box.isAdvance) pct = (box.share * 100).toFixed(0) + '%';
      else if (box.probability >= 0.01) pct = (box.probability * 100).toFixed(1) + '%';
      else pct = (box.probability * 100).toFixed(2) + '%';

      const maxTW = box.w - 10;

      if (box.h >= 32) {
        const isAdv = box.isAdvance;
        const fs1 = isAdv ? (box.h > 80 ? 14 : 13) : 12;
        const fs2 = isAdv ? (box.h > 80 ? 22 : 18) : 12;
        const labelY = isAdv ? box.cy - (box.h > 80 ? 12 : 10) : box.cy - 5;
        const pctY   = isAdv ? box.cy + (box.h > 80 ? 14 : 11) : box.cy + 10;
        const disp = box.label.length * (fs1 * 0.55) > maxTW ? box.shortLabel : box.label;
        g.append('text').attr('x', box.cx).attr('y', labelY).attr('text-anchor', 'middle')
          .attr('font-family', 'var(--font-body)').attr('font-size', fs1 + 'px').attr('font-weight', '600')
          .attr('fill', style.text).attr('class', `outcome-label outcome-label-${box.stageIndex}-${box.key}`)
          .datum(box).style('pointer-events', 'none').text(disp);
        g.append('text').attr('x', box.cx).attr('y', pctY).attr('text-anchor', 'middle')
          .attr('font-family', 'var(--font-display)').attr('font-size', fs2 + 'px')
          .attr('font-weight', isAdv ? '400' : '500')
          .attr('fill', style.text).attr('opacity', isAdv ? 1 : 0.7)
          .attr('class', `outcome-label outcome-label-${box.stageIndex}-${box.key}`)
          .datum(box).style('pointer-events', 'none').style('font-variant-numeric', 'tabular-nums').text(pct);
      } else if (box.h >= 18) {
        const single = `${box.shortLabel} · ${pct}`;
        const fs = box.h >= 24 ? 10 : 9;
        const disp = single.length * (fs * 0.55) > maxTW ? pct : single;
        g.append('text').attr('x', box.cx).attr('y', box.cy).attr('dy', '0.35em')
          .attr('text-anchor', 'middle').attr('font-family', 'var(--font-body)')
          .attr('font-size', fs + 'px').attr('font-weight', '600').attr('fill', style.text)
          .attr('class', `outcome-label outcome-label-${box.stageIndex}-${box.key}`)
          .datum(box).style('pointer-events', 'none').text(disp);
      }
    });
  });

  container._stageData = stageData;
  initClickOutside(svg, g);
}

let _lockedBox = null;

function applyPathHighlight(g, d) {
  g.selectAll('.outcome-box').attr('opacity', 0.15);
  g.selectAll('.outcome-label').attr('opacity', 0.15);
  g.selectAll('.connect-line').attr('opacity', 0.06);

  g.selectAll(`.outcome-box-${d.stageIndex}-${d.key}`)
    .attr('opacity', 1).attr('stroke', TEAL_ACCENT).attr('stroke-width', 2.5);
  g.selectAll(`.outcome-label-${d.stageIndex}-${d.key}`).attr('opacity', 1);

  for (let i = 0; i < d.stageIndex; i++) {
    g.selectAll(`.outcome-box-${i}-advanced`)
      .attr('opacity', 1).attr('stroke', TEAL_ACCENT).attr('stroke-width', 2.5);
    g.selectAll(`.outcome-label-${i}-advanced`).attr('opacity', 1);
    if (i < d.stageIndex - 1) {
      g.selectAll(`.connect-target-${i + 1}-advanced`)
        .attr('opacity', 1).attr('stroke', TEAL_ACCENT).attr('stroke-width', 2.5);
    }
    if (i === d.stageIndex - 1) {
      g.selectAll(`.connect-target-${d.stageIndex}-${d.key}`)
        .attr('opacity', 1).attr('stroke', TEAL_ACCENT).attr('stroke-width', 2.5);
    }
  }
}

function clearPathHighlight(g) {
  g.selectAll('.outcome-box').attr('opacity', 1)
    .each(function() {
      const box = d3.select(this).datum();
      if (box) {
        const style = BOX_STYLES[box.key];
        d3.select(this).attr('stroke', style.stroke).attr('stroke-width', 1);
      }
    });
  g.selectAll('.outcome-label').attr('opacity', 1);
  g.selectAll('.connect-line').attr('opacity', 1).attr('stroke', LINE_COLOR)
    .each(function() {
      const el = d3.select(this);
      el.attr('stroke-width', el.attr('data-base-width') || 1.5);
    });
}

let _leaveTimer = null;
document.addEventListener('touchstart', () => { _touchMoved = false; }, { passive: true });
document.addEventListener('touchmove', () => { _touchMoved = true; }, { passive: true });

function handleBoxHover(g, d) {
  if (_leaveTimer) { clearTimeout(_leaveTimer); _leaveTimer = null; }
  if (_lockedBox && (_lockedBox.stageIndex !== d.stageIndex || _lockedBox.key !== d.key)) return;
  if (_lockedCard) return;
  applyPathHighlight(g, d);
  showTooltip(d);
}

function handleBoxLeave(g) {
  if (_lockedBox) return;
  if (_lockedCard) return;
  _leaveTimer = setTimeout(() => {
    _leaveTimer = null;
    clearPathHighlight(g);
    resetTooltip();
  }, 60);
}

function handleBoxClick(g, d) {
  if (_lockedBox && _lockedBox.stageIndex === d.stageIndex && _lockedBox.key === d.key) {
    _lockedBox = null;
    clearPathHighlight(g);
    resetTooltip();
    setLockIndicator(false);
    return;
  }
  _lockedBox = { stageIndex: d.stageIndex, key: d.key };
  applyPathHighlight(g, d);
  showTooltip(d);
  setLockIndicator(true);
}

function setLockIndicator(locked) {
  const panel = document.getElementById('tooltip-panel');
  if (panel) panel.classList.toggle('is-locked', locked);
}

let _touchMoved = false;

function initClickOutside(svg, g) {
  svg.on('click', function(event) {
    if (_touchMoved) return;
    if (!_lockedBox) return;
    if (!event.target.classList.contains('outcome-box') &&
        !d3.select(event.target).classed('outcome-box')) {
      _lockedBox = null;
      if (!_lockedCard) {
        clearPathHighlight(g);
        resetTooltip();
      }
      setLockIndicator(false);
    }
  });
}

function showTooltip(d) {
  const statsEl = document.getElementById('tooltip-stats');
  const noteEl = document.getElementById('tooltip-note');
  const titleEl = document.getElementById('tooltip-title');
  const pct = (d.probability * 100).toFixed(2);
  const count = Math.round(d.probability * 10000);

  if (d.isAdvance) {
    titleEl.textContent = `${d.stage}: ${count.toLocaleString()} founders advance`;
    statsEl.innerHTML = `
      <div class="tooltip-stat"><span class="tooltip-stat-label">Probability</span><span class="tooltip-stat-value">${pct}%</span></div>
      <div class="tooltip-stat"><span class="tooltip-stat-label">Share of round</span><span class="tooltip-stat-value">${(d.share * 100).toFixed(1)}% of ${d.stage}</span></div>
      <div class="tooltip-stat"><span class="tooltip-stat-label">Founders</span><span class="tooltip-stat-value">${count.toLocaleString()} of 10,000</span></div>
      <div class="tooltip-stat"><span class="tooltip-stat-label">Odds</span><span class="tooltip-stat-value">${fmtOdds(d.probability)}</span></div>`;
  } else {
    const tot = PATHS.filter(p => p.outcome === d.key).reduce((s, p) => s + p.probability, 0);
    titleEl.textContent = `${d.stage}: ${d.label}`;
    statsEl.innerHTML = `
      <div class="tooltip-stat"><span class="tooltip-stat-label">Probability</span><span class="tooltip-stat-value">${pct}%</span></div>
      <div class="tooltip-stat"><span class="tooltip-stat-label">Founders</span><span class="tooltip-stat-value">${count.toLocaleString()} of 10,000</span></div>
      <div class="tooltip-stat"><span class="tooltip-stat-label">Odds</span><span class="tooltip-stat-value">${fmtOdds(d.probability)}</span></div>
      <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(250,248,245,0.08)">
        <div class="tooltip-stat"><span class="tooltip-stat-label" style="opacity:0.5">All ${d.shortLabel} outcomes</span><span class="tooltip-stat-value">${(tot * 100).toFixed(1)}% (${Math.round(tot * 10000).toLocaleString()})</span></div>
      </div>`;
  }

  const noteKey = `${d.stage}-${d.key}`;
  const note = BOX_NOTES[noteKey] || '';
  noteEl.innerHTML = `<p class="tooltip-note-text">${note}</p>`;
}

function resetTooltip() {
  document.getElementById('tooltip-title').textContent = 'Hover over a path to explore';
  document.getElementById('tooltip-stats').innerHTML = '<p class="tooltip-hint">Each box represents a group of founders.</p>';
  document.getElementById('tooltip-note').innerHTML = '<p class="tooltip-hint">The box height shows the probability of that outcome.</p>';
}

function fmtOdds(p) {
  if (p >= 0.9) return `${Math.round(p * 10)} in 10`;
  if (p < 0.001) return `1 in ${Math.round(1 / p).toLocaleString()}`;
  // Only use fraction approximations for p >= 10%. Below that, the 0.025
  // absolute tolerance would match fractions wildly far from the true value
  // (e.g. 0.41% incorrectly matching "1 in 40" = 2.5%).
  if (p >= 0.10) {
    const f = [[7,10],[3,5],[1,2],[2,5],[1,3],[1,4],[1,5],[1,6],[1,7],[1,8],[1,10]];
    for (const [n, d] of f) if (Math.abs(p - n / d) < 0.025) return `${n} in ${d}`;
  }
  return `1 in ${Math.round(1 / p).toLocaleString()}`;
}

// === DESTINATION VIEW ===
let _lockedDest = null;
let _destGEl = null;
let _destAgg = null;
let _destBarW = 0;
const DEST_OUTCOME_KEYS = ['failed', 'half', 'one', 'twohalf', 'advanced'];

function renderDestination() {
  const container = document.getElementById('dest-canvas');
  container.innerHTML = '';
  const outcomes = [
    { key: 'failed', label: 'Failed (0x)' }, { key: 'half', label: '0.5x Return' },
    { key: 'one', label: '1x Return' }, { key: 'twohalf', label: '2.5x Return' },
    { key: 'advanced', label: 'Unicorn Status' }
  ];
  const agg = outcomes.map(o => {
    const total = PATHS.filter(p => p.outcome === o.key).reduce((s, p) => s + p.probability, 0);
    return { ...o, probability: total, count: Math.round(total * 10000),
      breakdown: PATHS.filter(p => p.outcome === o.key) };
  });

  const cW = Math.max(container.clientWidth, 580);
  const ml = 140, mr = 100, mt = 40, mb = 16;
  const w = cW - ml - mr;
  const barH = 42, gap = 14;
  const h = agg.length * (barH + gap) - gap;

  const svg = d3.select(container).append('svg').attr('width', cW).attr('height', h + mt + mb);
  const gEl = svg.append('g').attr('transform', `translate(${ml},${mt})`);
  _destGEl = gEl; _destAgg = agg;
  _destBarW = w;

  svg.append('text').attr('x', ml).attr('y', 24).attr('font-family', 'var(--font-body)')
    .attr('font-size', '14px').attr('font-weight', '500').attr('fill', '#6B6964')
    .text('Where do all 10,000 founders end up?');

  const xScale = d3.scaleLinear().domain([0, d3.max(agg, d => d.probability)]).range([0, w]);

  agg.forEach((d, i) => {
    const y = i * (barH + gap);
    const style = BOX_STYLES[d.key];
    const rowG = gEl.append('g').attr('class', `dest-row dest-row-${i}`);

    rowG.append('text').attr('x', -12).attr('y', y + barH / 2).attr('dy', '0.35em').attr('text-anchor', 'end')
      .attr('font-family', 'var(--font-body)').attr('font-size', '13px').attr('font-weight', '600').attr('fill', '#1A1814')
      .attr('class', 'dest-label').text(d.label);

    rowG.append('rect').attr('x', 0).attr('y', y).attr('width', 0).attr('height', barH).attr('rx', 4)
      .attr('fill', style.fill).attr('stroke', style.stroke).attr('stroke-width', 1)
      .attr('class', 'dest-bar').attr('data-orig-stroke', style.stroke)
      .transition().duration(700).ease(d3.easeCubicOut).attr('width', xScale(d.probability));

    rowG.append('text').attr('x', xScale(d.probability) + 10).attr('y', y + barH / 2 - 4).attr('dy', '0.35em')
      .attr('font-family', 'var(--font-body)').attr('font-size', '15px').attr('font-weight', '700').attr('fill', '#1A1814')
      .attr('class', 'dest-value').style('font-variant-numeric', 'tabular-nums').text(`${(d.probability * 100).toFixed(1)}%`);

    rowG.append('text').attr('x', xScale(d.probability) + 10).attr('y', y + barH / 2 + 12).attr('dy', '0.35em')
      .attr('font-family', 'var(--font-body)').attr('font-size', '11px').attr('fill', '#6B6964')
      .attr('class', 'dest-count').style('font-variant-numeric', 'tabular-nums').text(`${d.count.toLocaleString()} founders`);

    rowG.append('rect').attr('x', -ml).attr('y', y - gap / 2).attr('width', cW).attr('height', barH + gap)
      .attr('fill', 'transparent').style('cursor', 'pointer')
      .on('mouseenter', () => {
        if (_lockedDest !== null && _lockedDest !== i) return;
        handleDestHover(gEl, i, d);
      })
      .on('mouseleave', () => {
        if (_lockedDest !== null) return;
        handleDestLeave(gEl);
      })
      .on('click', (event) => {
        if (_touchMoved) return;
        event.stopPropagation();
        const key = DEST_OUTCOME_KEYS[i];
        const grid = document.getElementById('summary-grid-dest');
        if (_lockedDest === i) {
          _lockedDest = null; _lockedCard = null;
          handleDestLeave(gEl);
          gEl.selectAll('.dest-row').classed('dest-locked', false);
          if (grid) { grid.querySelectorAll('.summary-card').forEach(c => { c.classList.remove('is-locked'); c.style.opacity = '1'; }); }
        } else {
          _lockedDest = i; _lockedCard = key;
          gEl.selectAll('.dest-row').classed('dest-locked', false);
          gEl.select(`.dest-row-${i}`).classed('dest-locked', true);
          handleDestHover(gEl, i, d);
          if (grid) {
            grid.querySelectorAll('.summary-card').forEach(c => {
              c.classList.remove('is-locked');
              c.style.opacity = c.dataset.outcome === key ? '1' : '0.3';
            });
            const match = grid.querySelector(`.summary-card[data-outcome="${key}"]`);
            if (match) match.classList.add('is-locked');
          }
        }
      });
  });

  svg.on('click', (event) => {
    if (_touchMoved) return;
    if (_lockedDest === null) return;
    if (event.target.closest && event.target.closest('.dest-row')) return;
    _lockedDest = null;
    gEl.selectAll('.dest-row').classed('dest-locked', false);
    handleDestLeave(gEl);
  });
}

function handleDestHover(gEl, activeIdx, d) {
  gEl.selectAll('.dest-row').attr('opacity', 0.2);
  gEl.select(`.dest-row-${activeIdx}`).attr('opacity', 1);
  gEl.select(`.dest-row-${activeIdx} .dest-bar`)
    .attr('stroke', TEAL_ACCENT).attr('stroke-width', 2.5);
  showDestTooltip(d);
  const key = DEST_OUTCOME_KEYS[activeIdx];
  if (key) applySDOutcomeHighlight(key);
  if (key) updateDestContextPanel(key);
}

function handleDestLeave(gEl) {
  gEl.selectAll('.dest-row').attr('opacity', 1);
  gEl.selectAll('.dest-bar').each(function() {
    const el = d3.select(this);
    el.attr('stroke', el.attr('data-orig-stroke')).attr('stroke-width', 1);
  });
  resetTooltip();
  if (_lockedDest === null) clearDestContextPanel();
  clearSDOutcomeHighlight();
}

function applyDestHighlight(key) {
  if (!_destGEl || !_destAgg) return;
  const idx = DEST_OUTCOME_KEYS.indexOf(key);
  if (idx < 0) return;
  handleDestHover(_destGEl, idx, _destAgg[idx]);
}

function clearDestHighlight() {
  if (!_destGEl) return;
  handleDestLeave(_destGEl);
}

// === STAGE DISTRIBUTION CHART ===
let _sdGEl = null;
let _sdRows = null;

function renderStageDistribution() {
  const container = document.getElementById('stage-dist-canvas');
  if (!container) return;
  container.innerHTML = '';

  const a = loadAssumptions();
  const stages = ['Seed', 'Series A', 'Series B', 'Series C'];
  const rows = stages.map((stage, si) => {
    const grad = a.graduationRates[stage];
    const exit = 1 - grad;
    const d = a.exitDistributions[stage];
    return {
      stage, si,
      segments: [
        { key: 'advanced', label: 'Advanced',  pct: grad },
        { key: 'twohalf',  label: '2.5X Exit', pct: exit * d.twohalf },
        { key: 'one',      label: '1X Exit',   pct: exit * d.one },
        { key: 'half',     label: '0.5X Exit', pct: exit * d.half },
        { key: 'failed',   label: 'Failed',    pct: exit * d.failed },
      ]
    };
  });

  const cW = Math.max(container.clientWidth, 400);
  const ml = 140, mt = 36, mb = 48;
  const w = _destBarW > 0 ? _destBarW : cW - ml - 16;
  const svgW = ml + w + 16;
  const barH = 42, gap = 14;
  const h = stages.length * (barH + gap) - gap;
  const RX = 4;

  const svg = d3.select(container).append('svg').attr('width', svgW).attr('height', h + mt + mb);
  const gEl = svg.append('g').attr('transform', `translate(${ml},${mt})`);
  _sdGEl = gEl; _sdRows = rows;

  svg.append('text').attr('x', ml).attr('y', 22)
    .attr('font-family', 'var(--font-body)').attr('font-size', '14px')
    .attr('font-weight', '500').attr('fill', '#6B6964')
    .text('Outcome distribution within each stage (% of companies entering)');

  [0, 0.25, 0.5, 0.75, 1].forEach(tick => {
    gEl.append('line').attr('x1', tick * w).attr('x2', tick * w)
      .attr('y1', 0).attr('y2', h).attr('stroke', '#D4D1CA').attr('stroke-width', 0.5);
    gEl.append('text').attr('x', tick * w).attr('y', h + 16)
      .attr('text-anchor', 'middle').attr('font-family', 'var(--font-body)')
      .attr('font-size', '11px').attr('fill', '#6B6964')
      .style('font-variant-numeric', 'tabular-nums').text(`${(tick * 100).toFixed(0)}%`);
  });

  const defs = svg.append('defs');

  rows.forEach((row, ri) => {
    const y = ri * (barH + gap);
    const clipId = `sd-clip-${ri}`;
    defs.append('clipPath').attr('id', clipId)
      .append('rect').attr('x', 0).attr('y', y).attr('width', w).attr('height', barH).attr('rx', RX);

    gEl.append('text').attr('x', -8).attr('y', y + barH / 2).attr('dy', '0.35em')
      .attr('text-anchor', 'end').attr('font-family', 'var(--font-body)')
      .attr('font-size', '12px').attr('font-weight', '600').attr('fill', '#1A1814')
      .attr('class', `sd-label sd-label-${ri}`).text(row.stage);

    const rowG = gEl.append('g').attr('clip-path', `url(#${clipId})`).attr('class', `sd-row sd-row-${ri}`);

    let cx = 0;
    row.segments.forEach((seg) => {
      const sw = seg.pct * w;
      if (sw < 1) return;
      const style = BOX_STYLES[seg.key];

      rowG.append('rect').attr('x', cx).attr('y', y).attr('width', sw).attr('height', barH)
        .attr('fill', style.fill).attr('class', `sd-seg sd-seg-${seg.key}`);

      if (sw > 28) {
        const pctStr = (seg.pct * 100).toFixed(sw > 44 ? 1 : 0) + '%';
        rowG.append('text').attr('x', cx + sw / 2).attr('y', y + barH / 2)
          .attr('dy', '0.35em').attr('text-anchor', 'middle')
          .attr('font-family', 'var(--font-body)').attr('font-size', sw > 44 ? '11px' : '10px')
          .attr('font-weight', '600').attr('fill', style.text)
          .attr('class', `sd-seg-label sd-seg-label-${seg.key}`)
          .style('pointer-events', 'none').text(pctStr);
      }
      cx += sw;
    });

    gEl.append('rect').attr('x', 0).attr('y', y - gap / 2)
      .attr('width', w).attr('height', barH + gap)
      .attr('fill', 'transparent').attr('class', `sd-hit sd-hit-${ri}`)
      .style('cursor', 'default')
      .on('mouseenter', () => {
        if (_lockedDest !== null || _lockedCard) return;
        showSDHover(gEl, ri);
      })
      .on('mouseleave', () => {
        if (_lockedDest !== null || _lockedCard) return;
        clearSDHighlight(gEl);
      });
  });

  const legendItems = [
    { key: 'advanced', label: 'Advanced' }, { key: 'twohalf', label: '2.5X Exit' },
    { key: 'one', label: '1X Exit' }, { key: 'half', label: '0.5X Exit' }, { key: 'failed', label: 'Failed' },
  ];
  const legendY = h + mt + mb - 18;
  let lx = 0;
  legendItems.forEach(item => {
    const style = BOX_STYLES[item.key];
    svg.append('rect').attr('x', ml + lx).attr('y', legendY).attr('width', 11).attr('height', 11).attr('rx', 2).attr('fill', style.fill);
    svg.append('text').attr('x', ml + lx + 15).attr('y', legendY + 9)
      .attr('font-family', 'var(--font-body)').attr('font-size', '11px').attr('fill', '#6B6964').text(item.label);
    lx += item.label.length * 7 + 28;
  });
}

function showSDHover(gEl, activeRI) {
  gEl.selectAll('.sd-row').attr('opacity', 0.2);
  gEl.selectAll('.sd-label').attr('opacity', 0.2);
  gEl.select(`.sd-row-${activeRI}`).attr('opacity', 1);
  gEl.select(`.sd-label-${activeRI}`).attr('opacity', 1);
}

function clearSDHighlight(gEl) {
  if (!gEl) return;
  gEl.selectAll('.sd-row').attr('opacity', 1);
  gEl.selectAll('.sd-label').attr('opacity', 1);
}

function applySDOutcomeHighlight(outcomeKey) {
  if (!_sdGEl) return;
  _sdGEl.selectAll('.sd-seg').attr('opacity', 0.15);
  _sdGEl.selectAll('.sd-seg-label').attr('opacity', 0.15);
  _sdGEl.selectAll(`.sd-seg-${outcomeKey}`).attr('opacity', 1);
  _sdGEl.selectAll(`.sd-seg-label-${outcomeKey}`).attr('opacity', 1);
  _sdGEl.selectAll('.sd-row').attr('opacity', 1);
  _sdGEl.selectAll('.sd-label').attr('opacity', 1);
}

function clearSDOutcomeHighlight() {
  if (!_sdGEl) return;
  _sdGEl.selectAll('.sd-seg').attr('opacity', 1);
  _sdGEl.selectAll('.sd-seg-label').attr('opacity', 1);
  _sdGEl.selectAll('.sd-row').attr('opacity', 1);
  _sdGEl.selectAll('.sd-label').attr('opacity', 1);
}

function showDestTooltip(d) {
  const titleEl = document.getElementById('tooltip-title');
  const statsEl = document.getElementById('tooltip-stats');
  const noteEl = document.getElementById('tooltip-note');
  titleEl.textContent = `${d.label} — ${(d.probability * 100).toFixed(1)}%`;
  const bk = d.breakdown.map(p =>
    `<div class="tooltip-stat"><span class="tooltip-stat-label">${p.stage}</span><span class="tooltip-stat-value">${(p.probability * 100).toFixed(2)}% (${Math.round(p.probability * 10000).toLocaleString()})</span></div>`).join('');
  statsEl.innerHTML = `
    <div class="tooltip-stat"><span class="tooltip-stat-label">Total founders</span><span class="tooltip-stat-value">${d.count.toLocaleString()} of 10,000</span></div>
    <div class="tooltip-stat"><span class="tooltip-stat-label">Odds</span><span class="tooltip-stat-value">${fmtOdds(d.probability)}</span></div>
    <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(250,248,245,0.08)">
      <div class="tooltip-stat"><span class="tooltip-stat-label" style="opacity:0.5">By stage:</span></div>${bk}</div>`;
  const DEST_NOTES = {
    'twohalf': 'The 2.5X is calculated from the most recent round of funding, which could mean a 4X\u20135X multiple over Seed from the Series A, or a 10X\u201320X multiple over Seed at the Series B or Series C rounds.',
  };
  const note = DEST_NOTES[d.key] || (d.breakdown.length > 0 ? BOX_NOTES[`${d.breakdown[0].stage}-${d.key}`] : '') || '';
  noteEl.innerHTML = `<p class="tooltip-note-text">${note}</p>`;
}

// === FOUNDER EXIT SCENARIOS CHART ===
function fmtProceeds(v) {
  if (v === 0) return '$0';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${Math.round(v / 1e3)}K`;
  return `$${Math.round(v).toLocaleString()}`;
}

function buildEndpointData() {
  const admin   = loadHedgeAdmin();
  const seedPM  = admin.seedPostMoney;
  const stepUp  = admin.stepUpMultiple;
  const seedOwn = admin.seedOwnership;
  const dilA    = admin.dilutionSeriesA;
  const dilB    = admin.dilutionSeriesB;
  const dilC    = dilB;
  const UNICORN_EXIT = 1_000_000_000;

  const postMoney = {
    'Seed':     seedPM,
    'Series A': seedPM * stepUp,
    'Series B': seedPM * stepUp ** 2,
    'Series C': seedPM * stepUp ** 3,
  };
  const ownership = {
    'Seed':     seedOwn,
    'Series A': seedOwn * (1 - dilA),
    'Series B': seedOwn * (1 - dilA) * (1 - dilB),
    'Series C': seedOwn * (1 - dilA) * (1 - dilB) * (1 - dilC),
  };
  const COLORS = {
    advanced: '#40A684', twohalf: '#3D7020',
    one: '#CC9600', half: '#D07000', failed: '#B03545',
  };
  const NAMES = {
    advanced: 'Unicorn Status', twohalf: '2.5\u00d7 Exit',
    one: '1\u00d7 Exit', half: '0.5\u00d7 Exit', failed: 'Failed',
  };

  const lpm = admin.liqPrefMultiple || 1; // e.g. 1x non-participating

  return PATHS.map(p => {
    const pm  = postMoney[p.stage] || 0;
    const own = ownership[p.stage] || 0;
    let proceeds = 0;
    if      (p.outcome === 'advanced') proceeds = UNICORN_EXIT * own;
    else if (p.outcome === 'twohalf')  proceeds = pm * 2.5 * own;
    else if (p.outcome === 'one')      proceeds = pm * 1.0 * own;
    else if (p.outcome === 'half') {
      // Mirror computeEquityValue from calcEngine: liqPrefClaim = pm × own × lpm
      const liqPrefClaim = pm * own * lpm;
      proceeds = own * Math.max(0, pm * 0.5 - liqPrefClaim);
    }
    // failed: $0 — company sold for nothing, no founder proceeds
    return {
      label:       p.outcome === 'advanced' ? 'Unicorn Status' : `${NAMES[p.outcome]} \u2014 ${p.stage}`,
      outcome:     p.outcome,
      stage:       p.stage,
      proceeds,
      probability: p.probability,
      color:       COLORS[p.outcome],
    };
  }).sort((a, b) => b.proceeds - a.proceeds || b.probability - a.probability);
}

function renderEndpointChart() {
  const container = document.getElementById('endpoint-chart');
  if (!container) return;
  container.innerHTML = '';

  const data = buildEndpointData();
  const maxP = d3.max(data, d => d.proceeds) || 1;
  const firstZero = data.findIndex(d => d.proceeds === 0);

  const pLiquidity = data.filter(d => d.outcome !== 'failed').reduce((s, d) => s + d.probability, 0);
  const pFailure   = data.filter(d => d.outcome === 'failed').reduce((s, d) => s + d.probability, 0);
  const fmtPct2    = p => `${(p * 100).toFixed(1)}%`;

  const ML = 162, MR = 132, MT = 28, MB = 12;
  const rowH = 34, gap = 7, barH = 20, headerH = 26;
  const sepH = firstZero > 0 ? 22 : 0;
  const cW = Math.max(container.clientWidth, 580);
  const chartW = cW - ML - MR;
  const totalH = MT + headerH + data.length * (rowH + gap) - gap + sepH + MB;

  const xScale = d3.scaleLinear().domain([0, maxP]).range([0, chartW]);
  const svg = d3.select(container).append('svg')
    .attr('width', cW).attr('height', totalH);

  // Subtitle
  svg.append('text')
    .attr('x', ML).attr('y', 14)
    .attr('font-family', 'var(--font-body)').attr('font-size', '11px')
    .attr('fill', 'var(--text-faint)')
    .text('Founder proceeds at exit \u00b7 after dilution \u00b7 liquidation preference applied \u00b7 based on founder owning 25% post-seed round and typical raise dynamics');

  const g = svg.append('g').attr('transform', `translate(${ML},${MT})`);
  let yOff = 0;

  // Liquidity section header
  g.append('text')
    .attr('x', 0).attr('y', yOff + 15).attr('dy', '0.35em')
    .attr('font-family', 'var(--font-body)').attr('font-size', '13px').attr('font-weight', '700')
    .attr('fill', 'var(--text)')
    .text(`${fmtPct2(pLiquidity)} chance of some kind of liquidity event for founder`);
  yOff += headerH;

  data.forEach((d, i) => {
    // Separator before first $0 row
    if (i === firstZero && firstZero > 0) {
      g.append('line')
        .attr('x1', -ML + 16).attr('x2', chartW + 8)
        .attr('y1', yOff + 2).attr('y2', yOff + 2)
        .attr('stroke', 'var(--border)').attr('stroke-width', 1);
      g.append('text')
        .attr('x', 0).attr('y', yOff + 14)
        .attr('font-family', 'var(--font-body)').attr('font-size', '10px')
        .attr('font-weight', '600').attr('fill', 'var(--text-faint)')
        .text(`${fmtPct2(pFailure)} chance of failure \u00b7 Company fails, stalls or is acquire-hired for little to no value, founder receives $0`);
      yOff += sepH;
    }

    const rowG = g.append('g').attr('transform', `translate(0,${yOff})`);

    // Row label
    rowG.append('text')
      .attr('x', -8).attr('y', rowH / 2).attr('dy', '0.35em')
      .attr('text-anchor', 'end').attr('font-family', 'var(--font-body)')
      .attr('font-size', '12px')
      .attr('fill', d.proceeds === 0 ? 'var(--text-faint)' : 'var(--text-muted)')
      .text(d.label);

    // Background track
    rowG.append('rect')
      .attr('x', 0).attr('y', (rowH - barH) / 2)
      .attr('width', chartW).attr('height', barH).attr('rx', 4)
      .attr('fill', 'var(--border-subtle)');

    // Bar
    const barW = d.proceeds > 0 ? xScale(d.proceeds) : 3;
    const barRect = rowG.append('rect')
      .attr('x', 0).attr('y', (rowH - barH) / 2)
      .attr('width', d.proceeds > 0 ? 0 : barW)
      .attr('height', barH).attr('rx', 4)
      .attr('fill', d.color)
      .attr('opacity', d.proceeds > 0 ? 0.85 : 0.45);
    if (d.proceeds > 0) {
      barRect.transition().duration(700).ease(d3.easeCubicOut).attr('width', barW);
    }

    // Dollar amount
    rowG.append('text')
      .attr('x', chartW + 10).attr('y', rowH / 2 - 5).attr('dy', '0.35em')
      .attr('font-family', 'var(--font-body)').attr('font-size', '13px').attr('font-weight', '600')
      .attr('fill', d.proceeds === 0 ? 'var(--text-faint)' : 'var(--text)')
      .text(fmtProceeds(d.proceeds));

    // Probability / odds
    rowG.append('text')
      .attr('x', chartW + 10).attr('y', rowH / 2 + 10).attr('dy', '0.35em')
      .attr('font-family', 'var(--font-body)').attr('font-size', '11px')
      .attr('fill', 'var(--text-faint)')
      .text(`${(d.probability * 100).toFixed(d.probability < 0.01 ? 2 : 1)}% \u00b7 ${fmtOdds(d.probability)}`);

    yOff += rowH + gap;
  });
}

// === DESTINATION CONTEXT PANEL ===
const OUTCOME_CONTEXT_LABELS = {
  failed:   'Failed (0X)',
  half:     '0.5X Return',
  one:      '1X Return',
  twohalf:  '2.5X Return',
  advanced: 'Unicorn Status'
};

const OUTCOME_CONTEXT_TEXTS = {
  failed:  'Across 10,000 companies, there is a high likelihood of complete failure, meaning that you walked away with nothing. Your investors may have been able to take advantage of some meager assets or cash, but as a founder your paycheck was an unfortunate $0.00.',
  half:    'This is an important one to understand because most founders don\u2019t know the math behind \u201cliquidation preference\u201d and under what circumstances it will affect them in the future. Effectively, if at any given round you sell the company for less than your last round\u2019s post-money valuation, the \u201cpref stack\u201d gets first dibs of the value before you do as a founder. This also includes fire sales, acquire-hires, and other scenarios where you might get \u201csomething\u201d, but the VC\u2019s terms are winning the day.',
  one:     'This is calculated based off the post-money of your last round of funding, not a multiple based on seed. This is just enough that you\u2019ll likely walk away with the percentage of assets from the sale that reflects your fully diluted ownership. This is a win for you. But it\u2019s not a win for your most recent investors, which makes this outcome unlikely. They didn\u2019t sign up to fund you just to get 1X their money back. But congrats on obtaining a positive financial outcome.',
  twohalf: 'A true win for everyone involved. Calculated off from the post-money valuation of your last round, everyone wins something. It\u2019s quite rare at Seed and Series A because typically if you can be acquired for 2.5X your last post-money, you are qualified to raise another round and keep the game alive. At those stages, VCs on your board are more likely to block such a transaction than approve it. They need a 10X/50X/100X, not a 2.5X. All the same, you\u2019re walking away with a sizable life-changing amount of assets.',
  advanced: 'Congratulations, you passed a hurdle that less than 1% of founders achieve. The game isn\u2019t over yet, but you\u2019ve likely been able to take some chips off the table and you\u2019re well on your way to completely changing your industry, if you haven\u2019t already.'
};

function updateDestContextPanel(key) {
  const panel  = document.getElementById('dest-context-panel');
  const title  = document.getElementById('dest-context-title');
  const stats  = document.getElementById('dest-context-stats');
  const note   = document.getElementById('dest-context-note');
  if (!panel || !title || !stats || !note) return;
  const a = loadAssumptions();
  const cohort = a.cohortSize || 10000;
  const total  = PATHS.filter(p => p.outcome === key).reduce((s, p) => s + p.probability, 0);
  const pct    = total >= 0.01 ? (total * 100).toFixed(1) : (total * 100).toFixed(2);
  const count  = Math.round(total * cohort).toLocaleString();
  const odds   = fmtOdds(total);
  title.textContent = OUTCOME_CONTEXT_LABELS[key] || key;
  stats.innerHTML = `
    <div class="tooltip-stat"><span class="tooltip-stat-label">Probability</span><span class="tooltip-stat-value">${pct}%</span></div>
    <div class="tooltip-stat"><span class="tooltip-stat-label">Founders</span><span class="tooltip-stat-value">${count} of ${cohort.toLocaleString()}</span></div>
    <div class="tooltip-stat"><span class="tooltip-stat-label">Odds</span><span class="tooltip-stat-value">${odds}</span></div>
  `;
  note.innerHTML = `<p class="tooltip-note-text">${OUTCOME_CONTEXT_TEXTS[key] || ''}</p>`;
}

function clearDestContextPanel() {
  const panel = document.getElementById('dest-context-panel');
  const title = document.getElementById('dest-context-title');
  const stats = document.getElementById('dest-context-stats');
  const note  = document.getElementById('dest-context-note');
  if (!panel) return;
  panel.classList.remove('is-locked');
  if (title) title.textContent = 'All Founders · Aggregate View';
  // Compute live aggregate stats from PATHS
  const posProb  = PATHS.filter(p => p.outcome !== 'failed').reduce((s, p) => s + p.probability, 0);
  const failProb = PATHS.filter(p => p.outcome === 'failed').reduce((s, p) => s + p.probability, 0);
  const cohort   = (loadAssumptions().cohortSize || 10000);
  if (stats) stats.innerHTML = `
    <div class="tooltip-stat"><span class="tooltip-stat-label">Positive exit</span><span class="tooltip-stat-value">${(posProb * 100).toFixed(1)}% of founders</span></div>
    <div class="tooltip-stat"><span class="tooltip-stat-label">Failed / $0</span><span class="tooltip-stat-value">${(failProb * 100).toFixed(1)}% of founders</span></div>
    <div class="tooltip-stat"><span class="tooltip-stat-label">Cohort size</span><span class="tooltip-stat-value">${cohort.toLocaleString()} founders</span></div>
  `;
  if (note) note.innerHTML = '<p class="tooltip-note-text">Hover any outcome in the charts above — or click to lock — to see the probability, founder proceeds, and context for each specific exit path.</p>';
}

let _destLeaveTimer = null;

function initDestContextPanel() {
  const grid = document.getElementById('summary-grid-dest');
  if (!grid) return;
  grid.querySelectorAll('.summary-card').forEach(card => {
    // Cancel any pending clear, then show hovered card immediately
    card.addEventListener('mouseenter', () => {
      if (_destLeaveTimer) { clearTimeout(_destLeaveTimer); _destLeaveTimer = null; }
      updateDestContextPanel(card.dataset.outcome);
    });
    // Short delay before clearing — cancelled if mouse enters another card
    card.addEventListener('mouseleave', () => {
      if (_lockedCard) return;
      _destLeaveTimer = setTimeout(() => {
        _destLeaveTimer = null;
        clearDestContextPanel();
      }, 80);
    });
    // renderSummaryCards click fires first and toggles is-locked on the card.
    // We read that resulting class state to decide update vs clear.
    card.addEventListener('click', () => {
      if (_touchMoved) return;
      if (card.classList.contains('is-locked')) {
        updateDestContextPanel(card.dataset.outcome);
        document.getElementById('dest-context-panel')?.classList.add('is-locked');
      } else {
        clearDestContextPanel();
      }
    });
  });
}

// === OUTCOME CONTEXT CARDS (Destination tab) ===
function renderOutcomeContextCards() {
  const grid = document.getElementById('outcome-context-grid');
  if (!grid) return;
  const a = loadAssumptions();
  const cohort = a.cohortSize || 10000;

  const OUTCOME_CONTEXTS = [
    {
      key: 'failed',
      label: 'Failed (0X)',
      color: 'var(--accent-red)',
      text: 'Across 10,000 companies, there is a high likelihood of complete failure, meaning that you walked away with nothing. Your investors may have been able to take advantage of some meager assets or cash, but as a founder your paycheck was an unfortunate $0.00.'
    },
    {
      key: 'half',
      label: '0.5X Return',
      color: 'var(--accent-orange)',
      text: 'This is an important one to understand because most founders don\u2019t know the math behind \u201cliquidation preference\u201d and under what circumstances it will affect them in the future. Effectively, if at any given round you sell the company for less than your last round\u2019s post-money valuation, the \u201cpref stack\u201d, as they call it, gets first dibs of the value of the scenario before you do as a founder. This also includes fire sales, acquire-hires, and other scenarios where you might get \u201csomething\u201d, but the VC\u2019s terms are winning the day.'
    },
    {
      key: 'one',
      label: '1X Return',
      color: 'var(--accent-gold)',
      text: 'This is calculated based off the post-money of your last round of funding, not a multiple based on seed. This is just enough that you\u2019ll likely walk away with the percentage of assets from the sale (whether cash, equity, or a mix) that reflects your fully diluted ownership in the company. This is a win for you. But it\u2019s not a win for your most recent investors, which makes this outcome unlikely. They didn\u2019t sign up to fund you just to get 1X their money back. But congrats on obtaining a positive financial outcome.'
    },
    {
      key: 'twohalf',
      label: '2.5X Return',
      color: 'var(--accent-green)',
      text: 'A true win for everyone involved. Calculated off from the post-money valuation of your last round, everyone wins something. It\u2019s also the least likely outcome. It\u2019s quite rare at Seed and Series A because typically if you can be acquired for 2.5X your last post-money, then that means you are qualified to raise another round and keep the game alive. At those stages, VCs on your board are more likely to block such a transaction than approve it. They need a 10X/50X/100X, not a 2.5X. All the same, you\u2019re walking away with a sizable life-changing amount of assets.'
    }
  ];

  grid.innerHTML = OUTCOME_CONTEXTS.map(o => {
    const total = PATHS.filter(p => p.outcome === o.key).reduce((s, p) => s + p.probability, 0);
    const pct = total >= 0.01 ? (total * 100).toFixed(1) : (total * 100).toFixed(2);
    const count = Math.round(total * cohort).toLocaleString();
    const odds = fmtOdds(total);
    return `
      <div class="outcome-context-card">
        <div class="occ-details">
          <div class="occ-panel-label">Details</div>
          <div class="occ-outcome-title" style="color:${o.color}">${o.label}</div>
          <div class="occ-stat-row">
            <span class="occ-stat-label">Probability</span>
            <span class="occ-stat-value">${pct}%</span>
          </div>
          <div class="occ-stat-row">
            <span class="occ-stat-label">Founders</span>
            <span class="occ-stat-value">${count} of ${cohort.toLocaleString()}</span>
          </div>
          <div class="occ-stat-row occ-stat-row--last">
            <span class="occ-stat-label">Odds</span>
            <span class="occ-stat-value">${odds}</span>
          </div>
        </div>
        <div class="occ-context">
          <div class="occ-panel-label">Context</div>
          <p class="occ-context-text">${o.text}</p>
        </div>
      </div>
    `;
  }).join('');
}

// === SUMMARY CARDS (Journey tab + Destination tab) ===
function renderSummaryCards(gridId) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  const a = loadAssumptions();
  const cohort = a.cohortSize || 10000;

  const outcomes = [
    { key: 'advanced', label: 'Unicorn Status', color: 'var(--accent-teal)' },
    { key: 'twohalf',  label: '2.5X Return from Most Current Round', color: 'var(--accent-green)' },
    { key: 'one',      label: '1X Return from Most Current Round', color: 'var(--accent-gold)' },
    { key: 'half',     label: '0.5X Return from Most Current Round', color: 'var(--accent-orange)' },
    { key: 'failed',   label: 'Failed (0X)', color: 'var(--accent-red)' },
  ];

  grid.innerHTML = outcomes.map(o => {
    const total = PATHS.filter(p => p.outcome === o.key).reduce((s, p) => s + p.probability, 0);
    const pct = total >= 0.01 ? (total * 100).toFixed(1) : (total * 100).toFixed(2);
    return `<div class="summary-card" data-outcome="${o.key}">
      <div class="summary-value" style="color:${o.color}">${pct}%</div>
      <div class="summary-label">${o.label}</div>
      <div class="summary-odds">${fmtOdds(total)}</div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.summary-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      if (_lockedCard && _lockedCard !== card.dataset.outcome) return;
      applySummaryHighlight(card.dataset.outcome, grid);
    });
    card.addEventListener('mouseleave', () => {
      if (_lockedCard) return;
      clearSummaryHighlight(grid);
    });
    card.addEventListener('click', () => {
      if (_touchMoved) return;
      const key = card.dataset.outcome;
      const destIdx = DEST_OUTCOME_KEYS.indexOf(key);
      if (_lockedCard === key) {
        _lockedCard = null; _lockedDest = null;
        clearSummaryHighlight(grid);
        card.classList.remove('is-locked');
        clearDestHighlight();
        if (_destGEl) _destGEl.selectAll('.dest-row').classed('dest-locked', false);
      } else {
        grid.querySelectorAll('.summary-card').forEach(c => c.classList.remove('is-locked'));
        _lockedCard = key;
        card.classList.add('is-locked');
        applySummaryHighlight(key, grid);
        _lockedDest = destIdx >= 0 ? destIdx : null;
        if (_destGEl) _destGEl.selectAll('.dest-row').classed('dest-locked', false);
        if (destIdx >= 0 && _destGEl) {
          _destGEl.select(`.dest-row-${destIdx}`).classed('dest-locked', true);
          applyDestHighlight(key);
        }
      }
    });
  });

  if (!document._pathResetBound) {
    document._pathResetBound = true;
    document.addEventListener('click', (e) => {
      if (_touchMoved) return;
      if (e.target.closest('.summary-card')) return;
      if (e.target.closest('#journey-canvas') || e.target.closest('#dest-canvas')) return;
      if (e.target.closest('.view-toggle') || e.target.closest('.view-btn')) return;
      if (e.target.closest('.hedge-layout')) return;
      const anyLocked = _lockedBox || _lockedCard || _lockedDest !== null;
      if (!anyLocked) return;
      const svgEl = document.querySelector('#journey-canvas svg');
      const g = svgEl ? d3.select(svgEl).select('g') : null;
      _lockedBox = null; _lockedCard = null; _lockedDest = null;
      setLockIndicator(false);
      if (g) clearPathHighlight(g);
      clearDestHighlight(); clearSDOutcomeHighlight();
      document.querySelectorAll('.summary-card').forEach(c => { c.classList.remove('is-locked'); c.style.opacity = '1'; });
      if (_destGEl) {
        _destGEl.selectAll('.dest-row').classed('dest-locked', false).attr('opacity', 1);
        _destGEl.selectAll('.dest-bar').each(function() { const el = d3.select(this); el.attr('stroke', el.attr('data-orig-stroke')).attr('stroke-width', 1); });
      }
      resetTooltip();
      clearDestContextPanel();
    }, { capture: false });
  }
}

let _lockedCard = null;

function applySummaryHighlight(outcomeKey, grid) {
  highlightOutcomeInJourney(outcomeKey);
  grid.querySelectorAll('.summary-card').forEach(c => {
    c.style.opacity = c.dataset.outcome === outcomeKey ? '1' : '0.3';
  });
}

function clearSummaryHighlight(grid) {
  clearJourneyHighlight();
  grid.querySelectorAll('.summary-card').forEach(c => { c.style.opacity = '1'; });
}

function highlightOutcomeInJourney(outcomeKey) {
  const container = document.getElementById('journey-canvas');
  const svg = container ? container.querySelector('svg') : null;
  if (!svg) return;
  const g = d3.select(svg).select('g');
  g.selectAll('.outcome-box').attr('opacity', 0.12);
  g.selectAll('.outcome-label').attr('opacity', 0.12);
  g.selectAll('.connect-line').attr('opacity', 0.04);
  STAGES.forEach((_, si) => {
    g.selectAll(`.outcome-box-${si}-${outcomeKey}`).attr('opacity', 1).attr('stroke', TEAL_ACCENT).attr('stroke-width', 2.5);
    g.selectAll(`.outcome-label-${si}-${outcomeKey}`).attr('opacity', 1);
  });
}

function clearJourneyHighlight() {
  const container = document.getElementById('journey-canvas');
  const svg = container ? container.querySelector('svg') : null;
  if (!svg) return;
  const g = d3.select(svg).select('g');
  g.selectAll('.outcome-box').attr('opacity', 1).each(function() {
    const box = d3.select(this).datum();
    if (box) { const style = BOX_STYLES[box.key]; d3.select(this).attr('stroke', style.stroke).attr('stroke-width', 1); }
  });
  g.selectAll('.outcome-label').attr('opacity', 1);
  g.selectAll('.connect-line').attr('opacity', 1).attr('stroke', LINE_COLOR)
    .each(function() { const el = d3.select(this); el.attr('stroke-width', el.attr('data-base-width') || 1.5); });
}

// === GLOBAL REFRESH ===
function refreshAll() {
  _lockedBox = null; _lockedCard = null; _lockedDest = null;
  if (_leaveTimer) { clearTimeout(_leaveTimer); _leaveTimer = null; }
  document._pathResetBound = false;
  setLockIndicator(false);
  PATHS = buildPaths();
  renderJourney();
  renderDestination();
  renderStageDistribution();
  renderSummaryCards('summary-grid');
  renderSummaryCards('summary-grid-dest');
  initDestContextPanel();
  renderEndpointChart();
  resetTooltip();
}

// === TAB SYSTEM ===
document.addEventListener('DOMContentLoaded', () => {
  renderJourney();
  renderDestination();
  renderStageDistribution();
  renderSummaryCards('summary-grid');
  renderSummaryCards('summary-grid-dest');
  initDestContextPanel();
  renderEndpointChart();

  // Journey interactivity hint — soft teal pulse 3× on first load
  setTimeout(() => {
    const svg = document.querySelector('#journey-canvas svg');
    if (svg) {
      svg.classList.add('journey-interactive-hint');
      setTimeout(() => svg.classList.remove('journey-interactive-hint'), 3000);
    }
  }, 900);

  const legend = document.getElementById('viz-legend');

  const TAB_CONTEXT = {
    journey: {
      headline: 'Founder Outcome Intelligence',
      desc: 'Explore the odds of 10,000 founders navigating the venture backed landscape in the dynamic waterfall below. Check out the Destination and Hedge tabs to dive even deeper.'
    },
    destination: {
      headline: 'Where Founders Land',
      desc: 'These are your grouped probability outcomes once you secure Seed funding. Your chances of harvesting zero or being crushed by liquidation preference are substantial.'
    },
    hedge: {
      headline: 'What If You Hedge Your Bets?',
      desc: 'Imagine taking some of your founder shares and placing them into a venture fund alongside other founders. Below are the outcomes of hedging your outcomes, just like the VCs who fund you.'
    }
  };

  function updateTabContext(tab) {
    const inner = document.getElementById('page-header-inner');
    const headline = document.getElementById('page-title');
    const desc = document.getElementById('page-subtitle');
    if (!inner || !headline || !desc) return;
    const ctx = TAB_CONTEXT[tab];
    if (!ctx) return;
    inner.classList.add('fading');
    setTimeout(() => {
      headline.textContent = ctx.headline;
      desc.textContent = ctx.desc;
      inner.classList.remove('fading');
    }, 180);
  }

  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const tab = btn.dataset.tab;
      updateTabContext(tab);

      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
      document.getElementById(`tab-${tab}`).classList.remove('hidden');

      // Legend only shows on journey/destination
      if (legend) legend.style.display = (tab === 'journey' || tab === 'destination') ? '' : 'none';

      if (tab === 'destination' && _lockedCard && _destGEl) {
        const idx = DEST_OUTCOME_KEYS.indexOf(_lockedCard);
        if (idx >= 0) {
          _lockedDest = idx;
          handleDestHover(_destGEl, idx, _destAgg[idx]);
          _destGEl.selectAll('.dest-row').classed('dest-locked', false);
          _destGEl.select(`.dest-row-${idx}`).classed('dest-locked', true);
        }
      }
      if (tab !== 'destination') resetTooltip();
      if (tab === 'destination') renderEndpointChart();
      if (tab === 'hedge') {
        // Re-render sensitivity chart now that the tab is visible (correct clientWidth)
        const adm = injectFPProbs(loadHedgeAdmin());
        const re  = computeRoundEconomics(adm, _hedgeUser);
        const res = computeCalculator(adm, _hedgeUser, re);
        renderSensitivityChart(adm, _hedgeUser, res);
      }
    });
  });

  let t;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => { refreshAll(); }, 250);
  });
});
