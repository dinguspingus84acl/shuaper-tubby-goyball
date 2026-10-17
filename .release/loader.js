/* SHUA Studio entry point: recover failed asset loads without refreshing the site. */
(function () {
  'use strict';
  if (window.ShuaStudioLoader) return;
  const version = '20261017-studio-release2';
  const base = new URL('.', document.currentScript.src);
  const paths = ['analytics/core.js', 'analytics/data.js', 'analytics/charts.js', 'analytics/ui.js'];
  const tests = [() => window.ShuaStudio?.aggregate, () => window.ShuaStudio?.Data,
    () => window.ShuaStudio?.Chart, () => window.ShuaStudio?.UI];
  const nav = document.querySelector('.positions');
  let button = nav?.querySelector('[data-pos="ANALYTICS"]');
  if (nav && !button) {
    button = document.createElement('button'); button.className = 'pos';
    button.dataset.pos = 'ANALYTICS'; button.type = 'button';
    button.textContent = 'Analytics'; nav.append(button);
  }
  if (button) button.id = 'studioNav';
  let pending = /^#analytics\//.test(location.hash), inflight = null, attempt = 0;
  let styleReady = false, boot = null;
  const url = path => new URL(path + '?v=' + version + (attempt > 1 ? '&retry=' + attempt : ''), base).href;
  function loading(message, failed = false) {
    if (!pending) return;
    if (!boot) {
      boot = document.createElement('div'); boot.id = 'shuaStudioLoading';
      boot.className = 'st-boot'; boot.setAttribute('role', 'status');
      (document.querySelector('main') || document.body).prepend(boot);
    }
    boot.hidden = false; boot.replaceChildren();
    const text = document.createElement('p'); text.textContent = message; boot.append(text);
    if (failed) {
      const retry = document.createElement('button'); retry.type = 'button';
      retry.className = 'st-button'; retry.textContent = 'Retry loading charts';
      retry.onclick = () => load().catch(() => {}); boot.append(retry);
    }
  }
  function asset(path, css = false) {
    return new Promise((resolve, reject) => {
      const node = document.createElement(css ? 'link' : 'script');
      let finished = false;
      const finish = error => {
        if (finished) return; finished = true; clearTimeout(timer);
        node.onload = node.onerror = null;
        if (error) { node.remove(); reject(error); } else resolve();
      };
      const timer = setTimeout(() => finish(new Error('Timed out loading ' + path)), 15000);
      node.onload = () => finish();
      node.onerror = () => finish(new Error('Could not load ' + path));
      if (css) {
        document.getElementById('shuaStudioStyles')?.remove();
        node.id = 'shuaStudioStyles'; node.rel = 'stylesheet'; node.href = url(path);
      } else { node.src = url(path); node.async = false; }
      (css ? document.head : document.body).append(node);
    });
  }
  function load() {
    if (inflight) return inflight;
    if (styleReady && window.ShuaStudio?.UI) return Promise.resolve(window.ShuaStudio.UI);
    attempt++; window.__shuaStudioLoading = true;
    if (button && !window.ShuaStudio?.UI) button.textContent = 'Loading analytics…';
    loading('Loading the ten interactive dashboards…');
    inflight = (async () => {
      if (!styleReady) { await asset('analytics/studio.css', true); styleReady = true; }
      for (let i = 0; i < paths.length; i++) {
        if (!tests[i]()) await asset(paths[i]);
        if (!tests[i]()) throw new Error('Analytics module did not initialize: ' + paths[i]);
      }
      if (button) button.textContent = 'Analytics';
      if (boot) boot.hidden = true;
      const api = window.ShuaStudio.UI;
      if (pending) api.open();
      pending = false;
      return api;
    })().catch(error => {
      window.__shuaStudioLoading = false;
      if (button) button.textContent = 'Retry analytics';
      loading('A dashboard file did not finish loading. Your site and rankings are unchanged.', true);
      throw error;
    }).finally(() => { inflight = null; });
    return inflight;
  }
  function requestOpen() {
    pending = true;
    if (button) button.dataset.pending = '1';
    load().then(api => { if (pending) { api.open(); pending = false; } }).catch(() => {});
  }
  if (button) button.onclick = requestOpen;
  document.addEventListener('click', event => {
    const other = event.target.closest?.('.positions .pos');
    if (other && other !== button) {
      pending = false; if (button) delete button.dataset.pending; if (boot) boot.hidden = true;
    }
  }, true);
  window.ShuaStudioLoader = { load, open: requestOpen, version };
  load().catch(() => {});
})();
