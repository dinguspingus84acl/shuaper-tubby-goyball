const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const css=read('visual-seventeen-20261113.css');
const html=read('index.html');

test('final stylesheet is loaded after the previous refinements',()=>{
  assert.match(html,/visual-sixteen-20261113\.js\?v=20261113-v1[\s\S]*visual-seventeen-20261113\.css\?v=20261113-v2/);
});
test('Big Board keeps actual draft pick children and labels rounds in a gutter',()=>{
  assert.match(css,/#board\{padding-left:42px/);
  assert.match(css,/\.pick\[data-shua-round-start\]\{overflow:visible!important/);
  assert.match(css,/left:-40px!important/);
  assert.match(css,/content:'RD ' attr\(data-shua-round\)!important/);
  assert.match(read('visual-sixteen-20261113.js'),/tile\.dataset\.shuaRoundStart='true'/);
  assert.doesNotMatch(css,/grid-template-columns:repeat\(11/);
});
test('Overview hero is compact but retains player identity and portraits',()=>{
  assert.match(css,/aspect-ratio:2\.64!important/);
  assert.match(css,/aspect-ratio:2\.04!important/);
  assert.match(css,/#featuredPlayerCard\.broadcast-card \.featured-bio\{padding:5px 7px!important/);
  assert.doesNotMatch(css,/featured-photo\{display:none/);
  assert.doesNotMatch(css,/featured-name\{display:none/);
});
test('Overview navigation moves into compact, accessible hero-side arrows',()=>{
  assert.match(css,/#rankingPlayerNav:not\(\[hidden\]\)/);
  assert.match(css,/pointer-events:none/);
  assert.match(css,/#rankingPlayerNav button:not\(\[hidden\]\)/);
  assert.match(css,/#rankingPlayerNav button\[data-player-step="next"\]\{margin-left:auto!important/);
  assert.match(read('unified-profile.js'),/btn\.setAttribute\('aria-label',\(dir==='prev'\?'Previous':'Next'\)/);
});
test('odd Overview stat fills the trailing row and notes are untruncated',()=>{
  assert.match(css,/#stats>\.stat:last-child:nth-child\(3n \+ 1\)/);
  assert.match(css,/grid-column:1\/-1!important/);
  assert.match(css,/#playerNotes\{[\s\S]*?max-height:none!important/);
  assert.match(read('board-overview-20261112.css'),/\.featured-player-profile:has\(#unifiedOverviewPanel:not\(\[hidden\]\)\)\{/);
});
test('Stats controls have separate groups and quieter comparisons',()=>{
  assert.match(css,/grid-template-columns:minmax\(0,1fr\) auto!important/);
  assert.match(css,/\.espn-sticky-controls>\.espn-live-toolbar/);
  assert.match(css,/\.espn-sticky-controls>\.espn-stat-bar/);
  assert.match(css,/\.espn-metric-track\{[\s\S]*?height:6px!important/);
  assert.match(css,/\.espn-selected-stat\{[\s\S]*?text-align:right!important/);
  assert.match(read('espn-live.js'),/data-espn-view="PERGAME"/);
});
test('odd last My Teams card centers only on a two-column desktop grid',()=>{
  assert.match(css,/@media\(min-width:1020px\)/);
  assert.match(css,/\.myteams-card:last-child:nth-child\(odd\):not\(:has\(>\.myteams-roster:not\(\[hidden\]\)\)\)/);
  assert.match(css,/justify-self:center!important/);
});
test('scoped visual consistency never changes the restored Weather presentation',()=>{
  assert.doesNotMatch(css,/#shuaWeatherSection|\.wx-game|\.wx-versus/);
  assert.match(read('weather.js'),/class="wx-versus">AT<\/span>/);
  assert.match(html,/weather\.js\?v=20261113-weather-revert-v1/);
});
