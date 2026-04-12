begin;

alter table public.monthly_summaries
add column if not exists monthly_individual_note text;

update public.monthly_summaries
set monthly_individual_note = coalesce(monthly_individual_note, social_message)
where monthly_individual_note is null
  and social_message is not null;

create table if not exists public.monthly_common_notes (
  id uuid primary key default gen_random_uuid(),
  month_key text not null unique,
  monthly_common_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists monthly_common_notes_set_updated_at on public.monthly_common_notes;
create trigger monthly_common_notes_set_updated_at
before update on public.monthly_common_notes
for each row
execute function public.set_updated_at();

alter table public.monthly_common_notes enable row level security;

drop policy if exists "monthly common notes readable by authenticated" on public.monthly_common_notes;
create policy "monthly common notes readable by authenticated"
on public.monthly_common_notes
for select
to authenticated
using (true);

commit;
