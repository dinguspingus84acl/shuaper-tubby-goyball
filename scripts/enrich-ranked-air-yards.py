#!/usr/bin/env python3
"""Add verified receiving air-yards shares from nflverse weekly PBP summaries.

The nflverse stats_player release is CC-BY 4.0. No route metrics are inferred.
Only weeks also present in the existing ESPN season snapshot are included.
"""
import argparse
import csv
import gzip
import io
import json
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
        return 0.0
    return float(raw)


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
    required = {'player_display_name', 'season', 'week', 'season_type', 'team', 'receiving_air_yards'}
    if not required.issubset(set(reader.fieldnames or ())):
        raise ValueError('nflverse weekly-player data is missing required columns')

    team_air = defaultdict(float)
    player_air = {}
    for row in reader:
        if row['season'] != '2026' or row['season_type'] != 'REG':
            continue
        team = canonical(row['team'])
        week = int(row['week'])
        air = number(row['receiving_air_yards'])
        team_air[(team, week)] += air
        identity = (key(row['player_display_name']), team, week)
        if identity in player_air:
            raise ValueError('Duplicate nflverse player/team/week: %s' % (identity,))
        player_air[identity] = air

    season = json.loads((ROOT / 'analytics/data/season-2026.json').read_text())
    path = ROOT / 'analytics/data/ranked-usage-2026.json'
    output = json.loads(path.read_text())
    valid_games = {
        key(p['name']): [(canonical(g.get('team') or p.get('team')), int(g['week']))
                         for g in p.get('games', []) if g.get('hasStats') is not False and 1 <= int(g['week']) <= output['throughWeek']]
        for p in season['players']
    }
    coverage = 0
    for player_key, player in output['players'].items():
        totals = [0.0, 0.0]
        matched_weeks = 0
        for team, week in valid_games.get(player_key, ()):
            air = player_air.get((player_key, team, week))
            team_total = team_air.get((team, week))
            if air is None or team_total is None:
                continue
            totals[0] += air
            totals[1] += team_total
            matched_weeks += 1
        player['airYardsShare'] = round(100 * totals[0] / totals[1], 2) if totals[1] > 0 and matched_weeks else None
        if player['airYardsShare'] is not None:
            coverage += 1
    output['playersWithAirYardsShare'] = coverage
    output['airYardsSource'] = URL
    output['definitions']['airYardsShare'] = ('Player receiving air yards divided by all receiving air yards for the same team '
                                              'during matched recorded games; negative air yards are retained')
    output['limitations'] = [text for text in output['limitations'] if not text.startswith('Route participation,')]
    output['limitations'].append('Route participation, targets per route and yards per route require independently charted routes; unavailable values remain null')
    path.write_text(json.dumps(output, separators=(',', ':')))
    print(f'Air-yards shares available for {coverage}/{output["rankedPlayers"]} ranked players')


if __name__ == '__main__':
    main()
