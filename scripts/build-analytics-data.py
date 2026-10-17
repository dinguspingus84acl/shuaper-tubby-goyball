#!/usr/bin/env python3
"""Build verified, same-origin weekly analytics. Never relabel old statistics."""
import csv, gzip, io, json, math, os, re, subprocess, sys, urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'analytics-data'; OUT.mkdir(exist_ok=True)
NOW=datetime.now(timezone.utc)
YEAR=int(os.environ.get('ANALYTICS_SEASON',NOW.year if NOW.month>=8 else NOW.year-1))
BASE='https://github.com/nflverse/nflverse-data/releases/download/'
POS={'QB','RB','WR','TE'}
ALIASES={'GNB':'GB','KAN':'KC','NWE':'NE','NOR':'NO','SFO':'SF','TAM':'TB','LVR':'LV','OAK':'LV','SD':'LAC','STL':'LA','LAR':'LA','WSH':'WAS'}
def team(s): return ALIASES.get(str(s or ''),str(s or ''))
def norm(s): return re.sub('[^a-z0-9]','',re.sub(r'\b(jr|sr|ii|iii|iv)\b','',str(s).lower()))
def num(s,default=None):
    try:
        n=float(s)
        return round(n,4) if math.isfinite(n) else default
    except (TypeError,ValueError): return default
def get(url,is_json=False):
    try:
        req=urllib.request.Request(url,headers={'User-Agent':'SHUA-Analytics/1.0'})
        with urllib.request.urlopen(req,timeout=90) as r: raw=r.read()
        if raw[:2]==b'\x1f\x8b': raw=gzip.decompress(raw)
        text=raw.decode('utf-8-sig')
        return json.loads(text) if is_json else list(csv.DictReader(io.StringIO(text)))
    except Exception as e:
        print('Feed unavailable:',url,str(e)[:140],file=sys.stderr)
        return {} if is_json else []
def read(path,default=None):
    try: return json.loads(Path(path).read_text())
    except (OSError,ValueError): return default
def save(path,data):
    tmp=path.with_suffix('.tmp'); tmp.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'),allow_nan=False)); tmp.replace(path)
def git(*args): return subprocess.check_output(['git',*args],cwd=ROOT,text=True,stderr=subprocess.DEVNULL)
def gitjson(sha,path):
    try: return json.loads(git('show',sha+':'+path))
    except Exception: return None
def snapshot(sha=None):
    load=(lambda f:gitjson(sha,f)) if sha else (lambda f:read(ROOT/f))
    ranks={}; ros=load('ros-rankings.json') or {}
    for pos in sorted(POS):
        rows=ros.get(pos) or (load(pos.lower()+'-rankings.json') or {}).get('players',[])
        for i,p in enumerate(rows):
            name=p.get('name','') if isinstance(p,dict) else p
            if name: ranks[norm(name)]={'name':name,'position':pos,'positionRank':int(num(p.get('rank'),i+1)) if isinstance(p,dict) else i+1}
    for i,name in enumerate((load('big-board.json') or {}).get('players',[])):
        if isinstance(name,dict): name=name.get('name','')
        if name: ranks.setdefault(norm(name),{'name':name})['overallRank']=i+1
    return ranks
def history():
    rows=[]; days=set(); paths=['big-board.json','ros-rankings.json',*[p.lower()+'-rankings.json' for p in sorted(POS)]]
    try:
        for line in git('log','-200','--format=%H|%aI','--',*paths).splitlines():
            sha,date=line.split('|',1)
            if date[:10] in days: continue
            days.add(date[:10]); ranks=snapshot(sha)
            if ranks: rows.append({'date':date,'sha':sha,'ranks':ranks})
            if len(rows)>=40: break
    except Exception as e: print('History:',e,file=sys.stderr)
    current=snapshot()
    try: sha=git('rev-parse','HEAD').strip()
    except Exception: sha='working-tree'
    if not rows or rows[0]['ranks']!=current: rows.insert(0,{'date':NOW.isoformat(),'sha':sha,'ranks':current})
    save(OUT/'rank-history.json',{'schema':1,'source':'SHUA Big Board and ROS rankings from Git revisions','generatedAt':NOW.isoformat(),'snapshots':sorted(rows,key=lambda r:r['date'])})
    return current
def season(year,schedules,directory,custom):
    sources={'stats':BASE+f'stats_player/stats_player_week_{year}.csv','rosters':BASE+f'rosters/roster_{year}.csv','snaps':BASE+f'snap_counts/snap_counts_{year}.csv','pbp':BASE+f'pbp/play_by_play_{year}.csv.gz'}
    with ThreadPoolExecutor(max_workers=4) as pool: payload=dict(zip(sources,pool.map(get,sources.values())))
    stats=payload['stats']
    if not stats:
        stats=get(BASE+f'player_stats/player_stats_{year}.csv')
        if stats: sources['stats']=BASE+f'player_stats/player_stats_{year}.csv'
    stats=[r for r in stats if r.get('position') in POS and r.get('season_type','REG')=='REG' and 1<=num(r.get('week'),0)<=18 and int(num(r.get('season'),year))==year]
    if not stats:
        archive=read(ROOT/f'legacy-stats/{year}.json',{})
        for p in archive if isinstance(archive,list) else archive.get('rows',[]):
            for g in p.get('games',[]) if isinstance(p.get('games'),list) else []:
                stats.append({'player_id':p['id'],'player_display_name':p['name'],'position':p['position'],'team':p.get('team'),'week':g['week'],'opponent_team':g.get('opponent'),'fantasy_points_ppr':g.get('totalPoints'),'headshot_url':p.get('headshot'),'carries':g.get('rushAtt'),'targets':g.get('targets'),'receptions':g.get('receptions'),'rushing_yards':g.get('rushYds'),'receiving_yards':g.get('recYds'),'attempts':g.get('passAtt'),'passing_yards':g.get('passYds')})
        if stats: sources['stats']=f'legacy-stats/{year}.json (nflverse archive)'
    if not stats: return None
    rosters={r.get('gsis_id'):r for r in payload['rosters'] if r.get('gsis_id')}
    snaps={(norm(r.get('player')),team(r.get('team')),int(num(r.get('week'),0))):r for r in payload['snaps'] if r.get('game_type','REG')=='REG'}
    coverage=defaultdict(int)
    for r in payload['snaps']:
        if r.get('game_type','REG')=='REG' and num(r.get('offense_snaps'),0)>0: coverage[(team(r.get('team')),int(num(r.get('week'),0)))]+=1
    rz=defaultdict(lambda:{'redzone':0,'inside10':0}); pbp_games=set()
    for r in payload['pbp']:
        if r.get('season_type','REG')!='REG' or num(r.get('no_play'),0)==1: continue
        w=int(num(r.get('week'),0)); tm=team(r.get('posteam')); pbp_games.add((tm,w)); yard=num(r.get('yardline_100'),100)
        rec=r.get('receiver_player_id'); rush=r.get('rusher_player_id')
        if yard<=20:
            if rush and num(r.get('rush_attempt'),0)==1: rz[(rush,w,tm)]['redzone']+=1
            if rec and num(r.get('pass_attempt'),0)==1: rz[(rec,w,tm)]['redzone']+=1
        if yard<=10:
            if rush and num(r.get('rush_attempt'),0)==1: rz[(rush,w,tm)]['inside10']+=1
            if rec and num(r.get('complete_pass'),0)==1: rz[(rec,w,tm)]['inside10']+=1
    current={norm(p.get('full_name') or (p.get('first_name','')+' '+p.get('last_name',''))):p for p in directory.values() if isinstance(p,dict) and p.get('position') in POS}
    players={}; totals=defaultdict(lambda:{'targets':0,'carries':0,'airYards':0})
    fields={'points':'fantasy_points_ppr','targets':'targets','carries':'carries','receptions':'receptions','passAttempts':'attempts','passYards':'passing_yards','rushYards':'rushing_yards','recYards':'receiving_yards','airYards':'receiving_air_yards','passTD':'passing_tds','rushTD':'rushing_tds','recTD':'receiving_tds'}
    for r in stats:
        name=r.get('player_display_name') or r.get('player_name'); pid=r.get('player_id') or norm(name); tm=team(r.get('team') or r.get('recent_team')); week=int(num(r.get('week'),0))
        if not name or not tm or not week: continue
        roster=rosters.get(pid,{}); sl=current.get(norm(name),{})
        p=players.setdefault(pid,{'id':pid,'name':name,'position':r['position'],'team':tm,'headshot':r.get('headshot_url') or roster.get('headshot_url') or '','espnId':str(roster.get('espn_id') or sl.get('espn_id') or ''),'games':[],'custom':custom.get(norm(name),{})})
        if p['espnId'] and not p['headshot']: p['headshot']='https://a.espncdn.com/i/headshots/nfl/players/full/'+p['espnId'].split('.')[0]+'.png'
        if year==YEAR and sl.get('injury_status'): p['injury']={'status':sl['injury_status'],'bodyPart':sl.get('injury_body_part'),'asOf':NOW.isoformat(),'source':'Sleeper directory'}
        g={'week':week,'team':tm,'opp':team(str(r.get('opponent_team','')).replace('@','').replace('vs ',''))}
        g.update({k:num(r.get(v)) for k,v in fields.items()})
        snap=snaps.get((norm(name),tm,week)); g['snaps']=num(snap.get('offense_snaps')) if snap else None
        rate=num(snap.get('offense_pct')) if snap else None
        g['snapPct']=round(rate*100 if rate<=1 else rate,3) if rate is not None else None
        g['redzone']=rz[(pid,week,tm)]['redzone'] if (tm,week) in pbp_games else None
        g['inside10']=rz[(pid,week,tm)]['inside10'] if (tm,week) in pbp_games else None
        g['routes']=num(r.get('routes') or r.get('routes_run')); g['routePct']=num(r.get('route_participation'))
        if g['routePct'] is not None and g['routePct']<=1: g['routePct']*=100
        g['played']=g['snaps']>0 if g['snaps'] is not None else g['points'] is not None
        p['games'].append(g)
        for key in totals[(tm,week)]: totals[(tm,week)][key]+=g.get(key) or 0
    result=[]
    for p in players.values():
        p['games'].sort(key=lambda g:g['week']); p['team']=p['games'][-1]['team']
        for g in p['games']:
            t=totals[(g['team'],g['week'])]
            g['targetShare']=round(100*g['targets']/t['targets'],3) if g['targets'] is not None and t['targets'] else None
            g['carryShare']=round(100*g['carries']/t['carries'],3) if g['carries'] is not None and t['carries'] else None
        result.append(p)
    schedule=[]
    for r in schedules:
        if int(num(r.get('season'),0))==year and r.get('game_type','REG')=='REG': schedule.append({'week':int(num(r.get('week'),0)),'home':team(r.get('home_team')),'away':team(r.get('away_team')),'date':r.get('gameday'),'completed':num(r.get('home_score')) is not None and num(r.get('away_score')) is not None})
    seen={(r['week'],frozenset([r['home'],r['away']])) for r in schedule}
    for p in result:
        for g in p['games']:
            pair=(g['week'],frozenset([g['team'],g['opp']]))
            if g['opp'] and pair not in seen:
                schedule.append({'week':g['week'],'home':g['team'],'away':g['opp'],'date':None,'completed':True,'venueKnown':False}); seen.add(pair)
    result.sort(key=lambda p:sum(g.get('points') or 0 for g in p['games']),reverse=True)
    data={'schema':1,'season':year,'generatedAt':NOW.isoformat(),'sources':sources,'players':result,'schedule':sorted(schedule,key=lambda g:g['week']),'snapCoverage':[{'team':t,'week':w,'players':n} for (t,w),n in coverage.items() if n>=11],'lastWeek':max(g['week'] for p in result for g in p['games'])}
    save(OUT/f'{year}.json',data); print(f'{year}: {len(result)} players; {len(schedule)} games')
    return {'season':year,'lastWeek':data['lastWeek'],'generatedAt':data['generatedAt'],'players':len(result)}
def main():
    custom=history()
    with ThreadPoolExecutor(max_workers=2) as pool:
        future=pool.submit(get,'https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv')
        directory=get('https://api.sleeper.app/v1/players/nfl',True); schedules=future.result()
    seasons=[]
    for year in [YEAR,YEAR-1]:
        item=season(year,schedules,directory,custom)
        if item: seasons.append(item)
        else:
            old=read(OUT/f'{year}.json',{})
            if old.get('players'): seasons.append({'season':year,'lastWeek':old.get('lastWeek'),'generatedAt':old.get('generatedAt'),'players':len(old['players'])})
    if not seasons: raise SystemExit('No verified season available; do not replace production.')
    save(OUT/'manifest.json',{'schema':1,'generatedAt':NOW.isoformat(),'requestedSeason':YEAR,'defaultSeason':max(s['season'] for s in seasons),'seasons':seasons})
if __name__=='__main__': main()
