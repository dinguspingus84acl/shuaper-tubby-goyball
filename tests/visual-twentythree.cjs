const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname,'..');
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
const css = fs.readFileSync(path.join(root,'visual-twentythree-20261114.css'),'utf8');
const js = fs.readFileSync(path.join(root,'visual-twentythree-20261114.js'),'utf8');

test('visual 23 loads after visual 22 with matching cache versions', () => {
  const prev = html.indexOf('visual-twentytwo-20261114.js?v=20261114-polish-2to10-v2');
  const style = html.indexOf('visual-twentythree-20261114.css?v=20261114-visual-1to4-9to10-v1');
  const script = html.indexOf('visual-twentythree-20261114.js?v=20261114-visual-1to4-9to10-v1');
  assert.ok(prev > 0 && style > prev && script > style);
});

test('only approved visual sections are addressed', () => {
  for (const forbidden of ['#shuaWeather', '#shuaMyTeams', '#shuaInjury', '.st-injury-',
    '.st-usage-table', '#stWeeklyReport', '.st-weekly-positions', 'expected-points']) {
    assert.ok(!css.includes(forbidden),`CSS should not modify ${forbidden}`);
  }
  assert.ok(!/fetch\(|localStorage|sessionStorage|setItem\(|replaceWith\(/.test(js));
});

test('round styling uses decorative non-interactive bands, preserving original tiles', () => {
  assert.match(css,/\.shua-v23-round-band/);
  assert.match(css,/pointer-events:none/);
  assert.match(js,/aria-hidden/);
  assert.match(js,/\.pick\[data-shua-round\]/);
  assert.doesNotMatch(js,/\.pick[^\n]*\.remove\(/);
});

test('position badges and search are presentation-only and preserve player values', () => {
  for (const token of ['#tableCard .badge','#espnLiveSection .espn-player-meta-pos',
    '#shuaAnalyticsSection .st-person-copy','#shuaSearchResults .shua-search-result',
    'shua-v23-search-extra']) assert.ok(js.includes(token),`Missing ${token}`);
  assert.match(css,/shua-v23-search-position/);
  assert.match(css,/grid-template-columns:minmax\(0,1fr\) max-content/);
});

test('mobile cues depend on overflow and reduced motion stays respected', () => {
  assert.match(js,/el\.scrollWidth - el\.clientWidth/);
  assert.match(js,/el\.scrollLeft < range - 5/);
  assert.match(css,/prefers-reduced-motion:no-preference/);
  assert.match(css,/@media\(max-width:700px\)/);
});
