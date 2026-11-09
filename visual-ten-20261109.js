/* Presentation-only layer for improvements 2, 3, 7, 8 and 10.
   ESPN data, stat formulas, rankings and trade valuations remain untouched. */
(()=>{
  'use strict';
  const nflColors={
    ARI:'#97233f',ATL:'#a71930',BAL:'#7551aa',BUF:'#2f7ed8',CAR:'#0085ca',CHI:'#c83803',
    CIN:'#fb4f14',CLE:'#ff5b1f',DAL:'#3b82c4',DEN:'#fb4f14',DET:'#20a8e0',GB:'#34865b',
    HOU:'#d71920',IND:'#3567a8',JAX:'#00a5b5',KC:'#e31837',LAC:'#0080c6',LAR:'#3f65a8',
    LV:'#a5acaf',MIA:'#00a3a8',MIN:'#8559bf',NE:'#c60c30',NO:'#c7ae6e',NYG:'#3568b8',
    NYJ:'#2b9c69',PHI:'#00a3a6',PIT:'#ffb612',SEA:'#3f8ed8',SF:'#d5374b',TB:'#d50a0a',
    TEN:'#4b92db',WAS:'#8c3145'
  };
  const aliases={GNB:'GB',KAN:'KC',LVR:'LV',NWE:'NE',NOR:'NO',SFO:'SF',TAM:'TB',WSH:'WAS',JAC:'JAX'};
  const canonical=code=>aliases[String(code||'').trim().toUpperCase()]||String(code||'').trim().toUpperCase();
  const teamTone=code=>nflColors[canonical(code)]||null;
  const roots=['tradeSection','shuaAnalyticsSection','modal','depthGrid'];
  let scheduled=false;

  function decorateTrade(){
    const root=document.getElementById('tradeSection');
    if(!root)return;
    const top=root.querySelector('#tradeCompareLeft'),bottom=root.querySelector('#tradeCompareRight');
    const result=root.querySelector('.trade-result-card');
    if(!top||!bottom||!result)return;
    const t=Number(top.textContent),b=Number(bottom.textContent);
    const hasPlayers=!!root.querySelector('#tradeList-left .trade-player')&&!!root.querySelector('#tradeList-right .trade-player');
    const decided=hasPlayers&&Number.isFinite(t)&&Number.isFinite(b)&&Math.abs(t-b)>0.05&&Math.abs(t-b)/Math.max(t,b,1)>.05;
    result.classList.toggle('shua-trade-decided',decided);
    root.querySelectorAll('.trade-side').forEach(side=>{
      const which=side.querySelector('#tradeTotal-left')?'left':'right';
      side.classList.toggle('shua-trade-leading',decided&&(which==='left'?t>b:b>t));
    });
  }

  function decorateChartLegends(root){
    root.querySelectorAll('.st-chart .st-legend-btn:not([data-shua-legend-ready])').forEach(button=>{
      button.dataset.shuaLegendReady='1';
      const name=button.textContent.trim();
      let photo='';
      try{photo=window.ShuaPlayerFaces?.url(name)||'';}catch(_){photo='';}
      if(!/^https:\/\/(?:a\.espncdn\.com|cdn\.espn\.com|sleepercdn\.com|www\.sleepercdn\.com)\//i.test(photo))return;
      const avatar=document.createElement('img');avatar.className='shua-legend-face';
      avatar.alt='';avatar.loading='lazy';avatar.decoding='async';avatar.src=photo;
      avatar.addEventListener('error',()=>avatar.remove(),{once:true});
      button.querySelector('i')?.after(avatar);
    });
  }

  function decorateCompare(root){
    if(root.dataset.activeView!=='startsit')return;
    const strip=root.querySelector('#stContent .shua-compare-graph-players');
    const chart=strip?.parentElement?.querySelector('.st-chart');
    if(!strip||!chart||chart.dataset.shuaTeamTone==='1')return;
    const cards=[...root.querySelectorAll('#stContent .st-comparison .st-feature')];
    const minis=[...strip.querySelectorAll('.shua-compare-graph-player')];
    minis.forEach((mini,i)=>{
      const team=cards[i]?.querySelector('.st-player-meta span')?.textContent?.split('·')[0]?.trim();
      let tone=teamTone(team);
      if(!tone)return;
      // Same-team matchups need two distinguishable series.
      if(i>0&&minis.slice(0,i).some(previous=>previous.dataset.shuaTeam===canonical(team)))tone='#88d8ef';
      mini.dataset.shuaTeam=canonical(team);
      mini.style.setProperty('--compare-series-color',tone);
      const legend=chart.querySelector('.st-legend-btn[data-series="'+i+'"]');
      legend?.querySelector('i')?.style.setProperty('--tone',tone);
      chart.querySelectorAll('[data-series-group="'+i+'"] path[stroke]').forEach(path=>path.setAttribute('stroke',tone));
      chart.querySelectorAll('[data-series-group="'+i+'"] circle[fill]').forEach(circle=>circle.setAttribute('fill',tone));
    });
    chart.dataset.shuaTeamTone='1';
  }

  function decorateDepth(){
    const grid=document.getElementById('depthGrid');if(!grid)return;
    grid.querySelectorAll('.depth-card:not([data-shua-depth-title])').forEach(card=>{
      card.dataset.shuaDepthTitle='1';
      const header=card.querySelector('h3');
      const team=card.querySelector('.depth-player[data-depth-team-code]')?.dataset.depthTeamCode;
      const code=canonical(team);
      if(!header||!nflColors[code])return;
      const icon=document.createElement('img');
      icon.className='shua-depth-team-logo';icon.alt='';icon.loading='lazy';
      icon.src='https://a.espncdn.com/i/teamlogos/nfl/500/'+(code==='WAS'?'wsh':code.toLowerCase())+'.png';
      icon.addEventListener('error',()=>icon.remove(),{once:true});
      header.append(icon);
    });
  }

  function skeletonRows(count){
    const host=document.createElement('div');host.className='shua-skeleton-stack';host.setAttribute('aria-hidden','true');
    for(let i=0;i<count;i++){
      const row=document.createElement('div');row.className='shua-skeleton-row';
      const avatar=document.createElement('i');avatar.className='shua-skeleton-avatar';
      const info=document.createElement('div');
      for(let line=0;line<2;line++){
        const placeholder=document.createElement('i');placeholder.className='shua-skeleton-line';info.append(placeholder);
      }
      const score=document.createElement('i');score.className='shua-skeleton-score';
      row.append(avatar,info,score);host.append(row);
    }
    return host;
  }
  function decorateSkeletons(){
    for(const id of ['modal','shuaAnalyticsSection']){
      const root=document.getElementById(id);
      if(!root)continue;
      root.querySelectorAll('.espn-game-log-empty,.st-loading').forEach(node=>{
        if(node.dataset.shuaSkeleton||!/^loading\b/i.test(node.textContent.trim()))return;
        node.dataset.shuaSkeleton='1';node.append(skeletonRows(4));
      });
    }
  }

  function update(){
    scheduled=false;decorateTrade();decorateDepth();decorateSkeletons();
    const analytics=document.getElementById('shuaAnalyticsSection');
    if(analytics){decorateCompare(analytics);decorateChartLegends(analytics);}
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(update);}

  function emphasize(button,on){
    const chart=button?.closest('.st-chart');if(!chart)return;
    if(!on||button.getAttribute('aria-pressed')==='false'){
      chart.classList.remove('shua-chart-emphasizing');
      chart.querySelectorAll('.shua-chart-in-focus').forEach(node=>node.classList.remove('shua-chart-in-focus'));
      return;
    }
    chart.classList.add('shua-chart-emphasizing');
    chart.querySelectorAll('[data-series-group]').forEach(group=>{
      group.classList.toggle('shua-chart-in-focus',group.dataset.seriesGroup===button.dataset.series);
    });
  }
  document.addEventListener('pointerover',event=>{
    const button=event.target.closest?.('#shuaAnalyticsSection .st-chart .st-legend-btn');
    if(button)emphasize(button,true);
  });
  document.addEventListener('pointerout',event=>{
    const button=event.target.closest?.('#shuaAnalyticsSection .st-chart .st-legend-btn');
    if(button&&!button.contains(event.relatedTarget))emphasize(button,false);
  });
  document.addEventListener('focusin',event=>{
    const button=event.target.closest?.('#shuaAnalyticsSection .st-chart .st-legend-btn');
    if(button)emphasize(button,true);
  });
  document.addEventListener('focusout',event=>{
    const button=event.target.closest?.('#shuaAnalyticsSection .st-chart .st-legend-btn');
    if(button&&!button.contains(event.relatedTarget))emphasize(button,false);
  });

  roots.forEach(id=>{
    const root=document.getElementById(id);
    if(root)new MutationObserver(schedule).observe(root,{childList:true,characterData:true,subtree:true});
  });
  schedule();
  window.ShuaVisualTen={teamTone};
})();
