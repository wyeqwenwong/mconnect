-- ============================================================
-- Meta Connect & Convert — Supabase (Postgres) schema
-- Apply in the Supabase SQL editor. Backs the Vercel API in api/.
-- ============================================================

-- Single-row game configuration -----------------------------------------
create table if not exists settings (
  id                        int primary key default 1,
  mode                      text not null default 'match',  -- 'quiz' | 'match'
  questions_per_game        int  not null default 5,
  speed_bonus               bool not null default true,
  speedrun_bonus            int  not null default 50,
  per_question_score_display bool not null default true,
  randomize                 bool not null default true,
  sound                     bool not null default true,
  updated_at                timestamptz not null default now(),
  constraint settings_singleton check (id = 1)
);
insert into settings (id) values (1) on conflict (id) do nothing;

-- Question pool ----------------------------------------------------------
create table if not exists questions (
  id          text primary key,
  kind        text not null default 'quiz',  -- 'quiz' | 'match'
  points      int  not null default 100,
  active      bool not null default true,
  -- quiz fields
  text        text,
  explanation text,
  multi       bool not null default false,
  icon        text,
  choices     jsonb not null default '[]'::jsonb,   -- [{ id, label, emoji, correct }]
  -- match fields
  prompt      text,
  types       jsonb not null default '[]'::jsonb,    -- [{ id, icon, label }]
  answers     jsonb not null default '[]'::jsonb,    -- [{ id, text, typeId|null }]
  created_at  timestamptz not null default now()
);

-- Submitted scores -------------------------------------------------------
create table if not exists scores (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  total            int  not null,
  perfect_speedrun bool not null default false,
  panel_id         text,
  breakdown        jsonb,
  created_at       timestamptz not null default now()
);
create index if not exists scores_total_idx on scores (total desc, created_at asc);

-- Panel heartbeats -------------------------------------------------------
create table if not exists panels (
  panel_id  text primary key,
  last_seen timestamptz not null default now()
);

-- Realtime: enable for scores so kiosks get live leaderboard pushes.
-- (Supabase dashboard → Database → Replication → add `scores`, or:)
-- alter publication supabase_realtime add table scores;

-- Row Level Security -----------------------------------------------------
-- Public (anon) clients may READ settings/questions/leaderboard and INSERT
-- scores + heartbeats. All admin WRITES go through the service-role key in the
-- Vercel API (bypasses RLS), so no public write policy is exposed for them.
alter table settings  enable row level security;
alter table questions enable row level security;
alter table scores    enable row level security;
alter table panels    enable row level security;

create policy "read settings"  on settings  for select using (true);
-- All questions are readable (content, not secrets); the client draws only the
-- active ones of the current mode. This lets the admin console list inactive ones too.
create policy "read questions" on questions for select using (true);
create policy "read scores"    on scores    for select using (true);
create policy "insert scores"  on scores    for insert with check (true);
create policy "upsert panels_r" on panels   for select using (true);
create policy "upsert panels_i" on panels   for insert with check (true);
create policy "upsert panels_u" on panels   for update using (true);
