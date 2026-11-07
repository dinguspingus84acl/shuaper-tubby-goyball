/* Additional navigation and chart presentation. No data or filter state edits. */
(() => {
  'use strict';

  // Move one physical indicator instead of animating four independent borders.
  function installNavIndicator(){
    const nav=document.getElementById('shuaCleanNav');
    const groups=nav?.querySelector('.shua-clean-groups');
    if(!groups||groups.querySelector('.shua-nav-indicator'))return;
    const indicator=document.createElement('span');
    indicator.className='shua-nav-indicator';
    indicator.setAttribute('aria-hidden','true');
    groups.append(indicator);
    let scheduled=false;

    function measure(){
      scheduled=false;
      const active=groups.querySelector('.shua-clean-group.is-active > .shua-clean-trigger');
      if(!active||!document.body.classList.contains('shua-clean')){
        indicator.classList.remove('is-ready');
        return;
      }
      const outer=groups.getBoundingClientRect();
      const inner=active.getBoundingClientRect();
      if(!outer.width||!inner.width)return;
      const inset=Math.min(20,Math.max(8,inner.width*.18));
      indicator.style.setProperty('--shua-indicator-x',(inner.left-outer.left+inset)+'px');
      indicator.style.setProperty('--shua-indicator-width',Math.max(12,inner.width-inset*2)+'px');
      indicator.classList.add('is-ready');
    }
    function schedule(){
      if(scheduled)return;
      scheduled=true;
      requestAnimationFrame(measure);
    }
    new MutationObserver(schedule).observe(groups,{subtree:true,attributes:true,attributeFilter:['class']});
    new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});
    if('ResizeObserver' in window){
      const ro=new ResizeObserver(schedule);
      ro.observe(groups);
      groups.querySelectorAll('.shua-clean-trigger').forEach(trigger=>ro.observe(trigger));
    }
    window.addEventListener('resize',schedule,{passive:true});
    window.visualViewport?.addEventListener('resize',schedule,{passive:true});
    schedule();
  }

  // Existing analytics tooltips supply the real period and series values.
  // This layer only follows the highlighted period with a vertical guideline.
  const svgNS='http://www.w3.org/2000/svg';
  function chartHit(target,event){
    const svg=target?.closest?.('svg[data-chart]');
    if(!svg)return null;
    let hit=target.closest?.('.st-chart-hit[data-point]');
    if(!hit&&event?.pointerType==='touch'&&event.buttons){
      const points=svg.querySelectorAll('.st-chart-hit[data-point]');
      let best=Infinity;
      for(const point of points){
        const rect=point.getBoundingClientRect();
        const distance=Math.abs(event.clientX-rect.left-rect.width/2);
        if(distance<best){hit=point;best=distance;}
      }
    }
    return hit?{svg,hit}:null;
  }
  function guideFor(svg){
    let guide=svg.querySelector('.shua-chart-guide');
    if(!guide){
      guide=document.createElementNS(svgNS,'line');
      guide.setAttribute('class','shua-chart-guide');
      guide.style.display='none';
      svg.append(guide);
    }
    return guide;
  }
  function highlight(target,event){
    const found=chartHit(target,event);
    if(!found)return;
    const {svg,hit}=found;
    const x=Number(hit.getAttribute('x'))+Number(hit.getAttribute('width'))/2;
    const y=Number(hit.getAttribute('y'));
    const bottom=y+Number(hit.getAttribute('height'));
    if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(bottom))return;
    const guide=guideFor(svg);
    guide.setAttribute('x1',x);
    guide.setAttribute('x2',x);
    guide.setAttribute('y1',y);
    guide.setAttribute('y2',bottom);
    guide.style.display='';

    const host=svg.closest('.st-chart');
    const tooltip=host?.querySelector('.st-tooltip');
    if(tooltip&&host){
      const chartRect=host.getBoundingClientRect();
      const svgRect=svg.getBoundingClientRect();
      const rect=hit.getBoundingClientRect();
      const targetX=rect.left+rect.width/2-chartRect.left;
      const width=Math.min(224,Math.max(145,chartRect.width-16));
      const left=Math.max(8,Math.min(chartRect.width-width-8,targetX-width/2));
      tooltip.style.setProperty('--shua-tooltip-left',left+'px');
      tooltip.style.setProperty('--shua-tooltip-top',Math.max(8,svgRect.top-chartRect.top+12)+'px');
    }
  }
  function hideGuide(svg){
    const guide=svg?.querySelector?.('.shua-chart-guide');
    if(guide)guide.style.display='none';
  }
  function installChartGuides(){
    document.addEventListener('pointerover',event=>highlight(event.target,event),true);
    document.addEventListener('pointerdown',event=>highlight(event.target,event),true);
    document.addEventListener('pointermove',event=>highlight(event.target,event),true);
    document.addEventListener('focusin',event=>highlight(event.target),true);
    document.addEventListener('pointerout',event=>{
      const svg=event.target.closest?.('svg[data-chart]');
      if(svg&&!svg.contains(event.relatedTarget))hideGuide(svg);
    },true);
    document.addEventListener('focusout',event=>{
      const svg=event.target.closest?.('svg[data-chart]');
      if(svg&&!svg.contains(event.relatedTarget))hideGuide(svg);
    },true);
  }

  function init(){installNavIndicator();installChartGuides();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
