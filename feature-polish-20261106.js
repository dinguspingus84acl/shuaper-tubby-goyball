/* Context headers, depth roster hierarchy and loading surfaces.
   All player, game and opponent values are read from the existing renderers. */
(()=>{
  'use strict';
  const body=document.body;
  const nav=document.getElementById('shuaCleanNav');
  const context=document.createElement('div');
  context.id='shuaVisualContext';
  context.setAttribute('aria-live','off');
  context.setAttribute('aria-label','Current section');
  context.innerHTML='<span class="shua-context-dot" aria-hidden="true"></span><span class="shua-context-parent"></span><span class="shua-context-divider" aria-hidden="true">/</span><strong></strong>';
  body.append(context);

  const names={
    rankings:'Rankings',analytics:'Analytics',teams:'My Teams',tools:'Tools',
    usage:'Usage',intelligence:'Fantasy Intelligence',consistency:'Consistency',
    teamsAnalytics:'Team Shares',injury:'Injury Impact',schedule:'Schedule',
    startsit:'Start / Sit',weekly:'Weekly Report',
    HOME:'Home',ALL:'Overall',QB:'Quarterbacks',RB:'Running Backs',
    WR:'Wide Receivers',TE:'Tight Ends',MYGUYS:'My Guys',DND:'Do Not Draft',
    MOCK:'Mock Draft',DEPTH:'Depth Chart',TRADE:'Trade Chart',
    ESPN:'Stats',STOCK:'Stock',MYTEAMS:'My Teams',WEATHER:'Weather'
  };
  const cleanText=value=>String(value||'').trim().replace(/\s+/g,' ');
  function currentSection(){
    if(body.classList.contains('shua-studio-open')){
      const key=document.getElementById('shuaAnalyticsSection')?.dataset.activeView||'usage';
      return ['Analytics',names[key==='teams'?'teamsAnalytics':key]||'Analytics'];
    }
    if(body.classList.contains('my-teams-open'))return ['My Teams','Rosters'];
    if(body.classList.contains('shua-stock-open'))return ['My Teams','Stock'];
    if(body.classList.contains('shua-weather-open'))return ['Tools','Weather'];
    if(body.classList.contains('stats-mode'))return ['Analytics','Stats'];
    const chosen=nav?.querySelector('.shua-clean-group.is-active');
    if(chosen){
      const group=chosen.dataset.shuaGroup||'rankings';
      const label=cleanText(chosen.querySelector('.shua-clean-current')?.textContent);
      return [names[group]||'Rankings',label&&label!=='Explore'?label:names[group]||'Overall'];
    }
    const active=document.querySelector('.positions .pos.active');
    const key=active?.dataset.pos||'ALL';
    return ['Rankings',names[key]||cleanText(active?.textContent)||'Overall'];
  }
  let scheduled=false;
  function updateContext(){
    scheduled=false;
    const [group,view]=currentSection();
    context.querySelector('.shua-context-parent').textContent=group;
    context.querySelector('strong').textContent=view;
    const modalOpen=document.getElementById('modal')?.classList.contains('open');
    context.classList.toggle('is-visible',window.scrollY>128&&!modalOpen);
  }
  function requestContext(){
    if(!scheduled){scheduled=true;requestAnimationFrame(updateContext);}
  }
  window.addEventListener('scroll',requestContext,{passive:true});
  window.addEventListener('resize',requestContext,{passive:true});
  document.addEventListener('click',()=>requestAnimationFrame(requestContext),true);
  if(nav)new MutationObserver(requestContext).observe(nav,{subtree:true,attributes:true,
    attributeFilter:['class','aria-selected']});
  const analytic=document.getElementById('shuaAnalyticsSection');
  if(analytic)new MutationObserver(requestContext).observe(analytic,{attributes:true,attributeFilter:['data-active-view']});
  requestContext();

  const depth=document.getElementById('depthGrid');
  function decorateDepth(){
    if(!depth)return;
    depth.querySelectorAll('.depth-card').forEach(card=>{
      const rows=[...card.querySelectorAll('.depth-player')];
      let guide=card.querySelector('.shua-depth-group-label');
      if(!guide){
        guide=document.createElement('div');guide.className='shua-depth-group-label';
        const caption=document.createElement('span');caption.textContent='Depth order';
        const count=document.createElement('span');count.textContent=rows.length+' player'+(rows.length===1?'':'s');
        guide.append(caption,count);card.querySelector('h3')?.insertAdjacentElement('afterend',guide);
      }
      rows.forEach((row,index)=>{
        row.dataset.depthOrder=String(index+1);
        row.setAttribute('aria-label',(index===0?'Starter':'Backup '+index)+': '+cleanText(row.querySelector('span:last-of-type')?.textContent));
        if(!row.querySelector('.shua-depth-tier')){
          const tag=document.createElement('small');tag.className='shua-depth-tier';
          tag.textContent=index===0?'STARTER':String(index+1)+'ND';
          if(index===2)tag.textContent='3RD';
          else if(index>=3)tag.textContent=String(index+1)+'TH';
          row.append(tag);
        }
      });
    });
  }
  if(depth){
    new MutationObserver(()=>requestAnimationFrame(decorateDepth)).observe(depth,{childList:true});
    decorateDepth();
  }

  const stats=document.getElementById('espnLiveRows');
  function decorateStatsLoading(){
    if(!stats)return;
    const label=stats.querySelector(':scope > .espn-status');
    const loading=label&&/loading|fetching|getting|checking/i.test(label.textContent||'');
    if(!loading||stats.querySelector('.shua-feature-skeleton-list'))return;
    const list=document.createElement('div');list.className='shua-feature-skeleton-list';
    list.setAttribute('aria-hidden','true');
    for(let i=0;i<6;i++){
      const row=document.createElement('div');row.className='shua-feature-skeleton-row';
      list.append(row);
    }
    stats.append(list);
  }
  if(stats){new MutationObserver(decorateStatsLoading).observe(stats,{childList:true});decorateStatsLoading();}

  const modal=document.getElementById('modal');
  function decoratePlayerLoading(){
    modal?.querySelectorAll('.unified-profile-loading:not([data-shua-loading])').forEach(item=>{
      item.dataset.shuaLoading=/^loading\b/i.test(item.textContent.trim())?'true':'false';
    });
  }
  if(modal){new MutationObserver(decoratePlayerLoading).observe(modal,{subtree:true,childList:true});decoratePlayerLoading();}
})();
