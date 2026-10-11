import fs from 'node:fs/promises';
import path from 'node:path';

const YEARS = Array.from({length:27},(_,i)=>1999+i);
const HEADSHOT_FALLBACKS={mattcole:'https://a.espncdn.com/i/headshots/nfl/players/full/4041703.png',salcannella:'https://a.espncdn.com/i/headshots/nfl/players/full/4242536.png',jakobiekeeneyjames:'https://a.espncdn.com/i/headshots/nfl/players/full/5178972.png'};
const OUT_DIR = path.resolve('legacy-stats');

function parseCsvLine(line){
  const out=[]; let cur=''; let quoted=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){
      if(quoted && line[i+1]==='"'){ cur+='"'; i++; }
      else quoted=!quoted;
    }else if(ch===',' && !quoted){ out.push(cur); cur=''; }
    else cur+=ch;
  }
  out.push(cur);
  return out;
}
function n(v){ const x=Number(v); return Number.isFinite(x)?x:0; }
function norm(v){
  return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
}
function teamCode(team){
  const map={GB:'GNB',KC:'KAN',LV:'LVR',OAK:'LVR',NE:'NWE',NO:'NOR',SF:'SFO',TB:'TAM',WSH:'WAS',LA:'LAR',SD:'LAC',STL:'LAR'};
  const t=String(team||'').trim().toUpperCase();
  return map[t]||t||'—';
}
function calcPpr(r){
  return n(r.passing_yards)*0.04+n(r.passing_tds)*4-n(r.passing_interceptions)*2+
    n(r.rushing_yards)*0.1+n(r.rushing_tds)*6+n(r.receiving_yards)*0.1+
    n(r.receiving_tds)*6+n(r.receptions)+
    (n(r.passing_2pt_conversions)+n(r.rushing_2pt_conversions)+n(r.receiving_2pt_conversions))*2-
    (n(r.sack_fumbles_lost)+n(r.rushing_fumbles_lost)+n(r.receiving_fumbles_lost))*2;
}
function gamePpr(r){
  const fp=Number(r.fantasy_points_ppr);
  return Number.isFinite(fp)?fp:calcPpr(r);
}
function gameRow(r){
  return {
    week:Number(r.week)||0,
    opponent:teamCode(r.opponent_team),
    hasStats:true,
    totalPoints:Number(gamePpr(r).toFixed(2)),
    passAtt:n(r.attempts),
    completions:n(r.completions),
    passYds:n(r.passing_yards),
    passTD:n(r.passing_tds),
    interceptions:n(r.passing_interceptions),
    rushAtt:n(r.carries),
    rushYds:n(r.rushing_yards),
    rushTD:n(r.rushing_tds),
    recYds:n(r.receiving_yards),
    recTD:n(r.receiving_tds),
    receptions:n(r.receptions),
    targets:n(r.targets),
    fumblesLost:n(r.sack_fumbles_lost)+n(r.rushing_fumbles_lost)+n(r.receiving_fumbles_lost)
  };
}

async function loadIdentityMap(){
  const url='https://raw.githubusercontent.com/Lolindhir/fantasy-app/main/source-data/providers/nflverse/ff-player-ids/raw-latest.csv';
  const res=await fetch(url);
  if(!res.ok)throw new Error('identity map: '+res.status+' '+res.statusText);
  const text=await res.text();
  const lines=text.split(/\r?\n/).filter(Boolean);
  if(lines.length<2)return new Map();
  const headers=parseCsvLine(lines[0]);
  const idx=Object.fromEntries(headers.map((h,i)=>[h,i]));
  const get=(cells,name)=>idx[name]===undefined?'':cells[idx[name]];
  const map=new Map();
  for(const line of lines.slice(1)){
    const cells=parseCsvLine(line);
    const name=get(cells,'name')||get(cells,'merge_name');
    const merge=get(cells,'merge_name')||name;
    const position=String(get(cells,'position')||'').toUpperCase();
    if(!name)return;
    const row={
      espnId:String(get(cells,'espn_id')||'').trim(),
      sleeperId:String(get(cells,'sleeper_id')||'').trim(),
      name,
      mergeName:merge,
      position
    };
    for(const raw of [name,merge]){
      const key=norm(raw);
      if(!key)continue;
      if(!map.has(key))map.set(key,[]);
      map.get(key).push(row);
    }
  }
  return map;
}
async function loadPlayerRegistry(){
  const url='https://raw.githubusercontent.com/Lolindhir/fantasy-app/main/source-data/providers/nflverse/players/raw-latest.csv';
  const res=await fetch(url);
  if(!res.ok)throw new Error('player registry: '+res.status+' '+res.statusText);
  const text=await res.text();
  const lines=text.split(/\r?\n/).filter(Boolean);
  if(lines.length<2)return new Map();
  const headers=parseCsvLine(lines[0]);
  const idx=Object.fromEntries(headers.map((h,i)=>[h,i]));
  const get=(cells,name)=>idx[name]===undefined?'':cells[idx[name]];
  const map=new Map();
  for(const line of lines.slice(1)){
    const cells=parseCsvLine(line);
    const names=[
      get(cells,'display_name'),
      [get(cells,'first_name'),get(cells,'last_name')].filter(Boolean).join(' '),
      get(cells,'football_name'),
      get(cells,'short_name')
    ].filter(Boolean);
    const row={
      espnId:String(get(cells,'espn_id')||'').trim(),
      headshot:String(get(cells,'headshot')||'').trim(),
      position:String(get(cells,'position')||'').toUpperCase(),
      displayName:get(cells,'display_name')
    };
    for(const raw of names){
      const key=norm(raw);
      if(!key)continue;
      if(!map.has(key))map.set(key,[]);
      map.get(key).push(row);
    }
  }
  return map;
}

function headshotCandidates(name,position,sourceUrl,identityMap,playerRegistry){
  const key=norm(name);
  const urls=[];

  const registryRows=playerRegistry.get(key)||[];
  const registryMatches=registryRows.filter(x=>!position||x.position===position);
  for(const x of (registryMatches.length?registryMatches:registryRows)){
    if(/^\d+$/.test(x.espnId))urls.push('https://a.espncdn.com/i/headshots/nfl/players/full/'+x.espnId+'.png');
    if(x.headshot&&!/\/NA(?:\.|$)/i.test(x.headshot))urls.push(x.headshot);
  }

  const rows=identityMap.get(key)||[];
  const matches=rows.filter(x=>!position||x.position===position);
  for(const x of (matches.length?matches:rows)){
    if(/^\d+$/.test(x.espnId))urls.push('https://a.espncdn.com/i/headshots/nfl/players/full/'+x.espnId+'.png');
    if(x.sleeperId&&x.sleeperId.toUpperCase()!=='NA'&&x.sleeperId!=='0')urls.push('https://sleepercdn.com/content/nfl/players/thumb/'+x.sleeperId+'.jpg');
  }

  const manual=HEADSHOT_FALLBACKS[key];
  if(manual)urls.push(manual);
  if(sourceUrl&&!/\/NA(?:\.|$)/i.test(sourceUrl))urls.push(sourceUrl);
  return [...new Set(urls.filter(Boolean))];
}

async function loadYear(year){
  const url=`https://raw.githubusercontent.com/Lolindhir/fantasy-app/main/source-data/providers/nflverse/player-stats/raw-${year}.csv`;
  const res=await fetch(url);
  if(!res.ok) throw new Error(`${year}: ${res.status} ${res.statusText}`);
  const text=await res.text();
  const lines=text.split(/\r?\n/).filter(Boolean);
  if(lines.length<2) throw new Error(`${year}: empty CSV`);
  const headers=parseCsvLine(lines[0]);
  const byPlayer=new Map();
  for(const line of lines.slice(1)){
    const cells=parseCsvLine(line);
    const r={};
    headers.forEach((h,i)=>r[h]=cells[i]??'');
    if(r.season_type && r.season_type!=='REG') continue;
    const position=String(r.position||'').toUpperCase();
    if(!['QB','RB','WR','TE'].includes(position)) continue;
    const name=r.player_display_name||r.player_name;
    if(!name) continue;
    const id=String(r.player_id||`${name}:${position}`);
    const key=`${norm(name)}|${position}`;
    let p=byPlayer.get(key);
    if(!p){
      p={
        id,name,position,team:'—',headshot:'',headshots:[],seasonYear:year,
        points:0,average:null,gamesPlayed:0,
        passAtt:0,completions:0,passYds:0,passTD:0,interceptions:0,
        rushAtt:0,rushYds:0,rushTD:0,recYds:0,recTD:0,receptions:0,targets:0,fumblesLost:0,
        source:'nflverse',games:[]
      };
      p._gameMap=new Map();
      byPlayer.set(key,p);
    }
    p.name=name||p.name;
    if((!p.id||p.id.includes(':'))&&r.player_id)p.id=String(r.player_id);
    p.team=teamCode(r.team||p.team);
    const candidates=headshotCandidates(name,position,r.headshot_url||'',identityMap,playerRegistry);
    if(candidates.length){
      p.headshots=[...new Set([...(p.headshots||[]),...candidates])];
      p.headshot=p.headshots[0]||'';
    }
    const g=gameRow(r);
    if(g.week>0 && g.week<=18){
      const gameKey=String(r.game_id||g.week);
      const existing=p._gameMap.get(gameKey);
      if(!existing){
        p._gameMap.set(gameKey,g);
      }else{
        const merged={...existing};
        for(const field of ['totalPoints','passAtt','completions','passYds','passTD','interceptions','rushAtt','rushYds','rushTD','recYds','recTD','receptions','targets','fumblesLost']){
          merged[field]=Number(existing[field]||0)+Number(g[field]||0);
        }
        if((!merged.opponent||merged.opponent==='—')&&g.opponent)merged.opponent=g.opponent;
        p._gameMap.set(gameKey,merged);
      }
    }
    p.passAtt += n(r.attempts);
    p.completions += n(r.completions);
    p.passYds += n(r.passing_yards);
    p.passTD += n(r.passing_tds);
    p.interceptions += n(r.passing_interceptions);
    p.rushAtt += n(r.carries);
    p.rushYds += n(r.rushing_yards);
    p.rushTD += n(r.rushing_tds);
    p.recYds += n(r.receiving_yards);
    p.recTD += n(r.receiving_tds);
    p.receptions += n(r.receptions);
    p.targets += n(r.targets);
    p.fumblesLost += n(r.sack_fumbles_lost)+n(r.rushing_fumbles_lost)+n(r.receiving_fumbles_lost);
  }
  const rows=[...byPlayer.values()].map(p=>{
    p.games=[...p._gameMap.values()].sort((a,b)=>a.week-b.week);
    delete p._gameMap;
    p.gamesPlayed=p.games.length;
    p.points=Number(p.games.reduce((sum,g)=>sum+Number(g.totalPoints||0),0).toFixed(2));
    p.average=p.gamesPlayed?Number((p.points/p.gamesPlayed).toFixed(3)):null;
    return p;
  }).filter(p=>p.gamesPlayed>0).sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name));
  return rows;
}

await fs.mkdir(OUT_DIR,{recursive:true});
const identityMap=await loadIdentityMap();
const playerRegistry=await loadPlayerRegistry();
console.log(`identity map: ${identityMap.size} normalized names`);
console.log(`player registry: ${playerRegistry.size} normalized names`);
const careerIndex={};
const headshotIndex={};
for(const year of YEARS){
  const rows=await loadYear(year);
  const payload={year,source:'nflverse weekly player stats (CC BY 4.0)',generatedAt:new Date().toISOString(),rows};
  await fs.writeFile(path.join(OUT_DIR,`${year}.json`),JSON.stringify(payload));
  const rankByPlayer=new Map();
  for(const pos of ['QB','RB','WR','TE']){
    rows.filter(p=>p.position===pos)
      .sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name))
      .forEach((p,i)=>rankByPlayer.set(p.id+'|'+p.position,i+1));
  }
  for(const p of rows){
    const key=norm(p.name);
    if(!careerIndex[key]){
      careerIndex[key]={name:p.name,position:p.position,headshot:p.headshot||'',headshots:p.headshots||[],years:[],history:[]};
    }
    if(!careerIndex[key].headshot&&p.headshot)careerIndex[key].headshot=p.headshot;
    careerIndex[key].headshots=[...new Set([...(careerIndex[key].headshots||[]),...(p.headshots||[])])];
    if(careerIndex[key].headshots.length){careerIndex[key].headshot=careerIndex[key].headshots[0];headshotIndex[key]=careerIndex[key].headshots;}
    if(!careerIndex[key].years.includes(year))careerIndex[key].years.push(year);
    const summary={
      year,
      id:p.id,
      name:p.name,
      position:p.position,
      team:p.team,
      teamAbbr:p.team,
      headshot:p.headshot||'',
      headshots:p.headshots||[],
      rank:rankByPlayer.get(p.id+'|'+p.position)||null,
      points:p.points,
      average:p.average,
      ppg:p.average,
      gamesPlayed:p.gamesPlayed,
      games:p.gamesPlayed,
      source:'nflverse'
    };
    const existingHistory=careerIndex[key].history.findIndex(x=>x.year===year);
    if(existingHistory>=0){
      if((careerIndex[key].history[existingHistory].gamesPlayed||0)<p.gamesPlayed)careerIndex[key].history[existingHistory]=summary;
    }else careerIndex[key].history.push(summary);
  }
  console.log(`${year}: ${rows.length} fantasy players`);
}
for(const x of Object.values(careerIndex)){x.years.sort((a,b)=>b-a);x.history.sort((a,b)=>b.year-a.year)}
await fs.writeFile(path.join(OUT_DIR,'index.json'),JSON.stringify({
  generatedAt:new Date().toISOString(),
  minYear:YEARS[0],
  maxYear:YEARS.at(-1),
  players:careerIndex
}));
await fs.writeFile(path.join(OUT_DIR,'headshots.json'),JSON.stringify({generatedAt:new Date().toISOString(),headshots:headshotIndex}));
console.log(`career index: ${Object.keys(careerIndex).length} players`);
console.log(`headshots: ${Object.keys(headshotIndex).length} players`);
