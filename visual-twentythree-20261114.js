/* Presentation-only enhancements for approved visual items 1–4, 9–10. */
(() => {
  'use strict';
  const POS = /^(QB|RB|WR|TE)$/i;
  const listenScroll = new WeakSet();
  let scheduled = false;

  function position(el, text) {
    const value = String(text || '').trim().toUpperCase();
    if (POS.test(value)) el.dataset.shuaV23Pos = value;
  }

  function paintRounds() {
    const board = document.getElementById('board');
    if (!board || !board.isConnected) return;
    const picks = Array.from(board.querySelectorAll(':scope > .pick[data-shua-round]'));
    if (!picks.length) return;
    const geometry = board.getBoundingClientRect();
    const starts = picks.filter(tile => tile.hasAttribute('data-shua-round-start'));
    const firstRound = picks.filter(tile => tile.dataset.shuaRound === starts[0]?.dataset.shuaRound);
    const right = Math.max(...firstRound.map(tile => tile.getBoundingClientRect().right));
    const width = Math.max(board.clientWidth, Math.ceil(right - geometry.left + board.scrollLeft + 6));
    const old = new Map(Array.from(board.querySelectorAll(':scope > .shua-v23-round-band'),
      band => [band.dataset.round, band]));
    const live = new Set();

    for (const tile of starts) {
      const round = tile.dataset.shuaRound;
      live.add(round);
      let band = old.get(round);
      if (!band) {
        band = document.createElement('div');
        band.className = 'shua-v23-round-band';
        band.dataset.round = round;
        band.setAttribute('aria-hidden', 'true');
        board.appendChild(band);
      }
      band.classList.toggle('is-even', Number(round) % 2 === 0);
      const rect = tile.getBoundingClientRect();
      const top = Math.round(rect.top - geometry.top + board.scrollTop - 5);
      const height = Math.ceil(rect.height + 10);
      const next = `${top}px|${height}px|${width}px`;
      if (band.dataset.geometry !== next) {
        band.style.top = `${top}px`;
        band.style.left = '0';
        band.style.width = `${width}px`;
        band.style.height = `${height}px`;
        band.dataset.geometry = next;
      }
    }
    for (const [round, band] of old) if (!live.has(round)) band.remove();
  }

  function decoratePositions() {
    document.querySelectorAll('#tableCard .badge:not([data-shua-v23-pos])').forEach(el =>
      position(el, el.textContent));
    document.querySelectorAll('#espnLiveSection .espn-player-meta-pos:not([data-shua-v23-pos])').forEach(el => {
      const match = (el.textContent || '').match(/\b(QB|RB|WR|TE)\b/i);
      if (!match) return;
      position(el, match[1]);
      el.textContent = match[1];
    });
    document.querySelectorAll('#shuaAnalyticsSection .st-person-copy small:not(.shua-v23-ready)').forEach(el => {
      const text = Array.from(el.childNodes).reverse().find(node => node.nodeType === 3 &&
        /\s*·\s*(QB|RB|WR|TE)\s*$/i.test(node.textContent || ''));
      if (!text) return;
      const match = text.textContent.match(/\s*·\s*(QB|RB|WR|TE)\s*$/i);
      if (!match) return;
      text.textContent = text.textContent.slice(0, -match[0].length);
      const badge = document.createElement('span');
      badge.className = 'shua-v23-position-chip';
      badge.textContent = match[1].toUpperCase();
      position(badge, match[1]);
      el.appendChild(badge);
      el.classList.add('shua-v23-ready');
    });
  }

  function decorateSearch() {
    document.querySelectorAll('#shuaSearchResults .shua-search-result:not(.shua-v23-search-ready)').forEach(button => {
      const copy = button.querySelector('.shua-search-result-copy');
      const meta = button.querySelector('.shua-search-result-meta');
      if (!copy || !meta) return;
      button.classList.add('shua-v23-search-ready');
      const original = (meta.textContent || '').trim();
      const parts = original.match(/\b(QB|RB|WR|TE)(?:\s*·\s*([A-Z]{2,3}))?/i);
      if (!parts) return;
      const avatar = meta.querySelector('.shua-search-team-logo');
      const badge = document.createElement('span');
      badge.className = 'shua-v23-search-position';
      badge.textContent = parts[1].toUpperCase();
      position(badge, parts[1]);
      meta.replaceChildren(badge);
      if (avatar) meta.appendChild(avatar);
      if (parts[2]) {
        const team = document.createElement('span');
        team.className = 'shua-v23-search-team';
        team.textContent = parts[2].toUpperCase();
        meta.appendChild(team);
      }
      const extras = [original.match(/Rank\s*#\d+/i)?.[0],
        original.match(/Last season\s*\d{4}/i)?.[0]].filter(Boolean);
      if (extras.length) {
        const secondary = document.createElement('small');
        secondary.className = 'shua-v23-search-extra';
        secondary.textContent = extras.join(' · ');
        copy.appendChild(secondary);
      }
    });
  }

  function syncScroll(el) {
    if (!el.isConnected) return;
    const range = el.scrollWidth - el.clientWidth;
    const available = range > 6 && el.clientWidth > 0;
    el.classList.toggle('shua-v23-can-left', available && el.scrollLeft > 5);
    el.classList.toggle('shua-v23-can-right', available && el.scrollLeft < range - 5);
  }

  function decorateScrollers() {
    const selectors = [
      '#espnLiveSection .espn-stat-filters',
      '#modal .espn-game-log-tabs',
      '#shuaAnalyticsSection .st-navigation',
      '#shuaAnalyticsSection[data-active-view="intelligence"] .st-intel-nav',
      '#shuaAnalyticsSection[data-active-view="intelligence"] .st-intel-table'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(el => {
      if (!listenScroll.has(el)) {
        listenScroll.add(el);
        el.classList.add('shua-v23-scroll-cue');
        el.addEventListener('scroll', () => syncScroll(el), {passive: true});
        sizeObserver?.observe(el);
      }
      syncScroll(el);
    });
  }

  const sizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(() => schedule()) : null;
  function run() {
    scheduled = false;
    paintRounds();
    decoratePositions();
    decorateSearch();
    decorateScrollers();
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(run);
  }
  const board = document.getElementById('board');
  if (board) sizeObserver?.observe(board);
  new MutationObserver(records => {
    if (records.some(r => Array.from(r.addedNodes).some(n =>
      n.nodeType === 1 && !(n.classList?.contains('shua-v23-round-band') ||
        n.classList?.contains('shua-v23-position-chip') ||
        n.classList?.contains('shua-v23-search-extra') ||
        n.classList?.contains('shua-v23-search-position') ||
        n.classList?.contains('shua-v23-search-team'))))) schedule();
  }).observe(document.body, {childList:true,subtree:true});
  window.addEventListener('resize',schedule,{passive:true});
  schedule();
})();
