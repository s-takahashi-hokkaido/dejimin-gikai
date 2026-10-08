import "server-only";
import { createAdminClient } from "@dejimin-gikai/supabase";
import type {
  GeneralQuestion,
  SessionQuestionOverview,
} from "../../shared/types";
import { parseSessionOverview } from "../../shared/utils/parse-session-overview";

export async function findPublishedGeneralQuestionsBySession(
  sessionId: string
): Promise<GeneralQuestion[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("general_questions")
    .select("*")
    .eq("council_session_id", sessionId)
    .eq("publish_status", "published")
    .order("session_day", { ascending: true })
    .order("question_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch general questions: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    ...row,
    topics: Array.isArray(row.topics) ? row.topics : [],
  })) as GeneralQuestion[];
}

export async function findLatestSessionSlugWithPublishedQuestions(): Promise<
  string | null
> {
  const supabase = createAdminClient();

  const { data: rows, error: qErr } = await supabase
    .from("general_questions")
    .select("council_session_id")
    .eq("publish_status", "published");

  if (qErr || !rows?.length) return null;

  const ids = [
    ...new Set(
      rows.map((r: { council_session_id: string }) => r.council_session_id)
    ),
  ];

  const { data: session, error: sErr } = await supabase
    .from("council_sessions")
    .select("slug")
    .in("id", ids)
    .order("start_date", { ascending: false })
    .limit(1)
    .single();

  if (sErr) return null;
  return session?.slug ?? null;
}

export async function findPublishedGeneralQuestionById(
  id: string
): Promise<GeneralQuestion | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("general_questions")
    .select("*")
    .eq("id", id)
    .eq("publish_status", "published")
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch general question: ${error.message}`);
  }

  return {
    ...data,
    topics: Array.isArray(data.topics) ? data.topics : [],
  } as GeneralQuestion;
}

/**
 * 定例会ごとの3行まとめ（全体の3行＋テーマ別の3行）を取得する。
 * 未作成なら lines=null / themeLines={} を返す。
 */
export async function findGeneralQuestionOverviewBySession(
  sessionId: string
): Promise<SessionQuestionOverview> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("general_question_overviews")
    .select("lines, theme_lines")
    .eq("council_session_id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to fetch general question overview: ${error.message}`
    );
  }

  return parseSessionOverview(data);
}
