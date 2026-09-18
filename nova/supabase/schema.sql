-- NOVA Supabase schema + Row Level Security
-- Run this in the Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text,
  date date,
  time text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  title text not null,
  scheduled_for timestamptz not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists tasks_user_date_idx on public.tasks (user_id, date);
create index if not exists reminders_user_scheduled_idx on public.reminders (user_id, scheduled_for);

alter table public.users enable row level security;
alter table public.tasks enable row level security;
alter table public.reminders enable row level security;

drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

drop policy if exists "Users manage own tasks" on public.tasks;
create policy "Users manage own tasks"
  on public.tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own reminders" on public.reminders;
create policy "Users manage own reminders"
  on public.reminders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', null))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute procedure public.set_updated_at();

-- Gmail OAuth tokens for morning inbox digest (server writes via service role)
create table if not exists public.email_connections (
  user_id uuid primary key references public.users (id) on delete cascade,
  provider text not null default 'gmail' check (provider in ('gmail', 'gmail_imap')),
  email text not null,
  access_token text not null,
  refresh_token text not null,
  expiry_date bigint,
  updated_at timestamptz not null default now()
);

alter table public.email_connections enable row level security;

-- Users can see connection status (not tokens) via a view if needed later.
-- Tokens are only accessed by the AI server with the service role key.
drop policy if exists "Users can read own email connection meta" on public.email_connections;
create policy "Users can read own email connection meta"
  on public.email_connections for select
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own email connection" on public.email_connections;
create policy "Users can delete own email connection"
  on public.email_connections for delete
  using (auth.uid() = user_id);
