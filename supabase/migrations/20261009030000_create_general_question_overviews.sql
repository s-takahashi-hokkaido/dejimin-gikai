-- 定例会ごとの一般質問（札幌市では代表質問）の「3行まとめ」を保存するテーブル
--
-- - lines: 定例会全体の「どんな話があった？」3行
-- - theme_lines: テーマ（カテゴリラベル）ごとの3行。{ "子育て・教育": ["…","…","…"], … }
--
-- 本文は AI が下書きし、ユーザーの確認を取ってから登録する（update-general-questions スキル）。
-- council_sessions と 1:1。福岡市版（mirai-gikai-fukuoka-city #87・#89）の同名テーブルに合わせている。
create table if not exists general_question_overviews (
  council_session_id uuid primary key references council_sessions(id) on delete cascade,
  lines text[] not null default '{}',
  theme_lines jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS は有効にし、ポリシーは定義しない（アクセスは Service Role 経由）
alter table general_question_overviews enable row level security;

comment on table general_question_overviews is '定例会ごとの一般質問（代表質問）の3行まとめ。本文は AI の下書きをユーザーが確認してから登録する';
comment on column general_question_overviews.lines is '定例会全体の「どんな話があった？」3行。未作成なら空配列';
comment on column general_question_overviews.theme_lines is 'テーマ（カテゴリラベル）ごとの3行。{ "子育て・教育": ["…","…","…"] } の形';
