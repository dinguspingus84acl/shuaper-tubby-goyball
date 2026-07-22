# Immediate free-data deployment

No API keys or credentials are needed.

## Get today's available data into the site

1. Upload/replace these files in the repository.
2. Go to **Settings → Actions → General → Workflow permissions**.
3. Select **Read and write permissions** and save.
4. Go to **Actions → Load Today's Free NFL Data → Run workflow**.
5. Wait about 1–3 minutes and refresh the site.

The workflow imports:
- Current Sleeper teams, roster statuses, injury labels, and 72-hour adds/drops.
- The latest completed-season player production from nflverse.

Because it is July 2026, there are no 2026 regular-season game statistics yet. The production component will use the latest published completed season, while Sleeper roster/status/trend fields are current.

Formats included:
- Standard (default)
- Half PPR
- Full PPR
