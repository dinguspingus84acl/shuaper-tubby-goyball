# SHUA Analytics Studio

Nine interactive dashboards based on the approved dark-neon visual concepts. These are HTML/SVG components, not screenshots containing sample numbers.

## Entry points

Open **Analytics** in desktop navigation or the phone menu. **Schedule** remains 2026-only and includes every published ROS QB/RB/WR/TE plus all 32 NFL D/ST units. It supports one-row QB/RB/WR/TE/D/ST filters, press-and-drag selection on mobile, and searchable player suggestions that jump directly to a highlighted row. The player's **Strength of Schedule** item opens the relevant Schedule position. Other Analytics views retain their own seasons.

**2026 opponent matchup grades are official ESPN full-PPR positional ratings**, fetched from a publicly readable ESPN league whose scoring settings are validated as 1 point/reception and 4 points/passing TD (ESPN league 456278). We save a validated ESPN API snapshot under `analytics/espn-matchups-2026.json` and refresh it every six hours. All QB/RB/WR/TE/DST matchups in Schedule, the Matchups view, Start/Sit and the 2026 Game Logs use that same ESPN source. If ESPN data cannot be read, we leave the scores unrated instead of quietly substituting calculated ranks. ESPN OPRK ranks **1 = hardest, 32 = easiest**, which is the numbering shown in cells. Green shows easier matchups; red shows tougher. The Game Log's points-scored highlights stay separate. Archived Game Logs are not labeled with unavailable current ESPN opponent grades.

## Data and definitions

- 2026: ESPN actual full-PPR player game statistics, 4-point passing touchdowns, regular season only; 2024/2025 remain explicitly labelled historical archives.
- Schedules: ESPN pro-team weekly schedules.
- Snaps: PFR snap counts distributed by nflverse, joined by player and week.
- Red-zone opportunities: carries plus targets on non-nullified plays inside the 20. Inside-10 touches: carries plus completed receptions. Kneeldowns are excluded.
- Injury cohorts: explicit weekly **Out** reports from nflverse. Missing stats alone never establish injury. Manually selected absent weeks are clearly labelled a scenario. With/without comparisons report sample sizes and are descriptive, not guaranteed redistribution or a diagnosis.
- Matchups: 2026 uses ESPN full-PPR position-specific opponent rank data for QB, RB, WR, TE and D/ST. ESPN OPRK 1 = toughest / 32 = easiest. The saved source is linked and timestamped. Byes are not ranked opponents. Older archive-season advanced comparison charts use observed local statistics only when explicitly labeled.
- Trend averages require complete 3- or 5-appearance windows. Nulls do not become zero, negative fantasy scores are retained, and consistency thresholds are independent rates (not stacked parts of a whole).
- Start/sit reference estimate: mean of the last 3 appearances adjusted by 20% of opponent/league PPR-allowed difference, capped at plus/minus 15%. Not an ESPN projection or calibrated confidence. Custom rankings remain a separate unchanged factor.
- Route participation is not inferred from snap percentage. Unsupported metrics display **Not reported**, never invented mockup values. Dates and coverage are visible in the source footer.

## Refresh and recovery

`Refresh analytics data` runs every six hours, on custom-ranking changes, or through GitHub Actions' **Run workflow**. It validates both ESPN positional opponent rankings and season source data, retains the last verified snapshot if an ESPN feed fails, commits only analytics data, and requests a Pages rebuild. It uses the repository token; no paid API keys or new accounts are required. A refresh failure leaves the last verified timestamp visible.

For a full local rebuild: `python scripts/refresh-analytics-studio.py` in a full Git checkout. The source builder reads existing historical archives; do not replace unavailable current-season data with an older year under a current-year label.

## Verification

`node tests/analytics-core.cjs` exercises core calculations. `python tests/studio-real-site.py` opens the actual checked-out site in Playwright Chromium and WebKit at 1440px and 390px widths, runs all nine views, checks selectors, chart legends/tooltips, profile open/close, phone menu, existing tabs, root overflow and JavaScript errors. Browser artifacts include full-page screenshots and a JSON report. WebKit testing is not a physical iPhone Safari browser-chrome test.

## Scope

Studio styling is scoped to the analytics section and its profile components. Existing iPhone viewport/safe-area/full-bleed rules are unchanged. The only existing enhancement function touched is a guard that prevents the legacy profile-nav decorator from dereferencing buttons owned by the unified profile navigation.

### Official ESPN D/ST ratings

D/ST matchup cells now use ESPN's actual position 16 points-against ranks, **not** the earlier turnover-only proxy. The public league must pass the full-PPR settings check, and the API response must contain exactly 32 teams for each position before it can replace an existing verified snapshot.