(()=>{
'use strict';

if(typeof profile!=='function'||!document.getElementById('modal'))return;

const baseProfile=profile;
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const ROS_ALIASES={chigoziemokonkwo:'chigokonkwo',chigokonkwo:'chigoziemokonkwo'};
let activeSeed=null;

const style=document.createElement('style');
style.id='unifiedProfileStyles';
style.textContent=`
.unified-profile-tabs{display:flex;gap:5px;overflow-x:auto;padding:9px 0 7px;margin-top:8px;border-bottom:1px solid #ffffff18;-webkit-overflow-scrolling:touch}
.unified-profile-tab{flex:0 0 auto;border:1px solid #ffffff1b;background:#081a2d;color:#8da1b6;border-radius:8px;padding:7px 9px;font-size:.62rem;font-weight:950}
.unified-profile-tab.active{background:#183d63;color:#fff;border-color:#ffffff32}
.unified-profile-panel{padding-top:10px}
.unified-profile-panel[hidden]{display:none!important}
.unified-rank-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
.unified-rank-card span,.unified-stat-item span{display:block;color:#7f93aa;font-size:.57rem;font-weight:800}
.unified-rank-card b{display:block;margin-top:3px;font-size:1rem}
#unifiedOverviewPanel #stats{margin-top:0;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;align-items:stretch}
#unifiedOverviewPanel #stats .stat{
  min-width:0;
  min-height:72px;
  box-sizing:border-box;
  border:1px solid var(--l);
  border-radius:9px;
  padding:12px;
  background:#081a2d;
  display:flex;
  flex-direction:column;
  justify-content:center
}
#unifiedOverviewPanel #stats .stat span{font-size:.62rem;line-height:1.15}
#unifiedOverviewPanel #stats .stat b{font-size:1.05rem;line-height:1.1;margin-top:5px}
.unified-stat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:7px}
.unified-stat-item{border:1px solid #ffffff12;background:#07182a;border-radius:8px;padding:7px}
.unified-stat-item b{display:block;margin-top:2px;font-size:.76rem}
.unified-profile-loading{padding:14px 4px;color:#7f93aa;font-size:.66rem}
#unifiedNotesPanel .note-box{margin-top:0}
#espnProfileGameLogWrap{display:none!important}
@media(max-width:700px){
  .unified-profile-tabs{gap:4px;padding-bottom:6px}
  .unified-profile-tab{padding:7px 8px;font-size:.58rem}
  #unifiedOverviewPanel #stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
  #unifiedOverviewPanel #stats .stat{min-height:66px;padding:10px}
  .unified-stat-grid{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px}
  .unified-stat-item{flex:0 0 92px}
}
`;
document.head.appendChild(style);

function playerByName(name){
  const n=norm(name);
  const aliases={kennethwalkeriii:'kennethwalker',kennethwalker:'kennethwalkeriii'};
  try{
    return players.find(p=>norm(p.name)===n||norm(p.name)===aliases[n])||
      board.find(p=>norm(p.name)===n||norm(p.name)===aliases[n])||null;
  }catch(e){return null}
}
function fixKnownHeadshot(name){
  const n=norm(name);
  if(n!=='kennethwalker'&&n!=='kennethwalkeriii')return;
  const person=document.querySelector('#profileTop .person');
  if(person)person.innerHTML='<img class="photo lg" src="https://a.espncdn.com/i/headshots/nfl/players/full/4567048.png" alt="Kenneth Walker III">';
}
function playerById(id){
  try{return players.find(p=>String(p.id)===String(id))||board.find(p=>String(p.id)===String(id))||null}catch(e){return null}
}
function basePositionPlayer(name){
  const n=norm(name);
  try{return players.find(p=>norm(p.name)===n)||null}catch(e){return null}
}
function overallRank(name){
  const n=norm(name);
  try{
    const i=board.findIndex(p=>norm(p.name)===n);
    return i>=0?i+1:null;
  }catch(e){return null}
}
function rosRank(name,pos){
  const n=norm(name);
  try{
    const list=rosRankings[pos]||[];
    const row=list.find(x=>{
      const xn=norm(x.name);
      return xn===n||ROS_ALIASES[n]===xn||ROS_ALIASES[xn]===n;
    });
    return row?Number(row.rank):null;
  }catch(e){return null}
}
function preseasonRank(name){
  return Number(basePositionPlayer(name)?.positionRank)||null;
}
function espnPreseasonRank(name){
  const p=basePositionPlayer(name);
  const pre=Number(p?.positionRank);
  const delta=Number(p?.additionalStats?.espnAdp);
  if(!Number.isFinite(pre)||!Number.isFinite(delta))return null;
  return Math.max(1,Math.round(pre+delta));
}
function normalizeEspnAdpCard(name){
  const stats=document.getElementById('stats');
  if(!stats)return;
  const rank=espnPreseasonRank(name);
  stats.querySelectorAll('.stat').forEach(card=>{
    const label=card.querySelector('span');
    if(label?.textContent?.trim()==='ESPN ADP'){
      const value=card.querySelector('b');
      if(value)value.textContent=rank?'#'+rank:'—';
    }
  });
}
function historicalSeed(){return activeSeed&&activeSeed.__historical?activeSeed:null}
function seedYear(seed){return Number(seed?.seasonYear||seed?.year||0)||null}
function seedTeamLogo(seed){
  const url=window.ShuaEspnLive?.getTeamLogoUrl?.(seed?.team);
  return url?'<div class="team-logo"><img src="'+url+'" alt=""></div>':'';
}
function seedFace(seed){
  const url=window.ShuaEspnLive?.getPlayerHeadshotUrl?.(seed);
  return url?'<div class="person"><img class="photo lg" src="'+url+'" alt="'+String(seed?.name||'')+'" onerror="this.parentElement.innerHTML=\'<div class=&quot;photo lg fallback&quot;>?</div>\'"></div>':'<div class="person"><div class="photo lg fallback">?</div></div>';
}
function renderHistoricalOverview(seed){
  const stats=document.getElementById('stats');
  if(!stats)return;
  const yr=seedYear(seed);
  const rank=Number(seed?.rank)||null;
  stats.innerHTML=
    '<div class="stat"><span>'+(yr?yr+' ':'')+String(seed?.position||'')+' Finish</span><b>'+(rank||'—')+'</b></div>'+
    '<div class="stat"><span>PPR Points</span><b>'+(Number.isFinite(Number(seed?.points))?Number(seed.points).toFixed(1):'—')+'</b></div>'+
    '<div class="stat"><span>PPG</span><b>'+(Number.isFinite(Number(seed?.average))?Number(seed.average).toFixed(1):'—')+'</b></div>'+
    '<div class="stat"><span>Games</span><b>'+(Number.isFinite(Number(seed?.gamesPlayed))?Number(seed.gamesPlayed):'—')+'</b></div>'+
    '<div class="stat"><span>Team</span><b>'+String(seed?.team||'—')+'</b></div>'+
    '<div class="stat"><span>Position</span><b>'+String(seed?.position||'—')+'</b></div>';
}

function ensureUi(){
  const box=document.querySelector('#modal .profile');
  if(!box)return null;
  let tabs=document.getElementById('unifiedProfileTabs');
  if(tabs)return box;

  const injury=document.getElementById('injuryStatus');
  const stats=document.getElementById('stats');
  const notes=box.querySelector('.note-box');

  tabs=document.createElement('div');
  tabs.id='unifiedProfileTabs';
  tabs.className='unified-profile-tabs';
  tabs.innerHTML=[
    ['overview','Overview'],
    ['gamelog','Game Log'],
    ['history','History'],
    ['notes','Notes']
  ].map(([k,l])=>'<button type="button" class="unified-profile-tab" data-profile-tab="'+k+'">'+l+'</button>').join('');

  const panels=document.createElement('div');
  panels.id='unifiedProfilePanels';
  panels.innerHTML=
    '<div id="unifiedOverviewPanel" class="unified-profile-panel" data-profile-panel="overview"></div>'+
    '<div id="unifiedGameLogPanel" class="unified-profile-panel" data-profile-panel="gamelog" hidden></div>'+ 
    '<div id="unifiedHistoryPanel" class="unified-profile-panel" data-profile-panel="history" hidden></div>'+
    '<div id="unifiedNotesPanel" class="unified-profile-panel" data-profile-panel="notes" hidden></div>';

  const profileTop=document.getElementById('profileTop');
  profileTop.insertAdjacentElement('afterend',tabs);
  tabs.insertAdjacentElement('afterend',panels);

  const overview=document.getElementById('unifiedOverviewPanel');
  if(injury)overview.appendChild(injury);
  if(stats)overview.appendChild(stats);
  if(notes)document.getElementById('unifiedNotesPanel').appendChild(notes);

  tabs.addEventListener('click',e=>{
    const btn=e.target.closest('[data-profile-tab]');
    if(!btn)return;
    activateTab(btn.dataset.profileTab);
  });
  return box;
}
function activateTab(key){
  const tabs=document.querySelectorAll('[data-profile-tab]');
  tabs.forEach(b=>b.classList.toggle('active',b.dataset.profileTab===key));
  document.querySelectorAll('[data-profile-panel]').forEach(p=>p.hidden=p.dataset.profilePanel!==key);
  const name=document.getElementById('modal')?.dataset.unifiedName;
  if(!name)return;
  if(key==='gamelog')loadGameLog(name);
  if(key==='history')loadHistory(name);
}
function renderOverviewRanks(name){
  const hist=historicalSeed();
  if(hist){renderHistoricalOverview(hist);return}
  const p=playerByName(name)||basePositionPlayer(name);
  const pos=p?.position||'—';
  const pre=preseasonRank(name);
  const ros=rosRank(name,pos);
  const stats=document.getElementById('stats');
  if(!stats)return;
  stats.querySelectorAll('.unified-overview-rank').forEach(x=>x.remove());
  stats.insertAdjacentHTML('afterbegin',
    '<div class="stat unified-overview-rank"><span>ROS '+pos+'</span><b>'+(ros?'#'+ros:'—')+'</b></div>'+
    '<div class="stat unified-overview-rank"><span>Preseason '+pos+'</span><b>'+(pre?'#'+pre:'—')+'</b></div>'+
    '<div class="stat unified-overview-rank" id="unifiedEspnRankCard"><span>ESPN '+pos+'</span><b>…</b></div>'
  );
  normalizeEspnAdpCard(name);
  loadOverviewEspnRank(name,pos);
}
async function loadOverviewEspnRank(name,pos){
  const card=document.getElementById('unifiedEspnRankCard');
  if(!card)return;
  try{
    if(window.ShuaEspnLive?.ensureData)await window.ShuaEspnLive.ensureData();
    const rank=window.ShuaEspnLive?.getPositionRank?.(name);
    if(document.getElementById('modal')?.dataset.unifiedName!==name)return;
    card.innerHTML='<span>ESPN '+pos+'</span><b>'+(rank?'#'+rank:'—')+'</b>';
  }catch(e){
    card.innerHTML='<span>ESPN '+pos+'</span><b>—</b>';
  }
}
async function loadHistory(name){
  const panel=document.getElementById('unifiedHistoryPanel');
  if(!panel)return;
  if(panel.dataset.loadedFor===norm(name)&&panel.dataset.ready==='1')return;
  panel.dataset.loadedFor=norm(name);
  panel.dataset.ready='0';
  panel.innerHTML='<div class="unified-profile-loading">Loading ESPN history…</div>';
  if(window.ShuaPlayerHistory?.render){
    await window.ShuaPlayerHistory.render(name,panel);
    panel.dataset.ready='1';
  }else{
    panel.innerHTML='<div class="unified-profile-loading">ESPN history is unavailable right now.</div>';
  }
}
async function loadGameLog(name){
  const panel=document.getElementById('unifiedGameLogPanel');
  if(!panel)return;
  if(panel.dataset.loadedFor===norm(name)&&panel.dataset.ready==='1')return;
  panel.dataset.loadedFor=norm(name);
  panel.dataset.ready='0';
  panel.innerHTML='<div class="unified-profile-loading">Loading game log…</div>';
  if(window.ShuaEspnLive?.renderGameLog){
    const yr=seedYear(activeSeed);
    if(yr&&window.ShuaEspnLive?.renderGameLogYear)await window.ShuaEspnLive.renderGameLogYear(name,yr,panel);
    else await window.ShuaEspnLive.renderGameLog(name,panel);
    panel.dataset.ready='1';
  }else{
    panel.innerHTML='<div class="unified-profile-loading">Game log is unavailable right now.</div>';
  }
}
function prepareUnified(name,seed=null){
  ensureUi();
  activeSeed=seed?{...seed,__historical:!!(seed.source==='nflverse'||seed.seasonYear||seed.year)}:null;
  const modal=document.getElementById('modal');
  modal.dataset.unifiedName=name;
  renderOverviewRanks(name);
  const gp=document.getElementById('unifiedGameLogPanel');
  if(gp){gp.dataset.loadedFor='';gp.dataset.ready='0';gp.innerHTML=''}
  const hp=document.getElementById('unifiedHistoryPanel');
  if(hp){hp.dataset.loadedFor='';hp.dataset.ready='0';hp.innerHTML=''}
  activateTab('overview');
}
async function openByName(name,seed=null){
  let p=playerByName(name);
  if(p){
    activeSeed=null;
    baseProfile(p.id);
    fixKnownHeadshot(name);
    prepareUnified(p.name);
    return;
  }
  try{
    let ep=seed||null;
    if(!ep&&window.ShuaEspnLive?.getAnyPlayerByName)ep=await window.ShuaEspnLive.getAnyPlayerByName(name);
    if(!ep){
      if(window.ShuaEspnLive?.ensureData)await window.ShuaEspnLive.ensureData();
      ep=window.ShuaEspnLive?.getPlayerByName?.(name);
    }
    if(!ep)return;

    const modal=document.getElementById('modal');
    document.getElementById('pn').textContent=ep.name;
    document.getElementById('pn').className='';
    const yr=seedYear(ep);
    document.getElementById('pm').textContent=(yr?yr+' · ':'')+(ep.team||'—')+' · '+(ep.position||'—');
    document.getElementById('profileTop').innerHTML=seedFace(ep)+seedTeamLogo(ep);
    document.getElementById('injuryStatus').innerHTML='';
    document.getElementById('playerNotes').textContent='No notes provided.';
    modal.classList.add('open');
    document.body.style.overflow='hidden';
    prepareUnified(ep.name,ep);
  }catch(e){}
}
window.openUnifiedPlayerProfileByName=openByName;
window.profile=function(id){
  activeSeed=null;
  const p=playerById(id);
  baseProfile(id);
  if(p)prepareUnified(p.name);
};

ensureUi();
})();