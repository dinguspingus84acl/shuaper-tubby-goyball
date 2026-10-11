import fs from 'node:fs/promises';
import path from 'node:path';

const YEARS = Array.from({length:8},(_,i)=>2010+i);
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
function teamCode(team){
  const map={GB:'GNB',KC:'KAN',LV:'LVR',NE:'NWE',NO:'NOR',SF:'SFO',TB:'TAM',WSH:'WAS',LA:'LAR'};
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
        id,name,position,team:'—',headshot:r.headshot_url||'',points:0,average:null,gamesPlayed:0,
        passAtt:0,completions:0,passYds:0,passTD:0,interceptions:0,
        rushAtt:0,rushYds:0,rushTD:0,recYds:0,recTD:0,receptions:0,targets:0,fumblesLost:0,
        source:'nflverse'
      };
      p._games=new Set();
      byPlayer.set(key,p);
    }
    p.name=name||p.name;
    p.team=teamCode(r.team||p.team);
    if(!p.headshot && r.headshot_url) p.headshot=r.headshot_url;
    const gameKey=r.game_id||`${year}-${r.week}`;
    if(gameKey) p._games.add(gameKey);
    const fp=Number(r.fantasy_points_ppr);
    p.points += Number.isFinite(fp)?fp:calcPpr(r);
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
    p.gamesPlayed=p._games.size;
    delete p._games;
    p.points=Number(p.points.toFixed(2));
    p.average=p.gamesPlayed?Number((p.points/p.gamesPlayed).toFixed(3)):null;
    return p;
  }).filter(p=>p.gamesPlayed>0).sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name));
  return rows;
}

await fs.mkdir(OUT_DIR,{recursive:true});
for(const year of YEARS){
  const rows=await loadYear(year);
  const payload={year,source:'nflverse weekly player stats (CC BY 4.0)',generatedAt:new Date().toISOString(),rows};
  await fs.writeFile(path.join(OUT_DIR,`${year}.json`),JSON.stringify(payload));
  console.log(`${year}: ${rows.length} fantasy players`);
}
