create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('nurse', 'social_worker', 'supervisor')),
  created_at timestamptz not null default now()
);

create table if not exists public.residents (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  room_no text,
  gender text,
  birth_date date,
  family_contact text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_statuses (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references public.residents(id) on delete cascade,
  record_date date not null,
  status_type text not null check (status_type in ('normal', 'unwell', 'hospital')),
  note text,
  original_note text,
  family_note text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (resident_id, record_date)
);

create table if not exists public.monthly_summaries (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references public.residents(id) on delete cascade,
  month_key text not null,
  nurse_summary text,
  social_message text,
  monthly_individual_note text,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (resident_id, month_key)
);

create table if not exists public.monthly_common_notes (
  id uuid primary key default gen_random_uuid(),
  month_key text not null unique,
  monthly_common_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists residents_set_updated_at on public.residents;
create trigger residents_set_updated_at
before update on public.residents
for each row
execute function public.set_updated_at();

drop trigger if exists monthly_summaries_set_updated_at on public.monthly_summaries;
create trigger monthly_summaries_set_updated_at
before update on public.monthly_summaries
for each row
execute function public.set_updated_at();

drop trigger if exists monthly_common_notes_set_updated_at on public.monthly_common_notes;
create trigger monthly_common_notes_set_updated_at
before update on public.monthly_common_notes
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.residents enable row level security;
alter table public.daily_statuses enable row level security;
alter table public.monthly_summaries enable row level security;
alter table public.monthly_common_notes enable row level security;

create policy "profiles readable by authenticated" on public.profiles for select to authenticated using (true);
create policy "residents readable by authenticated" on public.residents for select to authenticated using (true);
create policy "daily statuses readable by authenticated" on public.daily_statuses for select to authenticated using (true);
create policy "monthly summaries readable by authenticated" on public.monthly_summaries for select to authenticated using (true);
create policy "monthly common notes readable by authenticated" on public.monthly_common_notes for select to authenticated using (true);
