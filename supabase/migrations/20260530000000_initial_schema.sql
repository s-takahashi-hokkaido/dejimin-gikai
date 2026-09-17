-- ============================================================
-- 札幌市議会版 初期スキーマ（ベースライン）
-- 過去のマイグレーション履歴を統合した単一ファイル。
-- 現在の最終スキーマ状態をそのまま再現する。
-- ============================================================

-- Extensions
create schema if not exists extensions;
create extension if not exists "uuid-ossp" with schema extensions;




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."bill_publish_status" AS ENUM (
    'draft',
    'published',
    'coming_soon'
);


ALTER TYPE "public"."bill_publish_status" OWNER TO "postgres";


COMMENT ON TYPE "public"."bill_publish_status" IS 'ENUM type for bill publication status';



CREATE TYPE "public"."bill_status_enum" AS ENUM (
    'preparing',
    'submitted',
    'in_committee',
    'plenary_session',
    'approved',
    'rejected',
    'adopted',
    'partially_adopted',
    'reported'
);


ALTER TYPE "public"."bill_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."chat_role_enum" AS ENUM (
    'user',
    'system',
    'assistant'
);


ALTER TYPE "public"."chat_role_enum" OWNER TO "postgres";


CREATE TYPE "public"."difficulty_level_enum" AS ENUM (
    'normal',
    'hard'
);


ALTER TYPE "public"."difficulty_level_enum" OWNER TO "postgres";


CREATE TYPE "public"."interview_config_status_enum" AS ENUM (
    'public',
    'closed'
);


ALTER TYPE "public"."interview_config_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."interview_mode_enum" AS ENUM (
    'loop',
    'bulk'
);


ALTER TYPE "public"."interview_mode_enum" OWNER TO "postgres";


CREATE TYPE "public"."interview_report_role_enum" AS ENUM (
    'subject_expert',
    'work_related',
    'daily_life_affected',
    'general_citizen'
);


ALTER TYPE "public"."interview_report_role_enum" OWNER TO "postgres";


COMMENT ON TYPE "public"."interview_report_role_enum" IS 'インタビュー対象者の役割・属性を表すENUM型';



CREATE TYPE "public"."interview_role_enum" AS ENUM (
    'assistant',
    'user'
);


ALTER TYPE "public"."interview_role_enum" OWNER TO "postgres";


CREATE TYPE "public"."stance_type_enum" AS ENUM (
    'for',
    'against',
    'neutral',
    'conditional_for',
    'conditional_against',
    'considering',
    'continued_deliberation'
);

CREATE TYPE "public"."committee_type_enum" AS ENUM (
    'standing',       -- 常任委員会
    'parliamentary',  -- 議会運営委員会
    'special'         -- 調査特別委員会（特別委員会）
);


ALTER TYPE "public"."stance_type_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_reactions_by_report_ids"("report_ids" "uuid"[]) RETURNS TABLE("interview_report_id" "uuid", "reaction_type" "text", "cnt" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  select
    r.interview_report_id,
    r.reaction_type,
    count(*) as cnt
  from report_reactions r
  where r.interview_report_id = any(report_ids)
  group by r.interview_report_id, r.reaction_type;
$$;


ALTER FUNCTION "public"."count_reactions_by_report_ids"("report_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_users"() RETURNS TABLE("id" "uuid", "email" "text", "created_at" timestamp with time zone, "last_sign_in_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT u.id, u.email, u.created_at, u.last_sign_in_at
  FROM auth.users u
  WHERE u.raw_app_meta_data->'roles' ? 'admin'
  ORDER BY u.created_at DESC;
$$;


ALTER FUNCTION "public"."get_admin_users"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_interview_message_counts"("session_ids" "uuid"[]) RETURNS TABLE("interview_session_id" "uuid", "message_count" bigint)
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    im.interview_session_id,
    COUNT(*)::BIGINT AS message_count
  FROM interview_messages im
  WHERE im.interview_session_id = ANY(session_ids)
  GROUP BY im.interview_session_id;
END;
$$;


ALTER FUNCTION "public"."get_interview_message_counts"("session_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1
      FROM auth.users
      WHERE id = auth.uid()
      AND raw_app_meta_data->>'roles' LIKE '%admin%'
    )
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_active_council_session"("target_session_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE council_sessions
  SET is_active = (id = target_session_id)
  WHERE id IS NOT NULL;
END;
$$;


ALTER FUNCTION "public"."set_active_council_session"("target_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."bill_contents" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL, -- ID
    "bill_id" "uuid" NOT NULL, -- 議案ID
    "difficulty_level" "public"."difficulty_level_enum" NOT NULL, -- 難易度レベル（normal:ふつう, hard:難しい）
    "title" "text" NOT NULL, -- タイトル
    "summary" "text" NOT NULL, -- 要約
    "content" "text" NOT NULL, -- Markdown形式の議案内容
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 作成日時
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL -- 更新日時
);


ALTER TABLE "public"."bill_contents" OWNER TO "postgres";


COMMENT ON TABLE "public"."bill_contents" IS '議案の難易度別コンテンツを管理するテーブル';



COMMENT ON COLUMN "public"."bill_contents"."id" IS 'ID';



COMMENT ON COLUMN "public"."bill_contents"."bill_id" IS '議案ID';



COMMENT ON COLUMN "public"."bill_contents"."difficulty_level" IS '難易度レベル（normal:ふつう, hard:難しい）';



COMMENT ON COLUMN "public"."bill_contents"."title" IS 'タイトル';



COMMENT ON COLUMN "public"."bill_contents"."summary" IS '要約';



COMMENT ON COLUMN "public"."bill_contents"."content" IS 'Markdown形式の議案内容';



COMMENT ON COLUMN "public"."bill_contents"."created_at" IS '作成日時';



COMMENT ON COLUMN "public"."bill_contents"."updated_at" IS '更新日時';



CREATE TABLE IF NOT EXISTS "public"."bill_discussions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL, -- ID
    "bill_id" "uuid" NOT NULL, -- 議案ID
    "session_day" integer NOT NULL, -- 開催日番号
    "questioner_name" "text" NOT NULL, -- 質問者氏名
    "questioner_number" "text", -- 質問者番号
    "questioner_party" "text", -- 質問者会派
    "question_summary" "text", -- 質問要約
    "question_raw" "text", -- 質問原文
    "answerer_role" "text", -- 回答者役職
    "answerer_name" "text", -- 回答者氏名
    "answer_summary" "text", -- 回答要約
    "answer_raw" "text", -- 回答原文
    "exchange_count" integer DEFAULT 1 NOT NULL, -- 質疑回数
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL -- 作成日時
);


ALTER TABLE "public"."bill_discussions" OWNER TO "postgres";


COMMENT ON TABLE "public"."bill_discussions" IS '議案討論記録';



COMMENT ON COLUMN "public"."bill_discussions"."bill_id" IS '議案ID';



COMMENT ON COLUMN "public"."bill_discussions"."session_day" IS '開催日番号';



COMMENT ON COLUMN "public"."bill_discussions"."questioner_name" IS '質問者氏名';



COMMENT ON COLUMN "public"."bill_discussions"."questioner_number" IS '質問者番号';



COMMENT ON COLUMN "public"."bill_discussions"."questioner_party" IS '質問者会派';



COMMENT ON COLUMN "public"."bill_discussions"."question_summary" IS '質問要約';



COMMENT ON COLUMN "public"."bill_discussions"."question_raw" IS '質問原文';



COMMENT ON COLUMN "public"."bill_discussions"."answerer_role" IS '回答者役職';



COMMENT ON COLUMN "public"."bill_discussions"."answerer_name" IS '回答者氏名';



COMMENT ON COLUMN "public"."bill_discussions"."answer_summary" IS '回答要約';



COMMENT ON COLUMN "public"."bill_discussions"."answer_raw" IS '回答原文';



COMMENT ON COLUMN "public"."bill_discussions"."exchange_count" IS '質疑回数';



CREATE TABLE IF NOT EXISTS "public"."bills" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL, -- ID
    "name" "text" NOT NULL, -- 議案名
    "status" "public"."bill_status_enum" NOT NULL, -- 議案のステータス
    "status_note" "text", -- ステータス備考
    "published_at" timestamp with time zone, -- サービスでの議案公開日時
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 作成日時
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 更新日時
    "thumbnail_url" "text", -- サムネイル画像URL
    "publish_status" "public"."bill_publish_status" DEFAULT 'draft'::"public"."bill_publish_status" NOT NULL, -- 公開状態(draft/coming_soon/published)
    "is_featured" boolean DEFAULT false NOT NULL, -- 注目フラグ
    "share_thumbnail_url" "text", -- シェア用OGP画像URL
    "council_session_id" "uuid", -- 紐付けられた会期ID
    "committee_id" "uuid", -- 委員会ID
    "publish_status_order" integer GENERATED ALWAYS AS (
CASE "publish_status"
    WHEN 'draft'::"public"."bill_publish_status" THEN 0
    WHEN 'coming_soon'::"public"."bill_publish_status" THEN 1
    WHEN 'published'::"public"."bill_publish_status" THEN 2
    ELSE NULL::integer
END) STORED, -- 公開状態ソート順(Generated Column)
    "bill_number" "text" DEFAULT ''::"text" NOT NULL, -- 議案番号（例:「第1号」「報告第1号」）
    "status_order" integer GENERATED ALWAYS AS (
CASE "status"
    WHEN 'approved'::"public"."bill_status_enum" THEN 0
    WHEN 'adopted'::"public"."bill_status_enum" THEN 0
    WHEN 'reported'::"public"."bill_status_enum" THEN 0
    WHEN 'partially_adopted'::"public"."bill_status_enum" THEN 1
    WHEN 'rejected'::"public"."bill_status_enum" THEN 2
    WHEN 'plenary_session'::"public"."bill_status_enum" THEN 3
    WHEN 'in_committee'::"public"."bill_status_enum" THEN 4
    WHEN 'submitted'::"public"."bill_status_enum" THEN 5
    WHEN 'preparing'::"public"."bill_status_enum" THEN 6
    ELSE NULL::integer
END) STORED, -- ステータスソート順(Generated Column)
    "source_url" "text", -- 出典URL
    "bill_type" "text" DEFAULT 'bill'::"text" NOT NULL, -- 議案種別(bill/bill_settlement/bill_personnel/bill_ratification/consultation/opinion/petition/appeal/report/resolution/member_bill)
    "discussion_overview_points" "text"[] DEFAULT '{}'::"text"[] NOT NULL, -- 議論概要ポイント
    CONSTRAINT "bills_bill_type_check" CHECK (("bill_type" = ANY (ARRAY['bill'::"text", 'bill_settlement'::"text", 'bill_personnel'::"text", 'bill_ratification'::"text", 'consultation'::"text", 'opinion'::"text", 'petition'::"text", 'appeal'::"text", 'report'::"text", 'resolution'::"text", 'member_bill'::"text"])))
);


ALTER TABLE "public"."bills" OWNER TO "postgres";


COMMENT ON TABLE "public"."bills" IS '議案の基本情報を格納するテーブル。コンテンツはbill_contentsテーブルで管理。';



COMMENT ON COLUMN "public"."bills"."id" IS 'ID';



COMMENT ON COLUMN "public"."bills"."name" IS '議案名';



COMMENT ON COLUMN "public"."bills"."status" IS '議案のステータス';



COMMENT ON COLUMN "public"."bills"."status_note" IS 'ステータス備考';



COMMENT ON COLUMN "public"."bills"."published_at" IS 'サービスでの議案公開日時';



COMMENT ON COLUMN "public"."bills"."created_at" IS '作成日時';



COMMENT ON COLUMN "public"."bills"."updated_at" IS '更新日時';



COMMENT ON COLUMN "public"."bills"."thumbnail_url" IS 'URL to the bill thumbnail image stored in Supabase Storage';



COMMENT ON COLUMN "public"."bills"."publish_status" IS 'Publication status: draft (private) or published (public)';



COMMENT ON COLUMN "public"."bills"."is_featured" IS 'Flag to indicate if this bill is featured on the homepage';



COMMENT ON COLUMN "public"."bills"."share_thumbnail_url" IS 'シェア用OGP画像URL';



COMMENT ON COLUMN "public"."bills"."council_session_id" IS '紐付けられた会期ID';



COMMENT ON COLUMN "public"."bills"."committee_id" IS '委員会ID';



COMMENT ON COLUMN "public"."bills"."publish_status_order" IS '公開状態ソート順(draft → coming_soon → published の順。Generated Column)';



COMMENT ON COLUMN "public"."bills"."bill_number" IS '議案番号（例: 「第1号」「報告第1号」など）。空文字は未設定を示す。';



COMMENT ON COLUMN "public"."bills"."source_url" IS '出典URL（議案のPDF等）';



COMMENT ON COLUMN "public"."bills"."bill_type" IS '議案種別(bill:通常議案 / bill_settlement:決算認定 / bill_personnel:人事同意 / bill_ratification:専決処分承認 / consultation:諮問 / opinion:意見書案 / petition:請願 / appeal:陳情 / report:報告 / resolution:決議 / member_bill:議員提出議案)';



COMMENT ON COLUMN "public"."bills"."discussion_overview_points" IS '議論概要ポイント';



CREATE TABLE IF NOT EXISTS "public"."bills_tags" (
    "bill_id" "uuid" NOT NULL, -- 議案ID
    "tag_id" "uuid" NOT NULL, -- タグID
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL -- 作成日時
);


ALTER TABLE "public"."bills_tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."bills_tags" IS 'Junction table for bills and tags relationship';



COMMENT ON COLUMN "public"."bills_tags"."bill_id" IS 'Bill ID';



COMMENT ON COLUMN "public"."bills_tags"."tag_id" IS 'Tag ID';



COMMENT ON COLUMN "public"."bills_tags"."created_at" IS '作成日時';



CREATE TABLE IF NOT EXISTS "public"."budget_initiatives" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL, -- ID
    "theme_id" "uuid" NOT NULL, -- 予算テーマID
    "title" "text" NOT NULL, -- 施策タイトル
    "budget_amount" bigint, -- 予算額
    "badge" "text", -- バッジ種別(new/expanded/continued)
    "description" "text", -- 施策説明
    "sort_order" integer DEFAULT 0 NOT NULL, -- 表示順
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 作成日時
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 更新日時
    CONSTRAINT "budget_initiatives_badge_check" CHECK (("badge" = ANY (ARRAY['new'::"text", 'expanded'::"text", 'continued'::"text", NULL::"text"])))
);


ALTER TABLE "public"."budget_initiatives" OWNER TO "postgres";


COMMENT ON TABLE "public"."budget_initiatives" IS '予算施策(テーマごとの個別施策)';



COMMENT ON COLUMN "public"."budget_initiatives"."theme_id" IS '予算テーマID';



COMMENT ON COLUMN "public"."budget_initiatives"."title" IS '施策タイトル';



COMMENT ON COLUMN "public"."budget_initiatives"."budget_amount" IS '予算額';



COMMENT ON COLUMN "public"."budget_initiatives"."badge" IS 'バッジ種別(new/expanded/continued)';



COMMENT ON COLUMN "public"."budget_initiatives"."description" IS '施策説明';



COMMENT ON COLUMN "public"."budget_initiatives"."sort_order" IS '表示順';



CREATE TABLE IF NOT EXISTS "public"."budget_overviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL, -- ID
    "council_session_id" "uuid" NOT NULL, -- 市議会定例会ID
    "department_name" "text" NOT NULL, -- 部局名
    "department_slug" "text" NOT NULL, -- 部局スラッグ
    "direction" "text", -- 方針
    "total_budget" bigint, -- 当年度予算総額
    "prev_budget" bigint, -- 前年度予算総額
    "source_url" "text", -- 出典URL
    "publish_status" "text" DEFAULT 'draft'::"text" NOT NULL, -- 公開状態(draft/published)
    "sort_order" integer DEFAULT 0 NOT NULL, -- 表示順
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 作成日時
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 更新日時
    CONSTRAINT "budget_overviews_publish_status_check" CHECK (("publish_status" = ANY (ARRAY['draft'::"text", 'published'::"text"])))
);


ALTER TABLE "public"."budget_overviews" OWNER TO "postgres";


COMMENT ON TABLE "public"."budget_overviews" IS '予算概要(部局ごと×定例会ごと)';



COMMENT ON COLUMN "public"."budget_overviews"."council_session_id" IS '市議会定例会ID';



COMMENT ON COLUMN "public"."budget_overviews"."department_name" IS '部局名';



COMMENT ON COLUMN "public"."budget_overviews"."department_slug" IS '部局スラッグ';



COMMENT ON COLUMN "public"."budget_overviews"."direction" IS '方針';



COMMENT ON COLUMN "public"."budget_overviews"."total_budget" IS '当年度予算総額';



COMMENT ON COLUMN "public"."budget_overviews"."prev_budget" IS '前年度予算総額';



COMMENT ON COLUMN "public"."budget_overviews"."source_url" IS '出典URL';



COMMENT ON COLUMN "public"."budget_overviews"."publish_status" IS '公開状態(draft/published)';



COMMENT ON COLUMN "public"."budget_overviews"."sort_order" IS '表示順';



CREATE TABLE IF NOT EXISTS "public"."budget_themes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL, -- ID
    "overview_id" "uuid" NOT NULL, -- 予算概要ID
    "title" "text" NOT NULL, -- テーマタイトル
    "budget_amount" bigint, -- 予算額
    "ai_summary" "text", -- AI要約
    "sort_order" integer DEFAULT 0 NOT NULL, -- 表示順
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 作成日時
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL -- 更新日時
);


ALTER TABLE "public"."budget_themes" OWNER TO "postgres";


COMMENT ON TABLE "public"."budget_themes" IS '予算テーマ(部局ごとの主要テーマ)';



COMMENT ON COLUMN "public"."budget_themes"."overview_id" IS '予算概要ID';



COMMENT ON COLUMN "public"."budget_themes"."title" IS 'テーマタイトル';



COMMENT ON COLUMN "public"."budget_themes"."budget_amount" IS '予算額';



COMMENT ON COLUMN "public"."budget_themes"."ai_summary" IS 'AI要約';



COMMENT ON COLUMN "public"."budget_themes"."sort_order" IS '表示順';



CREATE TABLE IF NOT EXISTS "public"."chat_usage_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL, -- ID
    "user_id" "uuid" NOT NULL, -- ユーザーID
    "session_id" "text", -- セッションID
    "prompt_name" "text", -- プロンプト名
    "model" "text" NOT NULL, -- モデルID
    "input_tokens" integer DEFAULT 0 NOT NULL, -- 入力トークン数
    "output_tokens" integer DEFAULT 0 NOT NULL, -- 出力トークン数
    "total_tokens" integer DEFAULT 0 NOT NULL, -- 合計トークン数
    "cost_usd" numeric(12,6) DEFAULT 0 NOT NULL, -- コスト(USD)
    "metadata" "jsonb", -- メタデータ
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 発生日時
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL -- 作成日時
);


ALTER TABLE "public"."chat_usage_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."chat_usage_events" IS 'チャットAI利用ログ';



COMMENT ON COLUMN "public"."chat_usage_events"."user_id" IS 'ユーザーID';



COMMENT ON COLUMN "public"."chat_usage_events"."session_id" IS 'セッションID';



COMMENT ON COLUMN "public"."chat_usage_events"."prompt_name" IS 'プロンプト名';



COMMENT ON COLUMN "public"."chat_usage_events"."model" IS 'モデルID';



COMMENT ON COLUMN "public"."chat_usage_events"."input_tokens" IS '入力トークン数';



COMMENT ON COLUMN "public"."chat_usage_events"."output_tokens" IS '出力トークン数';



COMMENT ON COLUMN "public"."chat_usage_events"."total_tokens" IS '合計トークン数';



COMMENT ON COLUMN "public"."chat_usage_events"."cost_usd" IS 'コスト(USD)';



COMMENT ON COLUMN "public"."chat_usage_events"."metadata" IS 'メタデータ';



COMMENT ON COLUMN "public"."chat_usage_events"."occurred_at" IS '発生日時';



COMMENT ON COLUMN "public"."chat_usage_events"."created_at" IS '作成日時';



CREATE TABLE IF NOT EXISTS "public"."chats" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL, -- ID
    "bill_id" "uuid" NOT NULL, -- 議案ID
    "user_id" "uuid", -- ユーザーID（Supabase匿名認証）
    "role" "public"."chat_role_enum" NOT NULL, -- メッセージの送信者役割
    "message" "text" NOT NULL, -- メッセージ本文
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 作成日時
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL -- 更新日時
);


ALTER TABLE "public"."chats" OWNER TO "postgres";


COMMENT ON TABLE "public"."chats" IS 'AIとの対話履歴を管理するテーブル';



COMMENT ON COLUMN "public"."chats"."id" IS 'ID';



COMMENT ON COLUMN "public"."chats"."bill_id" IS '議案ID';



COMMENT ON COLUMN "public"."chats"."user_id" IS 'ユーザーID（Supabase匿名認証）';



COMMENT ON COLUMN "public"."chats"."role" IS 'メッセージの送信者役割';



COMMENT ON COLUMN "public"."chats"."message" IS 'メッセージ本文';



COMMENT ON COLUMN "public"."chats"."created_at" IS '作成日時';



COMMENT ON COLUMN "public"."chats"."updated_at" IS '更新日時';



CREATE TABLE IF NOT EXISTS "public"."committees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL, -- ID
    "name" "text" NOT NULL, -- 委員会名
    "committee_type" "public"."committee_type_enum" DEFAULT 'standing' NOT NULL, -- 委員会種別
    "description" "text", -- 委員会説明
    "sort_order" integer DEFAULT 0 NOT NULL, -- 表示順
    "is_active" boolean DEFAULT true NOT NULL, -- 有効フラグ
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 作成日時
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL -- 更新日時
);


ALTER TABLE "public"."committees" OWNER TO "postgres";


COMMENT ON TABLE "public"."committees" IS '委員会マスター';



COMMENT ON COLUMN "public"."committees"."name" IS '委員会名';



COMMENT ON COLUMN "public"."committees"."committee_type" IS '委員会種別（standing: 常任, parliamentary: 議会運営, special: 調査特別）';



COMMENT ON COLUMN "public"."committees"."description" IS '委員会説明';



COMMENT ON COLUMN "public"."committees"."sort_order" IS '表示順';



COMMENT ON COLUMN "public"."committees"."is_active" IS '有効フラグ';



CREATE TABLE IF NOT EXISTS "public"."council_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL, -- ID
    "name" "text" NOT NULL, -- 会期名
    "start_date" "date" NOT NULL, -- 開始日
    "end_date" "date", -- 終了日
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 作成日時
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 更新日時
    "slug" "text", -- URL用スラッグ（例: r8-2）
    "council_url" "text", -- 議会議案情報ページURL
    "is_active" boolean DEFAULT false NOT NULL, -- アクティブフラグ（トップ表示対象・1件のみ）
    CONSTRAINT "end_date_after_start_date" CHECK (("end_date" >= "start_date"))
);


ALTER TABLE "public"."council_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."council_sessions" IS '会期マスタテーブル（定例会・臨時会）';



COMMENT ON COLUMN "public"."council_sessions"."id" IS 'ID';



COMMENT ON COLUMN "public"."council_sessions"."name" IS '会期名';



COMMENT ON COLUMN "public"."council_sessions"."start_date" IS '開始日';



COMMENT ON COLUMN "public"."council_sessions"."end_date" IS '終了日';



COMMENT ON COLUMN "public"."council_sessions"."created_at" IS '作成日時';



COMMENT ON COLUMN "public"."council_sessions"."updated_at" IS '更新日時';



COMMENT ON COLUMN "public"."council_sessions"."slug" IS 'URL用のスラッグ（例: r8-2 = 令和8年第2回定例会）';



COMMENT ON COLUMN "public"."council_sessions"."council_url" IS '市議会の議案等一覧ページURL（会期ごと）';



COMMENT ON COLUMN "public"."council_sessions"."is_active" IS 'Whether this session is the active one displayed on the top page. Only one session can be active at a time.';



CREATE TABLE IF NOT EXISTS "public"."expert_registrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL, -- ID
    "name" "text" NOT NULL, -- 有識者氏名
    "affiliation" "text" NOT NULL, -- 所属・肩書
    "email" "text" NOT NULL, -- メールアドレス
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 作成日時
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 更新日時
    "user_id" "uuid" NOT NULL -- 登録ユーザーID
);


ALTER TABLE "public"."expert_registrations" OWNER TO "postgres";


COMMENT ON TABLE "public"."expert_registrations" IS '有識者リスト登録情報を管理するテーブル';



COMMENT ON COLUMN "public"."expert_registrations"."name" IS '有識者の氏名';



COMMENT ON COLUMN "public"."expert_registrations"."affiliation" IS '所属・肩書';



COMMENT ON COLUMN "public"."expert_registrations"."email" IS 'メールアドレス';



COMMENT ON COLUMN "public"."expert_registrations"."user_id" IS '登録したユーザーのID';



CREATE TABLE IF NOT EXISTS "public"."faction_stances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL, -- ID
    "bill_id" "uuid" NOT NULL, -- 議案ID
    "faction_id" "uuid" NOT NULL, -- 会派ID
    "type" "public"."stance_type_enum" NOT NULL, -- スタンス種別
    "comment" "text", -- コメント
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 作成日時
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL -- 更新日時
);


ALTER TABLE "public"."faction_stances" OWNER TO "postgres";


COMMENT ON TABLE "public"."faction_stances" IS '会派見解（1議案に複数会派の見解を登録可能）';



COMMENT ON COLUMN "public"."faction_stances"."bill_id" IS '議案ID';



COMMENT ON COLUMN "public"."faction_stances"."faction_id" IS '会派ID';



COMMENT ON COLUMN "public"."faction_stances"."type" IS 'スタンス種別';



COMMENT ON COLUMN "public"."faction_stances"."comment" IS 'コメント';



CREATE TABLE IF NOT EXISTS "public"."factions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL, -- ID
    "name" "text" NOT NULL, -- 会派名
    "display_name" "text" NOT NULL, -- 会派表示名
    "logo_url" "text", -- ロゴ画像URL
    "sort_order" integer DEFAULT 0 NOT NULL, -- 表示順
    "is_active" boolean DEFAULT true NOT NULL, -- 有効フラグ
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 作成日時
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 更新日時
    "alternative_names" "text"[] DEFAULT '{}'::"text"[] NOT NULL -- 別名一覧(略称・旧称等)
);


ALTER TABLE "public"."factions" OWNER TO "postgres";


COMMENT ON TABLE "public"."factions" IS '会派マスター';



COMMENT ON COLUMN "public"."factions"."name" IS '会派名';



COMMENT ON COLUMN "public"."factions"."display_name" IS '会派表示名';



COMMENT ON COLUMN "public"."factions"."logo_url" IS 'ロゴ画像URL';



COMMENT ON COLUMN "public"."factions"."sort_order" IS '表示順';



COMMENT ON COLUMN "public"."factions"."is_active" IS '有効フラグ';



COMMENT ON COLUMN "public"."factions"."alternative_names" IS '別名一覧(略称・旧称等)';



CREATE TABLE IF NOT EXISTS "public"."general_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL, -- ID
    "council_session_id" "uuid" NOT NULL, -- 市議会定例会ID
    "questioner_name" "text" NOT NULL, -- 質問者氏名
    "questioner_party" "text", -- 質問者会派
    "questioner_number" integer, -- 質問者番号
    "session_day" integer DEFAULT 1 NOT NULL, -- 開催日番号
    "question_order" integer DEFAULT 1 NOT NULL, -- 質問順序
    "summary" "text", -- 質問要約
    "topics" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL, -- トピック一覧(JSON配列)
    "raw_text" "text", -- 原文
    "source_url" "text", -- 出典URL
    "publish_status" "text" DEFAULT 'draft'::"text" NOT NULL, -- 公開状態(draft/published)
    "created_at" timestamp with time zone DEFAULT "now"(), -- 作成日時
    "updated_at" timestamp with time zone DEFAULT "now"(), -- 更新日時
    CONSTRAINT "general_questions_publish_status_check" CHECK (("publish_status" = ANY (ARRAY['draft'::"text", 'published'::"text"])))
);


ALTER TABLE "public"."general_questions" OWNER TO "postgres";


COMMENT ON TABLE "public"."general_questions" IS '一般質問';



COMMENT ON COLUMN "public"."general_questions"."council_session_id" IS '市議会定例会ID';



COMMENT ON COLUMN "public"."general_questions"."questioner_name" IS '質問者氏名';



COMMENT ON COLUMN "public"."general_questions"."questioner_party" IS '質問者会派';



COMMENT ON COLUMN "public"."general_questions"."questioner_number" IS '質問者番号';



COMMENT ON COLUMN "public"."general_questions"."session_day" IS '開催日番号';



COMMENT ON COLUMN "public"."general_questions"."question_order" IS '質問順序';



COMMENT ON COLUMN "public"."general_questions"."summary" IS '質問要約';



COMMENT ON COLUMN "public"."general_questions"."topics" IS 'トピック一覧(JSON配列)';



COMMENT ON COLUMN "public"."general_questions"."raw_text" IS '原文';



COMMENT ON COLUMN "public"."general_questions"."source_url" IS '出典URL';



COMMENT ON COLUMN "public"."general_questions"."publish_status" IS '公開状態(draft/published)';



CREATE TABLE IF NOT EXISTS "public"."interview_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL, -- ID
    "bill_id" "uuid" NOT NULL, -- 対象議案ID
    "status" "public"."interview_config_status_enum" DEFAULT 'closed'::"public"."interview_config_status_enum" NOT NULL, -- 設定ステータス(public:有効/closed:無効)
    "themes" "text"[], -- テーマ配列
    "knowledge_source" "text", -- 議案コンテキスト情報
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 作成日時
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 更新日時
    "name" "text" NOT NULL, -- 設定名（識別用）
    "mode" "public"."interview_mode_enum" DEFAULT 'loop'::"public"."interview_mode_enum" NOT NULL, -- インタビューモード(loop/bulk)
    "chat_model" "text", -- チャット用AIモデルID
    "estimated_duration" integer -- 目安所要時間(分)
);


ALTER TABLE "public"."interview_configs" OWNER TO "postgres";


COMMENT ON TABLE "public"."interview_configs" IS '議案ごとのインタビュー設定を管理するテーブル';



COMMENT ON COLUMN "public"."interview_configs"."bill_id" IS '対象議案ID（複数設定可、ただしpublicは1つのみ）';



COMMENT ON COLUMN "public"."interview_configs"."status" IS '設定ステータス（public: 公開/有効, closed: 非公開/無効）';



COMMENT ON COLUMN "public"."interview_configs"."themes" IS 'テーマの配列';



COMMENT ON COLUMN "public"."interview_configs"."knowledge_source" IS '議案のコンテキスト情報';



COMMENT ON COLUMN "public"."interview_configs"."created_at" IS '作成日時';



COMMENT ON COLUMN "public"."interview_configs"."updated_at" IS '更新日時';



COMMENT ON COLUMN "public"."interview_configs"."name" IS '設定名（識別用）';



COMMENT ON COLUMN "public"."interview_configs"."mode" IS 'インタビューモード: loop（逐次深掘り）または bulk（一括深掘り）';



COMMENT ON COLUMN "public"."interview_configs"."chat_model" IS 'チャット用AIモデルID（Vercel AI Gateway形式 例:"openai/gpt-4o-mini" NULL=デフォルト）';



COMMENT ON COLUMN "public"."interview_configs"."estimated_duration" IS '目安所要時間(分・NULLはタイムマネジメントしない)';



CREATE TABLE IF NOT EXISTS "public"."interview_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL, -- ID
    "interview_session_id" "uuid" NOT NULL, -- インタビューセッションID
    "role" "public"."interview_role_enum" NOT NULL, -- メッセージ役割(assistant/user)
    "content" "text" NOT NULL, -- メッセージ内容
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL -- 作成日時
);


ALTER TABLE "public"."interview_messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."interview_messages" IS 'インタビュー内の質問と回答を保存するテーブル';



COMMENT ON COLUMN "public"."interview_messages"."interview_session_id" IS 'インタビューセッションID';



COMMENT ON COLUMN "public"."interview_messages"."role" IS 'メッセージの役割（assistant: AIからの質問, user: ユーザーからの回答）';



COMMENT ON COLUMN "public"."interview_messages"."content" IS 'メッセージ内容';



COMMENT ON COLUMN "public"."interview_messages"."created_at" IS '作成日時';



CREATE TABLE IF NOT EXISTS "public"."interview_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL, -- ID
    "interview_config_id" "uuid" NOT NULL, -- インタビュー設定ID
    "question" "text" NOT NULL, -- 質問文
    "follow_up_guide" "text", -- フォローアップ指針
    "quick_replies" "text"[], -- クイックリプライ選択肢
    "question_order" integer NOT NULL, -- 質問順序
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 作成日時
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL -- 更新日時
);


ALTER TABLE "public"."interview_questions" OWNER TO "postgres";


COMMENT ON TABLE "public"."interview_questions" IS '事前定義されたインタビュー質問を管理するテーブル';



COMMENT ON COLUMN "public"."interview_questions"."interview_config_id" IS 'インタビュー設定ID';



COMMENT ON COLUMN "public"."interview_questions"."question" IS '質問文';



COMMENT ON COLUMN "public"."interview_questions"."follow_up_guide" IS '回答後のフォローアップ指針（深掘り方法など）';



COMMENT ON COLUMN "public"."interview_questions"."quick_replies" IS 'ユーザーが選択できるクイックリプライ';



COMMENT ON COLUMN "public"."interview_questions"."question_order" IS '質問の順序';



COMMENT ON COLUMN "public"."interview_questions"."created_at" IS '作成日時';



COMMENT ON COLUMN "public"."interview_questions"."updated_at" IS '更新日時';



CREATE TABLE IF NOT EXISTS "public"."interview_report" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL, -- ID
    "interview_session_id" "uuid" NOT NULL, -- インタビューセッションID（1対1）
    "summary" "text", -- インタビュー要約
    "stance" "public"."stance_type_enum", -- ユーザーのスタンス(AI分析)
    "role" "public"."interview_report_role_enum", -- ユーザーの役割(ENUM)
    "role_description" "text", -- 役割の説明
    "opinions" "jsonb", -- 意見配列 [{title, content}, ...]
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 作成日時
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 更新日時
    "is_public_by_admin" boolean DEFAULT false NOT NULL, -- 管理者による公開状態
    "scores" "jsonb", -- 評価スコア(total/clarity/specificity/impact/constructiveness/reasoning)
    "total_score" integer GENERATED ALWAYS AS (
CASE
    WHEN (("scores" IS NOT NULL) AND (("scores" ->> 'total'::"text") IS NOT NULL) AND (("scores" ->> 'total'::"text") ~ '^\d+$'::"text")) THEN (("scores" ->> 'total'::"text"))::integer
    ELSE NULL::integer
END) STORED, -- 総合スコア(0-100) Generated Column
    "role_title" "text", -- 役割タイトル(10文字以内)
    "is_public_by_user" boolean DEFAULT false NOT NULL -- ユーザーによる公開同意
);


ALTER TABLE "public"."interview_report" OWNER TO "postgres";


COMMENT ON TABLE "public"."interview_report" IS 'インタビュー結果のレポートを保存するテーブル（AIが自動生成）';



COMMENT ON COLUMN "public"."interview_report"."interview_session_id" IS 'インタビューセッションID（1セッション1レポート）';



COMMENT ON COLUMN "public"."interview_report"."summary" IS 'インタビュー要約';



COMMENT ON COLUMN "public"."interview_report"."stance" IS 'AIが分析したユーザーのスタンス';



COMMENT ON COLUMN "public"."interview_report"."role" IS 'AIが推論したユーザーの役割・属性（ENUM型）';



COMMENT ON COLUMN "public"."interview_report"."role_description" IS '役割の説明';



COMMENT ON COLUMN "public"."interview_report"."opinions" IS '意見の配列 [{title: string, content: string}, ...]';



COMMENT ON COLUMN "public"."interview_report"."created_at" IS '作成日時';



COMMENT ON COLUMN "public"."interview_report"."updated_at" IS '更新日時';



COMMENT ON COLUMN "public"."interview_report"."is_public_by_admin" IS '管理者によるレポートの公開状態（true: 公開, false: 非公開）';



COMMENT ON COLUMN "public"."interview_report"."scores" IS 'インタビューの評価スコア（total, clarity, specificity, impact, constructiveness, reasoning）';



COMMENT ON COLUMN "public"."interview_report"."total_score" IS '総合スコア（0-100）- scoresから自動生成されるGenerated Column';



COMMENT ON COLUMN "public"."interview_report"."role_title" IS 'A short title (10 characters or less) summarizing the user role, e.g., "物流業者", "主婦"';



COMMENT ON COLUMN "public"."interview_report"."is_public_by_user" IS 'Whether the user has consented to making their interview report public';



CREATE TABLE IF NOT EXISTS "public"."interview_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL, -- ID
    "interview_config_id" "uuid" NOT NULL, -- インタビュー設定ID
    "user_id" "uuid" NOT NULL, -- ユーザーID（匿名認証）
    "langfuse_session_id" "text", -- LangfuseセッションID
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 開始日時
    "completed_at" timestamp with time zone, -- 完了日時
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 作成日時
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 更新日時
    "archived_at" timestamp with time zone, -- アーカイブ日時（やり直し時）
    "rating" smallint, -- セッション評価(1-5)
    CONSTRAINT "interview_sessions_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."interview_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."interview_sessions" IS 'インタビューセッションを管理するテーブル';



COMMENT ON COLUMN "public"."interview_sessions"."interview_config_id" IS 'インタビュー設定ID';



COMMENT ON COLUMN "public"."interview_sessions"."user_id" IS 'ユーザーID（匿名認証）';



COMMENT ON COLUMN "public"."interview_sessions"."langfuse_session_id" IS 'LangfuseセッションID';



COMMENT ON COLUMN "public"."interview_sessions"."started_at" IS '開始日時';



COMMENT ON COLUMN "public"."interview_sessions"."completed_at" IS '完了日時';



COMMENT ON COLUMN "public"."interview_sessions"."created_at" IS '作成日時';



COMMENT ON COLUMN "public"."interview_sessions"."updated_at" IS '更新日時';



COMMENT ON COLUMN "public"."interview_sessions"."archived_at" IS 'アーカイブ日時（やり直し時に設定）';



COMMENT ON COLUMN "public"."interview_sessions"."rating" IS 'セッション評価(1-5)';



CREATE TABLE IF NOT EXISTS "public"."press_conference_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL, -- ID
    "press_conference_id" "uuid" NOT NULL, -- 記者会見ID
    "item_type" "text" NOT NULL, -- 項目種別(announcement:発表/qa:質疑応答)
    "order_index" integer NOT NULL, -- 表示順
    "title" "text" NOT NULL, -- 項目タイトル
    "summary" "text", -- 要約
    "created_at" timestamp with time zone DEFAULT "now"(), -- 作成日時
    CONSTRAINT "press_conference_items_item_type_check" CHECK (("item_type" = ANY (ARRAY['announcement'::"text", 'qa'::"text"])))
);


ALTER TABLE "public"."press_conference_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."press_conference_items" IS '記者会見項目';



COMMENT ON COLUMN "public"."press_conference_items"."press_conference_id" IS '記者会見ID';



COMMENT ON COLUMN "public"."press_conference_items"."item_type" IS '項目種別(announcement:発表 / qa:質疑応答)';



COMMENT ON COLUMN "public"."press_conference_items"."order_index" IS '表示順';



COMMENT ON COLUMN "public"."press_conference_items"."title" IS '項目タイトル';



COMMENT ON COLUMN "public"."press_conference_items"."summary" IS '要約';



CREATE TABLE IF NOT EXISTS "public"."press_conference_turns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL, -- ID
    "press_conference_item_id" "uuid" NOT NULL, -- 記者会見項目ID
    "speaker" "text" NOT NULL, -- 発話者(mayor:市長/reporter:記者)
    "speaker_name" "text", -- 発話者名
    "content" "text" NOT NULL, -- 発言内容
    "order_index" integer NOT NULL, -- 表示順
    "created_at" timestamp with time zone DEFAULT "now"(), -- 作成日時
    CONSTRAINT "press_conference_turns_speaker_check" CHECK (("speaker" = ANY (ARRAY['mayor'::"text", 'reporter'::"text"])))
);


ALTER TABLE "public"."press_conference_turns" OWNER TO "postgres";


COMMENT ON TABLE "public"."press_conference_turns" IS '記者会見の発言ターン';



COMMENT ON COLUMN "public"."press_conference_turns"."press_conference_item_id" IS '記者会見項目ID';



COMMENT ON COLUMN "public"."press_conference_turns"."speaker" IS '発話者(mayor:市長 / reporter:記者)';



COMMENT ON COLUMN "public"."press_conference_turns"."speaker_name" IS '発話者名';



COMMENT ON COLUMN "public"."press_conference_turns"."content" IS '発言内容';



COMMENT ON COLUMN "public"."press_conference_turns"."order_index" IS '表示順';



CREATE TABLE IF NOT EXISTS "public"."press_conferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL, -- ID
    "slug" "text" NOT NULL, -- URL用スラッグ
    "title" "text" NOT NULL, -- 会見タイトル
    "held_at" "date" NOT NULL, -- 開催日
    "youtube_url" "text", -- YouTube動画URL
    "status" "text" DEFAULT 'draft'::"text" NOT NULL, -- ステータス(draft/structuring/review/published/error)
    "created_at" timestamp with time zone DEFAULT "now"(), -- 作成日時
    "updated_at" timestamp with time zone DEFAULT "now"(), -- 更新日時
    CONSTRAINT "press_conferences_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'structuring'::"text", 'review'::"text", 'published'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."press_conferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."press_conferences" IS '記者会見';



COMMENT ON COLUMN "public"."press_conferences"."slug" IS 'URL用スラッグ';



COMMENT ON COLUMN "public"."press_conferences"."title" IS '会見タイトル';



COMMENT ON COLUMN "public"."press_conferences"."held_at" IS '開催日';



COMMENT ON COLUMN "public"."press_conferences"."youtube_url" IS 'YouTube動画URL';



COMMENT ON COLUMN "public"."press_conferences"."status" IS 'ステータス(draft/structuring/review/published/error)';



CREATE TABLE IF NOT EXISTS "public"."preview_tokens" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL, -- ID
    "bill_id" "uuid" NOT NULL, -- 議案ID
    "token" "text" NOT NULL, -- プレビューアクセストークン
    "expires_at" timestamp with time zone NOT NULL, -- 有効期限(30日)
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 作成日時
    "created_by" "text" -- 作成者
);


ALTER TABLE "public"."preview_tokens" OWNER TO "postgres";


COMMENT ON TABLE "public"."preview_tokens" IS 'Preview tokens for bill access management';



COMMENT ON COLUMN "public"."preview_tokens"."id" IS 'ID';



COMMENT ON COLUMN "public"."preview_tokens"."bill_id" IS '議案ID';



COMMENT ON COLUMN "public"."preview_tokens"."token" IS 'Unique preview access token';



COMMENT ON COLUMN "public"."preview_tokens"."expires_at" IS 'Token expiration date (30 days)';



COMMENT ON COLUMN "public"."preview_tokens"."created_at" IS '作成日時';



COMMENT ON COLUMN "public"."preview_tokens"."created_by" IS '作成者';



CREATE TABLE IF NOT EXISTS "public"."report_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL, -- ID
    "interview_report_id" "uuid" NOT NULL, -- インタビューレポートID
    "user_id" "uuid" NOT NULL, -- ユーザーID
    "reaction_type" "text" NOT NULL, -- リアクション種別(helpful/hmm)
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 作成日時
    CONSTRAINT "report_reactions_reaction_type_check" CHECK (("reaction_type" = ANY (ARRAY['helpful'::"text", 'hmm'::"text"])))
);


ALTER TABLE "public"."report_reactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."report_reactions" IS 'レポートへのリアクション';



COMMENT ON COLUMN "public"."report_reactions"."interview_report_id" IS 'インタビューレポートID';



COMMENT ON COLUMN "public"."report_reactions"."user_id" IS 'ユーザーID';



COMMENT ON COLUMN "public"."report_reactions"."reaction_type" IS 'リアクション種別(helpful or hmm)';



CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL, -- ID
    "label" "text" NOT NULL, -- タグ表示名
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 作成日時
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 更新日時
    "featured_priority" integer, -- Featured表示優先度（小さいほど優先・NULLは非表示）
    "description" "text" -- タグ説明文
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."tags" IS 'Master table for tags';



COMMENT ON COLUMN "public"."tags"."id" IS 'ID';



COMMENT ON COLUMN "public"."tags"."label" IS 'Tag label (display name)';



COMMENT ON COLUMN "public"."tags"."created_at" IS '作成日時';



COMMENT ON COLUMN "public"."tags"."updated_at" IS '更新日時';



COMMENT ON COLUMN "public"."tags"."featured_priority" IS 'Featured表示の優先度（数値が小さいほど優先度が高い）。NULLの場合は非表示';



COMMENT ON COLUMN "public"."tags"."description" IS 'タグ説明文';



CREATE TABLE IF NOT EXISTS "public"."topic_analysis_classifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL, -- ID
    "version_id" "uuid" NOT NULL, -- 所属バージョンID
    "interview_report_id" "uuid" NOT NULL, -- インタビューレポートID
    "topic_id" "uuid" NOT NULL, -- トピックID
    "opinion_index" integer NOT NULL -- レポート内の意見インデックス
);


ALTER TABLE "public"."topic_analysis_classifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."topic_analysis_classifications" IS '意見とトピックの分類（多対多）';



COMMENT ON COLUMN "public"."topic_analysis_classifications"."version_id" IS '所属バージョンID';



COMMENT ON COLUMN "public"."topic_analysis_classifications"."interview_report_id" IS 'インタビューレポートID';



COMMENT ON COLUMN "public"."topic_analysis_classifications"."topic_id" IS 'トピックID';



COMMENT ON COLUMN "public"."topic_analysis_classifications"."opinion_index" IS 'レポート内の意見インデックス';



CREATE TABLE IF NOT EXISTS "public"."topic_analysis_topics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL, -- ID
    "version_id" "uuid" NOT NULL, -- 所属バージョンID
    "name" "text" NOT NULL, -- トピック名
    "description_md" "text" NOT NULL, -- トピック説明文(markdown)
    "representative_opinions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL, -- 代表的な意見(最大5件)
    "sort_order" integer DEFAULT 0 NOT NULL, -- 表示順
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL -- 作成日時
);


ALTER TABLE "public"."topic_analysis_topics" OWNER TO "postgres";


COMMENT ON TABLE "public"."topic_analysis_topics" IS 'トピック解析で抽出されたトピック';



COMMENT ON COLUMN "public"."topic_analysis_topics"."version_id" IS '所属バージョンID';



COMMENT ON COLUMN "public"."topic_analysis_topics"."name" IS 'トピック名';



COMMENT ON COLUMN "public"."topic_analysis_topics"."description_md" IS 'トピックの説明文（markdown形式）';



COMMENT ON COLUMN "public"."topic_analysis_topics"."representative_opinions" IS '代表的な意見（JSON配列、最大5件）';



COMMENT ON COLUMN "public"."topic_analysis_topics"."sort_order" IS '表示順';



CREATE TABLE IF NOT EXISTS "public"."topic_analysis_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL, -- ID
    "bill_id" "uuid" NOT NULL, -- 対象議案ID
    "version" integer NOT NULL, -- バージョン番号（議案ごとにインクリメント）
    "status" "text" DEFAULT 'pending'::"text" NOT NULL, -- 解析ステータス(pending/running/completed/failed)
    "summary_md" "text", -- 全体サマリ(markdown)
    "intermediate_results" "jsonb", -- 中間結果(デバッグ用)
    "error_message" "text", -- エラーメッセージ
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 作成日時
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL, -- 更新日時
    "current_step" "text", -- 現在のステップ
    "started_at" timestamp with time zone, -- 開始日時
    "completed_at" timestamp with time zone, -- 完了日時
    "phase_data" "jsonb", -- フェーズ間データ受け渡し用
    CONSTRAINT "topic_analysis_versions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'running'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."topic_analysis_versions" OWNER TO "postgres";


COMMENT ON TABLE "public"."topic_analysis_versions" IS 'トピック解析のバージョン管理';



COMMENT ON COLUMN "public"."topic_analysis_versions"."bill_id" IS '対象議案ID';



COMMENT ON COLUMN "public"."topic_analysis_versions"."version" IS 'バージョン番号（議案ごとにインクリメント）';



COMMENT ON COLUMN "public"."topic_analysis_versions"."status" IS '解析ステータス: pending, running, completed, failed';



COMMENT ON COLUMN "public"."topic_analysis_versions"."summary_md" IS '全体サマリ（markdown形式）';



COMMENT ON COLUMN "public"."topic_analysis_versions"."intermediate_results" IS '中間結果（デバッグ・参照用）';



COMMENT ON COLUMN "public"."topic_analysis_versions"."error_message" IS 'エラー時のメッセージ';



COMMENT ON COLUMN "public"."topic_analysis_versions"."current_step" IS '現在のステップ';



COMMENT ON COLUMN "public"."topic_analysis_versions"."started_at" IS '開始日時';



COMMENT ON COLUMN "public"."topic_analysis_versions"."completed_at" IS '完了日時';



COMMENT ON COLUMN "public"."topic_analysis_versions"."phase_data" IS 'フェーズ間データ受け渡し用';



ALTER TABLE ONLY "public"."bill_contents"
    ADD CONSTRAINT "bill_contents_bill_id_difficulty_level_key" UNIQUE ("bill_id", "difficulty_level");



ALTER TABLE ONLY "public"."bill_contents"
    ADD CONSTRAINT "bill_contents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bill_discussions"
    ADD CONSTRAINT "bill_discussions_bill_id_questioner_name_key" UNIQUE ("bill_id", "questioner_name");



ALTER TABLE ONLY "public"."bill_discussions"
    ADD CONSTRAINT "bill_discussions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bills_tags"
    ADD CONSTRAINT "bills_tags_pkey" PRIMARY KEY ("bill_id", "tag_id");



ALTER TABLE ONLY "public"."budget_initiatives"
    ADD CONSTRAINT "budget_initiatives_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budget_overviews"
    ADD CONSTRAINT "budget_overviews_council_session_id_department_slug_key" UNIQUE ("council_session_id", "department_slug");



ALTER TABLE ONLY "public"."budget_overviews"
    ADD CONSTRAINT "budget_overviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budget_themes"
    ADD CONSTRAINT "budget_themes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_usage_events"
    ADD CONSTRAINT "chat_usage_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."committees"
    ADD CONSTRAINT "committees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."council_sessions"
    ADD CONSTRAINT "council_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."council_sessions"
    ADD CONSTRAINT "council_sessions_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."expert_registrations"
    ADD CONSTRAINT "expert_registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."faction_stances"
    ADD CONSTRAINT "faction_stances_bill_id_faction_id_key" UNIQUE ("bill_id", "faction_id");



ALTER TABLE ONLY "public"."faction_stances"
    ADD CONSTRAINT "faction_stances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."factions"
    ADD CONSTRAINT "factions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."general_questions"
    ADD CONSTRAINT "general_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interview_configs"
    ADD CONSTRAINT "interview_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interview_messages"
    ADD CONSTRAINT "interview_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interview_questions"
    ADD CONSTRAINT "interview_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interview_report"
    ADD CONSTRAINT "interview_report_interview_session_id_key" UNIQUE ("interview_session_id");



ALTER TABLE ONLY "public"."interview_report"
    ADD CONSTRAINT "interview_report_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interview_sessions"
    ADD CONSTRAINT "interview_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."press_conference_items"
    ADD CONSTRAINT "press_conference_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."press_conference_turns"
    ADD CONSTRAINT "press_conference_turns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."press_conferences"
    ADD CONSTRAINT "press_conferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."press_conferences"
    ADD CONSTRAINT "press_conferences_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."preview_tokens"
    ADD CONSTRAINT "preview_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."preview_tokens"
    ADD CONSTRAINT "preview_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."report_reactions"
    ADD CONSTRAINT "report_reactions_interview_report_id_user_id_key" UNIQUE ("interview_report_id", "user_id");



ALTER TABLE ONLY "public"."report_reactions"
    ADD CONSTRAINT "report_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_label_key" UNIQUE ("label");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topic_analysis_classifications"
    ADD CONSTRAINT "topic_analysis_classification_version_id_interview_report_i_key" UNIQUE ("version_id", "interview_report_id", "topic_id", "opinion_index");



ALTER TABLE ONLY "public"."topic_analysis_classifications"
    ADD CONSTRAINT "topic_analysis_classifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topic_analysis_topics"
    ADD CONSTRAINT "topic_analysis_topics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topic_analysis_versions"
    ADD CONSTRAINT "topic_analysis_versions_bill_id_version_key" UNIQUE ("bill_id", "version");



ALTER TABLE ONLY "public"."topic_analysis_versions"
    ADD CONSTRAINT "topic_analysis_versions_pkey" PRIMARY KEY ("id");



CREATE INDEX "bill_discussions_bill_id_idx" ON "public"."bill_discussions" USING "btree" ("bill_id");



CREATE UNIQUE INDEX "bills_session_number_type_unique" ON "public"."bills" USING "btree" ("council_session_id", "bill_number", "bill_type") WHERE ("bill_number" <> ''::"text");



CREATE INDEX "chat_usage_events_user_id_occurred_at_idx" ON "public"."chat_usage_events" USING "btree" ("user_id", "occurred_at");



CREATE INDEX "general_questions_council_session_id_session_day_question_o_idx" ON "public"."general_questions" USING "btree" ("council_session_id", "session_day", "question_order");



CREATE INDEX "general_questions_publish_status_idx" ON "public"."general_questions" USING "btree" ("publish_status");



CREATE INDEX "idx_bill_contents_bill_id" ON "public"."bill_contents" USING "btree" ("bill_id");



CREATE INDEX "idx_bill_contents_difficulty" ON "public"."bill_contents" USING "btree" ("difficulty_level");



CREATE INDEX "idx_bills_committee_id" ON "public"."bills" USING "btree" ("committee_id");



CREATE INDEX "idx_bills_council_session_id" ON "public"."bills" USING "btree" ("council_session_id");



CREATE INDEX "idx_bills_is_featured" ON "public"."bills" USING "btree" ("is_featured") WHERE ("is_featured" = true);



CREATE INDEX "idx_bills_publish_status" ON "public"."bills" USING "btree" ("publish_status");



CREATE INDEX "idx_bills_publish_status_order" ON "public"."bills" USING "btree" ("publish_status_order");



CREATE INDEX "idx_bills_published_at" ON "public"."bills" USING "btree" ("published_at" DESC);



CREATE INDEX "idx_bills_status" ON "public"."bills" USING "btree" ("status");



CREATE INDEX "idx_bills_status_order" ON "public"."bills" USING "btree" ("status_order");



CREATE INDEX "idx_chats_bill_id" ON "public"."chats" USING "btree" ("bill_id");



CREATE INDEX "idx_chats_bill_user" ON "public"."chats" USING "btree" ("bill_id", "user_id");



CREATE INDEX "idx_chats_created_at" ON "public"."chats" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_chats_user_id" ON "public"."chats" USING "btree" ("user_id");



CREATE INDEX "idx_council_sessions_date_range" ON "public"."council_sessions" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_council_sessions_slug" ON "public"."council_sessions" USING "btree" ("slug");



CREATE UNIQUE INDEX "idx_expert_registrations_email" ON "public"."expert_registrations" USING "btree" ("email");



CREATE UNIQUE INDEX "idx_expert_registrations_user_id" ON "public"."expert_registrations" USING "btree" ("user_id");



CREATE INDEX "idx_faction_stances_bill_id" ON "public"."faction_stances" USING "btree" ("bill_id");



CREATE INDEX "idx_faction_stances_faction_id" ON "public"."faction_stances" USING "btree" ("faction_id");



CREATE INDEX "idx_interview_configs_bill_id" ON "public"."interview_configs" USING "btree" ("bill_id");



CREATE UNIQUE INDEX "idx_interview_configs_bill_public" ON "public"."interview_configs" USING "btree" ("bill_id") WHERE ("status" = 'public'::"public"."interview_config_status_enum");



CREATE INDEX "idx_interview_configs_status" ON "public"."interview_configs" USING "btree" ("status");



CREATE INDEX "idx_interview_messages_session_created" ON "public"."interview_messages" USING "btree" ("interview_session_id", "created_at");



CREATE INDEX "idx_interview_messages_session_id" ON "public"."interview_messages" USING "btree" ("interview_session_id");



CREATE INDEX "idx_interview_questions_config_id" ON "public"."interview_questions" USING "btree" ("interview_config_id");



CREATE INDEX "idx_interview_questions_config_order" ON "public"."interview_questions" USING "btree" ("interview_config_id", "question_order");



CREATE INDEX "idx_interview_report_is_public_by_admin" ON "public"."interview_report" USING "btree" ("is_public_by_admin");



CREATE INDEX "idx_interview_report_total_score" ON "public"."interview_report" USING "btree" ("total_score" DESC NULLS LAST);



CREATE INDEX "idx_interview_sessions_config_id" ON "public"."interview_sessions" USING "btree" ("interview_config_id");



CREATE INDEX "idx_interview_sessions_config_user" ON "public"."interview_sessions" USING "btree" ("interview_config_id", "user_id");



CREATE INDEX "idx_interview_sessions_started_at" ON "public"."interview_sessions" USING "btree" ("started_at");



CREATE INDEX "idx_interview_sessions_user_id" ON "public"."interview_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_preview_tokens_bill_id" ON "public"."preview_tokens" USING "btree" ("bill_id");



CREATE INDEX "idx_preview_tokens_expires_at" ON "public"."preview_tokens" USING "btree" ("expires_at");



CREATE INDEX "idx_preview_tokens_token" ON "public"."preview_tokens" USING "btree" ("token");



CREATE INDEX "idx_report_reactions_report_id" ON "public"."report_reactions" USING "btree" ("interview_report_id");



CREATE INDEX "idx_report_reactions_user_id" ON "public"."report_reactions" USING "btree" ("user_id");



CREATE INDEX "idx_tags_featured_priority" ON "public"."tags" USING "btree" ("featured_priority") WHERE ("featured_priority" IS NOT NULL);



CREATE INDEX "idx_topic_analysis_classifications_topic_id" ON "public"."topic_analysis_classifications" USING "btree" ("topic_id");



CREATE INDEX "idx_topic_analysis_classifications_version_id" ON "public"."topic_analysis_classifications" USING "btree" ("version_id");



CREATE INDEX "idx_topic_analysis_topics_version_id" ON "public"."topic_analysis_topics" USING "btree" ("version_id");



CREATE INDEX "idx_topic_analysis_versions_bill_id" ON "public"."topic_analysis_versions" USING "btree" ("bill_id");



CREATE INDEX "press_conference_items_press_conference_id_order_index_idx" ON "public"."press_conference_items" USING "btree" ("press_conference_id", "order_index");



CREATE INDEX "press_conference_turns_press_conference_item_id_order_index_idx" ON "public"."press_conference_turns" USING "btree" ("press_conference_item_id", "order_index");



CREATE INDEX "press_conferences_held_at_idx" ON "public"."press_conferences" USING "btree" ("held_at" DESC);



CREATE INDEX "press_conferences_slug_idx" ON "public"."press_conferences" USING "btree" ("slug");



CREATE INDEX "press_conferences_status_idx" ON "public"."press_conferences" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "set_committees_updated_at" BEFORE UPDATE ON "public"."committees" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_faction_stances_updated_at" BEFORE UPDATE ON "public"."faction_stances" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_factions_updated_at" BEFORE UPDATE ON "public"."factions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_topic_analysis_versions_updated_at" BEFORE UPDATE ON "public"."topic_analysis_versions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."council_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_bill_contents_updated_at" BEFORE UPDATE ON "public"."bill_contents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_bills_updated_at" BEFORE UPDATE ON "public"."bills" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_chats_updated_at" BEFORE UPDATE ON "public"."chats" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_expert_registrations_updated_at" BEFORE UPDATE ON "public"."expert_registrations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_general_questions_updated_at" BEFORE UPDATE ON "public"."general_questions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_interview_configs_updated_at" BEFORE UPDATE ON "public"."interview_configs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_interview_questions_updated_at" BEFORE UPDATE ON "public"."interview_questions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_interview_report_updated_at" BEFORE UPDATE ON "public"."interview_report" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_interview_sessions_updated_at" BEFORE UPDATE ON "public"."interview_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tags_updated_at" BEFORE UPDATE ON "public"."tags" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."bill_contents"
    ADD CONSTRAINT "bill_contents_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bill_discussions"
    ADD CONSTRAINT "bill_discussions_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_committee_id_fkey" FOREIGN KEY ("committee_id") REFERENCES "public"."committees"("id");



ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_council_session_id_fkey" FOREIGN KEY ("council_session_id") REFERENCES "public"."council_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bills_tags"
    ADD CONSTRAINT "bills_tags_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bills_tags"
    ADD CONSTRAINT "bills_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budget_initiatives"
    ADD CONSTRAINT "budget_initiatives_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "public"."budget_themes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budget_overviews"
    ADD CONSTRAINT "budget_overviews_council_session_id_fkey" FOREIGN KEY ("council_session_id") REFERENCES "public"."council_sessions"("id");



ALTER TABLE ONLY "public"."budget_themes"
    ADD CONSTRAINT "budget_themes_overview_id_fkey" FOREIGN KEY ("overview_id") REFERENCES "public"."budget_overviews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expert_registrations"
    ADD CONSTRAINT "expert_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."faction_stances"
    ADD CONSTRAINT "faction_stances_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."faction_stances"
    ADD CONSTRAINT "faction_stances_faction_id_fkey" FOREIGN KEY ("faction_id") REFERENCES "public"."factions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."general_questions"
    ADD CONSTRAINT "general_questions_council_session_id_fkey" FOREIGN KEY ("council_session_id") REFERENCES "public"."council_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interview_configs"
    ADD CONSTRAINT "interview_configs_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interview_messages"
    ADD CONSTRAINT "interview_messages_interview_session_id_fkey" FOREIGN KEY ("interview_session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interview_questions"
    ADD CONSTRAINT "interview_questions_interview_config_id_fkey" FOREIGN KEY ("interview_config_id") REFERENCES "public"."interview_configs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interview_report"
    ADD CONSTRAINT "interview_report_interview_session_id_fkey" FOREIGN KEY ("interview_session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interview_sessions"
    ADD CONSTRAINT "interview_sessions_interview_config_id_fkey" FOREIGN KEY ("interview_config_id") REFERENCES "public"."interview_configs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."press_conference_items"
    ADD CONSTRAINT "press_conference_items_press_conference_id_fkey" FOREIGN KEY ("press_conference_id") REFERENCES "public"."press_conferences"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."press_conference_turns"
    ADD CONSTRAINT "press_conference_turns_press_conference_item_id_fkey" FOREIGN KEY ("press_conference_item_id") REFERENCES "public"."press_conference_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."preview_tokens"
    ADD CONSTRAINT "preview_tokens_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_reactions"
    ADD CONSTRAINT "report_reactions_interview_report_id_fkey" FOREIGN KEY ("interview_report_id") REFERENCES "public"."interview_report"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_analysis_classifications"
    ADD CONSTRAINT "topic_analysis_classifications_interview_report_id_fkey" FOREIGN KEY ("interview_report_id") REFERENCES "public"."interview_report"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_analysis_classifications"
    ADD CONSTRAINT "topic_analysis_classifications_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topic_analysis_topics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_analysis_classifications"
    ADD CONSTRAINT "topic_analysis_classifications_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "public"."topic_analysis_versions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_analysis_topics"
    ADD CONSTRAINT "topic_analysis_topics_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "public"."topic_analysis_versions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_analysis_versions"
    ADD CONSTRAINT "topic_analysis_versions_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "public"."bills"("id") ON DELETE CASCADE;



ALTER TABLE "public"."bill_contents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bill_discussions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bills_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."budget_initiatives" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."budget_overviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."budget_themes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_usage_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."committees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."council_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expert_registrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."faction_stances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."factions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."general_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."interview_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."interview_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."interview_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."interview_report" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."interview_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."press_conference_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."press_conference_turns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."press_conferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."preview_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."report_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."topic_analysis_classifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."topic_analysis_topics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."topic_analysis_versions" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."count_reactions_by_report_ids"("report_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."count_reactions_by_report_ids"("report_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_reactions_by_report_ids"("report_ids" "uuid"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_admin_users"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_admin_users"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_interview_message_counts"("session_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_interview_message_counts"("session_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_interview_message_counts"("session_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_active_council_session"("target_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_active_council_session"("target_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_active_council_session"("target_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."bill_contents" TO "anon";
GRANT ALL ON TABLE "public"."bill_contents" TO "authenticated";
GRANT ALL ON TABLE "public"."bill_contents" TO "service_role";



GRANT ALL ON TABLE "public"."bill_discussions" TO "anon";
GRANT ALL ON TABLE "public"."bill_discussions" TO "authenticated";
GRANT ALL ON TABLE "public"."bill_discussions" TO "service_role";



GRANT ALL ON TABLE "public"."bills" TO "anon";
GRANT ALL ON TABLE "public"."bills" TO "authenticated";
GRANT ALL ON TABLE "public"."bills" TO "service_role";



GRANT ALL ON TABLE "public"."bills_tags" TO "anon";
GRANT ALL ON TABLE "public"."bills_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."bills_tags" TO "service_role";



GRANT ALL ON TABLE "public"."budget_initiatives" TO "anon";
GRANT ALL ON TABLE "public"."budget_initiatives" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_initiatives" TO "service_role";



GRANT ALL ON TABLE "public"."budget_overviews" TO "anon";
GRANT ALL ON TABLE "public"."budget_overviews" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_overviews" TO "service_role";



GRANT ALL ON TABLE "public"."budget_themes" TO "anon";
GRANT ALL ON TABLE "public"."budget_themes" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_themes" TO "service_role";



GRANT ALL ON TABLE "public"."chat_usage_events" TO "anon";
GRANT ALL ON TABLE "public"."chat_usage_events" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_usage_events" TO "service_role";



GRANT ALL ON TABLE "public"."chats" TO "anon";
GRANT ALL ON TABLE "public"."chats" TO "authenticated";
GRANT ALL ON TABLE "public"."chats" TO "service_role";



GRANT ALL ON TABLE "public"."committees" TO "anon";
GRANT ALL ON TABLE "public"."committees" TO "authenticated";
GRANT ALL ON TABLE "public"."committees" TO "service_role";



GRANT ALL ON TABLE "public"."council_sessions" TO "anon";
GRANT ALL ON TABLE "public"."council_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."council_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."expert_registrations" TO "anon";
GRANT ALL ON TABLE "public"."expert_registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."expert_registrations" TO "service_role";



GRANT ALL ON TABLE "public"."faction_stances" TO "anon";
GRANT ALL ON TABLE "public"."faction_stances" TO "authenticated";
GRANT ALL ON TABLE "public"."faction_stances" TO "service_role";



GRANT ALL ON TABLE "public"."factions" TO "anon";
GRANT ALL ON TABLE "public"."factions" TO "authenticated";
GRANT ALL ON TABLE "public"."factions" TO "service_role";



GRANT ALL ON TABLE "public"."general_questions" TO "anon";
GRANT ALL ON TABLE "public"."general_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."general_questions" TO "service_role";



GRANT ALL ON TABLE "public"."interview_configs" TO "anon";
GRANT ALL ON TABLE "public"."interview_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."interview_configs" TO "service_role";



GRANT ALL ON TABLE "public"."interview_messages" TO "anon";
GRANT ALL ON TABLE "public"."interview_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."interview_messages" TO "service_role";



GRANT ALL ON TABLE "public"."interview_questions" TO "anon";
GRANT ALL ON TABLE "public"."interview_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."interview_questions" TO "service_role";



GRANT ALL ON TABLE "public"."interview_report" TO "anon";
GRANT ALL ON TABLE "public"."interview_report" TO "authenticated";
GRANT ALL ON TABLE "public"."interview_report" TO "service_role";



GRANT ALL ON TABLE "public"."interview_sessions" TO "anon";
GRANT ALL ON TABLE "public"."interview_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."interview_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."press_conference_items" TO "anon";
GRANT ALL ON TABLE "public"."press_conference_items" TO "authenticated";
GRANT ALL ON TABLE "public"."press_conference_items" TO "service_role";



GRANT ALL ON TABLE "public"."press_conference_turns" TO "anon";
GRANT ALL ON TABLE "public"."press_conference_turns" TO "authenticated";
GRANT ALL ON TABLE "public"."press_conference_turns" TO "service_role";



GRANT ALL ON TABLE "public"."press_conferences" TO "anon";
GRANT ALL ON TABLE "public"."press_conferences" TO "authenticated";
GRANT ALL ON TABLE "public"."press_conferences" TO "service_role";



GRANT ALL ON TABLE "public"."preview_tokens" TO "anon";
GRANT ALL ON TABLE "public"."preview_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."preview_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."report_reactions" TO "anon";
GRANT ALL ON TABLE "public"."report_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."report_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



GRANT ALL ON TABLE "public"."topic_analysis_classifications" TO "anon";
GRANT ALL ON TABLE "public"."topic_analysis_classifications" TO "authenticated";
GRANT ALL ON TABLE "public"."topic_analysis_classifications" TO "service_role";



GRANT ALL ON TABLE "public"."topic_analysis_topics" TO "anon";
GRANT ALL ON TABLE "public"."topic_analysis_topics" TO "authenticated";
GRANT ALL ON TABLE "public"."topic_analysis_topics" TO "service_role";



GRANT ALL ON TABLE "public"."topic_analysis_versions" TO "anon";
GRANT ALL ON TABLE "public"."topic_analysis_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."topic_analysis_versions" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";








-- ============================================================
-- Storage: bill-thumbnails バケットとポリシー
-- ============================================================
insert into storage.buckets (id, name, public)
  values ('bill-thumbnails', 'bill-thumbnails', true);

create policy "Public Access" on storage.objects
  for select using (bucket_id = 'bill-thumbnails');
create policy "Admin users can upload bill thumbnails" on storage.objects
  for insert with check (bucket_id = 'bill-thumbnails' and public.is_admin());
create policy "Admin users can update bill thumbnails" on storage.objects
  for update using (bucket_id = 'bill-thumbnails' and public.is_admin());
create policy "Admin users can delete bill thumbnails" on storage.objects
  for delete using (bucket_id = 'bill-thumbnails' and public.is_admin());

-- ============================================================
-- 関数権限: get_admin_users は service_role のみ実行可
-- （Supabase の ALTER DEFAULT PRIVILEGES で anon/authenticated に
--   自動付与される EXECUTE を明示的に REVOKE する）
-- ============================================================
revoke execute on function public.get_admin_users() from public;
revoke execute on function public.get_admin_users() from anon;
revoke execute on function public.get_admin_users() from authenticated;
grant execute on function public.get_admin_users() to service_role;
