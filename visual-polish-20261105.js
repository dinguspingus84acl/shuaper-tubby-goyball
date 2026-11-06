/* Team-color accents for existing player identities. This never alters data,
   player ordering, click targets, filters or the active card design. */
(()=>{
 'use strict';
 const colors={
  ari:'#97233f',atl:'#a71930',bal:'#9e7cce',buf:'#3579d4',
  car:'#36b8e8',chi:'#dc7043',cin:'#ed8b28',cle:'#df602c',
  dal:'#6699c8',den:'#fb7d35',det:'#43b6d5',gb:'#e0b74b',
  hou:'#b23a48',ind:'#5399cc',jax:'#20b5aa',kc:'#de5d60',
  lv:'#abb8c3',lac:'#56aed4',lar:'#568dea',mia:'#31bfb0',
  min:'#9670ca',ne:'#688db8',no:'#c7ab71',nyg:'#5a78c6',
  nyj:'#37a47b',phi:'#2fa68d',pit:'#dfc057',sea:'#5fbda7',
  sf:'#d36b6c',tb:'#d55e66',ten:'#6bb5d8',wsh:'#bc665c'
 };
 const aliases={ARI:'ari',ATL:'atl',BAL:'bal',BUF:'buf',CAR:'car',CHI:'chi',CIN:'cin',CLE:'cle',DAL:'dal',DEN:'den',DET:'det',GB:'gb',GNB:'gb',HOU:'hou',IND:'ind',JAX:'jax',KC:'kc',KAN:'kc',LV:'lv',LVR:'lv',LAC:'lac',LAR:'lar',LA:'lar',MIA:'mia',MIN:'min',NE:'ne',NWE:'ne',NO:'no',NOR:'no',NYG:'nyg',NYJ:'nyj',PHI:'phi',PIT:'pit',SEA:'sea',SF:'sf',SFO:'sf',TB:'tb',TAM:'tb',TEN:'ten',WAS:'wsh',WSH:'wsh'};
 const findCode=node=>{
  const logo=node.querySelector('.lineup-team-logo,.tagged-player-team-logo,.stock-logo,.st-person small img,.espn-player-meta img,.myteams-nfl-logo');
  const slug=logo?.getAttribute('src')?.match(/\/nfl\/500\/([a-z]+)\.png/i)?.[1]?.toLowerCase();
  if(slug&&colors[slug])return slug;
  const meta=node.querySelector('.phone-rank-meta,.tagged-player-team-name,.stock-meta,.st-person small,.espn-player-meta,.myteams-player-open small');
  const text=(meta?.textContent||'').toUpperCase();
  const match=text.match(/\b(ARI|ATL|BAL|BUF|CAR|CHI|CIN|CLE|DAL|DEN|DET|GB|GNB|HOU|IND|JAX|KC|KAN|LV|LVR|LAC|LAR|MIA|MIN|NE|NWE|NO|NOR|NYG|NYJ|PHI|PIT|SEA|SF|SFO|TB|TAM|TEN|WAS|WSH)\b/);
  return aliases[match?.[1]];
 };
 const selector='#rows .photo-cell,#shuaStock .stock-person,#shuaAnalyticsSection .st-person,#espnLiveSection .espn-player,#shuaMyTeams .myteams-roster-row';
 function apply(){
  document.querySelectorAll(selector).forEach(node=>{
   if(node.classList.contains('shua-accent-ready'))return;
   const code=findCode(node),color=colors[code];
   if(color){node.style.setProperty('--shua-player-color',color);node.classList.add('shua-accent-ready');}
  });
 }
 let frame=0;
 const schedule=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;apply()});};
 function init(){
  apply();
  const parent=document.querySelector('main')||document.body;
  new MutationObserver(records=>{
   if(records.some(r=>r.addedNodes.length||r.removedNodes.length))schedule();
  }).observe(parent,{childList:true,subtree:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
