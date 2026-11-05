'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');

test('weather shows an available game-hour sky emoji outside the details disclosure',()=>{
  const source=read('weather.js');
  assert.match(source,/function gameSky\(game\)/);
  assert.match(source,/\.filter\(h=>h\.inGame&&skyConditions/);
  assert.match(source,/function gameSkyIcon\(game\)/);
  assert.match(source,/wx-game-conditions.*gameSkyIcon\(game\).*wx-impact/);
  assert.match(source,/if\(game\.indoor\)return \{emoji:'🏟️'/);
});

test('approved broadcast design is shared by all player cards',()=>{
  const profile=read('unified-profile.js');
  const card=read('broadcast-player-card.css');
  assert.match(profile,/hero\.innerHTML=[\s\S]*?'<div class="featured-left">'[\s\S]*?'<\/div>'\+\s*'<div class="featured-right">'\+/);
  assert.match(profile,/hero\.className='featured-player-card broadcast-card'/);
  assert.match(profile,/featured-team-strip[\s\S]*?featured-name[\s\S]*?featured-identity-meta[\s\S]*?featured-bio/);
  assert.match(profile,/featuredFullTeamName\(team\)/);
  assert.match(profile,/featured-mini-logo[\s\S]*?featured-divider/);
  assert.match(card,/grid-template-columns:42% minmax\(0,58%\)/);
  assert.match(card,/grid-column:1 \/ -1!important/);
  assert.match(card,/featured-identity-divider/);
});

test('Stats hides only refresh copy and keeps existing stat controls',()=>{
  const tenth=read('clean-tenth.css'),html=read('index.html');
  assert.match(tenth,/#espnStatsFetched\{display:none!important\}/);
  assert.match(html,/clean-tenth\.css\?v=20261105-card-align1/);
  assert.match(html,/broadcast-player-card\.css\?v=20261105-broadcast2/);
  assert.match(html,/unified-profile\.js\?v=20261105-broadcast2/);
  assert.match(html,/weather\.js\?v=20261104-game-emoji1/);
  assert.match(read('espn-live.js'),/id="espnColumnStatSelect"/);
});
