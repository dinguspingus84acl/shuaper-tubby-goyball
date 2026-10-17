(()=>{
'use strict';

const TEAM_SLUGS={ARI:'ari',ATL:'atl',BAL:'bal',BUF:'buf',CAR:'car',CHI:'chi',CIN:'cin',CLE:'cle',DAL:'dal',DEN:'den',DET:'det',GNB:'gb',GB:'gb',HOU:'hou',IND:'ind',JAX:'jax',KAN:'kc',KC:'kc',LAC:'lac',LAR:'lar',LVR:'lv',LV:'lv',MIA:'mia',MIN:'min',NWE:'ne',NE:'ne',NOR:'no',NO:'no',NYG:'nyg',NYJ:'nyj',PHI:'phi',PIT:'pit',SEA:'sea',SFO:'sf',SF:'sf',TAM:'tb',TB:'tb',TEN:'ten',WAS:'wsh',WSH:'wsh'};
const TEAM_FULL_NAMES={ARI:'Arizona Cardinals',ATL:'Atlanta Falcons',BAL:'Baltimore Ravens',BUF:'Buffalo Bills',CAR:'Carolina Panthers',CHI:'Chicago Bears',CIN:'Cincinnati Bengals',CLE:'Cleveland Browns',DAL:'Dallas Cowboys',DEN:'Denver Broncos',DET:'Detroit Lions',GB:'Green Bay Packers',GNB:'Green Bay Packers',HOU:'Houston Texans',IND:'Indianapolis Colts',JAX:'Jacksonville Jaguars',KC:'Kansas City Chiefs',KAN:'Kansas City Chiefs',LAC:'Los Angeles Chargers',LAR:'Los Angeles Rams',LV:'Las Vegas Raiders',LVR:'Las Vegas Raiders',MIA:'Miami Dolphins',MIN:'Minnesota Vikings',NE:'New England Patriots',NWE:'New England Patriots',NO:'New Orleans Saints',NOR:'New Orleans Saints',NYG:'New York Giants',NYJ:'New York Jets',PHI:'Philadelphia Eagles',PIT:'Pittsburgh Steelers',SEA:'Seattle Seahawks',SF:'San Francisco 49ers',SFO:'San Francisco 49ers',TB:'Tampa Bay Buccaneers',TAM:'Tampa Bay Buccaneers',TEN:'Tennessee Titans',WAS:'Washington Commanders',WSH:'Washington Commanders'};
const POSITIONS=['QB','RB','WR','TE'];
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const aliases={kennethwalkeriii:'kennethwalker',travisetiennejr:'travisetienne',marvinharrisonjr:'marvinharrison',michaelpittmanjr:'michaelpittman',brianthomasjr:'brianthomas',tyronetracyjr:'tyronetracy',brianrobinsonjr:'brianrobinson',jeramayahlove:'jeremiyahlove',kennethgainwell:'kennygainwell',jaydenblue:'jaydonblue',kcconception:'kcconcepcion',patbyrnat:'patbryant'};
const canon=s=>aliases[norm(s)]||norm(s);
let tags={QB:{draft:[],'do-not-draft':[]},RB:{draft:[],'do-not-draft':[]},WR:{draft:[],'do-not-draft':[]},TE:{draft:[],'do-not-draft':[]}};
let rankPlayers=[];
let currentKind=null;
let currentPos='ALL';
let historicalHeadshots={};
window.ShuaAdvanceFace=window.ShuaAdvanceFace||function(img){
  try{
    const urls=String(img.dataset.faceUrls||'').split('|').map(decodeURIComponent).filter(Boolean);
    let i=Number(img.dataset.faceIndex||0)+1;
    if(i<urls.length){
      img.dataset.faceIndex=String(i);
      img.src=urls[i];
      return;
    }
    const initials=img.dataset.faceInitials||'?';
    const cls=img.dataset.faceFallbackClass||'photo fallback';
    img.outerHTML='<span class="'+cls+'">'+initials+'</span>';
  }catch(e){
    img.style.display='none';
  }
};
function headshotUrls(value){
  if(Array.isArray(value))return [...new Set(value.map(String).map(x=>x.trim()).filter(Boolean))];
  if(value&&typeof value==='object'){
    const arr=Array.isArray(value.urls)?value.urls:Array.isArray(value.headshots)?value.headshots:[value.url||value.headshot||''];
    return [...new Set(arr.map(String).map(x=>x.trim()).filter(Boolean))];
  }
  const s=String(value||'').trim();return s?[s]:[];
}

function addStyles(){
  if(document.getElementById('shuaEnhancementStyles'))return;
  const st=document.createElement('style');
  st.id='shuaEnhancementStyles';
  st.textContent=`
    .tools>.search{display:none!important}
    .phone-mode .positions{display:none!important}
    body.utility-tab-mode #positionToggle{display:none!important}
    .phone-mode #phoneMenuButton{display:flex!important}
    @media(min-width:901px){.search{flex:0 1 285px!important;min-width:180px!important}}
    .home-btn.active{background:linear-gradient(90deg,#b51635,#203fa7)!important;color:#fff!important}
    .myguys-btn{border-color:#35d07f66!important}.myguys-btn.active{background:#145c3d!important;color:#fff!important;border-color:#35d07f!important}
    .dnd-btn{border-color:#ff174466!important}.dnd-btn.active{background:#681b2a!important;color:#fff!important;border-color:#ff1744!important}
    .tagged-controls{display:none;gap:7px;flex-wrap:wrap;margin:12px 0}.tagged-controls.open{display:flex}.tagged-controls button{border:1px solid var(--l);background:transparent;color:var(--m);border-radius:8px;padding:8px 12px;font-weight:900}.tagged-controls button.active{background:#183d63;color:#fff}.tagged-count{margin-left:auto;color:var(--m);align-self:center;font-weight:800}
    .tag-group td{background:transparent!important;color:var(--m)!important;font-weight:950!important;letter-spacing:.08em;padding:9px 14px!important;border-left:0!important}
    .team-abbr{display:inline-flex;align-items:center;gap:7px;font-weight:800;white-space:nowrap}.team-mini-logo{width:22px;height:22px;object-fit:contain;vertical-align:middle;flex:0 0 22px}.team-mini-logo.sm{width:18px;height:18px;flex-basis:18px}
    .tagged-player-copy{display:grid;gap:4px;min-width:0}
    .tagged-player-copy>b{display:block;white-space:normal;overflow:visible;text-overflow:clip;line-height:1.15}
    .tagged-player-team-line{display:flex;align-items:center;gap:6px;min-width:0;color:var(--m);font-size:.62rem;font-weight:850;white-space:normal}
    .tagged-player-team-logo{width:19px;height:19px;object-fit:contain;flex:0 0 19px}
    .tagged-player-team-name{white-space:normal;overflow:visible;text-overflow:clip}
    .phone-mode #tableCard .tagged-player-row td:nth-child(2){overflow:visible!important;text-overflow:clip!important;white-space:normal!important}
    .phone-mode #tableCard .tagged-player-row .tagged-player-copy>b{white-space:normal!important;overflow:visible!important;text-overflow:clip!important}
    .phone-mode #tableCard .tagged-player-row .tagged-player-team-line{font-size:.56rem;white-space:normal!important}
    .phone-mode .tagged-player-team-logo{width:17px;height:17px;flex-basis:17px}

    /* Rankings polish: pinned column labels + persistent selected-player state */
    #tableCard{overflow:visible}
    #tableCard thead th{position:sticky;top:var(--shua-ranking-sticky-top,68px);z-index:18;background:rgba(9,28,48,.98);box-shadow:0 1px 0 var(--l),0 8px 18px rgba(0,0,0,.22);backdrop-filter:blur(8px)}
    #tableCard tbody tr[data-id]{transition:background .16s ease,box-shadow .16s ease,transform .16s ease}
    #tableCard tbody tr[data-id].selected-player-row td{background:linear-gradient(90deg,rgba(53,208,127,.16),rgba(24,61,99,.12))!important}
    #tableCard tbody tr[data-id].selected-player-row td:first-child{box-shadow:inset 4px 0 0 var(--g)}
    #tableCard tbody tr[data-id].selected-player-row{box-shadow:0 0 0 1px rgba(53,208,127,.24),0 8px 24px rgba(0,0,0,.16)}
    .phone-mode #tableCard tbody tr[data-id].selected-player-row{background:linear-gradient(90deg,rgba(53,208,127,.18),rgba(24,61,99,.12))!important;box-shadow:inset 4px 0 0 var(--g),0 0 0 1px rgba(53,208,127,.2)!important}

    /* Desktop row hover */
    body:not(.phone-mode) #tableCard tbody tr[data-id]:not(.selected-player-row){cursor:pointer;transition:transform .14s ease,filter .14s ease,box-shadow .14s ease}
    body:not(.phone-mode) #tableCard tbody tr[data-id]:not(.selected-player-row):hover{transform:translateY(-1px);filter:brightness(1.16);box-shadow:inset 4px 0 0 #5f8fb8,0 5px 16px rgba(0,0,0,.28)}
    body:not(.phone-mode) #tableCard tbody tr[data-id]:not(.selected-player-row):hover td{background:#102943!important}
    body:not(.phone-mode) #tableCard tbody tr[data-id]:not(.selected-player-row):hover .rank{color:#fff!important}
    body:not(.phone-mode) #tableCard tbody tr[data-id]:not(.selected-player-row):hover .photo{transform:scale(1.09);border-color:#ffffffcc}
    body:not(.phone-mode) #tableCard tbody tr[data-id] .photo{transition:transform .14s ease,border-color .14s ease}
    body:not(.phone-mode) #tableCard tbody tr[data-id] td:last-child{position:relative;padding-right:38px}
    body:not(.phone-mode) #tableCard tbody tr[data-id] td:last-child:after{content:"›";position:absolute;right:14px;top:50%;transform:translate(-5px,-50%);font-size:1.35rem;font-weight:1000;color:#9db1c5;opacity:0;transition:opacity .14s ease,transform .14s ease}
    body:not(.phone-mode) #tableCard tbody tr[data-id]:hover td:last-child:after{opacity:1;transform:translate(0,-50%)}

    /* Fast list transitions */
    .shua-list-enter{animation:shuaListEnter .16s ease both}
    @keyframes shuaListEnter{from{opacity:.35;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
    @media(prefers-reduced-motion:reduce){.shua-list-enter{animation:none}}

    /* Back to top for long rankings/stats pages */
    #shuaBackToTop{position:fixed;right:18px;bottom:72px;z-index:95;width:42px;height:42px;border:1px solid #ffffff32;border-radius:999px;background:#081a2df2;color:#fff;font-size:1.15rem;font-weight:1000;box-shadow:0 8px 24px #0008;opacity:0;pointer-events:none;transform:translateY(8px);transition:opacity .16s ease,transform .16s ease}
    #shuaBackToTop.visible{opacity:1;pointer-events:auto;transform:translateY(0)}
    .phone-mode #shuaBackToTop{right:10px;bottom:max(64px,calc(54px + env(safe-area-inset-bottom)))}

    /* Previous / next ranking navigation inside player cards */
    .ranking-player-nav{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:7px;margin:7px 0;padding:0}
    .ranking-player-nav button{min-width:0;min-height:42px;border:1px solid #ffffff20;border-radius:9px;background:#081a2d;color:#fff;padding:7px 10px;font-weight:900;line-height:1.12}
    .ranking-player-nav button:first-child{text-align:left}.ranking-player-nav button:last-child{text-align:right}
    .ranking-player-nav button:not(:disabled):hover{background:#102d49;border-color:#ffffff38}
    .ranking-player-nav button:disabled{opacity:.28;cursor:default}
    .ranking-player-nav .ranking-nav-rank{display:block;color:var(--m);font-size:.57rem;margin-bottom:2px}
    .ranking-player-nav .ranking-nav-name{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.72rem}
    .featured-player-profile>.ranking-player-nav{margin:0;padding:7px 6px;background:#07111de8;border-left:1px solid #ffffff18;border-right:1px solid #ffffff18}
    .phone-mode .featured-player-profile>.ranking-player-nav{width:calc(100% - 16px);margin:0 8px!important;padding:5px!important}
    .phone-mode .ranking-player-nav button{min-height:38px;padding:5px 7px}
    .phone-mode .ranking-player-nav .ranking-nav-name{font-size:.62rem}

    /* Ranking loading skeleton */
    .ranking-skeleton-row td{height:62px;position:relative;overflow:hidden}
    .ranking-skeleton-row td:after,.ranking-skeleton-pick:after{content:"";display:block;height:13px;border-radius:999px;background:linear-gradient(90deg,#ffffff0b,#ffffff22,#ffffff0b);background-size:220% 100%;animation:shuaSkeleton 1.15s ease-in-out infinite}
    .ranking-skeleton-row td:nth-child(1):after{width:34px}.ranking-skeleton-row td:nth-child(2):after{width:min(220px,78%)}.ranking-skeleton-row td:nth-child(3):after{width:48px}.ranking-skeleton-row td:nth-child(4):after{width:52px}.ranking-skeleton-row td:nth-child(5):after{width:60px}.ranking-skeleton-row td:nth-child(6):after{width:min(280px,88%)}
    .ranking-skeleton-pick{min-width:125px;min-height:78px;border-radius:8px;background:#0a2036;border:1px solid #ffffff10;padding:12px;display:flex;align-items:center}
    .ranking-skeleton-pick:after{width:76%;height:14px}
    @keyframes shuaSkeleton{0%{background-position:100% 0}100%{background-position:-120% 0}}
    @media(prefers-reduced-motion:reduce){.ranking-skeleton-row td:after,.ranking-skeleton-pick:after{animation:none}}

    #fantasyHome{display:none;position:fixed;inset:0;z-index:10;background:#010315;align-items:center;justify-content:center;overflow:hidden}
    #fantasyHome img{width:min(88vw,900px);height:min(88vh,900px);object-fit:contain;filter:drop-shadow(0 0 34px rgba(69,39,255,.18))}
    body.fantasy-home-mode #fantasyHome{display:flex}
    body.fantasy-home-mode header,body.fantasy-home-mode main{display:none!important}
    body.fantasy-home-mode .sticky{position:fixed;left:0;right:0;top:0;z-index:30;background:linear-gradient(180deg,rgba(1,3,21,.92),rgba(1,3,21,.28),transparent);border:0}
    body.fantasy-home-mode .tools{justify-content:center}
    body.fantasy-home-mode .search{display:none!important}
    body.fantasy-home-mode .positions{justify-content:center}

    #phoneMenuButton{display:none;position:fixed;top:14px;right:14px;z-index:120;width:48px;height:48px;border:1px solid #ffffff35;border-radius:12px;background:#061322eb;box-shadow:0 8px 24px #0008;align-items:center;justify-content:center;flex-direction:column;gap:5px;padding:0}
    #phoneMenuButton span{display:block;width:23px;height:3px;border-radius:3px;background:#fff}
    #phoneMenuBackdrop{display:none;position:fixed;inset:0;z-index:108;background:rgba(0,0,0,.58);backdrop-filter:blur(2px)}
    #phoneMenuDrawer{position:fixed;top:0;right:0;bottom:0;z-index:110;width:min(82vw,330px);transform:translateX(105%);transition:transform .22s ease;background:linear-gradient(180deg,#07182a,#04101e);border-left:1px solid #ffffff25;box-shadow:-18px 0 40px #0009;padding:78px 16px 24px;overflow-y:auto}
    #phoneMenuDrawer h3{margin:0 0 14px;color:#91a4ba;font-size:.75rem;letter-spacing:.18em;text-transform:uppercase}
    #phoneMenuDrawer button{display:block;width:100%;min-height:48px;margin:0 0 8px;padding:10px 13px;border:1px solid #ffffff25;border-radius:10px;background:#0b2139;color:#fff;text-align:left;font-weight:900}
    #phoneMenuDrawer button.active{background:#183d63;border-color:#ffffff55}
    #phoneMenuSearchWrap{display:block!important;position:relative!important;margin-top:10px;padding-top:12px;border-top:1px solid #ffffff20;min-width:0!important}
    #phoneMenuSearchWrap input{display:block!important;width:100%!important;height:44px!important;border:1px solid #ffffff25!important;border-radius:10px!important;background:#0b2139!important;color:#fff!important;padding:0 11px!important;outline:none!important}
    #phoneMenuSearchWrap .suggestions{position:static!important;left:auto!important;right:auto!important;top:auto!important;margin-top:6px!important;width:100%!important;max-height:320px!important;border-radius:10px!important;background:#081a2d!important;color:#fff!important;overflow:auto!important}
    #phoneMenuSearchWrap .sug{padding:9px 10px!important;border-bottom:1px solid #ffffff12!important;background:#081a2d!important;color:#fff!important}
    #phoneMenuSearchWrap .sug small{color:#7f93aa!important}
    body.fantasy-home-mode #phoneMenuDrawer #phoneMenuSearchWrap{display:block!important}
    #phoneMenuSearchWrap{margin-top:10px;padding-top:12px;border-top:1px solid #ffffff20}
    body.mobile-menu-open #phoneMenuBackdrop{display:block}
    body.mobile-menu-open #phoneMenuDrawer{transform:translateX(0)}

    @media(max-width:650px){
      .tagged-controls.open{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}.tagged-controls button{padding:8px 4px}.tagged-count{grid-column:1/-1;margin-left:0}.tag-group{display:block!important}.tag-group td{display:block!important}
      .phone-mode .positions{display:none!important}
      .phone-mode #phoneMenuButton{display:flex}
      .phone-mode #fantasyHome img{width:96vw;height:88vh}
      .phone-mode #tableCard tbody tr{grid-template-columns:42px minmax(0,1fr) 58px 62px!important}
      .phone-mode #tableCard tbody td:nth-child(4){padding-left:0!important;padding-right:2px!important;transform:translateX(-5px);overflow:visible!important}
      .phone-mode #tableCard .team-abbr{gap:3px!important;font-size:.68rem!important}
      .phone-mode #tableCard .team-mini-logo{width:17px!important;height:17px!important;flex-basis:17px!important}
      .phone-mode.fantasy-home-mode .sticky{height:0;overflow:visible;background:transparent}
      .phone-mode.fantasy-home-mode .tools{display:none!important}
    }
  `;
  document.head.appendChild(st);
}

function logoHtml(team,small=false){
  const slug=TEAM_SLUGS[team];
  return slug?`<span class="team-abbr"><img class="team-mini-logo${small?' sm':''}" src="https://a.espncdn.com/i/teamlogos/nfl/500/${slug}.png" alt=""><span>${team}</span></span>`:`<span class="team-abbr">${team||'—'}</span>`;
}
function taggedTeamIdentity(team,position){
  const slug=TEAM_SLUGS[team];
  const abbr=team||'—';
  const pos=position||'—';
  return '<span class="tagged-player-team-line">'+
    (slug?`<img class="tagged-player-team-logo" src="https://a.espncdn.com/i/teamlogos/nfl/500/${slug}.png" alt="${abbr} logo">`:'')+
    '<span class="tagged-player-team-name">'+abbr+' · '+pos+'</span></span>';
}
function tagSet(pos,key){return new Set((tags[pos]?.[key]||[]).map(canon))}
function isTagged(p,key){
  if(!p||!POSITIONS.includes(p.position))return false;
  const n=canon(p.name),wanted=tagSet(p.position,key),opposite=tagSet(p.position,key==='draft'?'do-not-draft':'draft');
  if(opposite.has(n))return false;
  if(wanted.has(n))return true;
  return p.additionalStats?.tag===key;
}
function idFor(p){return `${p.position.toLowerCase()}-${p.positionRank}-${norm(p.name)}`}
function buildRows(kind){
  const key=kind==='MYGUYS'?'draft':'do-not-draft';
  let arr=rankPlayers.filter(p=>isTagged(p,key));
  if(currentPos!=='ALL')arr=arr.filter(p=>p.position===currentPos);
  arr.sort((a,b)=>POSITIONS.indexOf(a.position)-POSITIONS.indexOf(b.position)||a.positionRank-b.positionRank);
  return arr;
}

function ensureControls(){
  let c=document.getElementById('taggedControls');
  if(c)return c;
  c=document.createElement('div');
  c.id='taggedControls';c.className='tagged-controls';
  c.innerHTML=`<button data-tagpos="ALL" class="active">All</button><button data-tagpos="QB">QB</button><button data-tagpos="RB">RB</button><button data-tagpos="WR">WR</button><button data-tagpos="TE">TE</button><span id="taggedCount" class="tagged-count"></span>`;
  const anchor=document.getElementById('overallToggle');
  (anchor?.parentNode||document.querySelector('main'))?.insertBefore(c,anchor?anchor.nextSibling:null);
  c.querySelectorAll('[data-tagpos]').forEach(b=>b.onclick=()=>{
    currentPos=b.dataset.tagpos;
    c.querySelectorAll('[data-tagpos]').forEach(x=>x.classList.toggle('active',x===b));
    renderTagged();
  });
  return c;
}
function hideTagged(){currentKind=null;const c=document.getElementById('taggedControls');if(c)c.classList.remove('open')}

function ensureHome(){
  if(document.getElementById('fantasyHome'))return;
  const home=document.createElement('section');
  home.id='fantasyHome';
  home.innerHTML='<img src="fantasy-home.svg" alt="Fantasy">';
  document.body.insertBefore(home,document.body.firstChild);
}
function showHome(){
  hideTagged();
  syncUtilityTabMode('HOME');
  document.body.classList.add('fantasy-home-mode');
  document.querySelectorAll('.positions .pos').forEach(x=>x.classList.toggle('active',x.dataset.pos==='HOME'));
  closeMobileMenu();
  
}
function leaveHome(){document.body.classList.remove('fantasy-home-mode')}
const UTILITY_TABS=new Set(['MYGUYS','DND','MOCK','DEPTH','COMPARE','TRADE']);
function syncUtilityTabMode(pos){
  document.body.classList.toggle('utility-tab-mode',UTILITY_TABS.has(String(pos||'')));
  if(UTILITY_TABS.has(String(pos||''))){
    const toggle=document.getElementById('positionToggle');
    if(toggle)toggle.hidden=true;
  }
}

function addNav(){
  const nav=document.querySelector('.positions');if(!nav)return;
  nav.querySelector('[data-pos="ADMIN"]')?.remove();
  document.getElementById('adminSection')?.remove();

  let home=nav.querySelector('[data-pos="HOME"]');
  if(!home){
    home=document.createElement('button');home.className='pos home-btn';home.dataset.pos='HOME';home.textContent='Home';
    nav.insertBefore(home,nav.firstChild);
  }
  home.onclick=e=>{e.preventDefault();showHome()};

  let my=nav.querySelector('[data-pos="MYGUYS"]');
  if(!my){my=document.createElement('button');my.className='pos myguys-btn';my.dataset.pos='MYGUYS';my.textContent='My Guys';nav.insertBefore(my,nav.querySelector('[data-pos="MOCK"]')||null)}
  let dnd=nav.querySelector('[data-pos="DND"]');
  if(!dnd){dnd=document.createElement('button');dnd.className='pos dnd-btn';dnd.dataset.pos='DND';dnd.textContent='Do Not Draft';nav.insertBefore(dnd,nav.querySelector('[data-pos="MOCK"]')||null)}
  my.onclick=()=>openTagged('MYGUYS',my);
  dnd.onclick=()=>openTagged('DND',dnd);
}

function openTagged(kind,button){
  leaveHome();
  syncUtilityTabMode(kind);
  currentKind=kind;currentPos='ALL';
  try{position=kind}catch(e){}
  document.querySelectorAll('.positions .pos').forEach(x=>x.classList.toggle('active',x===button));
  const c=ensureControls();
  c.querySelectorAll('[data-tagpos]').forEach(x=>x.classList.toggle('active',x.dataset.tagpos==='ALL'));
  renderTagged();
  closeMobileMenu();
  
}
function renderTagged(){
  if(!currentKind)return;
  const my=currentKind==='MYGUYS',arr=buildRows(currentKind),c=ensureControls();
  c.classList.add('open');
  document.getElementById('title').textContent=my?'My Guys':'Do Not Draft';
  document.getElementById('sub').textContent=currentPos==='ALL'?'Grouped by position — QB, RB, WR, TE':`Showing ${currentPos} only`;
  document.getElementById('teamControls').hidden=true;
  document.getElementById('overallToggle').hidden=true;
  const positionToggle=document.getElementById('positionToggle');if(positionToggle)positionToggle.hidden=true;
  document.getElementById('mockSection').hidden=true;
  document.getElementById('depthSection').hidden=true;
  document.getElementById('board').hidden=true;
  document.getElementById('tableCard').hidden=false;
  document.getElementById('taggedCount').textContent=`${arr.length} player${arr.length===1?'':'s'}`;
  const grouped=currentPos==='ALL';let last='',html='';
  arr.forEach(p=>{
    if(grouped&&p.position!==last){last=p.position;html+=`<tr class="tag-group"><td colspan="6">${p.position}</td></tr>`}
    const a=p.additionalStats||{};
    html+=`<tr class="tagged-player-row" data-id="${idFor(p)}"><td class="rank">#${p.positionRank}</td><td><div class="photo-cell">${typeof pic==='function'?pic(p.name,'',p.team,p.position):''}<span class="tagged-player-copy"><b class="${my?'draft-name':'do-not-draft-name'}">${p.name}</b>${taggedTeamIdentity(p.team,p.position)}</span></div></td><td><span class="badge">${p.position}</span></td><td>${p.team}</td><td>${a.espnAdp||'—'}</td><td class="notes">${a.notes||'—'}</td></tr>`;
  });
  document.getElementById('rows').innerHTML=html;
  document.querySelectorAll('#rows tr[data-id]').forEach(tr=>tr.onclick=()=>{if(typeof profile==='function')profile(tr.dataset.id)});
  decorateTeamLogos();
}

function ensureMobileMenu(){
  if(document.getElementById('phoneMenuButton'))return;
  const button=document.createElement('button');
  button.id='phoneMenuButton';button.type='button';button.setAttribute('aria-label','Open menu');
  button.innerHTML='<span></span><span></span><span></span>';
  const backdrop=document.createElement('div');backdrop.id='phoneMenuBackdrop';
  const drawer=document.createElement('aside');drawer.id='phoneMenuDrawer';drawer.innerHTML='<h3>Fantasy Menu</h3><div id="phoneMenuItems"></div>';
  document.body.append(button,backdrop,drawer);
  const movedSearch=document.querySelector('.tools>.search');
  if(movedSearch){
    movedSearch.id='phoneMenuSearchWrap';
    drawer.appendChild(movedSearch);
    movedSearch.hidden=false;
  }
  button.onclick=()=>document.body.classList.contains('mobile-menu-open')?closeMobileMenu():openMobileMenu();
  backdrop.onclick=closeMobileMenu;
}
function openMobileMenu(){refreshMobileMenu();document.body.classList.add('mobile-menu-open')}
function closeMobileMenu(){document.body.classList.remove('mobile-menu-open')}
function refreshMobileMenu(){
  const box=document.getElementById('phoneMenuItems');if(!box)return;
  box.innerHTML='';
  document.querySelectorAll('.positions .pos').forEach(source=>{
    const b=document.createElement('button');
    b.type='button';b.textContent=source.textContent.trim();b.dataset.target=source.dataset.pos||'';
    b.classList.toggle('active',source.classList.contains('active'));
    b.onclick=()=>{
      if(source.dataset.pos==='HOME')showHome();
      else{leaveHome();source.click();}
      closeMobileMenu();
    };
    box.appendChild(b);
  });
}

async function loadHistoricalHeadshots(){
  try{
    const r=await fetch('legacy-stats/headshots.json?v=20261010-headshots8',{cache:'force-cache'});
    if(!r.ok)return;
    const d=await r.json();
    historicalHeadshots=d?.headshots||{};
    upgradeFallbackFaces();
  }catch(e){}
}
function fallbackFaceName(el){
  const photoCell=el.closest('.photo-cell');
  if(photoCell){
    const b=photoCell.querySelector('b');
    if(b?.textContent)return b.textContent.trim();
  }
  const pool=el.closest('.pool-player');
  if(pool){
    const b=pool.querySelector('span[data-id] > b');
    if(b?.textContent)return b.textContent.trim();
  }
  const roster=el.closest('.roster-card');
  if(roster){
    const b=roster.querySelector('.roster-name-line b')||roster.querySelector('b');
    if(b?.textContent&&b.textContent.trim()!=='Empty')return b.textContent.trim();
  }
  const depth=el.closest('.depth-player');
  if(depth){
    const spans=depth.querySelectorAll('span');
    const name=spans[spans.length-1]?.textContent?.trim();
    if(name)return name;
  }
  const person=el.closest('.person');
  if(person){
    const n=document.getElementById('pn')?.textContent?.trim();
    if(n)return n;
  }
  return '';
}
function upgradeFallbackFaces(){
  document.querySelectorAll('.photo.fallback,.espn-headshot-fallback').forEach(el=>{
    let name=fallbackFaceName(el);
    if(!name&&el.classList.contains('espn-headshot-fallback')){
      name=el.closest('.espn-player')?.querySelector('.espn-name-btn')?.textContent?.trim()||'';
    }
    if(!name)return;
    const candidates=headshotUrls(historicalHeadshots?.[norm(name)]);
    if(!candidates.length)return;
    const img=document.createElement('img');
    img.className=el.classList.contains('espn-headshot-fallback')?'espn-headshot':[...el.classList].filter(x=>x!=='fallback').join(' ');
    img.src=candidates[0];
    img.alt=name;
    img.loading='lazy';
    img.dataset.faceUrls=candidates.map(encodeURIComponent).join('|');
    img.dataset.faceIndex='0';
    img.dataset.faceInitials=String(name).split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'?';
    img.dataset.faceFallbackClass=el.classList.contains('espn-headshot-fallback')?'espn-headshot espn-headshot-fallback':([...el.classList].join(' '));
    img.onerror=()=>window.ShuaAdvanceFace?window.ShuaAdvanceFace(img):null;
    el.replaceWith(img);
  });
}
function decorateTeamLogos(){
  document.querySelectorAll('#rows tr:not(.tag-group)').forEach(tr=>{
    const tds=tr.querySelectorAll('td');if(tds.length<4)return;
    const td=tds[3];if(td.querySelector('.team-mini-logo'))return;
    const team=td.textContent.trim();if(TEAM_SLUGS[team])td.innerHTML=logoHtml(team);
  });
  document.querySelectorAll('.pool-meta').forEach(el=>{
    if(el.querySelector('.team-mini-logo'))return;
    const m=el.textContent.match(/^(.*?)[·]\s*([A-Z]{2,3})\s*$/);
    if(m&&TEAM_SLUGS[m[2]])el.innerHTML=`${m[1]}· ${logoHtml(m[2],true)}`;
  });
  document.querySelectorAll('.roster-card span').forEach(el=>{
    if(el.querySelector('.team-mini-logo'))return;
    const m=el.textContent.match(/^(.*?)[·]\s*([A-Z]{2,3})\s*$/);
    if(m&&TEAM_SLUGS[m[2]])el.innerHTML=`${m[1]}· ${logoHtml(m[2],true)}`;
  });
}
let selectedPlayerId='';
let rankingScrollY=0;
function updateRankingStickyOffset(){
  const bar=document.querySelector('.sticky');
  const h=bar?Math.max(0,Math.ceil(bar.getBoundingClientRect().height)):0;
  document.documentElement.style.setProperty('--shua-ranking-sticky-top',h+'px');
}
function applySelectedPlayerRow(){
  document.querySelectorAll('#rows tr.selected-player-row').forEach(tr=>tr.classList.remove('selected-player-row'));
  if(!selectedPlayerId)return;
  const row=[...document.querySelectorAll('#rows tr[data-id]')].find(tr=>tr.dataset.id===selectedPlayerId);
  if(row)row.classList.add('selected-player-row');
}
function clearSelectedPlayerRow(){
  selectedPlayerId='';
  document.querySelectorAll('#rows tr.selected-player-row').forEach(tr=>tr.classList.remove('selected-player-row'));
}
function rankingRows(){return [...document.querySelectorAll('#rows tr[data-id]')].filter(tr=>tr.dataset.id)}
function rankingRowInfo(tr){
  if(!tr)return null;
  return {
    id:tr.dataset.id||'',
    rank:(tr.querySelector('.rank')?.textContent||'').trim(),
    name:(tr.querySelector('.photo-cell b')?.textContent||'Player').trim()
  };
}
function ensureRankingPlayerNav(){
  const profileBox=document.querySelector('#modal .profile');if(!profileBox)return null;
  let nav=document.getElementById('rankingPlayerNav');
  if(!nav){
    nav=document.createElement('div');nav.id='rankingPlayerNav';nav.className='ranking-player-nav';
    nav.innerHTML='<button type="button" data-ranking-nav="prev"></button><button type="button" data-ranking-nav="next"></button>';
  }
  const tabs=profileBox.querySelector('.unified-profile-tabs');
  if(tabs&&nav.parentNode!==profileBox)profileBox.insertBefore(nav,tabs);
  else if(tabs&&nav.nextSibling!==tabs)profileBox.insertBefore(nav,tabs);
  else if(!nav.parentNode){
    const pm=document.getElementById('pm');
    if(pm?.parentNode===profileBox)pm.insertAdjacentElement('afterend',nav);else profileBox.appendChild(nav);
  }
  return nav;
}
function updateRankingPlayerNav(){
  const currentNav=document.getElementById('rankingPlayerNav');
  if(currentNav&&!currentNav.querySelector('[data-ranking-nav]'))return;
  const modal=document.getElementById('modal');if(!modal?.classList.contains('open'))return;
  const rows=rankingRows();
  const id=String(selectedPlayerId||modal.dataset.id||'');
  const idx=rows.findIndex(tr=>String(tr.dataset.id)===id);
  const nav=ensureRankingPlayerNav();if(!nav)return;
  if(idx<0||!rows.length){nav.hidden=true;return}
  nav.hidden=false;
  const prev=rankingRowInfo(rows[idx-1]),next=rankingRowInfo(rows[idx+1]);
  const prevBtn=nav.querySelector('[data-ranking-nav="prev"]'),nextBtn=nav.querySelector('[data-ranking-nav="next"]');
  const paint=(btn,item,dir)=>{
    btn.disabled=!item;btn.dataset.targetId=item?.id||'';
    const html=item?'<span class="ranking-nav-rank">'+(dir==='prev'?'← ':'')+item.rank+(dir==='next'?' →':'')+'</span><span class="ranking-nav-name">'+item.name+'</span>':'<span class="ranking-nav-rank">'+(dir==='prev'?'← Start':'End →')+'</span><span class="ranking-nav-name">No more players</span>';
    if(btn.innerHTML!==html)btn.innerHTML=html;
  };
  paint(prevBtn,prev,'prev');paint(nextBtn,next,'next');
  nav.querySelectorAll('button[data-target-id]').forEach(btn=>btn.onclick=()=>{
    const target=btn.dataset.targetId;if(!target)return;
    if(typeof window.profile==='function')window.profile(target);
    requestAnimationFrame(()=>{const p=document.querySelector('#modal .profile');if(p)p.scrollTop=0;updateRankingPlayerNav()});
  });
}
const PAGE_STATE_KEY='shuaPageStateV2';
function readPageState(){try{return JSON.parse(localStorage.getItem(PAGE_STATE_KEY)||'null')}catch(e){return null}}
function savePageState(){
  try{
    const active=document.querySelector('.positions .pos.active');
    const state={section:active?.dataset.pos||'HOME'};
    try{state.positionView=positionView}catch(e){}
    try{state.overallView=overallView}catch(e){}
    try{state.teamCount=teamCount}catch(e){}
    localStorage.setItem(PAGE_STATE_KEY,JSON.stringify(state));
  }catch(e){}
}
function restoreSavedPageState(){
  const state=readPageState();
  if(!state?.section||state.section==='HOME'){showHome();return}
  const navBtn=document.querySelector('.positions .pos[data-pos="'+state.section+'"]');
  if(!navBtn){showHome();return}
  leaveHome();navBtn.click();
  setTimeout(()=>{
    if(state.positionView){const b=document.querySelector('[data-posview="'+state.positionView+'"]');if(b)b.click()}
    if(state.overallView){const b=document.querySelector('[data-view="'+state.overallView+'"]');if(b)b.click()}
    if(state.teamCount){const b=document.querySelector('.team-btn[data-teams="'+state.teamCount+'"]');if(b)b.click()}
  },0);
}
function animateListElement(el){
  if(!el)return;
  el.classList.remove('shua-list-enter');void el.offsetWidth;el.classList.add('shua-list-enter');
  setTimeout(()=>el.classList.remove('shua-list-enter'),190);
}
function installListAnimations(){
  [['rows','tableCard'],['board','board'],['espnLiveRows','espnLiveRows']].forEach(([watchId,targetId])=>{
    const watch=document.getElementById(watchId),target=document.getElementById(targetId);
    if(!watch||!target||watch.dataset.shuaAnimWatch==='1')return;
    watch.dataset.shuaAnimWatch='1';
    new MutationObserver(m=>{if(m.some(x=>x.type==='childList'))animateListElement(target)}).observe(watch,{childList:true});
  });
}
function ensureBackToTop(){
  if(document.getElementById('shuaBackToTop'))return;
  const b=document.createElement('button');b.id='shuaBackToTop';b.type='button';b.setAttribute('aria-label','Back to top');b.textContent='↑';
  document.body.appendChild(b);
  const sync=()=>{
    const modalOpen=document.getElementById('modal')?.classList.contains('open');
    const useful=!document.body.classList.contains('fantasy-home-mode')&&!modalOpen&&window.scrollY>650;
    b.classList.toggle('visible',useful);
  };
  b.onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
  window.addEventListener('scroll',sync,{passive:true});
  document.addEventListener('click',()=>requestAnimationFrame(sync),true);
  sync();
}

function installRankingSkeleton(){
  const rows=document.getElementById('rows'),boardEl=document.getElementById('board');
  if(rows&&!rows.children.length)rows.innerHTML=Array.from({length:9},()=>'<tr class="ranking-skeleton-row" aria-hidden="true"><td></td><td></td><td></td><td></td><td></td><td></td></tr>').join('');
  if(boardEl&&!boardEl.children.length){boardEl.style.gridTemplateColumns='repeat(10,minmax(125px,1fr))';boardEl.innerHTML=Array.from({length:20},()=>'<div class="ranking-skeleton-pick" aria-hidden="true"></div>').join('')}
}
function installRankingPolish(){
  updateRankingStickyOffset();
  document.addEventListener('pointerdown',e=>{
    const target=e.target.closest('#rows tr[data-id],#board [data-id]');
    const modal=document.getElementById('modal');
    if(target&&!modal?.classList.contains('open'))rankingScrollY=window.scrollY||window.pageYOffset||0;
  },true);
  window.addEventListener('resize',()=>requestAnimationFrame(updateRankingStickyOffset),{passive:true});
  const bar=document.querySelector('.sticky');
  if(bar&&window.ResizeObserver)new ResizeObserver(()=>updateRankingStickyOffset()).observe(bar);

  const originalProfile=window.profile;
  if(typeof originalProfile==='function'&&!originalProfile.__shuaSelectedPlayerWrapped){
    const wrapped=function(id){
      const modal=document.getElementById('modal');
      if(!modal?.classList.contains('open'))rankingScrollY=window.scrollY||window.pageYOffset||0;
      selectedPlayerId=String(id||'');
      const result=originalProfile.apply(this,arguments);
      requestAnimationFrame(()=>{applySelectedPlayerRow();updateRankingPlayerNav()});
      return result;
    };
    wrapped.__shuaSelectedPlayerWrapped=true;
    window.profile=wrapped;
  }
  const modal=document.getElementById('modal');
  if(modal){
    const modalObserver=new MutationObserver(()=>{
      if(modal.classList.contains('open')){applySelectedPlayerRow();requestAnimationFrame(updateRankingPlayerNav)}
      else{
        clearSelectedPlayerRow();
        document.getElementById('rankingPlayerNav')?.remove();
        const y=rankingScrollY;
        requestAnimationFrame(()=>window.scrollTo({top:y,left:0,behavior:'auto'}));
      }
    });
    modalObserver.observe(modal,{attributes:true,attributeFilter:['class']});
  }
}

function applyColors(){
  const green=new Set(),red=new Set();
  Object.values(tags).forEach(g=>{(g.draft||[]).forEach(n=>green.add(canon(n)));(g['do-not-draft']||[]).forEach(n=>red.add(canon(n)))});
  document.querySelectorAll('#rows .photo-cell b,.pool-player span[data-id]>b,.roster-card b,.sug b').forEach(el=>{
    const n=canon(el.textContent.replace(/^(QB|RB|WR|TE|FLEX):\s*/i,''));
    el.classList.remove('draft-name','do-not-draft-name');
    if(red.has(n))el.classList.add('do-not-draft-name');else if(green.has(n))el.classList.add('draft-name');
  });
}
async function loadData(){
  const files=['player-color-tags.json','qb-rankings.json','rb-rankings.json','wr-rankings.json','te-rankings.json'];
  const [tagData,...rankData]=await Promise.all(files.map(f=>fetch(f,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(f);return r.json()})));
  tags=tagData;rankPlayers=[];
  rankData.forEach((d,i)=>{const pos=POSITIONS[i];(d.players||[]).forEach(x=>rankPlayers.push({name:x.name,team:x.team||'—',position:pos,positionRank:+x.rank,additionalStats:x}))});
  applyColors();if(currentKind)renderTagged();
}

function install(){
  addStyles();installRankingSkeleton();ensureHome();ensureControls();addNav();ensureMobileMenu();installRankingPolish();ensureBackToTop();installListAnimations();
  document.addEventListener('click',e=>{
    const b=e.target.closest('.positions .pos');
    if(b){
      syncUtilityTabMode(b.dataset.pos);
      if(!['HOME','MYGUYS','DND'].includes(b.dataset.pos)){leaveHome();hideTagged();closeMobileMenu();}
      
    }
    if(b||e.target.closest('[data-posview],[data-view],.team-btn'))setTimeout(savePageState,0);
  },true);
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape')closeMobileMenu();
    if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.target?.matches?.('input,textarea,select,[contenteditable="true"]')){
      e.preventDefault();
      openMobileMenu();
      setTimeout(()=>document.getElementById('search')?.focus(),30);
    }
  });
  const obs=new MutationObserver(()=>requestAnimationFrame(()=>{decorateTeamLogos();upgradeFallbackFaces();applyColors();applySelectedPlayerRow();updateRankingPlayerNav()}));
  obs.observe(document.body,{subtree:true,childList:true});
  loadData().catch(console.error);
  loadHistoricalHeadshots();
  requestAnimationFrame(()=>{
    decorateTeamLogos();upgradeFallbackFaces();applyColors();
    const saved=readPageState();
    if(!saved?.section||saved.section==='HOME')showHome();else leaveHome();
    setTimeout(()=>{installListAnimations();restoreSavedPageState();},90);
  });
}
install();
})();