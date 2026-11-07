const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const html=read('index.html');
const css=read('visual-nine-20261107.css');
const js=read('visual-nine-20261107.js');
const search=read('player-search.js');

test('new presentation layer loads last, current search is refreshed',()=>{
  assert.match(html,/visual-eight-20261107\.js\?v=20261107-a1[\s\S]*visual-nine-20261107\.css\?v=20261107-a1[\s\S]*visual-nine-20261107\.js\?v=20261107-a1/);
  assert.match(html,/player-search\.js\?v=20261107-search-highlight1/);
});
test('rankings align photos and do not color the top three ranks',()=>{
  assert.match(css,/#tableCard tbody tr:not\(\.tag-group\):has\(\.photo-cell\)/);
  assert.match(css,/height:69px/);
  assert.doesNotMatch(css,/gold|trophy|nth-child\(1\)|nth-child\(2\)|nth-child\(3\)/i);
});
test('player card uses existing NFL team color and centered watermark',()=>{
  assert.match(css,/--featured-accent/);
  assert.match(css,/aspect-ratio:1\.96/);
  assert.match(read('broadcast-player-card.css'),/\.featured-bg-logo\{[\s\S]*?left:49%!important;[\s\S]*?top:51%!important;/);
  assert.match(css,/\.featured-bio\{/);
});
test('game logs retain colored numbers but no stat-cell fill',()=>{
  assert.match(css,/\.gl-stat,[\s\S]*?\.gl-pts\{/);
  assert.match(css,/background:transparent!important/);
  assert.doesNotMatch(css,/gl-pts-high\s*\{|gl-pts-low\s*\{/);
});
test('share meters are visual-only and never render blank data as zero',()=>{
  assert.match(js,/snapShare/);
  assert.match(js,/targetShare/);
  assert.match(js,/routeParticipation/);
  assert.match(js,/if\(!matched\)return/);
  assert.match(js,/number\.textContent=raw/);
  assert.match(js,/aria-hidden/);
  assert.match(css,/\.shua-usage-meter::after/);
});
test('collapsed league cards stay compact; expanded view rules stay in earlier CSS',()=>{
  assert.match(css,/myteams-card:not\(:has\(>\.myteams-roster:not\(\[hidden\]\)\)\)/);
  assert.match(css,/\.myteams-glance/);
  assert.match(read('visual-eight-20261107.css'),/myteams-card:has\(>\.myteams-roster:not\(\[hidden\]\)\)/);
});
test('filter and search polish avoids Stats leaderboard changes',()=>{
  assert.match(css,/\.st-usage-groups button\[aria-pressed="true"\]/);
  assert.match(css,/\.shua-search-match/);
  assert.doesNotMatch(css,/#espnLiveSection|\.espn-live-row|#statsSection/);
});
test('search highlights original matching text safely, including punctuation',()=>{
  const helpers=search.slice(search.indexOf('const key='),search.indexOf('const teamSlugs='));
  const render=(name,query)=>vm.runInNewContext(helpers+';highlightedName('+JSON.stringify(name)+','+JSON.stringify(query)+')');
  assert.equal(render('Josh Allen','all'), 'Josh <mark class="shua-search-match">All</mark>en');
  assert.equal(render("D'Andre Swift",'dandre'),'<mark class="shua-search-match">D&#39;Andre</mark> Swift');
  assert.equal(render('<Josh>','jo'),'&lt;<mark class="shua-search-match">Jo</mark>sh&gt;');
  assert.equal(render('CeeDee Lamb',''), 'CeeDee Lamb');
});
test('subtle interactions respect reduced-motion preference',()=>{
  assert.match(css,/transition:background-color 150ms ease/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(css,/scrollTo|scrollIntoView|transform:translateY/);
});
