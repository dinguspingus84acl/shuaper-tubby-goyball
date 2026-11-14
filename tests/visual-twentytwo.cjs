const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'visual-twentytwo-20261114.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'visual-twentytwo-20261114.js'), 'utf8');

test('loads polish after the restored Big Board and includes live cache versions', () => {
  const prior = html.indexOf('visual-twentyone-20261114.css?v=20261114-bigboard-restore1');
  const styles = html.indexOf('visual-twentytwo-20261114.css?v=20261114-polish-2to10-v1');
  const script = html.indexOf('visual-twentytwo-20261114.js?v=20261114-polish-2to10-v1');
  assert.ok(prior > 0 && styles > prior && script > styles);
});

test('preserves Big Board styling recommendation 1 and all rankings', () => {
  assert.doesNotMatch(css, /#board\s+\.pick/);
  assert.doesNotMatch(js, /#board|\.pick|rankings|fetch\(/);
  assert.match(html, /visual-twentyone-20261114\.css\?v=20261114-bigboard-restore1/);
});

test('covers portrait, team logos, hero, depth, stats, charts, filters, leagues and phones', () => {
  for (const selector of [
    '#tableCard .photo-cell .photo', '.espn-headshot', '.st-rank-row .st-face',
    '.myteams-team-logo', '.shua-v22-jersey-inline', '.st-panel', '.espn-selected-stat',
    '.st-chart .st-gridline', '.st-weekly-positions button', '.shua-proj-edge',
    '@media(max-width:700px)', 'prefers-reduced-motion'
  ]) assert.ok(css.includes(selector), `Missing ${selector}`);
});

test('jersey number mirror does not remove or overwrite the original field', () => {
  assert.match(js, /\.featured-identity-meta \.featured-jersey-number/);
  assert.match(js, /inline\.textContent = value/);
  assert.match(js, /Jersey number /);
  assert.doesNotMatch(js, /aria-hidden/);
  assert.match(js, /MutationObserver/);
  assert.doesNotMatch(js, /remove\(|outerHTML\s*=|replaceWith\(/);
});
