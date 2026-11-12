const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const html=read('index.html');
const css=read('visual-twelve-20261112.css');

test('latest visual layer is last and prior game-log fixes are retained',()=>{
  assert.match(html,/game-log-unlock-20261111\.css[\s\S]*game-log-polish-20261111\.css[\s\S]*visual-twelve-20261112\.css/);
});
test('dark position-accent draft cards reserve pick number width without headshots',()=>{
  assert.match(css,/#board \.pick\.rb/);
  assert.match(css,/#board \.pick\.wr/);
  assert.match(css,/#board \.pick\.qb/);
  assert.match(css,/#board \.pick\.te/);
  assert.match(css,/padding-top:18px;padding-right:0/);
  assert.match(css,/-webkit-line-clamp:2/);
  assert.match(css,/#board \.pick \.slot/);
  const boardRenderer=html.match(/function boardView\(l\)[\s\S]*?function table\(l,o\)/)?.[0]||'';
  assert.ok(boardRenderer);
  assert.doesNotMatch(boardRenderer,/(?:<img|pic\()/);
});
test('player-card hero compacts on non-Overview tabs only',()=>{
  assert.match(css,/:has\(#unifiedOverviewPanel\[hidden\]\)/);
  assert.match(css,/height:91px!important/);
  assert.match(css,/#featuredPlayerCard \.featured-bio/);
  assert.doesNotMatch(css,/scroll-snap|overflow-y:hidden|touch-action:none/);
});
test('key overview metrics and usage numbers are larger',()=>{
  assert.match(css,/#unifiedOverviewPanel #stats \.stat b/);
  assert.match(css,/font-size:clamp\(20px,2\.4vw,25px\)!important/);
  assert.match(css,/\.st-usage-table tbody td:not\(:first-child\)/);
  assert.match(css,/font-size:14px!important/);
  assert.match(css,/position:sticky;left:0/);
});
test('navigation and notes use consistent states and accessible disclosures',()=>{
  assert.match(css,/#shuaCleanNav \.shua-clean-trigger/);
  assert.match(css,/\.myteams-subnav button\[aria-selected="true"\]/);
  assert.match(css,/#tableCard td\.notes:not\(\.is-expanded\) \.shua-note-excerpt/);
  assert.match(css,/-webkit-line-clamp:1!important/);
  assert.match(css,/#tableCard td\.notes\.is-expanded \.shua-note-excerpt/);
  assert.match(read('clean-fifth.js'),/aria-expanded/);
});
test('My Teams visuals and interaction respect reduced motion',()=>{
  assert.match(css,/#shuaMyTeams \.myteams-score-current strong/);
  assert.match(css,/#shuaMyTeams \.myteams-roster-row>strong/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
