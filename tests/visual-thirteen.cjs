const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const css=source('visual-thirteen-20261112.css');
const js=source('visual-thirteen-20261112.js');

test('new layer loads after older polish without removing game-log fixes',()=>{
  const html=source('index.html');
  assert.match(html,/game-log-polish-20261111\.css[\s\S]*visual-twelve-20261112\.css[\s\S]*visual-thirteen-20261112\.css[\s\S]*visual-thirteen-20261112\.js/);
  assert.match(source('game-log-unlock-20261111.css'),/scroll/);
  assert.doesNotMatch(css,/scroll-snap-type|touch-action:none/);
});
test('Big Board rounds and the original buttons are decorated, not replaced',()=>{
  assert.match(js,/querySelectorAll\(':scope > \.pick'\)/);
  assert.match(js,/pick\.dataset\.draftRound/);
  assert.match(js,/heading\.append\(overall\)/);
  assert.doesNotMatch(js,/innerHTML|replaceChildren/);
  assert.match(css,/content:"RD " attr\(data-draft-round\)/);
});
test('Stats filters and comparison bars are compact without changing values',()=>{
  assert.match(css,/\.espn-live-toolbar,[\s\S]*\.espn-stat-bar\{display:contents!important\}/);
  assert.match(css,/\.espn-metric-track span/);
  assert.doesNotMatch(js,/statsRows|rankRows|statValue/);
});
test('Usage flows with the page and focuses the chosen metric',()=>{
  assert.match(css,/\.st-usage-table\{[\s\S]*?max-height:none!important/);
  assert.match(css,/\.st-usage-table td\.st-usage-focused/);
  assert.match(source('analytics/ui.js'),/chosen\[0\]===field\?'st-usage-focused'/);
  assert.match(source('analytics/ui.js'),/st-usage-gaining/);
});
test('ESPN logos are used when present and distinct league result badges remain data-backed',()=>{
  assert.match(source('my-teams-live.js'),/team\.logoURL,team\.teamLogo/);
  assert.match(source('clean-third.js'),/place\.textContent='#'\+parts\[1\]/);
  assert.match(source('clean-third.js'),/wins\.textContent=parts\[2\]/);
  assert.match(css,/\.shua-league-place\.is-first/);
});
test('compact player navigation stays clickable, with loaders and reduced-motion support',()=>{
  assert.match(css,/:has\(#unifiedOverviewPanel\[hidden\]\) #rankingPlayerNav/);
  assert.match(css,/#rankingPlayerNav \.ranking-nav-copy\{display:none!important\}/);
  assert.match(source('unified-profile.js'),/shua-profile-skeleton/);
  assert.match(css,/@keyframes shua-skeleton-sweep/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
