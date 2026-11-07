/* Present percentage usage metrics with decorative bars; raw values and
   sorting remain fully controlled by analytics/ui.js. */
(()=>{
  'use strict';
  const root=document.getElementById('shuaAnalyticsSection');
  if(!root)return;
  const selector='td[data-st-usage-field="snapShare"],td[data-st-usage-field="targetShare"],td[data-st-usage-field="routeParticipation"]';
  let pending=false;
  function decorate(){
    pending=false;
    root.querySelectorAll(selector).forEach(cell=>{
      if(cell.dataset.shuaMeter==='1')return;
      const raw=cell.textContent.trim();
      const matched=raw.match(/^(\d+(?:\.\d+)?)%$/);
      if(!matched)return; // Never present missing data as a measured zero.
      const pct=Number(matched[1]);
      if(!Number.isFinite(pct)||pct<0)return;
      const wrapper=document.createElement('span');wrapper.className='shua-usage-cell';
      const number=document.createElement('span');number.className='shua-usage-number';number.textContent=raw;
      const meter=document.createElement('i');meter.className='shua-usage-meter';
      meter.setAttribute('aria-hidden','true');
      meter.style.setProperty('--shua-usage-pct',Math.min(100,pct)+'%');
      wrapper.append(number,meter);
      cell.dataset.shuaMeter='1';cell.replaceChildren(wrapper);
    });
  }
  function requestDecorate(){
    if(pending)return;
    pending=true;requestAnimationFrame(decorate);
  }
  new MutationObserver(requestDecorate).observe(root,{subtree:true,childList:true});
  requestDecorate();
})();
