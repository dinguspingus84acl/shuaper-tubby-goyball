/* The refreshed design is standard. The original markup and styles remain
   recoverable from the project's preserved Classic GitHub backup branch. */
(()=>{
  'use strict';

  const nav=document.querySelector('.positions');
  const tools=document.querySelector('.sticky .tools');
  if(!nav||!tools)return;

  const storageKey='shuaDesignMode';
  const requested=new URLSearchParams(location.search).get('design');
  // Ignore old saved Classic selections: without a toggle, nobody should be
  // stranded on the previous layout. ?design=classic remains a manual fallback.
  let mode=requested==='classic'?'classic':'clean';
  const analyticsViews=[
    {view:'usage',label:'Usage'},
    {view:'intelligence',label:'Fantasy Intelligence'},
    {view:'consistency',label:'Consistency'},
    {view:'teams',label:'Team Shares'},
    {view:'injury',label:'Injury Impact'},
    {view:'schedule',label:'Schedule'},
    {view:'startsit',label:'Start / Sit'},
    {view:'weekly',label:'Weekly Report'}
  ];
  const groups=[
    {id:'rankings',label:'Rankings',items:['HOME','ALL','QB','RB','WR','TE','MYGUYS','DND']},
    {id:'analytics',label:'Analytics',items:[...analyticsViews,'ESPN','COMPARE']},
    {id:'teams',label:'My Teams',items:['MYTEAMS','STOCK']},
    {id:'tools',label:'Tools',items:['SEARCH','MOCK','DEPTH','TRADE','COMMAND','WEATHER']}
  ];
  const cleanNav=document.createElement('nav');
  cleanNav.id='shuaCleanNav';
  cleanNav.setAttribute('aria-label','Fantasy site navigation');
  cleanNav.innerHTML='<span class="shua-clean-brand">GOYBALL<span class="shua-brand-dot">.</span></span>'+
    '<div class="shua-clean-groups">'+groups.map(group=>
      '<div class="shua-clean-group" data-shua-group="'+group.id+'">'+
        '<button type="button" class="shua-clean-trigger" aria-expanded="false" aria-controls="shua-menu-'+group.id+'">'+
          '<span class="shua-clean-group-name">'+group.label+'</span><span class="shua-clean-current">Explore</span></button>'+
        '<div class="shua-clean-popup" id="shua-menu-'+group.id+'" hidden></div></div>'
    ).join('')+'</div>';
  tools.prepend(cleanNav);

  function closeMenus(except=null){
    cleanNav.querySelectorAll('.shua-clean-group').forEach(group=>{
      if(group===except)return;
      group.classList.remove('is-open');
      group.classList.remove('is-dragging');
      group.querySelectorAll('.is-drag-hover').forEach(item=>item.classList.remove('is-drag-hover'));
      group.querySelector('.shua-clean-trigger')?.setAttribute('aria-expanded','false');
      const popup=group.querySelector('.shua-clean-popup');if(popup)popup.hidden=true;
    });
  }

  function openMenu(group){
    closeMenus();
    group.classList.add('is-open');
    group.querySelector('.shua-clean-trigger')?.setAttribute('aria-expanded','true');
    const popup=group.querySelector('.shua-clean-popup');if(popup)popup.hidden=false;
  }

  function populate(){
    for(const group of groups){
      const popup=cleanNav.querySelector('#shua-menu-'+group.id);
      if(!popup)continue;
      const html=group.items.map(item=>{
        if(typeof item==='object')return '<button type="button" data-shua-studio="'+item.view+'">'+item.label+'</button>';
        if(item==='SEARCH')return '<button type="button" data-shua-search="players">Search Players</button>';
        const original=nav.querySelector('.pos[data-pos="'+item+'"]');
        if(!original)return '';
        return '<button type="button" data-shua-target="'+item+'">'+original.textContent.trim()+'</button>';
      }).join('');
      if(popup.innerHTML!==html)popup.innerHTML=html;
    }
    syncSelected();
  }

  function syncSelected(){
    const active=nav.querySelector('.pos.active');
    const currentAnalytics=active?.dataset.pos==='ANALYTICS';
    const currentView=window.ShuaStudio?.UI?.state?.view;
    cleanNav.querySelectorAll('[data-shua-target]').forEach(item=>{
      const selected=item.dataset.shuaTarget===active?.dataset.pos;
      item.classList.toggle('is-selected',selected);
      if(selected)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current');
    });
    cleanNav.querySelectorAll('[data-shua-studio]').forEach(item=>{
      const selected=currentAnalytics&&item.dataset.shuaStudio===currentView;
      item.classList.toggle('is-selected',selected);
      if(selected)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current');
    });
    for(const group of groups){
      const container=cleanNav.querySelector('[data-shua-group="'+group.id+'"]');
      const child=group.items.some(item=>typeof item==='string'?
        item===active?.dataset.pos:active?.dataset.pos==='ANALYTICS');
      container?.classList.toggle('is-active',child);
      const label=container?.querySelector('.shua-clean-current');
      if(label)label.textContent=child?(group.id==='analytics'&&currentAnalytics?
        (analyticsViews.find(item=>item.view===currentView)?.label||'Analytics'):
        (active?.textContent.trim()||group.label)):'Explore';
    }
  }

  // Hold a bottom-navigation button and slide onto an option to preview it.
  // Releasing selects that option; an ordinary tap leaves the menu open.
  let press=null,ignoreNativeClick=null;
  function hoveredOption(event){
    if(!press)return null;
    const popup=press.group.querySelector('.shua-clean-popup');
    const hit=document.elementFromPoint(event.clientX,event.clientY)?.closest('.shua-clean-popup button');
    return hit&&popup?.contains(hit)?hit:null;
  }
  function previewOption(option){
    if(!press)return;
    press.group.querySelectorAll('.is-drag-hover').forEach(item=>item.classList.remove('is-drag-hover'));
    if(option)option.classList.add('is-drag-hover');
    press.option=option;
  }
  cleanNav.addEventListener('pointerdown',event=>{
    const trigger=event.target.closest('.shua-clean-trigger');
    if(!trigger||event.button!==0||event.isPrimary===false)return;
    const group=trigger.closest('.shua-clean-group');
    const alreadyOpen=group.classList.contains('is-open');
    if(!alreadyOpen)openMenu(group);
    group.classList.add('is-dragging');
    press={pointerId:event.pointerId,trigger,group,alreadyOpen,option:null};
  });
  document.addEventListener('pointermove',event=>{
    if(!press||event.pointerId!==press.pointerId)return;
    const popup=press.group.querySelector('.shua-clean-popup');
    const box=popup.getBoundingClientRect();
    if(event.clientY>=box.top&&event.clientY<=box.bottom&&popup.scrollHeight>popup.clientHeight){
      if(event.clientY<box.top+25)popup.scrollTop-=12;
      else if(event.clientY>box.bottom-25)popup.scrollTop+=12;
    }
    previewOption(hoveredOption(event));
  });
  document.addEventListener('pointerup',event=>{
    if(!press||event.pointerId!==press.pointerId)return;
    const gesture=press,chosen=hoveredOption(event);
    previewOption(null);
    gesture.group.classList.remove('is-dragging');
    press=null;
    const guard={};ignoreNativeClick=guard;
    setTimeout(()=>{if(ignoreNativeClick===guard)ignoreNativeClick=null;},0);
    if(chosen)chosen.click();
    else if(gesture.alreadyOpen)closeMenus();
  });
  document.addEventListener('pointercancel',event=>{
    if(!press||event.pointerId!==press.pointerId)return;
    previewOption(null);press=null;closeMenus();
  });

  cleanNav.addEventListener('click',event=>{
    // A pointer-generated click follows pointerup. Selection was already
    // handled there; keyboard clicks still use the regular accessible menu.
    if(ignoreNativeClick&&event.isTrusted&&event.detail>0){
      ignoreNativeClick=null;event.preventDefault();return;
    }
    if(event.target.closest('[data-shua-search="players"]')){
      closeMenus();
      window.ShuaPlayerSearch?.open?.();
      return;
    }
    const chart=event.target.closest('[data-shua-studio]');
    if(chart){
      const view=chart.dataset.shuaStudio;
      closeMenus();
      const activate=api=>{api.navigate(view);syncSelected();requestAnimationFrame(syncSelected);};
      const api=window.ShuaStudio?.UI;
      if(api?.navigate)activate(api);
      else if(window.ShuaStudioLoader?.load){
        window.ShuaStudioLoader.load().then(activate).catch(()=>{
          nav.querySelector('.pos[data-pos="ANALYTICS"]')?.click();
        });
      }else nav.querySelector('.pos[data-pos="ANALYTICS"]')?.click();
      return;
    }
    const item=event.target.closest('[data-shua-target]');
    if(item){
      const original=nav.querySelector('.pos[data-pos="'+item.dataset.shuaTarget+'"]');
      closeMenus();
      if(original){original.click();requestAnimationFrame(syncSelected);}
      return;
    }
    const trigger=event.target.closest('.shua-clean-trigger');
    if(!trigger)return;
    const group=trigger.closest('.shua-clean-group');
    const shouldOpen=!group.classList.contains('is-open');
    if(shouldOpen)openMenu(group);else closeMenus();
  });
  document.addEventListener('click',event=>{if(!cleanNav.contains(event.target))closeMenus();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){press=null;closeMenus();}});
  new MutationObserver(()=>requestAnimationFrame(populate)).observe(nav,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});

  // Notes stay intact and available in full, without dominating each ranking row.
  const rows=document.getElementById('rows');
  function decorateNotes(){
    if(mode!=='clean'||!rows)return;
    rows.querySelectorAll('td.notes:not([data-shua-note])').forEach(cell=>{
      const original=cell.textContent.trim();
      if(original.length<70)return;
      cell.dataset.shuaNote=original;
      const excerpt=document.createElement('span');
      excerpt.className='shua-note-excerpt';
      excerpt.textContent=original;
      const action=document.createElement('button');
      action.type='button';
      action.className='shua-note-toggle';
      action.textContent='Read full note';
      action.setAttribute('aria-expanded','false');
      action.addEventListener('click',event=>{
        event.preventDefault();event.stopPropagation();
        const expanded=cell.classList.toggle('is-expanded');
        action.textContent=expanded?'Show less':'Read full note';
        action.setAttribute('aria-expanded',String(expanded));
      });
      cell.replaceChildren(excerpt,action);
    });
  }
  function restoreNotes(){
    if(!rows)return;
    rows.querySelectorAll('td.notes[data-shua-note]').forEach(cell=>{
      cell.replaceChildren(document.createTextNode(cell.dataset.shuaNote));
      cell.classList.remove('is-expanded');
      delete cell.dataset.shuaNote;
    });
  }
  if(rows)new MutationObserver(()=>{if(mode==='clean')requestAnimationFrame(decorateNotes);}).observe(rows,{childList:true});

  // The Weather tab uses only published forecasts. Separate pending cards visually.
  const weather=document.getElementById('shuaWeatherSection');
  function groupWeather(){
    if(mode!=='clean')return;
    const container=document.getElementById('wxGames');
    if(!container)return;
    const cards=[...container.querySelectorAll(':scope > .wx-game')];
    if(!cards.length)return;
    const ready=cards.filter(card=>!card.querySelector('.wx-impact-pending'));
    const pending=cards.filter(card=>card.querySelector('.wx-impact-pending'));
    const order=[...ready,...pending];
    const current=[...container.children];
    const heading=container.querySelector(':scope > .shua-wx-heading');
    const cardsSorted=cards.every((card,index)=>card===order[index]);
    const headingIsPlaced=pending.length?
      heading===current[ready.length]:!heading;
    if(cardsSorted&&headingIsPlaced&&container.querySelectorAll(':scope > .shua-wx-heading').length===(pending.length?1:0))return;
    const newHeading=document.createElement('h3');
    newHeading.className='shua-wx-heading';
    newHeading.textContent='Awaiting forecasts · '+pending.length+' games';
    container.replaceChildren(...ready,...(pending.length?[newHeading]:[]),...pending);
  }
  // Weather is rendered asynchronously, so watch only the list rather than the page.
  function watchWeather(){
    const container=document.getElementById('wxGames');
    if(!container||container.dataset.shuaObserver)return;
    container.dataset.shuaObserver='1';
    new MutationObserver(()=>{if(mode==='clean')requestAnimationFrame(groupWeather);})
      .observe(container,{childList:true});
    groupWeather();
  }
  if(weather)new MutationObserver(watchWeather).observe(weather,{childList:true});

  function refreshWeatherOrder(){
    const selected=weather?.querySelector('#wxFilters [data-wx-filter][aria-pressed="true"]');
    if(selected)selected.click();
    if(mode==='clean')requestAnimationFrame(groupWeather);
  }

  function apply(next){
    mode=next==='classic'?'classic':'clean';
    document.body.classList.toggle('shua-clean',mode==='clean');
    try{localStorage.setItem(storageKey,mode);}catch(_){}
    if(mode==='clean'){populate();decorateNotes();watchWeather();}
    else{closeMenus();restoreNotes();}
    refreshWeatherOrder();
  }
  populate();
  apply(mode);
  window.ShuaDesign={get mode(){return mode;},setMode:apply};
})();
