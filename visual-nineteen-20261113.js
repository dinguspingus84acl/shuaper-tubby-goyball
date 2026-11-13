/* Small, data-backed enhancements layered onto the existing site. */
(() => {
  'use strict';

  /* An edge fades only when content genuinely extends past that edge.
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
