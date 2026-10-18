(function(){
  let sos={};
  const aliases={GB:'GNB',KC:'KAN',LV:'LVR',NE:'NWE',NO:'NOR',SF:'SFO',TB:'TAM',WSH:'WAS'};
  const normalizeTeam=t=>aliases[t]||t;

  fetch('strength-of-schedule.json',{cache:'no-store'})
    .then(r=>r.json())
    .then(d=>{sos=d.teams||{}; refresh();})
    .catch(()=>{});

  function refresh(){
    const modal=document.getElementById('modal');
    const stats=document.getElementById('stats');
    const meta=document.getElementById('pm');
    if(!modal||!stats||!meta||!modal.classList.contains('open'))return;

    const parts=meta.textContent.split('·').map(x=>x.trim());
    const team=normalizeTeam(parts[parts.length-2]||'');
    const position=parts[parts.length-1]||'';
    const rank=sos[team]&&sos[team][position];

    let box=document.getElementById('sosStat');
    if(!rank){if(box)box.remove();return;}
    if(!box){
      box=document.createElement('div');
      box.id='sosStat';
      box.className='stat';
      stats.appendChild(box);
    }
    box.innerHTML='<span>Strength of Schedule ↗</span><b>#'+rank+' of 32</b>';
    box.title='Open 2026 Schedule heatmap · #1 easiest, #32 hardest';
    box.setAttribute('role','button');
    box.setAttribute('tabindex','0');
    box.setAttribute('aria-label','Open '+position+' Strength of Schedule heatmap for '+(modal.dataset.unifiedName||document.getElementById('pn')?.textContent||'this player'));
  }

  async function openFromStrengthOfSchedule(){
    const modal=document.getElementById('modal');
    if(!modal?.classList.contains('open'))return;
    const name=(modal.dataset.unifiedName||document.getElementById('pn')?.textContent||'').trim();
    const parts=(document.getElementById('pm')?.textContent||'').split('·').map(t=>t.trim());
    const position=parts[parts.length-1]||'';
    if(!name)return;
    document.getElementById('close')?.click();
    try{
      if(window.ShuaStudioLoader?.load)await window.ShuaStudioLoader.load();
      if(window.ShuaStudio?.UI?.openSchedule){
        window.ShuaStudio.UI.openSchedule(name,position);
        return;
      }
    }catch(e){}
    window.location.hash='analytics/schedule';
    if(window.ShuaStudioLoader?.open)window.ShuaStudioLoader.open();
    else document.getElementById('studioNav')?.click();
  }
  document.addEventListener('click',e=>{
    const target=e.target.closest?.('#sosStat');
    if(!target)return;
    e.preventDefault();e.stopPropagation();
    void openFromStrengthOfSchedule();
  });
  document.addEventListener('keydown',e=>{
    if((e.key==='Enter'||e.key===' ')&&e.target.closest?.('#sosStat')){
      e.preventDefault();void openFromStrengthOfSchedule();
    }
  });
  const sosStyle=document.createElement('style');
  sosStyle.id='sosScheduleLinkStyles';
  sosStyle.textContent='#sosStat[role=button]{cursor:pointer;border-color:#207e78!important;transition:background .15s,border-color .15s}#sosStat[role=button]:hover,#sosStat[role=button]:focus-visible{background:#10443c!important;border-color:#24efa0!important}#sosStat[role=button]:focus-visible{outline:2px solid #24efa0;outline-offset:3px}#sosStat[role=button] span{color:#cafcef!important}';
  document.head.append(sosStyle);

  const observer=new MutationObserver(refresh);
  document.addEventListener('DOMContentLoaded',()=>{
    const modal=document.getElementById('modal');
    const stats=document.getElementById('stats');
    const meta=document.getElementById('pm');
    if(modal)observer.observe(modal,{attributes:true,attributeFilter:['class']});
    if(stats)observer.observe(stats,{childList:true});
    if(meta)observer.observe(meta,{childList:true,characterData:true,subtree:true});
    document.addEventListener('click',()=>setTimeout(refresh,0),true);
  });
})();
