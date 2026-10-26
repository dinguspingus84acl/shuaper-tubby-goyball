#!/usr/bin/env python3
"""Merge ten sourced advanced statistics into ranked-player Usage analytics.

Inputs: ffverse ffopportunity weekly expected-PPR RDS, nflverse play-by-play
and PFR advanced weekly rushing CSV. The HeatRadar route trend is populated by
enrich-ranked-heatradar-routes.cjs, before this script runs.

No missing play, route, week or player is interpreted as an observed zero.
Values are restricted to the ESPN player weeks already in season-2026.json.
Install the small free RDS reader with `python -m pip install pyreadr`.
"""

import argparse
import csv
import gzip
import io
import json
import math
import re
import tempfile
import unicodedata
from collections import defaultdict
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    'expected': ('https://github.com/ffverse/ffopportunity/releases/download/'
                 'latest-data/ep_weekly_2026.rds'),
    'pbp': ('https://github.com/nflverse/nflverse-data/releases/download/'
            'pbp/play_by_play_2026.csv.gz'),
    'pfr': ('https://github.com/nflverse/nflverse-data/releases/download/'
            'pfr_advstats/advstats_week_rush_2026.csv'),
}
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
METRICS = (
    'expectedFantasyPointsPerGame', 'fantasyPointsOverExpected',
    'redZoneTargetShare', 'insideFiveCarryShare', 'insideTenTargets',
    'routeParticipationTrend', 'deepTargetRate',
    'receivingFirstDownsPerRoute', 'yardsAfterContactPerCarry',
    'qbDesignedRushesPerGame',
)


def key(value):
    normalized = unicodedata.normalize('NFD', str(value or ''))
    normalized = ''.join(x for x in normalized if unicodedata.category(x) != 'Mn')
    name = re.sub('[^a-z0-9]', '', normalized.lower())
    return ALIASES.get(name, name)


def team(value):
    raw = str(value or '').upper()
    return TEAMS.get(raw, raw)


def number(value):
    if value is None or value == '':
        return None
    parsed = float(value)
    return parsed if math.isfinite(parsed) else None


def ratio(numerator, denominator, multiplier=1, digits=2):
    if numerator is None or denominator is None or denominator <= 0:
        return None
    return round(multiplier * numerator / denominator, digits)


def read_bytes(label, path):
    if path:
        return path.read_bytes()
    with urlopen(SOURCES[label], timeout=90) as response:
        return response.read()


def csv_rows(content):
    if content[:2] == b'\x1f\x8b':
        content = gzip.decompress(content)
    return csv.DictReader(io.StringIO(content.decode('utf-8-sig')))


def read_expected(content):
    try:
        import pyreadr
    except ImportError as exc:
        raise RuntimeError('Expected-points RDS requires: python -m pip install pyreadr') from exc
    # pyreadr consumes a path; keep the downloaded binary outside the repo.
    with tempfile.TemporaryDirectory(prefix='shua-xfp-') as directory:
        source = Path(directory) / 'ep_weekly_2026.rds'
        source.write_bytes(content)
        frame = next(iter(pyreadr.read_r(str(source)).values()))
    required = {'full_name', 'posteam', 'week', 'player_id', 'position',
                'total_fantasy_points', 'total_fantasy_points_exp'}
    if not required.issubset(frame.columns):
        raise ValueError('ffopportunity changed its weekly source columns')
    if not (frame['season'].astype(str) == '2026').all():
        raise ValueError('Expected-points data contains a different NFL season')
    rows = {}
    player_ids = {}
    for name, side, week, identifier, position, actual, expected in frame[[
            'full_name', 'posteam', 'week', 'player_id', 'position',
            'total_fantasy_points', 'total_fantasy_points_exp']].itertuples(
                index=False, name=None):
        if not name or number(week) is None:
            continue
        identity = (key(name), team(side), int(week))
        if identity in rows:
            raise ValueError('Duplicate weekly ffopportunity identity: '+str(identity))
        rows[identity] = (number(actual), number(expected))
        if isinstance(identifier, str) and identifier:
            if identifier in player_ids and player_ids[identifier] != key(name):
                raise ValueError('Conflicting nflverse player ID '+identifier)
            player_ids[identifier] = key(name)
    return rows, player_ids


def read_pfr(content):
    reader = csv_rows(content)
    required = {'season', 'week', 'game_type', 'team', 'pfr_player_name',
                'carries', 'rushing_yards_after_contact'}
    if not required.issubset(reader.fieldnames or ()):
        raise ValueError('PFR advanced rushing source schema changed')
    result = {}
    for row in reader:
        if row['season'] != '2026' or row['game_type'] != 'REG':
            continue
        carries, yac = number(row['carries']), number(row['rushing_yards_after_contact'])
        if carries is None or yac is None or carries < 0:
            continue
        identity = (key(row['pfr_player_name']), team(row['team']), int(row['week']))
        if identity in result:
            raise ValueError('Duplicate PFR rusher identity: '+str(identity))
        result[identity] = (carries, yac)
    return result


def read_pbp(content, player_ids, through_week):
    reader = csv_rows(content)
    fields = {'season', 'week', 'season_type', 'posteam', 'play_type',
              'pass_attempt', 'rush_attempt', 'receiver_player_id',
              'rusher_player_id', 'yardline_100', 'air_yards',
              'qb_scramble', 'qb_kneel', 'first_down_pass'}
    if not fields.issubset(reader.fieldnames or ()):
        raise ValueError('nflverse play-by-play source schema changed')
    player = defaultdict(lambda: defaultdict(int))
    team_counts = defaultdict(lambda: defaultdict(int))
    team_games = set()
    for row in reader:
        if row['season'] != '2026' or row['season_type'] != 'REG' or not row['posteam']:
            continue
        week = int(row['week'])
        if not 1 <= week <= through_week:
            continue
        side = team(row['posteam'])
        game = (side, week)
        if row['play_type'] in ('pass', 'run', 'qb_kneel'):
            team_games.add(game)
        yardline = number(row['yardline_100'])
        if row['pass_attempt'] == '1' and row['receiver_player_id']:
            identity = (player_ids.get(row['receiver_player_id']), side, week)
            air = number(row['air_yards'])
            if identity[0]:
                player[identity]['targets'] += 1
                if air is None:
                    player[identity]['unknownAir'] += 1
                elif air >= 20:
                    player[identity]['deepTargets'] += 1
                if row['first_down_pass'] == '1':
                    player[identity]['recFirstDowns'] += 1
            if yardline is not None and yardline <= 20:
                team_counts[game]['redZoneTargets'] += 1
                if identity[0]:
                    player[identity]['redZoneTargets'] += 1
            if yardline is not None and yardline <= 10 and identity[0]:
                player[identity]['insideTenTargets'] += 1
        if row['rush_attempt'] == '1' and row['qb_kneel'] != '1' and row['rusher_player_id']:
            identity = (player_ids.get(row['rusher_player_id']), side, week)
            if yardline is not None and yardline <= 5:
                team_counts[game]['insideFiveCarries'] += 1
                if identity[0]:
                    player[identity]['insideFiveCarries'] += 1
            if row['qb_scramble'] != '1' and identity[0]:
                player[identity]['designedRushes'] += 1
    return player, team_counts, team_games


def enrich(usage, season, expected, pfr, pbp):
    if usage.get('season') != 2026 or usage.get('schema') != 1:
        raise ValueError('Unexpected Usage snapshot')
    expected_rows, player_ids = read_expected(expected)
    identifiable_players = set(player_ids.values())
    pfr_rows = read_pfr(pfr)
    pbp_players, pbp_teams, observed = read_pbp(pbp, player_ids, usage['throughWeek'])
    season_players = {key(p['name']): p for p in season['players']}
    coverage = defaultdict(int)
    for identity, row in usage['players'].items():
        p = season_players.get(identity)
        games = [(team(g.get('team') or p.get('team')), int(g['week']))
                 for g in p.get('games', [])
                 if g.get('hasStats') is not False and 1 <= int(g['week']) <= usage['throughWeek']] if p else []
        # Persist no previous-run values when the source or season changes.
        for field in METRICS:
            if field != 'routeParticipationTrend':
                row[field] = None
        for name in ('expectedPointsCoverage', 'advancedPbpCoverage', 'pfrRushingCoverage',
                     'firstDownRouteCoverage'):
            row.pop(name, None)
        weekly_expected = [expected_rows[(identity, side, week)]
                           for side, week in games if (identity, side, week) in expected_rows]
        complete_expected = [item for item in weekly_expected
                             if item[0] is not None and item[1] is not None]
        if complete_expected:
            actual = sum(item[0] for item in complete_expected)
            modeled = sum(item[1] for item in complete_expected)
            row['expectedFantasyPointsPerGame'] = round(modeled / len(complete_expected), 2)
            row['fantasyPointsOverExpected'] = round(actual - modeled, 2)
            row['expectedPointsCoverage'] = {'matchedWeeks': len(complete_expected),
                                             'espnWeeks': len(games)}

        pbp_games = [(side, week) for side, week in games if (side, week) in observed]
        if pbp_games and identity in identifiable_players:
            row['advancedPbpCoverage'] = {'matchedWeeks': len(pbp_games),
                                          'espnWeeks': len(games)}
            own = lambda field: sum(pbp_players[(identity, side, week)][field]
                                     for side, week in pbp_games)
            team_total = lambda field: sum(pbp_teams[(side, week)][field]
                                           for side, week in pbp_games)
            row['insideFiveCarryShare'] = ratio(own('insideFiveCarries'), team_total('insideFiveCarries'), 100)
            if row['position'] == 'QB':
                row['qbDesignedRushesPerGame'] = round(own('designedRushes') / len(pbp_games), 2)
            if row['position'] in ('RB', 'WR', 'TE'):
                row['redZoneTargetShare'] = ratio(own('redZoneTargets'), team_total('redZoneTargets'), 100)
                row['insideTenTargets'] = own('insideTenTargets')
                if own('unknownAir') == 0:
                    row['deepTargetRate'] = ratio(own('deepTargets'), own('targets'), 100)

                # Align the first-down numerator with the *same valid weeks*
                # counted by HeatRadar in the route denominator.
                route_weeks = row.get('routeWeeks') or {}
                aligned = [(side, week, route_weeks[str(week)])
                           for side, week in pbp_games if str(week) in route_weeks]
                route_count = sum(number(w.get('routes')) or 0 for _, _, w in aligned)
                if route_count >= 8:
                    first_downs = sum(pbp_players[(identity, side, week)]['recFirstDowns']
                                      for side, week, _ in aligned)
                    row['receivingFirstDownsPerRoute'] = ratio(first_downs, route_count, 100)
                    row['firstDownRouteCoverage'] = {'matchedWeeks': len(aligned),
                                                     'chartedWeeks': len(route_weeks)}

        pfr_games = [pfr_rows[(identity, side, week)]
                     for side, week in games if (identity, side, week) in pfr_rows]
        if pfr_games and sum(carries for carries, _ in pfr_games) > 0:
            carries = sum(value[0] for value in pfr_games)
            contact_yards = sum(value[1] for value in pfr_games)
            row['yardsAfterContactPerCarry'] = ratio(contact_yards, carries)
            row['pfrRushingCoverage'] = {'matchedWeeks': len(pfr_games),
                                         'espnWeeks': len(games)}
        for field in METRICS:
            value = row.get(field)
            if value is not None and (not isinstance(value, (int, float)) or not math.isfinite(value)):
                raise ValueError('Non-finite '+identity+'/'+field)
            if value is not None:
                coverage[field] += 1

    usage['advancedUsageCoverage'] = dict(coverage)
    usage['expectedPointsSource'] = SOURCES['expected']
    usage['advancedPbpSource'] = SOURCES['pbp']
    usage['pfrRushingSource'] = SOURCES['pfr']
    usage['definitions'].update({
        'expectedFantasyPointsPerGame': 'Sum of ffopportunity modeled PPR fantasy points / matched recorded games',
        'fantasyPointsOverExpected': 'Sum of ffopportunity actual PPR fantasy points minus modeled PPR fantasy points over matched recorded games',
        'redZoneTargetShare': 'Player targets from opponent 20 or closer / all team targets from opponent 20 or closer in the same verified play-by-play weeks × 100',
        'insideFiveCarryShare': 'Player rush attempts from opponent 5 or closer / all team rush attempts there in matched weeks × 100 (kneeldowns excluded)',
        'insideTenTargets': 'Number of targets on passes snapped from opponent 10 or closer, including incomplete passes',
        'deepTargetRate': 'Targets traveling at least 20 air yards / all player targets in verified weeks × 100; null if any target has missing depth',
        'receivingFirstDownsPerRoute': 'Receiving first downs from nflverse play-by-play / HeatRadar charted routes in exactly the same weeks × 100; minimum eight routes',
        'yardsAfterContactPerCarry': 'Sum of PFR rushing yards after contact / PFR carries over weeks matched with the ESPN schedule',
        'qbDesignedRushesPerGame': 'QB rush attempts with scramble and kneeldown flags excluded / verified recorded games',
    })
    usage['limitations'] = [line for line in usage.get('limitations', [])
                             if not line.startswith('Expected fantasy points')]
    usage['limitations'].append(
        'Expected fantasy points are published model estimates, not guaranteed outcomes; only matched 2026 ESPN weeks count.')
    usage['limitations'].append(
        'Inside-20/inside-5/deep target metrics use nflverse play-by-play; rushing yards after contact use PFR game-level data. Missing denominators show as unavailable.')
    usage['limitations'].append(
        'Receiving first downs per route use play-by-play and HeatRadar matched to identical weeks; week coverage may differ from other receiving metrics.')
    return dict(coverage)


def main():
    args = argparse.ArgumentParser()
    args.add_argument('--expected', type=Path, help='Local ffopportunity ep_weekly_2026.rds')
    args.add_argument('--pbp', type=Path, help='Local nflverse 2026 play_by_play CSV.gz')
    args.add_argument('--pfr', type=Path, help='Local PFR 2026 advanced rushing CSV')
    options = args.parse_args()
    usage_path = ROOT / 'analytics/data/ranked-usage-2026.json'
    usage = json.loads(usage_path.read_text())
    season = json.loads((ROOT / 'analytics/data/season-2026.json').read_text())
    counts = enrich(usage, season, read_bytes('expected', options.expected),
                    read_bytes('pfr', options.pfr), read_bytes('pbp', options.pbp))
    usage_path.write_text(json.dumps(usage, separators=(',', ':')))
    print('Source-backed 2026 advanced usage on ranked players:', counts)


if __name__ == '__main__':
    main()
