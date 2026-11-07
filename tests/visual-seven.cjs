const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'visual-seven-20261107.css'),'utf8');
const js=fs.readFileSync(path.join(root,'visual-seven-20261107.js'),'utf8');

test('last-loaded presentation layer is cache-busted and ordered',()=>{
  assert.match(html,/visual-six-20261106\.js[\s\S]*visual-seven-20261107\.css\?v=20261107-a1[\s\S]*visual-seven-20261107\.js\?v=20261107-a1/);
});
test('navigation indicator follows the selected group without intercepting touches',()=>{
  assert.match(js,/\.shua-clean-group\.is-active > \.shua-clean-trigger/);
  assert.match(css,/\.shua-nav-indicator[\s\S]*pointer-events:none/);
  assert.match(js,/ResizeObserver/);
});
test('ranking identities gain headshot size without altering rank movement',()=>{
  assert.match(css,/tbody tr:has\(\.photo-cell\) \.photo:not\(\.lg\)/);
  assert.doesNotMatch(js,/rankingHistory|rankDelta|movementBadge/);
});
test('broadcast card retains four-stat strip and aligned identity markup',()=>{
  assert.match(css,/featured-player-card\.broadcast-card \.featured-bio/);
  assert.doesNotMatch(js,/featured-player-card/);
});
test('chart focus follows real rendered data points',()=>{
  assert.match(js,/\.st-chart-hit\[data-point\]/);
  assert.match(js,/shua-chart-guide/);
  assert.doesNotMatch(js,/Math\.random/);
});
test('scrolling analytics labels stay visible without recoloring game-log weeks',()=>{
  assert.match(css,/\.st-usage-table,\.st-intel-table/);
  assert.match(css,/position:sticky;left:0/);
  assert.doesNotMatch(css,/espn-game-log-table (td|th):first-child\{/);
});
test('scoreboards use existing Weather and My Teams components',()=>{
  assert.match(css,/\.wx-matchup/);
  assert.match(css,/\.myteams-scoreboard/);
  assert.match(css,/\.myteams-schedule-game/);
});
test('mobile filter controls wrap and preserve full labels',()=>{
  assert.match(css,/\.st-usage-groups>button[\s\S]*white-space:normal/);
  assert.match(css,/\.wx-filters\{flex-wrap:wrap/);
});
