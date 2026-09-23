(()=>{
'use strict';

if(typeof profile!=='function'||!document.getElementById('modal'))return;

const baseProfile=profile;
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const ROS_ALIASES={chigoziemokonkwo:'chigokonkwo',chigokonkwo:'chigoziemokonkwo'};

const style=document.createElement('style');
style.id='unifiedProfileStyles';
style.textContent=`
.unified-profile-tabs{display:flex;gap:5px;overflow-x:auto;padding:9px 0 7px;margin-top:8px;border-bottom:1px solid #ffffff18;-webkit-overflow-scrolling:touch}
.unified-profile-tab{flex:0 0 auto;border:1px solid #ffffff1b;background:#081a2d;color:#8da1b6;border-radius:8px;padding:7px 9px;font-size:.62rem;font-weight:950}
.unified-profile-tab.active{background:#183d63;color:#fff;border-color:#ffffff32}
.unified-profile-panel{padding-top:10px}
.unified-profile-panel[hidden]{display:none!important}
.unified-rank-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
.unified-rank-card{border:1px solid #ffffff15;background:#081a2d;border-radius:9px;padding:9px;min-width:0}
.unified-rank-card span,.unified-stat-item span{display:block;color:#7f93aa;font-size:.57rem;font-weight:800}
.unified-rank-card b{display:block;margin-top:3px;font-size:1rem}
.unified-stat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:7px}
.unified-stat-item{border:1px solid #ffffff12;background:#07182a;border-radius:8px;padding:7px}
.unified-stat-item b{display:block;margin-top:2px;font-size:.76rem}
.unified-rank-note{margin-top:8px;color:#8093a7;font-size:.62rem;line-height:1.4}
.unified-profile-loading{padding:14px 4px;color:#7f93aa;font-size:.66rem}
#unifiedNotesPanel .note-box{margin-top:0}
#espnProfileGameLogWrap{display:none!important}
@media(max-width:700px){
  .unified-profile-tabs{gap:4px;padding-bottom:6px}
  .unified-profile-tab{padding:7px 8px;font-size:.58rem}
  .unified-rank-grid{grid-template-columns:repeat(3,minmax(86px,1fr));overflow-x:auto}
  .unified-stat-grid{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px}
  .unified-stat-item{flex:0 0 92px}
}
`;
document.head.appendChild(style);

function playerByName(name){
  const n=norm(name);
  try{
    return players.find(p=>norm(p.name)===n)||board.find(p=>norm(p.name)===n)||null;
  }catch(e){return null}
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
function rankMovement(pre,ros){
  if(!pre||!ros)return '—';
  const d=pre-ros;
  if(d>0)return '↑'+d;
  if(d<0)return '↓'+Math.abs(d);
  return '—';
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
    ['ros','ROS'],
    ['preseason','Preseason'],
    ['espn','ESPN'],
    ['gamelog','Game Log'],
    ['notes','Notes']
  ].map(([k,l])=>'<button type="button" class="unified-profile-tab" data-profile-tab="'+k+'">'+l+'</button>').join('');

  const panels=document.createElement('div');
  panels.id='unifiedProfilePanels';
  panels.innerHTML=
    '<div id="unifiedOverviewPanel" class="unified-profile-panel" data-profile-panel="overview"></div>'+
    '<div id="unifiedRosPanel" class="unified-profile-panel" data-profile-panel="ros" hidden></div>'+
    '<div id="unifiedPreseasonPanel" class="unified-profile-panel" data-profile-panel="preseason" hidden></div>'+
    '<div id="unifiedEspnPanel" class="unified-profile-panel" data-profile-panel="espn" hidden></div>'+
    '<div id="unifiedGameLogPanel" class="unified-profile-panel" data-profile-panel="gamelog" hidden></div>'+
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
  if(key==='espn')loadEspn(name);
  if(key==='gamelog')loadGameLog(name);
}
function renderRankPanels(name){
  const p=playerByName(name)||basePositionPlayer(name);
  const pos=p?.position||'—';
  const pre=preseasonRank(name);
  const ros=rosRank(name,pos);
  const ov=overallRank(name);
  const move=rankMovement(pre,ros);

  const rosPanel=document.getElementById('unifiedRosPanel');
  const prePanel=document.getElementById('unifiedPreseasonPanel');

  rosPanel.innerHTML=
    '<div class="unified-rank-grid">'+
      '<div class="unified-rank-card"><span>ROS '+pos+' Rank</span><b>'+(ros?'#'+ros:'—')+'</b></div>'+
      '<div class="unified-rank-card"><span>Preseason '+pos+'</span><b>'+(pre?'#'+pre:'—')+'</b></div>'+
      '<div class="unified-rank-card"><span>Movement</span><b>'+move+'</b></div>'+
    '</div>'+
    '<div class="unified-rank-note">ROS is pulled from your current ROS rankings file. Movement compares ROS position rank with your preseason position rank.</div>';

  prePanel.innerHTML=
    '<div class="unified-rank-grid">'+
      '<div class="unified-rank-card"><span>Preseason '+pos+' Rank</span><b>'+(pre?'#'+pre:'—')+'</b></div>'+
      '<div class="unified-rank-card"><span>Overall Big Board</span><b>'+(ov?'#'+ov:'—')+'</b></div>'+
      '<div class="unified-rank-card"><span>ROS '+pos+' Rank</span><b>'+(ros?'#'+ros:'—')+'</b></div>'+
    '</div>'+
    '<div class="unified-rank-note">Preseason rankings remain tied to your original positional rankings and Big Board.</div>';
}
async function loadEspn(name){
  const panel=document.getElementById('unifiedEspnPanel');
  if(!panel||panel.dataset.loadedFor===norm(name))return;
  panel.dataset.loadedFor=norm(name);
  panel.innerHTML='<div class="unified-profile-loading">Loading ESPN live data…</div>';
  if(window.ShuaEspnLive?.renderPlayerStats)await window.ShuaEspnLive.renderPlayerStats(name,panel);
  else panel.innerHTML='<div class="unified-profile-loading">ESPN live data is unavailable right now.</div>';
}
async function loadGameLog(name){
  const panel=document.getElementById('unifiedGameLogPanel');
  if(!panel)return;
  if(panel.dataset.loadedFor===norm(name)&&panel.dataset.ready==='1')return;
  panel.dataset.loadedFor=norm(name);
  panel.dataset.ready='0';
  panel.innerHTML='<div class="unified-profile-loading">Loading game log…</div>';
  if(window.ShuaEspnLive?.renderGameLog){
    await window.ShuaEspnLive.renderGameLog(name,panel);
    panel.dataset.ready='1';
  }else{
    panel.innerHTML='<div class="unified-profile-loading">Game log is unavailable right now.</div>';
  }
}
function prepareUnified(name){
  ensureUi();
  const modal=document.getElementById('modal');
  modal.dataset.unifiedName=name;
  renderRankPanels(name);
  const ep=document.getElementById('unifiedEspnPanel');
  const gp=document.getElementById('unifiedGameLogPanel');
  if(ep){ep.dataset.loadedFor='';ep.innerHTML=''}
  if(gp){gp.dataset.loadedFor='';gp.dataset.ready='0';gp.innerHTML=''}
  activateTab('overview');
}
async function openByName(name){
  let p=playerByName(name);
  if(p){
    baseProfile(p.id);
    prepareUnified(p.name);
    return;
  }
  try{
    if(window.ShuaEspnLive?.ensureData)await window.ShuaEspnLive.ensureData();
    const ep=window.ShuaEspnLive?.getPlayerByName?.(name);
    if(!ep)return;
    const modal=document.getElementById('modal');
    document.getElementById('pn').textContent=ep.name;
    document.getElementById('pn').className='';
    document.getElementById('pm').textContent=ep.team+' · '+ep.position;
    document.getElementById('profileTop').innerHTML='';
    document.getElementById('injuryStatus').innerHTML='';
    document.getElementById('stats').innerHTML=
      '<div class="stat"><span>ESPN PPR points</span><b>'+ep.points.toFixed(1)+'</b></div>'+
      '<div class="stat"><span>ESPN PPG</span><b>'+(ep.average===null?'—':ep.average.toFixed(1))+'</b></div>';
    document.getElementById('playerNotes').textContent='No notes provided.';
    modal.classList.add('open');
    document.body.style.overflow='hidden';
    prepareUnified(ep.name);
  }catch(e){}
}

window.openUnifiedPlayerProfileByName=openByName;
window.profile=function(id){
  const p=playerById(id);
  baseProfile(id);
  if(p)prepareUnified(p.name);
};

ensureUi();
})();