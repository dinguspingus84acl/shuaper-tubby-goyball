/* Visual comparison headers use the existing player cards and chart palette.
   The original pickers, comparisons, and chart remain untouched. */
(()=>{
  'use strict';
  function decorateCompare(section){
    if(section?.dataset.activeView!=='startsit')return;
    const cards=[...section.querySelectorAll('#stContent .st-comparison > .st-feature')];
    const panels=[...section.querySelectorAll('#stContent .st-panel')];
    const panel=panels.find(el=>el.querySelector('.st-panel-head h3')?.textContent?.trim()==='Recent scoring comparison');
    const chart=panel?.querySelector('.st-chart');
    if(!chart||!cards.length||panel.querySelector('.shua-compare-graph-players'))return;

    const palette=window.ShuaStudio?.Chart?.colors||['#3bd7ac','#69b8ed','#d4b57b','#ae9bdb'];
    const strip=document.createElement('div');
    strip.className='shua-compare-graph-players';
    strip.setAttribute('aria-label','Players in the scoring comparison');
    cards.forEach((card,i)=>{
      const name=card.querySelector('h4')?.textContent?.trim();
      if(!name)return;
      const mini=document.createElement('div');
      mini.className='shua-compare-graph-player';
      mini.style.setProperty('--compare-series-color',palette[i%palette.length]);

      const avatar=card.querySelector('.st-feature-top .st-face');
      if(avatar){
        const copy=avatar.cloneNode(true);
        copy.className=copy.tagName==='IMG'?'st-face':'st-face st-avatar-fallback';
        mini.append(copy);
      }
      const identity=document.createElement('div');
      identity.className='shua-compare-graph-copy';
      const label=document.createElement('b');label.textContent=name;
      const meta=document.createElement('small');
      meta.textContent=card.querySelector('.st-player-meta')?.textContent?.trim()||'';
      identity.append(label,meta);mini.append(identity);

      const avg=card.querySelector('.st-compare-metric b')?.textContent?.trim();
      const score=document.createElement('div');score.className='shua-compare-graph-average';
      const value=document.createElement('strong');value.textContent=avg||'—';
      const unit=document.createElement('span');unit.textContent='Last 3 PPG';
      score.append(value,unit);mini.append(score);
      strip.append(mini);
    });
    if(strip.children.length)chart.before(strip);
  }
  window.ShuaVisualSix={decorateCompare};
})();
