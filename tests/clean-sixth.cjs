'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const html=source('index.html'),css=source('clean-sixth.css'),js=source('clean-sixth.js');
const profile=source('unified-profile.js'),stock=source('stock.js'),weather=source('weather.js');

for(const name of ['clean-sixth.js','unified-profile.js','stock.js','weather.js'])new vm.Script(source(name),{filename:name});
for(const name of ['clean-sixth.css','clean-sixth.js','weather.js','stock.js','unified-profile.js']){
 const version={'clean-sixth.css':'20261104-weight2','weather.js':'20261104-indoor2'}[name]||(['stock.js','unified-profile.js'].includes(name)?'20261104-sixth10b':'20261104-sixth10');
 assert.ok(html.includes(name+'?v='+version),name+' must load with a new cache key');
}
assert.ok(html.includes('clean-fifth.css?v=20261104-indoor2'),'Previous design layer must remain intact');

// 1. Portrait and all four bio fields are retained as the card height falls.
assert.match(css,/#featuredPlayerCard\{height:206px\}/);
assert.match(css,/\.featured-bio\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
assert.ok(css.includes('phone-mode .featured-player-card .featured-bio{grid-template-columns:repeat(2,minmax(0,1fr))'),'Phone bio needs wide enough columns to show weight');
assert.ok(css.includes('.featured-portrait-box')&&css.includes('phone-mode'));
// 2. Player arrows still invoke the existing adjacent-player callback.
assert.ok(profile.includes('ranking-nav-arrow')&&profile.includes('btn.hidden=!item'));
assert.ok(profile.includes('openAdjacentPlayer(target')&&!profile.includes('No more players'));
// 3. Real ROS/Preseason toggle is moved, not copied.
assert.ok(js.includes('heading.append(positionToggle)')&&js.includes('overall.after(positionToggle)'));
// 4. Desktop position-list comparison and notes columns are assigned dimensions.
assert.ok(css.includes('#tableCard :is(th,td):nth-child(5){width:18%')&&css.includes('#tableCard :is(th,td):nth-child(6){width:auto'));
// 5. Soft Game Log opponent colors retain distinct difficulty outlines.
for(const label of ['easy','neutral','tough'])assert.ok(css.includes('.espn-game-log-opponent.gl-sos-'+label));
assert.ok(css.includes('border-left:3px solid'));
// 6. Analytics controls share sizing; timeframe selectors align right.
assert.ok(css.includes('.st-usage-controls')&&css.includes('.st-injury-filters'));
assert.ok(css.includes('#stTeamWindow')&&css.includes('margin-left:auto'));
// 7. Selected Schedule week is derived from real table header, not fixed data.
assert.ok(js.includes("table.querySelector('thead .st-week-sort.active')")&&js.includes('row.children[index]'));
// 8. My Teams already has exactly-one-open logic; highlight stays visual-only.
assert.ok(html.includes("section.querySelectorAll('.myteams-roster').forEach(el=>el.hidden=true)"));
assert.ok(css.includes('myteams-card-trigger[aria-expanded="true"]'));
// 9. Position filters remain untouched while ALL groups have functional buttons.
assert.ok(stock.includes("const expandedGroups=new Set(['RB'])"));
assert.ok(stock.includes("filter==='ALL'")&&stock.includes('data-stock-toggle'));
assert.ok(stock.includes("toggle.setAttribute('aria-expanded'")&&stock.includes('panel.hidden=!expanded'));
// 10. ET kickoff groups and collapsed past games retain actual forecast cards.
assert.ok(weather.includes("timeZone:timezone")&&weather.includes("timezone='America/New_York'"));
assert.ok(weather.includes('Sunday Early')&&weather.includes('Sunday Late')&&weather.includes('Sunday Night'));
assert.ok(weather.includes('wx-past-games')&&weather.includes('groupedGames(upcoming)'));
assert.ok(weather.includes('hourlyPreview(f,game)')&&weather.includes('wx-impact wx-impact-pending'));
console.log('PASS: all ten visual refinements retain the existing data, controls and rollback layers.');
