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
const TEAM_ACCENTS={
  ARI:'#97233f',ATL:'#a71930',BAL:'#6a4c93',BUF:'#2f7ed8',CAR:'#0085ca',CHI:'#c83803',CIN:'#fb4f14',CLE:'#ff3c00',
  DAL:'#3b82c4',DEN:'#fb4f14',DET:'#20a8e0',GB:'#2f6b4f',HOU:'#d71920',IND:'#3567a8',JAX:'#00a5b5',KC:'#e31837',
  LAC:'#0080c6',LAR:'#3f65a8',LV:'#a5acaf',MIA:'#00a3a8',MIN:'#6b4c9a',NE:'#c60c30',NO:'#d3bc8d',
  NYG:'#3568b8',NYJ:'#2b7a55',PHI:'#007078',PIT:'#ffb612',SEA:'#3f8ed8',SF:'#c9243f',TB:'#d50a0a',
  TEN:'#4b92db',WAS:'#7b2638'
};
let sleeperBioPromise=null;
let activeSeed=null;
let preferredProfileTab=(()=>{try{return sessionStorage.getItem('shuaProfileTab')||'overview'}catch(e){return'overview'}})();
let swipeHintShownThisSession=false;

const style=document.createElement('style');
style.id='unifiedProfileStyles';
style.textContent=`
.unified-profile-tabs{display:flex;gap:5px;overflow-x:auto;padding:9px 0 7px;margin-top:8px;border-bottom:1px solid #ffffff18;-webkit-overflow-scrolling:touch}
.unified-profile-tab{flex:0 0 auto;border:1px solid #ffffff1b;background:#081a2d;color:#8da1b6;border-radius:8px;padding:7px 9px;font-size:.62rem;font-weight:950}
.unified-profile-tab.active{
  background:color-mix(in srgb,var(--profile-accent,#3d8cff) 18%,#10243a);
  color:#fff;border-color:color-mix(in srgb,var(--profile-accent,#3d8cff) 48%,#ffffff28);
  box-shadow:inset 0 -2px 0 var(--profile-accent,#3d8cff)
}
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
.player-sticky-identity{display:none;position:sticky;top:0;z-index:32;min-height:46px;align-items:center;gap:10px;padding:7px 10px;border:1px solid #ffffff20;border-radius:9px;background:#061522f7;box-shadow:0 8px 20px #0008;backdrop-filter:blur(10px)}
.player-sticky-identity.visible{display:flex}
.player-sticky-main{display:flex;align-items:center;gap:9px;min-width:0;flex:1}
.player-sticky-face{width:32px;height:32px;flex:0 0 32px;border-radius:50%;overflow:hidden;background:#17314a;border:1px solid #ffffff28;display:flex;align-items:center;justify-content:center}
.player-sticky-face .featured-photo{width:100%!important;height:100%!important;object-fit:cover!important;border-radius:50%!important;font-size:.62rem!important;display:flex!important;align-items:center!important;justify-content:center!important}
.player-sticky-name{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.82rem;font-weight:1000;color:#fff}
.player-sticky-divider{width:1px;height:24px;background:#ffffff22;flex:0 0 1px}
.player-sticky-team{display:flex;align-items:center;gap:7px;min-width:0;color:#c8d5e2;font-size:.67rem;font-weight:950;white-space:nowrap}
.player-sticky-team-logo{width:24px;height:24px;object-fit:contain;flex:0 0 24px;filter:drop-shadow(0 2px 5px #0007)}
.player-sticky-team-name{max-width:150px;overflow:hidden;text-overflow:ellipsis}
.player-sticky-position{flex:0 0 auto;border:1px solid color-mix(in srgb,var(--profile-accent,#3d8cff) 50%,#ffffff20);border-radius:999px;padding:4px 7px;background:color-mix(in srgb,var(--profile-accent,#3d8cff) 16%,#081a2d);color:#fff;font-size:.6rem;font-weight:1000}
.phone-mode .player-sticky-identity{width:calc(100% - 16px);margin:0 8px;min-height:56px;padding:8px 9px;border-radius:10px}
.phone-mode .player-sticky-face{width:36px;height:36px;flex-basis:36px}
.phone-mode .player-sticky-name{font-size:.82rem;max-width:31vw}
.phone-mode .player-sticky-team{gap:6px;font-size:.62rem}
.phone-mode .player-sticky-team-logo{width:23px;height:23px;flex-basis:23px}
.phone-mode .player-sticky-team-name{max-width:27vw}
.phone-mode .player-sticky-position{font-size:.58rem;padding:4px 7px}
.player-swipe-hint{display:none;position:fixed;left:50%;bottom:max(18px,calc(10px + env(safe-area-inset-bottom)));z-index:140;transform:translateX(-50%);padding:8px 12px;border:1px solid #ffffff2c;border-radius:999px;background:#061522ef;color:#e6eef7;font-size:.65rem;font-weight:950;box-shadow:0 8px 26px #0009;pointer-events:none;animation:swipeHintIn .18s ease both}
.phone-mode .player-swipe-hint{display:block}
@keyframes swipeHintIn{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}
#espnProfileGameLogWrap{display:none!important}

/* Final player-sequence controls: owned here so later profile wrapping cannot replace them. */
#rankingPlayerNav{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;padding:7px 6px;background:#07111de8;border-left:1px solid #ffffff18;border-right:1px solid #ffffff18}
#rankingPlayerNav[hidden]{display:none!important}
#rankingPlayerNav button{min-width:0;min-height:44px;border:1px solid #ffffff22;border-radius:9px;background:#0a1c30;color:#fff;padding:7px 10px;font-weight:950;line-height:1.12;transition:background .14s ease,border-color .14s ease,transform .14s ease}
#rankingPlayerNav button:first-child{text-align:left}#rankingPlayerNav button:last-child{text-align:right}
#rankingPlayerNav button:not(:disabled):hover{background:#14395d;border-color:#ffffff48;transform:translateY(-1px)}
#rankingPlayerNav button:disabled{opacity:.3;cursor:default}
#rankingPlayerNav .ranking-nav-rank{display:block;color:#91a4ba;font-size:.58rem;margin-bottom:3px}
#rankingPlayerNav .ranking-nav-name{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.76rem}
.phone-mode #rankingPlayerNav{width:calc(100% - 16px);margin:0 8px;padding:5px;gap:5px}
.phone-mode #rankingPlayerNav button{min-height:38px;padding:5px 7px}
.phone-mode #rankingPlayerNav .ranking-nav-name{font-size:.63rem}
.phone-mode #rankingPlayerNav .ranking-nav-rank{font-size:.51rem}

.player-compare-actionbar,#compareTray,#playerCompareOverlay{display:none!important}
.player-compare-btn{border:1px solid #5aa6e866;border-radius:8px;background:#0c2b47;color:#eaf5ff;min-height:36px;padding:7px 11px;font-size:.67rem;font-weight:1000}
.player-compare-btn:hover{background:#153d61;border-color:#74b9f0}
.player-compare-btn.selected{background:#145c3d;border-color:#35d07f;color:#fff}
#compareTray{position:fixed;left:50%;bottom:18px;z-index:135;transform:translateX(-50%);display:flex;align-items:center;gap:9px;max-width:min(92vw,580px);padding:8px 10px;border:1px solid #ffffff2c;border-radius:999px;background:#061522f4;color:#fff;box-shadow:0 10px 28px #0009;backdrop-filter:blur(10px)}
#compareTray[hidden]{display:none!important}
#compareTray strong{font-size:.68rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#compareTray span{color:#8fa5bb;font-size:.61rem;white-space:nowrap}
#compareTray button{border:0;background:transparent;color:#a9bfd3;font-weight:1000;padding:2px 4px}
#playerCompareOverlay{position:fixed;inset:0;z-index:220;display:flex;align-items:center;justify-content:center;padding:18px;background:#01050bdd;backdrop-filter:blur(6px)}
#playerCompareOverlay[hidden]{display:none!important}
.player-compare-shell{width:min(1040px,100%);max-height:94vh;overflow:auto;border:1px solid #ffffff20;border-radius:16px;background:#061522;box-shadow:0 22px 60px #000b}
.player-compare-top{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #ffffff18;background:#07182af2}
.player-compare-top h2{margin:0;font-size:1rem}
.player-compare-close{width:32px;height:32px;border:1px solid #ffffff25;border-radius:999px;background:#081a2d;color:#fff;font-size:1.05rem}
.player-compare-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#ffffff12}
.player-compare-card{min-width:0;background:#061522;padding:14px}
.player-compare-player{display:flex;align-items:center;gap:10px;padding-bottom:12px;border-bottom:1px solid #ffffff14}
.player-compare-face{width:64px;height:64px;border-radius:50%;object-fit:cover;background:#17314a;border:2px solid #ffffff35}
.player-compare-title{min-width:0}.player-compare-title strong{display:block;font-size:1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.player-compare-team{display:flex;align-items:center;gap:6px;margin-top:5px;color:#91a4ba;font-size:.66rem;font-weight:900}.player-compare-team img{width:22px;height:22px;object-fit:contain}
.player-compare-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:10px}
.player-compare-stat{border:1px solid #ffffff12;border-radius:8px;background:#081a2d;padding:8px}.player-compare-stat span{display:block;color:#7f93aa;font-size:.56rem;font-weight:850}.player-compare-stat b{display:block;margin-top:3px;font-size:.86rem}
.player-compare-recent{margin-top:11px}.player-compare-recent>span{display:block;color:#7f93aa;font-size:.57rem;font-weight:900;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}.player-compare-games{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}.player-compare-game{border:1px solid #ffffff12;border-radius:7px;background:#07182a;padding:6px 4px;text-align:center}.player-compare-game small{display:block;color:#7f93aa;font-size:.49rem}.player-compare-game b{display:block;margin-top:2px;font-size:.72rem}
.phone-mode .player-compare-actionbar{width:calc(100% - 16px);margin:0 8px;padding:5px}
.phone-mode #compareTray{bottom:max(10px,env(safe-area-inset-bottom));max-width:94vw}
@media(max-width:620px){#playerCompareOverlay{padding:5px}.player-compare-shell{max-height:99vh;border-radius:11px}.player-compare-card{padding:9px}.player-compare-player{gap:6px}.player-compare-face{width:46px;height:46px}.player-compare-title strong{font-size:.78rem}.player-compare-team{font-size:.53rem}.player-compare-team img{width:17px;height:17px}.player-compare-stats{grid-template-columns:1fr;gap:5px}.player-compare-stat{padding:6px}.player-compare-stat span{font-size:.48rem}.player-compare-stat b{font-size:.72rem}.player-compare-games{gap:3px}.player-compare-game{padding:5px 2px}.player-compare-game b{font-size:.6rem}.player-compare-game small{font-size:.42rem}}

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
  height:258px;border:1px solid color-mix(in srgb,var(--featured-accent) 28%,#ffffff24);border-radius:16px 16px 0 0;
  background:
    radial-gradient(circle at 16% 30%,color-mix(in srgb,var(--featured-accent) 27%,transparent),transparent 39%),
    linear-gradient(120deg,color-mix(in srgb,var(--featured-accent) 9%,#05090f) 0%,#09111a 46%,#04080d 100%);
  box-shadow:inset 0 1px 0 #ffffff17,0 16px 34px #0007;
  display:grid;grid-template-columns:38% 62%
}
.featured-player-card:before{
  content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;
  border-top:3px solid color-mix(in srgb,var(--featured-accent) 72%,#fff 8%);
  background:
    linear-gradient(118deg,transparent 0 58%,#ffffff04 58% 63%,transparent 63%),
    radial-gradient(circle at 89% 80%,#ffffff06 0 1px,transparent 1.4px);
  background-size:auto,16px 16px
}
.featured-player-card .featured-left{position:relative;min-width:0;overflow:hidden}
.featured-player-card .featured-portrait-box{
  position:absolute;left:11px;right:11px;top:11px;bottom:70px;
  border-radius:13px;overflow:hidden;border:1px solid color-mix(in srgb,var(--featured-accent) 44%,#ffffff1d);
  background:linear-gradient(145deg,#080d14,#111822);
  box-shadow:inset 0 1px 0 #ffffff12,0 0 18px color-mix(in srgb,var(--featured-accent) 12%,transparent)
}
.featured-player-card .featured-bg-logo{
  position:absolute;left:-15%;top:-8%;width:114%;height:114%;object-fit:contain;
  opacity:.44;filter:drop-shadow(0 0 28px color-mix(in srgb,var(--featured-accent) 46%,transparent))
}
.featured-player-card .featured-photo{
  position:absolute;z-index:2;left:50%;bottom:-8px;transform:translateX(-50%);
  width:auto!important;height:111%!important;max-width:142%!important;border:0!important;border-radius:0!important;
  object-fit:contain!important;object-position:center bottom;background:transparent!important;
  filter:drop-shadow(0 11px 18px #0009)
}
.featured-player-card .featured-team-strip{
  position:absolute;z-index:4;left:11px;right:11px;bottom:8px;height:55px;
  display:grid;grid-template-columns:42px 1px minmax(0,1fr);gap:10px;align-items:center;
  padding:0 9px;background:linear-gradient(90deg,#050b13f2,#09131fdc);
  border:1px solid #ffffff12;border-radius:10px;
  box-shadow:inset 0 1px 0 #ffffff08
}
.featured-player-card .featured-team-strip:after{
  content:"";position:absolute;left:9px;right:9px;bottom:-1px;height:2px;border-radius:999px;
  background:linear-gradient(90deg,var(--featured-accent),transparent)
}
.featured-player-card .featured-mini-logo{width:40px;height:40px;object-fit:contain;filter:drop-shadow(0 0 8px color-mix(in srgb,var(--featured-accent) 30%,transparent))}
.featured-player-card .featured-divider{height:38px;background:#ffffff22}
.featured-player-card .featured-team-copy{min-width:0}
.featured-player-card .featured-team-name{
  font-size:1.04rem;font-weight:1000;letter-spacing:-.02em;color:#fff;line-height:1;
  white-space:nowrap;overflow:visible
}
.featured-player-card.featured-team-long .featured-team-name{
  font-size:.88rem;letter-spacing:-.035em
}
.featured-player-card .featured-team-meta{
  margin-top:7px;font-size:.68rem;font-weight:950;letter-spacing:.045em;color:#aeb9c6;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis
}
.featured-player-card .featured-team-meta strong{color:var(--featured-accent)}
.featured-player-card .featured-right{
  position:relative;z-index:3;display:flex;flex-direction:column;justify-content:center;
  padding:24px 23px 20px;min-width:0
}
.featured-player-card .featured-name{
  margin:0 0 16px;color:#fff;text-transform:uppercase;line-height:.9;letter-spacing:-.05em;
  overflow:visible;min-width:0
}
.featured-player-card .featured-first{display:block;font-size:1.65rem;font-weight:1000}
.featured-player-card .featured-last-row{display:flex;align-items:flex-end;gap:9px;min-width:0;margin-top:6px}
.featured-player-card .featured-last{
  display:block;font-size:2.55rem;font-weight:1000;
  white-space:nowrap;min-width:0
}
.featured-player-card .featured-jersey-number{
  flex:0 0 auto;color:var(--featured-accent);font-size:1.05rem;font-weight:1000;
  letter-spacing:-.02em;padding-bottom:3px
}
.featured-player-card.featured-name-long .featured-last{font-size:2.12rem;letter-spacing:-.04em}
.featured-player-card.featured-name-xlong .featured-last{font-size:1.78rem;letter-spacing:-.035em}
.featured-player-card .featured-bio{
  display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px
}
.featured-player-card .featured-bio-item{
  min-width:0;border:1px solid color-mix(in srgb,var(--featured-accent) 23%,#ffffff16);border-radius:10px;padding:8px 6px;
  background:linear-gradient(145deg,#0d141d,#080c12);text-align:center
}
.featured-player-card .featured-bio-label{
  display:block;color:#8f9cab;font-size:.54rem;font-weight:950;letter-spacing:.075em;white-space:nowrap
}
.featured-player-card .featured-bio-value{
  display:block;color:#fff;font-size:1.05rem;font-weight:1000;letter-spacing:-.025em;
  margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis
}
.featured-player-profile .unified-profile-tabs{
  display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;
  margin-top:0;padding:6px;border:1px solid #ffffff18;border-top:0;
  border-radius:0 0 12px 12px;background:#07111de8
}
.featured-player-profile .unified-profile-tab{
  width:100%;min-width:0;padding:6px 5px;border-radius:7px
}
@media(max-width:760px){
  .featured-player-profile{width:100%!important;padding:6px!important}
  .featured-player-profile .closem{right:9px!important;top:9px!important;width:25px;height:25px}
  .featured-player-card{
    height:186px;grid-template-columns:35% 65%;border-radius:11px 11px 0 0
  }
  .featured-player-card .featured-portrait-box{left:6px;right:6px;top:6px;bottom:49px;border-radius:8px}
  .featured-player-card .featured-photo{height:116%!important;max-width:150%!important;bottom:-10px}
  .featured-player-card .featured-bg-logo{opacity:.4;width:118%;height:118%;left:-18%;top:-10%}
  .featured-player-card .featured-team-strip{
    left:6px;right:6px;bottom:4px;height:40px;
    grid-template-columns:27px 1px minmax(0,1fr);gap:6px;padding:0 6px;border-radius:7px
  }
  .featured-player-card .featured-mini-logo{width:26px;height:26px}
  .featured-player-card .featured-divider{height:26px}
  .featured-player-card .featured-team-name{font-size:.66rem}
  .featured-player-card.featured-team-long .featured-team-name{font-size:.58rem;letter-spacing:-.04em}
  .featured-player-card .featured-team-meta{font-size:.43rem;margin-top:4px}
  .featured-player-card .featured-right{padding:16px 9px 10px}
  .featured-player-card .featured-name{margin-bottom:10px;padding-right:17px}
  .featured-player-card .featured-first{font-size:.9rem}
  .featured-player-card .featured-last-row{gap:5px;margin-top:3px}
  .featured-player-card .featured-last{font-size:1.28rem}
  .featured-player-card .featured-jersey-number{font-size:.68rem;padding-bottom:1px}
  .featured-player-card.featured-name-long .featured-last{font-size:1.08rem}
  .featured-player-card.featured-name-xlong .featured-last{font-size:.93rem}
  .featured-player-card .featured-bio{grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}
  .featured-player-card .featured-bio-item{padding:5px 3px;border-radius:7px}
  .featured-player-card .featured-bio-label{font-size:.39rem}
  .featured-player-card .featured-bio-value{font-size:.68rem;margin-top:2px}
  .featured-player-profile .unified-profile-tabs{margin-top:0;padding:4px;gap:3px}
  .featured-player-profile .unified-profile-tab{padding:5px 2px;font-size:.5rem}
}
/* Phone Mode: full-screen player sheet with swipe-down dismissal */
.phone-mode #modal.modal.open{
  display:block!important;
  padding:0!important;
  background:#02060d!important;
  overflow:hidden!important
}
.phone-mode #modal .profile.featured-player-profile{
  width:100vw!important;
  max-width:none!important;
  height:100dvh!important;
  min-height:100dvh!important;
  max-height:100dvh!important;
  margin:0!important;
  padding:calc(env(safe-area-inset-top) + 10px) 0 env(safe-area-inset-bottom)!important;
  border-radius:0!important;
  overflow-y:auto!important;
  overflow-x:hidden!important;
  overscroll-behavior-y:contain;
  -webkit-overflow-scrolling:touch;
  scrollbar-width:none;
  background:#06111f!important;
  box-shadow:none!important;
  touch-action:pan-y;
  will-change:transform
}
.phone-mode #modal .profile.featured-player-profile::-webkit-scrollbar{display:none}
.phone-mode .featured-player-profile .closem{display:none!important}
.phone-mode .featured-player-profile:before{
  content:"";display:block;position:absolute;z-index:30;
  top:calc(env(safe-area-inset-top) + 5px);left:50%;transform:translateX(-50%);
  width:42px;height:5px;border-radius:999px;background:#ffffff58;
  pointer-events:none
}
.phone-mode .featured-player-profile #featuredPlayerCard{
  width:calc(100% - 16px);height:254px;margin:8px 8px 0;
  grid-template-columns:43% 57%;border-radius:15px 15px 0 0
}
.phone-mode .featured-player-card .featured-portrait-box{
  left:8px;right:8px;top:8px;bottom:61px;border-radius:11px
}
.phone-mode .featured-player-card .featured-photo{
  height:124%!important;max-width:160%!important;bottom:-15px
}
.phone-mode .featured-player-card .featured-bg-logo{
  width:122%;height:122%;left:-20%;top:-12%;opacity:.42
}
.phone-mode .featured-player-card .featured-team-strip{
  left:8px;right:8px;bottom:5px;height:49px;
  grid-template-columns:30px 1px minmax(0,1fr);gap:6px;padding:0 6px;border-radius:9px
}
.phone-mode .featured-player-card .featured-mini-logo{width:29px;height:29px}
.phone-mode .featured-player-card .featured-divider{height:29px}
.phone-mode .featured-player-card .featured-team-name{font-size:.82rem}
.phone-mode .featured-player-card.featured-team-long .featured-team-name{font-size:.68rem;letter-spacing:-.045em}
.phone-mode .featured-player-card .featured-team-meta{font-size:.6rem;margin-top:6px}
.phone-mode .featured-player-card .featured-right{padding:22px 15px 16px}
.phone-mode .featured-player-card .featured-name{margin-bottom:13px;padding-right:0}
.phone-mode .featured-player-card .featured-first{font-size:1.25rem}
.phone-mode .featured-player-card .featured-last-row{gap:7px;margin-top:5px}
.phone-mode .featured-player-card .featured-last{font-size:1.92rem}
.phone-mode .featured-player-card .featured-jersey-number{font-size:.92rem;padding-bottom:2px}
.phone-mode .featured-player-card.featured-name-long .featured-last{font-size:1.58rem}
.phone-mode .featured-player-card.featured-name-xlong .featured-last{font-size:1.32rem}
.phone-mode .featured-player-card .featured-bio{
  grid-template-columns:repeat(2,minmax(0,1fr));gap:7px
}
.phone-mode .featured-player-card .featured-bio-item{padding:7px 5px;border-radius:9px}
.phone-mode .featured-player-card .featured-bio-label{font-size:.49rem}
.phone-mode .featured-player-card .featured-bio-value{font-size:.9rem;margin-top:4px}
.phone-mode .featured-player-profile .unified-profile-tabs{
  position:sticky;top:var(--sticky-player-name-height,0px);z-index:20;
  display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:4px!important;
  width:calc(100% - 16px);margin:0 8px!important;padding:5px!important;
  border-radius:0 0 11px 11px!important;
  box-shadow:0 8px 18px #0007
}
.phone-mode .featured-player-profile .unified-profile-tab{
  display:block!important;width:100%!important;min-width:0!important;min-height:36px!important;
  padding:7px 2px!important;font-size:.54rem!important;white-space:nowrap!important
}
.phone-mode .featured-player-profile #unifiedProfilePanels{
  min-height:calc(100dvh - 316px);
  padding:10px 10px max(18px,env(safe-area-inset-bottom))
}
.phone-mode .featured-player-profile .unified-profile-panel{padding-top:6px}
.phone-mode .featured-player-profile #unifiedOverviewPanel #stats{
  grid-template-columns:repeat(2,minmax(0,1fr))!important;
  gap:8px!important
}
.phone-mode .featured-player-profile #unifiedOverviewPanel #stats .stat{
  min-height:82px!important;padding:11px!important
}
.phone-mode .featured-player-profile .unified-stat-grid{
  display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;
  gap:8px!important;overflow:visible!important
}
.phone-mode .featured-player-profile .unified-stat-item{
  min-height:64px!important;display:flex;flex-direction:column;justify-content:center
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
function visibleRankingSequence(){
  if(document.body.classList.contains('stats-mode')&&window.ShuaEspnLive?.getCurrentStatsSequence){
    const statsSeq=window.ShuaEspnLive.getCurrentStatsSequence();
    if(Array.isArray(statsSeq)&&statsSeq.length)return statsSeq;
  }
  const rows=[...document.querySelectorAll('#rows tr[data-id]')].filter(tr=>tr.offsetParent!==null||!document.getElementById('tableCard')?.hidden);
  if(rows.length)return rows.map(tr=>({
    id:String(tr.dataset.id||''),
    rank:(tr.querySelector('.rank')?.textContent||'').trim(),
    name:(tr.querySelector('.photo-cell b')?.textContent||'Player').trim()
  })).filter(x=>x.id);
  try{
    let arr=[];
    if(typeof position!=='undefined'&&position==='ALL')arr=[...(board||[])];
    else if(typeof list==='function'&&typeof position!=='undefined'&&['QB','RB','WR','TE'].includes(position))arr=list();
    else arr=[...(board||[])];
    return arr.map((p,i)=>({id:String(p.id||''),rank:'#'+(p.overallRank||p.positionRank||i+1),name:p.name||'Player'})).filter(x=>x.id);
  }catch(e){return []}
}
function activeSequenceIndex(id){
  const seq=visibleRankingSequence();
  if(document.body.classList.contains('stats-mode')){
    const modal=document.getElementById('modal');
    const currentName=modal?.dataset.statsName||modal?.dataset.unifiedName||'';
    return {seq,index:seq.findIndex(x=>norm(x.name)===norm(currentName))};
  }
  return {seq,index:seq.findIndex(x=>String(x.id)===String(id))};
}
function ensurePlayerNav(){
  const box=document.querySelector('#modal .profile');
  const tabs=document.getElementById('unifiedProfileTabs');
  if(!box||!tabs)return null;
  let nav=document.getElementById('rankingPlayerNav');
  if(!nav){
    nav=document.createElement('div');nav.id='rankingPlayerNav';
    nav.innerHTML='<button type="button" data-player-step="prev"></button><button type="button" data-player-step="next"></button>';
  }
  if(nav.parentNode!==box||nav.nextSibling!==tabs)box.insertBefore(nav,tabs);
  return nav;
}
function paintPlayerNav(id){
  const nav=ensurePlayerNav();if(!nav)return;
  if(historicalSeed()){nav.hidden=true;return}
  const {seq,index}=activeSequenceIndex(id);
  if(index<0||!seq.length){nav.hidden=true;return}
  nav.hidden=false;
  const prev=seq[index-1]||null,next=seq[index+1]||null;
  const paint=(btn,item,dir)=>{
    btn.disabled=!item;btn.dataset.targetId=item?.id||'';
    btn.innerHTML=item
      ?'<span class="ranking-nav-rank">'+(dir==='prev'?'← ':'')+item.rank+(dir==='next'?' →':'')+'</span><span class="ranking-nav-name">'+item.name+'</span>'
      :'<span class="ranking-nav-rank">'+(dir==='prev'?'← Start':'End →')+'</span><span class="ranking-nav-name">No more players</span>';
  };
  paint(nav.querySelector('[data-player-step="prev"]'),prev,'prev');
  paint(nav.querySelector('[data-player-step="next"]'),next,'next');
  nav.querySelectorAll('button[data-target-id]').forEach(btn=>btn.onclick=()=>{
    const target=btn.dataset.targetId;if(target)openAdjacentPlayer(target,btn.dataset.playerStep==='next'?'next':'prev',false);
  });
}
function markSelectedRankingRow(id){
  document.querySelectorAll('#rows tr.selected-player-row').forEach(tr=>tr.classList.remove('selected-player-row'));
  const row=[...document.querySelectorAll('#rows tr[data-id]')].find(tr=>String(tr.dataset.id)===String(id));
  if(row)row.classList.add('selected-player-row');
}
function adjacentPlayerId(id,dir){
  const {seq,index}=activeSequenceIndex(id);
  if(index<0)return '';
  return seq[index+(dir==='next'?1:-1)]?.id||'';
}
function openAdjacentPlayer(targetId,dir,animate=true){
  if(!targetId)return false;
  const profileBox=document.querySelector('#modal .profile');
  const doOpen=()=>{
    if(String(targetId).startsWith('stats:')){
      const name=decodeURIComponent(String(targetId).slice(6));
      window.ShuaEspnLive?.openStatsPlayerByName?.(name);
    }else{
      window.profile(targetId);
    }
    const p=document.querySelector('#modal .profile');
    if(p)p.scrollTop=0;
    if(animate&&document.body.classList.contains('phone-mode')&&p){
      p.style.transition='none';
      p.style.transform='translateX('+(dir==='next'?'100vw':'-100vw')+')';
      p.style.opacity='.9';
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        p.style.transition='transform .2s ease-out, opacity .2s ease-out';
        p.style.transform='translateX(0)';p.style.opacity='1';
        setTimeout(()=>{if(p.isConnected){p.style.transition='';p.style.transform='';p.style.opacity=''}},220);
      }));
    }
  };
  if(animate&&document.body.classList.contains('phone-mode')&&profileBox){
    profileBox.style.transition='transform .16s ease-in, opacity .16s ease-in';
    profileBox.style.transform='translateX('+(dir==='next'?'-105vw':'105vw')+')';
    profileBox.style.opacity='.84';
    setTimeout(doOpen,155);
  }else doOpen();
  return true;
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
  box.style.removeProperty('--profile-accent');
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
  const number=override.number??bio?.number??bio?.jersey_number;
  const meta=card.querySelector('.featured-team-meta');
  if(meta)meta.innerHTML='<strong>'+String(player?.position||bio?.position||'—')+'</strong> · '+canonicalTeam(player?.team||bio?.team||'—');
  const jersey=card.querySelector('.featured-jersey-number');
  if(jersey)jersey.textContent=number!==null&&number!==undefined&&String(number)!==''?'#'+number:'';
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
  const accent=TEAM_ACCENTS[canonicalTeam(team)]||'#3d8cff';
  box.style.setProperty('--profile-accent',accent);

  const hero=document.createElement('section');
  hero.id='featuredPlayerCard';
  hero.className='featured-player-card';
  const nameLength=String(player.name||name).replace(/\s+/g,'').length;
  if(nameLength>=18)hero.classList.add('featured-name-xlong');
  else if(nameLength>=14)hero.classList.add('featured-name-long');
  if(teamName.length>=9)hero.classList.add('featured-team-long');
  hero.style.setProperty('--featured-accent',accent);

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
      '<h2 class="featured-name"><span class="featured-first">'+parts.first+'</span><span class="featured-last-row"><span class="featured-last">'+parts.last+'</span><span class="featured-jersey-number"></span></span></h2>'+
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

function compareLocalSnapshot(name){
  const p=playerByName(name)||basePositionPlayer(name)||{};
  const pos=p.position||'—';
  return {
    name:String(name||p.name||'Player'),
    position:pos,
    team:p.team||'—',
    overall:overallRank(name),
    preseason:preseasonRank(name),
    ros:rosRank(name,pos)
  };
}
function updateCompareTray(){
  let tray=document.getElementById('compareTray');
  if(!compareSelection.length){if(tray)tray.hidden=true;return}
  if(!tray){
    tray=document.createElement('div');tray.id='compareTray';
    tray.innerHTML='<strong id="compareTrayName"></strong><span>Choose another player to compare</span><button type="button" aria-label="Clear comparison">×</button>';
    document.body.appendChild(tray);
    tray.querySelector('button').onclick=()=>{compareSelection=[];updateCompareTray();updateCompareAction(document.getElementById('modal')?.dataset.unifiedName||'')};
  }
  tray.hidden=false;
  const n=document.getElementById('compareTrayName');if(n)n.textContent='Compare: '+compareSelection.join(' vs ');
  const note=tray.querySelector('span');if(note)note.textContent=compareSelection.length<2?'Choose another player to compare':'Comparison ready';
}
function updateCompareAction(name){
  const btn=document.getElementById('playerCompareBtn');if(!btn)return;
  const selected=compareSelection.some(x=>norm(x)===norm(name));
  btn.classList.toggle('selected',selected);
  btn.textContent=selected?'Added to Compare':'Compare';
}
function ensureCompareAction(name){
  const box=document.querySelector('#modal .profile'),hero=document.getElementById('featuredPlayerCard');
  if(!box||!hero)return;
  let bar=document.getElementById('playerCompareActionbar');
  if(!bar){
    bar=document.createElement('div');bar.id='playerCompareActionbar';bar.className='player-compare-actionbar';
    bar.innerHTML='<button type="button" id="playerCompareBtn" class="player-compare-btn">Compare</button>';
  }
  if(bar.previousSibling!==hero)hero.insertAdjacentElement('afterend',bar);
  updateCompareAction(name);
  const btn=document.getElementById('playerCompareBtn');
  btn.onclick=async()=>{
    const current=document.getElementById('modal')?.dataset.unifiedName||name;
    const idx=compareSelection.findIndex(x=>norm(x)===norm(current));
    if(idx>=0){compareSelection.splice(idx,1);updateCompareTray();updateCompareAction(current);return}
    if(compareSelection.length>=2)compareSelection=[];
    compareSelection.push(current);
    updateCompareTray();updateCompareAction(current);
    if(compareSelection.length===2){
      await openPlayerComparison(compareSelection[0],compareSelection[1]);
    }
  };
}
function compareNum(v,d=1){return Number.isFinite(Number(v))?Number(v).toFixed(d):'—'}
function compareRank(v){return Number.isFinite(Number(v))&&Number(v)>0?'#'+Number(v):'—'}
function compareCardHtml(local,espn){
  const logo=espn?.teamLogo||featuredLogoUrl(local.team);
  const face=espn?.headshot||'';
  const teamName=featuredTeamName(espn?.team||local.team);
  const recent=(espn?.recent||[]).slice(-5);
  const latest=espn?.latestFinish;
  const recentHtml=recent.length?recent.map(g=>'<div class="player-compare-game"><small>W'+g.week+(g.opponent?' · '+g.opponent:'')+'</small><b>'+compareNum(g.points)+'</b></div>').join(''):'<div class="player-compare-game"><small>Recent</small><b>—</b></div>';
  return '<div class="player-compare-card">'+
    '<div class="player-compare-player">'+
      (face?'<img class="player-compare-face" src="'+face+'" alt="">':'<div class="player-compare-face"></div>')+
      '<div class="player-compare-title"><strong>'+local.name+'</strong><div class="player-compare-team">'+(logo?'<img src="'+logo+'" alt="">':'')+'<span>'+teamName+' · '+local.position+'</span></div></div>'+
    '</div>'+
    '<div class="player-compare-stats">'+
      '<div class="player-compare-stat"><span>Overall Rank</span><b>'+compareRank(local.overall)+'</b></div>'+
      '<div class="player-compare-stat"><span>ROS '+local.position+'</span><b>'+compareRank(local.ros)+'</b></div>'+
      '<div class="player-compare-stat"><span>Preseason '+local.position+'</span><b>'+compareRank(local.preseason)+'</b></div>'+
      '<div class="player-compare-stat"><span>ESPN '+local.position+'</span><b>'+compareRank(espn?.espnRank)+'</b></div>'+
      '<div class="player-compare-stat"><span>2026 PPG</span><b>'+compareNum(espn?.ppg)+'</b></div>'+
      '<div class="player-compare-stat"><span>2026 PPR</span><b>'+compareNum(espn?.points)+'</b></div>'+
      '<div class="player-compare-stat"><span>Latest Finish</span><b>'+(latest?latest.year+' '+latest.position+compareRank(latest.rank):'—')+'</b></div>'+
      '<div class="player-compare-stat"><span>Latest Finish PPG</span><b>'+compareNum(latest?.ppg)+'</b></div>'+
    '</div>'+
    '<div class="player-compare-recent"><span>Last 5 Games</span><div class="player-compare-games">'+recentHtml+'</div></div>'+
  '</div>';
}
async function openPlayerComparison(a,b){
  let overlay=document.getElementById('playerCompareOverlay');
  if(!overlay){
    overlay=document.createElement('div');overlay.id='playerCompareOverlay';overlay.hidden=true;
    overlay.innerHTML='<div class="player-compare-shell"><div class="player-compare-top"><h2>Player Comparison</h2><button type="button" class="player-compare-close">×</button></div><div id="playerCompareGrid" class="player-compare-grid"></div></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('.player-compare-close').onclick=()=>{overlay.hidden=true};
    overlay.onclick=e=>{if(e.target===overlay)overlay.hidden=true};
  }
  const grid=document.getElementById('playerCompareGrid');
  overlay.hidden=false;grid.innerHTML='<div class="unified-profile-loading">Loading comparison…</div><div class="unified-profile-loading">Loading comparison…</div>';
  const locals=[compareLocalSnapshot(a),compareLocalSnapshot(b)];
  const snaps=await Promise.all([a,b].map(n=>window.ShuaEspnLive?.getComparisonSnapshot?window.ShuaEspnLive.getComparisonSnapshot(n):Promise.resolve({})));
  if(overlay.hidden)return;
  grid.innerHTML=compareCardHtml(locals[0],snaps[0])+compareCardHtml(locals[1],snaps[1]);
}
function ensureStickyIdentity(name){
  const box=document.querySelector('#modal .profile');if(!box)return;
  let bar=document.getElementById('playerStickyIdentity');
  if(!bar){
    bar=document.createElement('div');bar.id='playerStickyIdentity';bar.className='player-sticky-identity';
    const close=document.getElementById('close');
    if(close?.parentNode===box)close.insertAdjacentElement('afterend',bar);else box.prepend(bar);
  }
  const seed=historicalSeed();
  const p=seed||playerByName(name)||basePositionPlayer(name)||{};
  const team=String(p?.team||'').toUpperCase();
  const pos=String(p?.position||'—').toUpperCase();
  const teamName=featuredTeamName(team);
  const logo=featuredLogoUrl(team);
  const stickyPlayer={...p,name:String(name||p?.name||'Player'),team,pos};
  const face=featuredFaceHtml(stickyPlayer);
  bar.innerHTML=
    '<div class="player-sticky-main">'+
      '<span class="player-sticky-face">'+face+'</span>'+
      '<strong class="player-sticky-name">'+String(name||p?.name||'Player')+'</strong>'+
      '<span class="player-sticky-divider"></span>'+
      '<span class="player-sticky-team">'+
        (logo?'<img class="player-sticky-team-logo" src="'+logo+'" alt="'+teamName+' logo">':'')+
        '<span class="player-sticky-team-name">'+teamName+'</span>'+
      '</span>'+
    '</div>'+
    '<span class="player-sticky-position">'+pos+'</span>';
  const sync=()=>{
    const visible=box.scrollTop>90;
    bar.classList.toggle('visible',visible);
    box.style.setProperty('--sticky-player-name-height',visible?(document.body.classList.contains('phone-mode')?'58px':'46px'):'0px');
  };
  if(box.dataset.stickyIdentityInstalled!=='1'){
    box.dataset.stickyIdentityInstalled='1';
    box.addEventListener('scroll',sync,{passive:true});
  }
  sync();
}
function ensureSwipeHint(){
  if(!document.body.classList.contains('phone-mode')||swipeHintShownThisSession)return;
  try{if(localStorage.getItem('shuaPlayerSwipeHintSeen')==='1')return}catch(e){}
  swipeHintShownThisSession=true;
  let hint=document.getElementById('playerSwipeHint');
  if(!hint){hint=document.createElement('div');hint.id='playerSwipeHint';hint.className='player-swipe-hint';hint.textContent='↔ Swipe left / right for players';document.body.appendChild(hint)}
  hint.hidden=false;
  setTimeout(()=>{if(hint?.isConnected)hint.remove()},4800);
}
function markSwipeHintLearned(){
  try{localStorage.setItem('shuaPlayerSwipeHintSeen','1')}catch(e){}
  document.getElementById('playerSwipeHint')?.remove();
}
function installKeyboardPlayerNav(){
  if(document.documentElement.dataset.playerKeyboardNav==='1')return;
  document.documentElement.dataset.playerKeyboardNav='1';
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      const overlay=document.getElementById('playerCompareOverlay');
      if(overlay&&!overlay.hidden){overlay.hidden=true;e.preventDefault();return}
    }
    if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;
    const modal=document.getElementById('modal');
    if(!modal?.classList.contains('open')||historicalSeed())return;
    if(e.target?.matches?.('input,textarea,select,[contenteditable="true"]'))return;
    const id=modal.dataset.id||'';
    const dir=e.key==='ArrowRight'?'next':'prev';
    const target=adjacentPlayerId(id,dir);
    if(!target)return;
    e.preventDefault();openAdjacentPlayer(target,dir,false);
  });
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
  if(!['overview','gamelog','history','notes'].includes(key))key='overview';
  preferredProfileTab=key;
  try{sessionStorage.setItem('shuaProfileTab',key)}catch(e){}
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
function isPhoneProfileSheet(){
  const modal=document.getElementById('modal');
  const profile=modal?.querySelector('.profile');
  return !!(document.body.classList.contains('phone-mode')&&modal?.classList.contains('open')&&profile?.classList.contains('featured-player-profile'));
}
function resetPhoneProfileSheet(){
  const modal=document.getElementById('modal');
  const profile=modal?.querySelector('.profile');
  if(profile){
    profile.style.transition='';
    profile.style.transform='';
    profile.style.opacity='';
  }
  if(modal)modal.style.background='';
}
function dismissPhoneProfile(){
  const modal=document.getElementById('modal');
  if(!modal)return;
  try{
    if(typeof closeProfile==='function'){closeProfile();resetPhoneProfileSheet();return}
  }catch(e){}
  modal.classList.remove('open');
  modal.removeAttribute('data-id');
  document.body.style.overflow='';
  resetPhoneProfileSheet();
}
function installPhoneSwipeDismiss(){
  const profile=document.querySelector('#modal .profile');
  if(!profile||profile.dataset.phoneSwipeDismiss==='2')return;
  profile.dataset.phoneSwipeDismiss='2';

  let tracking=false,mode='',startY=0,startX=0,lastY=0,lastX=0,startTime=0,suppressClickUntil=0;
  let horizontalAllowed=false;

  const reset=()=>{
    tracking=false;mode='';horizontalAllowed=false;
    profile.style.transition='transform .18s ease-out, opacity .18s ease-out';
    profile.style.transform='';profile.style.opacity='';
    const modal=document.getElementById('modal');if(modal)modal.style.background='';
    setTimeout(()=>{if(profile.isConnected)profile.style.transition=''},190);
  };

  profile.addEventListener('touchstart',e=>{
    if(!isPhoneProfileSheet()||e.touches.length!==1)return;
    const t=e.touches[0];
    tracking=true;mode='';startY=lastY=t.clientY;startX=lastX=t.clientX;startTime=performance.now();
    horizontalAllowed=!e.target.closest('button,input,select,textarea,a,.unified-profile-tabs,.espn-stat-filters,.espn-game-log-tabs,.espn-game-log-table-wrap,.espn-live-filters,.espn-live-meta');
  },{passive:true});

  profile.addEventListener('touchmove',e=>{
    if(!tracking||e.touches.length!==1)return;
    const t=e.touches[0],dy=t.clientY-startY,dx=t.clientX-startX;
    lastY=t.clientY;lastX=t.clientX;
    if(!mode){
      if(Math.max(Math.abs(dx),Math.abs(dy))<9)return;
      if(horizontalAllowed&&Math.abs(dx)>Math.abs(dy)*1.15)mode='horizontal';
      else if(dy>0&&profile.scrollTop<=1&&Math.abs(dy)>Math.abs(dx)*1.05)mode='vertical';
      else{tracking=false;return}
    }
    if(mode==='horizontal'){
      e.preventDefault();
      const currentId=document.getElementById('modal')?.dataset.id||'';
      const dir=dx<0?'next':'prev';
      const canMove=!!adjacentPlayerId(currentId,dir);
      const resisted=canMove?dx:dx*.22;
      const pull=Math.max(-180,Math.min(180,resisted*.72));
      profile.style.transition='none';profile.style.transform='translateX('+pull+'px)';
      profile.style.opacity=String(1-Math.min(.13,Math.abs(pull)/1300));
      return;
    }
    if(mode==='vertical'){
      if(dy<=0)return;
      e.preventDefault();
      const pull=Math.min(220,dy*.66),progress=Math.min(1,pull/220);
      profile.style.transition='none';profile.style.transform='translateY('+pull+'px)';
      profile.style.opacity=String(1-progress*.18);
      const modal=document.getElementById('modal');if(modal)modal.style.background='rgba(2,6,13,'+(1-progress*.72)+')';
    }
  },{passive:false});

  profile.addEventListener('touchend',()=>{
    if(!tracking){reset();return}
    const dy=lastY-startY,dx=lastX-startX,elapsed=Math.max(1,performance.now()-startTime);
    tracking=false;
    if(mode==='horizontal'){
      const velocity=Math.abs(dx)/elapsed,dir=dx<0?'next':'prev';
      const currentId=document.getElementById('modal')?.dataset.id||'';
      const target=adjacentPlayerId(currentId,dir);
      if(target&&(Math.abs(dx)>=72||(Math.abs(dx)>=42&&velocity>=.42))){
        suppressClickUntil=Date.now()+450;
        markSwipeHintLearned();
        openAdjacentPlayer(target,dir,true);
      }else reset();
      mode='';return;
    }
    if(mode==='vertical'){
      const velocity=dy/elapsed;
      if(dy>=105||(dy>=58&&velocity>=.48)){
        suppressClickUntil=Date.now()+400;
        profile.style.transition='transform .18s ease-in, opacity .18s ease-in';
        profile.style.transform='translateY(105dvh)';profile.style.opacity='.82';
        setTimeout(dismissPhoneProfile,180);
      }else reset();
      mode='';return;
    }
    reset();
  },{passive:true});

  profile.addEventListener('touchcancel',reset,{passive:true});
  profile.addEventListener('click',e=>{if(Date.now()<suppressClickUntil){e.preventDefault();e.stopPropagation()}},true);
}

function prepareUnified(name,seed=null){
  ensureUi();
  resetPhoneProfileSheet();
  installPhoneSwipeDismiss();
  const sy=seedYear(seed);
  activeSeed=seed?{...seed,__historical:!!(seed.source==='nflverse'||(sy&&sy<2026))}:null;
  const modal=document.getElementById('modal');
  modal.dataset.unifiedName=name;
  applyFeaturedProfile(name,seed);
  renderOverviewRanks(name);
  ensureStickyIdentity(name);
  ensureSwipeHint();
  const currentId=document.getElementById('modal')?.dataset.id||playerByName(name)?.id||'';
  if(currentId){markSelectedRankingRow(currentId);paintPlayerNav(currentId)}else document.getElementById('rankingPlayerNav')?.setAttribute('hidden','');
  const gp=document.getElementById('unifiedGameLogPanel');
  if(gp){gp.dataset.loadedFor='';gp.dataset.ready='0';gp.innerHTML=''}
  const hp=document.getElementById('unifiedHistoryPanel');
  if(hp){hp.dataset.loadedFor='';hp.dataset.ready='0';hp.innerHTML=''}
  activateTab(preferredProfileTab||'overview');
}
async function openByName(name,seed=null){
  let p=playerByName(name);
  if(p&&!seedYear(seed)){
    activeSeed=null;
    baseProfile(p.id);
    const modal=document.getElementById('modal');
    if(modal&&document.body.classList.contains('stats-mode'))modal.dataset.statsName=name;
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
    if(modal&&document.body.classList.contains('stats-mode'))modal.dataset.statsName=ep.name;
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
  const modal=document.getElementById('modal');
  if(modal){
    modal.dataset.id=String(id||'');
    if(!document.body.classList.contains('stats-mode'))delete modal.dataset.statsName;
  }
  if(p)prepareUnified(p.name);
};

ensureUi();
installKeyboardPlayerNav();
})();