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
  const formatKickoffTime=iso=>new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'}).format(new Date(iso));
  const safeLogo=url=>/^https:\/\/a\.espncdn\.com\/i\/teamlogos\/nfl\//.test(url||'')?url:'';
  const logo=team=>safeLogo(team.logo)?'<img class="wx-team-logo" src="'+escape(safeLogo(team.logo))+'" alt="" loading="lazy">':'';
  let snapshot=null,loading=false,visible=false,error='',lastFetchedAt=0,refreshTimer=null;

  // Independent fantasy-football guidance. These thresholds are OUR heuristic,
  // not a forecast or a betting recommendation from MySportsWeather/Kevin Roth.
  function risk(game){
    const f=game.forecast;
    if(game.indoor)return {level:'indoor',label:'Roof / indoor'};
    if(!f)return {level:'pending',label:'Forecast pending'};
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
    if(game.indoor){
      if(/Caesars Superdome|U\.S\. Bank Stadium/i.test(game.venue||''))return 'Fixed-roof indoor stadium. Wind, rain and outdoor temperature should not affect gameplay.';
      return 'Indoor or roof-capable venue. Outdoor weather has little effect when the roof is closed; verify roof status closer to kickoff.';
    }
    if(!f)return 'MySportsWeather has not published a forecast for this matchup yet. The game will update automatically when its forecast appears.';
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
  const westTeams=new Set(['SEA','SF','SFO','LAR','LAC','LV','LVR']);
  const centralTeams=new Set(['CHI','DAL','HOU','KC','KAN','MIN','NO','NOR','TEN','GB','GNB']);
  function localZone(game){
    if(/Madrid/i.test(game.city||''))return 'Europe/Madrid';
    if(/London/i.test(game.city||''))return 'Europe/London';
    if(/Frankfurt|Munich|Berlin/i.test(game.city||''))return 'Europe/Berlin';
    const home=game.home?.abbr;
    if(home==='ARI')return 'America/Phoenix';
    if(home==='DEN')return 'America/Denver';
    if(westTeams.has(home))return 'America/Los_Angeles';
    if(centralTeams.has(home))return 'America/Chicago';
    return 'America/New_York';
  }
  function isAfterDark(time,game){
    const match=String(time||'').match(/^(\d{1,2})(?::\d{2})?\s*(AM|PM)$/i);
    if(!match||!game.kickoffUtc)return false;
    const desired=Number(match[1])%12+(match[2].toUpperCase()==='PM'?12:0);
    const kickoff=new Date(game.kickoffUtc);
    const etHour=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',hourCycle:'h23'}).format(kickoff))%24;
    let difference=desired-etHour;
    if(difference<-12)difference+=24;
    if(difference>12)difference-=24;
    const local=new Intl.DateTimeFormat('en-US',{timeZone:localZone(game),hour:'numeric',hourCycle:'h23',month:'numeric'}).formatToParts(new Date(kickoff.getTime()+difference*3600000));
    const localHour=Number(local.find(part=>part.type==='hour')?.value)%24;
    const month=Number(local.find(part=>part.type==='month')?.value);
    // Approximate seasonal sunset when the source marks a clear *night* with its sun icon.
    const nightStart=[17,18,19,20,21,21,21,21,20,19,17,17][month-1]||19;
    return localHour<6||localHour>=nightStart;
  }
  function hourlySky(value,time,game){
    const code=String(value||'').toLowerCase();
    const sky=skyConditions[code];
    if((code==='sun'||code==='clear')&&isAfterDark(time,game))
      return {emoji:'🌙',label:'Clear night'};
    if((code==='partly'||code==='partly-cloudy')&&isAfterDark(time,game))
      return {emoji:'☁️',label:'Partly cloudy night'};
    return sky;
  }
  // Use the most frequent published sky condition during play as the card's
  // at-a-glance emoji. Tie-breakers favor the earliest game hour; never
  // fabricate a condition when the hourly forecast is missing.
  function gameSky(game){
    if(game.indoor)return {emoji:'🏟️',label:'Indoor stadium'};
    const hours=(game.forecast?.hourly||[]).filter(h=>h.inGame&&skyConditions[String(h.sky||'').toLowerCase()]);
    if(!hours.length)return null;
    const counts=new Map();
    for(const h of hours){
      const code=String(h.sky).toLowerCase();
      counts.set(code,(counts.get(code)||0)+1);
    }
    const mostCommon=hours.reduce((best,h)=>counts.get(String(h.sky).toLowerCase())>counts.get(String(best.sky).toLowerCase())?h:best,hours[0]);
    return hourlySky(mostCommon.sky,mostCommon.time,game)||null;
  }
  function gameSkyIcon(game){
    const sky=gameSky(game);
    if(!sky)return '';
    const description=(game.indoor?'Indoor game':'Typical game-hour weather')+': '+sky.label;
    return '<span class="wx-game-sky" role="img" aria-label="'+escape(description)+'" title="'+escape(description)+'">'+sky.emoji+'</span>';
  }
  function hourClock(value){
    const raw=String(value||'').trim();
    const match=raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if(!match)return {clock:raw,period:'',spoken:raw};
    const clock=match[1]+':'+(match[2]||'00'),period=match[3].toUpperCase();
    return {clock,period,spoken:clock+' '+period};
  }
  function hourTable(hours,title,skyByTime,game){
    if(!hours||!hours.length)return '';
    const fields=[['tempF','Temp','°'],['precipPct','Precip','%'],['windMph','Wind',' mph'],['gustMph','Gusts',' mph'],['windDirection','Direction','']];
    const headings=hours.map(h=>{
      const time=hourClock(h.time),sky=hourlySky(h.sky||skyByTime?.get(h.time),h.time,game);
      const icon=sky?'<span class="wx-hour-emoji" role="img" aria-label="'+escape(sky.label)+'">'+sky.emoji+'</span>':'<span class="wx-hour-emoji wx-hour-unknown" aria-label="Sky condition unavailable">—</span>';
      return '<th scope="col" class="wx-hour-col '+(h.inGame?'wx-in-game':'')+'" aria-label="'+escape(time.spoken+(sky?' · '+sky.label:''))+'"><div class="wx-hour-head">'+icon+'<strong class="wx-hour-clock">'+escape(time.clock)+'</strong><span class="wx-hour-period">'+escape(time.period)+'</span></div></th>';
    }).join('');
    const width=hours.length>5?' style="min-width:'+(80+hours.length*61)+'px"':'';
    return '<div class="wx-hourly-block"><div class="wx-hourly-block-heading"><h4>'+escape(title)+'</h4><span>Hour by hour · ET</span></div><div class="wx-hourly-scroll"><table class="wx-hourly-table"'+width+'><thead><tr><th scope="col" class="wx-hour-label">HOUR<br>ET</th>'+headings+'</tr></thead><tbody>'+fields.filter(([key])=>hours.some(h=>h[key]!==undefined&&h[key]!==null)).map(([key,label,suffix])=>'<tr><th scope="row">'+label+'</th>'+hours.map(h=>'<td class="'+(h.inGame?'wx-in-game':'')+'">'+(h[key]===undefined||h[key]===null?'—':escape(String(h[key]))+suffix)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></div>';
  }
  function hourlyPreview(f,game){
    const hours=(f.hourly||[]).slice(0,5);
    if(!hours.length)return '';
    return '<div class="wx-hour-preview" aria-label="Hourly forecast at a glance">'+
      '<div class="wx-preview-label"><strong>HOURLY FORECAST</strong><span>Eastern time · Tap below for details</span></div>'+
      '<div class="wx-preview-hours">'+hours.map(h=>{
        const time=hourClock(h.time),sky=hourlySky(h.sky,h.time,game);
        return '<div class="wx-preview-hour '+(h.inGame?'wx-preview-playing':'')+'" aria-label="'+escape(time.spoken+(sky?' · '+sky.label:'')+(number(h.tempF)!==null?' · '+h.tempF+' degrees Fahrenheit':''))+'">'+
          '<strong>'+escape(time.clock)+'</strong><small>'+escape(time.period)+'</small>'+
          '<span class="wx-preview-sky" role="img" aria-label="'+escape(sky?.label||'Condition unavailable')+'">'+(sky?.emoji||'—')+'</span>'+
          '<b>'+display(h.tempF,'°')+'</b></div>';
      }).join('')+'</div></div>';
  }

  function gameCard(game){
    const f=game.forecast,r=risk(game),isPending=!f&&!game.indoor;
    // Keep unavailable forecasts explicit; never invent temperature or wind.
    if(isPending)return '<article class="wx-game wx-pending-game" data-weather-game="'+escape(game.id)+'" aria-label="'+escape(game.away.name+' at '+game.home.name+', forecast pending')+'">'+
      '<div class="wx-pending-fixture"><div class="wx-pending-matchup">'+logo(game.away)+'<strong>'+escape(game.away.abbr)+'</strong><span class="wx-pending-at">at</span>'+logo(game.home)+'<strong>'+escape(game.home.abbr)+'</strong></div>'+
      '<div class="wx-pending-context"><strong>'+escape(formatKickoffTime(game.kickoffUtc))+'</strong><small>'+escape(game.venue||'Venue TBA')+'</small></div></div>'+
      '<span class="wx-impact wx-impact-pending">Forecast pending</span></article>';
    const fixture='<div class="wx-matchup"><div class="wx-team">'+logo(game.away)+'<span><b>'+escape(game.away.abbr)+'</b><small>'+escape(game.away.name)+'</small></span></div><span class="wx-versus">AT</span><div class="wx-team">'+logo(game.home)+'<span><b>'+escape(game.home.abbr)+'</b><small>'+escape(game.home.name)+'</small></span></div></div>';
    const venue='<div class="wx-venue">'+escape(game.venue||'Venue TBA')+(game.city?' · '+escape(game.city):'')+'</div>';
    const header='<div class="wx-game-top"><strong class="wx-game-time">'+escape(formatKickoffTime(game.kickoffUtc))+'</strong><div class="wx-game-conditions">'+gameSkyIcon(game)+'<span class="wx-impact wx-impact-'+r.level+'">'+escape(r.label)+'</span></div></div>';
    // All fixed-roof venues, including the Saints at Caesars Superdome, use
    // the identical compact indoor layout regardless of stray forecast fields.
    if(game.indoor)return '<article class="wx-game wx-indoor-game" data-weather-game="'+escape(game.id)+'">'+
      header+fixture+venue+'<div class="wx-indoor-note"><span class="wx-indoor-mark" aria-hidden="true">⌂</span><strong>INDOORS</strong><span>Controlled conditions · No weather impact expected</span></div></article>';
    const conditions=[
      ['Temperature',display(f.tempF,'°F'),'temp'],
      ['Wind',display(f.windMph,' mph'),'wind'],
      [f.precipType==='Snow'?'Snow chance':'Rain chance',display(f.precipPct,'%'),'rain']
    ];
    const summary='<div class="wx-metrics">'+conditions.map(([label,value,klass])=>'<div class="wx-metric wx-'+klass+'"><span>'+escape(label)+'</span><strong>'+escape(value)+'</strong></div>').join('')+'</div>';
    const skyByTime=new Map((f?.hourly||[]).filter(h=>h.sky).map(h=>[h.time,h.sky]));
    const details=f&&(f.hourly?.length||f.nbmHourly?.length)?'<details class="wx-details"><summary>Full hourly weather data <span aria-hidden="true">⌄</span></summary>'+hourTable(f.hourly,'NWS hourly forecast',skyByTime,game)+hourTable(f.nbmHourly,'NBM higher-resolution forecast',skyByTime,game)+'</details>':'';
    return '<article class="wx-game" data-weather-game="'+escape(game.id)+'">'+
      header+fixture+venue+summary+
      '<details class="wx-expanded"><summary>Weather details <span aria-hidden="true">⌄</span></summary>'+
      hourlyPreview(f,game)+'<div class="wx-analysis"><span>FANTASY WEATHER ANALYSIS</span><p>'+escape(analysis(game))+'</p>'+(trend(f)?'<small>'+escape(trend(f))+'</small>':'')+'</div>'+details+'</details>'+
      '</article>';
  }

  // Group games by their actual ET kickoff time, including 4:05 and 4:25
  // as separate slots. Never use vague early/late/morning labels.
  function kickoffGroup(game){
    const kickoff=new Date(game.kickoffUtc);
    if(!Number.isFinite(kickoff.getTime()))return {key:'unknown',label:'Kickoff time pending',sort:Infinity};
    return {key:kickoff.toISOString(),label:formatDate(game.kickoffUtc),sort:kickoff.getTime()};
  }

  function groupedGames(games){
    const weeks=new Map();
    games.slice().sort((a,b)=>Date.parse(a.kickoffUtc)-Date.parse(b.kickoffUtc)).forEach(game=>{
      const week=String(game.week??'—');
      if(!weeks.has(week))weeks.set(week,[]);
      weeks.get(week).push(game);
    });
    return [...weeks].map(([week,weekGames])=>{
      const buckets=new Map();
      weekGames.forEach(game=>{
        const group=kickoffGroup(game);
        if(!buckets.has(group.key))buckets.set(group.key,{...group,games:[]});
        buckets.get(group.key).games.push(game);
      });
      const grouped=[...buckets.values()].map(group=>'<section class="wx-kickoff-group" aria-label="'+escape(group.label)+'">'+
        '<header class="wx-kickoff-heading"><h3>'+escape(group.label)+'</h3></header>'+
        '<div class="wx-day-games">'+group.games.map(gameCard).join('')+'</div></section>').join('');
      return '<div class="wx-week-bar" role="heading" aria-level="2">Week '+escape(week)+'</div>'+grouped;
    }).join('');
  }

  function renderList(){
    if(!snapshot)return;
    const all=snapshot.games||[];
    // A game can last longer than three hours; retain it in the active slate
    // until four hours after scheduled kickoff. Past games remain one tap away.
    const now=Date.now(),previous=all.filter(game=>{
      const kickoff=Date.parse(game.kickoffUtc);
      return Number.isFinite(kickoff)&&kickoff+4*60*60*1000<now;
    });
    const upcoming=all.filter(game=>!previous.includes(game));
    section.querySelector('#wxGames').innerHTML=all.length?groupedGames(upcoming)+
      (previous.length?'<details class="wx-past-games"><summary>Previous Games <span>'+previous.length+' matchup'+(previous.length===1?'':'s')+'</span></summary><div class="wx-past-content">'+groupedGames(previous)+'</div></details>':''):
      '<p class="wx-empty">No games are available yet.</p>';
  }

  function renderShell(){
    section.innerHTML='<div class="wx-container wx-games-only">'+
      '<div class="wx-games" id="wxGames"></div>'+
      '<footer class="wx-footer"><p>Forecasts: <a href="https://mysportsweather.com/nfl" target="_blank" rel="noopener noreferrer">MySportsWeather by Kevin Roth</a>. Fantasy impact labels are our own estimates; conditions can change before kickoff.</p></footer></div>';
  }

  async function load(force=false){
    if(loading)return;
    loading=true;
    const refresh=section.querySelector('#wxRefresh');
    if(refresh){refresh.disabled=true;refresh.textContent='Refreshing…';}
    if(!snapshot)section.querySelector('#wxGames').innerHTML='<div class="wx-loading-cards" role="status" aria-label="Loading the latest NFL forecasts">'+
      Array.from({length:4},()=>'<div class="wx-loading-card" aria-hidden="true"><span></span><span></span><span></span></div>').join('')+'</div>';
    try{
      const response=await fetch('weather/data/nfl.json'+(force?'?v='+Date.now():''),{cache:'no-store'});
      if(!response.ok)throw new Error('Forecast data request failed ('+response.status+')');
      const data=await response.json();
      if(!Array.isArray(data.games))throw new Error('Invalid NFL weather data');
      snapshot=data;error='';lastFetchedAt=Date.now();
      renderList();
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
    if(snapshot)renderList();
    if(!snapshot||Date.now()-lastFetchedAt>120000)void load();
    if(!refreshTimer)refreshTimer=setInterval(()=>{
      if(visible&&document.visibilityState==='visible'&&Date.now()-lastFetchedAt>300000)void load();
    },60000);
  }
  function hide(){
    visible=false;
    document.body.classList.remove('shua-weather-open');
    section.hidden=true;
    button.classList.remove('active');
    if(refreshTimer){clearInterval(refreshTimer);refreshTimer=null;}
  }
  document.addEventListener('visibilitychange',()=>{
    if(visible&&document.visibilityState==='visible'&&Date.now()-lastFetchedAt>120000)void load();
  });
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
