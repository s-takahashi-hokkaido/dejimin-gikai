-- AIインタビュー広場: 議題の作成者によるインタビュー設定の AI 生成を、サイト全体の AI 利用上限に数えない
--
-- 設計: docs/20261113_2018_AIインタビュー広場_プロンプト設計.md §3-4
--
-- 管理画面の議題のインタビュー設定の AI 生成は、作成者ごとの1日の上限を判定するために
-- chat_usage_events に prompt_name = 'interview_config_generation' で記録する。
-- サイト全体の上限（web の AI_GLOBAL_DAILY_COST_LIMIT_USD）は市民向けの経路（AIチャット・AIインタビュー）を
-- 守るためのものなので、この記録を全体の合計（target_user_id が null のとき）からは除く。
-- 数えると、作成者が設定を作り込んだ日に、市民のインタビューとチャットがすべて止まってしまう。
--
-- 利用者ごとの合計（target_user_id を渡したとき）は、これまでどおりその利用者の記録をすべて数える。

create or replace function public.get_ai_usage_cost_usd(
  from_ts timestamptz,
  to_ts timestamptz,
  target_user_id uuid default null
) returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(cost_usd), 0)
  from public.chat_usage_events
  where occurred_at >= from_ts
    and occurred_at < to_ts
    and (target_user_id is null or user_id = target_user_id)
    and (
      target_user_id is not null
      or prompt_name is distinct from 'interview_config_generation'
    );
$$;

comment on function public.get_ai_usage_cost_usd(timestamptz, timestamptz, uuid)
  is 'AI利用コスト(USD)の合計を返す。target_user_idがnullなら全ユーザー合計（管理画面の議題のインタビュー設定のAI生成は除く）';
