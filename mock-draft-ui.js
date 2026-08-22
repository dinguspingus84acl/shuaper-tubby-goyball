(()=>{
  'use strict';
  const section=document.getElementById('mockSection');
  if(!section)return;
  section.classList.add('mock-sleeper-ui');
  const style=document.createElement('style');
  style.id='mockSleeperStableStyles';
  style.textContent=`
    .mock-sleeper-ui{--mock-line:#ffffff20;--mock-panel:#07182a}
    .mock-sleeper-ui .mock-setup{background:#081a2d;border-color:var(--mock-line);border-radius:12px;margin-bottom:8px;padding:10px}
    .mock-sleeper-ui .mock-status{margin:8px 0;padding:9px 11px;background:#07182a;border-color:var(--mock-line);font-size:.82rem}
    .mock-sleeper-ui .mock-actions{margin:0 0 8px}
    .mock-sleeper-ui .mock-actions .mock-btn{min-height:34px;padding:6px 10px;font-size:.76rem}
    .mock-sleeper-ui .mock-layout{display:block!important;width:100%;min-width:0}
    .mock-sleeper-ui .mock-layout>div:first-child{min-width:0}
    .mock-sleeper-ui .mock-layout>div:first-child>div:has(#myRoster){display:none!important}
    .mock-sleeper-ui #draftBoard{gap:2px!important;overflow:auto!important;background:#04101e;border:1px solid var(--mock-line);border-radius:10px 10px 0 0;padding:2px;max-height:360px}
    .mock-sleeper-ui #draftBoard .drafted{min-height:68px!important;border-radius:4px!important;padding:7px!important;box-shadow:none!important}
    .mock-sleeper-ui #draftBoard .drafted .slot{font-size:.58rem!important;opacity:.72;margin-bottom:4px}
    .mock-sleeper-ui #draftBoard .drafted .name{font-size:.72rem!important;line-height:1.05;white-space:normal!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .mock-sleeper-ui #draftBoard .drafted .team{font-size:.58rem!important;margin-top:4px;opacity:.78}
    .mock-sleeper-ui #draftBoard .drafted.empty-slot{background:#0a1d31!important;border:1px dashed #ffffff18;color:#5d7188!important}
    .mock-sleeper-ui .player-pool{position:static!important;width:100%!important;max-height:none!important;margin-top:8px;border-radius:12px;background:var(--mock-panel)}
    .mock-sleeper-ui .pool-head{position:sticky;top:0;z-index:4;padding:9px 10px 8px;background:#07182af5;border-bottom:1px solid var(--mock-line)}
    .mock-sleeper-ui .pool-head input{height:38px;background:#0b2139;color:#fff;border:1px solid #ffffff24;padding:0 12px;border-radius:20px;outline:none}
    .mock-sleeper-ui .mock-filters{display:flex!important;gap:7px!important;flex-wrap:nowrap!important;overflow-x:auto!important;width:100%;margin-top:8px;padding-bottom:2px}
    .mock-sleeper-ui .pool-filter{flex:0 0 auto!important;width:42px;height:42px;min-height:42px!important;padding:0!important;border-radius:50%!important;background:#0b2139!important;border:1px solid #ffffff25!important;color:#7d92a8!important;font-size:.64rem!important}
    .mock-sleeper-ui .pool-filter[data-filter='ALL']{width:46px;border-radius:23px!important}
    .mock-sleeper-ui .pool-filter[data-filter='TEAM']{width:50px;height:50px;min-height:50px!important;background:#14365b!important;color:#d9ecff!important;border-color:#4da3ff66!important;font-size:.56rem!important}
    .mock-sleeper-ui .pool-filter.primary{background:#eef4f8!important;color:#07182a!important;border-color:#eef4f8!important}
    .mock-sleeper-ui .pool-filter[data-filter='TEAM'].primary{background:#4da3ff!important;color:#04101e!important;border-color:#4da3ff!important}
    .mock-sleeper-ui .pool-list{height:min(52vh,520px)!important;min-height:320px!important;overflow-y:auto!important;background:#07182a}
    .mock-sleeper-ui .pool-player{display:grid!important;grid-template-columns:64px 36px minmax(0,1fr)!important;grid-template-areas:'action photo player'!important;gap:7px!important;align-items:center!important;padding:9px 10px!important;border-top:1px solid #ffffff12!important;min-height:56px}
    .mock-sleeper-ui .pool-player>.pool-rank{display:none!important}
    .mock-sleeper-ui .pool-player>.photo{grid-area:photo;width:34px!important;height:34px!important;flex:0 0 34px!important;border-width:1px!important}
    .mock-sleeper-ui .pool-player>span[data-id]{grid-area:player;min-width:0}
    .mock-sleeper-ui .pool-player>span[data-id]>b{display:block;font-size:.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .mock-sleeper-ui .pool-player .pool-meta{font-size:.62rem!important;color:#71869d!important;margin-top:2px}
    .mock-sleeper-ui .pool-player .draft-btn{grid-area:action;min-width:0!important;width:60px;height:30px;min-height:30px!important;padding:0 7px!important;border:1px solid #53677d!important;border-radius:15px!important;background:transparent!important;color:#8195aa!important;font-size:.64rem!important;font-weight:900!important}
    .mock-sleeper-ui .pool-player .draft-btn:not(:disabled){border-color:#4da3ff!important;color:#cde6ff!important;background:#0d2c49!important}
    .mock-sleeper-ui .team-pool-mode #poolSearch{display:none!important}
    .mock-sleeper-ui .mock-team-view{padding:12px;min-height:100%;background:linear-gradient(180deg,#081d31,#061522)}
    .mock-sleeper-ui .mock-team-title{font-size:1rem;font-weight:950;color:#fff;margin-bottom:2px}
    .mock-sleeper-ui .mock-team-subtitle{font-size:.68rem;color:#7f93aa;margin-bottom:10px}
    .mock-sleeper-ui .mock-team-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
    .mock-sleeper-ui .mock-team-grid .roster-card{border:1px solid #ffffff18!important;background:#0b2139!important;border-radius:10px!important;min-height:66px!important;padding:10px 9px 9px 52px!important;box-shadow:0 6px 14px #0003}
    .mock-sleeper-ui .mock-team-grid .roster-card>.photo{left:9px!important;top:12px!important;width:34px!important;height:34px!important}
    .mock-sleeper-ui .mock-team-grid .roster-card b{display:block;font-size:.75rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .mock-sleeper-ui .mock-team-grid .roster-card span{display:block;margin-top:3px;font-size:.63rem;color:#8094aa}
    .mock-sleeper-ui .mock-team-grid .empty-slot{padding-left:10px!important;background:#091a2b!important;border-style:dashed!important;color:#71869d!important}
    .mock-sleeper-ui .mock-team-grid .bench-heading{grid-column:1/-1;margin:8px 0 0;color:#7f93aa;font-size:.68rem;text-transform:uppercase;letter-spacing:.08em}
    .mock-sleeper-ui .mock-team-empty{padding:28px 12px;text-align:center;color:#7f93aa;border:1px dashed #ffffff22;border-radius:10px;background:#091a2b}
    @media(max-width:650px){
      .phone-mode .mock-sleeper-ui{margin-left:-2px;margin-right:-2px}
      .phone-mode .mock-sleeper-ui .mock-setup{display:grid!important;grid-template-columns:1fr 1fr;gap:7px!important}
      .phone-mode .mock-sleeper-ui .mock-setup #startMock{grid-column:1/-1;min-height:40px}
      .phone-mode .mock-sleeper-ui .mock-actions{display:flex!important;gap:6px!important}
      .phone-mode .mock-sleeper-ui #draftBoard{max-height:250px!important;overflow:auto!important}
      .phone-mode .mock-sleeper-ui #draftBoard .drafted{min-height:64px!important;padding:6px!important}
      .phone-mode .mock-sleeper-ui #draftBoard .drafted .name{font-size:.65rem!important}
      .phone-mode .mock-sleeper-ui .player-pool{order:initial!important}
      .phone-mode .mock-sleeper-ui .pool-list{height:46vh!important;min-height:280px!important}
      .phone-mode .mock-sleeper-ui .pool-player{grid-template-columns:60px 34px minmax(0,1fr)!important;padding:8px 7px!important;gap:5px!important}
      .phone-mode .mock-sleeper-ui .mock-team-grid{grid-template-columns:1fr 1fr}
      .phone-mode .mock-sleeper-ui .pool-filter[data-filter='TEAM']{width:46px;height:46px;min-height:46px!important}
    }
  `;
  document.head.appendChild(style);
})();