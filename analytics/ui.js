/* The nine remaining approved dashboards, implemented as interactive components. */
(function(){
'use strict';
const S=globalThis.ShuaStudio,C=S.Chart,{esc:E,fmt:F,num:N,mean:avg,sum,key,aggregate:A,games:G}=S;
if(S.UI)return;
const main=document.querySelector('main'),navigation=document.querySelector('.positions');if(!main||!navigation)return;
const pages=[['matchup','Matchup difficulty','Who has the most favorable opponent?'],['trends','Fantasy points trends','Weekly production, rolling averages and opportunity.'],['opportunity','Advanced opportunity','The workload behind the fantasy points.'],['consistency','Boom / bust consistency','Hit rates, observed floor and week-to-week variance.'],['teams','Team opportunity','See who controls the offense.'],['injury','Injury impact','Compare teammate usage with and without a starter.'],['schedule','Schedule','Position-specific opponents, week by week.'],['startsit','Start / sit','Compare your options without changing your rankings.'],['weekly','Weekly performance','Scorers, opportunity leaders and changes from recent form.']];
const shortNames=['Matchups','Player trends','Opportunity','Consistency','Team shares','Injury impact','Schedule','Start / sit','Weekly report'];
let section=document.getElementById('shuaAnalyticsSection');if(!section){section=document.createElement('section');section.id='shuaAnalyticsSection';section.hidden=true;main.append(section);}section.className='st-studio';
let button=document.querySelector('.positions [data-pos="ANALYTICS"]');if(!button){button=document.createElement('button');button.className='pos';button.dataset.pos='ANALYTICS';button.textContent='Analytics';navigation.append(button);}button.id='studioNav';
let state={view:'weekly',year:2026,pos:'RB',player:'',team:'DET',week:0,range:0,rankSource:'big-board.json',playoffs:false,compare:[],outWeeks:null};try{const saved=JSON.parse(localStorage.getItem('shuaStudioStateV1')||'null');if(saved){state={...state,...saved};if(!pages.some(p=>p[0]===state.view))state.view='weekly';if(![2024,2025,2026].includes(+state.year))state.year=2026;state.outWeeks=null;}}catch(e){}
let dataset=null,epoch=0,renderId=0,visible=false,historyData=null,hiddenBefore=new Map();
function linkedView(){const m=location.hash.match(/^#analytics\/([a-z]+)$/);return m&&pages.some(p=>p[0]===m[1])?m[1]:null;}
const initialView=linkedView();if(initialView){if(state.view==='schedule'&&initialView!=='schedule'&&[2024,2025,2026].includes(+state.scheduleReturnYear)){state.year=+state.scheduleReturnYear;state.scheduleReturnYear=null;}state.view=initialView;state.week=0;}
if(state.view==='schedule'&&+state.year!==2026){state.scheduleReturnYear=+state.year;state.year=2026;}
function updateLink(){if(!visible)return;try{const u=new URL(location.href);u.hash='analytics/'+state.view;history.replaceState(history.state,'',u);}catch(e){}}
function navigate(view){if(!pages.some(p=>p[0]===view))return;
 if(view==='schedule'){if(state.view!=='schedule'&&+state.year!==2026)state.scheduleReturnYear=+state.year;state.year=2026;}
 else if(state.view==='schedule'&&[2024,2025,2026].includes(+state.scheduleReturnYear)){state.year=+state.scheduleReturnYear;state.scheduleReturnYear=null;}
 state.view=view;state.outWeeks=null;if(view==='injury')state.injuryInitialized=0;
 const matching=dataset&&dataset.year===+state.year;
 state.week=matching?Math.min(18,['matchup','schedule','startsit'].includes(view)?dataset.latestWeek+1:dataset.latestWeek):0;
 if(visible){if(matching)render();else load();}else open();
}

const color=(rank)=>rank==null?'':rank<=10?'easy':rank<=20?'neutral':'tough';
const icon=(kind='chart')=>`<svg class="st-icon" viewBox="0 0 24 24" aria-hidden="true">${({chart:'<path d="M4 20V11M10 20V4M16 20V8M2 22h20"/>',trend:'<path d="m3 17 6-7 5 4 7-10M16 4h5v5"/>',target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6M17 2v6M3 10h18M7 14h2M12 14h2M7 17h2M12 17h2"/>',shield:'<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z"/><path d="m8 12 3 3 5-6"/>',cup:'<path d="M8 3h8v8a4 4 0 0 1-8 0V3ZM8 5H3v4c0 3 5 4 5 4M16 5h5v4c0 3-5 4-5 4M12 15v6M7 21h10"/>'})[kind]||''}</svg>`;
const panel=(title,subtitle,body,kind='chart',tag='')=>`<section class="st-panel"><header class="st-panel-head"><div><h3>${icon(kind)}${E(title)}</h3>${subtitle?`<p>${E(subtitle)}</p>`:''}</div>${tag?`<span class="st-tag">${E(tag)}</span>`:''}</header>${body}</section>`;
const note=(text,warn=false)=>`<div class="st-callout${warn?' warning':''}">${text}</div>`;
const method=text=>`<details class="st-method"><summary>Data and calculation notes</summary>${text}</details>`;
const metric=(label,value,sub='',cls='')=>`<div class="st-metric ${N(value)===null&&value==='—'?'unavailable ':''}${cls}"><span>${E(label)}</span><b>${E(value)}</b><small>${E(sub)}</small></div>`;
function logo(team,cls='st-logo'){const t=S.canonicalTeam(team);return S.teams[t]?`<img class="${cls}" src="https://a.espncdn.com/i/teamlogos/nfl/500/${t==='WAS'?'wsh':t.toLowerCase()}.png" alt="" loading="lazy">`:'';}
function face(p,cls='st-face'){return p?.headshot?`<img class="${cls}" data-st-initials="${E((p.name||'?').split(' ').map(n=>n[0]).slice(0,2).join(''))}" src="${E(p.headshot)}" alt="" loading="lazy" decoding="async">`:`<span class="${cls} st-avatar-fallback" aria-hidden="true">${E((p?.name||'?').split(' ').map(n=>n[0]).slice(0,2).join(''))}</span>`;}
const meta=p=>`<div class="st-player-meta">${logo(p.team)}<span>${E(p.team)} · ${E(p.position)}</span></div>`;
function person(p){return `<div class="st-person">${face(p)}<div class="st-person-copy"><button type="button" data-st-open="${E(p.key)}"><strong>${E(p.name)}</strong></button><small>${logo(p.team)}${E(p.team)} · ${E(p.position)}</small></div></div>`;}
function hero(p,items=[],aside){return `<div class="st-hero"><div class="st-hero-art">${logo(p.team,'st-watermark')}${face(p)}</div><div class="st-hero-copy"><span class="st-eyebrow">${E(dataset.year)} · PLAYER FOCUS</span><h3>${E(p.name)}</h3>${meta(p)}<div class="st-hero-stat">${items.map(([l,v])=>`<div><strong>${E(v)}</strong><small>${E(l)}</small></div>`).join('')}</div></div>${aside?`<div class="st-hero-side"><b>${E(aside[0])}</b><span>${E(aside[1])}</span></div>`:''}</div>`;}
function feature(p,i,value,label,extra=''){return `<article class="st-feature"><button type="button" data-st-open="${E(p.key)}"><div class="st-feature-top">${logo(p.team,'st-watermark')}${face(p)}<span class="st-place">${i+1}</span></div><h4>${E(p.name)}</h4>${meta(p)}<span class="st-big-value">${E(value)}<small>${E(label)}</small></span></button>${extra}</article>`;}
function spark(a){const v=a.filter(x=>N(x)!==null);if(v.length<2)return '';const lo=Math.min(...v),hi=Math.max(...v),pts=v.map((x,i)=>`${4+i*86/(v.length-1)},${26-(x-lo)/(hi-lo||1)*22}`);return `<svg class="st-spark" viewBox="0 0 94 32" aria-hidden="true"><path d="M${pts.join('L')}" stroke="#24efa0" stroke-width="1.8" fill="none"/>${pts.map(p=>`<circle cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="2" fill="#24efa0"/>`).join('')}</svg>`;}
function chartName(p){const a=String(p.name||'').trim().split(/\s+/);if(a.length===1)return a[0];const suffix=/^(?:jr\.?|sr\.?|ii|iii|iv|v)$/i.test(a.at(-1));const surname=a.slice(suffix?-2:-1).join(' ');return a[0][0]+'. '+surname;}
function rankedRows(rows,value,subtitle,limit=10){return rows.slice(0,limit).map((p,i)=>`<div class="st-rank-row"><span class="st-rank-num">${i+1}</span>${person(p)}<div class="st-score ${String(value(p)).startsWith('-')?'negative':''}">${E(value(p))}<small>${E(subtitle)}</small></div>${spark(G(p,state.week||18).slice(-5).map(g=>g.points))}</div>`).join('')||C.empty();}
function selectedPlayers(){return dataset.players.filter(p=>p.position===state.pos).sort((a,b)=>(A(b).points||0)-(A(a).points||0));}
function selected(){let list=selectedPlayers(),p=list.find(p=>p.key===state.player)||list[0];if(p)state.player=p.key;return p;}
function select(id,label,options,value){return `<label class="${id==='stPlayer'||id==='stInjuredPlayer'?'st-player-control':''}"><span class="st-label">${E(label)}</span><select id="${id}">${options.map(([v,n])=>`<option value="${E(v)}" ${String(v)===String(value)?'selected':''}>${E(n)}</option>`).join('')}</select></label>`;}
function controls({player=false,team=false,week=false,range=false,ranking=false,playoffs=false,season=true}={}){let h=season?select('stSeason','Season',[2026,2025,2024].map(y=>[y,y+(y<2026?' · archive':'')]),state.year):'';if(week)h+=select('stWeek','Week',Array.from({length:18},(_,i)=>[i+1,'Week '+(i+1)]),state.week||dataset.latestWeek);if(player){const p=selected();h+=select('stPlayer','Player',selectedPlayers().map(p=>[p.key,p.name]),p?.key);}if(team)h+=select('stTeam','Team',Object.entries(S.teams).sort((a,b)=>a[1].localeCompare(b[1])),state.team);if(range)h+=select('stRange','Sample',[['0','Season to date'],['4','Last 4 weeks'],['6','Last 6 weeks']],state.range);if(ranking)h+=select('stRankSource','Your rankings',[['big-board.json','Overall · Big Board'],['ros-rankings.json','Position · Rest of season']],state.rankSource);if(playoffs)h+=select('stPlayoffs','Schedule window',[['remaining','Selected week onward'],['playoffs','Fantasy playoffs · W15–17']],state.playoffs?'playoffs':'remaining');return `<div class="st-controls">${h}</div>`;}
function positions(){return `<div class="st-position" aria-label="Position">${S.positions.map(p=>`<button type="button" data-st-pos="${p}" aria-pressed="${state.pos===p}">${p}</button>`).join('')}</div>`;}
function upcoming(p,week=state.week){return dataset.schedule[p.team]?.[week];}
function defenseForPosition(pos,through,last=0){
 if(dataset.year!==2026)return S.defense(dataset,pos,through,last);
 return S.Data.espnDefense(dataset.espnRatings,pos);
}
function opponentHtml(p,def,week=state.week){const m=upcoming(p,week),d=def.byTeam[m?.opponent];if(m?.bye)return '<span class="st-tag">BYE</span>';return `<span class="st-tag">${m?.opponent?logo(m.opponent):''}${E(m?.opponent||'—')} · ${d?(d.espnRank?'ESPN OPRK '+d.espnRank:d.rank+' easy rank'):'unrated'}</span>`;}
function lineFor(p){const gs=G(p,state.week||18),points=gs.map(g=>g.points);return C.line({title:'Weekly PPR points and rolling averages',labels:gs.map(g=>'W'+g.week),series:[{name:'Weekly PPR',values:points},{name:'3-game average',values:S.rolling(points,3)},{name:'5-game average',values:S.rolling(points,5)}],unit:'PPR points · hover, tap, or focus a week'});}
function trends(){const p=selected();if(!p)return C.empty();const gs=G(p,state.week),a=A(p,state.week),co=S.consistency(p,state.week),best=gs.reduce((b,g)=>!b||g.points>b.points?g:b,null),first=avg(gs.slice(0,5).map(g=>g.points)),last=avg(gs.slice(-5).map(g=>g.points));return positions()+controls({player:true,week:true})+hero(p,[['Total PPR',F(a.points)],['Points / game',F(a.ppg)],['Targets / game',F(a.n?a.targets/a.n:null)]],[F(last),'last 5 games PPG'])+panel('Weekly PPR points','Production with 3-game and 5-game rolling averages.',lineFor(p),'trend')+`<div class="st-metrics">${metric('Double-digit games',F(co.rates.find(x=>x.threshold===10)?.percent??(gs.length?100*gs.filter(g=>g.points>=10).length/gs.length:null),0,'%'),gs.filter(g=>g.points>=10).length+' of '+gs.length+' appearances')}${metric('Best week',F(best?.points),best?'Week '+best.week+' · '+best.opponent:'No games')}${metric('Last 5 appearances',F(last),'PPR points per game')}${metric('Change vs first 5',F(first?100*(last-first)/Math.abs(first):null,0,'%'),'Descriptive change, not a projection')}</div>`+panel('Weekly opportunity','Targets and carries, aligned to actual appearances.',C.bars({title:'Weekly targets and carries',labels:gs.map(g=>'W'+g.week),series:[{name:'Targets',values:gs.map(g=>g.targets),color:C.colors[1],digits:0},{name:'Carries',values:gs.map(g=>g.rushAtt),color:C.colors[0],digits:0}]}),'target')+method('Rolling averages start only after 3 or 5 recorded appearances. Byes and missing data are not filled with zeros. Negative fantasy-point games are retained.');}
function matchup(){const through=Math.min(dataset.latestWeek,state.week-1),def=defenseForPosition(state.pos,through,state.range);const list=selectedPlayers().filter(p=>A(p,through).n).map(p=>({...p,d:def.byTeam[upcoming(p)?.opponent]})).filter(p=>p.d).sort((a,b)=>a.d.rank-b.d.rank||(a.customRank||1000)-(b.customRank||1000));let body=positions()+controls({week:true,range:dataset.year!==2026});if(!def)return body+note('Verified ESPN PPR ratings are temporarily unavailable. No locally calculated opponent ranks are shown.',true);if(!def.rows.length)return body+note('No completed games exist before the selected week. Choose a later week; future results are never used to grade an earlier matchup.',true);body+=panel('Best matchups this week','Sorted by ESPN full-PPR opponent points allowed to '+state.pos+'s.',`<div class="st-podium">${list.slice(0,3).map((p,i)=>feature(p,i,(p.d.espnRank?'ESPN '+p.d.espnRank:p.d.rank+' easy rank'),upcoming(p).opponent+' · '+F(p.d.allowed)+' PPR allowed')).join('')||C.empty('No opponents returned for the selected week.')}</div>`,'cup','Week '+state.week);body+=panel('Position-adjusted opponent outlook','ESPN OPRK 32 is easiest, 1 is hardest.',list.slice(0,16).map((p,i)=>`<div class="st-rank-row"><span class="st-rank-num">${i+1}</span><div>${person(p)}<div style="margin:6px 0 0">${opponentHtml(p,def)}</div></div><div class="st-score ${color(p.d.rank)}">${p.d.espnRank||p.d.rank}<small>of ${def.rows.length} defenses</small></div>${spark(p.d.series.slice(-4).map(g=>g.points))}</div>`).join(''));body+=panel('Fantasy points allowed to '+state.pos+'s','A larger bar is a more favorable matchup for this position.',C.bars({title:'PPR points allowed per defensive game',labels:def.rows.slice(0,12).map(d=>d.team),series:[{name:'PPR allowed / game',values:def.rows.slice(0,12).map(d=>d.allowed)}]}));return body+method(dataset.year===2026?'ESPN full-PPR position-specific opponent ranks, 1 hardest / 32 easiest. Snapshot scoring period '+dataset.espnRatings.scoringPeriodId+'; updated '+new Date(dataset.espnRatings.fetchedAt).toLocaleString()+'.':'Historical player-PPR-allowed matchup ranks, rank 1 easiest.');}
function opportunity(){const p=selected();if(!p)return C.empty();const through=state.week,a=A(p,through,state.range),members=S.teamShares(dataset,p.team,through,state.range),own=members.find(x=>x.key===p.key),metrics=[['snapRate','Snap rate',a.snapRate,'%'],['routeRate','Route participation',a.routeRate,'%'],['targetShare','Target share',own?.targetShare,'%'],['rushAtt','Carries',a.rushAtt,''],['redZone','Red-zone opportunities',a.redZone,''],['inside10','Touches inside 10',a.inside10,'']];const peers=selectedPlayers().filter(x=>A(x,through,state.range).n>=Math.min(3,a.n));const derived=x=>{const aa=A(x,through,state.range),s=S.teamShares(dataset,x.team,through,state.range).find(y=>y.key===x.key);return {...aa,targetShare:s?.targetShare};};const pp=peers.map(x=>({...x,m:derived(x)}));const dims=metrics.filter(m=>N(m[2])!==null);if(dims.length<3)dims.push(['workload','Workload / game',a.workload,'']);const percentile=(v,k)=>{const vs=pp.map(x=>x.m[k]).filter(v=>N(v)!==null);return vs.length?100*vs.filter(x=>x<=v).length/vs.length:0;};return positions()+controls({player:true,week:true,range:true})+hero(p,[['Targets',F(a.targets,0)],['Carries',F(a.rushAtt,0)],['Custom rank',p.customPositionRank?'#'+p.customPositionRank:'—']])+`<div class="st-metrics">${metrics.map(([k,l,v,u])=>metric(l,F(v,u?1:0,u),N(v)===null?'Not reported by this source':p.position+' rank '+(1+pp.filter(x=>N(x.m[k])!==null&&x.m[k]>v).length))).join('')}</div><div class="st-grid2">${panel('Usage profile radar','Within-position metric percentiles, not mixed raw units.',C.radar(dims.map(m=>m[1].replace('opportunities','opps').replace('Touches inside','Inside')), [{name:p.name,values:dims.map(m=>percentile(m[2],m[0]))},{name:'Position median',values:dims.map(m=>percentile(S.quantile(pp.map(x=>x.m[m[0]]),.5),m[0])),color:'#769ab7'}]))}${panel('Where the volume comes from','Player versus same-position average.',metrics.filter(m=>N(m[2])!==null).map(([k,l,v,u])=>`<div class="st-compare-metric"><span>${E(l)}<small style="display:block">Position average ${F(avg(pp.map(x=>x.m[k])),1,u)}</small></span><b>${F(v,1,u)}</b></div>`).join(''),'target')}</div>`+panel('Recent opportunity trend','Last five appearances in the selected period.',C.line({title:'Targets and carries over recent appearances',labels:G(p,through).slice(-5).map(g=>'W'+g.week),series:[{name:'Targets',values:G(p,through).slice(-5).map(g=>g.targets)},{name:'Carries',values:G(p,through).slice(-5).map(g=>g.rushAtt)}],area:false}))+method('Snap and route participation are separate fields. Routes are never estimated from snaps. Target share uses recorded team targets over the selected window. Red-zone opportunity = carries + targets at or inside the 20; inside-10 touches = carries + receptions. A dash means the feed did not report that metric; it is not zero.');}
function consistency(){const p=selected();if(!p)return C.empty();const c=S.consistency(p,state.week),cohort=selectedPlayers().map(p=>({p,c:S.consistency(p,state.week)})).filter(x=>x.c.n>=Math.min(c.n,3)).sort((a,b)=>(b.c.rates[0].percent||0)-(a.c.rates[0].percent||0));return positions()+controls({player:true,week:true})+hero(p,[['Median score',F(c.median)],['Recorded games',F(c.n,0)]])+panel('Scoring threshold hit rates','Each ring is independent. Hit rates are not added together.',`<div class="st-grid4">${c.rates.map((r,i)=>C.ring(r.percent,r.threshold+'+ PPR',r.count+' of '+c.n+' games',C.colors[i])).join('')}</div>`,'target')+`<div class="st-metrics">${metric('Median',F(c.median),'Observed PPR points')}${metric('Lower range · P10',F(c.floor),'10th percentile, not a guaranteed floor')}${metric('Upper range · P90',F(c.ceiling),'90th percentile, not a projected ceiling')}${metric('Standard deviation',F(c.sd),'Lower = less week-to-week spread')}</div>`+panel(state.pos+' hit-rate comparison','Players with at least '+Math.min(c.n,3)+' recorded appearances.',`<div class="st-table-wrap"><table><thead><tr><th>Player</th><th>Games</th>${c.rates.map(r=>`<th>${r.threshold}+ PPR</th>`).join('')}</tr></thead><tbody>${cohort.map(x=>`<tr><td>${person(x.p)}</td><td>${x.c.n}</td>${x.c.rates.map((r,i)=>`<td><b style="color:${C.colors[i]}">${F(r.percent,0,'%')}</b><div style="height:4px;margin-top:5px;background:#20374b"><div style="height:100%;width:${r.percent||0}%;background:${C.colors[i]}"></div></div></td>`).join('')}</tr>`).join('')}</tbody></table></div>`).replace('class="st-panel"','class="st-panel st-hit-rate-full-panel"')+method('QB thresholds are 15/20/25/30 points; RB/WR/TE thresholds are 10/15/20/25. The denominator is recorded appearances, excluding byes and missing logs. Partial injury games with recorded statistics remain included.');}
function teams(){const members=S.teamShares(dataset,state.team,state.week,state.range).sort((a,b)=>(b.targets||0)+(b.rushAtt||0)-(a.targets||0)-(a.rushAtt||0));const carr=members.filter(p=>p.position==='RB').map(p=>({...p,value:p.rushAtt})).filter(p=>p.value>0),tgt=members.filter(p=>p.position==='WR').map(p=>({...p,value:p.targets})).filter(p=>p.value>0);return controls({team:true,week:true,range:true})+`<div class="st-hero" style="min-height:110px"><div class="st-hero-art">${logo(state.team,'st-face')}</div><div class="st-hero-copy"><span class="st-eyebrow">TEAM OPPORTUNITY</span><h3>${E(S.teams[state.team])}</h3><p class="st-footnote">${dataset.year} · ${state.range?'Last '+state.range+' weeks':'Season to date'} · through Week ${state.week}</p></div></div><div class="st-grid2">${panel('Running back carry share','Distribution within team RB carries.',C.donut(carr,{label:'RB carries'}))}${panel('Wide receiver target share','Distribution within team WR targets.',C.donut(tgt,{label:'WR targets'}))}${panel('Red-zone usage','Shares of all recorded red-zone opportunities.',C.donut(members.map(p=>({...p,value:p.redZone})),{label:'RZ opportunities'}))}${panel('Offensive snap rate','Individual snap rate. Rates overlap and are not a pie.',C.bars({title:'Individual offensive snap rates',labels:members.filter(p=>N(p.snapRate)!==null).slice(0,6).map(p=>chartName(p)),series:[{name:'Snap rate',values:members.filter(p=>N(p.snapRate)!==null).slice(0,6).map(p=>p.snapRate),unit:'%',color:C.colors[1]}],percent:true}))}</div>`+panel('Opportunity leaders','Shares use team totals, not just the players displayed below.',`<div class="st-table-wrap"><table><thead><tr><th>Player</th><th>Carries</th><th>Carry share</th><th>Targets</th><th>Target share</th><th>Red zone</th><th>Snap rate</th></tr></thead><tbody>${members.slice(0,15).map(p=>`<tr><td>${person(p)}</td><td>${F(p.rushAtt,0)}</td><td>${F(p.carryShare,1,'%')}</td><td>${F(p.targets,0)}</td><td>${F(p.targetShare,1,'%')}</td><td>${F(p.redZone,0)}</td><td>${F(p.snapRate,1,'%')}</td></tr>`).join('')}</tbody></table></div>`)+method('Donut segments sum to their named group: RB carries or WR targets. The leaders table uses the full offense as its denominator. Multiple players share the field on each snap, so individual snap rates are intentionally shown as separate bars, not a donut.');}
async function rankings(id){const base=positions()+controls({player:true,ranking:true});const host=document.getElementById('stContent');host.innerHTML=base+`<div id="stRankBody" class="st-loading">Reading your published ranking revisions…</div>`;let result;try{result=await S.Data.rankHistory(state.rankSource);}catch(e){if(id===renderId)document.getElementById('stRankBody').innerHTML=note('Ranking revisions could not be retrieved. '+E(e.message),true);return;}if(id!==renderId)return;historyData=result;const p=selected();if(!p)return;const snaps=result.snapshots.filter(x=>x.ranks?.[p.key]),labels=snaps.map(x=>new Date(x.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})),values=snaps.map(x=>x.ranks[p.key].rank),latest=values.at(-1),delta=values.length>1?values[0]-latest:null;const current=result.snapshots.at(-1)?.ranks||{},near=Object.entries(current).filter(([k,v])=>state.rankSource==='big-board.json'||v.position===state.pos).sort((a,b)=>a[1].rank-b[1].rank),idx=near.findIndex(([k])=>k===p.key);const first3=snaps.slice(-3);document.getElementById('stRankBody').outerHTML=`<div id="stRankBody">${hero(p,[['Latest custom rank',latest?'#'+latest:'Unranked'],['Published revisions',snaps.length]],delta===null?null:[(delta>0?'+':'')+delta+' places','change over shown revisions'])}${snaps.length===1?note('One published snapshot is available for this player. A line is not invented between nonexistent revisions.'):''}${panel('Ranking position over time','Lower numbers are better. Dates come from the actual Git commits.',C.line({title:'Custom ranking movement',labels,series:[{name:state.rankSource==='big-board.json'?'Your overall rank':'Your '+state.pos+' ROS rank',values}],invert:true,area:false}),'trend')}${panel('Revision timeline','Recorded commit messages—not inferred injury or performance events.',`<div class="st-timeline">${first3.map(s=>`<div><small>${E(new Date(s.date).toLocaleDateString())}</small><b>#${s.ranks[p.key].rank}</b><p>${E(s.message)}</p></div>`).join('')}</div>`)}${panel('Nearby in your rankings','Current neighboring players, in your exact order.',`<div class="st-grid4">${near.slice(Math.max(0,idx-2),idx+3).filter(([k])=>k!==p.key).map(([k,r])=>{const x=dataset.players.find(p=>p.key===k)||{key:k,name:r.name,position:r.position||'',team:''};return `<div class="st-feature">${person(x)}<span class="st-big-value">#${r.rank}<small>Custom rank</small></span></div>`;}).join('')}</div>`)}${method('Source: '+E(state.rankSource)+'. These charts read real Git revisions and never substitute ESPN finishing ranks. Missing players are omitted from a revision rather than assigned a fabricated rank. The underlying ranking files are not modified by Analytics.')}</div>`;}
function schedulePositions(roster){
 const options=['QB','RB','WR','TE','DST'].map(pos=>[pos,pos==='DST'?'D/ST':pos]);
 const current=options.some(([pos])=>pos===state.schedulePos)?state.schedulePos:'QB';
 return '<div class="st-position st-schedule-positions" role="group" aria-label="Schedule positions">'+options.map(([pos,label])=>'<button type="button" data-st-schedule-pos="'+pos+'" aria-pressed="'+(current===pos)+'">'+label+'</button>').join('')+'</div>';
}
function schedulePlayer(p){
 const portrait=p.position==='DST'?logo(p.team,'st-schedule-face st-schedule-team-photo'):face(p,'st-schedule-face');
 const content='<span class="st-schedule-avatar">'+portrait+'</span><span class="st-schedule-person-info"><strong>'+E(p.name)+'</strong><small>'+logo(p.team,'st-schedule-team-logo')+'<span>'+E(p.team||'Team unavailable')+' · '+E(p.position==='DST'?'D/ST':p.position)+'</span></small></span>';
 return p.position==='DST'
   ?'<div class="st-schedule-person st-schedule-defense">'+content+'</div>'
   :'<button type="button" class="st-schedule-person st-schedule-person-button" data-st-open="'+E(p.key)+'" aria-label="Open '+E(p.name)+' player profile">'+content+'</button>';
}
function showScheduleSuggestions(inputText){
 const root=section.querySelector('#stScheduleSuggestions'),input=section.querySelector('#stScheduleSearch');
 if(!root||!input)return;
 const query=String(inputText||'').trim().toLowerCase();
 const positions=['QB','RB','WR','TE','DST'];
 const players=positions.flatMap(pos=>dataset?.scheduleRoster?.[pos]||[]);
 if(query.length<2){
  root.hidden=true;root.replaceChildren();input.setAttribute('aria-expanded','false');
  return;
 }
 const results=players.filter(p=>p.name.toLowerCase().includes(query)).sort((a,b)=>{
  const sameA=a.position===state.schedulePos?0:1,sameB=b.position===state.schedulePos?0:1;
  const startA=a.name.toLowerCase().startsWith(query)?0:1,startB=b.name.toLowerCase().startsWith(query)?0:1;
  return startA-startB||sameA-sameB||(a.rosRank||999)-(b.rosRank||999)||a.name.localeCompare(b.name);
 }).slice(0,9);
 root.innerHTML=results.map(p=>'<button type="button" role="option" class="st-schedule-suggestion" data-st-suggest="'+E(p.key)+'" data-st-suggest-pos="'+E(p.position)+'" aria-label="Show '+E(p.name)+' in Schedule">'+
 (p.position==='DST'?logo(p.team,'st-schedule-suggestion-face'):face(p,'st-schedule-suggestion-face'))+
 '<span class="st-schedule-suggest-copy"><strong>'+E(p.name)+'</strong><small>'+logo(p.team,'st-schedule-suggestion-logo')+E(p.team)+' · '+E(p.position==='DST'?'D/ST':p.position)+'</small></span></button>').join('')
 ||'<div class="st-schedule-no-match">No matching players or defenses</div>';
 root.hidden=false;input.setAttribute('aria-expanded','true');
}
function openScheduleSuggestion(btn){
 const pos=btn.dataset.stSuggestPos,k=btn.dataset.stSuggest;
 if(!['QB','RB','WR','TE','DST'].includes(pos)||!k)return;
 state.schedulePos=pos;
 state.scheduleFocusKey=k;
 state.scheduleQuery='';
 state.scheduleScrollPending=true;
 render();
}
function dstDifficulty(ds,through,last){
 const start=last?Math.max(1,through-last+1):1,byWeek=new Map();
 for(const player of ds.players)for(const game of G(player,through)){
  if(game.week<start||!S.teams[game.team])continue;
  const id=game.team+'|'+game.week;
  if(!byWeek.has(id))byWeek.set(id,{team:game.team,week:game.week,turnovers:0});
  byWeek.get(id).turnovers+=(N(game.interceptions)||0)+(N(game.fumblesLost)||0);
 }
 const rows=Object.keys(S.teams).map(team=>{
  const games=[...byWeek.values()].filter(g=>g.team===team);
  return {team,allowed:avg(games.map(g=>g.turnovers)),games:games.length};
 }).filter(row=>row.allowed!==null);
 rows.sort((a,b)=>b.allowed-a.allowed||a.team.localeCompare(b.team));
 rows.forEach(row=>row.rank=1+rows.filter(x=>x.allowed>row.allowed).length);
 return {rows,byTeam:Object.fromEntries(rows.map(x=>[x.team,x]))};
}
function schedule(){
 const toolbar='<div class="st-schedule-toolbar"><div class="st-schedule-search-wrap"><label for="stScheduleSearch"><span class="st-label">Search</span></label><input id="stScheduleSearch" type="search" placeholder="Search players" role="combobox" aria-autocomplete="list" aria-controls="stScheduleSuggestions" aria-expanded="false" autocomplete="off" value="'+E(state.scheduleQuery||'')+'"><div id="stScheduleSuggestions" role="listbox" aria-label="Matching players" hidden></div></div><div class="st-schedule-filters">'+controls({week:true,season:false})+'</div></div>';
 if(!dataset.scheduleRoster&&!dataset.scheduleRosterError){
  if(!dataset.scheduleRosterPending){
   const currentDataset=dataset;
   currentDataset.scheduleRosterPending=S.Data.scheduleRoster(currentDataset).then(roster=>{
    currentDataset.scheduleRoster=roster;
    if(visible&&dataset===currentDataset&&state.view==='schedule')render();
   }).catch(err=>{
    currentDataset.scheduleRosterError=String(err.message||err);
    if(visible&&dataset===currentDataset&&state.view==='schedule')render();
   });
  }
  return toolbar+panel('Loading matchups','Including every ranked player and all 32 defenses.',C.empty('Loading complete position rankings, headshots and teams…'));
 }
 if(dataset.scheduleRosterError)return toolbar+note('Unable to load schedule rosters: '+E(dataset.scheduleRosterError),true);
 const roster=dataset.scheduleRoster;
 const pos=['QB','RB','WR','TE','DST'].includes(state.schedulePos)?state.schedulePos:'QB';
 const players=roster[pos]||[];
 const through=Math.min(state.week-1,dataset.latestWeek);
 if(!dataset.espnRatings)return schedulePositions(roster)+toolbar+note('ESPN full-PPR matchup rankings are temporarily unavailable. '+E(dataset.espnRatingsError||'Retry later.')+' No local rankings are substituted.',true);
 const ratings={};
 for(const p of new Set(players.map(p=>p.position))){
  ratings[p]=S.Data.espnDefense(dataset.espnRatings,p);
 }
 const weeks=Array.from({length:Math.max(0,19-state.week)},(_,i)=>i+state.week);
 const rows=players.map((player,index)=>{
  const grades=weeks.filter(w=>!dataset.schedule[player.team]?.[w]?.bye).map(w=>ratings[player.position]?.byTeam[dataset.schedule[player.team]?.[w]?.opponent]).filter(Boolean);
  return {...player,rosOrder:index,average:avg(grades.map(d=>d.allowed)),rankAverage:avg(grades.map(d=>d.espnRank))};
 });
 const activeWeek=weeks.includes(+state.scheduleSortWeek)&&state.scheduleSortWeek!=null?+state.scheduleSortWeek:null;
 const sortDirection=state.scheduleSortDirection==='hard'?'hard':'easy';
 const difficultyAt=(p,week)=>{
  const opponent=dataset.schedule[p.team]?.[week];
  if(!opponent||opponent.bye||!S.teams[opponent.opponent])return null;
  return N(ratings[p.position]?.byTeam[opponent.opponent]?.rank);
 };
 if(activeWeek!==null)rows.sort((a,b)=>{
  const ra=difficultyAt(a,activeWeek),rb=difficultyAt(b,activeWeek);
  if(ra===null)return rb===null?a.rosOrder-b.rosOrder:1;
  if(rb===null)return -1;
  const delta=sortDirection==='hard'?rb-ra:ra-rb;
  return delta||a.rosOrder-b.rosOrder;
 });
 const metricLabel=p=>p.position==='DST'?'opponent offensive turnovers / game':'PPR allowed per game';
 let body=schedulePositions(roster)+toolbar;
 const cells=rows.map(p=>{
  const highlighted=state.scheduleFocusKey===p.key;
  const playerRow='<tr data-st-schedule-key="'+E(p.key)+'" data-st-schedule-name="'+E(p.name.toLowerCase())+'" class="'+(highlighted?'st-schedule-highlight':'')+'"><th scope="row" class="st-heat-player">'+schedulePlayer(p)+'</th>';
  return playerRow+weeks.map(w=>{
   const opponent=dataset.schedule[p.team]?.[w];
   const matchup=ratings[p.position]?.byTeam[opponent?.opponent];
   const hasOpponent=opponent?.known&&!opponent.bye&&!!S.teams[opponent.opponent];
   const unavailable=!S.teams[p.team]||!opponent?.known;
   const label=opponent?.bye?'BYE':hasOpponent?(opponent.home?'vs ':'@ ')+opponent.opponent:'—';
   const matchupHtml=hasOpponent?'<span class="st-week-opponent">'+logo(opponent.opponent,'st-week-opponent-logo').replace('alt=""','alt="'+E(opponent.opponent)+'"')+'</span>':E(label);
   const difficulty=opponent?.bye?'bye':unavailable?'':color(matchup?.rank);
   const tip=p.name+' · Week '+w+' · '+label+(matchup?' · ESPN OPRK '+matchup.espnRank+'/32 · '+F(matchup.allowed,1)+' '+metricLabel(p):' · opponent rating unavailable');
   return '<td><div class="st-heat-cell '+difficulty+'" tabindex="0" title="'+E(tip)+'"><b>'+matchupHtml+'</b><small>'+(!opponent?.bye&&matchup?String(matchup.espnRank):'—')+'</small></div></td>';
  }).join('')+'</tr>';
 }).join('');
 const weekHead=weeks.map(w=>{
  const selected=activeWeek===w,indicator=selected?(sortDirection==='easy'?'↑':'↓'):'';
  const description=selected?(sortDirection==='easy'?'Easiest first':'Hardest first'):'Sort by matchup difficulty';
  return '<th scope="col" aria-sort="'+(selected?(sortDirection==='easy'?'ascending':'descending'):'none')+'"><button type="button" class="st-week-sort'+(selected?' active':'')+'" data-st-sort-week="'+w+'" aria-label="Week '+w+': '+description+'" title="Week '+w+' · '+description+'">W'+w+(indicator?' <span class="st-week-sort-icon" aria-hidden="true">'+indicator+'</span>':'')+'</button></th>';
 }).join('');
 body+='<section class="st-panel st-schedule-heatmap-panel">'+
  '<div class="st-heat-scroll"><table class="st-heat-table"><thead><tr><th class="st-heat-player" scope="col">Player</th>'+weekHead+'</tr></thead><tbody id="stScheduleRows">'+cells+'</tbody></table></div></section>';
 const bestTeams=Object.keys(S.teams).map(team=>{
  const grades=weeks.map(w=>{
   const matchup=dataset.schedule[team]?.[w];
   if(!matchup?.known||matchup.bye)return null;
   return ratings[pos]?.byTeam[matchup.opponent]?.espnRank??null;
  }).filter(Number.isFinite);
  return {team,rankAverage:avg(grades)};
 }).sort((a,b)=>{
  if(a.rankAverage===null)return b.rankAverage===null?S.teams[a.team].localeCompare(S.teams[b.team]):1;
  if(b.rankAverage===null)return -1;
  return b.rankAverage-a.rankAverage||S.teams[a.team].localeCompare(S.teams[b.team]);
 });
 body+=panel('Best Remaining Schedules','',
  '<div class="st-schedule-best" id="stScheduleBest">'+bestTeams.map((entry,i)=>
   '<button type="button" class="st-schedule-best-row st-schedule-best-team-button" data-st-depth-team="'+E(entry.team)+'"><span class="st-rank-num">'+(i+1)+'</span><span class="st-schedule-best-team">'+logo(entry.team,'st-schedule-best-team-logo')+'<strong>'+E(S.teams[entry.team])+'</strong></span><b class="st-schedule-average">'+(entry.rankAverage===null?'—':F(entry.rankAverage,1))+'</b></button>'
  ).join('')+'</div>','cup').replace('class="st-panel"','class="st-panel st-schedule-best-panel"');
 if(state.scheduleScrollPending&&state.scheduleFocusKey){
  const focus=state.scheduleFocusKey;
  state.scheduleScrollPending=false;
  requestAnimationFrame(()=>{
   if(state.view!=='schedule')return;
   const el=[...document.querySelectorAll('#stScheduleRows tr')].find(x=>x.dataset.stScheduleKey===focus);
   if(el){el.hidden=false;el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});}
  });
 }
 return body;
}
function injuryLabel(p){
 const code=String(p.injuryStatus||'').toUpperCase().replace(/[\s-]+/g,'_');
 return {OUT:'Out',DOUBTFUL:'Doubtful',QUESTIONABLE:'Questionable',INJURY_RESERVE:'Injured reserve',INJURED_RESERVE:'Injured reserve',IR:'Injured reserve',PUP:'PUP',DAY_TO_DAY:'Day-to-day'}[code]||null;
}
function injuryCases(){
 return dataset.players.filter(p=>S.positions.includes(p.position)&&injuryLabel(p)).sort((a,b)=>{
  const score=p=>{const usage=A(p,dataset.latestWeek);return(p.customRank?Math.max(0,900-6*p.customRank):0)+(p.customPositionRank?Math.max(0,250-8*p.customPositionRank):0)+(usage.ppg||0)*13+(usage.workload||0)*3;};
  return score(b)-score(a)||a.name.localeCompare(b.name);
 });
}
function injuryDetail(p){
 const rows=Object.entries(p.availability||{}).map(([w,v])=>({week:+w,detail:v.detail||''})).filter(x=>x.week<=dataset.latestWeek&&x.detail).sort((a,b)=>b.week-a.week);
 return rows.length?'Last reported W'+rows[0].week+' · '+rows[0].detail:'Current injury details unavailable';
}
function injuryWatch(starter,outWeeks){
 const latest=dataset.latestWeek;
 const eligible=dataset.players.filter(p=>p.team===starter.team&&p.key!==starter.key&&S.positions.includes(p.position)&&!['Out','Injured reserve','PUP','Doubtful'].includes(injuryLabel(p)));
 const preferred=p=>starter.position==='RB'?p.position==='RB':starter.position==='QB'?p.position==='QB':p.position==='WR'||p.position==='TE';
 const split=outWeeks.length?S.splits(dataset,starter,starter.team,latest,outWeeks):{out:[],withWeeks:[],rows:[]};
 const measured=split.rows.filter(r=>r.delta!==null&&r.delta>0&&r.nWith>=1&&r.nWithout>=1&&eligible.some(p=>p.key===r.player.key)).sort((a,b)=>b.delta-a.delta).slice(0,5);
 const used=new Set(measured.map(r=>r.player.key));
 const watch=eligible.filter(p=>!used.has(p.key)).map(p=>({player:p,recent:A(p,latest,4),season:A(p,latest),preferred:preferred(p)})).filter(x=>x.recent.n||x.season.n).sort((a,b)=>Number(b.preferred)-Number(a.preferred)||(b.recent.workload??b.season.workload??0)-(a.recent.workload??a.season.workload??0)).slice(0,6);
 return {split,measured,watch};
}
function injury(){
 const current=dataset.year===2026,all=injuryCases();
 if(!all.length)return controls()+panel('Offensive injury report','Reported designations for QBs, RBs, WRs and TEs.',C.empty('No injured offensive players in the current snapshot.'));
 const pos=state.injuryPos||'ALL',status=state.injuryStatus||'ALL';
 const filtered=all.filter(p=>(pos==='ALL'||p.position===pos)&&(status==='ALL'||injuryLabel(p)===status));
 const starter=filtered.find(p=>p.key===state.injuredKey)||filtered[0];
 if(starter)state.injuredKey=starter.key;
 const snapshot=dataset.snapshotAt?new Date(dataset.snapshotAt):null,valid=snapshot&&!isNaN(snapshot.getTime());
 const stamp=valid?snapshot.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'Unknown';
 const stale=!valid||Date.now()-snapshot.getTime()>48*3600000;
 let output='<div class="st-injury-header"><span class="st-eyebrow">'+(current?'CURRENT INJURY DESIGNATIONS':'ARCHIVED SEASON INJURY DESIGNATIONS')+'</span><h3>Injured offensive players</h3><p>Tap any player to see who gained opportunities in past absences, and who has the workload to benefit if they miss time.</p></div>';
 output+='<div class="st-injury-filters">'+select('stSeason','Season',[[2026,'2026'],[2025,'2025 archive'],[2024,'2024 archive']],state.year)+select('stInjuryPos','Position',[['ALL','All positions'],['QB','QB'],['RB','RB'],['WR','WR'],['TE','TE']],pos)+select('stInjuryStatus','Status',[['ALL','All injury statuses'],['Out','Out'],['Questionable','Questionable'],['Doubtful','Doubtful'],['Injured reserve','Injured reserve'],['PUP','PUP']],status)+'</div>';
 const listing=filtered.map(p=>'<button type="button" class="st-injury-item'+(p.key===starter?.key?' selected':'')+'" data-st-injury="'+E(p.key)+'" data-name="'+E(p.name.toLowerCase())+'" aria-pressed="'+(p.key===starter?.key)+'">'+face(p,'st-injury-face')+'<span class="st-injury-name"><b>'+E(p.name)+'</b><small>'+E(p.team)+' · '+E(p.position)+'</small></span><span class="st-injury-tag '+E(injuryLabel(p).toLowerCase().replace(/\s+/g,'-'))+'">'+E(injuryLabel(p))+'</span></button>').join('');
 output+='<div class="st-injury-layout"><aside class="st-injury-browser"><div class="st-injury-browser-top"><b>Injury report</b><span id="stInjuryCount">'+filtered.length+' players</span></div><label><span class="st-label">Find injured player</span><input id="stInjurySearch" type="search" placeholder="Search players" autocomplete="off" value="'+E(state.injurySearch||'')+'"></label><div class="st-injury-list" id="stInjuryList">'+listing+'</div><p class="st-injury-time">ESPN player designations, snapshot: '+E(stamp)+(stale?' · Over 48 hours old':'')+'. Check final game-day availability.</p></aside><div class="st-injury-detail">';
 if(!starter)return output+C.empty('No players match these filters.')+'</div></div>';
 const out=Object.entries(starter.availability||{}).filter(([w,r])=>+w<=dataset.latestWeek&&String(r.status).toLowerCase()==='out').map(([w])=>+w).sort((a,b)=>a-b);
 const impact=injuryWatch(starter,out),measured=impact.measured,watch=impact.watch;
 const combined=[...measured.map(r=>({p:r.player,value:r.delta,measured:true,source:r.nWith+' games with · '+r.nWithout+' out'})),...watch.map(w=>({p:w.player,value:w.recent.workload??w.season.workload,measured:false,source:w.preferred?'Similar position / recent usage':'Other offensive usage'}))].slice(0,5);
 output+=hero(starter,[['Injury status',injuryLabel(starter)],['Season PPR / game',F(A(starter).ppg)],['Verified Out weeks',out.length]],[starter.team,'Impact analysis']);
 output+='<p class="st-injury-note">'+E(injuryDetail(starter))+'. Injury status is a snapshot, not a confirmed upcoming-game absence.</p>';
 if(stale)output+=note('Injury designations are over 48 hours old. Verify today’s official report before deciding your lineup.',true);
 output+=panel('Who benefits most?','Recorded gains first; other teammates are ranked by relevant opportunities, not projected increases.',combined.length?'<div class="st-podium">'+combined.slice(0,3).map((x,i)=>feature(x.p,i,(x.measured?'+':'')+F(x.value),x.measured?'observed extra opps / game':'recent opps / game','<p class="st-injury-evidence">'+(x.measured?'Observed in reported Out games':'Watch candidate · not a projection')+'<small>'+E(x.source)+'</small></p>')).join('')+'</div>':C.empty('No teammate workload data is available.'),'cup');
 output+=panel('Beneficiary rankings','Observed increases reflect carries + targets per game. Watch candidates reflect existing opportunity.',combined.map((x,i)=>'<div class="st-injury-benefit-row"><span class="st-rank-num">'+(i+1)+'</span>'+person(x.p)+'<div class="st-injury-impact'+(x.measured?' measured':'')+'"><b>'+(x.measured?'+':'')+F(x.value)+'</b><small>'+(x.measured?'observed gain':'recent workload')+'</small></div></div>').join('')||C.empty(),'target');
 const cohort=combined.slice(0,5).map(x=>x.p);
 if(measured.length&&out.length){
  const rows=impact.split.rows.filter(r=>r.nWith>=1&&r.nWithout>=1&&cohort.some(p=>p.key===r.player.key)).slice(0,6);
  output+=panel('With vs. without '+starter.name,'Actual teammate carries and targets per game during confirmed Out reports.',C.bars({title:'Recorded opportunity with and without the injured player',labels:rows.map(r=>chartName(r.player)),series:[{name:'With starter',values:rows.map(r=>r.with),color:'#7798b5'},{name:'In reported Out weeks',values:rows.map(r=>r.without),color:C.colors[0]}]}),'trend');
 }else{
  output+=panel('Available teammate workload','Baseline opportunities per game; not an injury-specific gain.',C.bars({title:'Teammate opportunities per game',labels:cohort.map(chartName),series:[{name:'Recorded workload',values:cohort.map(p=>A(p,dataset.latestWeek,4).workload??A(p,dataset.latestWeek).workload),color:C.colors[0]}]}),'trend');
 }
 const weeks=[...new Set(cohort.flatMap(p=>G(p,dataset.latestWeek).slice(-5).map(g=>g.week)))].sort((a,b)=>a-b);
 output+=panel('Opportunity trends','Weekly carries + targets for the most relevant teammates.',C.line({title:'Recent weekly teammate opportunities',labels:weeks.map(w=>'W'+w),series:cohort.slice(0,3).map(p=>({name:p.name,values:weeks.map(w=>{const game=G(p,dataset.latestWeek).find(g=>g.week===w);return game?(game.targets??0)+(game.rushAtt??0):null;})})),area:false}),'trend');
 output+=note(out.length?'Officially reported Out weeks in this season: '+out.join(', ')+'. '+(measured.length?'Measured gains compare games with and without the selected player.':'No comparable sample supports a measured opportunity increase yet.'):'No weekly Out designation was found for this player in the recorded season. Teammates shown are usage-based watch candidates, not confirmed beneficiaries.');
 output+=method('Latest ESPN injury status from the '+dataset.year+' fantasy data snapshot; historical weekly Out reports from nflverse. Questionable, Out and Injured Reserve do not necessarily describe final game-day eligibility. Observed gain equals recorded carries + targets per teammate appearance in the selected player’s reported Out weeks minus those in games where that player was present. Without enough recorded games, names are prioritized by similar offensive role and last-four-week workload only; no added opportunities are forecast. Small samples and other team changes may affect comparisons.');
 return output+'</div></div>';
}
function startsit(){const candidates=selectedPlayers();let chosen=state.compare.map(k=>dataset.players.find(p=>p.key===k)).filter(p=>p&&p.position===state.pos);if(chosen.length<2)chosen=candidates.slice(0,2);state.compare=chosen.map(p=>p.key);const through=Math.min(state.week-1,dataset.latestWeek),def=defenseForPosition(state.pos,through,state.range);if(!def)return positions()+controls({week:true})+note('Verified ESPN PPR matchup ratings are temporarily unavailable.',true);const info=chosen.map(p=>{const a=A(p,through),recent=G(p,through).slice(-3),d=def.byTeam[upcoming(p)?.opponent],co=S.consistency(p,through),m=S.teamShares(dataset,p.team,through).find(x=>x.key===p.key),recentPpg=avg(recent.map(g=>g.points)),adj=d&&def.league?Math.max(-.15,Math.min(.15,.2*(d.allowed/def.league-1))):0,estimate=recentPpg===null||upcoming(p)?.bye?null:recentPpg*(1+adj);return {p,a,d,co,recentPpg,estimate,targetShare:m?.targetShare};});const best=[...info].filter(x=>x.estimate!==null).sort((a,b)=>b.estimate-a.estimate)[0],floor=[...info].filter(x=>x.co.floor!==null).sort((a,b)=>b.co.floor-a.co.floor)[0];const metricValues=info.map(x=>[x.recentPpg,x.a.workload,x.d?.score,x.co.floor]),scales=[0,1,2,3].map(i=>Math.max(1,...metricValues.map(x=>x[i]||0)));return positions()+controls({week:true})+`<div class="st-controls">${[0,1,2,3].map(i=>select('stCompare'+i,'Player '+(i+1)+(i>=2?' · optional':''),[['','Choose player'],...candidates.map(p=>[p.key,p.name])],chosen[i]?.key||'')).join('')}</div><div class="st-comparison">${info.map((x,i)=>feature(x.p,i,F(x.estimate),'Trend-based PPR estimate',`<p>${opponentHtml(x.p,def)}</p><div class="st-compare-metric"><span>Last 3 PPG</span><b>${F(x.recentPpg)}</b></div><div class="st-compare-metric"><span>Opportunities / game</span><b>${F(x.a.workload)}</b></div><div class="st-compare-metric"><span>Target share</span><b>${F(x.targetShare,1,'%')}</b></div><div class="st-compare-metric"><span>Your custom rank</span><b>${x.p.customPositionRank?'#'+x.p.customPositionRank:'—'}</b></div>`)).join('')}</div><div class="st-grid2">${panel('Player comparison','Each axis is scaled within this selection; not a probability.',C.radar(['Recent PPG','Workload','Matchup','Observed P10'],info.map((x,i)=>({name:x.p.name,values:metricValues[i].map((v,j)=>v==null?0:Math.max(0,v)/scales[j]*100),color:C.colors[i]}))))}${panel('Decision notes','Transparent reference points—not a guaranteed outcome.',best?note('<strong>Highest trend estimate: '+E(best.p.name)+'.</strong><br>'+F(best.estimate)+' PPR using '+Math.min(3,best.a.n)+' recent appearances.')+(floor?note('<strong>Highest observed lower range: '+E(floor.p.name)+'.</strong><br>P10 '+F(floor.co.floor)+' across '+floor.co.n+' recorded appearances.'):'')+`<p class="st-footnote">Your overall and position rankings remain separate and unchanged.</p>`:C.empty('Choose a week with prior recorded appearances.'),'cup')}</div>`+panel('Recent scoring comparison','Actual PPR points through the week before the selected matchup.',(()=>{const ws=[...new Set(chosen.flatMap(p=>G(p,through).slice(-5).map(g=>g.week)))].sort((a,b)=>a-b);return C.line({title:'Recent PPR player comparison',labels:ws.map(w=>'W'+w),series:chosen.map(p=>({name:p.name,values:ws.map(w=>G(p,through).find(g=>g.week===w)?.points??null)})),area:false});})())+method('Trend estimate = last 3 recorded games’ mean PPR × [1 + 0.2 × (opponent PPR allowed / league mean − 1)], with the adjustment capped at ±15%. Unrated matchups receive no adjustment. This is a simple disclosed reference model, not ESPN projections or calibrated confidence. Workload is carries + targets per appearance. Comparison axes use different scales; raw values remain above. Byes must not be started.');}
function weekly(){const week=state.week,rows=dataset.players.map(p=>{const g=G(p).find(g=>g.week===week),prior=G(p,week-1).slice(-3);return g?{...p,g,baseline:avg(prior.map(g=>g.points)),delta:prior.length===3?g.points-avg(prior.map(g=>g.points)):null}:null;}).filter(Boolean);const top=[...rows].sort((a,b)=>b.g.points-a.g.points),targets=[...rows].filter(p=>N(p.g.targets)!==null).sort((a,b)=>b.g.targets-a.g.targets),rush=[...rows].filter(p=>N(p.g.rushYds)!==null).sort((a,b)=>b.g.rushYds-a.g.rushYds),under=[...rows].filter(p=>p.delta!==null).sort((a,b)=>a.delta-b.delta);const changes=rows.map(p=>{const prev=G(p,week-1).at(-1),now=p.g.snapRate??S.pct(p.g.snaps,p.g.teamSnaps),before=prev?.snapRate??S.pct(prev?.snaps,prev?.teamSnaps);return {...p,change:now!==null&&before!==null?now-before:null};}).filter(p=>p.change!==null).sort((a,b)=>Math.abs(b.change)-Math.abs(a.change));return controls({week:true})+(rows.length?'':note('No recorded player statistics for Week '+week+'. Choose a completed week.',true))+panel('Top fantasy scorers','Actual PPR scores from Week '+week+'.',`<div class="st-podium">${top.slice(0,3).map((p,i)=>feature(p,i,F(p.g.points),'PPR points',`<p class="st-footnote">${E(p.g.opponent)} · ${F(p.g.targets,0)} targets · ${F(p.g.rushAtt,0)} carries</p>`)).join('')}</div>`,'cup')+`<div class="st-grid2">${panel('Below recent form','Change versus the previous 3 appearances, not a projection.',rankedRows(under,p=>F(p.delta),'PPR change',5),'trend')}${panel('Target leaders','Most recorded targets in the selected week.',rankedRows(targets,p=>F(p.g.targets,0),'targets',5),'target')}${panel('Rushing leaders','Recorded rushing yards, not season totals.',rankedRows(rush,p=>F(p.g.rushYds,0),'rush yards',5))}${panel('Playing-time changes','Snap-rate change versus the previous recorded appearance.',changes.length?rankedRows(changes,p=>(p.change>0?'+':'')+F(p.change,0),'pct-point change',5):C.empty('This source has no paired snap reports for the selected week. No playing-time changes are estimated.'))}</div>`+panel('Weekly top fantasy scorers','Every bar represents the selected week only.',C.bars({title:'Top ten weekly PPR scorers',labels:top.slice(0,10).map(p=>chartName(p)),players:top.slice(0,10),series:[{name:'Week '+week+' PPR',values:top.slice(0,10).map(p=>p.g.points)}]}))+method('Underperformers compare actual scores with the mean of their previous 3 recorded appearances. Players lacking 3 prior appearances are not labelled underperformers. Snap-rate changes are percentage-point differences, not relative percentage changes. Click any player name or card to open the existing player profile.');}
const renderers={trends,matchup,opportunity,consistency,teams,schedule,injury,startsit,weekly};
function shell(){section.innerHTML=`<label class="st-dashboard-picker" for="stDashboard"><span class="st-label">Choose analytics chart</span><select id="stDashboard" aria-label="Choose analytics chart">${pages.map((p,i)=>`<option value="${p[0]}" ${state.view===p[0]?'selected':''}>${E(p[1])}</option>`).join('')}</select></label><div class="st-layout"><nav class="st-navigation" role="tablist" aria-label="Analytics dashboards">${pages.map((p,i)=>`<button class="st-tab" id="st-tab-${p[0]}" type="button" role="tab" data-st-view="${p[0]}" aria-controls="stWorkspace" aria-selected="${state.view===p[0]}"><span>${String(i+1).padStart(2,'0')}</span>${shortNames[i]}</button>`).join('')}</nav><div class="st-workspace" id="stWorkspace" role="tabpanel" aria-labelledby="st-tab-${state.view}">${state.view==='schedule'?'':`<header class="st-heading"><div><span class="st-eyebrow">${E(dataset?.year||state.year)} · ${dataset?.year<2026?'Historical archive':'Season analytics'}</span><h2>${E(pages.find(p=>p[0]===state.view)[1])}</h2><p>${E(pages.find(p=>p[0]===state.view)[2])}</p></div></header>`}<div id="stContent"></div><footer id="stSource" class="st-footnote"></footer></div></div>`;}
function persist(){updateLink();try{localStorage.setItem('shuaStudioStateV1',JSON.stringify({...state,outWeeks:null}));}catch(e){}}
function render(){if(!visible||!dataset)return;const id=++renderId;C.reset();section.dataset.activeView=state.view;shell();const host=document.getElementById('stContent');try{if(state.view==='rankings')rankings(id);else host.innerHTML=renderers[state.view]();}catch(e){host.innerHTML=note('This dashboard could not render. '+E(e.message),true);console.error('SHUA Studio render',e);}const footer=document.getElementById('stSource');if(footer)footer.textContent=dataset.source+' · '+dataset.year+' · through recorded Week '+dataset.latestWeek+(dataset.snapshotAt?' · snapshot '+new Date(dataset.snapshotAt).toLocaleString():'');persist();section.dataset.ready='true';}
let firstLoad=true;
async function load(){const id=++epoch;if(firstLoad){firstLoad=false;let saved=null;try{saved=JSON.parse(localStorage.getItem('shuaStudioStateV1')||'null');}catch(e){}if(!saved?.year&&state.view!=='schedule'){state.year=await S.Data.preferredYear();if(id!==epoch)return;}}if(state.view==='schedule')state.year=2026;shell();const host=document.getElementById('stContent');section.dataset.ready='false';host.innerHTML='<div class="st-loading">Loading verified season data…<div class="st-skeleton" aria-hidden="true"></div></div>';try{const data=await S.Data.load(+state.year);if(id!==epoch)return;
if(data.year===2026){
 try{data.espnRatings=await S.Data.espnMatchups(2026);data.espnRatingsError=null;}
 catch(err){data.espnRatingsError=err.message||String(err);data.espnRatings=null;}
 if(id!==epoch)return;
}
dataset=data;state.week=Math.max(1,Math.min(18,state.week||(['matchup','schedule','startsit'].includes(state.view)?dataset.latestWeek+1:dataset.latestWeek)));render();}catch(e){if(id!==epoch)return;host.innerHTML=note(E(e.message),true)+`<button type="button" class="st-button" data-st-archive="2025">Open the 2025 historical dashboards</button> <button type="button" class="st-button" data-st-retry>Retry current season</button>`;section.dataset.ready='error';}}
function open(){if(state.view==='schedule'&&+state.year!==2026){state.scheduleReturnYear=+state.year;state.year=2026;}visible=true;document.body.classList.add('shua-studio-open');document.body.classList.remove('fantasy-home-mode','stats-mode','compare-mode','trade-mode','mobile-menu-open');for(const child of main.children){if(child===section)continue;if(!hiddenBefore.has(child))hiddenBefore.set(child,child.hidden);child.hidden=true;}section.hidden=false;navigation.querySelectorAll('.pos').forEach(b=>b.classList.toggle('active',b===button));try{localStorage.setItem('shuaPageStateV2',JSON.stringify({section:'ANALYTICS'}));}catch(e){}if(dataset&&dataset.year===+state.year)render();else load();}
function close(){visible=false;try{if(linkedView()){const u=new URL(location.href);u.hash='';history.replaceState(history.state,'',u);}}catch(e){}document.body.classList.remove('shua-studio-open');epoch++;renderId++;section.hidden=true;for(const [el,hidden] of hiddenBefore){if(el.isConnected)el.hidden=hidden;}hiddenBefore.clear();}
function showPlayer(k){const p=dataset?.players.find(x=>x.key===k)||Object.values(dataset?.scheduleRoster||{}).flat().find(x=>x.key===k);if(!p)return;let found=null;try{const candidates=[...(typeof board!=='undefined'?board:[]),...(typeof players!=='undefined'?players:[])];found=candidates.find(x=>key(x.name)===p.key);}catch(e){}if(found&&typeof window.profile==='function'){window.profile(found.id);document.getElementById('modal').dataset.studioProfile='1';return;}if(window.ShuaEspnLive?.openStatsPlayerByName?.(p.name)){document.getElementById('modal').dataset.studioProfile='1';return;}if(window.openUnifiedPlayerProfileByName){window.openUnifiedPlayerProfileByName(p.name);return;}state.view='trends';state.pos=p.position;state.player=p.key;state.week=dataset.latestWeek;render();}
button.onclick=()=>open();
window.addEventListener('hashchange',()=>{const v=linkedView();if(v)navigate(v);else if(visible)close();});
document.addEventListener('click',e=>{const b=e.target.closest?.('.positions .pos');if(b&&b!==button&&visible)close();},true);
section.addEventListener('click',e=>{
 const suggestion=e.target.closest('[data-st-suggest]');
 if(suggestion&&state.view==='schedule'){openScheduleSuggestion(suggestion);return;}
 const currentSuggestions=section.querySelector('#stScheduleSuggestions');
 if(currentSuggestions&&!e.target.closest('.st-schedule-search-wrap'))currentSuggestions.hidden=true;
 const weekSort=e.target.closest('[data-st-sort-week]');
 if(weekSort&&state.view==='schedule'){
  const week=+weekSort.dataset.stSortWeek;
  if(state.scheduleSortWeek!==week){state.scheduleSortWeek=week;state.scheduleSortDirection='easy';}
  else if(state.scheduleSortDirection==='easy'){state.scheduleSortDirection='hard';}
  else{state.scheduleSortWeek=null;state.scheduleSortDirection=null;}
  const oldScroll=section.querySelector('.st-heat-scroll');
  const x=oldScroll?.scrollLeft||0,y=oldScroll?.scrollTop||0;
  render();
  const nextScroll=section.querySelector('.st-heat-scroll');
  if(nextScroll){nextScroll.scrollLeft=x;nextScroll.scrollTop=y;}
  return;
 }
 const tab=e.target.closest('[data-st-view]');if(tab){navigate(tab.dataset.stView);return;}const injured=e.target.closest('[data-st-injury]');if(injured){state.injuredKey=injured.dataset.stInjury;render();return;}const schedulePos=e.target.closest('[data-st-schedule-pos]');if(schedulePos){state.schedulePos=schedulePos.dataset.stSchedulePos;state.scheduleFocusKey='';state.scheduleQuery='';render();return;}const pos=e.target.closest('[data-st-pos]');if(pos){state.pos=pos.dataset.stPos;state.player='';state.compare=[];render();return;}const teamLink=e.target.closest('[data-st-depth-team]');if(teamLink){
  const team=teamLink.dataset.stDepthTeam;
  window.shuaScheduleDepthReturn={view:'schedule',scrollX:window.scrollX,scrollY:window.scrollY,heatX:section.querySelector('.st-heat-scroll')?.scrollLeft||0,heatY:section.querySelector('.st-heat-scroll')?.scrollTop||0};
  const depthSelect=document.getElementById('depthTeam');
  const depthButton=document.querySelector('.positions [data-pos="DEPTH"]');
  if(depthSelect){depthSelect.value=team;depthSelect.dispatchEvent(new Event('change',{bubbles:true}));}
  if(depthButton)depthButton.click();
  if(depthSelect){depthSelect.value=team;depthSelect.dispatchEvent(new Event('change',{bubbles:true}));}
  return;
 }const player=e.target.closest('[data-st-open]');if(player){showPlayer(player.dataset.stOpen);return;}const arch=e.target.closest('[data-st-archive]');if(arch){state.year=+arch.dataset.stArchive;state.week=0;load();}if(e.target.closest('[data-st-retry]')){S.Data.clear();load();}});
section.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.st-schedule-best-row[data-st-open]')){e.preventDefault();showPlayer(e.target.dataset.stOpen);}});
section.addEventListener('change',e=>{const id=e.target.id,v=e.target.value;if(id==='stDashboard'){navigate(v);return;}if(id==='stSchedulePlayer'){state.scheduleFocusKey=v;state.scheduleScrollPending=true;render();return;}if(id==='stInjuryPos'){state.injuryPos=v;state.injuredKey='';render();return;}if(id==='stInjuryStatus'){state.injuryStatus=v;state.injuredKey='';render();return;}if(id==='stSeason'){if(state.view==='schedule')return;state.year=+v;state.week=0;state.outWeeks=null;load();return;}if(id==='stPlayer'){state.player=v;state.outWeeks=null;}else if(id==='stTeam'){state.team=v;state.player='';state.outWeeks=null;}else if(id==='stWeek'){state.week=+v;state.outWeeks=null;if(state.view==='schedule'){state.scheduleSortWeek=null;state.scheduleSortDirection=null;}}else if(id==='stRange')state.range=+v;else if(id==='stRankSource')state.rankSource=v;else if(id==='stPlayoffs'){state.playoffs=v==='playoffs';state.scheduleSortWeek=null;state.scheduleSortDirection=null;}else if(id==='stInjuredPlayer'){state.player=v;state.outWeeks=null;}else if(id.startsWith('stCompare')){state.compare=[0,1,2,3].map(i=>document.getElementById('stCompare'+i)?.value).filter(Boolean);state.compare=[...new Set(state.compare)];}else if(e.target.matches('[data-st-out]'))state.outWeeks=[...section.querySelectorAll('[data-st-out]:checked')].map(e=>+e.dataset.stOut);else return;render();});
section.addEventListener('input',e=>{
 if(e.target.id!=='stScheduleSearch')return;
 const search=e.target.value.trim().toLowerCase();state.scheduleQuery=search;
 let count=0;
 section.querySelectorAll('#stScheduleRows tr').forEach(row=>{
  row.hidden=!!search&&!row.dataset.stScheduleName.includes(search);
  if(!row.hidden)count++;
 });
 showScheduleSuggestions(search);
});
section.addEventListener('input',e=>{if(e.target.id!=='stInjurySearch')return;const q=e.target.value.toLowerCase().trim();state.injurySearch=q;let count=0;section.querySelectorAll('#stInjuryList [data-st-injury]').forEach(el=>{el.hidden=!!q&&!el.dataset.name.includes(q);if(!el.hidden)count++;});const counter=document.getElementById('stInjuryCount');if(counter)counter.textContent=count+' players';});
section.addEventListener('keydown',e=>{
 if(e.target.id==='stScheduleSearch'){
  const popup=section.querySelector('#stScheduleSuggestions');
  if(e.key==='Escape'){if(popup)popup.hidden=true;e.target.setAttribute('aria-expanded','false');return;}
  if(e.key==='ArrowDown'&&popup&&!popup.hidden){
   const first=popup.querySelector('[data-st-suggest]');
   if(first){e.preventDefault();first.focus();}
  }
 }else if(e.target.matches('[data-st-suggest]')){
  if(e.key==='Escape'){e.preventDefault();section.querySelector('#stScheduleSearch')?.focus();section.querySelector('#stScheduleSuggestions').hidden=true;}
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
   const options=[...section.querySelectorAll('[data-st-suggest]')],idx=options.indexOf(e.target);
   const next=options[idx+(e.key==='ArrowDown'?1:-1)];if(next){e.preventDefault();next.focus();}
  }
 }
});
let schedulePositionDrag=null;
function schedulePositionAt(x,y,bar){
 const rect=bar.getBoundingClientRect();
 if(y<rect.top-35||y>rect.bottom+35)return null;
 const buttons=[...bar.querySelectorAll('[data-st-schedule-pos]')];
 return buttons.reduce((best,b)=>{
  const r=b.getBoundingClientRect(),distance=Math.abs(x-(r.left+r.right)/2);
  return !best||distance<best.distance?{pos:b.dataset.stSchedulePos,distance}:best;
 },null)?.pos||null;
}
section.addEventListener('pointerdown',e=>{
 if(state.view!=='schedule'||e.pointerType==='mouse')return;
 const btn=e.target.closest('[data-st-schedule-pos]'),bar=btn?.closest('.st-schedule-positions');
 if(!bar)return;
 schedulePositionDrag={id:e.pointerId,bar,last:btn.dataset.stSchedulePos,moved:false};
 try{bar.setPointerCapture(e.pointerId);}catch(_){}
});
section.addEventListener('pointermove',e=>{
 const drag=schedulePositionDrag;
 if(!drag||e.pointerId!==drag.id)return;
 const pos=schedulePositionAt(e.clientX,e.clientY,drag.bar);
 if(pos&&pos!==drag.last){
  drag.last=pos;drag.moved=true;
  drag.bar.querySelectorAll('[data-st-schedule-pos]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.stSchedulePos===pos)));
  e.preventDefault();
 }
});
section.addEventListener('pointerup',e=>{
 const drag=schedulePositionDrag;
 if(!drag||e.pointerId!==drag.id)return;
 schedulePositionDrag=null;
 try{drag.bar.releasePointerCapture(e.pointerId);}catch(_){}
 if(drag.moved){
  state.schedulePos=drag.last;state.scheduleFocusKey='';state.scheduleQuery='';
  render();e.preventDefault();
 }
});
section.addEventListener('pointercancel',e=>{if(schedulePositionDrag?.id===e.pointerId)schedulePositionDrag=null;});
section.addEventListener('contextmenu',e=>{if(e.target.closest('.st-schedule-positions'))e.preventDefault();});
section.addEventListener('keydown',e=>{const tab=e.target.closest('[role=tab]');if(!tab||!['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Home','End'].includes(e.key))return;e.preventDefault();const tabs=[...section.querySelectorAll('[role=tab]')],i=tabs.indexOf(tab),next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(['ArrowRight','ArrowDown'].includes(e.key)?1:-1)+tabs.length)%tabs.length;tabs[next].click();section.querySelectorAll('[role=tab]')[next]?.focus();});
document.addEventListener('error',e=>{if(e.target?.tagName==='IMG'&&e.target.closest?.('#shuaAnalyticsSection,.st-profile-insights')){const img=e.target;if(img.dataset.stInitials){const fallback=document.createElement('span');fallback.className=img.className+' st-avatar-fallback';fallback.textContent=img.dataset.stInitials;fallback.setAttribute('aria-hidden','true');img.replaceWith(fallback);}else{img.style.visibility='hidden';img.setAttribute('aria-hidden','true');}}},true);
let resize=0,layoutWidth=window.innerWidth;window.addEventListener('resize',()=>{if(window.innerWidth===layoutWidth)return;layoutWidth=window.innerWidth;clearTimeout(resize);resize=setTimeout(()=>{if(visible&&dataset)render();},220);},{passive:true});
C.install();
function openSchedule(name='',position=''){
 const supplied=String(position||'').toUpperCase().replace(/[^A-Z]/g,'');
 if(['QB','RB','WR','TE','DST'].includes(supplied))state.schedulePos=supplied;
 else state.schedulePos='QB';
 state.scheduleFocusKey=name?S.key(name):'';
 state.scheduleQuery='';
 state.scheduleScrollPending=!!name;
 navigate('schedule');
}
let shuaDepthSwipeStart=null;
document.addEventListener('touchstart',e=>{
 const depth=document.getElementById('depthSection');
 if(!window.shuaScheduleDepthReturn||!depth||depth.hidden||!depth.contains(e.target)||e.touches.length!==1)return;
 if(e.target.closest('input,select,button,[role="listbox"],.depth-select-wrap'))return;
 shuaDepthSwipeStart={x:e.touches[0].clientX,y:e.touches[0].clientY};
},{passive:true});
document.addEventListener('touchend',e=>{
 if(!shuaDepthSwipeStart||!e.changedTouches.length)return;
 const dx=e.changedTouches[0].clientX-shuaDepthSwipeStart.x,dy=e.changedTouches[0].clientY-shuaDepthSwipeStart.y;
 shuaDepthSwipeStart=null;
 if(dx< -75&&Math.abs(dx)>Math.abs(dy)*1.4)window.shuaReturnFromDepthToSchedule?.();
},{passive:true});
window.shuaReturnFromDepthToSchedule=function(){
 const saved=window.shuaScheduleDepthReturn;if(!saved)return false;
 window.shuaScheduleDepthReturn=null;
 const analyticsButton=document.getElementById('studioNav');
 if(analyticsButton)analyticsButton.click();else open();
 navigate('schedule');
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
   const sc=section.querySelector('.st-heat-scroll');
   if(sc){sc.scrollLeft=saved.heatX;sc.scrollTop=saved.heatY;}
   window.scrollTo(saved.scrollX,saved.scrollY);
 }));
 return true;
};
S.UI={open,close,navigate,openSchedule,get state(){return state;},get dataset(){return dataset;},async profile(name,target){const ds=await S.Data.load(+state.year),p=ds.players.find(p=>p.key===key(name));if(!p){target.innerHTML=C.empty('No recorded appearances in '+state.year+'.');return;}const gs=G(p),c=S.consistency(p),bench=ds.players.filter(x=>x.position===p.position).map(x=>({p:x,c:S.consistency(x)})).filter(x=>x.c.n>=Math.min(c.n,3)).sort((a,b)=>(b.c.rates[0]?.percent||0)-(a.c.rates[0]?.percent||0));target.innerHTML=`<p class="st-footnote">${ds.year} · ${E(ds.source)}</p><div class="st-metrics">${metric('PPG',F(c.mean),c.n+' games')}${metric('Median',F(c.median),'Recorded points')}${metric('Observed P10',F(c.floor),'Lower score range')}${metric('Observed P90',F(c.ceiling),'Upper score range')}</div>`+C.line({title:'Weekly scoring',labels:gs.map(g=>'W'+g.week),series:[{name:'PPR',values:gs.map(g=>g.points)},{name:'3-game average',values:S.rolling(gs.map(g=>g.points),3)},{name:'5-game average',values:S.rolling(gs.map(g=>g.points),5)}]})+`<div class="st-grid4">${c.rates.map((r,i)=>C.ring(r.percent,r.threshold+'+',r.count+'/'+c.n+' games',C.colors[i])).join('')}</div>`+panel('Boom / Bust Consistency · '+E(p.position),'Positional scoring hit rates','<div class="st-table-wrap st-profile-hit-comparison"><table><thead><tr><th>Player</th><th>Games</th>'+c.rates.map(r=>'<th>'+r.threshold+'+ PPR</th>').join('')+'</tr></thead><tbody>'+bench.map(x=>'<tr><td>'+person(x.p)+'</td><td>'+x.c.n+'</td>'+x.c.rates.map((r,i)=>'<td><b style="color:'+C.colors[i]+'">'+F(r.percent,0,'%')+'</b></td>').join('')+'</tr>').join('')+'</tbody></table></div>');}};
const depth=document.getElementById('depthSection');if(depth&&!document.getElementById('stDepthLink')){const div=document.createElement('div');div.id='stDepthLink';div.style.margin='10px 0';div.innerHTML='<button type="button" class="st-button">View team opportunity charts ↗</button>';div.querySelector('button').onclick=()=>{state.team=S.canonicalTeam(document.getElementById('depthTeam')?.value||'DET');state.view='teams';state.week=0;open();};depth.prepend(div);}
window.dispatchEvent(new Event('ShuaStudioReady'));
let restored=false;try{restored=JSON.parse(localStorage.getItem('shuaPageStateV2')||'null')?.section==='ANALYTICS';}catch(e){}if(button.dataset.pending==='1'||restored||initialView)open();
})();
