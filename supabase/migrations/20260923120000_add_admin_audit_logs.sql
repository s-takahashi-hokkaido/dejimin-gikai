-- 管理画面からの変更履歴（監査ログ）
--
-- 目的は不正の検出よりも疑念の防止。議員に議案コンテンツ・議案マスタ・会派見解の
-- 編集権を渡すため、「誰が・いつ・何を・どう変えたか」を後から検証できるようにする。
-- 設計: docs/20260912_1736_管理画面ロール権限設計.md §5-2
--
-- 記録はアプリではなくトリガーで行う:
--   - 書き込み経路（手動編集・AI情報収集・マージ・複製・カスケード削除など）を
--     1つずつ直さなくても漏れなく記録できる。新しい書き込み経路を足しても記録漏れにならない
--   - 変更と記録が同じトランザクションに入るので、片方だけ残ることがない
--
-- 実行者（actor）は admin アプリが PostgREST へのリクエストヘッダ x-audit-actor に
-- base64(JSON) で載せ、トリガーが request.headers から読む。
-- ヘッダが無い書き込み（seed・SQL での直接操作・スキルによる取り込みなど）は actor を null で記録する。
--
-- 保持期間は無期限（削除処理を作らない）。1GB を超えたら方針を見直す。
-- RLS は有効化するがポリシーは定義しない（Service Role 経由のみ）
create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  -- actor は FK を張らずスナップショットで持つ（ユーザー削除・ロール変更後も当時のまま残す）
  actor_user_id uuid,
  actor_email text,
  actor_role text,
  actor_faction_id uuid,
  action text not null,
  target_table text not null,
  target_id uuid,
  before_data jsonb,
  after_data jsonb,
  -- 議案単位で履歴を引くための列。bills は自身の ID、bill_contents・faction_stances は bill_id
  bill_id uuid generated always as (
    case
      when target_table = 'bills' then target_id
      else coalesce(after_data ->> 'bill_id', before_data ->> 'bill_id')::uuid
    end
  ) stored,
  created_at timestamptz not null default now(),

  -- actor は「全部ある」か「全部無い（直接操作）」のどちらか
  constraint admin_audit_logs_actor_consistent check (
    (actor_user_id is null and actor_email is null and actor_role is null)
    or (actor_user_id is not null and actor_email is not null and actor_role is not null)
  )
);

alter table public.admin_audit_logs enable row level security;

create index admin_audit_logs_created_at_idx on public.admin_audit_logs (created_at desc);
create index admin_audit_logs_target_idx on public.admin_audit_logs (target_table, target_id);
create index admin_audit_logs_actor_idx on public.admin_audit_logs (actor_user_id);
create index admin_audit_logs_bill_id_idx on public.admin_audit_logs (bill_id, created_at desc);

comment on table public.admin_audit_logs is '管理画面からの変更履歴（議案・議案コンテンツ・会派見解）';
comment on column public.admin_audit_logs.actor_user_id is '実行者のユーザーID（null は SQL・スクリプトによる直接操作）';
comment on column public.admin_audit_logs.actor_email is '実行時点の実行者メールアドレス';
comment on column public.admin_audit_logs.actor_role is '実行時点の実行者ロール';
comment on column public.admin_audit_logs.actor_faction_id is '実行時点の実行者の所属会派ID';
comment on column public.admin_audit_logs.action is '操作（例: bills.update, faction_stances.delete）';
comment on column public.admin_audit_logs.target_table is '対象テーブル';
comment on column public.admin_audit_logs.target_id is '対象行のID';
comment on column public.admin_audit_logs.before_data is '変更前の行（作成時は null）';
comment on column public.admin_audit_logs.after_data is '変更後の行（削除時は null）';
comment on column public.admin_audit_logs.bill_id is '関連する議案ID（生成列。議案単位の絞り込み用）';

create or replace function public.record_admin_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  headers jsonb;
  actor_header text;
  actor jsonb;
  before_row jsonb;
  after_row jsonb;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    before_row := to_jsonb(old);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    after_row := to_jsonb(new);
  end if;

  -- updated_at だけが変わった更新（内容の変わらない保存）は記録しない
  if tg_op = 'UPDATE'
    and (before_row - 'updated_at') = (after_row - 'updated_at') then
    return null;
  end if;

  -- PostgREST 経由でなければ request.headers は未設定（直接操作）
  headers := nullif(current_setting('request.headers', true), '')::jsonb;
  actor_header := headers ->> 'x-audit-actor';
  if actor_header is not null then
    actor := convert_from(decode(actor_header, 'base64'), 'UTF8')::jsonb;
  end if;

  insert into public.admin_audit_logs (
    actor_user_id,
    actor_email,
    actor_role,
    actor_faction_id,
    action,
    target_table,
    target_id,
    before_data,
    after_data
  ) values (
    (actor ->> 'id')::uuid,
    actor ->> 'email',
    actor ->> 'role',
    (actor ->> 'factionId')::uuid,
    tg_table_name || '.' || lower(tg_op),
    tg_table_name,
    coalesce(after_row ->> 'id', before_row ->> 'id')::uuid,
    before_row,
    after_row
  );

  return null;
end;
$$;

comment on function public.record_admin_audit_log() is '議案・議案コンテンツ・会派見解の変更を admin_audit_logs に記録するトリガー関数';

create trigger bills_audit_log
  after insert or update or delete on public.bills
  for each row execute function public.record_admin_audit_log();

create trigger bill_contents_audit_log
  after insert or update or delete on public.bill_contents
  for each row execute function public.record_admin_audit_log();

create trigger faction_stances_audit_log
  after insert or update or delete on public.faction_stances
  for each row execute function public.record_admin_audit_log();
