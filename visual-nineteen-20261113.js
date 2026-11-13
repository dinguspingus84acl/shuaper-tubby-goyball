/* Small, data-backed enhancements layered onto the existing site. */
(() => {
  'use strict';

  /* 9. Weekly Report comparison: prefer a real saved pregame ESPN projection;
     when none exists, clearly label the existing opportunity model as xFP. */
  const analyticsSection = () => document.getElementById('shuaAnalyticsSection');
  let expectedModel = null;
  let expectedAttempted = false;
  let expectedLoading = false;
  let scheduledWeekly = false;
  const number = value => value === null || value === undefined || value === '' || !Number.isFinite(Number(value))
    ? null : Number(value);
  const fmt = n => Number(n).toFixed(1);

  function weeklyReady() {
    const analytics = analyticsSection();
    return analytics?.dataset.activeView === 'weekly' && Number(analytics.querySelector('#stSeason')?.value) === 2026 &&
      analytics.querySelector('#stWeeklyMetric')?.value === 'points' &&
      !!analytics.querySelector('#stContent .st-rank-row');
  }

  function scheduleWeekly() {
    if (scheduledWeekly) return;
    scheduledWeekly = true;
    requestAnimationFrame(() => { scheduledWeekly = false; decorateWeekly(); });
  }

  function loadExpectedModel() {
    if (expectedAttempted || expectedLoading) return;
    expectedAttempted = expectedLoading = true;
    fetch('analytics/data/expected-weekly-2026.json?v=20261113-compare1', {cache: 'no-store'})
      .then(response => { if (!response.ok) throw new Error('Expected-points feed unavailable'); return response.json(); })
      .then(data => { if (data?.schema === 1 && data?.season === 2026 && data.players) expectedModel = data; })
      .catch(() => { /* No comparison is more honest than invented projections. */ })
      .finally(() => { expectedLoading = false; scheduleWeekly(); });
  }

  function baselineFor(player, game, week) {
    const pregame = number(game?.espnProjectedPoints ?? game?.projectedPpr ?? game?.projectedPoints);
    if (pregame !== null && pregame >= 0) return {value: pregame, label: 'Proj'};
    const modeled = expectedModel?.throughWeek >= week
      ? number(expectedModel.players?.[player.key]?.[week]) : null;
    return modeled !== null && modeled >= 0 ? {value: modeled, label: 'xFP'} : null;
  }

  function comparisonBar(player, game, baseline) {
    const actual = number(game?.points);
    if (actual === null) return null;
    const delta = actual - baseline.value;
    const max = Math.max(1, actual, baseline.value);
    const ahead = delta >= 0;
    const container = document.createElement('div');
    container.className = 'shua-weekly-bars';
    container.setAttribute('role', 'img');
    container.setAttribute('aria-label',
      player.name + ': actual PPR ' + fmt(actual) + ', ' + baseline.label + ' ' + fmt(baseline.value) +
      ', difference ' + (delta >= 0 ? '+' : '') + fmt(delta));

    const pair = document.createElement('span');
    pair.className = 'shua-weekly-bar-pair';
    const makeTrack = (value, className) => {
      const track = document.createElement('span');
      track.className = 'shua-weekly-bar-track ' + className;
      const fill = document.createElement('span');
      fill.style.width = (100 * Math.max(0, value) / max).toFixed(2) + '%';
      track.append(fill);
      return track;
    };
    pair.append(makeTrack(baseline.value, 'is-baseline'),
      makeTrack(actual, ahead ? 'is-ahead' : 'is-behind'));

    const label = document.createElement('span');
    label.className = 'shua-weekly-bar-copy';
    label.textContent = baseline.label + ' ' + fmt(baseline.value) + '  ';
    const difference = document.createElement('b');
    difference.className = ahead ? 'is-ahead' : 'is-behind';
    difference.textContent = (delta > 0 ? '+' : '') + fmt(delta);
    label.append(difference);
    container.append(pair, label);
    return container;
  }

  function decorateWeekly() {
    if (!weeklyReady()) return;
    const analytics = analyticsSection();
    if (!expectedAttempted) loadExpectedModel();
    const ui = window.ShuaStudio?.UI;
    const week = Number(analytics.querySelector('#stWeek')?.value);
    if (!Number.isInteger(week) || week < 1 || week > 18) return;
    const players = new Map((ui?.dataset?.players || []).map(p => [p.key, p]));
    let decorated = 0;
    for (const row of analytics.querySelectorAll('#stContent .st-rank-row')) {
      if (row.querySelector('.shua-weekly-bars')) { decorated++; continue; }
      const key = row.querySelector('[data-st-open]')?.dataset.stOpen;
      if (!key) continue;
      const player = players.get(key) || {key, name: row.querySelector('[data-st-open]')?.textContent?.trim() || key};
      const score = number(row.querySelector('.st-score')?.firstChild?.textContent?.trim());
      const game = player.games?.find(g => g.week === week) || (score === null ? null : {points: score});
      if (!game) continue;
      const baseline = baselineFor(player, game, week);
      if (!baseline) continue;
      const bar = comparisonBar(player, game, baseline);
      if (bar) { row.append(bar); decorated++; }
    }
    if (decorated && !analytics.querySelector('.st-weekly-model-hint')) {
      const header = analytics.querySelector('#stContent .st-weekly-rank-toolbar');
      if (header) {
        const hint = document.createElement('div');
        hint.className = 'st-weekly-model-hint';
        hint.textContent = 'PPR points vs baseline · xFP reflects observed opportunity quality, not a pregame prediction.';
        header.after(hint);
      }
    }
  }

  // Analytics is lazy-loaded, so its section might not exist when this script first executes.
  new MutationObserver(scheduleWeekly).observe(document.body, {childList: true, subtree: true});
  window.addEventListener('ShuaStudioReady', scheduleWeekly);
  scheduleWeekly();

  /* 10. An edge fades only when content genuinely extends past that edge.
     Resizing, horizontal scrolling and freshly rendered sections stay in sync. */
  const scrollSelectors = [
    '#shuaAnalyticsSection .st-chart-scroll',
    '#shuaAnalyticsSection .st-usage-table',
    '#shuaAnalyticsSection .st-table-wrap',
    '#modal .espn-game-log-table-wrap',
    '#shuaPortfolio .pc-table-wrap',
    '#shuaAnalyticsSection .re-table-scroll',
    '.tcc-scroll'
  ];
  const observed = new WeakSet();
  const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(entries => {
    for (const entry of entries) syncScroll(entry.target);
  }) : null;
  let queued = false;

  function syncScroll(element) {
    if (!element.isConnected) return;
    const overflow = element.scrollWidth - element.clientWidth;
    const enough = element.clientWidth > 0 && overflow > 5;
    element.classList.toggle('shua-scroll-left', enough && element.scrollLeft > 4);
    element.classList.toggle('shua-scroll-right', enough && element.scrollLeft < overflow - 4);
  }

  function connectScrollers() {
    queued = false;
    for (const element of document.querySelectorAll(scrollSelectors.join(','))) {
      if (!observed.has(element)) {
        observed.add(element);
        element.classList.add('shua-scroll-cue');
        element.addEventListener('scroll', () => syncScroll(element), {passive: true});
        resize?.observe(element);
      }
      syncScroll(element);
    }
  }

  function scheduleScrollers() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(connectScrollers);
  }

  new MutationObserver(scheduleScrollers).observe(document.body, {childList: true, subtree: true});
  window.addEventListener('resize', scheduleScrollers, {passive: true});
  scheduleScrollers();
})();
