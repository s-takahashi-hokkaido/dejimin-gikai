-- 議案の付託委員会を複数持てるようにする
--
-- 札幌市議会では1つの議案が複数の委員会に付託される（分割付託）。
--   - 一般会計の補正予算: 所管の常任委員会6つに分割付託
--   - 各会計の決算: 第一部決算特別委員会・第二部決算特別委員会の両方に付託
-- bills.committee_id は1つしか持てないため、中間テーブル bill_committees に移す。
--
-- RLS は有効化するがポリシーは定義しない（Service Role 経由のみ）

create table public.bill_committees (
  bill_id uuid not null references public.bills(id) on delete cascade,
  -- 議案が付託されている委員会は削除させない（管理画面の委員会削除でもエラーにする）
  committee_id uuid not null references public.committees(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (bill_id, committee_id)
);

alter table public.bill_committees enable row level security;

create index bill_committees_committee_id_idx on public.bill_committees (committee_id);

comment on table public.bill_committees is '議案の付託委員会（1議案に複数の委員会を付託できる）';
comment on column public.bill_committees.bill_id is '議案ID';
comment on column public.bill_committees.committee_id is '委員会ID';
comment on column public.bill_committees.created_at is '作成日時';

-- 既存の付託先を移す
insert into public.bill_committees (bill_id, committee_id)
select id, committee_id
from public.bills
where committee_id is not null;

drop index if exists public.idx_bills_committee_id;
alter table public.bills drop column committee_id;

-- 議案の付託委員会をまとめて置き換える（削除と追加を1トランザクションで行う）
create or replace function public.replace_bill_committees(
  p_bill_id uuid,
  p_committee_ids uuid[]
) returns void
language sql
as $$
  delete from public.bill_committees
  where bill_id = p_bill_id
    and committee_id <> all (coalesce(p_committee_ids, '{}'));

  insert into public.bill_committees (bill_id, committee_id)
  select p_bill_id, c
  from unnest(coalesce(p_committee_ids, '{}')) as c
  on conflict (bill_id, committee_id) do nothing;
$$;

comment on function public.replace_bill_committees(uuid, uuid[]) is '議案の付託委員会を指定した委員会の集合に置き換える';

-- 管理画面（Service Role）からのみ呼ぶ
revoke execute on function public.replace_bill_committees(uuid, uuid[]) from public;
revoke execute on function public.replace_bill_committees(uuid, uuid[]) from anon;
revoke execute on function public.replace_bill_committees(uuid, uuid[]) from authenticated;
grant execute on function public.replace_bill_committees(uuid, uuid[]) to service_role;

-- 予算特別委員会・決算特別委員会も special で扱うため、種別の説明を直す
comment on column public.committees.committee_type is '委員会種別（standing: 常任, parliamentary: 議会運営, special: 特別委員会〈調査・予算・決算〉）';

-- 付託委員会の変更も監査ログに残す（以前は bills.committee_id の更新として記録されていた）。
-- bill_committees には id 列が無いので target_id は null になるが、bill_id は after_data / before_data から引ける
create trigger bill_committees_audit_log
  after insert or update or delete on public.bill_committees
  for each row execute function public.record_admin_audit_log();

comment on table public.admin_audit_logs is '管理画面からの変更履歴（議案・議案コンテンツ・会派見解・付託委員会）';
comment on function public.record_admin_audit_log() is '議案・議案コンテンツ・会派見解・付託委員会の変更を admin_audit_logs に記録するトリガー関数';
