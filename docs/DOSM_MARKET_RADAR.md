# DOSM market radar integration

The local individual radar uses a prepared snapshot built from the two DOSM Q2 2026 workbooks. JMI online-ad counts and Employment Statistics survey measures are kept as separate views and units.

## Local view and API

The prepared snapshot is available behind the explicitly configured endpoint
`GET /api/v1/market/radar`; the data file is
`backend/data/dosm_market_q2_2026.json`. The checked-in local tasks and
deployment defaults leave it disabled pending source review. For a local
review session, set `DOSM_MARKET_RADAR_ENABLED=1` on the backend and
`VITE_DOSM_MARKET_RADAR_ENABLED=true` on the frontend, then open
`http://127.0.0.1:5174/individual/radar`. The frontend flag selects the DOSM
view; it never changes the recommendation Snapshot ID.

The current snapshot defaults to Q2 2026 and supports the JMI quarterly series from Q3 2019 through Q2 2026. The quarter selector shows occupation groups, industries, or employment context for the selected quarter. Comparisons are calculated by SyncEra against the preceding quarter and the same quarter one year earlier. A missing source value remains unavailable; it is not changed to zero.

The occupation view highlights the largest groups by ad volume and the fastest-growing group among the five largest. Share-of-ads values use JMI's published total. Industry highlights exclude `Unclassified` from the named-sector ranking and show its share separately. Each JMI signal carries the source workbook ID and row number so a future position-matching adapter can preserve evidence lineage.

The API is disabled unless `DOSM_MARKET_RADAR_ENABLED=1` is set. The DOSM
major-group snapshot is kept separate from the role-level matching snapshot;
it must not be sent as `snapshot_id` to `/api/v1/recommendations`.

## Refreshing the prepared snapshot

The build script reads `QES_QUARTER` from the Employment Statistics workbook and quarter columns from `e2-Summary Table BI` in the JMI workbook. It validates the Q2 2026 totals and writes the normalized JSON asset without modifying either workbook.

```sh
cd /path/to/SyncEra/backend
.venv/bin/python -m pip install -r requirements-data.txt
.venv/bin/python scripts/build_dosm_market_radar.py
```

By default the script reads both files from `~/Downloads`. Override their locations when needed:

```sh
.venv/bin/python scripts/build_dosm_market_radar.py \
  --employment "/path/to/Employment Statistics, Q2 2026.xlsx" \
  --jmi "/path/to/Data JMI Q2 2026.xlsx" \
  --output data/dosm_market_q2_2026.json
```

After DOSM publishes a newer release, update the source period and the import validation before replacing the prepared snapshot.

## What the radar means

- **Occupation groups and industries:** counts of online job offerings advertised, not confirmed hires or unique vacancies. Bubble area represents the reported ad count. `Unclassified` is kept when reported.
- **Employment and skill levels:** jobs, filled jobs, vacancies and jobs created from QES. Values are in thousands. Skilled, semi-skilled and low-skilled are broad occupational tiers, not named competencies such as Python or SQL.
- **Refresh cadence:** the included files are Q2 2026 snapshots. The radar is interactive locally, but it does not poll DOSM or update automatically.
- **Scope:** this source release does not provide a full time series for named careers or skill mentions. A detailed occupation/skills radar needs an additional validated occupation-to-skill dataset.
- **CV matching readiness:** the API exposes `matching_readiness` and identifies `confirmed_profile.skills` as the candidate input. It currently marks evidence-based matching as not ready because this workbook only supplies major occupation groups and counts, without named positions or required skills. Do not make an LLM produce an individual fit score from these group counts.

## Attribution and reuse

The interface names and links the DOSM releases and DOSM terms of use. DOSM permits copying, adaptation and combining portal data subject to attribution and its terms. The product attribution reads: “Data source: Department of Statistics Malaysia. Derived and visualized by SyncEra; DOSM does not endorse this application or its analysis.”
