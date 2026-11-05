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

test('player team and position move into right column and portrait is full height',()=>{
  const profile=read('unified-profile.js');
  const tenth=read('clean-tenth.css');
  assert.match(profile,/hero\.innerHTML=[\s\S]*?'<div class="featured-left">'[\s\S]*?'<\/div>'\+\s*'<div class="featured-right">'\+/);
  assert.match(profile,/'<div class="featured-right">'\+[\s\S]*?'<div class="featured-team-strip">'\+[\s\S]*?'<div class="featured-bio">'\+/);
  assert.match(tenth,/\.featured-player-card \.featured-portrait-box\{[\s\S]*?bottom:7px!important/);
  assert.match(tenth,/\.featured-player-card \.featured-team-strip\{[\s\S]*?position:relative!important/);
  assert.match(tenth,/\.featured-player-card \.featured-bio\{flex:0 0 auto/);
});

test('Stats hides only refresh copy and keeps existing stat controls',()=>{
  const tenth=read('clean-tenth.css'),html=read('index.html');
  assert.match(tenth,/#espnStatsFetched\{display:none!important\}/);
  assert.match(html,/clean-tenth\.css\?v=20261104-weather-profile1/);
  assert.match(html,/unified-profile\.js\?v=20261104-team-right1/);
  assert.match(html,/weather\.js\?v=20261104-game-emoji1/);
  assert.match(read('espn-live.js'),/id="espnColumnStatSelect"/);
});
