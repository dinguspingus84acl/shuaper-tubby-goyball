'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=source('index.html');
const js=source('clean-fifth.js');
const css=source('clean-fifth.css');
const weather=source('weather.js');
const live=source('espn-live.js');

new vm.Script(js,{filename:'clean-fifth.js'});
new vm.Script(weather,{filename:'weather.js'});
assert.ok(html.includes('clean-fifth.css?v=20261104-indoor2')&&html.includes('clean-fifth.js?v=20261104-fifth9b'),'The new stylesheet/script must load');
assert.ok(html.includes('clean-fourth.css?v=20261105-search-tools1')&&html.includes('clean-polish.css?v=20261103-10clean2'),'Old design layers remain recoverable');

// 1. Notes retain the full text and a keyboard-accessible expander.
assert.match(css,/\.shua-note-excerpt\s*\{[^}]*-webkit-line-clamp:1/);
assert.ok(js.includes("button.setAttribute('aria-expanded'")&&css.includes('.shua-note-toggle::before'));
// 2. The stored field is a rank gap, with unchanged source values.
assert.ok(js.includes("header.textContent='vs ESPN'")&&js.includes('is-up')&&js.includes('is-down')&&js.includes('is-even'));
assert.ok(!js.includes('additionalStats.espnAdp='));
// 3. Keep every Overview tile, but reduce padding.
assert.ok(css.includes('#unifiedOverviewPanel #stats .stat')&&css.includes('min-height:53px'));
// 4. The real selector and category buttons move, retaining bound handlers.
assert.ok(js.includes("heading.append(yearRow)")&&js.includes("gameLog.prepend(heading)")&&js.includes("summary?.querySelector('strong')?.remove()"));
assert.ok(js.includes("heading.append(title)")&&js.includes("heading.append(summary)"));
// 5 is explicitly excluded: do not filter future weeks or alter game-log rows.
assert.ok(live.includes('cached.rows.map(g=>')&&live.includes("!g.hasStats?'gl-unplayed'"),'Future-week rows must stay visible');
assert.ok(!css.includes('.gl-unplayed{display:none')&&!js.includes('gl-unplayed'));
// 6. Same existing Schedule buttons and season/week selection, reorganized.
assert.ok(js.includes('line.append(positions,week)')&&css.includes('.shua-fifth-schedule-line'));
assert.ok(js.includes('function watchAnalytics()')&&js.includes('new MutationObserver(watchAnalytics).observe(main'),'Schedule observer must attach when Analytics mounts lazily');
assert.ok(css.includes('.shua-active-filters{display:none!important}')&&css.includes('phone-mode #shuaAnalyticsSection'));
// 7. Smaller league selector rows keep real logos and records.
assert.ok(css.includes('myteams-card-trigger{min-height:51px')&&css.includes('myteams-card-trigger{min-height:49px'));
// 8. Retain position badges in All while hiding them in one-position Stock.
assert.ok(css.includes('[data-stock-filter]:not([data-stock-filter="ALL"]) .stock-meta .shua-row-pos'));
// 9. Weather totals remain derived directly from the loaded snapshot.
assert.ok(weather.includes("['Games',all.length]")&&weather.includes("['Indoor',indoor.length]")&&weather.includes("['Pending',pending.length]")&&weather.includes('Forecast available'));
assert.ok(css.includes('wx-status-item')&&css.includes('wx-overview'));
// 10. Pending games are truthful fixtures, not imaginary forecasts.
assert.ok(weather.includes('if(isPending)return')&&weather.includes('wx-pending-fixture'));
assert.ok(weather.includes('wx-impact wx-impact-pending')&&weather.includes('https://mysportsweather.com/nfl'));
assert.ok(weather.includes('hourlyPreview(f,game)')&&weather.includes('hourTable(f.hourly'),'Real weather cards still show hourly conditions');
console.log('PASS: nine compact refinements preserve real controls, full player/forecast data, and future Game Log weeks.');
