import "server-only";
import { createAdminClient } from "@dejimin-gikai/supabase";
import { createAuditedAdminClient } from "@/features/audit-logs/server/lib/create-audited-admin-client";
import type { AuditActor } from "@/features/audit-logs/shared/utils/audit-actor";
import { isUuid } from "@/lib/utils/is-uuid";
import type {
  PlazaTopicRow,
  PlazaTopicSummaryRow,
} from "../../shared/types/plaza-topic";
import type { TopicActor } from "../../shared/utils/topic-permissions";
import type { NormalizedTopicInput } from "../../shared/utils/validate-topic-input";

/** 作成者の現在のプロフィール（下書きの作成者の表示に使う） */
const AUTHOR_SELECT =
  "author:admin_profiles(display_name, role, faction:factions(display_name))";

/** 詳細で読む列（本文つき） */
const TOPIC_SELECT = `*, ${AUTHOR_SELECT}`;

/** 一覧で読む列。本文（最大2万字）は一覧に出さないので読まない */
const TOPIC_SUMMARY_SELECT = `id, author_user_id, title, status, opened_at, closes_at, closed_at, closed_reason, author_display_name, author_role, author_faction_name, withdrawn_at, withdrawn_reason, created_at, updated_at, ${AUTHOR_SELECT}`;

/**
 * その人が見てよい議題をすべて読む
 *
 * 運営者は全件。議員・出馬者は、自分の議題と、ほかの人の下書き以外（K1）。
 * 画面の側でも canViewTopic で絞るが、ほかの人の下書きはそもそも読まない。
 */
export async function findTopicsVisibleTo(
  actor: TopicActor
): Promise<PlazaTopicSummaryRow[]> {
  const supabase = createAdminClient();
  let query = supabase.from("interview_topics").select(TOPIC_SUMMARY_SELECT);

  if (actor.role !== "admin") {
    // フィルタの文字列に埋め込むので、UUID の形であることを確かめておく
    if (!isUuid(actor.id)) {
      throw new Error("Invalid user id");
    }
    query = query.or(`author_user_id.eq.${actor.id},status.neq.draft`);
  }

  // 並び順は画面の側（groupTopicsByStatus）で決める。ここは読む順を安定させるだけ
  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .order("id", { ascending: true });
  if (error) {
    throw new Error(`Failed to fetch interview topics: ${error.message}`, {
      cause: error,
    });
  }
  return data ?? [];
}

/** 議題を1件読む。無ければ null */
export async function findTopicById(id: string): Promise<PlazaTopicRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_topics")
    .select(TOPIC_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch interview topic: ${error.message}`, {
      cause: error,
    });
  }
  return data;
}

/** 下書きの議題を作り、ID を返す（監査ログに実行者が残る） */
export async function insertDraftTopic(
  actor: AuditActor,
  input: NormalizedTopicInput
): Promise<string> {
  const supabase = createAuditedAdminClient(actor);
  const { data, error } = await supabase
    .from("interview_topics")
    .insert({
      author_user_id: actor.id,
      title: input.title,
      body_md: input.bodyMd,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create interview topic: ${error.message}`, {
      cause: error,
    });
  }
  return data.id;
}

/**
 * 自分の下書きのタイトルと本文を変える（監査ログに実行者が残る）
 *
 * 作成者と状態も条件に入れて書き込む。読んでから書くまでの間にオープンされた場合などに、
 * 書き込まずに false を返す（権限の判定は呼び出し側で先に行う）。
 */
export async function updateOwnDraftTopic(
  actor: AuditActor,
  id: string,
  input: NormalizedTopicInput
): Promise<boolean> {
  const supabase = createAuditedAdminClient(actor);
  const { data, error } = await supabase
    .from("interview_topics")
    .update({ title: input.title, body_md: input.bodyMd })
    .eq("id", id)
    .eq("author_user_id", actor.id)
    .eq("status", "draft")
    .select("id");

  if (error) {
    throw new Error(`Failed to update interview topic: ${error.message}`, {
      cause: error,
    });
  }
  return (data ?? []).length > 0;
}

/**
 * 自分の下書きを消す（監査ログに実行者が残る）
 *
 * 更新と同じく、作成者と状態を条件に入れる。消せなければ false。
 * 議題に紐づくインタビュー設定は、外部キーの on delete cascade で一緒に消える。
 */
export async function deleteOwnDraftTopic(
  actor: AuditActor,
  id: string
): Promise<boolean> {
  const supabase = createAuditedAdminClient(actor);
  const { data, error } = await supabase
    .from("interview_topics")
    .delete()
    .eq("id", id)
    .eq("author_user_id", actor.id)
    .eq("status", "draft")
    .select("id");

  if (error) {
    throw new Error(`Failed to delete interview topic: ${error.message}`, {
      cause: error,
    });
  }
  return (data ?? []).length > 0;
}
