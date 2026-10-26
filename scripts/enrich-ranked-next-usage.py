#!/usr/bin/env python3
"""Add 12 further ranked-player Usage measures from verified 2026 sources.

Unavailable model/charting measures are deliberately null. Do not infer
first reads from targets or expected touchdowns from red-zone opportunities.
"""

import argparse
import csv
import gzip
import importlib.util
import io
import json
import math
from collections import defaultdict
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('advanced_usage', ROOT / 'scripts/enrich-ranked-advanced-usage.py')
advanced = importlib.util.module_from_spec(spec)
spec.loader.exec_module(advanced)

SOURCES = {
    'expected': advanced.SOURCES['expected'],
    'pbp': advanced.SOURCES['pbp'],
    'pfr_pass': 'https://github.com/nflverse/nflverse-data/releases/download/pfr_advstats/advstats_week_pass_2026.csv',
    'ngs_receiving': 'https://github.com/nflverse/nflverse-data/releases/download/nextgen_stats/ngs_2026_receiving.csv.gz',
}
FIELDS = (
    'expectedFantasyPointsTrend', 'expectedTouchdowns', 'endZoneTargets',
    'targetShareTrend', 'fantasyPointsPerOpportunity', 'explosivePlayRate',
    'rushingSuccessRate', 'firstReadTargetShare', 'averageSeparation',
    'epaPerDropback', 'completionPctOverExpected', 'pressureToSackRate',
)


def read(label, path, optional=False):
    if path:
        return path.read_bytes()
    try:
        with urlopen(SOURCES[label], timeout=35 if optional else 90) as response:
            return response.read()
    except (HTTPError, URLError):
        if optional:
            return None
        raise


def rows(content):
    if content[:2] == b'\x1f\x8b':
        content = gzip.decompress(content)
    return csv.DictReader(io.StringIO(content.decode('utf-8-sig')))


def check_columns(reader, required, label):
    missing = set(required) - set(reader.fieldnames or [])
    if missing:
        raise ValueError(label + ' schema missing: ' + ', '.join(sorted(missing)))


def pbp_stats(content, ids, through):
    reader = rows(content)
    needed = ('season', 'week', 'season_type', 'posteam', 'play_type',
              'receiver_player_id', 'rusher_player_id', 'passer_player_id',
              'pass_attempt', 'rush_attempt', 'complete_pass', 'receiving_yards',
              'rushing_yards', 'yardline_100', 'air_yards', 'qb_kneel',
              'qb_dropback', 'down', 'ydstogo', 'epa', 'cpoe')
    check_columns(reader, needed, 'nflverse PBP')
    stats = defaultdict(lambda: defaultdict(float))
    team_targets = defaultdict(int)
    observed = set()
    for r in reader:
        if r['season'] != '2026' or r['season_type'] != 'REG' or not r['posteam']:
            continue
        week = int(r['week'])
        if week < 1 or week > through:
            continue
        side = advanced.team(r['posteam'])
        game = (side, week)
        if r['play_type'] in ('run', 'pass', 'qb_kneel'):
            observed.add(game)
        if r['pass_attempt'] == '1' and r['receiver_player_id']:
            team_targets[game] += 1
            name = ids.get(r['receiver_player_id'])
            if name:
                p = stats[(name, side, week)]
                p['targets'] += 1
                air, yardline = advanced.number(r['air_yards']), advanced.number(r['yardline_100'])
                if air is not None and yardline is not None and air >= yardline > 0:
                    p['endZoneTargets'] += 1
                elif air is None or yardline is None:
                    p['unknownEndZoneDepth'] += 1
                if r['complete_pass'] == '1':
                    yards = advanced.number(r['receiving_yards'])
                    if yards is None:
                        p['invalidTouches'] += 1
                    else:
                        p['touches'] += 1
                        p['explosive'] += int(yards >= 20)
        if r['rush_attempt'] == '1' and r['qb_kneel'] != '1' and r['rusher_player_id']:
            name = ids.get(r['rusher_player_id'])
            if name:
                p = stats[(name, side, week)]
                yards = advanced.number(r['rushing_yards'])
                if yards is None:
                    p['invalidTouches'] += 1
                else:
                    p['touches'] += 1
                    p['explosive'] += int(yards >= 10)
                    down, togo = advanced.number(r['down']), advanced.number(r['ydstogo'])
                    if down is not None and togo is not None and togo > 0:
                        threshold = .4 if down == 1 else .6 if down == 2 else 1
                        p['successEligible'] += 1
                        p['success'] += int(yards >= threshold * togo)
                    else:
                        p['unknownRushContext'] += 1
        if r['qb_dropback'] == '1' and r['passer_player_id']:
            name = ids.get(r['passer_player_id'])
            if name:
                p = stats[(name, side, week)]
                p['dropbacks'] += 1
                epa = advanced.number(r['epa'])
                if epa is None:
                    p['unknownEpa'] += 1
                else:
                    p['epa'] += epa
                if r['pass_attempt'] == '1':
                    p['qbAttempts'] += 1
                    cpoe = advanced.number(r['cpoe'])
                    if cpoe is None:
                        p['unknownCpoe'] += 1
                    else:
                        p['cpoeSum'] += cpoe
                        p['cpoeAttempts'] += 1
    return stats, team_targets, observed


def pfr_pressure(content):
    reader = rows(content)
    check_columns(reader, ('season', 'week', 'game_type', 'team', 'pfr_player_name',
                           'times_sacked', 'times_pressured'), 'PFR advanced passing')
    result = {}
    for r in reader:
        if r['season'] != '2026' or r['game_type'] != 'REG':
            continue
        sacks, pressure = advanced.number(r['times_sacked']), advanced.number(r['times_pressured'])
        if sacks is None or pressure is None or pressure < sacks or pressure < 0:
            continue
        k = (advanced.key(r['pfr_player_name']), advanced.team(r['team']), int(r['week']))
        if k in result:
            raise ValueError('Duplicate PFR passer ' + str(k))
        result[k] = (sacks, pressure)
    return result


def ngs_separation(content):
    if not content:
        return {}
    reader = rows(content)
    check_columns(reader, ('season', 'week', 'season_type', 'player_display_name',
                           'team_abbr', 'avg_separation', 'targets'), 'NGS receiving')
    result = {}
    for r in reader:
        if r['season'] != '2026' or r['season_type'] != 'REG':
            continue
        sep, targets = advanced.number(r['avg_separation']), advanced.number(r['targets'])
        if sep is None or targets is None or targets <= 0:
            continue
        k = (advanced.key(r['player_display_name']), advanced.team(r['team_abbr']), int(r['week']))
        if k in result:
            raise ValueError('Duplicate NGS receiver ' + str(k))
        result[k] = (sep, targets)
    return result


def weighted_change(weeks, through, minimum=2):
    recent = [v for w, v in weeks if through-2 <= w <= through]
    previous = [v for w, v in weeks if through-5 <= w <= through-3]
    if len(recent) < minimum or len(previous) < minimum:
        return None, len(recent), len(previous)
    return round(sum(recent)/len(recent)-sum(previous)/len(previous), 2), len(recent), len(previous)


def enrich(usage, season, expected_content, pbp_content, pfr_content, ngs_content=None):
    expected, ids = advanced.read_expected(expected_content)
    pbp, team_targets, observed = pbp_stats(pbp_content, ids, usage['throughWeek'])
    pressure = pfr_pressure(pfr_content)
    separation = ngs_separation(ngs_content)
    players = {advanced.key(p['name']): p for p in season['players']}
    coverage = defaultdict(int)
    through = usage['throughWeek']
    for identity, row in usage['players'].items():
        for field in FIELDS:
            row[field] = None
        row.pop('nextUsageCoverage', None)
        p = players.get(identity)
        if not p:
            continue
        games = [(advanced.team(g.get('team') or p.get('team')), int(g['week']), g)
                 for g in p.get('games', [])
                 if g.get('hasStats') is not False and 1 <= int(g['week']) <= through]
        if not games:
            continue
        tuples = [(identity, side, week) for side, week, _ in games]
        record = {}
        expected_weeks = [(week, expected[(identity, side, week)][1])
                          for side, week, _ in games
                          if (identity, side, week) in expected and expected[(identity, side, week)][1] is not None]
        trend, recent, prior = weighted_change(expected_weeks, through)
        row['expectedFantasyPointsTrend'] = trend
        record['expectedWeeks'] = len(expected_weeks)
        record['trendRecentWeeks'] = recent
        record['trendPriorWeeks'] = prior

        points = [advanced.number(g.get('totalPoints')) for _, _, g in games]
        opportunities = [(advanced.number(g.get('targets')), advanced.number(g.get('rushAtt')))
                         for _, _, g in games]
        if row['position'] in ('RB', 'WR', 'TE') and all(n is not None for n in points) and all(t is not None and c is not None for t, c in opportunities):
            total_opp = sum(t+c for t, c in opportunities)
            row['fantasyPointsPerOpportunity'] = advanced.ratio(sum(points), total_opp, digits=3)
        verified = [(side, week) for side, week, _ in games if (side, week) in observed]
        if identity in set(ids.values()) and verified:
            slices = [pbp[(identity, side, week)] for side, week in verified]
            sum_field = lambda field: sum(item[field] for item in slices)
            target_weeks = [(week, 100*pbp[(identity, side, week)]['targets']/team_targets[(side, week)])
                            for side, week in verified if team_targets[(side, week)] > 0]
            row['targetShareTrend'], record['targetRecentWeeks'], record['targetPriorWeeks'] = weighted_change(target_weeks, through)
            if sum_field('unknownEndZoneDepth') == 0 and row['position'] in ('RB','WR','TE'):
                row['endZoneTargets'] = int(sum_field('endZoneTargets'))
            if sum_field('invalidTouches') == 0 and sum_field('touches') > 0:
                row['explosivePlayRate'] = advanced.ratio(sum_field('explosive'), sum_field('touches'), 100)
            if sum_field('unknownRushContext') == 0 and sum_field('successEligible') > 0:
                row['rushingSuccessRate'] = advanced.ratio(sum_field('success'), sum_field('successEligible'), 100)
            if row['position'] == 'QB':
                if sum_field('unknownEpa') == 0 and sum_field('dropbacks') > 0:
                    row['epaPerDropback'] = advanced.ratio(sum_field('epa'), sum_field('dropbacks'), digits=3)
                cpoe_attempts, qb_attempts = sum_field('cpoeAttempts'), sum_field('qbAttempts')
                record['cpoeRecordedAttempts'] = int(cpoe_attempts)
                record['cpoeTotalAttempts'] = int(qb_attempts)
                # NFL play-by-play omits completion probability on some throws.
                # Report only from observed attempts with substantial coverage.
                if cpoe_attempts >= 10 and qb_attempts and cpoe_attempts/qb_attempts >= .75:
                    row['completionPctOverExpected'] = advanced.ratio(sum_field('cpoeSum'), cpoe_attempts)
            record['pbpWeeks'] = len(verified)

        matched_pressure = [pressure[t] for t in tuples if t in pressure]
        if row['position'] == 'QB' and matched_pressure:
            sacks = sum(v[0] for v in matched_pressure)
            pressured = sum(v[1] for v in matched_pressure)
            row['pressureToSackRate'] = advanced.ratio(sacks, pressured, 100)
            record['pressureWeeks'] = len(matched_pressure)
        matched_ngs = [separation[t] for t in tuples if t in separation]
        if row['position'] in ('WR','TE') and matched_ngs:
            weighted = sum(sep*t for sep, t in matched_ngs)
            row['averageSeparation'] = advanced.ratio(weighted, sum(t for _, t in matched_ngs))
            record['ngsWeeks'] = len(matched_ngs)
        # xTD requires a calibrated player-level TD model; first-read share
        # requires play-design charting. Neither can be inferred reliably.
        row['nextUsageCoverage'] = record
        for field in FIELDS:
            value = row[field]
            if value is not None:
                if not math.isfinite(value):
                    raise ValueError('Non-finite ' + identity + '/' + field)
                coverage[field] += 1
    usage['nextUsageCoverage'] = dict(coverage)
    usage['nextUsageSources'] = SOURCES
    usage['definitions'].update({
        'expectedFantasyPointsTrend': 'Last three NFL weeks modeled xFP/G minus previous three NFL weeks; at least two matched games per window',
        'expectedTouchdowns': 'Requires a validated player-level expected touchdown model; unavailable until independently sourced',
        'endZoneTargets': 'Passes targeted into the end zone: verified air yards reaching or exceeding distance from scrimmage to goal line',
        'targetShareTrend': 'Last three weeks player targets / team targets minus previous three weeks, averaged weekly; two verified weeks per window',
        'fantasyPointsPerOpportunity': 'Recorded PPR fantasy points / recorded targets plus rushing attempts',
        'explosivePlayRate': 'Rushes gaining at least 10 yards plus receptions gaining at least 20 / rushes plus receptions × 100',
        'rushingSuccessRate': 'Carries gaining >=40% of yards to go on first down, >=60% on second, or 100% on third/fourth × 100',
        'firstReadTargetShare': 'Requires verified play-design first-read charting; no suitable 2026 feed verified',
        'averageSeparation': 'Target-weighted NFL Next Gen Stats nearest-defender separation at pass arrival across recorded games',
        'epaPerDropback': 'Sum play-by-play expected points added on QB dropbacks / verified dropbacks, including sacks',
        'completionPctOverExpected': 'Mean nflverse CPOE on attempts with published completion probability; minimum 10 attempts and 75% coverage, in percentage points',
        'pressureToSackRate': 'PFR sacks taken / PFR recorded pressures across matched games × 100',
    })
    usage['limitations'] = [s for s in usage.get('limitations', []) if not s.startswith('Additional 12 Usage:')]
    usage['limitations'].append('Additional 12 Usage: xTD and first-read charting lack verified player-level 2026 inputs; null is not zero. NGS separation is unavailable until the official 2026 source is published.')
    return dict(coverage)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--expected', type=Path)
    parser.add_argument('--pbp', type=Path)
    parser.add_argument('--pfr-pass', type=Path)
    parser.add_argument('--ngs-receiving', type=Path)
    args = parser.parse_args()
    path = ROOT / 'analytics/data/ranked-usage-2026.json'
    usage = json.loads(path.read_text())
    season = json.loads((ROOT / 'analytics/data/season-2026.json').read_text())
    counts = enrich(usage, season, read('expected', args.expected), read('pbp', args.pbp),
                    read('pfr_pass', args.pfr_pass), read('ngs_receiving', args.ngs_receiving, optional=True))
    path.write_text(json.dumps(usage, separators=(',', ':')))
    print('12 additional 2026 ranked Usage fields:', counts)


if __name__ == '__main__':
    main()
