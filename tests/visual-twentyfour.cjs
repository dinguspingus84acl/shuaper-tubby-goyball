const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root,'visual-twentyfour-20261114.css'),'utf8');
const js = fs.readFileSync(path.join(root,'visual-twentyfour-20261114.js'),'utf8');
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');

test('visual 24 assets load after visual 23 with cache keys', () => {
  const c = html.indexOf('visual-twentyfour-20261114.css?v=20261114-visual-1-2-4to9-v2');
  const s = html.indexOf('visual-twentyfour-20261114.js?v=20261114-visual-1-2-4to9-v2');
  assert.ok(c > html.indexOf('visual-twentythree-20261114.js'));
  assert.ok(s > c);
});

test('navigation icon spacing and brand treatment stay scoped to the header', () => {
  assert.match(css, /#shuaCleanNav \.shua-clean-brand::before/);
  assert.match(css, /#shua-menu-rankings button::before/);
  assert.match(css, /#shua-menu-tools button::before/);
  assert.match(css, /min-height:40px!important/);
});

test('player history formatting and game log ticks preserve score text', () => {
  assert.match(css, /\.player-history-points/);
  assert.match(css, /td\.gl-pts-high::before/);
  assert.match(css, /td\.gl-pts-low::before/);
  assert.doesNotMatch(js, /gameLogPointsClass|categoryPoints\(/);
});

test('Stats categories preserve original option value and selection', () => {
  for (const label of ['Fantasy Points','Passing','Rushing','Receiving']) assert.ok(js.includes(label));
  assert.match(js, /select\.value = value/);
  assert.match(js, /optgroup\.appendChild\(options\.get\(key\)\)/);
});

test('Usage heat only applies to valid comparable numeric cells', () => {
  assert.match(js, /if \(!field \|\| field === 'espnPositionRank'\) continue/);
  assert.match(js, /numeric\.length < 5/);
  assert.match(js, /if \(high <= low\) continue/);
  assert.match(css, /td\.shua-v24-heat/);
});

test('standing bars come from each record, not new fantasy data', () => {
  assert.match(js, /const games = wins \+ losses \+ ties/);
  assert.match(js, /wins \+ ties \/ 2/);
  assert.match(js, /aria-hidden/);
  assert.match(css, /\.shua-v24-record-bar/);
});

test('Trade sides are renamed while existing trade calculator drives values', () => {
  assert.match(js, /'Your Side'/);
  assert.match(js, /'Their Side'/);
  assert.match(js, /\.trade-why-side h4/);
  assert.match(css, /#tradeSection:not\(\.trade-chart-view\) \.trade-sides/);
  assert.doesNotMatch(js, /playerValue\(|tradeMeterLeft|tradeMeterRight/);
});

test('excluded ideas are not added in this pass', () => {
  assert.doesNotMatch(css, /#shuaStock|#stockSection|stock-distribution/);
  assert.doesNotMatch(js, /data-shua-round|roundSeparator|#shuaStock|stockSection/);
});
