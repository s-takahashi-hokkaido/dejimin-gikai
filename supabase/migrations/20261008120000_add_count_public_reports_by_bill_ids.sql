-- 議案ごとの公開レポート件数をまとめて数える関数
--
-- 議案一覧（/bills）では議案ごとに回答数バッジを出し、「声が集まっている順」で
-- 並べる。議案数ぶんの count クエリを並べると一覧の表示で百回以上叩くことになり、
-- 公開レポートを JS 側で全件取得して数えると PostgREST の max_rows(1000) で
-- 打ち切られて件数を過小評価する。1クエリで済むよう DB 側で集約する。
--
-- 公開の定義は countPublicReportsByBillId と同じ（管理者公開 × ユーザー公開）。
-- interview_report.interview_session_id は UNIQUE で join が行を増やさないため、
-- count(*) はレポート件数と一致する。
--
-- 本家（team-mirai/mirai-gikai）の 20260819100000_add_count_public_reports_by_bill_ids.sql
-- を移植したもの。権限は北海道版の方針（service_role のみ実行可）に合わせている。
create or replace function public.count_public_reports_by_bill_ids(p_bill_ids uuid[])
returns table (
  bill_id uuid,
  report_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.bill_id,
    count(*) as report_count
  from interview_report r
  join interview_sessions s on s.id = r.interview_session_id
  join interview_configs c on c.id = s.interview_config_id
  where c.bill_id = any(p_bill_ids)
    and r.is_public_by_admin
    and r.is_public_by_user
  group by c.bill_id;
$$;

comment on function public.count_public_reports_by_bill_ids(uuid[]) is
  '議案ごとの公開レポート件数（管理者公開 × ユーザー公開）をまとめて返す。議案一覧の回答数バッジ用。';

-- 関数権限: service_role のみ実行可（get_ai_usage_cost_usd と同じ方針）
revoke execute on function public.count_public_reports_by_bill_ids(uuid[]) from public;
revoke execute on function public.count_public_reports_by_bill_ids(uuid[]) from anon;
revoke execute on function public.count_public_reports_by_bill_ids(uuid[]) from authenticated;
grant execute on function public.count_public_reports_by_bill_ids(uuid[]) to service_role;
