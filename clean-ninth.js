/* Small, source-backed Analytics freshness label. The existing chart and
   player-search state remain owned by the original components. */
(()=>{
  'use strict';
  let section=null;
  let pending=false;
  function sync(){
    pending=false;
    const workspace=section.querySelector('#stWorkspace');
    const data=window.ShuaStudio?.UI?.dataset;
    if(!workspace||section.dataset.ready!=='true'||!data)return;
    let stamp=workspace.querySelector(':scope > .shua-analytics-fetched');
    if(!stamp){
      stamp=document.createElement('time');
      stamp.className='shua-analytics-fetched';
      stamp.setAttribute('aria-label','Analytics data freshness');
      workspace.prepend(stamp);
    }
    const sourceDate=data.snapshotAt||data.generatedAt||data.fetchedAt;
    const date=sourceDate?new Date(sourceDate):null;
    const valid=date&&Number.isFinite(date.getTime());
    const label=valid?'Analytics snapshot '+date.toLocaleDateString([], {month:'short',day:'numeric'})+' · '+date.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}):data.year+' season snapshot';
    if(stamp.textContent!==label)stamp.textContent=label;
    if(valid&&stamp.dateTime!==date.toISOString())stamp.dateTime=date.toISOString();
  }
  function queue(){
    if(pending)return;
    pending=true;
    requestAnimationFrame(sync);
  }
  function watchStudio(){
    if(section)return true;
    const found=document.getElementById('shuaAnalyticsSection');
    if(!found)return false;
    section=found;
    new MutationObserver(queue).observe(section,{
      attributes:true,attributeFilter:['data-ready','data-active-view'],
      childList:true,subtree:true
    });
    queue();
    return true;
  }
  // Analytics is loaded on demand from analytics-dashboard.js, so the section
  // usually does not exist when this footer script first runs.
  if(!watchStudio()){
    const parent=document.querySelector('main')||document.body;
    const waiting=new MutationObserver(()=>{if(watchStudio())waiting.disconnect();});
    waiting.observe(parent,{childList:true,subtree:true});
  }
})();
