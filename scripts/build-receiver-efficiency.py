#!/usr/bin/env python3
"""Build 32 source-bounded WR/TE receiving efficiency heatmaps (2026).
Match every receiving measure to charted HeatRadar player/team/week routes.
Missing source values are null, not zero or extrapolated.
"""
import argparse
import csv
import gzip
import io
import json
import math
import re
import unicodedata
from collections import defaultdict
from pathlib import Path
from urllib.request import urlopen

ROOT=Path(__file__).resolve().parents[1]
ROUTES=ROOT/'analytics/data/heatradar-routes-2026.json'
SEASON=ROOT/'analytics/data/season-2026.json'
RANKED=ROOT/'analytics/data/ranked-usage-2026.json'
OUTPUT=ROOT/'analytics/data/receiver-efficiency-2026.json'
URL='https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_2026.csv.gz'
TEAMS='ARI ATL BAL BUF CAR CHI CIN CLE DAL DEN DET GB HOU IND JAX KC LAC LAR LV MIA MIN NE NO NYG NYJ PHI PIT SEA SF TB TEN WAS'.split()
MAP={'LA':'LAR','WSH':'WAS','GNB':'GB','JAC':'JAX','KAN':'KC','NWE':'NE','NOR':'NO','SFO':'SF','TAM':'TB'}
ALIASES={'lutherburdeniii':'lutherburden','haroldfanninjr':'haroldfannin',
'brianthomasjr':'brianthomas','michaelpittmanjr':'michaelpittman',
'jamescookiii':'jamescook','chigokonkwo':'chigoziemokonkwo'}
FIELDS=('routeShare','yprr','tprr','yacPerReception','firstDownsPerRoute',
        'explosivePlayRate','epaPerTarget','fantasyPointsPerRoute')
COUNT_FIELDS=('receptions','receiving_yards','receiving_tds','targets',
              'receiving_yards_after_catch','receiving_first_downs',
              'receiving_epa','receiving_20')

def key(name):
    raw=unicodedata.normalize('NFD',str(name or '')).lower()
    raw=''.join(ch for ch in raw if unicodedata.category(ch)!='Mn')
    s=re.sub('[^a-z0-9]','',raw)
    return ALIASES.get(s,s)

def team(v):
    s=str(v or '').upper()
    return MAP.get(s,s)

def num(v):
    if v is None or v=='':return None
    try:
        f=float(v)
        return f if math.isfinite(f) else None
    except (TypeError,ValueError):
        return None

def ratio(a,b,s=1):
    return round(a*s/b,4) if a is not None and b is not None and b>0 else None

def read_stats(data):
    if not data:return {},[]
    if data[:2]==b'\x1f\x8b':data=gzip.decompress(data)
    reader=csv.DictReader(io.StringIO(data.decode('utf-8-sig')))
    required={'player_display_name','season','season_type','week','team',
              'receptions','receiving_yards','receiving_tds','targets',
              'receiving_yards_after_catch','receiving_first_downs'}
    absent=required-set(reader.fieldnames or ())
    if absent:raise ValueError('nflverse receiving CSV missing '+','.join(sorted(absent)))
    optional=sorted(set(('receiving_epa','receiving_20')) & set(reader.fieldnames))
    weekly={}
    for row in reader:
        if row['season']!='2026' or row['season_type']!='REG':continue
        w=int(row['week'])
        ident=(key(row['player_display_name']),team(row['team']),w)
        if ident in weekly:raise ValueError('Duplicate nflverse receiving '+str(ident))
        weekly[ident]={f:num(row.get(f)) for f in COUNT_FIELDS}
    return weekly,optional

def build(heat,season,ranked,nfl,columns):
    if heat.get('schema')!=1 or heat.get('season')!=2026:raise ValueError('Unexpected route source')
    through=int(heat['throughWeek'])
    if not 1<=through<=18:raise ValueError('Invalid route week')
    player_games={(key(p['name']),team(p['team'])):
      {int(g['week']):g for g in p.get('games',[]) if g.get('hasStats') is not False}
      for p in season.get('players',[])}
    players={}
    for r in heat.get('rows',[]):
        if r.get('position') not in ('WR','TE') or r.get('uncertain'):continue
        w=int(r['week'])
        side=team(r.get('team'))
        routes,targets,yards=num(r.get('routes')),num(r.get('targets')),num(r.get('yards'))
        if side not in TEAMS or not 1<=w<=through or routes is None or routes<=0 or not routes.is_integer():continue
        if targets is None or not targets.is_integer() or yards is None:continue
        ident=(key(r['name']),side,r['position'])
        p=players.setdefault(ident,dict(name=r['name'],team=side,position=r['position'],
           weeks=[],routes=0,targets=0,yards=0,passOps=0,shareOK=True,
           espnWeeks=0,espnPpr=0.0,nflWeeks=0,totals=defaultdict(float),
           missing=defaultdict(int)))
        if w in p['weeks']:raise ValueError('Duplicate source route '+str(ident)+' Week '+str(w))
        p['weeks'].append(w);p['routes']+=int(routes);p['targets']+=int(targets);p['yards']+=yards
        share=num(r.get('routeShare'))
        if share is None or share<=0 or share>100:p['shareOK']=False
        else:p['passOps']+=routes*100/share
        game=player_games.get((ident[0],side),{}).get(w)
        if game and team(game.get('team') or side)==side:
            rec,yds,td=(num(game.get(f)) for f in ('receptions','recYds','recTD'))
            if rec is not None and yds is not None and td is not None:
                p['espnWeeks']+=1
                p['espnPpr']+=rec+yds/10+6*td
        n=nfl.get((ident[0],side,w))
        if n is not None:
            p['nflWeeks']+=1
            for f in COUNT_FIELDS:
                v=n.get(f)
                if v is None:p['missing'][f]+=1
                else:p['totals'][f]+=v
    grouped={t:[] for t in TEAMS}
    sums={f:[0.0,0.0] for f in FIELDS}
    for p in players.values():
        p['weeks'].sort()
        total,missing=p['totals'],p['missing']
        matched=p['nflWeeks']==len(p['weeks'])
        complete=lambda *fs: matched and all(missing[f]==0 for f in fs)
        values={f:None for f in FIELDS}
        def add(field,a,b,scale=1):
            value=ratio(a,b,scale)
            if value is not None:
                values[field]=value
                sums[field][0]+=a*scale;sums[field][1]+=b
        if p['shareOK']:add('routeShare',p['routes'],p['passOps'],100)
        if p['routes']>=8:
            add('yprr',p['yards'],p['routes'])
            add('tprr',p['targets'],p['routes'])
        if complete('receiving_yards_after_catch','receptions'):
            add('yacPerReception',total['receiving_yards_after_catch'],total['receptions'])
        if complete('receiving_first_downs'):
            add('firstDownsPerRoute',total['receiving_first_downs'],p['routes'])
        if complete('receiving_20','receptions'):
            add('explosivePlayRate',total['receiving_20'],total['receptions'],100)
        if complete('receiving_epa','targets'):
            add('epaPerTarget',total['receiving_epa'],total['targets'])
        # ESPN PPR box scores, only when every route week is covered.
        if p['espnWeeks']==len(p['weeks']):
            add('fantasyPointsPerRoute',p['espnPpr'],p['routes'])
        elif complete('receptions','receiving_yards','receiving_tds'):
            add('fantasyPointsPerRoute',total['receptions']+total['receiving_yards']/10+
                6*total['receiving_tds'],p['routes'])
        # The existing Usage first-down/route field was already matched to
        # the exact same HeatRadar charted weeks. Preserve it when this
        # optional weekly receiving feed is missing, but do not invent
        # first-down counts for the league-average denominator.
        if values['firstDownsPerRoute'] is None:
            prior=ranked.get('players',{}).get(key(p['name']),{})
            cv=prior.get('firstDownRouteCoverage') or {}
            weeks=prior.get('routeWeeks') or {}
            rate=num(prior.get('receivingFirstDownsPerRoute'))
            if (prior.get('team')==p['team'] and
                sorted(int(w) for w in weeks)==p['weeks'] and
                cv.get('matchedWeeks')==len(p['weeks']) and
                cv.get('chartedWeeks')==len(p['weeks']) and rate is not None):
                values['firstDownsPerRoute']=round(rate/100,4)
        grouped[p['team']].append(dict(name=p['name'],team=p['team'],
            position=p['position'],weeks=p['weeks'],routes=p['routes'],
            matchedWeeks=p['nflWeeks'],metrics=values))
    for team_code in TEAMS:
        grouped[team_code].sort(key=lambda x:(-x['routes'],x['name']))
    coverage={f:sum(p['metrics'][f] is not None for t in TEAMS for p in grouped[t]) for f in FIELDS}
    return dict(schema=1,season=2026,throughWeek=through,
      source={'routes':'https://heatradar.app/nfl/routes',
              'receiving':URL if nfl else None,
              'fantasy':'ESPN full-PPR receiving box scores aligned to charted route weeks',
              'routeNotes':'Fractional or uncertain HeatRadar routes are excluded',
              'coverage':'All weeks matched by team/player/week; missing is not zero'},
      definitions={
        'routeShare':'Routes / team passing-play opportunities in charted weeks × 100',
        'yprr':'HeatRadar receiving yards / charted routes',
        'tprr':'HeatRadar targets / charted routes',
        'yacPerReception':'nflverse receiving yards after catch / receptions',
        'firstDownsPerRoute':'nflverse receiving first downs / charted routes',
        'explosivePlayRate':'Receptions gaining 20+ yards / all receptions × 100',
        'epaPerTarget':'nflverse receiving EPA / nflverse targets',
        'fantasyPointsPerRoute':'ESPN or nflverse (receptions + receiving yards/10 + receiving TD×6) / charted routes'},
      availableReceivingColumns=list(columns),
      coverage=coverage,totalChartedPlayers=len(players),
      leagueAverage={f:ratio(*sums[f]) for f in FIELDS},teams=grouped)

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--stats',type=Path,help='Offline nflverse stats_player CSV or gz')
    parser.add_argument('--no-stats',action='store_true',help='Build source-backed routes/ESPN now, leaving other fields null')
    args=parser.parse_args()
    if args.stats and args.no_stats:parser.error('Cannot combine --stats and --no-stats')
    heat=json.loads(ROUTES.read_text())
    season=json.loads(SEASON.read_text())
    ranked=json.loads(RANKED.read_text())
    if args.no_stats:weekly,fields={},[]
    else:
        if args.stats:content=args.stats.read_bytes()
        else:
            with urlopen(URL,timeout=90) as response:content=response.read()
        weekly,fields=read_stats(content)
    result=build(heat,season,ranked,weekly,fields)
    OUTPUT.write_text(json.dumps(result,separators=(',',':'),ensure_ascii=False)+'\n')
    print('Receiver efficiency:',len(result['teams']),'teams',
          result['totalChartedPlayers'],'players,',result['coverage'])

if __name__=='__main__':main()
