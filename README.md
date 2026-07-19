# Charity Swim Tracker

A small Next.js + Supabase site for tracking Karen and Elaine's English Channel charity swim challenge.

## Features

- Public progress page at `/`
- Hidden update form at `/update-xyz123`
- Supabase-backed swim log
- JustGiving total fetched through `/api/justgiving`
- Update entries capture swimmer, date, metres/lengths, and pool length, then convert to miles
- Ready for Vercel deployment

## Environment variables

Copy `.env.example` to `.env.local` for local development and configure:

```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon/public key
- `JUSTGIVING_PAGE_SLUG` - Optional override for the JustGiving page slug (`karen-elaine-22-miles`)

## Supabase setup

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In the Supabase dashboard, open **SQL Editor**.
3. Paste in the contents of `supabase/migrations/20260719195000_init_charity_swim.sql` and run it.
4. Still in **SQL Editor**, insert one settings row:

```sql
insert into public.settings (start_date, target_miles, target_money, justgiving_page_slug)
values ('2026-07-01', 22, 220, 'karen-elaine-22-miles');
```

5. In Supabase, go to **Project Settings** → **Data API**.
6. Copy:
   - **Project URL** → use as `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → use as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
7. Optional: if you would rather keep the JustGiving page slug in Vercel instead of the database row, set `JUSTGIVING_PAGE_SLUG=karen-elaine-22-miles`.

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
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `JUSTGIVING_PAGE_SLUG` = `karen-elaine-22-miles` (optional if the slug is already in `public.settings`)
5. Leave the framework as **Next.js**.
6. Click **Deploy**.
7. After deploy, open the site homepage and confirm the public page loads.
8. Then open the hidden update form directly at `/update-xyz123`.

## What to do after deploy

1. Visit the public homepage and confirm the swim progress page loads.
2. Visit `/update-xyz123`.
3. Submit a test entry for Karen or Elaine.
4. Check that:
   - the form accepts date + metres/lengths + pool length
   - the saved entry updates the total distance
   - the public page moves the swimmer icons using the converted mile totals
5. If the money raised area shows unavailable, confirm the JustGiving slug is set either in `public.settings` or in Vercel environment variables.

## Update form URL

The hidden update form lives at:

```text
/update-xyz123
```

It is intentionally not linked from the public page and is excluded from indexing.
