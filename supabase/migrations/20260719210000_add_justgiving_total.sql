alter table public.settings
  add column if not exists justgiving_total_raised numeric(10, 2);
