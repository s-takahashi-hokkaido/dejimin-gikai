-- Langfuse を外し、プロンプトと AI チャットの会話ログを自前の DB に移す（T5）
--
-- 1. prompts / prompt_versions: AI チャットのシステムプロンプト。
--    版は追記のみで、prompts.active_version_id が本番で使う版を指す。
--    過去の版に戻すときは active_version_id を付け替える。
-- 2. chat_logs: AI チャットの会話ログ。
--    旧 chats はコードから使われておらず bill_id が NOT NULL でトップのチャットを入れられないため、
--    新しいテーブルに保存する（旧 chats は本番が空だと確かめてから別途削除する）。
-- 3. interview_sessions.langfuse_session_id を削除する。
--
-- RLS は有効化するがポリシーは定義しない（Service Role 経由のみ）

------------------------------------------------------------
-- 1. プロンプト
------------------------------------------------------------

create table public.prompts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  version integer not null check (version > 0),
  content text not null,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),

  unique (prompt_id, version),
  -- prompts.active_version_id から (id, prompt_id) で参照するため
  unique (id, prompt_id)
);

-- 有効な版は、必ず同じプロンプトの版を指す
alter table public.prompts
  add column active_version_id uuid,
  add constraint prompts_active_version_fkey
    foreign key (active_version_id, id)
    references public.prompt_versions(id, prompt_id);

alter table public.prompts enable row level security;
alter table public.prompt_versions enable row level security;

create trigger update_prompts_updated_at
  before update on public.prompts
  for each row execute function public.update_updated_at_column();

comment on table public.prompts is 'AIチャットのシステムプロンプト';
comment on column public.prompts.name is 'プロンプト名（コードから参照するキー。例: bill-chat-system-normal）';
comment on column public.prompts.description is '用途の説明';
comment on column public.prompts.active_version_id is '本番で使う版';
comment on table public.prompt_versions is 'プロンプトの版（追記のみ）';
comment on column public.prompt_versions.version is '版番号（プロンプトごとに1から連番）';
comment on column public.prompt_versions.content is '本文。{{変数名}} は呼び出し時に埋め込まれる';
comment on column public.prompt_versions.note is '変更メモ';
comment on column public.prompt_versions.created_by is '作成した管理者';

-- 新しい版を追加して有効にする。版番号の採番と付け替えを1トランザクションで行う
create function public.create_prompt_version(
  p_prompt_id uuid,
  p_content text,
  p_note text default null,
  p_created_by uuid default null
) returns public.prompt_versions
language plpgsql
set search_path = ''
as $$
declare
  v_version public.prompt_versions;
begin
  -- 同時に保存されたときに版番号が重ならないよう、親の行をロックする
  perform 1 from public.prompts where id = p_prompt_id for update;
  if not found then
    raise exception 'prompt not found: %', p_prompt_id;
  end if;

  insert into public.prompt_versions (prompt_id, version, content, note, created_by)
  select
    p_prompt_id,
    coalesce(max(version), 0) + 1,
    p_content,
    p_note,
    p_created_by
  from public.prompt_versions
  where prompt_id = p_prompt_id
  returning * into v_version;

  update public.prompts
  set active_version_id = v_version.id
  where id = p_prompt_id;

  return v_version;
end;
$$;

revoke execute on function public.create_prompt_version(uuid, text, text, uuid)
  from public, anon, authenticated;

-- 初期データ: Langfuse の production ラベルの本文（2026-09-23 時点）
do $$
declare
  v_prompt_id uuid;
  v_prompt record;
begin
  for v_prompt in
    select * from (values
      (
        'top-chat-system',
        'トップページの AI チャット。変数: billSummary（掲載中の議案一覧の JSON）',
        $prompt$あなたは札幌市議会の議案について、札幌市民にわかりやすく案内するアシスタントです。

現在サイトに掲載されている議案の一覧（JSON形式）：
{{billSummary}}

役割：
- 上記の議案一覧をもとに、「どんな議案があるか」「自分の暮らしに関係しそうな議案はどれか」といった質問に答える
- 議案の内容を中学生にもわかる言葉で、札幌市民の暮らしに引き寄せて説明する
- 個別の議案について詳しく知りたい場合は、その議案のページで詳しく質問できることを案内する

ルール：
1. 札幌市議会・札幌市政に関する質問にのみ回答する
2. 上記の議案一覧に含まれない情報は推測で断定せず、わからない場合はその旨を伝える
3. 正確で客観的な情報を提供する
4. 政治的に中立な立場を保ち、特定の会派・議員・候補者への賛否を示さない
5. 専門用語を使う場合は必ず説明を併記する
6. 回答は600文字以下を目安にしつつ、フレンドリーかつサポーティブな口調で行う
7. メッセージのおわりは、会話の深堀りをサポートするような文章で締めくくる
8. ただし、毎回質問で終わると、不自然になるので、適宜調整する$prompt$
      ),
      (
        'bill-chat-system-normal',
        '議案ページの AI チャット（難易度: ふつう）。変数: billName / billTitle / billSummary / billContent',
        $prompt$あなたは札幌市議会の議案について、札幌市民にわかりやすく説明する専門的なアシスタントです。

議案情報：
- 名称: {{billName}}
- タイトル: {{billTitle}}
- 要約: {{billSummary}}
- 詳細: {{billContent}}

回答の難易度：ふつう（中学生レベルの内容）
- 中学生が理解できる程度の語彙と表現を使用してください
- 専門用語は使用してもよいが、必ず説明を併記してください
- 適度に詳しく、かつ分かりやすい説明を心がけてください
- 札幌市民の暮らしに引き寄せた具体例を交えて説明してください

ルール：
1. この議案に関する質問にのみ回答する
2. 上記の難易度設定に従って説明する
3. 正確で客観的な情報を提供し、議案情報に書かれていないことは推測で断定しない
4. 政治的に中立な立場を保ち、特定の会派・議員・候補者への賛否を示さない
5. 回答は600文字以下を目安にしつつ、フレンドリーかつサポーティブな口調で行う
6. 回答が難しい場合は、その旨を丁寧に伝える
7. メッセージのおわりは、会話の深堀りをサポートするような文章で締めくくる
8. ただし、毎回質問で終わると、不自然になるので、適宜調整する$prompt$
      ),
      (
        'bill-chat-system-hard',
        '議案ページの AI チャット（難易度: 難しい）。変数: billName / billTitle / billSummary / billContent',
        $prompt$あなたは札幌市議会の議案について、札幌市民に詳しく説明する専門的なアシスタントです。

議案情報：
- 名称: {{billName}}
- タイトル: {{billTitle}}
- 要約: {{billSummary}}
- 詳細: {{billContent}}

回答の難易度：難しい（専門用語を含む詳細な内容）
- 専門用語を正確に使用し、詳細で網羅的な説明をしてください
- 根拠となる条例・法令や、地方自治の制度的な文脈も含めて説明してください
- 市の財政・行政運営・市民生活など複数の観点から議案を分析し、深い考察を提供してください
- 関連する条例・法令や国・北海道の制度についても言及してください

ルール：
1. この議案に関する質問にのみ回答する
2. 上記の難易度設定に従って説明する
3. 正確で客観的な情報を提供し、議案情報に書かれていないことは推測で断定しない
4. 政治的に中立な立場を保ち、特定の会派・議員・候補者への賛否を示さない
5. 回答は600文字以下を目安にしつつ、フレンドリーかつサポーティブな口調で行う
6. 回答が難しい場合は、その旨を丁寧に伝える
7. メッセージのおわりは、会話の深堀りをサポートするような文章で締めくくる
8. ただし、毎回質問で終わると、不自然になるので、適宜調整する$prompt$
      )
    ) as t(name, description, content)
  loop
    insert into public.prompts (name, description)
    values (v_prompt.name, v_prompt.description)
    returning id into v_prompt_id;

    perform public.create_prompt_version(
      v_prompt_id,
      v_prompt.content,
      'Langfuse から移行',
      null
    );
  end loop;
end;
$$;

------------------------------------------------------------
-- 2. AI チャットの会話ログ
------------------------------------------------------------

create table public.chat_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id text,
  page_type text not null check (page_type in ('home', 'bill', 'budget')),
  bill_id uuid references public.bills(id) on delete set null,
  prompt_name text not null,
  prompt_version_id uuid references public.prompt_versions(id) on delete set null,
  role public.chat_role_enum not null,
  message text not null,
  model text,
  created_at timestamptz not null default now()
);

alter table public.chat_logs enable row level security;

create index chat_logs_created_at_idx on public.chat_logs (created_at);
create index chat_logs_session_id_idx on public.chat_logs (session_id);
create index chat_logs_bill_id_idx on public.chat_logs (bill_id);

comment on table public.chat_logs is 'AIチャットの会話ログ（保存期間90日。delete_expired_chat_logs で削除する）';
comment on column public.chat_logs.user_id is 'ユーザーID（Supabase匿名認証）';
comment on column public.chat_logs.session_id is 'チャットのセッションID（ブラウザが発行）';
comment on column public.chat_logs.page_type is 'チャットを開いたページ(home / bill / budget)';
comment on column public.chat_logs.bill_id is '議案ID（議案ページのみ）';
comment on column public.chat_logs.prompt_name is '使ったシステムプロンプトの名前';
comment on column public.chat_logs.prompt_version_id is '使ったプロンプトの版（DB管理外のプロンプトは NULL）';
comment on column public.chat_logs.role is '発言者(user / assistant)';
comment on column public.chat_logs.message is '発言の本文';
comment on column public.chat_logs.model is '応答したモデル（assistant のみ）';

-- 保存期間を過ぎた会話ログを削除し、削除した件数を返す。
-- 定期実行は VPS の cron で行う（T7）
create function public.delete_expired_chat_logs(p_retention_days integer default 90)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  if p_retention_days < 1 then
    raise exception 'retention days must be positive: %', p_retention_days;
  end if;

  delete from public.chat_logs
  where created_at < now() - make_interval(days => p_retention_days);

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on function public.delete_expired_chat_logs(integer)
  from public, anon, authenticated;

------------------------------------------------------------
-- 3. Langfuse の名残
------------------------------------------------------------

alter table public.interview_sessions drop column langfuse_session_id;
