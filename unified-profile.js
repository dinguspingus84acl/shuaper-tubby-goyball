(()=>{
'use strict';

if(typeof profile!=='function'||!document.getElementById('modal'))return;

const baseProfile=profile;
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const ROS_ALIASES={chigoziemokonkwo:'chigokonkwo',chigokonkwo:'chigoziemokonkwo'};
const FEATURED_PROFILE_CARDS={
  jahmyrgibbs:{variant:'gibbs',age:'24',height:'5\'9"',weight:'202 lbs',exp:'4',number:'0',espnId:'4429795'},
  bijanrobinson:{variant:'bijan',age:'24',height:'5\'11"',weight:'215 lbs',exp:'4',number:'7',espnId:'4430807'},
  kennethwalkeriii:{variant:'walker',age:'25',height:'5\'9"',weight:'211 lbs',exp:'5',number:'9',espnId:'4567048'},
  kennethwalker:{variant:'walker',age:'25',height:'5\'9"',weight:'211 lbs',exp:'5',number:'9',espnId:'4567048'}
};
const FEATURED_TEAM_META={
  DET:{name:'LIONS',abbr:'DET',logo:'det'},
  ATL:{name:'FALCONS',abbr:'ATL',logo:'atl'},
  KAN:{name:'CHIEFS',abbr:'KC',logo:'kc'},
  KC:{name:'CHIEFS',abbr:'KC',logo:'kc'},
  SEA:{name:'SEAHAWKS',abbr:'SEA',logo:'sea'}
};
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

.featured-player-profile{position:relative;width:min(1120px,100%);padding:14px}
.featured-player-profile>small,.featured-player-profile>#pn,.featured-player-profile>#pm,.featured-player-profile>#profileTop{display:none!important}
.featured-player-profile .closem{
  position:absolute;right:24px;top:24px;z-index:12;
  background:#050b13cc;border-color:#ffffff28;border-radius:999px;
  width:36px;height:36px;padding:0;display:flex;align-items:center;justify-content:center
}
.featured-player-card{
  --featured-accent:#21b8ff;--featured-accent2:#6fd8ff;
  position:relative;overflow:hidden;
  min-height:430px;border:1px solid #ffffff24;border-radius:22px;
  background:
    radial-gradient(circle at 18% 35%,color-mix(in srgb,var(--featured-accent) 16%,transparent),transparent 36%),
    linear-gradient(135deg,#050a10 0%,#07111d 47%,#04080d 100%);
  box-shadow:inset 0 1px 0 #ffffff18,0 22px 60px #0008;
  display:grid;grid-template-columns:42% 58%;
  isolation:isolate
}
.featured-player-card:before{
  content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;
  background:
    linear-gradient(115deg,transparent 0 56%,#ffffff05 56% 61%,transparent 61%),
    radial-gradient(circle at 86% 82%,#ffffff05 0 1px,transparent 1.5px);
  background-size:auto,18px 18px
}
.featured-player-card .featured-left{
  position:relative;min-width:0;min-height:430px;overflow:hidden
}
.featured-player-card .featured-bg-logo{
  position:absolute;left:-10%;top:3%;width:90%;height:72%;object-fit:contain;
  opacity:.27;filter:grayscale(.15) drop-shadow(0 0 24px color-mix(in srgb,var(--featured-accent) 26%,transparent))
}
.featured-player-card .featured-photo{
  position:absolute;z-index:2;left:50%;bottom:0;transform:translateX(-50%);
  width:auto!important;height:88%!important;max-width:104%;border:0!important;border-radius:0!important;
  object-fit:contain!important;object-position:center bottom;background:transparent!important;
  filter:drop-shadow(0 18px 26px #000a)
}
.featured-player-card .featured-team-strip{
  position:absolute;z-index:4;left:0;right:0;bottom:0;
  padding:28px 28px 22px;background:linear-gradient(90deg,#06101ceF 0%,#06101cf2 65%,transparent 100%);
  border-top:1px solid color-mix(in srgb,var(--featured-accent) 55%,#ffffff18)
}
.featured-player-card .featured-team-name{font-size:2rem;font-weight:1000;letter-spacing:-.025em;color:#fff;line-height:1}
.featured-player-card .featured-team-meta{margin-top:11px;font-size:1rem;font-weight:950;letter-spacing:.055em;color:#b8c4d1}
.featured-player-card .featured-team-meta strong{color:var(--featured-accent)}
.featured-player-card .featured-team-strip:after{
  content:"";display:block;width:82%;height:4px;border-radius:999px;margin-top:17px;
  background:linear-gradient(90deg,var(--featured-accent),transparent)
}
.featured-player-card .featured-right{
  position:relative;z-index:3;display:flex;flex-direction:column;justify-content:center;
  padding:46px 40px 40px;min-width:0
}
.featured-player-card .featured-name{margin:0 0 34px;color:#fff;text-transform:uppercase;line-height:.88;letter-spacing:-.055em}
.featured-player-card .featured-first{display:block;font-size:3rem;font-weight:1000}
.featured-player-card .featured-last{display:block;font-size:4.55rem;font-weight:1000;margin-top:9px}
.featured-player-card .featured-bio{
  display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;
  align-items:stretch
}
.featured-player-card .featured-bio-item{padding:0 18px;border-left:1px solid #ffffff24}
.featured-player-card .featured-bio-item:first-child{border-left:0;padding-left:0}
.featured-player-card .featured-bio-label{display:block;color:#96a3b2;font-size:.82rem;font-weight:950;letter-spacing:.085em}
.featured-player-card .featured-bio-value{display:block;color:#fff;font-size:2.55rem;font-weight:1000;letter-spacing:-.045em;margin-top:10px;white-space:nowrap}
.featured-player-card.featured-gibbs{--featured-accent:#20b9ff;--featured-accent2:#7ddcff}
.featured-player-card.featured-gibbs .featured-left:after{
  content:"";position:absolute;z-index:1;right:-30%;top:-10%;width:58%;height:125%;
  transform:skewX(-25deg);background:linear-gradient(180deg,#20b9ff22,transparent);border-right:2px solid #20b9ff88
}
.featured-player-card.featured-bijan{--featured-accent:#ef1b3c;--featured-accent2:#ff7388}
.featured-player-card.featured-bijan .featured-left{padding:36px 28px 110px}
.featured-player-card.featured-bijan .featured-portrait-box{
  position:absolute;left:26px;right:26px;top:24px;bottom:118px;border-radius:22px;overflow:hidden;
  border:1px solid #ffffff2a;background:linear-gradient(140deg,#090d13,#24070d);
  box-shadow:inset 0 1px 0 #ffffff18
}
.featured-player-card.featured-bijan .featured-portrait-box .featured-bg-logo{width:100%;height:100%;left:-13%;top:0}
.featured-player-card.featured-bijan .featured-portrait-box .featured-photo{height:98%!important;max-width:120%}
.featured-player-card.featured-bijan .featured-team-strip{
  display:grid;grid-template-columns:84px 1px minmax(0,1fr);gap:20px;align-items:center;
  background:transparent;padding:0 26px 26px;border-top:0
}
.featured-player-card.featured-bijan .featured-team-strip:after{display:none}
.featured-player-card.featured-bijan .featured-mini-logo{width:80px;height:80px;object-fit:contain}
.featured-player-card.featured-bijan .featured-divider{height:72px;background:#ffffff26}
.featured-player-card.featured-bijan .featured-team-copy .featured-team-name{font-size:1.8rem}
.featured-player-card.featured-bijan .featured-bio{gap:10px}
.featured-player-card.featured-bijan .featured-bio-item{
  border:1px solid #ffffff1e!important;border-radius:18px;padding:22px 15px!important;
  background:linear-gradient(145deg,#0d141d,#080c12);text-align:center
}
.featured-player-card.featured-bijan .featured-name{margin-bottom:26px}
.featured-player-card.featured-walker{
  --featured-accent:#e31837;--featured-accent2:#ffb81c;border-radius:10px;
  background:
    linear-gradient(125deg,#07090c 0 53%,#0c0807 53% 100%),
    radial-gradient(circle at 18% 30%,#e3183722,transparent 35%)
}
.featured-player-card.featured-walker:after{
  content:"";position:absolute;inset:0;z-index:-1;
  background:
    repeating-linear-gradient(120deg,transparent 0 74px,#ffffff035 75px 77px,transparent 78px 150px),
    radial-gradient(circle at 87% 75%,#ffffff07 0 1px,transparent 1.5px);
  background-size:auto,14px 14px
}
.featured-player-card.featured-walker .featured-left:before{
  content:"#9";position:absolute;right:-2%;top:-11%;z-index:0;
  font-size:12rem;font-weight:1000;color:#ffffff08;letter-spacing:-.08em
}
.featured-player-card.featured-walker .featured-bg-logo{width:105%;height:78%;left:-20%;top:-4%;opacity:.34}
.featured-player-card.featured-walker .featured-team-strip{
  clip-path:polygon(0 0,88% 0,100% 30%,88% 100%,0 100%);
  background:linear-gradient(90deg,#17070aed,#090b0fee);border-top:2px solid var(--featured-accent)
}
.featured-player-card.featured-walker .featured-team-name{font-style:italic;font-size:2.2rem}
.featured-player-card.featured-walker .featured-right{padding-top:36px}
.featured-player-card.featured-walker .featured-last{
  background:linear-gradient(180deg,#fff 0 18%,var(--featured-accent2) 18% 42%,var(--featured-accent) 60% 100%);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  font-style:italic
}
.featured-player-card.featured-walker .featured-first{font-style:italic}
.featured-player-card.featured-walker .featured-bio{
  transform:skewX(-7deg);border:1px solid #ffffff25;border-top:2px solid var(--featured-accent);
  background:#06090dd9
}
.featured-player-card.featured-walker .featured-bio-item{padding:20px 18px;border-left:1px solid #ffffff20;text-align:center}
.featured-player-card.featured-walker .featured-bio-label,.featured-player-card.featured-walker .featured-bio-value{transform:skewX(7deg)}
.featured-player-card.featured-walker .featured-bio-value{font-style:italic}
.featured-player-card .featured-slogan{
  position:absolute;right:28px;top:28px;color:#ffffff54;font-size:.68rem;font-weight:850;letter-spacing:.18em;line-height:1.7
}
.featured-player-card .featured-slogan:after{content:"";display:block;width:44px;height:3px;background:var(--featured-accent);margin-top:8px}
.featured-player-profile .unified-profile-tabs{margin-top:12px}
@media(max-width:760px){
  .featured-player-profile{width:100%;padding:10px}
  .featured-player-profile .closem{right:16px;top:16px}
  .featured-player-card{grid-template-columns:1fr;min-height:0}
  .featured-player-card .featured-left{min-height:325px}
  .featured-player-card .featured-right{padding:24px 18px 22px}
  .featured-player-card .featured-name{margin:0 0 22px}
  .featured-player-card .featured-first{font-size:2rem}
  .featured-player-card .featured-last{font-size:3rem}
  .featured-player-card .featured-bio{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  .featured-player-card .featured-bio-item,.featured-player-card .featured-bio-item:first-child{
    border:1px solid #ffffff18;padding:12px;border-radius:12px;text-align:center
  }
  .featured-player-card .featured-bio-value{font-size:1.65rem;margin-top:5px}
  .featured-player-card .featured-bio-label{font-size:.62rem}
  .featured-player-card.featured-bijan .featured-left{min-height:360px;padding:0}
  .featured-player-card.featured-bijan .featured-portrait-box{left:16px;right:16px;top:16px;bottom:112px}
  .featured-player-card.featured-bijan .featured-team-strip{grid-template-columns:58px 1px minmax(0,1fr);gap:12px;padding:0 18px 20px}
  .featured-player-card.featured-bijan .featured-mini-logo{width:54px;height:54px}
  .featured-player-card.featured-bijan .featured-divider{height:52px}
  .featured-player-card.featured-bijan .featured-team-copy .featured-team-name{font-size:1.35rem}
  .featured-player-card.featured-walker .featured-slogan{display:none}
}
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
  const urls=window.ShuaEspnLive?.getPlayerHeadshotUrls?.(seed)||[];
  const list=Array.isArray(urls)?urls.filter(Boolean):[];
  const initials=String(seed?.name||'?').split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'?';
  if(!list.length)return '<div class="person"><div class="photo lg fallback">'+initials+'</div></div>';
  const encoded=list.map(encodeURIComponent).join('|');
  return '<div class="person"><img class="photo lg" src="'+list[0]+'" alt="'+String(seed?.name||'')+'" data-face-urls="'+encoded+'" data-face-index="0" data-face-initials="'+initials+'" data-face-fallback-class="photo lg fallback" onerror="window.ShuaAdvanceFace(this)"></div>';
}

function featuredLogoUrl(team){
  const t=FEATURED_TEAM_META[String(team||'').toUpperCase()];
  if(t?.logo)return 'https://a.espncdn.com/i/teamlogos/nfl/500/'+t.logo+'.png';
  return window.ShuaEspnLive?.getTeamLogoUrl?.(team)||'';
}
function featuredFaceHtml(player,cfg){
  const urls=[];
  if(cfg?.espnId)urls.push('https://a.espncdn.com/i/headshots/nfl/players/full/'+cfg.espnId+'.png');
  try{
    const extra=window.ShuaEspnLive?.getPlayerHeadshotUrls?.(player)||[];
    if(Array.isArray(extra))urls.push(...extra);
  }catch(e){}
  try{
    if(typeof playerPhotoId==='function'){
      const sid=playerPhotoId(player?.name||'',player?.team||'',player?.position||'');
      if(sid)urls.push('https://sleepercdn.com/content/nfl/players/full/'+sid+'.png');
      if(sid)urls.push('https://sleepercdn.com/content/nfl/players/thumb/'+sid+'.jpg');
    }
  }catch(e){}
  const list=[...new Set(urls.filter(Boolean))];
  const initials=String(player?.name||'?').split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'?';
  if(!list.length)return '<span class="featured-photo fallback">'+initials+'</span>';
  const encoded=list.map(encodeURIComponent).join('|');
  return '<img class="featured-photo" src="'+list[0]+'" alt="'+String(player?.name||'')+'" data-face-urls="'+encoded+'" data-face-index="0" data-face-initials="'+initials+'" data-face-fallback-class="featured-photo fallback" onerror="window.ShuaAdvanceFace(this)">';
}
function featuredNameParts(name){
  const parts=String(name||'').trim().split(/\s+/);
  return {first:parts.shift()||'',last:parts.join(' ')};
}
function clearFeaturedProfile(){
  const box=document.querySelector('#modal .profile');
  if(!box)return;
  box.classList.remove('featured-player-profile','featured-profile-gibbs','featured-profile-bijan','featured-profile-walker');
  document.getElementById('featuredPlayerCard')?.remove();
}
function applyFeaturedProfile(name,seed=null){
  clearFeaturedProfile();
  if(seedYear(seed))return false;
  const cfg=FEATURED_PROFILE_CARDS[norm(name)];
  if(!cfg)return false;
  const player=playerByName(name);
  if(!player)return false;
  const team=FEATURED_TEAM_META[String(player.team||'').toUpperCase()];
  if(!team)return false;
  const logo=featuredLogoUrl(player.team);
  const parts=featuredNameParts(player.name);
  const box=document.querySelector('#modal .profile');
  const tabs=document.getElementById('unifiedProfileTabs');
  if(!box||!tabs)return false;

  box.classList.add('featured-player-profile','featured-profile-'+cfg.variant);

  const hero=document.createElement('section');
  hero.id='featuredPlayerCard';
  hero.className='featured-player-card featured-'+cfg.variant;

  const teamMeta='<strong>'+String(player.position||'RB')+'</strong> · '+team.abbr+' · #'+cfg.number;
  const stat=(label,value)=>'<div class="featured-bio-item"><span class="featured-bio-label">'+label+'</span><b class="featured-bio-value">'+value+'</b></div>';

  let left='';
  if(cfg.variant==='bijan'){
    left='<div class="featured-left">'+
      '<div class="featured-portrait-box">'+
        (logo?'<img class="featured-bg-logo" src="'+logo+'" alt="">':'')+
        featuredFaceHtml(player,cfg)+
      '</div>'+
      '<div class="featured-team-strip">'+
        (logo?'<img class="featured-mini-logo" src="'+logo+'" alt="'+team.name+' logo">':'<span></span>')+
        '<span class="featured-divider"></span>'+
        '<div class="featured-team-copy"><div class="featured-team-name">'+team.name+'</div><div class="featured-team-meta">'+teamMeta+'</div></div>'+
      '</div>'+
    '</div>';
  }else{
    left='<div class="featured-left">'+
      (logo?'<img class="featured-bg-logo" src="'+logo+'" alt="">':'')+
      featuredFaceHtml(player,cfg)+
      '<div class="featured-team-strip"><div class="featured-team-name">'+team.name+'</div><div class="featured-team-meta">'+teamMeta+'</div></div>'+
    '</div>';
  }

  const slogan=cfg.variant==='walker'?'<div class="featured-slogan">SPEED<br>BUILDS<br>DYNASTIES</div>':'';
  hero.innerHTML=left+
    '<div class="featured-right">'+slogan+
      '<h2 class="featured-name"><span class="featured-first">'+parts.first+'</span><span class="featured-last">'+parts.last+'</span></h2>'+
      '<div class="featured-bio">'+
        stat('AGE',cfg.age)+stat('HEIGHT',cfg.height)+stat('WEIGHT',cfg.weight)+stat('EXP',cfg.exp)+
      '</div>'+
    '</div>';

  tabs.insertAdjacentElement('beforebegin',hero);
  return true;
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
  applyFeaturedProfile(name,seed);
  renderOverviewRanks(name);
  const gp=document.getElementById('unifiedGameLogPanel');
  if(gp){gp.dataset.loadedFor='';gp.dataset.ready='0';gp.innerHTML=''}
  const hp=document.getElementById('unifiedHistoryPanel');
  if(hp){hp.dataset.loadedFor='';hp.dataset.ready='0';hp.innerHTML=''}
  activateTab('overview');
}
async function openByName(name,seed=null){
  let p=playerByName(name);
  if(p&&!seedYear(seed)){
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