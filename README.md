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

## Step 1: choose a form password

`FORM_PASSWORD` is not issued by anyone — you invent it. It is simply the password that Karen and Elaine will type into `/form` before saving a swim.

1. Pick a password you are happy to share with both swimmers. Anything memorable but not guessable works, for example three random words.
2. Write it down somewhere safe. There is no "forgot password" flow — if it is lost, set a new value in Vercel and redeploy.
3. You will paste this value into Vercel in step 3 below.

## Step 2: create the GitHub token

`DATA_GITHUB_TOKEN` lets the site commit new swims to `data/swim-log.json` on your behalf. It never reaches the browser.

1. Sign in to GitHub and open [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new). (The long way round: click your avatar → **Settings** → scroll to **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.)
2. **Token name**: `charity-swim-writer`, or anything you will recognise later.
3. **Expiration**: pick a date after the challenge ends. When it expires the form stops saving, so set a reminder to replace it.
4. **Resource owner**: your own account, `JamieMBright`.
5. **Repository access**: choose **Only select repositories**, then pick `charity-swim`. Do not choose "All repositories".
6. **Repository permissions**: find **Contents** in the list and set it to **Read and write**. Leave everything else on **No access**. (**Metadata: Read-only** switches itself on automatically — that is expected.)
7. Click **Generate token**.
8. Copy the token now — it starts with `github_pat_` and GitHub will never show it again. Paste it straight into Vercel in step 3; do not commit it, email it, or put it in a file in this repository.

## Step 3: add both values to Vercel

1. Go to [vercel.com](https://vercel.com) and open your `charity-swim` project.
2. Open the **Settings** tab, then **Environment Variables** in the left menu.
3. Add the first variable:
   - **Key**: `FORM_PASSWORD`
   - **Value**: the password from step 1
   - **Environments**: tick **Production**, **Preview**, and **Development**
   - Click **Save**.
4. Add the second variable the same way:
   - **Key**: `DATA_GITHUB_TOKEN`
   - **Value**: the `github_pat_...` token from step 2
   - **Environments**: tick all three
   - Click **Save**.
5. If any `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` variables are still listed, delete them — they are no longer used.
6. Environment variables only apply to new builds, so trigger a redeploy: open the **Deployments** tab, click the **...** menu on the newest deployment, and choose **Redeploy**.
7. Once the redeploy finishes, open `/form`, enter the password, and save a test swim. A commit named "Log karen's swim on ..." should appear in the repository within a few seconds.

If the form says "Saving is not configured on this deployment", one of the two variables is missing or the redeploy has not finished.

## Do I need any other secrets?

No. The JustGiving scraper runs inside GitHub Actions and uses the built-in `GITHUB_TOKEN`, which GitHub provides automatically, so there is nothing to add there. The old `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` repository secrets are unused and can be deleted from **Settings** → **Secrets and variables** → **Actions**.

## Local development

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Deploying to Vercel for the first time

1. Push the repository to GitHub.
2. Go to [vercel.com](https://vercel.com) and choose **Add New Project**.
3. Import this GitHub repository.
4. When Vercel asks for environment variables, add `FORM_PASSWORD` and `DATA_GITHUB_TOKEN` as described above. Add `DATA_REPO` and `DATA_BRANCH` only if this is a fork or a non-`main` branch.
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
   - the public page moves the swimmer icons using the converted mile totals a few minutes later
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
