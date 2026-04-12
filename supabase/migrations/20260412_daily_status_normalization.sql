begin;

update public.daily_statuses
set status_type = 'unwell'
where status_type = 'poor';

alter table public.daily_statuses
drop constraint if exists daily_statuses_status_type_check;

alter table public.daily_statuses
add constraint daily_statuses_status_type_check
check (status_type in ('normal', 'unwell', 'hospital'));

commit;
