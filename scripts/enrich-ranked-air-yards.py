#!/usr/bin/env python3
"""Add verified receiving opportunity and efficiency from nflverse weekly stats.

The nflverse stats_player release is CC-BY 4.0. No route metrics are inferred.
Only weeks also present in the existing ESPN season snapshot are included.
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


ROOT = Path(__file__).resolve().parents[1]
URL = ('https://github.com/nflverse/nflverse-data/releases/download/'
       'stats_player/stats_player_week_2026.csv.gz')
ALIASES = {
    'kennethwalkeriii': 'kennethwalker',
    'michaelpittmanjr': 'michaelpittman',
    'brianthomasjr': 'brianthomas',
    'marvinharrisonjr': 'marvinharrison',
    'chigokonkwo': 'chigoziemokonkwo',
    'lutherburdeniii': 'lutherburden',
    'haroldfanninjr': 'haroldfannin',
    'joshpalmer': 'joshuapalmer',
    'jamescookiii': 'jamescook',
}
TEAMS = {'LA': 'LAR', 'WSH': 'WAS', 'JAC': 'JAX', 'GNB': 'GB',
         'KAN': 'KC', 'NWE': 'NE', 'NOR': 'NO', 'SFO': 'SF',
         'TAM': 'TB', 'LVR': 'LV'}


def key(name):
    text = unicodedata.normalize('NFD', name or '')
    text = ''.join(ch for ch in text if unicodedata.category(ch) != 'Mn')
    value = re.sub('[^a-z0-9]', '', text.lower())
    return ALIASES.get(value, value)


def canonical(team):
    return TEAMS.get((team or '').upper(), (team or '').upper())


def number(raw):
    if raw is None or raw == '':
        return None
    value = float(raw)
    return value if math.isfinite(value) else None


def rounded_ratio(numerator, denominator, multiplier=1, digits=2):
    if numerator is None or denominator is None or denominator <= 0:
        return None
    return round(multiplier * numerator / denominator, digits)


def main():
    argp = argparse.ArgumentParser()
    argp.add_argument('--input', type=Path, help='Use a downloaded nflverse CSV or CSV.gz for offline verification')
    args = argp.parse_args()
    if args.input:
        content = args.input.read_bytes()
    else:
        with urlopen(URL, timeout=35) as resp:
            content = resp.read()
    if content[:2] == b'\x1f\x8b':
        content = gzip.decompress(content)
    reader = csv.DictReader(io.StringIO(content.decode('utf-8-sig')))
    measures = ('receiving_air_yards', 'targets', 'receptions', 'receiving_yards',
                'receiving_yards_after_catch', 'receiving_first_downs')
    required = {'player_display_name', 'season', 'week', 'season_type', 'team', *measures}
    if not required.issubset(set(reader.fieldnames or ())):
        raise ValueError('nflverse weekly-player data is missing required columns')

    team_totals = defaultdict(lambda: defaultdict(float))
    player_weeks = {}
    for row in reader:
        if row['season'] != '2026' or row['season_type'] != 'REG':
            continue
        team = canonical(row['team'])
        week = int(row['week'])
        if not 1 <= week <= 18:
            continue
        parsed = {measure: number(row[measure]) for measure in measures}
        for measure, value in parsed.items():
            if value is not None:
                team_totals[(team, week)][measure] += value
        identity = (key(row['player_display_name']), team, week)
        if identity in player_weeks:
            raise ValueError('Duplicate nflverse player/team/week: %s' % (identity,))
        player_weeks[identity] = parsed

    season = json.loads((ROOT / 'analytics/data/season-2026.json').read_text())
    path = ROOT / 'analytics/data/ranked-usage-2026.json'
    output = json.loads(path.read_text())
    valid_games = {
        key(p['name']): [(canonical(g.get('team') or p.get('team')), int(g['week']))
                         for g in p.get('games', []) if g.get('hasStats') is not False and 1 <= int(g['week']) <= output['throughWeek']]
        for p in season['players']
    }
    coverage = defaultdict(int)
    for player_key, player in output['players'].items():
        if player.get('position') not in ('RB', 'WR', 'TE'):
            player['nflverseCoverage'] = {'matchedWeeks': 0, 'espnWeeks': len(valid_games.get(player_key, ())) }
            for name in ('airYardsShare', 'aDOT', 'wopr', 'receivingYardsShare',
                         'yacPerReception', 'receivingFirstDowns'):
                player[name] = None
            continue
        totals = defaultdict(float)
        matched_weeks = 0
        requested_weeks = valid_games.get(player_key, ())
        for team, week in requested_weeks:
            own = player_weeks.get((player_key, team, week))
            team_total = team_totals.get((team, week))
            if own is None or team_total is None:
                continue
            for measure in measures:
                own_value = own.get(measure)
                if own_value is not None:
                    totals['own_'+measure] += own_value
                totals['team_'+measure] += team_total.get(measure, 0)
            matched_weeks += 1
        player['nflverseCoverage'] = {'matchedWeeks': matched_weeks, 'espnWeeks': len(requested_weeks)}
        if not matched_weeks:
            for name in ('airYardsShare', 'aDOT', 'wopr', 'receivingYardsShare',
                         'yacPerReception', 'receivingFirstDowns'):
                player[name] = None
            continue
        get = lambda prefix, name: totals.get(prefix + name)
        air = get('own_', 'receiving_air_yards')
        targets = get('own_', 'targets')
        team_air = get('team_', 'receiving_air_yards')
        team_targets = get('team_', 'targets')
        player['airYardsShare'] = rounded_ratio(air, team_air, 100)
        player['aDOT'] = rounded_ratio(air, targets)
        player['receivingYardsShare'] = rounded_ratio(
            get('own_', 'receiving_yards'), get('team_', 'receiving_yards'), 100)
        player['yacPerReception'] = rounded_ratio(
            get('own_', 'receiving_yards_after_catch'), get('own_', 'receptions'))
        first_downs = get('own_', 'receiving_first_downs')
        player['receivingFirstDowns'] = int(first_downs) if first_downs is not None else None
        player['wopr'] = (round(1.5 * targets / team_targets + 0.7 * air / team_air, 3)
                          if targets is not None and team_targets and air is not None and team_air and team_air > 0
                          else None)
        for name in ('airYardsShare', 'aDOT', 'wopr', 'receivingYardsShare',
                     'yacPerReception', 'receivingFirstDowns'):
            if player[name] is not None:
                coverage[name] += 1
    output['playersWithAirYardsShare'] = coverage['airYardsShare']
    output['additionalUsageCoverage'] = dict(coverage)
    output['airYardsSource'] = URL
    output['definitions'].update({
        'airYardsShare': 'Player receiving air yards / all team receiving air yards in matched nflverse/ESPN weeks; negative air yards retained',
        'aDOT': 'Sum of player receiving air yards / sum of player targets for matched nflverse/ESPN weeks',
        'wopr': '1.5 × nflverse target share + 0.7 × nflverse air-yards share across matched weeks; dimensionless',
        'receivingYardsShare': 'Player receiving yards / team receiving yards across the same matched nflverse/ESPN weeks',
        'yacPerReception': 'Sum of nflverse receiving yards after catch / sum of receptions across matched weeks',
        'receivingFirstDowns': 'Sum of nflverse receiving first downs across matched weeks',
    })
    output['limitations'] = [text for text in output['limitations'] if not text.startswith('Route participation,')]
    output['limitations'].append('Route participation, targets per route and yards per route require independently charted routes; unavailable values remain null')
    output['limitations'].append('nflverse receiving metrics use only matched ESPN weeks. A player may have fewer verified source weeks than recorded games; see source coverage.')
    path.write_text(json.dumps(output, separators=(',', ':')))
    print(f'Additional nflverse usage coverage across {output["rankedPlayers"]} ranked players: {dict(coverage)}')


if __name__ == '__main__':
    main()
