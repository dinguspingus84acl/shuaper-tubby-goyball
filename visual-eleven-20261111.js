/* Visual refinements #1, #2, #3, #6, #8, #9 and #10.
   This layer only presents existing data; it does not alter league results,
   ESPN projections, injury calculations or trade values. */
(()=>{
  'use strict';
  let pending=false;
  const allowedFace=/^https:\/\/(?:a\.espncdn\.com|cdn\.espn\.com|sleepercdn\.com|www\.sleepercdn\.com)\//i;

  function standings(){
    const root=document.getElementById('shuaMyTeams');
    if(!root)return;
    root.querySelectorAll('.myteams-roster:not([hidden])').forEach(panel=>{
      const item=root._cards?.[Number(panel.dataset.index)];
      const myTeam=String(item?.teamId??'');
      panel.querySelectorAll('.myteams-standings-line:not(.is-heading)').forEach(row=>{
        const id=row.querySelector('[data-myteams-team]')?.dataset.myteamsTeam;
        row.classList.toggle('shua-my-own-standing',Boolean(myTeam&&id&&String(id)===myTeam));
      });
    });
  }

  function roster(){
    const root=document.getElementById('shuaMyTeams');
    if(!root)return;
    root.querySelectorAll('.myteams-roster-row:not([data-shua-roster-group])').forEach(row=>{
      const slot=row.querySelector('.myteams-slot')?.textContent.trim().toUpperCase();
      row.dataset.shuaRosterGroup=slot==='BENCH'?'bench':slot==='IR'?'ir':'starter';
    });
  }

  function measuredInjury(){
    const root=document.getElementById('shuaAnalyticsSection');
    if(root?.dataset.activeView!=='injury')return;
    root.querySelectorAll('.st-panel:not([data-shua-injury-compare])').forEach(panel=>{
      if(!/^With vs\. without\b/.test(panel.querySelector('.st-panel-head h3')?.textContent||''))return;
      const table=panel.querySelector('.st-chart .st-data table');
      const titles=[...table?.querySelectorAll('thead th')||[]].map(th=>th.textContent.trim());
      if(titles[1]!=='With starter'||titles[2]!=='In reported Out weeks')return;
      const data=[...table.querySelectorAll('tbody tr')].map(tr=>{
        const name=tr.querySelector('th')?.textContent.trim()||'';
        const cells=[...tr.querySelectorAll('td')].slice(0,2).map(td=>td.textContent.trim());
        const nums=cells.map(s=>/^-?\d+(?:\.\d+)?$/.test(s)?Number(s):null);
        return {name,cells,nums};
      }).filter(r=>r.name&&r.nums.some(Number.isFinite));
      if(!data.length)return;
      const max=Math.max(1,...data.flatMap(r=>r.nums.filter(Number.isFinite)).map(Math.abs));
      const grid=document.createElement('div');grid.className='shua-injury-measured';
      const header=document.createElement('div');header.className='shua-injury-measured-line is-heading';
      ['Teammate','With starter','Out weeks'].forEach(label=>{const el=document.createElement('span');el.textContent=label;header.append(el);});
      grid.append(header);
      data.forEach(({name,cells,nums})=>{
        const line=document.createElement('div');line.className='shua-injury-measured-line';
        const person=document.createElement('strong');person.textContent=name;line.append(person);
        nums.forEach((num,i)=>{
          const cell=document.createElement('span');cell.className='shua-injury-measure'+(i?' is-out':'');
          const label=document.createElement('b');label.textContent=cells[i]||'—';
          cell.append(label);
          if(Number.isFinite(num)){
            const bar=document.createElement('i');bar.className='shua-injury-measure-bar';
            bar.style.width=Math.max(0,Math.min(100,100*Math.abs(num)/max))+'%';
            cell.append(bar);
          }
          line.append(cell);
        });grid.append(line);
      });
      panel.querySelector('.st-chart')?.before(grid);
      panel.dataset.shuaInjuryCompare='1';
    });
  }

  function scheduleLegend(){
    const root=document.getElementById('shuaAnalyticsSection');
    if(root?.dataset.activeView!=='schedule')return;
    root.querySelectorAll('.st-schedule-heatmap-panel:not([data-shua-difficulty-legend])').forEach(panel=>{
      if(panel.querySelector('.st-heat-legend')){panel.dataset.shuaDifficultyLegend='1';return;}
      const scroll=panel.querySelector('.st-heat-scroll');if(!scroll)return;
      const legend=document.createElement('div');legend.className='st-heat-legend shua-difficulty-legend';
      legend.setAttribute('aria-label','Matchup difficulty colors');
      [['easy','Easier'],['neutral','Average'],['tough','Harder'],['bye','Bye']].forEach(([tone,label])=>{
        const item=document.createElement('span'),dot=document.createElement('i');dot.className='shua-difficulty-key '+tone;
        item.append(dot,document.createTextNode(label));legend.append(item);
      });
      scroll.before(legend);panel.dataset.shuaDifficultyLegend='1';
    });
  }

  function tradeFaces(){
    const root=document.getElementById('tradeChartPanel');if(!root)return;
    root.querySelectorAll('.tcc-player:not([data-shua-trade-face])').forEach(row=>{
      const logo=row.querySelector('.tcc-logo');
      const name=row.querySelector('.tcc-player-name')?.textContent.trim();
      if(!logo||!name)return;
      const wrap=document.createElement('span');wrap.className='shua-tcc-avatar';
      const face=document.createElement('img');face.className='shua-tcc-face';face.alt='';face.loading='lazy';face.decoding='async';
      let url='';try{url=window.ShuaPlayerFaces?.url(name)||'';}catch(_){url='';}
      if(allowedFace.test(url)){
        face.src=url;
        face.addEventListener('error',()=>{face.remove();wrap.classList.add('no-photo');},{once:true});
        wrap.append(face);
      }else wrap.classList.add('no-photo');
      logo.replaceWith(wrap);wrap.append(logo);row.dataset.shuaTradeFace='1';
    });
  }

  function update(){pending=false;standings();roster();measuredInjury();scheduleLegend();tradeFaces();}
  function schedule(){if(pending)return;pending=true;requestAnimationFrame(update);}
  function observe(id){
    const target=document.getElementById(id);if(!target)return false;
    new MutationObserver(schedule).observe(target,{childList:true,subtree:true});return true;
  }
  ['shuaMyTeams','shuaAnalyticsSection','tradeChartPanel'].forEach(id=>{
    if(!observe(id))document.addEventListener('DOMContentLoaded',()=>observe(id),{once:true});
  });
  document.addEventListener('DOMContentLoaded',schedule,{once:true});schedule();
  window.ShuaVisualEleven={update};
})();
