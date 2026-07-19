# Charity Swim Tracker

A small Next.js + Supabase site for tracking Karen and Elaine's English Channel charity swim challenge.

## Features

- Public progress page at `/`
- Hidden update form at `/update-xyz123`
- Supabase-backed swim log
- JustGiving total fetched through `/api/justgiving`
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

1. Create a new Supabase project.
2. In the Supabase SQL editor, run the migration in `supabase/migrations/20260719195000_init_charity_swim.sql`.
3. Insert a single row into `public.settings`, for example:

```sql
insert into public.settings (start_date, target_miles, target_money, justgiving_page_slug)
values ('2026-07-01', 22, 220, 'karen-elaine-22-miles');
```

4. Copy the project URL and anon key into your environment variables.
5. If you prefer, you can set `JUSTGIVING_PAGE_SLUG=karen-elaine-22-miles` instead of storing the slug in `public.settings`.

## Local development

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Deploying to Vercel

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Add the same environment variables from `.env.local` in the Vercel project settings.
4. Deploy.

## Update form URL

The hidden update form lives at:

```text
/update-xyz123
```

It is intentionally not linked from the public page and is excluded from indexing.
