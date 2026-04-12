begin;

alter table public.daily_statuses
add column if not exists original_note text,
add column if not exists family_note text;

update public.daily_statuses
set original_note = coalesce(original_note, note)
where original_note is null
  and note is not null;

commit;
