create table titles (
  id bigint primary key,            -- tmdb id * 10 + (0 movie | 1 tv) to avoid collisions
  tmdb_id int not null,
  kind text check (kind in ('movie','series')) not null,
  title text not null,
  original_title text,
  year int,
  overview text,
  tagline text,
  runtime_min int,                  -- movies
  seasons int, episodes int, episode_runtime_min int,  -- series
  status text,                      -- series: Ended / Returning
  certification_za text,
  genres text[],
  original_language text,
  poster_path text, backdrop_path text,
  trailer_youtube_key text,
  vote_average numeric, vote_count int, popularity numeric,
  imdb_id text, imdb_rating numeric, rt_score int,
  color text, blurhash text,
  cast_top jsonb,                   -- [{name, character, profile_path}] x6
  updated_at timestamptz default now()
);

create table title_traits (
  title_id bigint references titles(id) on delete cascade,
  trait text not null,
  value numeric not null,           -- 0..1 (bools as 0/1)
  source text default 'rules',      -- rules | enrich | crowd | manual
  confidence numeric default 0.6,
  primary key (title_id, trait)
);

create table providers (id int primary key, name text, logo_path text, display_priority int);
create table title_providers (
  title_id bigint references titles(id) on delete cascade,
  provider_id int references providers(id),
  type text check (type in ('flatrate','rent','buy','free','ads')),
  region text default 'ZA',
  primary key (title_id, provider_id, type, region)
);

create table questions (
  id text primary key,              -- e.g. 'q_scare_level'
  kind text,                        -- binary | tri | slider | duel | mood | chips
  prompt text not null,
  subprompt text,
  group_key text,                   -- for pacing / mutual exclusion
  requires jsonb,                   -- gating conditions (see §8.5)
  active boolean default true,
  weight numeric default 1.0        -- learned usefulness multiplier
);

create table question_options (
  question_id text references questions(id) on delete cascade,
  option_id text,
  label text,
  emoji text,
  effects jsonb not null,           -- [{trait, op, value, strength}]
  reaction_tag text,
  primary key (question_id, option_id)
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,                     -- supabase anon user
  mode text,                        -- find | swipe | roll
  kind_filter text,
  started_at timestamptz default now(),
  ended_at timestamptz,
  winner_title_id bigint,
  runner_up_ids bigint[],
  questions_asked int,
  outcome text                      -- accepted | rerolled | abandoned
);

create table session_answers (
  session_id uuid references sessions(id) on delete cascade,
  idx int,
  question_id text,
  option_id text,
  slider_value numeric,
  alive_before int, alive_after int,
  ms_to_answer int,
  primary key (session_id, idx)
);

create table user_titles (
  user_id uuid,
  title_id bigint references titles(id),
  on_list boolean default false,
  liked boolean,                    -- true / false (disliked) / null
  watched boolean default false,
  watched_at timestamptz,
  my_rating smallint,               -- 1..5 optional
  not_for_me boolean default false,
  updated_at timestamptz default now(),
  primary key (user_id, title_id)
);

create table swipes (
  user_id uuid, title_id bigint, direction text, -- left | right | up | down
  created_at timestamptz default now()
);

create table user_prefs (
  user_id uuid primary key,
  services int[],                   -- provider ids
  region text default 'ZA',
  sound boolean default true, haptics boolean default true, reduced_motion boolean default false,
  taste jsonb                       -- running trait vector
);

-- RLS (HANDOVER §7.4): user tables are owner-only; catalogue is read-only for anon.
alter table user_titles enable row level security;
alter table swipes enable row level security;
alter table user_prefs enable row level security;
alter table sessions enable row level security;
alter table session_answers enable row level security;

create policy "own rows" on user_titles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on swipes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on user_prefs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own answers" on session_answers for all
  using (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()));

alter table titles enable row level security;
alter table title_traits enable row level security;
alter table providers enable row level security;
alter table title_providers enable row level security;
alter table questions enable row level security;
alter table question_options enable row level security;
create policy "public read" on titles for select using (true);
create policy "public read" on title_traits for select using (true);
create policy "public read" on providers for select using (true);
create policy "public read" on title_providers for select using (true);
create policy "public read" on questions for select using (true);
create policy "public read" on question_options for select using (true);
