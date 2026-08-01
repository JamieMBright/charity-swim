# Charity Swim Tracker

A small Next.js site for tracking Karen and Elaine's English Channel charity swim challenge. There is no database: the data lives in JSON files committed to this repository.

## Features

- Public progress page at `/`
- Hidden update form at `/form`, protected by a password
- Swim log stored in `data/swim-log.json`
- Settings and the scraped JustGiving total stored in `data/settings.json`
- JustGiving total served through `/api/justgiving`
- Update entries capture swimmer, date, metres/lengths, and pool length, then convert to miles
- Ready for Vercel deployment

## Data files

| File | Contents |
| --- | --- |
| `data/settings.json` | `startDate`, `targetMiles`, `targetMoney`, `justGivingPageSlug`, `justGivingTotalRaised`, `justGivingUpdatedAt` |
| `data/swim-log.json` | Array of `{ "swimmer": "karen" \| "elaine", "date": "YYYY-MM-DD", "distanceMiles": 0.31 }` |

To change the start date or the mile/money targets, edit `data/settings.json` and commit. To correct or delete a swim, edit `data/swim-log.json` directly.

The site reads these files from `raw.githubusercontent.com` with a 60 second cache and falls back to the copies bundled at build time, so committed changes appear within about a minute without waiting for a redeploy.

## Environment variables

Copy `.env.example` to `.env.local` for local development and configure:

```bash
cp .env.example .env.local
```

- `FORM_PASSWORD` - password required by the hidden update form at `/form`
- `DATA_GITHUB_TOKEN` - fine-grained GitHub token with **Contents: read and write** on this repository only. Used server-side by `/api/swim` to commit new swims; it is never sent to the browser.
- `DATA_REPO` - optional, defaults to `JamieMBright/charity-swim`
- `DATA_BRANCH` - optional, defaults to `main`
- `JUSTGIVING_PAGE_SLUG` - optional override for the slug in `data/settings.json` (`karen-elaine-22-miles`), used by the scraper workflow

## Creating the GitHub token

1. Go to **GitHub** → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**.
2. Choose **Generate new token**, and select only this repository.
3. Under **Repository permissions**, set **Contents** to **Read and write**.
4. Generate the token and store it as `DATA_GITHUB_TOKEN` in Vercel (and in `.env.local` for local use).

## Local development

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Deploying to Vercel

1. Push the repository to GitHub.
2. Go to [vercel.com](https://vercel.com) and choose **Add New Project**.
3. Import this GitHub repository.
4. When Vercel asks for environment variables, add:
   - `FORM_PASSWORD`
   - `DATA_GITHUB_TOKEN`
   - `DATA_REPO` and `DATA_BRANCH` only if this is a fork or a non-`main` branch
5. Leave the framework as **Next.js**.
6. Click **Deploy**.
7. After deploy, open the site homepage and confirm the public page loads.
8. Then open the hidden update form directly at `/form`.

## What to do after deploy

1. Visit the public homepage and confirm the swim progress page loads.
2. Visit `/form`.
3. Submit a test entry for Karen or Elaine using the form password.
4. Check that:
   - the form accepts password + date + metres/lengths + pool length
   - a commit appears in the repository updating `data/swim-log.json`
   - the public page moves the swimmer icons using the converted mile totals
5. If the money raised area shows unavailable, confirm `justGivingTotalRaised` is set in `data/settings.json`.

## Update form URL

The hidden update form lives at:

```text
/form
```

It is intentionally not linked from the public page and is excluded from indexing.

## JustGiving scraper

`.github/workflows/scrape-justgiving.yml` runs twice a day, scrapes the JustGiving page with Playwright, and commits the new total to `data/settings.json` when it changes. It uses the built-in `GITHUB_TOKEN` with `contents: write`, so no secrets are required. Set the repository variable `JUSTGIVING_PAGE_SLUG` only if the slug should differ from `data/settings.json`.

Run it manually from the **Actions** tab, or locally:

```bash
npm install playwright
npx playwright install chromium
node scripts/scrape-justgiving.mjs
```
