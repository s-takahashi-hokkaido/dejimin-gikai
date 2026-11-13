/**
 * 議題のインタビュー設定の AI 生成を chat_usage_events に記録するときの prompt_name
 *
 * サイト全体の AI 利用上限の合計からはこの名前の記録を除く（DB 関数 get_ai_usage_cost_usd、
 * マイグレーション 20261113120000）。名前を変えるときはマイグレーションも合わせること。
 */
export const CONFIG_GENERATION_PROMPT_NAME = "interview_config_generation";
