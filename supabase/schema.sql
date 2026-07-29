-- =====================================================================
-- Task & Learning-Goal planner  —  Postgres / Supabase schema  (v2)
--
-- Design principle: the system NEVER blocks you, it FLAGS you.
-- Overlaps and over-budget days are allowed and surfaced as flags so
-- you can reschedule them yourself.
--
-- Timezone: Asia/Karachi (PKT). `day` is a local calendar date.
-- Run once in the Supabase SQL editor.
-- =====================================================================

create type item_kind   as enum ('task', 'goal');
create type item_status as enum ('unfinished', 'ongoing', 'completed');

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------

-- "Today" in Pakistan Standard Time, never in UTC.
create or replace function public.today_pkt() returns date
language sql stable as $$
  select (now() at time zone 'Asia/Karachi')::date;
$$;

-- 2026-07-27  ->  'Monday, 27th July, 2026'
create or replace function public.fmt_day(d date) returns text
language sql immutable as $$
  select to_char(d, 'FMDay, FMDDth FMMonth, YYYY');
$$;

-- ---------------------------------------------------------------------
-- Per-user settings
-- ---------------------------------------------------------------------
create table public.settings (
  user_id              uuid primary key default auth.uid()
                       references auth.users(id) on delete cascade,
  timezone             text     not null default 'Asia/Karachi',
  daily_budget_minutes smallint not null default 300      -- 5 hours
                       check (daily_budget_minutes between 0 and 1440),
  week_starts_on       smallint not null default 1 check (week_starts_on between 0 and 6),
  created_at           timestamptz not null default now()
);

-- Give every new account a settings row automatically.
create or replace function public.init_settings()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.settings(user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.init_settings();

-- ---------------------------------------------------------------------
-- Storage: one physical table, two logical tables (views) on top.
-- Nothing in the app ever touches public.items directly.
-- ---------------------------------------------------------------------
create table public.items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid()
                   references auth.users(id) on delete cascade,

  kind             item_kind   not null,
  title            text        not null,
  notes            text,

  day              date        not null default public.today_pkt(),
  start_minute     smallint,                      -- 0..1439, optional
  duration_minutes smallint,                      -- required for goals

  status           item_status not null default 'unfinished',
  sort_order       double precision not null default 0,   -- fractional index

  completed_at     timestamptz,
  deleted_at       timestamptz,                   -- soft delete => undo
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- half-open minute block [start, start+duration), used for overlap flags
  block int4range generated always as (
    case when start_minute is not null and duration_minutes is not null
         then int4range(start_minute, start_minute + duration_minutes)
    end
  ) stored,

  constraint title_len
    check (char_length(btrim(title)) between 1 and 200),

  constraint start_minute_range
    check (start_minute is null or start_minute between 0 and 1439),

  -- a learning goal is by definition a minute block; a task's is optional
  constraint goal_requires_duration
    check (kind <> 'goal'
           or (duration_minutes is not null and duration_minutes between 1 and 1440)),

  constraint task_duration_sane
    check (kind <> 'task'
           or duration_minutes is null
           or duration_minutes between 1 and 1440),

  constraint block_fits_in_day
    check (start_minute is null or duration_minutes is null
           or start_minute + duration_minutes <= 1440),

  constraint completed_at_consistent
    check ((status = 'completed') = (completed_at is not null))
);

create index items_day_idx
  on public.items (user_id, day) where deleted_at is null;
create index items_section_idx
  on public.items (user_id, kind, status, day) where deleted_at is null;
create index items_block_idx
  on public.items using gist (block) where deleted_at is null;
create index items_trash_idx
  on public.items (user_id, deleted_at) where deleted_at is not null;

-- ---------------------------------------------------------------------
-- Bookkeeping trigger. No capacity or overlap trigger by design:
-- both are advisory flags, not hard rules.
-- ---------------------------------------------------------------------
create or replace function public.touch_item()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();

  if new.status = 'completed'
     and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status <> 'completed' then
    new.completed_at := null;
  end if;

  return new;
end $$;

create trigger items_touch
before insert or update on public.items
for each row execute function public.touch_item();

-- ---------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------
alter table public.items    enable row level security;
alter table public.settings enable row level security;

create policy items_owner on public.items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy settings_owner on public.settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =====================================================================
-- WRITE SURFACE: two separate tables, one per section.
-- supabase.from('tasks')  /  supabase.from('goals')
-- Auto-updatable views: insert / update / delete work normally.
-- =====================================================================
create view public.tasks with (security_invoker = true) as
  select id, user_id, kind, title, notes, day, start_minute, duration_minutes,
         status, sort_order, completed_at, created_at, updated_at
    from public.items
   where kind = 'task' and deleted_at is null
  with check option;

alter view public.tasks alter column kind set default 'task'::item_kind;

create view public.goals with (security_invoker = true) as
  select id, user_id, kind, title, notes, day, start_minute, duration_minutes,
         status, sort_order, completed_at, created_at, updated_at
    from public.items
   where kind = 'goal' and deleted_at is null
  with check option;

alter view public.goals alter column kind set default 'goal'::item_kind;

-- =====================================================================
-- READ SURFACE: same rows enriched with the three highlight flags.
-- =====================================================================
create view public.items_board with (security_invoker = true) as
  select i.id, i.user_id, i.kind, i.title, i.notes,
         i.day, public.fmt_day(i.day) as day_label,
         i.start_minute, i.duration_minutes, i.block,
         i.status, i.sort_order, i.completed_at, i.created_at, i.updated_at,

         -- unfinished and the day has passed -> highlight, user reschedules
         (i.status <> 'completed' and i.day < public.today_pkt()) as is_overdue,

         -- shares minutes with something else on the same day (either kind)
         coalesce(array_length(o.ids, 1), 0) > 0 as is_overlapped,
         coalesce(o.ids,    '{}'::uuid[]) as overlaps_with_ids,
         coalesce(o.titles, '{}'::text[]) as overlaps_with_titles
    from public.items i
    left join lateral (
         select array_agg(j.id    order by j.start_minute) as ids,
                array_agg(j.title order by j.start_minute) as titles
           from public.items j
          where j.user_id = i.user_id
            and j.day     = i.day
            and j.id     <> i.id
            and j.deleted_at is null
            and i.block is not null
            and j.block is not null
            and j.block && i.block
    ) o on true
   where i.deleted_at is null;

create view public.tasks_board with (security_invoker = true) as
  select * from public.items_board where kind = 'task';

create view public.goals_board with (security_invoker = true) as
  select * from public.items_board where kind = 'goal';

-- Shared calendar feed: both kinds, one query, flags included.
-- Filter client-side on `kind` for the tasks-only / goals-only toggle.
create view public.calendar with (security_invoker = true) as
  select * from public.items_board;

-- Per-day load against the 300-minute budget.
create view public.daily_load with (security_invoker = true) as
  select i.user_id,
         i.day,
         public.fmt_day(i.day) as day_label,
         coalesce(sum(i.duration_minutes), 0)::int as minutes_allotted,
         coalesce(sum(i.duration_minutes) filter (where i.kind = 'goal'), 0)::int as goal_minutes,
         coalesce(sum(i.duration_minutes) filter (where i.kind = 'task'), 0)::int as task_minutes,
         s.daily_budget_minutes,
         (coalesce(sum(i.duration_minutes), 0) > s.daily_budget_minutes) as over_budget,
         count(*) filter (where i.status = 'unfinished')::int as unfinished_count,
         count(*) filter (where i.status = 'ongoing')::int    as ongoing_count,
         count(*) filter (where i.status = 'completed')::int  as completed_count
    from public.items i
    join public.settings s on s.user_id = i.user_id
   where i.deleted_at is null
   group by i.user_id, i.day, s.daily_budget_minutes;

-- =====================================================================
-- Operations
-- =====================================================================

-- Reschedule one item to another day (optionally to another time slot).
create or replace function public.move_item(
  p_id           uuid,
  p_day          date,
  p_start_minute smallint default null
) returns public.items language sql as $$
  update public.items
     set day          = p_day,
         start_minute = coalesce(p_start_minute, start_minute)
   where id = p_id and deleted_at is null
  returning *;
$$;

-- Bulk reschedule: sweep a set of highlighted overdue/overlapped items
-- to a chosen day in one action.
create or replace function public.move_items(p_ids uuid[], p_day date)
returns integer language sql as $$
  with moved as (
    update public.items set day = p_day
     where id = any(p_ids) and deleted_at is null
    returning 1
  ) select count(*)::int from moved;
$$;

-- Soft delete + undo
create or replace function public.trash_item(p_id uuid)
returns void language sql as $$
  update public.items set deleted_at = now() where id = p_id;
$$;

create or replace function public.restore_item(p_id uuid)
returns void language sql as $$
  update public.items set deleted_at = null where id = p_id;
$$;

-- Permanently drop anything trashed more than 30 days ago.
create or replace function public.purge_trash()
returns integer language sql as $$
  with gone as (
    delete from public.items
     where deleted_at is not null and deleted_at < now() - interval '30 days'
    returning 1
  ) select count(*)::int from gone;
$$;
