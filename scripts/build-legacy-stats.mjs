import fs from 'node:fs/promises';
import path from 'node:path';

const YEARS = Array.from({length:16},(_,i)=>2010+i);
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
    const key=`${id}|${position}`;
    let p=byPlayer.get(key);
    if(!p){
      p={
        id,name,position,team:'—',headshot:r.headshot_url||'',seasonYear:year,
        points:0,average:null,gamesPlayed:0,
        passAtt:0,completions:0,passYds:0,passTD:0,interceptions:0,
        rushAtt:0,rushYds:0,rushTD:0,recYds:0,recTD:0,receptions:0,targets:0,fumblesLost:0,
        source:'nflverse',games:[]
      };
      byPlayer.set(key,p);
    }
    p.name=name||p.name;
    p.team=teamCode(r.team||p.team);
    if(!p.headshot && r.headshot_url) p.headshot=r.headshot_url;
    if(!p.headshot&&HEADSHOT_FALLBACKS[norm(name)])p.headshot=HEADSHOT_FALLBACKS[norm(name)];
    const g=gameRow(r);
    if(g.week>0 && g.week<=18){
      p.games.push(g);
      p.points += g.totalPoints;
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
    p.games.sort((a,b)=>a.week-b.week);
    p.gamesPlayed=p.games.length;
    p.points=Number(p.points.toFixed(2));
    p.average=p.gamesPlayed?Number((p.points/p.gamesPlayed).toFixed(3)):null;
    return p;
  }).filter(p=>p.gamesPlayed>0).sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name));
  return rows;
}

await fs.mkdir(OUT_DIR,{recursive:true});
const careerIndex={};
for(const year of YEARS){
  const rows=await loadYear(year);
  const payload={year,source:'nflverse weekly player stats (CC BY 4.0)',generatedAt:new Date().toISOString(),rows};
  await fs.writeFile(path.join(OUT_DIR,`${year}.json`),JSON.stringify(payload));
  for(const p of rows){
    const key=norm(p.name);
    if(!careerIndex[key]){
      careerIndex[key]={name:p.name,position:p.position,headshot:p.headshot||'',years:[]};
    }
    if(!careerIndex[key].headshot&&p.headshot)careerIndex[key].headshot=p.headshot;
    if(!careerIndex[key].years.includes(year))careerIndex[key].years.push(year);
  }
  console.log(`${year}: ${rows.length} fantasy players`);
}
for(const x of Object.values(careerIndex))x.years.sort((a,b)=>b-a);
await fs.writeFile(path.join(OUT_DIR,'index.json'),JSON.stringify({
  generatedAt:new Date().toISOString(),
  minYear:YEARS[0],
  maxYear:YEARS.at(-1),
  players:careerIndex
}));
console.log(`career index: ${Object.keys(careerIndex).length} players`);
