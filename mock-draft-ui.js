(()=>{
  const section=document.getElementById('mockSection');
  const draftBoard=document.getElementById('draftBoard');
  const pool=document.querySelector('.player-pool');
  const roster=document.getElementById('myRoster');
  if(!section||!draftBoard||!pool||!roster)return;

  section.classList.add('mock-sleeper-ui');

  const style=document.createElement('style');
  style.id='mockSleeperStyles';
  style.textContent=`
    .mock-sleeper-ui{--mock-blue:#12355a;--mock-panel:#07182a;--mock-line:#ffffff24;--mock-muted:#7f93aa}
    .mock-sleeper-ui .mock-setup{background:#081a2d;border-color:var(--mock-line);border-radius:12px;margin-bottom:8px;padding:10px}
    .mock-sleeper-ui .mock-status{margin:8px 0;padding:9px 11px;background:#07182a;border-color:var(--mock-line);font-size:.82rem}
    .mock-sleeper-ui .mock-actions{margin:0 0 8px}
    .mock-sleeper-ui .mock-actions .mock-btn{min-height:34px;padding:6px 10px;font-size:.76rem}
    .mock-sleeper-ui .mock-layout{display:block!important;width:100%;min-width:0}
    .mock-sleeper-ui .mock-layout>div:first-child{min-width:0}
    .mock-sleeper-ui #draftBoard{display:grid!important;grid-template-columns:repeat(var(--mock-teams,10),minmax(108px,1fr))!important;gap:2px!important;overflow-x:auto!important;background:#04101e;border:1px solid var(--mock-line);border-radius:10px 10px 0 0;padding:2px;scrollbar-width:thin}
    .mock-sleeper-ui #draftBoard .sleeper-team-head{position:sticky;top:0;z-index:3;min-height:34px;display:flex;align-items:center;justify-content:center;padding:4px 2px;background:#0b2239;color:#9eb1c6;border-bottom:1px solid var(--mock-line);font-size:.68rem;font-weight:900;text-align:center}
    .mock-sleeper-ui #draftBoard .sleeper-team-head.mine{background:#153d67;color:#fff;box-shadow:inset 0 -2px 0 #4da3ff}
    .mock-sleeper-ui #draftBoard .drafted{min-width:0!important;min-height:72px!important;border-radius:4px!important;padding:7px!important;box-shadow:none!important}
    .mock-sleeper-ui #draftBoard .drafted .slot{font-size:.58rem!important;opacity:.7;margin-bottom:5px}
    .mock-sleeper-ui #draftBoard .drafted .name{font-size:.72rem!important;line-height:1.05;white-space:normal!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .mock-sleeper-ui #draftBoard .drafted .team{font-size:.58rem!important;margin-top:5px;opacity:.78}
    .mock-sleeper-ui #draftBoard .drafted.empty-slot{background:#0a1d31!important;border:1px dashed #ffffff18;color:#5d7188!important}
    .mock-sleeper-ui .sleeper-tabs{display:flex;align-items:center;height:46px;background:#061522;border:1px solid var(--mock-line);border-top:0;overflow:hidden}
    .mock-sleeper-ui .sleeper-tab{flex:1;height:100%;border:0;border-radius:0;background:transparent;color:#6f8298;font-size:.72rem;font-weight:950;letter-spacing:.08em;text-transform:uppercase;position:relative}
    .mock-sleeper-ui .sleeper-tab.active{background:transparent!important;color:#fff!important}
    .mock-sleeper-ui .sleeper-tab.active:after{content:'';position:absolute;left:24%;right:24%;bottom:0;height:3px;background:#4aa4ff;border-radius:3px 3px 0 0}
    .mock-sleeper-ui .player-pool{position:static!important;width:100%!important;max-height:none!important;border-radius:0 0 12px 12px;border-top:0;background:#07182a}
    .mock-sleeper-ui .pool-head{position:sticky;top:0;z-index:6;padding:9px 10px 8px;background:#07182af5;border-bottom:1px solid var(--mock-line)}
    .mock-sleeper-ui .pool-head input{height:38px;background:#0b2139;color:#fff;border:1px solid #ffffff24;padding:0 12px;border-radius:20px;outline:none}
    .mock-sleeper-ui .pool-head input::placeholder{color:#72879d}
    .mock-sleeper-ui .mock-filters{display:flex!important;gap:7px!important;flex-wrap:nowrap!important;overflow-x:auto!important;width:100%;margin-top:8px;padding-bottom:2px}
    .mock-sleeper-ui .pool-filter{flex:0 0 auto!important;width:42px;height:42px;min-height:42px!important;padding:0!important;border-radius:50%!important;background:#0b2139!important;border:1px solid #ffffff25!important;color:#7d92a8!important;font-size:.64rem!important}
    .mock-sleeper-ui .pool-filter[data-filter='ALL']{width:46px;border-radius:23px!important}
    .mock-sleeper-ui .pool-filter.primary{background:#eef4f8!important;color:#07182a!important;border-color:#eef4f8!important}
    .mock-sleeper-ui .sleeper-pool-labels{display:grid;grid-template-columns:70px minmax(0,1fr) 46px 46px;gap:7px;padding:7px 10px 5px;color:#647a91;font-size:.58rem;font-weight:900;text-transform:uppercase;letter-spacing:.05em}
    .mock-sleeper-ui .sleeper-pool-labels span:nth-child(2){text-align:left}.mock-sleeper-ui .sleeper-pool-labels span:nth-child(n+3){text-align:center}
    .mock-sleeper-ui .pool-list{height:min(52vh,520px)!important;min-height:320px!important;overflow-y:auto!important;background:#07182a}
    .mock-sleeper-ui .pool-player{display:grid!important;grid-template-columns:70px 36px minmax(0,1fr) 46px 46px!important;grid-template-areas:'action photo player adp ppg';gap:7px!important;align-items:center!important;padding:9px 10px!important;border-top:1px solid #ffffff12!important;min-height:58px}
    .mock-sleeper-ui .pool-player>.pool-rank{display:none!important}
    .mock-sleeper-ui .pool-player>.photo{grid-area:photo;width:34px!important;height:34px!important;flex:0 0 34px!important;border-width:1px!important}
    .mock-sleeper-ui .pool-player>span[data-id]{grid-area:player;min-width:0;cursor:pointer}
    .mock-sleeper-ui .pool-player>span[data-id]>b{display:block;font-size:.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .mock-sleeper-ui .pool-player .pool-meta{font-size:.62rem!important;color:#71869d!important;margin-top:2px}
    .mock-sleeper-ui .pool-player .draft-btn{grid-area:action;min-width:0!important;width:66px;height:30px;min-height:30px!important;padding:0 8px!important;border:1px solid #53677d!important;border-radius:15px!important;background:transparent!important;color:#8195aa!important;font-size:.66rem!important;font-weight:900!important}
    .mock-sleeper-ui .pool-player .draft-btn:not(:disabled){border-color:#4da3ff!important;color:#cde6ff!important;background:#0d2c49!important}
    .mock-sleeper-ui .pool-player .sleeper-adp,.mock-sleeper-ui .pool-player .sleeper-ppg{text-align:center;font-size:.7rem;font-weight:900;color:#d5e0eb}
    .mock-sleeper-ui .pool-player .sleeper-adp{grid-area:adp}.mock-sleeper-ui .pool-player .sleeper-ppg{grid-area:ppg}
    .mock-sleeper-ui .sleeper-team-pane{padding:8px 0 2px;background:#07182a;border:1px solid var(--mock-line);border-top:0;border-radius:0 0 12px 12px}
    .mock-sleeper-ui .sleeper-team-pane>h3,.mock-sleeper-ui .bench-heading{display:none!important}
    .mock-sleeper-ui #myRoster{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;padding:8px}
    .mock-sleeper-ui #myRoster .roster-card{min-height:60px;padding:8px 8px 8px 50px;border-radius:8px;background:#0b2139}
    .mock-sleeper-ui #myRoster .roster-card>.photo{left:8px;top:10px;width:32px;height:32px}
    .mock-sleeper-ui #myRoster .roster-card b{font-size:.72rem}.mock-sleeper-ui #myRoster .roster-card span{font-size:.62rem;color:#7e92a7}
    @media(max-width:650px){
      .phone-mode .mock-sleeper-ui{margin-left:-2px;margin-right:-2px}
      .phone-mode .mock-sleeper-ui .mock-setup{display:grid!important;grid-template-columns:1fr 1fr;gap:7px!important}
      .phone-mode .mock-sleeper-ui .mock-setup #startMock{grid-column:1/-1;min-height:40px}
      .phone-mode .mock-sleeper-ui .mock-actions{display:flex!important;gap:6px!important}
      .phone-mode .mock-sleeper-ui #draftBoard{grid-template-columns:repeat(var(--mock-teams,10),82px)!important;max-height:255px;overflow:auto!important;border-radius:8px 8px 0 0}
      .phone-mode .mock-sleeper-ui #draftBoard .drafted{min-height:66px!important;padding:6px!important}
      .phone-mode .mock-sleeper-ui #draftBoard .drafted .name{font-size:.66rem!important}
      .phone-mode .mock-sleeper-ui .player-pool{order:initial!important}
      .phone-mode .mock-sleeper-ui .pool-list{height:46vh!important;min-height:300px!important}
      .phone-mode .mock-sleeper-ui .pool-player{grid-template-columns:62px 34px minmax(0,1fr) 42px 42px!important;padding:8px 7px!important;gap:5px!important}
      .phone-mode .mock-sleeper-ui .pool-player .draft-btn{width:58px!important;font-size:.62rem!important}
      .phone-mode .mock-sleeper-ui .sleeper-pool-labels{grid-template-columns:62px minmax(0,1fr) 42px 42px;padding-left:7px;padding-right:7px}
      .phone-mode .mock-sleeper-ui #myRoster{grid-template-columns:1fr 1fr;padding:7px}
    }
  `;
  document.head.appendChild(style);

  const boardParent=draftBoard.parentElement;
  const teamPane=roster.parentElement;
  teamPane.classList.add('sleeper-team-pane');

  const tabs=document.createElement('div');
  tabs.className='sleeper-tabs';
  tabs.innerHTML='<button type="button" class="sleeper-tab active" data-sleeper-tab="players">Players</button><button type="button" class="sleeper-tab" data-sleeper-tab="team">Team</button>';
  boardParent.insertBefore(tabs,teamPane);

  function setTab(tab){
    tabs.querySelectorAll('.sleeper-tab').forEach(b=>b.classList.toggle('active',b.dataset.sleeperTab===tab));
    pool.hidden=tab!=='players';
    teamPane.hidden=tab!=='team';
  }
  tabs.addEventListener('click',e=>{const b=e.target.closest('[data-sleeper-tab]');if(b)setTab(b.dataset.sleeperTab)});
  setTab('players');

  const labels=document.createElement('div');
  labels.className='sleeper-pool-labels';
  labels.innerHTML='<span></span><span>Players</span><span>ADP</span><span>2025</span>';
  const head=pool.querySelector('.pool-head');
  if(head)head.appendChild(labels);

  function getTeams(){
    try{return mock?.active?mock.teams:+document.getElementById('mockTeams').value||10}catch(e){return +document.getElementById('mockTeams').value||10}
  }
  function getMySlot(){try{return mock?.active?mock.slot:+document.getElementById('mockSlot').value||1}catch(e){return +document.getElementById('mockSlot').value||1}}

  function ensureTeamHeaders(){
    const teams=getTeams();
    draftBoard.style.setProperty('--mock-teams',teams);
    if(!draftBoard.children.length)return;
    const existing=[...draftBoard.querySelectorAll('.sleeper-team-head')];
    if(existing.length===teams)return;
    existing.forEach(x=>x.remove());
    const mine=getMySlot();
    let html='';
    for(let i=1;i<=teams;i++)html+=`<div class="sleeper-team-head${i===mine?' mine':''}">Team ${i}</div>`;
    draftBoard.insertAdjacentHTML('afterbegin',html);
  }

  function findPlayer(id){
    try{return players.find(p=>p.id===id)||board.find(p=>p.id===id)||null}catch(e){return null}
  }
  function getPpg(p){
    try{
      if(!p)return'—';
      const key=N(p.name);
      if(p.position==='QB')return qbPpgRanks.get(key)||'—';
      if(p.position==='RB')return rbPpgRanks.get(key)||'—';
      if(p.position==='WR')return wrPpgRanks.get(key)||'—';
      if(p.position==='TE')return tePpgRanks.get(key)||'—';
    }catch(e){}
    return'—';
  }
  function decoratePool(){
    document.querySelectorAll('#poolList .pool-player').forEach(row=>{
      const span=row.querySelector('span[data-id]');
      if(!span)return;
      const p=findPlayer(span.dataset.id);
      let adp=row.querySelector('.sleeper-adp');
      let ppg=row.querySelector('.sleeper-ppg');
      if(!adp){adp=document.createElement('div');adp.className='sleeper-adp';row.appendChild(adp)}
      if(!ppg){ppg=document.createElement('div');ppg.className='sleeper-ppg';row.appendChild(ppg)}
      adp.textContent=p?.additionalStats?.espnAdp||'—';
      ppg.textContent=getPpg(p);
    });
  }

  const observer=new MutationObserver(()=>{
    ensureTeamHeaders();
    decoratePool();
  });
  observer.observe(section,{childList:true,subtree:true});

  document.getElementById('mockTeams')?.addEventListener('change',()=>requestAnimationFrame(ensureTeamHeaders));
  document.getElementById('mockSlot')?.addEventListener('change',()=>requestAnimationFrame(ensureTeamHeaders));
  document.getElementById('startMock')?.addEventListener('click',()=>requestAnimationFrame(()=>{ensureTeamHeaders();decoratePool()}));

  ensureTeamHeaders();
  decoratePool();
})();