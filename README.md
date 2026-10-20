# Pick'em Posse

A mobile-first Material UI site for exploring a templated Google Sheets pick'em workbook. Navigation mirrors the workbook tabs, and the bottom-right menu provides direct access to every sheet.

## Architecture

GitHub Actions downloads the publicly shared workbook during deployment, normalizes it into `public/data/workbook.json`, and publishes that JSON with the static React site. On every page load, the browser checks Google Sheets' public revision marker. It reuses a matching normalized copy from local browser storage or downloads and normalizes the latest public `.xlsx` export when the revision changed. Week views supplement pending workbook games with display-only live scores from ESPN.

```text
Google Sheet revision → browser cache check → cached JSON or fresh public XLSX → React app
Google Sheet → GitHub Actions importer → bundled JSON fallback → GitHub Pages
ESPN scoreboards → browser-side matchup finder → pending game cards
```

The checked-in JSON is a development and first-visit snapshot. Scheduled deployments replace it with current Google Sheets data, while the browser-side revision check keeps the running app current between deployments.

## Local development

```bash
npm ci
npm start
```

Useful checks:

```bash
npm run test:parser
npm run test:ci
npm run build
```

## GitHub configuration

Add repository variable `GOOGLE_SHEET_URL` containing the full source spreadsheet URL before enabling the Pages workflow. The workbook must be shared as **Anyone with the link → Viewer**. No Google credential or GitHub Actions secret is required.

Set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. The workflow runs for changes to `site`, manual dispatches, and every 30 minutes. A failed import or test prevents a broken deployment from replacing the last successful site.

## Workbook conventions

- Navigation follows worksheet order and updates automatically when tabs are added, removed, renamed, or reordered.
- `Scoreboard` becomes the standings and player-ledger view.
- `Weekly Earnings` becomes the season leaderboard and player drill-down.
- `Week N` and recognized postseason names become game, pick, payout, and jackpot views.
- Other worksheets use the responsive fallback grid.
- Weekly bettor sections are discovered from repeating `Away`, `Home`, and `Payout` headers, so the bettor count is not hard-coded.

## Data refresh

Run a public import locally with:

```bash
GOOGLE_SHEET_URL='https://docs.google.com/spreadsheets/d/…/edit' \
npm run data:import
```

The importer downloads a stable public `.xlsx` export, validates the resulting contract, and writes the normalized data to `public/data/workbook.json`. It also writes the lightweight `public/data/workbook-meta.json` revision manifest used during startup.

Google's anonymous public export does not provide a standard `Last-Modified` or `ETag` header. The app therefore uses the sheet's public monotonic revision number as the freshness value. If that check is ever unavailable, startup bypasses the browser cache and downloads the workbook rather than silently showing stale data.

## Live scores

Pending games are matched against the public ESPN NFL and college-football scoreboards using the away team, home team, and Central-time kickoff. Team aliases come from ESPN's own location, name, display name, short name, and abbreviation fields; the app does not maintain a manual team-name map.

Only a unique, high-confidence matchup is selected automatically. If multiple games are plausible, the week view asks the viewer to choose one and remembers that choice in the current browser. Live scores never change spreadsheet-based picks, payouts, winners, jackpots, or standings. ESPN's scoreboard feed is public and requires no credential, but it is not a documented service contract, so its integration is isolated behind a replaceable adapter.
