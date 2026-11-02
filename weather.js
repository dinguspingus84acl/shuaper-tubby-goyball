/* Upcoming NFL game-by-game weather, attributed to MySportsWeather. */
(()=>{
  'use strict';
  const nav=document.querySelector('.positions');
  const main=document.querySelector('main');
  if(!nav||!main||document.getElementById('shuaWeatherSection'))return;

  const button=document.createElement('button');
  button.type='button';
  button.className='pos';
  button.dataset.pos='WEATHER';
  button.textContent='Weather';
  nav.append(button);

  const section=document.createElement('section');
  section.id='shuaWeatherSection';
  section.hidden=true;
  section.setAttribute('aria-label','NFL game weather');
  main.append(section);

  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
  const display=(n,suffix)=>number(n)===null?'—':String(n)+suffix;
  const formatDate=iso=>new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(iso));
  const formatUpdated=iso=>new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(iso));
  const safeLink=url=>/^https:\/\/mysportsweather\.com\/nfl(?:\/|$)/.test(url||'')?url:'https://mysportsweather.com/nfl';
  const safeLogo=url=>/^https:\/\/a\.espncdn\.com\/i\/teamlogos\/nfl\//.test(url||'')?url:'';
  const logo=team=>safeLogo(team.logo)?'<img class="wx-team-logo" src="'+escape(safeLogo(team.logo))+'" alt="" loading="lazy">':'';
  const filters=[['all','All games'],['watch','Weather watch'],['ready','Forecasts'],['pending','Pending']];
  let snapshot=null,loading=false,visible=false,filter='all',search='',error='';

  // Independent fantasy-football guidance. These thresholds are OUR heuristic,
  // not a forecast or a betting recommendation from MySportsWeather/Kevin Roth.
  function risk(game){
    const f=game.forecast;
    if(!f)return {level:'pending',label:'Forecast pending'};
    if(game.indoor)return {level:'indoor',label:'Roof / indoor'};
    const hours=(f.hourly||[]).filter(h=>h.inGame);
    const max=key=>Math.max(-Infinity,...[f[key],...hours.map(h=>h[key])].filter(v=>number(v)!==null));
    const wind=max('windMph'),gust=max('gustMph'),precip=max('precipPct');
    const cold=Math.min(Infinity,...[f.tempF,...hours.map(h=>h.tempF)].filter(v=>number(v)!==null));
    if(wind>=23||gust>=35||precip>=75||cold<=10)return {level:'high',label:'High weather impact'};
    if(wind>=15||gust>=25||precip>=45||cold<=25)return {level:'watch',label:'Weather watch'};
    return {level:'low',label:'Low weather impact'};
  }

  function analysis(game){
    const f=game.forecast;
    if(!f)return 'MySportsWeather has not published a forecast for this matchup yet. The game will update automatically when its forecast appears.';
    if(game.indoor)return 'Indoor or roof-capable venue. Outdoor conditions have little effect if the roof is closed; roof status has not been verified. Check the forecast and roof decision closer to kickoff.';
    const wind=number(f.windMph),gust=number(f.gustMph),rain=number(f.precipPct),temp=number(f.tempF);
    const detail=[];
    if(wind!==null&&wind>=20||gust!==null&&gust>=30)detail.push('Strong wind could make deep throws, long field goals and some punts less reliable.');
    else if(wind!==null&&wind>=14||gust!==null&&gust>=24)detail.push('Monitor downfield passing and long field goals if winds hold near kickoff.');
    else if(wind!==null&&wind<=10&&gust!==null&&gust<=15)detail.push('Light wind should pose little obstacle to passing or kicking.');
    if(rain!==null&&rain>=65)detail.push('A high precipitation chance raises concerns about grip, footing and ball security.');
    else if(rain!==null&&rain>=35)detail.push('Showers are possible; check near kickoff for changes in field conditions.');
    else if(rain!==null&&rain<=15)detail.push('Rain is unlikely to be a major factor.');
    if(temp!==null&&temp<=25)detail.push('Cold conditions may affect ball handling and kick distance.');
    else if(temp!==null&&temp>=85)detail.push('Warm conditions could increase fatigue and hydration demands.');
    if(!detail.length)detail.push('No obvious major weather concern is indicated by the available kickoff forecast.');
    return detail.join(' ');
  }

  function trend(f){
    const hours=(f.hourly||[]).filter(h=>h.inGame);
    if(hours.length<2)return '';
    const first=hours[0],last=hours[hours.length-1],parts=[];
    if(number(first.tempF)!==null&&number(last.tempF)!==null&&Math.abs(last.tempF-first.tempF)>=3)
      parts.push('Temperature '+(last.tempF<first.tempF?'falls':'rises')+' '+Math.abs(last.tempF-first.tempF)+'° during play');
    if(number(first.windMph)!==null&&number(last.windMph)!==null&&Math.abs(last.windMph-first.windMph)>=5)
      parts.push('wind '+(last.windMph<first.windMph?'eases':'builds')+' from '+first.windMph+' to '+last.windMph+' mph');
    if(number(first.precipPct)!==null&&number(last.precipPct)!==null&&Math.abs(last.precipPct-first.precipPct)>=20)
      parts.push('precipitation chance '+(last.precipPct<first.precipPct?'drops':'increases')+' from '+first.precipPct+'% to '+last.precipPct+'%');
    return parts.length?parts.join('; ')+'.':'The published game-hour forecast stays relatively steady.';
  }

  const skyConditions={
    sun:{emoji:'☀️',label:'Clear / sunny'},
    clear:{emoji:'☀️',label:'Clear skies'},
    partly:{emoji:'⛅',label:'Partly cloudy'},
    'partly-cloudy':{emoji:'⛅',label:'Partly cloudy'},
    cloud:{emoji:'☁️',label:'Cloudy'},
    cloudy:{emoji:'☁️',label:'Cloudy'},
    overcast:{emoji:'☁️',label:'Overcast'},
    rain:{emoji:'🌧️',label:'Rain'},
    showers:{emoji:'🌦️',label:'Showers'},
    storm:{emoji:'⛈️',label:'Thunderstorms'},
    thunder:{emoji:'⛈️',label:'Thunderstorms'},
    snow:{emoji:'🌨️',label:'Snow'},
    sleet:{emoji:'🌨️',label:'Sleet'},
    fog:{emoji:'🌫️',label:'Fog'},
    wind:{emoji:'💨',label:'Windy'},
  };
  function hourClock(value){
    const raw=String(value||'').trim();
    const match=raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if(!match)return {clock:raw,period:'',spoken:raw};
    const clock=match[1]+':'+(match[2]||'00'),period=match[3].toUpperCase();
    return {clock,period,spoken:clock+' '+period};
  }
  function hourTable(hours,title,skyByTime){
    if(!hours||!hours.length)return '';
    const fields=[['tempF','Temp','°'],['precipPct','Precip','%'],['windMph','Wind',' mph'],['gustMph','Gusts',' mph'],['windDirection','Direction','']];
    const headings=hours.map(h=>{
      const time=hourClock(h.time),sky=skyConditions[String(h.sky||skyByTime?.get(h.time)||'').toLowerCase()];
      const icon=sky?'<span class="wx-hour-emoji" role="img" aria-label="'+escape(sky.label)+'">'+sky.emoji+'</span>':'<span class="wx-hour-emoji wx-hour-unknown" aria-label="Sky condition unavailable">—</span>';
      return '<th scope="col" class="wx-hour-col '+(h.inGame?'wx-in-game':'')+'" aria-label="'+escape(time.spoken+(sky?' · '+sky.label:''))+'"><div class="wx-hour-head">'+icon+'<strong class="wx-hour-clock">'+escape(time.clock)+'</strong><span class="wx-hour-period">'+escape(time.period)+'</span></div></th>';
    }).join('');
    const width=hours.length>5?' style="min-width:'+(80+hours.length*61)+'px"':'';
    return '<div class="wx-hourly-block"><div class="wx-hourly-block-heading"><h4>'+escape(title)+'</h4><span>Hour by hour · ET</span></div><div class="wx-hourly-scroll"><table class="wx-hourly-table"'+width+'><thead><tr><th scope="col" class="wx-hour-label">HOUR<br>ET</th>'+headings+'</tr></thead><tbody>'+fields.filter(([key])=>hours.some(h=>h[key]!==undefined&&h[key]!==null)).map(([key,label,suffix])=>'<tr><th scope="row">'+label+'</th>'+hours.map(h=>'<td class="'+(h.inGame?'wx-in-game':'')+'">'+(h[key]===undefined||h[key]===null?'—':escape(String(h[key]))+suffix)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></div>';
  }

  function gameCard(game){
    const f=game.forecast,r=risk(game),isPending=!f;
    const summary=isPending?'<div class="wx-pending">Forecast not yet posted · Check back closer to kickoff</div>':
      '<div class="wx-metrics">'+[
        ['Temperature',display(f.tempF,'°F'),'temp'],
        ['Wind',display(f.windMph,' mph'),'wind'],
        ['Gusts',display(f.gustMph,' mph'),'gust'],
        [f.precipType==='Snow'?'Snow chance':'Rain chance',display(f.precipPct,'%'),'rain']
      ].map(([label,value,klass])=>'<div class="wx-metric wx-'+klass+'"><span>'+escape(label)+'</span><strong>'+escape(value)+'</strong></div>').join('')+'</div>';
    const skyByTime=new Map((f?.hourly||[]).filter(h=>h.sky).map(h=>[h.time,h.sky]));
    const details=f&&(f.hourly?.length||f.nbmHourly?.length)?'<details class="wx-details"><summary>Hourly game forecast <span aria-hidden="true">⌄</span></summary>'+hourTable(f.hourly,'NWS hourly forecast',skyByTime)+hourTable(f.nbmHourly,'NBM higher-resolution forecast',skyByTime)+'</details>':'';
    return '<article class="wx-game" data-weather-game="'+escape(game.id)+'">'+
      '<div class="wx-game-top"><div class="wx-kick">Week '+escape(game.week??'—')+' <span>·</span> '+escape(formatDate(game.kickoffUtc))+'</div><span class="wx-impact wx-impact-'+r.level+'">'+escape(r.label)+'</span></div>'+
      '<div class="wx-matchup"><div class="wx-team">'+logo(game.away)+'<span><b>'+escape(game.away.abbr)+'</b><small>'+escape(game.away.name)+'</small></span></div><span class="wx-versus">AT</span><div class="wx-team">'+logo(game.home)+'<span><b>'+escape(game.home.abbr)+'</b><small>'+escape(game.home.name)+'</small></span></div></div>'+
      '<div class="wx-venue">'+escape(game.venue||'Venue TBA')+(game.city?' · '+escape(game.city):'')+(game.indoor?' <span class="wx-dome">Indoor / roof venue</span>':'')+'</div>'+
      summary+'<div class="wx-analysis"><span>FANTASY WEATHER ANALYSIS</span><p>'+escape(analysis(game))+'</p>'+(f&&trend(f)?'<small>'+escape(trend(f))+'</small>':'')+'</div>'+details+
      '<a class="wx-source-link" href="'+escape(safeLink(f?.sourceUrl))+'" target="_blank" rel="noopener noreferrer">'+(f?'View forecast':'Check forecast')+' on MySportsWeather <span aria-hidden="true">↗</span></a>'+
      '</article>';
  }

  function renderList(){
    if(!snapshot)return;
    const all=snapshot.games||[];
    const ready=all.filter(game=>game.forecast),watch=all.filter(game=>['watch','high'].includes(risk(game).level));
    const stats=section.querySelector('#wxOverview');
    stats.innerHTML=[['Upcoming games',all.length],['Forecasts available',ready.length],['Weather watch',watch.length],['Awaiting forecast',all.length-ready.length]].map(([label,n])=>'<div class="wx-stat"><strong>'+n+'</strong><span>'+label+'</span></div>').join('');
    const buttons=section.querySelector('#wxFilters');
    buttons.innerHTML=filters.map(([value,label])=>'<button type="button" data-wx-filter="'+value+'" aria-pressed="'+(filter===value)+'">'+label+'</button>').join('');
    const query=search.trim().toLowerCase();
    const matches=all.filter(game=>{
      if(filter==='watch'&&!['watch','high'].includes(risk(game).level))return false;
      if(filter==='ready'&&!game.forecast)return false;
      if(filter==='pending'&&game.forecast)return false;
      if(!query)return true;
      return [game.away.name,game.away.abbr,game.home.name,game.home.abbr,game.venue,game.city].some(value=>String(value||'').toLowerCase().includes(query));
    });
    section.querySelector('#wxResultCount').textContent=matches.length+' matchup'+(matches.length===1?'':'s');
    section.querySelector('#wxGames').innerHTML=matches.length?matches.map(gameCard).join(''):'<p class="wx-empty">No matchups match this search and filter.</p>';
  }

  function renderShell(){
    section.innerHTML='<div class="wx-container">'+
      '<header class="wx-hero"><div><p class="wx-eyebrow">NFL · GAME DAY CONDITIONS</p><h2>Weather</h2><p class="wx-sub">Game-by-game weather impact for fantasy football, based on MySportsWeather forecasts.</p></div><button type="button" class="wx-refresh" id="wxRefresh">↻ Refresh</button></header>'+
      '<div class="wx-overview" id="wxOverview"></div>'+
      '<div class="wx-controls"><label class="wx-search"><span aria-hidden="true">⌕</span><input id="wxSearch" type="search" placeholder="Search team or stadium" aria-label="Search NFL matchups" autocomplete="off"></label><div class="wx-filters" id="wxFilters"></div></div>'+
      '<div class="wx-game-count" id="wxResultCount"></div><div class="wx-games" id="wxGames"></div>'+
      '<footer class="wx-footer"><p><strong>Forecast source:</strong> <a href="https://mysportsweather.com/nfl" target="_blank" rel="noopener noreferrer">MySportsWeather by Kevin Roth</a>, including its NWS and NBM hourly data. <strong>Schedule:</strong> ESPN. Fantasy impact labels and analysis are our own weather-based estimates, not Kevin Roth’s recommendations.</p><p id="wxUpdated"></p><p>Forecasts change as kickoff approaches. Pending games have no MySportsWeather prediction yet—no weather conditions are assumed for them.</p></footer></div>';
    section.querySelector('#wxSearch').value=search;
    section.querySelector('#wxSearch').addEventListener('input',event=>{search=event.target.value;renderList();});
    section.querySelector('#wxFilters').addEventListener('click',event=>{const target=event.target.closest('[data-wx-filter]');if(target){filter=target.dataset.wxFilter;renderList();}});
    section.querySelector('#wxRefresh').addEventListener('click',()=>load(true));
  }

  async function load(force=false){
    if(loading)return;
    loading=true;
    const refresh=section.querySelector('#wxRefresh');
    if(refresh){refresh.disabled=true;refresh.textContent='Refreshing…';}
    if(!snapshot)section.querySelector('#wxGames').innerHTML='<p class="wx-empty">Loading the latest NFL games and forecasts…</p>';
    try{
      const response=await fetch('weather/data/nfl.json'+(force?'?v='+Date.now():''),{cache:'no-store'});
      if(!response.ok)throw new Error('Forecast data request failed ('+response.status+')');
      const data=await response.json();
      if(!Array.isArray(data.games))throw new Error('Invalid NFL weather data');
      snapshot=data;error='';
      renderList();
      section.querySelector('#wxUpdated').textContent='Weather data updated '+formatUpdated(data.generatedAt)+'. The source is scheduled to be checked about every two hours.';
    }catch(err){
      error=err.message;
      if(!snapshot)section.querySelector('#wxGames').innerHTML='<p class="wx-empty">Weather data is temporarily unavailable. Please try Refresh. You can also check <a href="https://mysportsweather.com/nfl" target="_blank" rel="noopener noreferrer">MySportsWeather</a> directly.</p>';
      const updated=section.querySelector('#wxUpdated');if(updated)updated.textContent='Unable to refresh: '+error;
    }finally{
      loading=false;
      const control=section.querySelector('#wxRefresh');if(control){control.disabled=false;control.textContent='↻ Refresh';}
    }
  }

  function show(){
    visible=true;
    document.body.classList.add('shua-weather-open');
    document.body.classList.remove('fantasy-home-mode','mobile-menu-open');
    section.hidden=false;
    nav.querySelectorAll('.pos').forEach(b=>b.classList.toggle('active',b===button));
    if(!section.querySelector('#wxGames'))renderShell();
    if(snapshot)renderList();else load();
  }
  function hide(){visible=false;document.body.classList.remove('shua-weather-open');section.hidden=true;button.classList.remove('active');}
  document.addEventListener('click',event=>{
    const target=event.target.closest?.('.positions [data-pos],#phoneMenuItems [data-target]');
    if(!target||!visible)return;
    const destination=target.dataset.pos||target.dataset.target;
    if(destination!=='WEATHER')hide();
  },true);
  nav.addEventListener('click',event=>{
    const target=event.target.closest('[data-pos]');
    if(target===button){event.preventDefault();event.stopImmediatePropagation();show();}
  },true);
})();
