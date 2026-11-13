/* Presentation-only additions; never substitute fantasy results or projections. */
(() => {
  'use strict';
  const titles = {
    weekly: 'Weekly Report', usage: 'Usage', intelligence: 'Fantasy Intelligence',
    consistency: 'Boom / Bust', teams: 'Team Shares', injury: 'Injury Impact',
    schedule: 'Schedule', startsit: 'Start / Sit'
  };
  let queued = false;
  function titlebar(title) {
    const bar = document.createElement('div');
    bar.className = 'shua-analytics-titlebar';
    const eyebrow = document.createElement('span');
    eyebrow.className = 'shua-analytics-eyebrow';
    eyebrow.textContent = 'ANALYTICS';
    const heading = document.createElement('h2');
    heading.textContent = title;
    bar.append(eyebrow, heading);
    return bar;
  }
  function alignTitles() {
    const analytics = document.querySelector('#shuaAnalyticsSection');
    const workspace = analytics?.querySelector('.st-layout');
    const view = analytics?.dataset.activeView;
    if (workspace && titles[view]) {
      let header = analytics.querySelector(':scope > .shua-analytics-titlebar');
      if (!header) {header = titlebar(titles[view]);analytics.insertBefore(header,workspace);}
      else if (header.querySelector('h2')?.textContent !== titles[view])
        header.querySelector('h2').textContent = titles[view];
    }
    const stats = document.querySelector('#espnLiveSection .espn-live-shell');
    if (stats && !stats.querySelector(':scope > .shua-analytics-titlebar'))
      stats.prepend(titlebar('Season Stats'));
  }
  function compactWeekly() {
    const analytics = document.getElementById('shuaAnalyticsSection');
    if (!analytics || analytics.dataset.activeView !== 'weekly') return;
    for (const bar of analytics.querySelectorAll('.shua-weekly-bars:not([data-shua-twenty-label])')) {
      const label = bar.querySelector('.shua-weekly-bar-copy');
      const raw = bar.getAttribute('aria-label') || '';
      const match = raw.match(/actual PPR\s+(-?[\d.]+),\s+(xFP|Proj)\s+(-?[\d.]+),\s+difference\s+([+-]?[\d.]+)/);
      if (!label || !match) continue;
      const difference = label.querySelector('b');
      label.textContent = 'Actual ' + match[1] + ' · ' + match[2] + ' ' + match[3] + ' · ';
      if (difference) label.append(difference);
      bar.dataset.shuaTwentyLabel = 'true';
    }
  }
  function update() {
    queued = false;
    alignTitles();
    compactWeekly();
  }
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }
  new MutationObserver(schedule).observe(document.body, {subtree:true, childList:true});
  window.addEventListener('ShuaStudioReady', schedule);
  schedule();
})();
