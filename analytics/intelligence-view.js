/* Seven focused views for nine source-backed fantasy intelligence features. */
(function(root){
'use strict';
const S=root.ShuaStudio,I=S.Intelligence,C=S.Chart,{esc:E,fmt:F,num:N,games:G}=S;
const views=[['breakouts','Breakouts'],['trades','Buy / sell'],['similar','Similarity'],['expected','Expected vs actual'],['rankings','Custom ranks & tiers'],['forecast','Forecast & odds'],['compare','Compare']];
const signed=(n,d=1,unit='')=>N(n)===null?'—':(n>0?'+':'')+F(n,d,unit);
function render({dataset:ds,usage,state,person,panel,face,logo}){
 const rows=I.build(ds,usage),lookup=new Map(rows.map(r=>[r.p.key,r]));
 const pane=views.some(([id])=>id===state.intelView)?state.intelView:'breakouts';
 const current=state.intelPosition||'ALL',filtered=rows.filter(r=>current==='ALL'||r.p.position===current);
 const selector=(id,value,options,label)=>'<label class="st-intel-select"><span>'+E(label)+'</span><select id="'+id+'">'+options.map(([v,name])=>'<option value="'+E(v)+'"'+(value===v?' selected':'')+'>'+E(name)+'</option>').join('')+'</select></label>';
 const positionNav=()=>'<div class="st-intel-positions" role="group" aria-label="Filter positions">'+['ALL','QB','RB','WR','TE'].map(p=>'<button type="button" data-st-intel-position="'+p+'" aria-pressed="'+(current===p)+'">'+p+'</button>').join('')+'</div>';
 const title='<div class="st-intel-header"><strong>Fantasy Intelligence</strong><span>2026 · ESPN PPR through W'+ds.latestWeek+' · '+usage.rankedPlayers+' ranked players</span></div>';
 const nav='<nav class="st-intel-nav" aria-label="Fantasy Intelligence features">'+views.map(([id,label])=>'<button type="button" data-st-intel-view="'+id+'" aria-pressed="'+(pane===id)+'">'+E(label)+'</button>').join('')+'</nav>';
 const tbl=(columns,items)=>'<div class="st-table-wrap st-intel-table"><table><thead><tr>'+columns.map(x=>'<th scope="col">'+E(x)+'</th>').join('')+'</tr></thead><tbody>'+items.join('')+'</tbody></table></div>';
 const blank=(message)=>'<p class="st-intel-empty">'+E(message)+'</p>';
 const source='<p class="st-intel-source">Source: ESPN observed full-PPR games, verified ffopportunity xFP, nflverse/HeatRadar usage and ESPN positional matchup ratings. — means unavailable. Screening scores and modeled forecasts are not official ESPN rankings or projections.</p>';
 const rowPerson=r=>'<td>'+person(r.p)+'</td>';
 const note=message=>'<p class="st-intel-note">'+message+'</p>';
 let content='';
 if(pane==='breakouts'){
  const list=I.breakout(filtered);
  content=positionNav()+panel('Breakout candidates','Increasing opportunity but lower-than-expected PPR results.',
   list.length?tbl(['#','Player','Opp/G trend','Target share trend','xFP/G trend','FPOE / matched game'],list.map((r,i)=>'<tr><td>'+(i+1)+'</td>'+rowPerson(r)+'<td>'+signed(r.row.recentOpportunityChange)+'</td><td>'+signed(r.row.targetShareTrend,1,' pp')+'</td><td>'+signed(r.row.expectedFantasyPointsTrend)+'</td><td class="st-intel-negative">'+signed(r.fpoePerGame)+'</td></tr>')):
   blank('No ranked players meet the verified rising-usage and underperformance criteria.'))+
   note('Screen: at least 3 recorded games, FPOE ≤ −0.5 PPR per matched game and at least one verified rise: +1.5 opportunities/game, +2.5 target-share points, +5 route-participation points or +2 expected PPR/game. Not a prediction of a breakout.');
 }else if(pane==='trades'){
  const mode=state.intelTradeMode==='sell'?'sell':'buy',list=I.buySell(filtered,mode);
  const toggle='<div class="st-intel-positions"><button type="button" data-st-intel-trade="buy" aria-pressed="'+(mode==='buy')+'">Buy-low watch</button><button type="button" data-st-intel-trade="sell" aria-pressed="'+(mode==='sell')+'">Sell-high watch</button></div>';
  content=positionNav()+toggle+panel(mode==='buy'?'Potential buy-low candidates':'Potential sell-high candidates','Sorted by actual PPR versus source-modeled expected PPR.',
   list.length?tbl(['#','Player','FPOE / game','xFP / game','Actual PPR / game','Recent opp Δ','Target share Δ'],list.map((r,i)=>'<tr><td>'+(i+1)+'</td>'+rowPerson(r)+'<td class="'+(r.fpoePerGame<0?'st-intel-negative':'st-intel-positive')+'">'+signed(r.fpoePerGame)+'</td><td>'+F(r.xfp)+'</td><td>'+F(r.actual)+'</td><td>'+signed(r.row.recentOpportunityChange)+'</td><td>'+signed(r.row.targetShareTrend,1,' pp')+'</td></tr>')):
   blank('No players have at least three matched xFP games and a ±1 PPR/game difference.'))+
   note('Buy-low: actual production at least 1 PPR/game below expected. Sell-high: at least 1 PPR/game above expected. Opportunity trends are shown for context—outperformance alone does not imply a coming decline.');
 }else if(pane==='similar'){
  const seed=lookup.get(state.intelPlayer)||rows.find(r=>r.p.key===state.intelPlayer)||filtered.find(r=>r.n>=3)||rows[0];
  const options=rows.slice().sort((a,b)=>a.p.name.localeCompare(b.p.name)).map(r=>[r.p.key,r.p.name+' · '+r.p.position+' · '+r.p.team]);
  const similar=seed?I.similar(rows,seed.p.key):[];
  content='<div class="st-intel-controls">'+selector('stIntelPlayer',seed?.p.key||'',options,'Find players similar to')+'</div>'+
   (seed?panel('Usage profiles like '+seed.p.name,'Same-position comparison. Only verified shared measurements are used.',
   similar.length?tbl(['Player','Profile match','Common measures','PPR / game','xFP / game','Targets / game'],similar.map(r=>'<tr>'+rowPerson(r)+'<td><strong>'+F(r.similarity,0,'%')+'</strong></td><td>'+r.common+' / 6</td><td>'+F(r.actual)+'</td><td>'+F(r.xfp)+'</td><td>'+F(r.row.targetsPerGame)+'</td></tr>')):
   blank('Fewer than four measured dimensions overlap with another player.')):'')+
   note('Profile similarity uses standardized distances across six position-appropriate features. A higher score is a closer statistical profile, not a performance probability or a player-value ranking. Four or more common features are required.');
 }else if(pane==='expected'){
  const seed=lookup.get(state.intelPlayer)||filtered.find(r=>r.n>=3)||rows[0];
  const options=rows.slice().sort((a,b)=>a.p.name.localeCompare(b.p.name)).map(r=>[r.p.key,r.p.name+' · '+r.p.position]);
  const weeks=seed?.gs.map(g=>g.week)||[];
  const actual=seed?.gs.map(g=>g.points)||[];
  const expected=weeks.map(w=>N(seed.row.expectedWeeklyPpr?.[w]));
  content='<div class="st-intel-controls">'+selector('stIntelPlayer',seed?.p.key||'',options,'Player')+'</div>'+
   (seed?panel('Expected vs actual · '+seed.p.name,'ffopportunity weekly xFP versus recorded ESPN full-PPR fantasy points.',
   C.line({title:'Expected vs actual weekly PPR',labels:weeks.map(w=>'W'+w),series:[{name:'Actual PPR',values:actual},{name:'Expected PPR',values:expected,color:C.colors[1]}],area:false,unit:'Missing xFP stays blank; only matched recorded games are displayed.'})):'')+
   note('Expected points describe the quality of opportunities already received, not a future-week projection. The two sources can differ in scoring details; no unreported week is assumed to be zero.');
 }else if(pane==='rankings'){
  const mode=state.intelRankMode==='tiers'?'tiers':'custom',weights=state.intelWeights||I.weightsDefault;
  const weighted=Object.entries(I.weightsDefault).map(([id,value])=>{
   const labels={actual:'Actual PPR/G',expected:'Expected PPR/G',trend:'Opportunity trend',matchup:'Matchup ease',consistency:'Hit-rate consistency'};
   const w=Math.max(0,Math.min(100,N(weights[id])??value));
   return '<label class="st-intel-weight"><span>'+labels[id]+'</span><input type="range" min="0" max="100" step="5" data-st-intel-weight="'+id+'" value="'+w+'"><b>'+w+'</b></label>';
  }).join('');
  const sorted=mode==='custom'?I.customRankings(filtered,weights):I.tiers(filtered);
  const tabs='<div class="st-intel-positions"><button type="button" data-st-intel-rankmode="custom" aria-pressed="'+(mode==='custom')+'">Your weighted ranks</button><button type="button" data-st-intel-rankmode="tiers" aria-pressed="'+(mode==='tiers')+'">Projected tiers</button></div>';
  const valid=sorted.filter(r=>mode==='custom'?r.customScore!==null:r.projection!==null);
  content=positionNav()+tabs+(mode==='custom'?'<section class="st-intel-weights" aria-label="Custom ranking weights">'+weighted+'<button type="button" data-st-intel-reset>Reset weights</button></section>':'')+
   panel(mode==='custom'?'Custom weighted rankings':'Projected positional tiers',mode==='custom'?'Your weights; saved in this browser.':'Same-position modeled PPR projections, grouped at meaningful point gaps.',
   valid.length?tbl([mode==='custom'?'Rank':'Pos rank','Player',mode==='custom'?'Score / 100':'Tier','Weekly modeled PPR','Your published position rank','Measured factors'],valid.map((r,i)=>'<tr><td>'+(mode==='custom'?i+1:r.p.position+' '+r.positionIndex)+'</td>'+rowPerson(r)+'<td><strong>'+(mode==='custom'?F(r.customScore):'Tier '+r.tier)+'</strong></td><td>'+F(r.projection)+'</td><td>'+(r.p.customPositionRank?'#'+r.p.customPositionRank:'—')+'</td><td>'+(mode==='custom'?r.signals.length+' / 5':'3+ PPR games')+'</td></tr>')):
   blank('No ranked players have enough verified information for this view.'))+
   note(mode==='custom'?'Each factor is ranked against players at the same position. Available percentiles are weighted and rescaled to 100; at least two supported factors and 3 recorded games are required. These rankings do not edit your published big board.':'A new tier starts when the next player projects at least 1.5 PPR points or 10% lower than the preceding player. Tiers use model estimates, not ESPN tier labels.');
 }else if(pane==='forecast'){
  const pick=state.intelSort||'projection',sort= ['projection','10','15','20','25'].includes(pick)?pick:'projection';
  const valid=filtered.slice().sort((a,b)=>(N(sort==='projection'?b.projection:b.probabilities[sort])??-1)-(N(sort==='projection'?a.projection:a.probabilities[sort])??-1)||a.p.name.localeCompare(b.p.name));
  content=positionNav()+'<div class="st-intel-controls">'+selector('stIntelSort',sort,[['projection','Projected PPR'],...([10,15,20,25].map(n=>[String(n),'Chance of '+n+'+ PPR']))],'Rank by')+'</div>'+
   panel('Week '+(I.nextWeek(ds)||'—')+' modeled PPR and scoring likelihood','Full PPR, 4-point passing TD; estimated next-week outcome from observed history, xFP and ESPN matchup.',
   tbl(['Player','Opponent','Projected PPR','10+ chance','15+ chance','20+ chance','25+ chance'],valid.map(r=>'<tr>'+rowPerson(r)+'<td>'+(r.opponent?.bye?'BYE':E(r.opponent?.opponent||'—'))+'</td><td><strong>'+F(r.projection)+'</strong></td>'+[10,15,20,25].map(n=>'<td>'+F(r.probabilities[n],0,'%')+'</td>').join('')+'</tr>')))+
   note('Model: 35% season observed PPR/G + 30% last-three observed PPR/G + 35% verified recent xFP/G (season xFP/G when recent coverage is short); ESPN matchup adjustment capped at ±10%. Requires 3 recorded games, xFP and a confirmed upcoming opponent. Unknowns and byes display —.')+
   note('Hit likelihoods are <strong>uncalibrated model estimates</strong> using a normal distribution around the projection with player scoring variability shrunk toward position peers; they are not guarantees, betting probabilities, or official ESPN forecasts.');
 }else if(pane==='compare'){
  const all=rows.slice().sort((a,b)=>a.p.name.localeCompare(b.p.name));
  let chosen=(state.intelCompareKeys||[]).map(k=>lookup.get(k)).filter(Boolean);
  if(!Array.isArray(state.intelCompareKeys))chosen=rows.filter(r=>r.n>=3).slice(0,2);
  chosen=[...new Map(chosen.map(r=>[r.p.key,r])).values()].slice(0,4);
  const selectHtml='<div class="st-intel-compare-pickers">'+Array.from({length:4},(_,i)=>selector('stIntelCompare'+i,chosen[i]?.p.key||'',[['','None'],...all.map(r=>[r.p.key,r.p.name+' · '+r.p.position+' · '+r.p.team])],'Player '+(i+1))).join('')+'</div>';
  const comparison=[['Upcoming modeled PPR',r=>r.projection,1,''],['10+ point likelihood',r=>r.probabilities[10],0,'%'],['20+ point likelihood',r=>r.probabilities[20],0,'%'],
   ['Expected PPR / game',r=>r.xfp,1,''],['Actual PPR / game',r=>r.actual,1,''],['FPOE / matched game',r=>r.fpoePerGame,1,''],
   ['Targets / game',r=>r.row.targetsPerGame,1,''],['Carries / game',r=>r.row.carriesPerGame,1,''],['Snap share',r=>r.row.snapShare,1,'%'],
   ['Route participation',r=>r.row.routeParticipation,1,'%'],['Target share',r=>r.row.targetShare,1,'%'],['Yards per route',r=>r.row.yardsPerRouteRun,2,''],
   ['Recent opportunity change',r=>r.row.recentOpportunityChange,1,'']];
  const headers=['Metric',...chosen.map(r=>r.p.name)];
  const comparisonTable=chosen.length?tbl(headers,comparison.map(([name,fn,d,unit])=>'<tr><th scope="row">'+E(name)+'</th>'+chosen.map(r=>'<td>'+F(fn(r),d,unit)+'</td>').join('')+'</tr>')):blank('Choose at least one player.');
  const weeks=[...new Set(chosen.flatMap(r=>r.gs.map(g=>g.week)))].sort((a,b)=>a-b);
  content=selectHtml+panel('Advanced player comparison','Up to four players at any position, with matching stat definitions.',comparisonTable)+
   (chosen.length>1?panel('Actual weekly PPR scoring','Recorded ESPN results only; missing appearances are not zeros.',C.line({title:'Comparison · observed PPR',labels:weeks.map(w=>'W'+w),series:chosen.map(r=>({name:r.p.name,values:weeks.map(w=>r.gs.find(g=>g.week===w)?.points??null)})),area:false})):'')+
   note('Comparable PPR scores are shown side by side, but target, route and rushing usage are role-specific. Projected scores and likelihoods share the disclosed model in Forecast & odds.');
 }
 return title+nav+'<div class="st-intel-view">'+content+source+'</div>';
}
S.IntelligenceView={render,views};
})(globalThis);
