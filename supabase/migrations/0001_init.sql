-- Reelrole schema (HANDOVER §7.4, adapted for the static-catalogue architecture: see docs/BACKEND.md)

-- ───────────── Catalogue mirror (read-only for clients) ─────────────
create table if not exists titles (
  id bigint primary key,            -- tmdb id * 10 + (0 movie | 1 tv)
  tmdb_id int not null,
  kind text check (kind in ('movie','series')) not null,
  title text not null,
  year int,
  popularity numeric,
  updated_at timestamptz default now()
);

-- Crowd corrections only; base traits ship in the static catalogue (traits.bin).
create table if not exists trait_corrections (
  title_id bigint references titles(id) on delete cascade,
  trait text not null,
  delta numeric not null default 0,  -- capped ±0.25 by learn()
  votes int not null default 0,
  updated_at timestamptz default now(),
  primary key (title_id, trait)
);

-- ───────────── Question bank (editable live from /admin) ─────────────
create table if not exists questions (
  id text primary key,
  kind text not null,               -- binary | tri | slider | duel | mood | chips | chips-single
  prompt text not null,
  subprompt text,
  group_key text not null,
  requires jsonb,
  after_n int,
  opening int,                      -- order in the fixed opening sequence
  combine text,
  slider jsonb,
  reaction_tag text,
  active boolean not null default true,
  weight numeric not null default 1.0,   -- learned usefulness multiplier, 0.4..1.6
  variant text,                     -- A/B harness (null = everyone)
  sort int not null default 0,
  updated_at timestamptz default now()
);

create table if not exists question_options (
  question_id text references questions(id) on delete cascade,
  option_id text,
  label text not null,
  emoji text,
  swatch jsonb,
  hard jsonb,
  effects jsonb not null default '[]',   -- [{trait, op, value, strength}]
  reaction_tag text,
  sort int not null default 0,
  primary key (question_id, option_id)
);

create table if not exists app_config (key text primary key, value jsonb not null, updated_at timestamptz default now());
insert into app_config(key, value) values ('questions_version', '1') on conflict do nothing;

-- ───────────── Per-user data (owner-only) ─────────────
create table if not exists sessions (
  id uuid primary key,              -- generated on the phone
  user_id uuid not null default auth.uid(),
  mode text default 'find',
  kind_filter text,
  started_at timestamptz,
  ended_at timestamptz default now(),
  winner_title_id bigint,
  runner_up_ids bigint[],
  rejected_ids bigint[],
  questions_asked int,
  outcome text                      -- accepted | done | abandoned
);

create table if not exists session_answers (
  session_id uuid references sessions(id) on delete cascade,
  idx int,
  question_id text,
  answer_label text,
  alive_before int, alive_after int,
  ms_to_answer int,
  primary key (session_id, idx)
);

create table if not exists user_titles (
  user_id uuid not null default auth.uid(),
  title_id bigint,
  on_list boolean default false,
  liked boolean,
  watched boolean default false,
  watched_at timestamptz,
  my_rating smallint,
  not_for_me boolean default false,
  updated_at timestamptz default now(),
  primary key (user_id, title_id)
);

create table if not exists swipes (
  user_id uuid not null default auth.uid(),
  title_id bigint,
  direction text,
  created_at timestamptz,
  primary key (user_id, title_id, created_at)
);

create table if not exists user_prefs (
  user_id uuid primary key default auth.uid(),
  sound boolean, haptics boolean, reduced_motion boolean,
  taste jsonb,
  updated_at timestamptz default now()
);

-- Crowd signal: "accepted/liked a title that contradicts what they asked for" (HANDOVER §12.3)
create table if not exists trait_feedback (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid(),
  title_id bigint not null,
  trait text not null,
  delta numeric not null check (delta between -0.05 and 0.05),
  created_at timestamptz default now()
);

-- ───────────── Learning output ─────────────
create table if not exists question_stats (
  question_id text primary key,
  asked int, avg_gain numeric, dropoff numeric, median_ms int, acceptance numeric,
  slow boolean default false,
  updated_at timestamptz default now()
);

-- ───────────── Admin ─────────────
create table if not exists admin_emails (email text primary key);

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((auth.jwt() ->> 'email') in (select email from admin_emails), false)
     and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false;
$$;

-- ───────────── RLS ─────────────
alter table titles enable row level security;
alter table trait_corrections enable row level security;
alter table questions enable row level security;
alter table question_options enable row level security;
alter table app_config enable row level security;
alter table sessions enable row level security;
alter table session_answers enable row level security;
alter table user_titles enable row level security;
alter table swipes enable row level security;
alter table user_prefs enable row level security;
alter table trait_feedback enable row level security;
alter table question_stats enable row level security;
alter table admin_emails enable row level security;

create policy "read" on titles for select using (true);
create policy "read" on trait_corrections for select using (true);
create policy "read" on questions for select using (true);
create policy "read" on question_options for select using (true);
create policy "read" on app_config for select using (true);
create policy "admin write" on questions for all using (is_admin()) with check (is_admin());
create policy "admin write" on question_options for all using (is_admin()) with check (is_admin());
create policy "admin write" on app_config for all using (is_admin()) with check (is_admin());
create policy "admin read" on question_stats for select using (is_admin());
create policy "admin read" on admin_emails for select using (is_admin());

create policy "own" on sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own" on session_answers for all
  using (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()));
create policy "own" on user_titles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own" on swipes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own" on user_prefs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "insert own" on trait_feedback for insert with check (user_id = auth.uid());
create policy "admin read" on sessions for select using (is_admin());
create policy "admin read" on session_answers for select using (is_admin());

grant select on titles, trait_corrections, questions, question_options, app_config to anon, authenticated;
grant insert, update, delete on questions, question_options, app_config to authenticated;
grant select, insert, update, delete on sessions, session_answers, user_titles, swipes, user_prefs to authenticated;
grant insert on trait_feedback to authenticated;
grant select on question_stats, admin_emails to authenticated;

-- ───────────── Nightly learning (HANDOVER §12) ─────────────
create or replace function learn() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  global_gain numeric;
  changed int := 0;
begin
  -- 1. Question usefulness from the last 90 days.
  insert into question_stats (question_id, asked, avg_gain, dropoff, median_ms, acceptance, slow, updated_at)
  select a.question_id,
         count(*),
         avg(log(2, greatest(a.alive_before, 1)::numeric / greatest(a.alive_after, 1))),
         avg(case when s.outcome = 'abandoned' and a.idx = (select max(idx) from session_answers x where x.session_id = a.session_id) then 1 else 0 end),
         percentile_cont(0.5) within group (order by a.ms_to_answer)::int,
         avg(case when s.outcome = 'accepted' then 1 else 0 end),
         percentile_cont(0.5) within group (order by a.ms_to_answer) > 6000,
         now()
  from session_answers a join sessions s on s.id = a.session_id
  where s.ended_at > now() - interval '90 days'
  group by a.question_id
  on conflict (question_id) do update set
    asked = excluded.asked, avg_gain = excluded.avg_gain, dropoff = excluded.dropoff,
    median_ms = excluded.median_ms, acceptance = excluded.acceptance, slow = excluded.slow, updated_at = now();

  select avg(avg_gain) into global_gain from question_stats where asked >= 20;

  -- 2. Weights: drift toward realised gain, penalise drop-off; clamp 0.4..1.6; only with enough data.
  if global_gain is not null and global_gain > 0 then
    with t as (
      select q.id,
             least(1.6, greatest(0.4, 0.8 * q.weight + 0.2 * least(1.6, greatest(0.4, (st.avg_gain / global_gain) * (1 - 2 * st.dropoff))))) as w
      from questions q join question_stats st on st.question_id = q.id
      where st.asked >= 20
    )
    update questions q set weight = round(t.w, 3), updated_at = now()
    from t where t.id = q.id and abs(q.weight - t.w) > 0.005;
    get diagnostics changed = row_count;
  end if;

  -- 3. Crowd trait corrections, capped ±0.25 from base.
  insert into trait_corrections (title_id, trait, delta, votes, updated_at)
  select f.title_id, f.trait, least(0.25, greatest(-0.25, sum(f.delta))), count(*), now()
  from trait_feedback f
  where exists (select 1 from titles t where t.id = f.title_id)
  group by f.title_id, f.trait
  on conflict (title_id, trait) do update set delta = excluded.delta, votes = excluded.votes, updated_at = now();

  if changed > 0 then
    update app_config set value = to_jsonb((value::text)::int + 1), updated_at = now() where key = 'questions_version';
  end if;
  return jsonb_build_object('weights_changed', changed, 'global_gain', global_gain);
end $$;

create extension if not exists pg_cron;
select cron.schedule('reelrole-learn', '0 0 * * *', 'select learn();');  -- 02:00 SAST nightly
