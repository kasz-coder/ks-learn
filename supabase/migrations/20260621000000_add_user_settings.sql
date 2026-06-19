create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'English',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.user_settings enable row level security;

create policy "Users can view own settings" on public.user_settings
  for select using (auth.uid() = user_id);
create policy "Users can insert own settings" on public.user_settings
  for insert with check (auth.uid() = user_id);
create policy "Users can update own settings" on public.user_settings
  for update using (auth.uid() = user_id);
