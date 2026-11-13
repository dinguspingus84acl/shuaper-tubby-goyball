const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('index.html'),css=read('visual-twenty-20261113.css'),js=read('visual-twenty-20261113.js');

test('new assets load after the six previously published enhancements',()=>{
  assert.match(html,/visual-nineteen-20261113\.js\?v=20261113-weekly-restore1[\s\S]*visual-twenty-20261113\.css\?v=20261113-weekly-restore1[\s\S]*visual-twenty-20261113\.js\?v=20261113-weekly-restore1/);
  assert.match(html,/weather\.js\?v=20261113-weather-revert-v1/);
});
test('mobile navigation stays four sections, is shorter, and retains 44px tap targets',()=>{
  assert.match(css,/#shuaCleanNav[\s\S]*min-height:55px!important/);
  assert.match(css,/\.shua-clean-trigger\{[\s\S]*min-height:44px!important/);
  assert.match(css,/box-shadow:inset 0 -2px #67e0ba!important/);
  assert.doesNotMatch(js,/\.shua-clean-groups\s*\.append|insertAdjacentHTML\(.+nav/);
});
test('board player tile hierarchy preserves names, slots and team context',()=>{
  assert.match(css,/#board \.pick \.name/);
  assert.match(css,/#board \.pick \.meta/);
  assert.match(css,/#board \.pick \.slot/);
  assert.doesNotMatch(css,/#board \.pick\{display:none/);
});
test('analytics page title is generated lazily with one consistent pattern',()=>{
  for(const name of ['Weekly Report','Usage','Fantasy Intelligence','Boom / Bust','Team Shares','Injury Impact','Schedule','Start / Sit','Season Stats'])assert.ok(js.includes(name));
  assert.match(js,/document\.querySelector\('#shuaAnalyticsSection'\)/);
  assert.match(js,/shua-analytics-titlebar/);
  assert.match(js,/window\.addEventListener\('ShuaStudioReady'/);
});
test('Weekly Report retains its original rows while the shared header remains',()=>{
  assert.ok(js.includes("weekly: 'Weekly Report'"));
  assert.doesNotMatch(css,/shua-weekly-bars|shua-weekly-bar-copy/);
  assert.doesNotMatch(js,/compactWeekly|actual PPR|shuaTwentyLabel/);
});
test('matchup projections are visible only if the original sourced projection condition passes',()=>{
  assert.match(html,/if\(mine!==null&&theirs!==null&&mine\+theirs>0\)/);
  assert.match(html,/shua-proj-values/);
  assert.match(html,/You '\+fmt\(mine\)/);
  assert.match(html,/Opp '\+fmt\(theirs\)/);
});
test('profile tabs use restrained underline and preserve accessible focus',()=>{
  assert.match(css,/\.unified-profile-tab\.active/);
  assert.match(css,/border-bottom-color:var\(--profile-accent/);
  assert.match(css,/\.unified-profile-tab:focus-visible/);
  assert.doesNotMatch(js,/activateTab\(/);
});
test('stats uses restrained zebra striping and existing comparison columns',()=>{
  assert.match(css,/\.espn-live-row:nth-of-type\(even\)/);
  assert.match(css,/\.espn-live-row \.espn-player-name/);
  assert.match(css,/\.espn-live-row \.espn-selected-stat/);
});
test('position colors are coherent with existing big board palette',()=>{
  for(const [pos,color] of Object.entries({qb:'#bd9bee',rb:'#64d1a5',wr:'#6dbfea',te:'#e5ad62'})){
    assert.ok(css.includes(`--shua-position-${pos}:${color}`));
  }
  for(const pos of ['QB','RB','WR','TE']){
    assert.ok(css.includes(`[data-st-pos="${pos}"]`));
    assert.ok(css.includes(`[data-espn-filter="${pos}"]`));
  }
});
test('league cards keep logo priority, source records, and compact alignment',()=>{
  assert.match(css,/\.myteams-card-identity/);
  assert.match(css,/\.myteams-name/);
  assert.match(css,/\.shua-league-record/);
  assert.doesNotMatch(js,/totalProjectedPoints|teamName/);
});
test('transitions are short, opacity only, and respect reduced motion; Weather unchanged',()=>{
  assert.match(css,/animation:shua-twenty-enter 155ms/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(css,/translate|scale\(|\.wx-|#shuaWeatherSection/);
  assert.doesNotMatch(js,/shuaWeatherSection|\.wx-/);
});
