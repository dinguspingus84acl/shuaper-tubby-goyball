# SHUA Analytics Studio

Nine interactive dashboards based on the approved dark-neon visual concepts. These are HTML/SVG components, not screenshots containing sample numbers.

## Entry points

Open **Analytics** in the desktop navigation or phone hamburger. The Studio has matchup difficulty, player trends, advanced opportunity, consistency, team opportunity, injury impact, schedule heatmap, start/sit, and weekly performance screens. Player cards open the existing profile; **Back to Analytics** closes only that profile. Overview includes expandable performance analytics. Depth Charts links to the selected team's opportunity breakdown.

## Data and definitions

- 2026: ESPN actual full-PPR player game statistics, 4-point passing touchdowns, regular season only; 2024/2025 remain explicitly labelled historical archives.
- Schedules: ESPN pro-team weekly schedules.
- Snaps: PFR snap counts distributed by nflverse, joined by player and week.
- Red-zone opportunities: carries plus targets on non-nullified plays inside the 20. Inside-10 touches: carries plus completed receptions. Kneeldowns are excluded.
- Injury cohorts: explicit weekly **Out** reports from nflverse. Missing stats alone never establish injury. Manually selected absent weeks are clearly labelled a scenario. With/without comparisons report sample sizes and are descriptive, not guaranteed redistribution or a diagnosis.
- Matchups: position PPR allowed per defensive game, using only observations before the selected week. Rank 1 is easiest (most PPR allowed); byes are not zero-valued opponents. Schedule colors represent these ranks, not home/away.
- Trend averages require complete 3- or 5-appearance windows. Nulls do not become zero, negative fantasy scores are retained, and consistency thresholds are independent rates (not stacked parts of a whole).
- Start/sit reference estimate: mean of the last 3 appearances adjusted by 20% of opponent/league PPR-allowed difference, capped at plus/minus 15%. Not an ESPN projection or calibrated confidence. Custom rankings remain a separate unchanged factor.
- Route participation is not inferred from snap percentage. Unsupported metrics display **Not reported**, never invented mockup values. Dates and coverage are visible in the source footer.

## Refresh and recovery

`Refresh analytics data` runs every six hours, on custom-ranking changes, or through GitHub Actions' **Run workflow**. It validates the new data, retains the previous season file when a feed fails or returns substantially fewer games, commits only analytics data, and explicitly requests a Pages rebuild. It uses the repository token; no paid API keys or new accounts are required. A refresh failure leaves the last verified timestamp visible.

For a full local rebuild: `python scripts/refresh-analytics-studio.py` in a full Git checkout. The source builder reads existing historical archives; do not replace unavailable current-season data with an older year under a current-year label.

## Verification

`node tests/analytics-core.cjs` exercises core calculations. `python tests/studio-real-site.py` opens the actual checked-out site in Playwright Chromium and WebKit at 1440px and 390px widths, runs all nine views, checks selectors, chart legends/tooltips, profile open/close, phone menu, existing tabs, root overflow and JavaScript errors. Browser artifacts include full-page screenshots and a JSON report. WebKit testing is not a physical iPhone Safari browser-chrome test.

## Scope

Studio styling is scoped to the analytics section and its profile components. Existing iPhone viewport/safe-area/full-bleed rules are unchanged. The only existing enhancement function touched is a guard that prevents the legacy profile-nav decorator from dereferencing buttons owned by the unified profile navigation.
