"""Build source-attributed analytics assets on a staging branch. Never invent missing feeds."""
from __future__ import annotations
import csv, gzip, io, json, math, pathlib, re, subprocess, time, unicodedata, urllib.request
from collections import defaultdict
from datetime import datetime, timezone
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'analytics'/'data'; OUT.mkdir(parents=True,exist_ok=True)
NOW=datetime.now(timezone.utc).isoformat()
POSITIONS={1:'QB',2:'RB',3:'WR',4:'TE'}
TEAMS={1:'ATL',2:'BUF',3:'CHI',4:'CIN',5:'CLE',6:'DAL',7:'DEN',8:'DET',9:'GB',10:'TEN',11:'IND',12:'KC',13:'LV',14:'LAR',15:'MIA',16:'MIN',17:'NE',18:'NO',19:'NYG',20:'NYJ',21:'PHI',22:'ARI',23:'PIT',24:'LAC',25:'SF',26:'SEA',27:'TB',28:'WAS',29:'CAR',30:'JAX',33:'BAL',34:'HOU'}
ALIASES={'kennethwalkeriii':'kennethwalker','michaelpittmanjr':'michaelpittman','marvinharrisonjr':'marvinharrison','brianthomasjr':'brianthomas','haroldfanninjr':'haroldfannin'}
def key(s):
 k=re.sub('[^a-z0-9]','',unicodedata.normalize('NFD',str(s)).encode('ascii','ignore').decode().lower());return ALIASES.get(k,k)
def team(s):
 s=re.sub(r'^(?:@|vs\.?\s*)','',str(s).strip(),flags=re.I).upper();return {'GNB':'GB','KAN':'KC','LVR':'LV','OAK':'LV','NWE':'NE','NOR':'NO','SFO':'SF','TAM':'TB','LA':'LAR','WSH':'WAS','JAC':'JAX'}.get(s,s)
def number(s):
 try:
  f=float(s);return f if math.isfinite(f) else None
 except (ValueError,TypeError):return None
def get(url,headers=None):
 req=urllib.request.Request(url,headers={'User-Agent':'SHUA-Analytics/1.0','Accept':'application/json',**(headers or {})})
 with urllib.request.urlopen(req,timeout=75) as r:return r.read()
def csv_rows(url):
 raw=get(url);raw=gzip.decompress(raw) if raw[:2]==b'\x1f\x8b' else raw
 return list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))))
def jget(url,headers=None):return json.loads(get(url,headers))
def write(path,obj):path.write_text(json.dumps(obj,separators=(',',':'),ensure_ascii=False),encoding='utf-8')
fields={'passAtt':0,'passYds':3,'passTD':4,'interceptions':20,'rushAtt':23,'rushYds':24,'rushTD':25,'recYds':42,'recTD':43,'receptions':53,'targets':58,'fumblesLost':72}
manifest={'schema':2,'generatedAt':NOW,'datasets':{},'seasons':{},'notes':[]}
gsis={}
for year in [2024,2025]:
 try:
  src=json.loads((ROOT/f'legacy-stats/{year}.json').read_text());src=src if isinstance(src,list) else src.get('rows',[])
  for p in src:gsis[str(p['id'])]=key(p['name'])
 except Exception:pass
for year in [2024,2025,2026]:
 sched={};players=[];sources=[];issues=[]
 try:
  raw=jget(f'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{year}?view=proTeamSchedules_wl')
  for t in raw.get('settings',{}).get('proTeams',raw.get('proTeams',[])):
   code=TEAMS.get(t['id']);
   if not code:continue
   sched[code]={}
   for week in range(1,19):
    g=t.get('proGamesByScoringPeriod',{}).get(str(week),[]);g=g[0] if isinstance(g,list) and g else g
    h=g.get('homeProTeamId',g.get('homeTeamId')) if g else None;a=g.get('awayProTeamId',g.get('awayTeamId')) if g else None
    opp=TEAMS.get(a if h==t['id'] else h) if g else 'BYE'
    sched[code][str(week)]={'week':week,'opponent':opp or '—','home':h==t['id'],'bye':not bool(g),'known':bool(opp)}
  sources.append('ESPN pro-team schedules')
 except Exception as e:issues.append('Schedule: '+str(e))
 try:
  if year<2026:
   raw=json.loads((ROOT/f'legacy-stats/{year}.json').read_text());players=raw if isinstance(raw,list) else raw.get('rows',[]);sources.append('nflverse · existing site archive')
  else:
   filtr={'players':{'limit':700,'filterSlotIds':{'value':[0,2,4,6]},'filterStatsForSourceIds':{'value':[0]},'filterStatsForTopScoringPeriodIds':{'value':20,'additionalValue':['00'+str(year)]}}}
   raw=jget(f'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/segments/0/leaguedefaults/3?scoringPeriodId=0&view=kona_player_info',{'X-Fantasy-Filter':json.dumps(filtr),'X-Fantasy-Source':'kona'})
   entries=raw if isinstance(raw,list) else raw.get('players',[])
   for e in entries:
    p=e.get('playerPoolEntry',e);p=p.get('player',p);pos=POSITIONS.get(p.get('defaultPositionId'))
    if not pos:continue
    code=TEAMS.get(p.get('proTeamId'),'FA');games={}
    for s in p.get('stats',[]):
     w=int(s.get('scoringPeriodId',0));st=s.get('stats',{})
     if s.get('seasonId')!=year or s.get('statSourceId')!=0 or not 1<=w<=18 or number(s.get('appliedTotal')) is None or not st:continue
     if s.get('seasonTypeId') not in (None,0,2):continue
     row={'week':w,'opponent':sched.get(code,{}).get(str(w),{}).get('opponent','—'),'team':code,'hasStats':True,'totalPoints':s['appliedTotal']}
     row.update({k:number(st.get(str(v),st.get(v,0))) for k,v in fields.items()});games[w]=row
    if games:players.append({'id':str(p['id']),'name':p['fullName'],'position':pos,'team':code,'injuryStatus':p.get('injuryStatus',''),'games':sorted(games.values(),key=lambda x:x['week']),'headshot':f"https://a.espncdn.com/i/headshots/nfl/players/full/{p['id']}.png"})
   sources.append('ESPN actual PPR statistics (4-point passing TD)')
 except Exception as e:issues.append('Stats: '+str(e))
 if not players:
  manifest['notes'].append(f'{year}: no same-season player data returned; not substituted.');print('NO DATA',year,issues,flush=True);continue
 bykey={key(p['name']):p for p in players};bygame={}
 for p in players:
  p['key']=key(p['name']);p['team']=team(p['team']);p['availability']={}
  for g in p.get('games',[]):
   opp=team(g.get('opponent',''));inferred=sched.get(opp,{}).get(str(g['week']),{}).get('opponent')
   g['team']=team(g.get('team') or (inferred if inferred in TEAMS.values() else p['team']));g['opponent']=opp
   bygame[(p['key'],g['week'])]=g
 try:
  rows=csv_rows(f'https://github.com/nflverse/nflverse-data/releases/download/snap_counts/snap_counts_{year}.csv');count=0
  for r in rows:
   if r.get('game_type','REG')!='REG':continue
   w=int(float(r.get('week',0)));k=key(r.get('player',r.get('player_name','')));g=bygame.get((k,w));sn=number(r.get('offense_snaps'));pc=number(r.get('offense_pct'))
   if g is None or sn is None:continue
   g['snaps']=sn;g['snapRate']=pc*100 if pc is not None and pc<=1 else pc
   if pc is not None and pc>0:g['teamSnaps']=round(sn/(pc if pc<=1 else pc/100))
   count+=1
  sources.append(f'PFR snap counts via nflverse ({count} matched player games)')
 except Exception as e:issues.append('Snap feed: '+str(e))
 try:
  rows=csv_rows(f'https://github.com/nflverse/nflverse-data/releases/download/injuries/injuries_{year}.csv');count=0
  for r in rows:
   if r.get('game_type','REG')!='REG':continue
   k=key(r.get('full_name','') or (r.get('first_name','')+' '+r.get('last_name','')));p=bykey.get(k);w=int(float(r.get('week',0)))
   if p is None or not 1<=w<=18:continue
   status=r.get('report_status','');p['availability'][str(w)]={'status':status,'detail':r.get('report_primary_injury',''),'source':'nflverse weekly injury report','date':r.get('date_modified','')};count+=1
  sources.append(f'nflverse injury reports ({count} matched reports)')
 except Exception as e:issues.append('Injury feed: '+str(e))
 try:
  pbp=csv_rows(f'https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_{year}.csv.gz');included=set();counts=defaultdict(lambda:{'redZone':0,'inside10':0});seen_ids={}
  for r in pbp:
   if r.get('season_type','REG')!='REG' or number(r.get('no_play'))==1:continue
   w=int(float(r.get('week',0)));posteam=team(r.get('posteam',''))
   if not 1<=w<=18 or not posteam:continue
   included.add((posteam,w))
   for role in ['rusher','receiver','passer']:
    pid=r.get(role+'_player_id','');name=r.get(role+'_player_name','')
    if pid and pid in gsis:seen_ids[pid]=gsis[pid]
   yard=number(r.get('yardline_100'))
   if yard is None or yard>20:continue
   rush=r.get('rusher_player_id');rec=r.get('receiver_player_id')
   if rush and number(r.get('rush_attempt'))==1 and number(r.get('qb_kneel'))!=1:
    counts[(rush,w)]['redZone']+=1
    if yard<=10:counts[(rush,w)]['inside10']+=1
   if rec and number(r.get('pass_attempt'))==1:
    counts[(rec,w)]['redZone']+=1
    if yard<=10 and number(r.get('complete_pass'))==1:counts[(rec,w)]['inside10']+=1
  matched=0
  for p in players:
   for g in p['games']:
    if (g['team'],g['week']) in included and (str(p['id']) in gsis or p['key'] in gsis.values()):g['redZone']=0;g['inside10']=0
  for (pid,w),c in counts.items():
   g=bygame.get((gsis.get(pid,''),w))
   if g is not None:g.update(c);matched+=1
  sources.append(f'nflverse play-by-play red-zone usage ({matched} matched player weeks)')
 except Exception as e:issues.append('Play-by-play feed: '+str(e))
 ds={'schema':1,'year':year,'generatedAt':NOW,'source':' · '.join(sources),'warnings':issues,'players':players,'schedule':sched,'methodology':{'scoring':'Full PPR, 4-point passing TD, regular season only','redZone':'Carries plus targets on non-nullified plays at or inside the 20','inside10':'Carries plus receptions at or inside the 10; kneeldowns excluded','routes':'Not imputed from snaps. Display only when a route-count source is supplied.','injuries':'Only explicitly Out reports establish an out cohort; other missing statistics are not injuries.'}}
 path=OUT/f'season-{year}.json';write(path,ds);manifest['datasets'][str(year)]=f'analytics/data/season-{year}.json'
 print('DATA',year,'players',len(players),'games',sum(len(p['games']) for p in players),'sources',sources,'warnings',issues,flush=True)
write(ROOT/'analytics/manifest.json',manifest)
history={}
for path in ['big-board.json','ros-rankings.json']:
 snapshots=[]
 shas=subprocess.check_output(['git','log','-12','--format=%H','--',path],text=True).splitlines()
 for sha in reversed(shas):
  try:
   d=json.loads(subprocess.check_output(['git','show',f'{sha}:{path}'],text=True));date=subprocess.check_output(['git','show','-s','--format=%cI',sha],text=True).strip();message=subprocess.check_output(['git','show','-s','--format=%s',sha],text=True).strip();ranks={}
   if path=='big-board.json':
    for i,p in enumerate(d.get('players',[])):
     name=p if isinstance(p,str) else p.get('name','');ranks.setdefault(key(name),{'name':name,'rank':i+1})
   else:
    for pos in ['QB','RB','WR','TE']:
     for p in d.get(pos,[]):ranks[key(p['name'])]={'name':p['name'],'rank':p['rank'],'position':pos}
   snapshots.append({'date':date,'sha':sha,'message':message,'ranks':ranks})
  except Exception as e:print('Rank snapshot omitted',sha,e,flush=True)
 history[path]={'snapshots':snapshots,'source':path,'generatedAt':NOW}
write(ROOT/'analytics/rank-history.json',history)
# Touch only the two analytics script versions; all viewport and navigation source remains byte-for-byte intact.
p=ROOT/'index.html';html=p.read_text();version='20261017-studio-v1'
for name in ['analytics-dashboard','player-insights']:
 html,count=re.subn(r'('+name+r'\.js)\?v=[^"\s]+',r'\1?v='+version,html)
 if count!=1:raise RuntimeError(f'Expected one script reference for {name}, got {count}')
p.write_text(html)
print('Prepared analytics assets and cache versions; viewport CSS was not changed.',flush=True)
