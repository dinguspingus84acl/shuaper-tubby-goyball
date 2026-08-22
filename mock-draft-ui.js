(()=>{
  'use strict';
  const section=document.getElementById('mockSection');
  if(!section)return;
  section.classList.add('mock-sleeper-ui');

  const style=document.createElement('style');
  style.id='mockSleeperStableStyles';
  style.textContent=`
    .mock-sleeper-ui{--mock-line:#ffffff20;--mock-panel:#07182a;--mock-team-count:10}
    #mockSection.mock-sleeper-ui:not([hidden]){display:grid!important;grid-template-columns:auto minmax(180px,1fr) auto;gap:6px;align-items:center}

    .mock-sleeper-ui .mock-setup{grid-column:1;display:flex!important;align-items:center!important;gap:6px!important;flex-wrap:nowrap!important;background:#081a2d;border-color:var(--mock-line);border-radius:8px;margin:0!important;padding:5px 7px!important}
    .mock-sleeper-ui .mock-setup label{display:flex!important;align-items:center!important;gap:4px!important;color:#7f93aa!important;font-size:.62rem!important;font-weight:800;white-space:nowrap}
    .mock-sleeper-ui .mock-setup select{height:29px!important;min-width:58px!important;border:1px solid #ffffff24!important;border-radius:6px!important;background:#0b2139!important;color:#fff!important;padding:0 5px!important;font-size:.7rem!important}
    .mock-sleeper-ui .mock-setup #startMock{height:29px!important;min-height:29px!important;padding:0 9px!important;border-radius:6px!important;font-size:.68rem!important;white-space:nowrap}

    .mock-sleeper-ui .mock-status{grid-column:2;margin:0!important;min-height:35px!important;padding:7px 10px!important;display:flex;align-items:center;background:#07182a;border-color:var(--mock-line);border-radius:8px;font-size:.72rem!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .mock-sleeper-ui .mock-actions{grid-column:3;display:flex!important;gap:5px!important;flex-wrap:nowrap!important;margin:0!important}
    .mock-sleeper-ui .mock-actions .mock-btn{height:31px!important;min-height:31px!important;padding:0 8px!important;font-size:.66rem!important;border-radius:6px!important}

    .mock-sleeper-ui .mock-layout{grid-column:1/-1;display:block!important;width:100%;min-width:0;margin-top:0!important}
    .mock-sleeper-ui .mock-layout>div:first-child{min-width:0}
    .mock-sleeper-ui .mock-layout>div:first-child>div:has(#myRoster){display:none!important}

    .mock-sleeper-ui #draftBoard{display:grid!important;grid-template-columns:repeat(var(--mock-team-count),92px)!important;gap:2px!important;overflow:auto!important;background:#04101e;border:1px solid var(--mock-line);border-radius:8px 8px 0 0;padding:2px;max-height:300px!important}
    .mock-sleeper-ui #draftBoard .drafted{min-width:0!important;min-height:52px!important;height:52px!important;border-radius:3px!important;padding:5px!important;box-shadow:none!important}
    .mock-sleeper-ui #draftBoard .drafted .slot{font-size:.52rem!important;opacity:.72;margin-bottom:2px}
    .mock-sleeper-ui #draftBoard .drafted .name{font-size:.64rem!important;line-height:1.02;white-space:normal!important;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
    .mock-sleeper-ui #draftBoard .drafted .team{font-size:.52rem!important;margin-top:2px;opacity:.78;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .mock-sleeper-ui #draftBoard .drafted.empty-slot{background:#0a1d31!important;border:1px dashed #ffffff18;color:#5d7188!important}
    .mock-sleeper-ui #draftBoard .arrow{font-size:.6rem!important;bottom:3px!important}
    .mock-sleeper-ui #draftBoard .mock-team-head{height:24px;min-width:0;display:flex;align-items:center;justify-content:center;background:#0b2239;color:#8196ad;border-radius:3px;font-size:.56rem;font-weight:950;letter-spacing:.02em;position:sticky;top:0;z-index:4}
    .mock-sleeper-ui #draftBoard .mock-team-head.mine{background:#164a78;color:#fff;box-shadow:inset 0 -2px 0 #4da3ff}

    .mock-sleeper-ui .player-pool{position:static!important;width:100%!important;max-height:none!important;margin-top:5px!important;border-radius:8px;background:var(--mock-panel)}
    .mock-sleeper-ui .pool-head{position:sticky;top:0;z-index:4;padding:6px 8px!important;background:#07182af5;border-bottom:1px solid var(--mock-line)}
    .mock-sleeper-ui .pool-head input{height:31px!important;background:#0b2139;color:#fff;border:1px solid #ffffff24;padding:0 10px!important;border-radius:16px!important;outline:none;font-size:.75rem!important}
    .mock-sleeper-ui .mock-filters{display:flex!important;gap:5px!important;flex-wrap:nowrap!important;overflow-x:auto!important;width:100%;margin-top:5px!important;padding-bottom:1px}
    .mock-sleeper-ui .pool-filter{flex:0 0 auto!important;width:34px!important;height:34px!important;min-height:34px!important;padding:0!important;border-radius:50%!important;background:#0b2139!important;border:1px solid #ffffff25!important;color:#7d92a8!important;font-size:.58rem!important}
    .mock-sleeper-ui .pool-filter[data-filter='ALL']{width:38px!important;border-radius:19px!important}
    .mock-sleeper-ui .pool-filter[data-filter='TEAM']{width:42px!important;height:42px!important;min-height:42px!important;background:#14365b!important;color:#d9ecff!important;border-color:#4da3ff66!important;font-size:.52rem!important}
    .mock-sleeper-ui .pool-filter.primary{background:#eef4f8!important;color:#07182a!important;border-color:#eef4f8!important}
    .mock-sleeper-ui .pool-filter[data-filter='TEAM'].primary{background:#4da3ff!important;color:#04101e!important;border-color:#4da3ff!important}

    .mock-sleeper-ui .pool-list{height:min(64vh,640px)!important;min-height:360px!important;overflow-y:auto!important;background:#07182a}
    .mock-sleeper-ui .pool-player{display:grid!important;grid-template-columns:54px 30px minmax(0,1fr)!important;grid-template-areas:'action photo player'!important;gap:6px!important;align-items:center!important;padding:6px 8px!important;border-top:1px solid #ffffff12!important;min-height:48px!important}
    .mock-sleeper-ui .pool-player>.pool-rank{display:none!important}
    .mock-sleeper-ui .pool-player>.photo{grid-area:photo;width:30px!important;height:30px!important;flex:0 0 30px!important;border-width:1px!important}
    .mock-sleeper-ui .pool-player>span[data-id]{grid-area:player;min-width:0}
    .mock-sleeper-ui .pool-player>span[data-id]>b{display:block;font-size:.75rem!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .mock-sleeper-ui .pool-player .pool-meta{font-size:.57rem!important;color:#71869d!important;margin-top:1px}
    .mock-sleeper-ui .pool-player .draft-btn{grid-area:action;min-width:0!important;width:52px!important;height:26px!important;min-height:26px!important;padding:0 5px!important;border:1px solid #53677d!important;border-radius:13px!important;background:transparent!important;color:#8195aa!important;font-size:.58rem!important;font-weight:900!important}
    .mock-sleeper-ui .pool-player .draft-btn:not(:disabled){border-color:#4da3ff!important;color:#cde6ff!important;background:#0d2c49!important}

    .mock-sleeper-ui .team-pool-mode #poolSearch{display:none!important}
    .mock-sleeper-ui .mock-team-view{padding:8px!important;min-height:100%;background:linear-gradient(180deg,#081d31,#061522)}
    .mock-sleeper-ui .mock-team-title{font-size:.9rem!important;font-weight:950;color:#fff;margin-bottom:1px}
    .mock-sleeper-ui .mock-team-subtitle{font-size:.6rem!important;color:#7f93aa;margin-bottom:7px}
    .mock-sleeper-ui .mock-team-grid{display:grid!important;grid-template-columns:1fr!important;gap:5px!important;max-width:560px}
    .mock-sleeper-ui .mock-team-grid .roster-card{border:1px solid #ffffff18!important;background:#0b2139!important;border-radius:7px!important;min-height:40px!important;height:40px!important;padding:4px 46px 4px 34px!important;box-shadow:none!important;position:relative!important}
    .mock-sleeper-ui .mock-team-grid .roster-card>.photo{left:6px!important;top:8px!important;width:22px!important;height:22px!important;flex-basis:22px!important}
    .mock-sleeper-ui .mock-team-grid .roster-name-line{display:flex;align-items:center;gap:5px;min-width:0;height:100%}
    .mock-sleeper-ui .mock-team-grid .roster-name-line b{display:block;min-width:0;flex:0 1 auto;font-size:.64rem!important;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .mock-sleeper-ui .mock-team-grid .lineup-team-logo{width:17px;height:17px;object-fit:contain;flex:0 0 17px}
    .mock-sleeper-ui .mock-team-grid .my-pick-number{position:absolute;right:7px;top:50%;transform:translateY(-50%);font-style:normal;font-size:.62rem;font-weight:950;color:#9fb5ca;background:#061522;border:1px solid #ffffff16;border-radius:999px;padding:3px 5px;min-width:30px;text-align:center}
    .mock-sleeper-ui .mock-team-grid .empty-slot{padding-left:9px!important;background:#091a2b!important;border-style:dashed!important;color:#71869d!important}
    .mock-sleeper-ui .mock-team-grid .bench-heading{grid-column:1!important;margin:5px 0 0!important;color:#7f93aa;font-size:.6rem!important;text-transform:uppercase;letter-spacing:.08em}
    .mock-sleeper-ui .mock-team-empty{padding:20px 10px;text-align:center;color:#7f93aa;border:1px dashed #ffffff22;border-radius:8px;background:#091a2b}

    @media(max-width:650px){
      #mockSection.mock-sleeper-ui:not([hidden]){grid-template-columns:minmax(0,1fr) auto!important;gap:4px!important}
      .phone-mode .mock-sleeper-ui{margin-left:-2px;margin-right:-2px}
      .phone-mode .mock-sleeper-ui .mock-setup{grid-column:1/-1!important;gap:4px!important;padding:4px 5px!important;justify-content:flex-start!important}
      .phone-mode .mock-sleeper-ui .mock-setup label{font-size:.56rem!important;gap:3px!important}
      .phone-mode .mock-sleeper-ui .mock-setup select{height:27px!important;min-width:52px!important;font-size:.66rem!important}
      .phone-mode .mock-sleeper-ui .mock-setup #startMock{height:27px!important;min-height:27px!important;padding:0 7px!important;font-size:.62rem!important}
      .phone-mode .mock-sleeper-ui .mock-status{grid-column:1!important;min-height:30px!important;padding:5px 7px!important;font-size:.64rem!important}
      .phone-mode .mock-sleeper-ui .mock-actions{grid-column:2!important;gap:3px!important}
      .phone-mode .mock-sleeper-ui .mock-actions .mock-btn{height:28px!important;min-height:28px!important;padding:0 6px!important;font-size:.6rem!important}
      .phone-mode .mock-sleeper-ui .mock-layout{grid-column:1/-1!important}
      .phone-mode .mock-sleeper-ui #draftBoard{grid-template-columns:repeat(var(--mock-team-count),64px)!important;max-height:235px!important;overflow:auto!important}
      .phone-mode .mock-sleeper-ui #draftBoard .mock-team-head{height:22px;font-size:.5rem!important}
      .phone-mode .mock-sleeper-ui #draftBoard .drafted{min-height:44px!important;height:44px!important;padding:4px!important}
      .phone-mode .mock-sleeper-ui #draftBoard .drafted .name{font-size:.58rem!important}
      .phone-mode .mock-sleeper-ui #draftBoard .drafted .team{font-size:.48rem!important}
      .phone-mode .mock-sleeper-ui .player-pool{order:initial!important;margin-top:4px!important}
      .phone-mode .mock-sleeper-ui .pool-head{padding:5px 6px!important}
      .phone-mode .mock-sleeper-ui .pool-head input{height:29px!important}
      .phone-mode .mock-sleeper-ui .mock-filters{gap:4px!important;margin-top:4px!important}
      .phone-mode .mock-sleeper-ui .pool-filter{width:32px!important;height:32px!important;min-height:32px!important}
      .phone-mode .mock-sleeper-ui .pool-filter[data-filter='TEAM']{width:38px!important;height:38px!important;min-height:38px!important}
      .phone-mode .mock-sleeper-ui .pool-list{height:58vh!important;min-height:350px!important}
      .phone-mode .mock-sleeper-ui .pool-player{grid-template-columns:50px 28px minmax(0,1fr)!important;padding:5px 6px!important;gap:5px!important;min-height:45px!important}
      .phone-mode .mock-sleeper-ui .pool-player>.photo{width:28px!important;height:28px!important;flex-basis:28px!important}
      .phone-mode .mock-sleeper-ui .pool-player .draft-btn{width:48px!important;height:25px!important;min-height:25px!important}
      .phone-mode .mock-sleeper-ui .mock-team-grid{grid-template-columns:1fr!important;max-width:none}
    }
  `;
  document.head.appendChild(style);

  const teamSelect=document.getElementById('mockTeams');
  const syncTeamCount=()=>{
    const n=Math.max(1,Math.min(20,Number(teamSelect?.value)||10));
    section.style.setProperty('--mock-team-count',String(n));
  };
  syncTeamCount();
  teamSelect?.addEventListener('change',syncTeamCount);
  document.getElementById('startMock')?.addEventListener('click',syncTeamCount);
})();