(()=>{
'use strict';

const nav=document.querySelector('.positions');
const main=document.querySelector('main');
if(!nav||!main||document.getElementById('tradeSection'))return;

const TEAM_SLUGS={ARI:'ari',ATL:'atl',BAL:'bal',BUF:'buf',CAR:'car',CHI:'chi',CIN:'cin',CLE:'cle',DAL:'dal',DEN:'den',DET:'det',GNB:'gb',GB:'gb',HOU:'hou',IND:'ind',JAX:'jax',KAN:'kc',KC:'kc',LAC:'lac',LAR:'lar',LVR:'lv',LV:'lv',MIA:'mia',MIN:'min',NWE:'ne',NE:'ne',NOR:'no',NO:'no',NYG:'nyg',NYJ:'nyj',PHI:'phi',PIT:'pit',SEA:'sea',SFO:'sf',SF:'sf',TAM:'tb',TB:'tb',TEN:'ten',WAS:'wsh',WSH:'wsh'};
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const state={left:[],right:[]};
let tradeMode='PRESEASON',tradePlayers=[],preseasonPlayers=[],rosPlayers=[];

const style=document.createElement('style');
style.id='tradeCalculatorStyles';
style.textContent=`
#tradeSection{margin-top:8px}
.trade-shell{display:grid;gap:10px}
.trade-note{color:var(--m);font-size:.72rem;margin:0 0 2px}
.trade-mode-toggle{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 2px}.trade-mode-btn{border:1px solid var(--l);background:transparent;color:var(--m);border-radius:8px;padding:8px 12px;font-weight:900}.trade-mode-btn.active{background:#183d63!important;color:#fff!important}
.trade-sides{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start}
.trade-side{border:1px solid var(--l);border-radius:12px;background:#091c30e8;overflow:visible;min-width:0}
.trade-side-head{display:flex;justify-content:space-between;align-items:center;padding:10px 11px;border-bottom:1px solid var(--l)}
.trade-side-head h3{margin:0;font-size:.88rem}
.trade-total{font-size:.72rem;color:var(--m);font-weight:900}
.trade-search-wrap{position:relative;padding:8px}
.trade-search{width:100%;height:40px;border:1px solid #ffffff25;border-radius:9px;background:#0b2139;color:#fff;padding:0 10px;outline:none}
.trade-results{position:absolute;left:8px;right:8px;top:51px;z-index:30;background:#081a2d;border:1px solid #ffffff25;border-radius:9px;overflow:hidden;max-height:260px;overflow-y:auto;display:none;box-shadow:0 12px 30px #0008}
.trade-result{display:flex;width:100%;align-items:center;justify-content:space-between;gap:8px;border:0;border-top:1px solid #ffffff12;background:#081a2d;color:#fff;padding:8px 10px;text-align:left}
.trade-result:first-child{border-top:0}
.trade-result-name{font-weight:900;font-size:.76rem;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.trade-result-meta{color:#8296aa;font-size:.62rem;white-space:nowrap}
.trade-list{display:grid;gap:4px;padding:0 8px 8px}
.trade-player{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:center;min-height:42px;padding:5px 6px;border:1px solid #ffffff14;border-radius:8px;background:#081a2d}
.trade-player-main{min-width:0}
.trade-player-name{display:flex;align-items:center;gap:5px;font-weight:900;font-size:.74rem;min-width:0}
.trade-player-name span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.trade-team-logo{width:18px;height:18px;object-fit:contain;flex:0 0 18px}
.trade-player-meta{margin-top:2px;color:#7e92a8;font-size:.58rem}
.trade-value{font-weight:950;font-size:.76rem;white-space:nowrap}
.trade-remove{width:28px;height:28px;border:1px solid #ffffff20;border-radius:7px;background:transparent;color:#91a4ba;font-weight:950;padding:0}
.trade-empty{padding:14px 8px;color:#6f849a;font-size:.68rem;text-align:center}
.trade-result-card{border:1px solid var(--l);border-radius:12px;background:#07182a;padding:12px;text-align:center}
.trade-verdict{font-size:1.05rem;font-weight:950}
.trade-edge{margin-top:3px;color:var(--m);font-size:.68rem}
.trade-meter{height:8px;border-radius:999px;background:#0b2139;overflow:hidden;margin:9px auto 0;max-width:520px;display:flex}
.trade-meter-left,.trade-meter-right{height:100%;transition:width .15s ease}
.trade-meter-left{background:var(--g)}
.trade-meter-right{background:#53a6cf}
.trade-actions{display:flex;justify-content:center;gap:7px}
.trade-clear{border:1px solid var(--l);background:transparent;color:var(--m);border-radius:8px;padding:7px 10px;font-weight:900}
@media(max-width:700px){
  .trade-sides{grid-template-columns:1fr}
  .trade-player{grid-template-columns:minmax(0,1fr) auto auto}
}
`;
document.head.appendChild(style);

const section=document.createElement('section');
section.id='tradeSection';
section.hidden=true;
section.innerHTML=
  '<div class="trade-shell">'+
    '<div class="trade-mode-toggle"><button type="button" class="trade-mode-btn active" data-trade-mode="PRESEASON">Pre Season</button><button type="button" class="trade-mode-btn" data-trade-mode="ROS">ROS</button></div>'+
    '<p id="tradeNote" class="trade-note">Pre Season values use your Big Board overall rankings.</p>'+
    '<div class="trade-sides">'+
      sideHtml('left','Your Side')+
      sideHtml('right','Their Side')+
    '</div>'+
    '<div class="trade-result-card">'+
      '<div id="tradeVerdict" class="trade-verdict">Add players to both sides</div>'+
      '<div id="tradeEdge" class="trade-edge">Trade values are calculated directly from your overall ranks.</div>'+
      '<div class="trade-meter"><div id="tradeMeterLeft" class="trade-meter-left" style="width:50%"></div><div id="tradeMeterRight" class="trade-meter-right" style="width:50%"></div></div>'+
    '</div>'+
    '<div class="trade-actions"><button type="button" id="tradeClear" class="trade-clear">Clear Trade</button></div>'+
  '</div>';
const depth=document.getElementById('depthSection');
if(depth&&depth.parentNode===main)main.insertBefore(section,depth.nextSibling);else main.appendChild(section);

function sideHtml(side,label){
  return '<div class="trade-side">'+
    '<div class="trade-side-head"><h3>'+label+'</h3><span id="tradeTotal-'+side+'" class="trade-total">0.0</span></div>'+
    '<div class="trade-search-wrap">'+
      '<input id="tradeSearch-'+side+'" class="trade-search" type="search" autocomplete="off" placeholder="Add a player…">'+
      '<div id="tradeResults-'+side+'" class="trade-results"></div>'+
    '</div>'+
    '<div id="tradeList-'+side+'" class="trade-list"></div>'+
  '</div>';
}

function playerValue(rank){
  return Math.max(.1,100*Math.exp(-0.02*(rank-1)));
}
function activeModeLabel(){return tradeMode==='ROS'?'ROS':'Pre Season'}
function syncSelectedToMode(){
  const byName=new Map(tradePlayers.map(p=>[norm(p.name),p]));
  ['left','right'].forEach(side=>{
    state[side]=state[side].map(p=>byName.get(norm(p.name))).filter(Boolean);
  });
}
function setTradeMode(mode){
  tradeMode=mode==='ROS'?'ROS':'PRESEASON';
  tradePlayers=tradeMode==='ROS'?rosPlayers:preseasonPlayers;
  document.querySelectorAll('[data-trade-mode]').forEach(b=>b.classList.toggle('active',b.dataset.tradeMode===tradeMode));
  const note=document.getElementById('tradeNote');
  if(note)note.textContent=tradeMode==='ROS'
    ?'ROS values use your ROS position rankings while keeping the cross-position value scale from your Pre Season Big Board.'
    :'Pre Season values use your Big Board overall rankings.';
  syncSelectedToMode();
  renderSide('left');renderSide('right');
  ['left','right'].forEach(side=>showMatches(side));
}
function teamLogo(team){
  const slug=TEAM_SLUGS[team];
  return slug?'<img class="trade-team-logo" src="https://a.espncdn.com/i/teamlogos/nfl/500/'+slug+'.png" alt="">':'';
}
function allSelected(){
  return new Set(state.left.concat(state.right).map(p=>norm(p.name)));
}
function sum(side){
  return state[side].reduce((n,p)=>n+p.value,0);
}
function renderSide(side){
  const list=document.getElementById('tradeList-'+side);
  const total=sum(side);
  document.getElementById('tradeTotal-'+side).textContent='Value '+total.toFixed(1);
  if(!state[side].length){
    list.innerHTML='<div class="trade-empty">No players added</div>';
  }else{
    list.innerHTML=state[side].map(p=>
      '<div class="trade-player">'+
        '<div class="trade-player-main">'+
          '<div class="trade-player-name"><span>'+p.name+'</span>'+teamLogo(p.team)+'</div>'+
          '<div class="trade-player-meta">'+(tradeMode==='ROS'?'ROS '+p.position+' #'+p.positionRank:'Pre Season #'+p.rank+' overall')+(p.team&&p.team!=='—'?' · '+p.team:'')+'</div>'+
        '</div>'+
        '<div class="trade-value">'+p.value.toFixed(1)+'</div>'+
        '<button type="button" class="trade-remove" data-remove="'+side+'" data-name="'+encodeURIComponent(p.name)+'" aria-label="Remove '+p.name+'">×</button>'+
      '</div>'
    ).join('');
  }
  updateVerdict();
}
function updateVerdict(){
  const a=sum('left'),b=sum('right');
  const verdict=document.getElementById('tradeVerdict');
  const edge=document.getElementById('tradeEdge');
  const ml=document.getElementById('tradeMeterLeft');
  const mr=document.getElementById('tradeMeterRight');
  const total=a+b;
  const lp=total?a/total*100:50;
  ml.style.width=lp+'%';mr.style.width=(100-lp)+'%';
  if(!state.left.length||!state.right.length){
    verdict.textContent='Add players to both sides';
    edge.textContent=tradeMode==='ROS'?'Trade values are calculated from your ROS ranks.':'Trade values are calculated from your Pre Season Big Board ranks.';
    return;
  }
  const diff=Math.abs(a-b);
  const pct=(diff/Math.max(a,b))*100;
  if(pct<=5){
    verdict.textContent='EVEN TRADE';
    edge.textContent='Only '+pct.toFixed(1)+'% separates the two sides.';
  }else if(a>b){
    verdict.textContent='YOUR SIDE WINS';
    edge.textContent='Your side has a '+pct.toFixed(1)+'% rank-value edge.';
  }else{
    verdict.textContent='THEIR SIDE WINS';
    edge.textContent='Their side has a '+pct.toFixed(1)+'% rank-value edge.';
  }
}
function addPlayer(side,name){
  const p=tradePlayers.find(x=>norm(x.name)===norm(name));
  if(!p||allSelected().has(norm(p.name)))return;
  state[side].push(p);
  const input=document.getElementById('tradeSearch-'+side);
  const results=document.getElementById('tradeResults-'+side);
  input.value='';results.style.display='none';results.innerHTML='';
  renderSide(side);renderSide(side==='left'?'right':'left');
}
function showMatches(side){
  const input=document.getElementById('tradeSearch-'+side);
  const results=document.getElementById('tradeResults-'+side);
  const q=norm(input.value);
  if(!q){results.innerHTML='';results.style.display='none';return;}
  const taken=allSelected();
  const matches=tradePlayers.filter(p=>!taken.has(norm(p.name))&&norm(p.name).includes(q)).slice(0,10);
  if(!matches.length){
    results.innerHTML='<div class="trade-empty">No players found</div>';
    results.style.display='block';
    return;
  }
  results.innerHTML=matches.map(p=>
    '<button type="button" class="trade-result" data-add="'+side+'" data-name="'+encodeURIComponent(p.name)+'">'+
      '<span class="trade-result-name">'+p.name+'</span>'+
      '<span class="trade-result-meta">'+(tradeMode==='ROS'?p.position+' #'+p.positionRank:'Overall #'+p.rank)+' · '+p.value.toFixed(1)+'</span>'+
    '</button>'
  ).join('');
  results.style.display='block';
}
function showTrade(){
  try{position='TRADE'}catch(e){}
  document.body.classList.remove('fantasy-home-mode','mobile-menu-open');
  document.querySelectorAll('.positions .pos').forEach(b=>b.classList.toggle('active',b.dataset.pos==='TRADE'));
  const tagged=document.getElementById('taggedControls');if(tagged)tagged.classList.remove('open');
  document.getElementById('teamControls').hidden=true;
  document.getElementById('overallToggle').hidden=true;
  const positionToggle=document.getElementById('positionToggle');if(positionToggle)positionToggle.hidden=true;
  document.getElementById('board').hidden=true;
  document.getElementById('tableCard').hidden=true;
  document.getElementById('mockSection').hidden=true;
  document.getElementById('depthSection').hidden=true;
  section.hidden=false;
  document.getElementById('title').textContent='Trade Calculator';
  document.getElementById('sub').textContent='Powered by your Big Board';
}
function hideTrade(){
  section.hidden=true;
}

const button=document.createElement('button');
button.className='pos trade-btn';
button.dataset.pos='TRADE';
button.textContent='Trade Calculator';
const depthBtn=nav.querySelector('[data-pos="DEPTH"]');
if(depthBtn)depthBtn.insertAdjacentElement('afterend',button);else nav.appendChild(button);
button.onclick=e=>{e.preventDefault();showTrade()};

document.addEventListener('click',e=>{
  const modeBtn=e.target.closest('[data-trade-mode]');if(modeBtn){setTradeMode(modeBtn.dataset.tradeMode);return;}
  const navBtn=e.target.closest('.positions .pos');
  if(navBtn&&navBtn.dataset.pos!=='TRADE')hideTrade();
  const add=e.target.closest('[data-add]');
  if(add)addPlayer(add.dataset.add,decodeURIComponent(add.dataset.name));
  const rem=e.target.closest('[data-remove]');
  if(rem){
    const side=rem.dataset.remove,name=decodeURIComponent(rem.dataset.name);
    state[side]=state[side].filter(p=>norm(p.name)!==norm(name));
    renderSide(side);renderSide(side==='left'?'right':'left');
  }
});

['left','right'].forEach(side=>{
  const input=document.getElementById('tradeSearch-'+side);
  input.addEventListener('input',()=>showMatches(side));
  input.addEventListener('keydown',e=>{
    if(e.key==='Enter'){
      e.preventDefault();
      const first=document.querySelector('#tradeResults-'+side+' [data-add]');
      if(first)addPlayer(side,decodeURIComponent(first.dataset.name));
    }
  });
  input.addEventListener('focus',()=>showMatches(side));
});

document.getElementById('tradeClear').onclick=()=>{
  state.left=[];state.right=[];
  renderSide('left');renderSide('right');
};

Promise.all([
  fetch('big-board.json',{cache:'no-store'}).then(r=>r.json()),
  fetch('qb-rankings.json',{cache:'no-store'}).then(r=>r.json()),
  fetch('rb-rankings.json',{cache:'no-store'}).then(r=>r.json()),
  fetch('wr-rankings.json',{cache:'no-store'}).then(r=>r.json()),
  fetch('te-rankings.json',{cache:'no-store'}).then(r=>r.json()),
  fetch('ros-rankings.json',{cache:'no-store'}).then(r=>r.json())
]).then(data=>{
  const big=data[0],ros=data[5],meta=new Map(),positionLists={QB:[],RB:[],WR:[],TE:[]};
  ['QB','RB','WR','TE'].forEach((pos,i)=>{
    (data[i+1].players||[]).forEach(p=>{
      const k=norm(p.name);
      if(!meta.has(k))meta.set(k,{team:p.team||'—',position:pos});
      positionLists[pos].push(p);
    });
  });

  const overallRank=new Map();
  (big.players||[]).forEach((name,i)=>{if(!overallRank.has(norm(name)))overallRank.set(norm(name),i+1)});

  // Pre Season: exact current Big Board order/value scale.
  const seen=new Set();
  preseasonPlayers=(big.players||[]).map((name,i)=>{
    const k=norm(name);
    if(seen.has(k))return null;
    seen.add(k);
    const x=meta.get(k)||{team:'—',position:'—'};
    const posList=positionLists[x.position]||[];
    const posIndex=posList.findIndex(p=>norm(p.name)===k);
    return {name,rank:i+1,positionRank:posIndex>=0?posIndex+1:null,team:x.team,position:x.position,value:playerValue(i+1)};
  }).filter(Boolean);

  // ROS: move each player into the value slot belonging to that ROS positional rank.
  // This preserves your Big Board's cross-position weighting while applying your new ROS order.
  const aliases={chigokonkwo:'chigoziemokonkwo'};
  const metaByName=new Map(meta);
  rosPlayers=[];
  ['QB','RB','WR','TE'].forEach(pos=>{
    const preSlots=(positionLists[pos]||[]).map((p,idx)=>{
      const rank=overallRank.get(norm(p.name));
      return {positionRank:idx+1,overallRank:rank||999,value:playerValue(rank||999)};
    });
    (ros[pos]||[]).forEach(r=>{
      const key=aliases[norm(r.name)]||norm(r.name);
      const info=metaByName.get(key)||{team:'—',position:pos};
      const slot=preSlots[Math.max(0,+r.rank-1)]||preSlots[preSlots.length-1]||{overallRank:999,value:playerValue(999)};
      rosPlayers.push({
        name:r.name,
        rank:slot.overallRank,
        positionRank:+r.rank,
        team:info.team,
        position:pos,
        value:slot.value
      });
    });
  });

  setTradeMode('PRESEASON');
}).catch(()=>{
  document.getElementById('tradeVerdict').textContent='Could not load rankings';
  document.getElementById('tradeEdge').textContent='Refresh the page and try again.';
});

})();