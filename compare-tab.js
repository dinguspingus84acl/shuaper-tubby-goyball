(()=>{
'use strict';

const nav=document.querySelector('.positions');
const main=document.querySelector('main');
if(!nav||!main||document.getElementById('compareSection'))return;

const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const TEAM_NAMES={
  ARI:'Cardinals',ATL:'Falcons',BAL:'Ravens',BUF:'Bills',CAR:'Panthers',CHI:'Bears',CIN:'Bengals',CLE:'Browns',
  DAL:'Cowboys',DEN:'Broncos',DET:'Lions',GB:'Packers',GNB:'Packers',HOU:'Texans',IND:'Colts',JAX:'Jaguars',
  KC:'Chiefs',KAN:'Chiefs',LAC:'Chargers',LAR:'Rams',LV:'Raiders',LVR:'Raiders',MIA:'Dolphins',MIN:'Vikings',
  NE:'Patriots',NWE:'Patriots',NO:'Saints',NOR:'Saints',NYG:'Giants',NYJ:'Jets',PHI:'Eagles',PIT:'Steelers',
  SEA:'Seahawks',SF:'49ers',SFO:'49ers',TB:'Buccaneers',TAM:'Buccaneers',TEN:'Titans',WAS:'Commanders',WSH:'Commanders'
};
const TEAM_SLUGS={ARI:'ari',ATL:'atl',BAL:'bal',BUF:'buf',CAR:'car',CHI:'chi',CIN:'cin',CLE:'cle',DAL:'dal',DEN:'den',DET:'det',GB:'gb',GNB:'gb',HOU:'hou',IND:'ind',JAX:'jax',KC:'kc',KAN:'kc',LAC:'lac',LAR:'lar',LV:'lv',LVR:'lv',MIA:'mia',MIN:'min',NE:'ne',NWE:'ne',NO:'no',NOR:'no',NYG:'nyg',NYJ:'nyj',PHI:'phi',PIT:'pit',SEA:'sea',SF:'sf',SFO:'sf',TB:'tb',TAM:'tb',TEN:'ten',WAS:'wsh',WSH:'wsh'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let selected=[null,null];
let renderToken=0;

const style=document.createElement('style');
style.id='compareTabStyles';
style.textContent=`
#compareSection{margin-top:8px}
.compare-shell{display:grid;gap:14px}
.compare-picker-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.compare-picker{position:relative;border:1px solid #ffffff18;border-radius:12px;background:#07182a;padding:12px}
.compare-picker-label{display:block;color:#91a4ba;font-size:.62rem;font-weight:950;text-transform:uppercase;letter-spacing:.07em;margin-bottom:7px}
.compare-search{width:100%;height:44px;border:1px solid #ffffff25;border-radius:9px;background:#0b2139;color:#fff;padding:0 12px;font-size:.88rem;outline:none}
.compare-search:focus{border-color:#68aee4;box-shadow:0 0 0 2px #3d8cff22}
.compare-suggestions{position:absolute;left:12px;right:12px;top:86px;z-index:30;max-height:300px;overflow:auto;border:1px solid #ffffff20;border-radius:9px;background:#061522;box-shadow:0 12px 28px #000a}
.compare-suggestions[hidden]{display:none!important}
.compare-suggestion{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;border:0;border-bottom:1px solid #ffffff10;background:transparent;color:#fff;padding:9px 10px;text-align:left}
.compare-suggestion:last-child{border-bottom:0}
.compare-suggestion:hover{background:#102943}
.compare-suggestion strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.compare-suggestion small{display:block;color:#879bb0;margin-top:3px;font-size:.58rem}
.compare-suggestion-rank{color:#ff6b83;font-size:.7rem;font-weight:1000}
.compare-selected{display:flex;align-items:center;justify-content:space-between;gap:9px;margin-top:9px;padding:8px 9px;border:1px solid #ffffff12;border-radius:9px;background:#081a2d}
.compare-selected[hidden]{display:none!important}
.compare-selected-main{display:flex;align-items:center;gap:8px;min-width:0}
.compare-selected-logo{width:28px;height:28px;object-fit:contain;flex:0 0 28px}
.compare-selected strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.compare-selected small{display:block;color:#91a4ba;font-size:.56rem;margin-top:2px}
.compare-clear{border:0;background:transparent;color:#9fb3c7;font-size:1rem;font-weight:1000;padding:3px 5px}
.compare-status{padding:22px;border:1px dashed #ffffff1d;border-radius:12px;color:#8499ae;text-align:center;font-size:.76rem}
.compare-results{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#ffffff12;border:1px solid #ffffff18;border-radius:14px;overflow:hidden}
.compare-results[hidden]{display:none!important}
.compare-card{min-width:0;background:#061522;padding:15px}
.compare-player{display:flex;align-items:center;gap:11px;padding-bottom:12px;border-bottom:1px solid #ffffff14}
.compare-face{width:68px;height:68px;border-radius:50%;object-fit:cover;background:#17314a;border:2px solid #ffffff35;flex:0 0 68px}
.compare-title{min-width:0}
.compare-title h3{margin:0;font-size:1.05rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.compare-teamline{display:flex;align-items:center;gap:6px;margin-top:6px;color:#91a4ba;font-size:.66rem;font-weight:900}
.compare-teamline img{width:22px;height:22px;object-fit:contain}
.compare-stat-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:11px}
.compare-stat{border:1px solid #ffffff12;border-radius:8px;background:#081a2d;padding:9px}
.compare-stat span{display:block;color:#7f93aa;font-size:.56rem;font-weight:850}
.compare-stat b{display:block;margin-top:4px;font-size:.9rem}
.compare-recent{margin-top:12px}
.compare-recent>span{display:block;color:#7f93aa;font-size:.57rem;font-weight:950;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
.compare-games{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}
.compare-game{border:1px solid #ffffff12;border-radius:7px;background:#07182a;padding:6px 4px;text-align:center;min-width:0}
.compare-game small{display:block;color:#7f93aa;font-size:.48rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.compare-game b{display:block;margin-top:3px;font-size:.72rem}
@media(max-width:700px){
  .compare-picker-grid{grid-template-columns:1fr;gap:9px}
  .compare-picker{padding:9px}
  .compare-suggestions{left:9px;right:9px;top:81px}
  .compare-results{grid-template-columns:1fr 1fr}
  .compare-card{padding:8px}
  .compare-player{gap:6px}
  .compare-face{width:44px;height:44px;flex-basis:44px}
  .compare-title h3{font-size:.75rem}
  .compare-teamline{font-size:.5rem}
  .compare-teamline img{width:16px;height:16px}
  .compare-stat-grid{grid-template-columns:1fr;gap:5px}
  .compare-stat{padding:6px}
  .compare-stat span{font-size:.47rem}
  .compare-stat b{font-size:.7rem}
  .compare-games{gap:3px}
  .compare-game{padding:5px 2px}
  .compare-game small{font-size:.4rem}
  .compare-game b{font-size:.57rem}
}
`;
document.head.appendChild(style);

const section=document.createElement('section');
section.id='compareSection';
section.hidden=true;
section.innerHTML=`
  <div class="compare-shell">
    <div class="compare-picker-grid">
      ${[0,1].map(i=>`
        <div class="compare-picker" data-compare-slot="${i}">
          <label class="compare-picker-label" for="compareSearch${i}">Player ${i+1}</label>
          <input id="compareSearch${i}" class="compare-search" type="search" autocomplete="off" placeholder="Search for a player…">
          <div id="compareSuggestions${i}" class="compare-suggestions" hidden></div>
          <div id="compareSelected${i}" class="compare-selected" hidden>
            <div class="compare-selected-main"></div>
            <button type="button" class="compare-clear" data-clear-slot="${i}" aria-label="Clear player">×</button>
          </div>
        </div>
      `).join('')}
    </div>
    <div id="compareStatus" class="compare-status">Search for two players to compare them side by side.</div>
    <div id="compareResults" class="compare-results" hidden></div>
  </div>
`;
const espn=document.getElementById('espnLiveSection');
if(espn&&espn.parentNode===main)espn.insertAdjacentElement('afterend',section);else main.appendChild(section);

const button=document.createElement('button');
button.className='pos compare-tab-btn';
button.dataset.pos='COMPARE';
button.textContent='Compare';
const espnBtn=nav.querySelector('[data-pos="ESPN"]');
if(espnBtn)espnBtn.insertAdjacentElement('afterend',button);else nav.appendChild(button);

function allPlayers(){
  let arr=[];
  try{arr.push(...(board||[]))}catch(e){}
  try{arr.push(...(players||[]))}catch(e){}
  const out=[],seen=new Set();
  arr.forEach(p=>{
    if(!p?.name)return;
    const key=norm(p.name);
    if(seen.has(key))return;
    seen.add(key);
    let overall=null;
    try{
      const i=board.findIndex(x=>norm(x.name)===key);
      if(i>=0)overall=i+1;
    }catch(e){}
    out.push({...p,overallRank:overall});
  });
  return out.sort((a,b)=>(a.overallRank||9999)-(b.overallRank||9999)||String(a.name).localeCompare(String(b.name)));
}
function findPlayer(name){
  const k=norm(name);
  return allPlayers().find(p=>norm(p.name)===k)||null;
}
function teamName(team){return TEAM_NAMES[String(team||'').toUpperCase()]||String(team||'—')}
function teamLogo(team){
  const slug=TEAM_SLUGS[String(team||'').toUpperCase()];
  return slug?'https://a.espncdn.com/i/teamlogos/nfl/500/'+slug+'.png':'';
}
function rosRankFor(p){
  try{
    const list=rosRankings?.[p.position]||[];
    const i=list.findIndex(x=>norm(x.name)===norm(p.name));
    return i>=0?Number(list[i].rank||i+1):null;
  }catch(e){return null}
}
function localSnapshot(p){
  let overall=p.overallRank||null;
  if(!overall){
    try{const i=board.findIndex(x=>norm(x.name)===norm(p.name));if(i>=0)overall=i+1}catch(e){}
  }
  return {name:p.name,team:p.team||'—',position:p.position||'—',overall,preseason:Number(p.positionRank)||null,ros:rosRankFor(p)};
}
function rank(v){return Number.isFinite(Number(v))&&Number(v)>0?'#'+Number(v):'—'}
function num(v){return Number.isFinite(Number(v))?Number(v).toFixed(1):'—'}

function renderSuggestions(slot,q){
  const box=document.getElementById('compareSuggestions'+slot);
  const key=norm(q);
  if(!key){box.hidden=true;box.innerHTML='';return}
  const other=selected[slot===0?1:0];
  const list=allPlayers().filter(p=>norm(p.name).includes(key)&&(!other||norm(p.name)!==norm(other.name))).slice(0,10);
  if(!list.length){box.innerHTML='<div class="compare-suggestion"><div><strong>No players found</strong></div></div>';box.hidden=false;return}
  box.innerHTML=list.map(p=>'<button type="button" class="compare-suggestion" data-pick-slot="'+slot+'" data-player-name="'+esc(p.name)+'"><span><strong>'+esc(p.name)+'</strong><small>'+esc(p.position)+' · '+esc(p.team||'—')+'</small></span><span class="compare-suggestion-rank">'+(p.overallRank?'#'+p.overallRank:'')+'</span></button>').join('');
  box.hidden=false;
  box.querySelectorAll('[data-player-name]').forEach(b=>b.onclick=()=>choose(slot,b.dataset.playerName));
}
function choose(slot,name){
  const p=findPlayer(name);if(!p)return;
  const other=selected[slot===0?1:0];
  if(other&&norm(other.name)===norm(p.name))return;
  selected[slot]=p;
  const input=document.getElementById('compareSearch'+slot);if(input)input.value=p.name;
  document.getElementById('compareSuggestions'+slot).hidden=true;
  renderSelected(slot);
  renderCompare();
}
function renderSelected(slot){
  const box=document.getElementById('compareSelected'+slot),p=selected[slot];
  if(!p){box.hidden=true;box.querySelector('.compare-selected-main').innerHTML='';return}
  const logo=teamLogo(p.team);
  box.hidden=false;
  box.querySelector('.compare-selected-main').innerHTML=(logo?'<img class="compare-selected-logo" src="'+logo+'" alt="">':'')+'<span><strong>'+esc(p.name)+'</strong><small>'+esc(p.position)+' · '+esc(teamName(p.team))+'</small></span>';
}
function recentHtml(recent){
  if(!recent?.length)return '<div class="compare-game"><small>Recent</small><b>—</b></div>';
  return recent.slice(-5).map(g=>'<div class="compare-game"><small>W'+esc(g.week)+(g.opponent?' · '+esc(g.opponent):'')+'</small><b>'+num(g.points)+'</b></div>').join('');
}
function cardHtml(local,live){
  const logo=live?.teamLogo||teamLogo(local.team);
  const face=live?.headshot||'';
  const latest=live?.latestFinish;
  return '<article class="compare-card">'+
    '<div class="compare-player">'+
      (face?'<img class="compare-face" src="'+face+'" alt="">':'<div class="compare-face"></div>')+
      '<div class="compare-title"><h3>'+esc(local.name)+'</h3><div class="compare-teamline">'+(logo?'<img src="'+logo+'" alt="">':'')+'<span>'+esc(teamName(live?.team||local.team))+' · '+esc(local.position)+'</span></div></div>'+
    '</div>'+
    '<div class="compare-stat-grid">'+
      '<div class="compare-stat"><span>Overall Rank</span><b>'+rank(local.overall)+'</b></div>'+
      '<div class="compare-stat"><span>ROS '+esc(local.position)+'</span><b>'+rank(local.ros)+'</b></div>'+
      '<div class="compare-stat"><span>Preseason '+esc(local.position)+'</span><b>'+rank(local.preseason)+'</b></div>'+
      '<div class="compare-stat"><span>ESPN '+esc(local.position)+'</span><b>'+rank(live?.espnRank)+'</b></div>'+
      '<div class="compare-stat"><span>2026 PPG</span><b>'+num(live?.ppg)+'</b></div>'+
      '<div class="compare-stat"><span>2026 PPR</span><b>'+num(live?.points)+'</b></div>'+
      '<div class="compare-stat"><span>Latest Finish</span><b>'+(latest?esc(latest.year)+' '+esc(latest.position)+rank(latest.rank):'—')+'</b></div>'+
      '<div class="compare-stat"><span>Latest Finish PPG</span><b>'+num(latest?.ppg)+'</b></div>'+
    '</div>'+
    '<div class="compare-recent"><span>Last 5 Games</span><div class="compare-games">'+recentHtml(live?.recent)+'</div></div>'+
  '</article>';
}
async function renderCompare(){
  const result=document.getElementById('compareResults'),status=document.getElementById('compareStatus');
  if(!selected[0]||!selected[1]){
    result.hidden=true;result.innerHTML='';status.hidden=false;status.textContent='Search for two players to compare them side by side.';return;
  }
  const token=++renderToken;
  status.hidden=false;status.textContent='Loading comparison…';result.hidden=true;
  const locals=selected.map(localSnapshot);
  const live=await Promise.all(selected.map(p=>window.ShuaEspnLive?.getComparisonSnapshot?window.ShuaEspnLive.getComparisonSnapshot(p.name):Promise.resolve({})));
  if(token!==renderToken)return;
  result.innerHTML=cardHtml(locals[0],live[0])+cardHtml(locals[1],live[1]);
  result.hidden=false;status.hidden=true;
}
function showCompare(){
  try{position='COMPARE'}catch(e){}
  document.body.classList.remove('fantasy-home-mode','mobile-menu-open');
  document.querySelectorAll('.positions .pos').forEach(b=>b.classList.toggle('active',b.dataset.pos==='COMPARE'));
  const tagged=document.getElementById('taggedControls');if(tagged)tagged.classList.remove('open');
  ['teamControls','overallToggle','positionToggle','board','tableCard','mockSection','depthSection','tradeSection','espnLiveSection'].forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=true});
  section.hidden=false;
  const title=document.getElementById('title');if(title)title.textContent='Compare Players';
  const sub=document.getElementById('sub');if(sub)sub.textContent='Search for two players and compare them side by side.';
  renderCompare();
}
function hideCompare(){section.hidden=true}

button.onclick=e=>{e.preventDefault();showCompare()};
[0,1].forEach(slot=>{
  const input=document.getElementById('compareSearch'+slot);
  input.addEventListener('input',()=>renderSuggestions(slot,input.value));
  input.addEventListener('focus',()=>{if(input.value&&!selected[slot])renderSuggestions(slot,input.value)});
  input.addEventListener('keydown',e=>{
    if(e.key==='Escape')document.getElementById('compareSuggestions'+slot).hidden=true;
    if(e.key==='Enter'){
      const first=document.getElementById('compareSuggestions'+slot).querySelector('[data-player-name]');
      if(first){e.preventDefault();choose(slot,first.dataset.playerName)}
    }
  });
  document.querySelector('[data-clear-slot="'+slot+'"]').onclick=()=>{
    selected[slot]=null;
    input.value='';
    document.getElementById('compareSuggestions'+slot).hidden=true;
    renderSelected(slot);
    renderCompare();
  };
});
document.addEventListener('click',e=>{
  const navBtn=e.target.closest('.positions .pos');
  if(navBtn&&navBtn.dataset.pos!=='COMPARE')hideCompare();
  if(!e.target.closest('.compare-picker'))document.querySelectorAll('.compare-suggestions').forEach(x=>x.hidden=true);
});

window.ShuaCompareTab={show:showCompare};
})();
