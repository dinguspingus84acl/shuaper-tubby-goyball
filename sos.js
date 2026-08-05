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
    const team=normalizeTeam(parts[0]||'');
    const position=parts[1]||'';
    const rank=sos[team]&&sos[team][position];

    let box=document.getElementById('sosStat');
    if(!rank){if(box)box.remove();return;}
    if(!box){
      box=document.createElement('div');
      box.id='sosStat';
      box.className='stat';
      stats.appendChild(box);
    }
    box.innerHTML='<span>Strength of schedule</span><b>#'+rank+' of 32</b>';
    box.title='1 is easiest and 32 is hardest';
  }

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
