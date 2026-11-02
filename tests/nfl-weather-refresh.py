#!/usr/bin/env python3
"""Offline regression tests for the NFL weather refresh/parser."""

import importlib.util
import json
import unittest
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("refresh_nfl_weather", ROOT / "scripts" / "refresh-nfl-weather.py")
weather = importlib.util.module_from_spec(spec)
spec.loader.exec_module(weather)


FIXTURE = """
<html><head><title>MySportsWeather NFL Weather</title></head><body>
<a class="cheat-card" href="#match-chi-sea"><span class="cheat-card__date">11/2</span></a>
<a class="cheat-card" href="#match-jax-bal"><span class="cheat-card__date">11/5</span></a>
<article class="mlb-game-block" id="match-chi-sea">
  <div class="game-summary">
    <div class="game-summary__cell"><span class="game-summary__primary-value">51°</span><span class="game-summary__primary-label">At kickoff</span></div>
    <div class="game-summary__cell"><span class="game-summary__primary-value">2%</span><span class="game-summary__primary-label">Rain</span></div>
    <div class="game-summary__cell"><span class="game-summary__primary-value">1 mph</span><span class="game-summary__primary-label">Wind</span></div>
  </div>
  <table class="hourly__table">
    <thead><tr><th></th><th class="hourly__hour-col"><svg class="wx-icon wx-icon--sun"></svg><div class="hourly__time">7 PM</div></th><th class="hourly__hour-col is-game-hour"><svg class="wx-icon wx-icon--partly"></svg><div class="hourly__time">8 PM</div></th><th class="hourly__hour-col is-game-hour"><svg class="wx-icon wx-icon--rain"></svg><div class="hourly__time">9 PM</div></th></tr></thead>
    <tbody>
      <tr><td class="hourly__label">Precip</td><td class="hourly__cell">1%</td><td class="hourly__cell">2%</td><td class="hourly__cell">3%</td></tr>
      <tr><td class="hourly__label">Temp</td><td class="hourly__cell">52°</td><td class="hourly__cell">51°</td><td class="hourly__cell">49°</td></tr>
      <tr><td class="hourly__label">Wind</td><td class="hourly__cell">1 mph</td><td class="hourly__cell">1 mph</td><td class="hourly__cell">2 mph</td></tr>
      <tr><td class="hourly__label">Gusts</td><td class="hourly__cell">2 mph</td><td class="hourly__cell">3 mph</td><td class="hourly__cell">4 mph</td></tr>
      <tr><td class="hourly__label">Wind dir</td><td class="hourly__cell">W</td><td class="hourly__cell">S</td><td class="hourly__cell">SE</td></tr>
    </tbody>
  </table>
  <table class="hourly__table"><thead><tr><th></th><th class="hourly__hour-col is-game-hour">8 PM</th></tr></thead><tbody><tr><td class="hourly__label">Temp</td><td class="hourly__cell">50°</td></tr></tbody></table>
</article>
<article class="mlb-game-block" id="match-jax-bal">
  <div class="game-summary">
    <div class="game-summary__cell"><span class="game-summary__primary-value">17 mph</span><span class="game-summary__primary-label">Wind</span></div>
  </div>
</article>
</body></html>
"""


def game(game_id, kickoff, away, home, indoor=False):
    return {
        "id": game_id, "date": kickoff, "status": {"type": {"completed": False}},
        "competitions": [{
            "venue": {"fullName": "Test Stadium", "indoor": indoor, "address": {"city": "Seattle", "state": "WA"}},
            "competitors": [
                {"homeAway": "away", "team": {"abbreviation": away, "displayName": away, "logo": ""}},
                {"homeAway": "home", "team": {"abbreviation": home, "displayName": home, "logo": ""}},
            ],
        }],
    }


class TestWeather(unittest.TestCase):
    def test_source_summary_and_hourly(self):
        forecasts = weather.parse_forecasts(FIXTURE)
        self.assertEqual(len(forecasts), 2)
        chi = forecasts[("CHI", "SEA", 11, 2)]
        self.assertEqual((chi["tempF"], chi["precipPct"], chi["windMph"], chi["gustMph"]), (51, 2, 1, 3))
        self.assertEqual(chi["hourly"][0]["time"], "7 PM")
        self.assertEqual(chi["hourly"][1]["windDirection"], "S")
        self.assertTrue(chi["hourly"][1]["inGame"])
        self.assertEqual([hour.get("sky") for hour in chi["hourly"]], ["sun", "partly", "rain"])
        self.assertEqual(chi["nbmHourly"][0]["tempF"], 50)
        self.assertNotIn("sky", chi["nbmHourly"][0])

    def test_pending_and_source_link_and_timezone(self):
        forecasts = weather.parse_forecasts(FIXTURE)
        schedule = [{"week": {"number": 9}, "events": [
            game("1", "2026-11-03T01:15:00Z", "CHI", "SEA"),
            game("2", "2026-11-06T01:15:00Z", "JAC", "BAL"),
            game("3", "2026-11-09T01:15:00Z", "NYG", "PHI"),
            game("4", "2026-11-01T01:15:00Z", "NE", "MIA"),
        ]}]
        result = weather.parse_schedule(schedule, forecasts, datetime(2026, 11, 2, 20, tzinfo=timezone.utc))
        self.assertEqual([item["id"] for item in result], ["1", "2", "3"])
        self.assertEqual(result[0]["forecast"]["sourceUrl"], "https://mysportsweather.com/nfl/2026-11-02/chi-sea")
        self.assertEqual(result[1]["away"]["abbr"], "JAX")
        self.assertEqual(result[1]["forecast"]["windMph"], 17)
        self.assertIsNone(result[2]["forecast"])

    def test_published_snapshot(self):
        content = json.loads((ROOT / "weather" / "data" / "nfl.json").read_text(encoding="utf-8"))
        self.assertEqual(content["weatherSource"], "https://mysportsweather.com/nfl")
        self.assertGreater(len(content["games"]), 0)
        for item in content["games"]:
            self.assertTrue(item["away"]["abbr"] and item["home"]["abbr"])
            if item["forecast"]:
                self.assertTrue(item["forecast"]["sourceUrl"].startswith("https://mysportsweather.com/nfl/"))
                self.assertTrue(item["forecast"]["hourly"])


if __name__ == "__main__":
    unittest.main()
