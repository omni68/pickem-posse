# Pick'em Posse

A mobile-first Material UI site for exploring a templated Google Sheets pick'em workbook. Navigation mirrors the workbook tabs, and the bottom-right menu provides direct access to every sheet.

## Architecture

GitHub Actions downloads the publicly shared workbook during deployment, normalizes it into `public/data/workbook.json`, and publishes that JSON with the static React site. The browser does not call Google Sheets directly. Week views supplement pending workbook games with display-only live scores from ESPN.

```text
Google Sheet → GitHub Actions importer → normalized JSON → React build → GitHub Pages
ESPN scoreboards → browser-side matchup finder → pending game cards
```

The checked-in JSON is a development snapshot generated from the supplied 2026 workbook. Scheduled deployments replace it with current Google Sheets data.

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

The importer downloads the public `.xlsx` export, validates the resulting contract, and writes the normalized data to `public/data/workbook.json`.

## Live scores

Pending games are matched against the public ESPN NFL and college-football scoreboards using the away team, home team, and Central-time kickoff. Team aliases come from ESPN's own location, name, display name, short name, and abbreviation fields; the app does not maintain a manual team-name map.

Only a unique, high-confidence matchup is selected automatically. If multiple games are plausible, the week view asks the viewer to choose one and remembers that choice in the current browser. Live scores never change spreadsheet-based picks, payouts, winners, jackpots, or standings. ESPN's scoreboard feed is public and requires no credential, but it is not a documented service contract, so its integration is isolated behind a replaceable adapter.
