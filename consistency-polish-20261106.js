/* Lightweight presentation enhancements; no ranking or projection calculations. */
(() => {
  'use strict';

  // Color the comparison accent from the real NFL logo already on the card.
  const teamColors = {
    ari:'#a83850', atl:'#ba3e50', bal:'#9e7cce', buf:'#468bd7',
    car:'#36b8e8', chi:'#dc7043', cin:'#ed8b28', cle:'#df602c',
    dal:'#6699c8', den:'#fb7d35', det:'#43b6d5', gb:'#e0b74b',
    hou:'#b23a48', ind:'#5399cc', jax:'#20b5aa', kc:'#de5d60',
    lv:'#abb8c3', lac:'#56aed4', lar:'#568dea', mia:'#31bfb0',
    min:'#9670ca', ne:'#688db8', no:'#c7ab71', nyg:'#5a78c6',
    nyj:'#37a47b', phi:'#2fa68d', pit:'#dfc057', sea:'#5fbda7',
    sf:'#d36b6c', tb:'#d55e66', ten:'#6bb5d8', wsh:'#bc665c'
  };

  function decorateStartSit() {
    const parent = document.querySelector('#shuaAnalyticsSection[data-active-view="startsit"] .st-comparison');
    if (!parent) return;
    const cards = [...parent.querySelectorAll(':scope > .st-feature')];
    if (!cards.length) return;

    let top = -Infinity;
    const estimates = cards.map(card => {
      const label = card.querySelector('.st-big-value');
      const printed = label?.firstChild?.textContent?.trim() || '';
      const n = /^\d+(?:\.\d+)?$/.test(printed) ? Number(printed) : null;
      if (n !== null) top = Math.max(top, n);
      const source = card.querySelector('.st-watermark')?.getAttribute('src') ||
        card.querySelector('.st-player-meta img')?.getAttribute('src') || '';
      const code = source.match(/\/nfl\/500\/([a-z]+)\.png/i)?.[1]?.toLowerCase();
      if (code && teamColors[code]) card.style.setProperty('--shua-compare-accent', teamColors[code]);
      return n;
    });
    const hasComparison = estimates.filter(n => n !== null).length > 1;
    cards.forEach((card, index) => {
      const recommended = hasComparison && estimates[index] !== null && estimates[index] === top;
      card.classList.toggle('is-top-estimate', recommended);
      const oldBadge = card.querySelector(':scope > .shua-top-estimate');
      if (recommended && !oldBadge) {
        const badge = document.createElement('span');
        badge.className = 'shua-top-estimate';
        badge.textContent = 'TOP ESTIMATE';
        card.insertBefore(badge, card.firstChild);
      } else if (!recommended && oldBadge) {
        oldBadge.remove();
      }
    });
  }

  // Tapping a game selects that actual row visually, without navigating or
  // replacing the game-log filters. Keyboard selection is available too.
  document.addEventListener('click', event => {
    const row = event.target.closest('.espn-game-log-table tbody tr');
    if (!row) return;
    const table = row.closest('.espn-game-log-table');
    table.querySelectorAll('tbody tr.is-selected-week').forEach(el => {
      if (el !== row) {
        el.classList.remove('is-selected-week');
        el.removeAttribute('aria-selected');
      }
    });
    row.classList.add('is-selected-week');
    row.setAttribute('aria-selected', 'true');
  });

  let pending = false;
  const schedule = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      decorateStartSit();
    });
  };
  const init = () => {
    decorateStartSit();
    // Analytics can be mounted only after the user opens its menu the first
    // time, so observe its insertion as well as subsequent panel rerenders.
    new MutationObserver(records => {
      const relevant = records.some(record => {
        const target = record.target;
        if (target.nodeType === 1 && (target.id === 'shuaAnalyticsSection' || target.closest?.('#shuaAnalyticsSection'))) return true;
        return [...record.addedNodes].some(node =>
          node.nodeType === 1 && (node.id === 'shuaAnalyticsSection' || node.querySelector?.('#shuaAnalyticsSection'))
        );
      });
      if (relevant) schedule();
    }).observe(document.body, {subtree: true, childList: true});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
