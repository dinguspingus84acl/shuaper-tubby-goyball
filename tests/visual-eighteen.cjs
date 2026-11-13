const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const css=read('visual-eighteen-20261113.css');
const js=read('visual-eighteen-20261113.js');
const html=read('index.html');

test('new visual layer loads after the existing Weather and earlier refinements',()=>{
  assert.match(html,/visual-seventeen-20261113\.css\?v=20261113-v2[\s\S]*visual-eighteen-20261113\.css\?v=20261113-v1[\s\S]*visual-eighteen-20261113\.js\?v=20261113-v1/);
  assert.match(html,/weather\.js\?v=20261113-weather-revert-v1/);
});
test('selected Big Board player is spotlighted without adding columns',()=>{
  assert.match(css,/#board \.pick\.shua-selected-pick/);
  assert.match(css,/outline:2px solid #66dbb3/);
  assert.match(js,/#board \.pick\[data-id\], #rows tr\[data-id\]/);
  assert.match(js,/MutationObserver\(highlightPick\)/);
  assert.doesNotMatch(css,/grid-template-columns:repeat\(11/);
});
test('portrait edge blend does not hide names, jerseys, or photos',()=>{
  assert.match(css,/\.featured-left::after/);
  assert.match(css,/pointer-events:none/);
  assert.doesNotMatch(css,/featured-photo\s*\{|featured-right\s*\{|\.featured-team-strip\s*\{/);
});
test('Overview existing stat cards gain three quiet category tints',()=>{
  assert.match(css,/#stats>\.stat:nth-child\(-n\+4\)/);
  assert.match(css,/#stats>\.stat:nth-child\(n\+5\):nth-child\(-n\+6\)/);
  assert.match(css,/#stats>\.stat:nth-child\(7\)/);
  assert.doesNotMatch(js,/#unifiedOverviewPanel/);
});
test('Stats selected numbers get shading but no sticky-header rule',()=>{
  assert.match(css,/\.espn-selected-stat-head\{/);
  assert.match(css,/#espnLiveRows \.espn-selected-stat\{/);
  assert.doesNotMatch(css,/position:sticky/);
});
test('Usage selected metric remains visible and other sign colors are respected',()=>{
  assert.match(css,/\.st-usage-table tbody td\.st-usage-focused/);
  assert.match(css,/:not\(\.st-usage-gaining\):not\(\.st-usage-losing\)/);
  assert.match(css,/td\.st-usage-focused\.st-usage-gaining/);
});
test('My Teams matchup separates factual opponent and current week without fake logos',()=>{
  assert.match(html,/class="shua-match-week"/);
  assert.match(html,/class="shua-match-vs"/);
  assert.match(html,/class="shua-match-opponent"/);
  assert.match(css,/\.shua-match-opponent\{/);
  assert.match(html,/escapeHtml\(opponent\.teamName\)/);
});
test('fast transitions respect reduced motion and do not change Weather',()=>{
  assert.match(css,/shua-eighteen-appear 140ms/);
  assert.match(css,/transition:border-color 150ms/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(css,/#shuaWeatherSection|\.wx-|\.weather-/);
  assert.doesNotMatch(css,/shua-weekly-feature|sticky.*espn-live-head/i);
});
