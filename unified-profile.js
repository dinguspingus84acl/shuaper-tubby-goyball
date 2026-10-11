(()=>{
'use strict';

if(typeof profile!=='function'||!document.getElementById('modal'))return;

const baseProfile=profile;
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const ROS_ALIASES={chigoziemokonkwo:'chigokonkwo',chigokonkwo:'chigoziemokonkwo'};
const COMPACT_PROFILE_V2=true; // ROLLBACK: change to false to restore the original player-card view.
const PROFILE_BIO_OVERRIDES={
  jahmyrgibbs:{age:'24',height:'5\'9"',weight:'202 lbs',exp:'4',number:'0'},
  bijanrobinson:{age:'24',height:'5\'11"',weight:'215 lbs',exp:'4',number:'7'},
  kennethwalkeriii:{age:'25',height:'5\'9"',weight:'211 lbs',exp:'5',number:'9'},
  kennethwalker:{age:'25',height:'5\'9"',weight:'211 lbs',exp:'5',number:'9'}
};
const TEAM_NAMES={
  ARI:'CARDINALS',ATL:'FALCONS',BAL:'RAVENS',BUF:'BILLS',CAR:'PANTHERS',CHI:'BEARS',CIN:'BENGALS',CLE:'BROWNS',
  DAL:'COWBOYS',DEN:'BRONCOS',DET:'LIONS',GB:'PACKERS',GNB:'PACKERS',HOU:'TEXANS',IND:'COLTS',JAX:'JAGUARS',JAC:'JAGUARS',
  KC:'CHIEFS',KAN:'CHIEFS',LAC:'CHARGERS',SD:'CHARGERS',LAR:'RAMS',STL:'RAMS',LV:'RAIDERS',LVR:'RAIDERS',OAK:'RAIDERS',
  MIA:'DOLPHINS',MIN:'VIKINGS',NE:'PATRIOTS',NWE:'PATRIOTS',NO:'SAINTS',NOR:'SAINTS',NYG:'GIANTS',NYJ:'JETS',
  PHI:'EAGLES',PIT:'STEELERS',SEA:'SEAHAWKS',SF:'49ERS',SFO:'49ERS',TB:'BUCCANEERS',TAM:'BUCCANEERS',
  TEN:'TITANS',WAS:'COMMANDERS',WSH:'COMMANDERS'
};
const TEAM_CANON={GNB:'GB',KAN:'KC',LVR:'LV',NWE:'NE',NOR:'NO',SFO:'SF',TAM:'TB',WSH:'WAS',JAC:'JAX',OAK:'LV',STL:'LAR',SD:'LAC'};
let sleeperBioPromise=null;
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

.featured-player-profile{position:relative;width:min(790px,100%);padding:12px}
.featured-player-profile>small,.featured-player-profile>#pn,.featured-player-profile>#pm,.featured-player-profile>#profileTop{display:none!important}
.featured-player-profile .closem{
  position:absolute;right:18px;top:18px;z-index:12;
  background:#050b13dd;border-color:#ffffff28;border-radius:999px;
  width:30px;height:30px;padding:0;display:flex;align-items:center;justify-content:center
}
.featured-player-card{
  --featured-accent:#3d8cff;
  position:relative;overflow:hidden;isolation:isolate;
  height:278px;border:1px solid #ffffff24;border-radius:18px;
  background:
    radial-gradient(circle at 18% 32%,color-mix(in srgb,var(--featured-accent) 17%,transparent),transparent 34%),
    linear-gradient(135deg,#05090f 0%,#09111a 48%,#04080d 100%);
  box-shadow:inset 0 1px 0 #ffffff17,0 16px 34px #0007;
  display:grid;grid-template-columns:38% 62%
}
.featured-player-card:before{
  content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;
  background:
    linear-gradient(118deg,transparent 0 58%,#ffffff04 58% 63%,transparent 63%),
    radial-gradient(circle at 89% 80%,#ffffff06 0 1px,transparent 1.4px);
  background-size:auto,16px 16px
}
.featured-player-card .featured-left{position:relative;min-width:0;overflow:hidden}
.featured-player-card .featured-portrait-box{
  position:absolute;left:12px;right:12px;top:12px;bottom:76px;
  border-radius:14px;overflow:hidden;border:1px solid #ffffff20;
  background:linear-gradient(145deg,#080d14,#111822);
  box-shadow:inset 0 1px 0 #ffffff12
}
.featured-player-card .featured-bg-logo{
  position:absolute;left:-11%;top:-4%;width:104%;height:104%;object-fit:contain;
  opacity:.28;filter:drop-shadow(0 0 18px color-mix(in srgb,var(--featured-accent) 24%,transparent))
}
.featured-player-card .featured-photo{
  position:absolute;z-index:2;left:50%;bottom:-1px;transform:translateX(-50%);
  width:auto!important;height:98%!important;max-width:125%!important;border:0!important;border-radius:0!important;
  object-fit:contain!important;object-position:center bottom;background:transparent!important;
  filter:drop-shadow(0 11px 18px #0009)
}
.featured-player-card .featured-team-strip{
  position:absolute;z-index:4;left:12px;right:12px;bottom:10px;height:56px;
  display:grid;grid-template-columns:42px 1px minmax(0,1fr);gap:10px;align-items:center;
  padding:0 4px;background:transparent
}
.featured-player-card .featured-mini-logo{width:40px;height:40px;object-fit:contain}
.featured-player-card .featured-divider{height:38px;background:#ffffff22}
.featured-player-card .featured-team-name{
  font-size:1.04rem;font-weight:1000;letter-spacing:-.02em;color:#fff;line-height:1
}
.featured-player-card .featured-team-meta{
  margin-top:7px;font-size:.68rem;font-weight:950;letter-spacing:.045em;color:#aeb9c6;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis
}
.featured-player-card .featured-team-meta strong{color:var(--featured-accent)}
.featured-player-card .featured-right{
  position:relative;z-index:3;display:flex;flex-direction:column;justify-content:center;
  padding:30px 26px 26px;min-width:0
}
.featured-player-card .featured-name{
  margin:0 0 22px;color:#fff;text-transform:uppercase;line-height:.9;letter-spacing:-.05em;
  overflow:hidden
}
.featured-player-card .featured-first{display:block;font-size:1.65rem;font-weight:1000}
.featured-player-card .featured-last{
  display:block;font-size:2.55rem;font-weight:1000;margin-top:6px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis
}
.featured-player-card .featured-bio{
  display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px
}
.featured-player-card .featured-bio-item{
  min-width:0;border:1px solid #ffffff19;border-radius:11px;padding:11px 7px;
  background:linear-gradient(145deg,#0d141d,#080c12);text-align:center
}
.featured-player-card .featured-bio-label{
  display:block;color:#8f9cab;font-size:.54rem;font-weight:950;letter-spacing:.075em;white-space:nowrap
}
.featured-player-card .featured-bio-value{
  display:block;color:#fff;font-size:1.12rem;font-weight:1000;letter-spacing:-.025em;
  margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis
}
.featured-player-profile .unified-profile-tabs{margin-top:8px}
@media(max-width:760px){
  .featured-player-profile{width:100%!important;padding:7px!important}
  .featured-player-profile .closem{right:11px!important;top:11px!important;width:27px;height:27px}
  .featured-player-card{
    height:204px;grid-template-columns:39% 61%;border-radius:13px
  }
  .featured-player-card .featured-portrait-box{left:7px;right:7px;top:7px;bottom:57px;border-radius:10px}
  .featured-player-card .featured-team-strip{
    left:7px;right:7px;bottom:5px;height:46px;
    grid-template-columns:31px 1px minmax(0,1fr);gap:7px
  }
  .featured-player-card .featured-mini-logo{width:29px;height:29px}
  .featured-player-card .featured-divider{height:31px}
  .featured-player-card .featured-team-name{font-size:.76rem}
  .featured-player-card .featured-team-meta{font-size:.49rem;margin-top:5px}
  .featured-player-card .featured-right{padding:20px 11px 14px}
  .featured-player-card .featured-name{margin-bottom:13px;padding-right:19px}
  .featured-player-card .featured-first{font-size:1rem}
  .featured-player-card .featured-last{font-size:1.42rem;margin-top:4px}
  .featured-player-card .featured-bio{grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}
  .featured-player-card .featured-bio-item{padding:7px 4px;border-radius:8px}
  .featured-player-card .featured-bio-label{font-size:.43rem}
  .featured-player-card .featured-bio-value{font-size:.76rem;margin-top:3px}
  .featured-player-profile .unified-profile-tabs{margin-top:6px}
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

function canonicalTeam(team){
  const raw=String(team||'').trim().toUpperCase();
  return TEAM_CANON[raw]||raw;
}
function featuredTeamName(team){
  const raw=String(team||'').trim().toUpperCase();
  return TEAM_NAMES[raw]||TEAM_NAMES[canonicalTeam(raw)]||raw||'TEAM';
}
function featuredLogoUrl(team){
  const raw=String(team||'').trim().toUpperCase();
  try{
    const live=window.ShuaEspnLive?.getTeamLogoUrl?.(raw);
    if(live)return live;
  }catch(e){}
  try{
    const slug=typeof teams==='object'?(teams[raw]||teams[canonicalTeam(raw)]):'';
    if(slug)return 'https://a.espncdn.com/i/teamlogos/nfl/500/'+slug+'.png';
  }catch(e){}
  return '';
}
function featuredFaceHtml(player){
  const urls=[];
  try{
    if(typeof playerPhotoId==='function'){
      const sid=playerPhotoId(player?.name||'',player?.team||'',player?.position||'');
      if(sid)urls.push('https://sleepercdn.com/content/nfl/players/full/'+sid+'.png');
      if(sid)urls.push('https://sleepercdn.com/content/nfl/players/thumb/'+sid+'.jpg');
    }
  }catch(e){}
  try{
    const extra=window.ShuaEspnLive?.getPlayerHeadshotUrls?.(player)||[];
    if(Array.isArray(extra))urls.push(...extra);
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
function heightLabel(value){
  if(value===null||value===undefined||value==='')return '—';
  const raw=String(value).trim();
  if(/\d+['’-]\d+/.test(raw)){
    const m=raw.match(/(\d+)['’-](\d+)/);
    return m?m[1]+"'"+m[2]+'"':raw;
  }
  const n=Number(raw);
  if(Number.isFinite(n)&&n>=48&&n<=90)return Math.floor(n/12)+"'"+(n%12)+'"';
  return raw;
}
function weightLabel(value){
  const n=Number(value);
  return Number.isFinite(n)&&n>0?Math.round(n)+' lbs':(value?String(value):'—');
}
function ageLabel(value,birthDate,seasonYear=null){
  if(seasonYear&&birthDate){
    const y=Number(String(birthDate).slice(0,4));
    if(Number.isFinite(y))return String(Math.max(0,Number(seasonYear)-y));
  }
  const n=Number(value);
  return Number.isFinite(n)&&n>0?String(Math.floor(n)):'—';
}
function expLabel(value){
  const n=Number(value);
  return Number.isFinite(n)&&n>=0?(n===0?'R':String(n)):'—';
}
async function getSleeperBio(name,position='',team=''){
  if(!sleeperBioPromise){
    sleeperBioPromise=fetch('https://api.sleeper.app/v1/players/nfl',{cache:'force-cache'})
      .then(r=>{if(!r.ok)throw new Error('Sleeper player data '+r.status);return r.json()})
      .then(data=>{
        const map=new Map();
        Object.values(data||{}).forEach(p=>{
          const full=p.full_name||[p.first_name,p.last_name].filter(Boolean).join(' ').trim();
          if(!full)return;
          const key=norm(full);
          if(!map.has(key))map.set(key,[]);
          map.get(key).push(p);
        });
        return map;
      })
      .catch(()=>new Map());
  }
  const map=await sleeperBioPromise;
  const wanted=norm(name);
  let list=map.get(wanted)||[];
  if(!list.length){
    const base=wanted.replace(/(jr|sr|ii|iii|iv)$/,'');
    for(const [key,rows] of map){if(key.replace(/(jr|sr|ii|iii|iv)$/,'')===base){list=rows;break}}
  }
  const pos=String(position||'').toUpperCase();
  const tm=canonicalTeam(team);
  return list.find(p=>(!pos||String(p.position||'').toUpperCase()===pos)&&(!tm||canonicalTeam(p.team)===tm))||
    list.find(p=>!pos||String(p.position||'').toUpperCase()===pos)||
    list[0]||null;
}
function fillFeaturedBio(player,seed,bio){
  const card=document.getElementById('featuredPlayerCard');
  if(!card)return;
  const year=seedYear(seed);
  if(year){
    const vals={
      year:String(year),
      points:Number.isFinite(Number(seed?.points))?Number(seed.points).toFixed(1):'—',
      ppg:Number.isFinite(Number(seed?.average))?Number(seed.average).toFixed(1):'—',
      games:Number.isFinite(Number(seed?.gamesPlayed))?String(Number(seed.gamesPlayed)):'—'
    };
    [['YEAR',vals.year],['PPR PTS',vals.points],['PPG',vals.ppg],['GP',vals.games]].forEach(([label,value],i)=>{
      const el=card.querySelectorAll('.featured-bio-item')[i];
      if(el){el.querySelector('.featured-bio-label').textContent=label;el.querySelector('.featured-bio-value').textContent=value}
    });
    return;
  }
  const override=PROFILE_BIO_OVERRIDES[norm(player?.name)]||{};
  const values={
    age:override.age||ageLabel(bio?.age,bio?.birth_date),
    height:override.height||heightLabel(bio?.height),
    weight:override.weight||weightLabel(bio?.weight),
    exp:override.exp||expLabel(bio?.years_exp)
  };
  [['AGE',values.age],['HEIGHT',values.height],['WEIGHT',values.weight],['EXP',values.exp]].forEach(([label,value],i)=>{
    const el=card.querySelectorAll('.featured-bio-item')[i];
    if(el){el.querySelector('.featured-bio-label').textContent=label;el.querySelector('.featured-bio-value').textContent=value}
  });
  const meta=card.querySelector('.featured-team-meta');
  if(meta){
    const number=override.number??bio?.number??bio?.jersey_number;
    meta.innerHTML='<strong>'+String(player?.position||bio?.position||'—')+'</strong> · '+canonicalTeam(player?.team||bio?.team||'—')+(number!==null&&number!==undefined&&String(number)!==''?' · #'+number:'');
  }
}
function applyFeaturedProfile(name,seed=null){
  clearFeaturedProfile();
  if(!COMPACT_PROFILE_V2)return false;
  const player=seed||playerByName(name);
  if(!player)return false;
  const team=String(player.team||'').toUpperCase();
  const teamName=featuredTeamName(team);
  const logo=featuredLogoUrl(team);
  const parts=featuredNameParts(player.name||name);
  const box=document.querySelector('#modal .profile');
  const tabs=document.getElementById('unifiedProfileTabs');
  if(!box||!tabs)return false;

  box.classList.add('featured-player-profile');

  const hero=document.createElement('section');
  hero.id='featuredPlayerCard';
  hero.className='featured-player-card';

  const historical=!!seedYear(seed);
  const initialMeta='<strong>'+String(player.position||'—')+'</strong> · '+canonicalTeam(team)+(historical?' · '+seedYear(seed):'');
  const stat=(label,value)=>'<div class="featured-bio-item"><span class="featured-bio-label">'+label+'</span><b class="featured-bio-value">'+value+'</b></div>';

  hero.innerHTML=
    '<div class="featured-left">'+
      '<div class="featured-portrait-box">'+
        (logo?'<img class="featured-bg-logo" src="'+logo+'" alt="">':'')+
        featuredFaceHtml(player)+
      '</div>'+
      '<div class="featured-team-strip">'+
        (logo?'<img class="featured-mini-logo" src="'+logo+'" alt="'+teamName+' logo">':'<span></span>')+
        '<span class="featured-divider"></span>'+
        '<div class="featured-team-copy"><div class="featured-team-name">'+teamName+'</div><div class="featured-team-meta">'+initialMeta+'</div></div>'+
      '</div>'+
    '</div>'+
    '<div class="featured-right">'+
      '<h2 class="featured-name"><span class="featured-first">'+parts.first+'</span><span class="featured-last">'+parts.last+'</span></h2>'+
      '<div class="featured-bio">'+
        (historical
          ? stat('YEAR',String(seedYear(seed)))+stat('PPR PTS',Number.isFinite(Number(seed?.points))?Number(seed.points).toFixed(1):'—')+stat('PPG',Number.isFinite(Number(seed?.average))?Number(seed.average).toFixed(1):'—')+stat('GP',Number.isFinite(Number(seed?.gamesPlayed))?String(Number(seed.gamesPlayed)):'—')
          : stat('AGE','…')+stat('HEIGHT','…')+stat('WEIGHT','…')+stat('EXP','…'))+
      '</div>'+
    '</div>';

  tabs.insertAdjacentElement('beforebegin',hero);

  if(historical){
    fillFeaturedBio(player,seed,null);
  }else{
    const override=PROFILE_BIO_OVERRIDES[norm(player.name)]||null;
    if(override)fillFeaturedBio(player,null,null);
    getSleeperBio(player.name,player.position,player.team).then(bio=>{
      if(document.getElementById('modal')?.dataset.unifiedName===name)fillFeaturedBio(player,null,bio);
    }).catch(()=>{});
  }
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