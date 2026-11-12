-- AIインタビュー広場: 議題（interview_topics）と、インタビュー設定・論点分析の議題対応
--
-- 設計:
--   docs/20261112_2009_AIインタビュー広場_機能設計.md §3・§7
--   docs/20261112_2150_AIインタビュー広場_インタビュー対象の抽象化.md（D2）
--
--   1. interview_topics を作る（状態と日時の整合・作成者の写し・取り下げを CHECK で守り、
--      状態の逆戻りとオープン後の写しの書き換えをトリガーで止める）
--   2. interview_configs を議案か議題のどちらか一方に紐づける
--   3. topic_analysis_versions を議案か議題のどちらか一方に紐づける
--   4. interview_topics の変更を監査ログに残す
--
-- 列名は topic_id ではなく interview_topic_id とする。
-- 論点分析ではすでに「topic」を論点（topic_analysis_topics）の意味で使っており、
-- topic_analysis_classifications.topic_id もそちらを指しているため。

-- ---------------------------------------------------------------------------
-- 1. 議題
-- ---------------------------------------------------------------------------
create table public.interview_topics (
  id uuid primary key default gen_random_uuid(),
  -- アカウントを削除しても議題とレポートは残す（K7）。表示には下の写しを使う
  author_user_id uuid references public.admin_profiles(user_id) on delete set null,
  title text not null,
  body_md text not null default '',
  status text not null default 'draft',
  opened_at timestamptz,
  closes_at timestamptz,
  closed_at timestamptz,
  closed_reason text,
  -- オープン時点の作成者の写し（K7）。ロール変更・会派の改称・アカウント削除の後も当時のまま表示する
  author_display_name text,
  author_role text,
  author_faction_name text,
  -- 運営者による取り下げ（P11）
  withdrawn_at timestamptz,
  withdrawn_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint interview_topics_status_check
    check (status in ('draft', 'open', 'closed')),
  constraint interview_topics_closed_reason_check
    check (closed_reason in ('manual', 'expired')),
  constraint interview_topics_title_not_blank
    check (btrim(title) <> ''),

  -- 状態と日時の整合
  --   draft : オープン・クローズの日時を持たない
  --   open  : opened_at と closes_at を持ち、クローズの日時は持たない
  --   closed: 上に加えて closed_at と closed_reason を持つ
  constraint interview_topics_status_timestamps check (
    (
      status = 'draft'
      and opened_at is null
      and closes_at is null
      and closed_at is null
      and closed_reason is null
    )
    or (
      status = 'open'
      and opened_at is not null
      and closes_at is not null
      and closed_at is null
      and closed_reason is null
    )
    or (
      status = 'closed'
      and opened_at is not null
      and closes_at is not null
      and closed_at is not null
      and closed_reason is not null
    )
  ),
  constraint interview_topics_closes_after_open
    check (closes_at is null or closes_at > opened_at),
  constraint interview_topics_closed_after_open
    check (closed_at is null or closed_at >= opened_at),
  -- 期限切れの自動クローズは、期限より前には起きない
  constraint interview_topics_expired_after_deadline
    check (closed_reason is distinct from 'expired' or closed_at >= closes_at),

  -- 公開した議題（open / closed）は本文と作成者の写しを必ず持つ
  constraint interview_topics_published_requires_body
    check (status = 'draft' or btrim(body_md) <> ''),
  constraint interview_topics_published_requires_author_snapshot check (
    status = 'draft'
    or (author_display_name is not null and author_role is not null)
  ),
  -- 写しの表示名は空にしない（アカウント削除後はこれしか表示できないため）
  constraint interview_topics_author_display_name_not_blank check (
    author_display_name is null or btrim(author_display_name) <> ''
  ),
  -- 写しのロールと会派は admin_profiles と同じ規則（議員は会派あり、候補者は会派なし）
  constraint interview_topics_author_snapshot_role check (
    author_role is null
    or (author_role = 'legislator' and author_faction_name is not null)
    or (author_role = 'candidate' and author_faction_name is null)
  ),

  -- 取り下げは日時と理由をそろえて持つ。下書きは公開していないので取り下げの対象にしない
  constraint interview_topics_withdrawal_pair check (
    (withdrawn_at is null and withdrawn_reason is null)
    or (
      withdrawn_at is not null
      and withdrawn_reason is not null
      and btrim(withdrawn_reason) <> ''
    )
  ),
  constraint interview_topics_withdrawal_not_draft
    check (withdrawn_at is null or status <> 'draft')
);

alter table public.interview_topics enable row level security;

-- オープン状態の議題は1人1つ（アプリ層の判定に加えて DB でも保証する）
create unique index interview_topics_one_open_per_author
  on public.interview_topics (author_user_id)
  where status = 'open';

-- 管理画面の一覧（状態別・新しい順、K5）と「自分の議題」
create index interview_topics_status_created_at_idx
  on public.interview_topics (status, created_at desc);
create index interview_topics_author_created_at_idx
  on public.interview_topics (author_user_id, created_at desc);
-- 自動クローズ（P9）でオープン中の期限切れを探す
create index interview_topics_open_closes_at_idx
  on public.interview_topics (closes_at)
  where status = 'open';

create trigger update_interview_topics_updated_at
  before update on public.interview_topics
  for each row execute function public.update_updated_at_column();

-- 状態の遷移と、オープン後に変えてはいけない列を守る。
-- CHECK 制約は1行の中の整合しか見られないので、更新前後を比べるところはトリガーで行う
create function public.guard_interview_topic_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- 状態は 下書き → オープン → クローズ の順にしか進めない（機能設計 §3。再オープンもしない）
  if new.status is distinct from old.status
    and not (
      (old.status = 'draft' and new.status = 'open')
      or (old.status = 'open' and new.status = 'closed')
    ) then
    raise exception '議題の状態は % から % に変えられません', old.status, new.status
      using errcode = 'check_violation';
  end if;

  -- オープン後は、オープン日時・期限・作成者の写しを変えない（K7: オープン時点のまま表示する）
  if old.status <> 'draft' and (
    new.opened_at is distinct from old.opened_at
    or new.closes_at is distinct from old.closes_at
    or new.author_display_name is distinct from old.author_display_name
    or new.author_role is distinct from old.author_role
    or new.author_faction_name is distinct from old.author_faction_name
  ) then
    raise exception 'オープンした議題のオープン日時・期限・作成者の写しは変えられません'
      using errcode = 'check_violation';
  end if;

  -- クローズ後は、クローズ日時と理由を変えない
  if old.status = 'closed' and (
    new.closed_at is distinct from old.closed_at
    or new.closed_reason is distinct from old.closed_reason
  ) then
    raise exception 'クローズした議題のクローズ日時と理由は変えられません'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.guard_interview_topic_update() is
  '議題の状態を下書き→オープン→クローズの順にしか進めず、オープン後の日時と作成者の写しを固定するトリガー関数';

create trigger interview_topics_guard_update
  before update on public.interview_topics
  for each row execute function public.guard_interview_topic_update();

comment on table public.interview_topics is
  'AIインタビュー広場の議題（議員・候補者が出す問い。議案には紐づかない）';
comment on column public.interview_topics.author_user_id is
  '作成者のユーザーID（アカウント削除後は null。表示には author_* の写しを使う）';
comment on column public.interview_topics.title is '議題のタイトル';
comment on column public.interview_topics.body_md is '議題の本文（Markdown）';
comment on column public.interview_topics.status is
  '状態(draft:下書き / open:オープン / closed:クローズ)。逆方向には戻れない';
comment on column public.interview_topics.opened_at is 'オープンした日時';
comment on column public.interview_topics.closes_at is
  '自動クローズの期限（オープン日時 + 設定値の日数）';
comment on column public.interview_topics.closed_at is 'クローズした日時';
comment on column public.interview_topics.closed_reason is
  'クローズの理由(manual:作成者がクローズ / expired:期限切れで自動クローズ)';
comment on column public.interview_topics.author_display_name is
  'オープン時点の作成者の表示名（写し）';
comment on column public.interview_topics.author_role is
  'オープン時点の作成者のロール（写し。legislator:議員 / candidate:候補者）';
comment on column public.interview_topics.author_faction_name is
  'オープン時点の作成者の会派名（写し。候補者は null）';
comment on column public.interview_topics.withdrawn_at is
  '運営者が取り下げた日時（null は取り下げていない）';
comment on column public.interview_topics.withdrawn_reason is
  '運営者が取り下げた理由';

-- ---------------------------------------------------------------------------
-- 2. インタビュー設定を議案か議題のどちらか一方に紐づける
-- ---------------------------------------------------------------------------
alter table public.interview_configs
  alter column bill_id drop not null,
  add column interview_topic_id uuid
    references public.interview_topics(id) on delete cascade,
  add constraint interview_configs_subject_exactly_one
    check (num_nonnulls(bill_id, interview_topic_id) = 1);

-- 議題のインタビュー設定は1つだけ（議案のように複数の設定を切り替えない）
create unique index idx_interview_configs_interview_topic_id
  on public.interview_configs (interview_topic_id)
  where interview_topic_id is not null;

comment on table public.interview_configs is
  '議案または議題ごとのインタビュー設定を管理するテーブル';
comment on column public.interview_configs.bill_id is
  '対象議案ID（議案の設定のとき。複数設定可、ただしpublicは1つのみ）';
comment on column public.interview_configs.interview_topic_id is
  '対象議題ID（議題の設定のとき。議題ごとに1つ。受付可否は議題の status で判定し、この表の status は使わない）';

-- ---------------------------------------------------------------------------
-- 3. 論点分析を議案か議題のどちらか一方に紐づける
-- ---------------------------------------------------------------------------
alter table public.topic_analysis_versions
  alter column bill_id drop not null,
  add column interview_topic_id uuid
    references public.interview_topics(id) on delete cascade,
  add constraint topic_analysis_versions_subject_exactly_one
    check (num_nonnulls(bill_id, interview_topic_id) = 1),
  -- 既存の UNIQUE (bill_id, version) は bill_id が null の行に効かないので、議題の側にも張る
  add constraint topic_analysis_versions_interview_topic_id_version_key
    unique (interview_topic_id, version);

comment on table public.topic_analysis_versions is
  'トピック解析のバージョン管理（議案または議題ごと）';
comment on column public.topic_analysis_versions.bill_id is
  '対象議案ID（議案の分析のとき）';
comment on column public.topic_analysis_versions.interview_topic_id is
  '対象議題ID（議題の分析のとき）';
comment on column public.topic_analysis_versions.version is
  'バージョン番号（議案・議題ごとにインクリメント）';

-- ---------------------------------------------------------------------------
-- 4. 監査ログ
-- ---------------------------------------------------------------------------
create trigger interview_topics_audit_log
  after insert or update or delete on public.interview_topics
  for each row execute function public.record_admin_audit_log();

comment on function public.record_admin_audit_log() is
  '議案・議案コンテンツ・会派見解・付託委員会・管理画面のアカウント・議題の変更を admin_audit_logs に記録するトリガー関数';
comment on table public.admin_audit_logs is
  '管理画面からの変更履歴（議案・議案コンテンツ・会派見解・付託委員会・管理画面のアカウント・議題）';
