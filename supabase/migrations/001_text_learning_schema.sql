-- 001_text_learning_schema.sql
-- Initial schema for Momentum OS — text-based language learning.

-- ─── Languages ───────────────────────────────────────────────────────────────
create table if not exists languages (
  id                uuid primary key default uuid_generate_v4(),
  name              text not null,
  code              text not null unique,
  romanisation_label text not null default 'Romanisation'
);

insert into languages (name, code, romanisation_label) values
  ('Mandarin Chinese', 'zh-CN', 'Pinyin'),
  ('Cantonese',        'yue',   'Jyutping'),
  ('Japanese',         'ja',    'Romaji'),
  ('Korean',           'ko',    'Revised Romanisation'),
  ('French',           'fr',    'Latin'),
  ('Spanish',          'es',    'Latin'),
  ('Polish',           'pl',    'Latin'),
  ('Arabic',           'ar',    'Transliteration')
on conflict (code) do nothing;

-- ─── Texts ──────────────────────────────────────────────────────────────────
create table if not exists texts (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  language_id  uuid not null references languages(id),
  title        text not null,
  content      text not null,
  processed_at timestamptz,
  created_at   timestamptz default now()
);

alter table texts enable row level security;
create policy "Users manage own texts" on texts
  for all using (auth.uid() = user_id);

-- ─── Vocabulary items (global per language) ──────────────────────────────────
create table if not exists vocabulary_items (
  id               uuid primary key default uuid_generate_v4(),
  language_id      uuid not null references languages(id),
  original         text not null,
  romanisation     text not null,
  translation      text not null,
  example_sentence text not null,
  frequency_rank   integer,        -- 1 = most common; null = unknown
  created_at       timestamptz default now(),
  unique (language_id, original)
);

alter table vocabulary_items enable row level security;
-- All authenticated users may read vocabulary items
create policy "Authenticated users read vocab" on vocabulary_items
  for select using (auth.role() = 'authenticated');
-- Service role inserts/updates via API routes
create policy "Service role manages vocab" on vocabulary_items
  for all using (auth.role() = 'service_role');

-- ─── Text–Vocabulary junction ────────────────────────────────────────────────
create table if not exists text_vocabulary (
  text_id            uuid not null references texts(id) on delete cascade,
  vocabulary_item_id uuid not null references vocabulary_items(id) on delete cascade,
  occurrences        integer not null default 1,
  primary key (text_id, vocabulary_item_id)
);

alter table text_vocabulary enable row level security;
create policy "Users read own text vocab" on text_vocabulary
  for select using (
    exists (
      select 1 from texts
      where texts.id = text_vocabulary.text_id
        and texts.user_id = auth.uid()
    )
  );
create policy "Service role manages text vocab" on text_vocabulary
  for all using (auth.role() = 'service_role');

-- ─── Sentences ───────────────────────────────────────────────────────────────
create table if not exists sentences (
  id         uuid primary key default uuid_generate_v4(),
  text_id    uuid not null references texts(id) on delete cascade,
  content    text not null,
  word_count integer not null default 0,
  unique (text_id, content)
);

alter table sentences enable row level security;
create policy "Users read sentences from own texts" on sentences
  for select using (
    exists (
      select 1 from texts
      where texts.id = sentences.text_id
        and texts.user_id = auth.uid()
    )
  );
create policy "Service role manages sentences" on sentences
  for all using (auth.role() = 'service_role');

-- ─── User word progress (SRS) ────────────────────────────────────────────────
create table if not exists user_word_progress (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  vocabulary_item_id uuid not null references vocabulary_items(id) on delete cascade,
  status             text not null default 'new'
                       check (status in ('new', 'learning', 'known')),
  ease_factor        float not null default 2.5,
  interval_days      integer not null default 0,
  next_review_at     timestamptz,
  times_seen         integer not null default 0,
  last_seen_at       timestamptz,
  unique (user_id, vocabulary_item_id)
);

alter table user_word_progress enable row level security;
create policy "Users manage own progress" on user_word_progress
  for all using (auth.uid() = user_id);
