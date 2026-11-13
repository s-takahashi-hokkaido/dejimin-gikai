import "server-only";

import { createAdminClient } from "@dejimin-gikai/supabase";
import type { InterviewConfig, InterviewQuestion } from "../../shared/types";

export async function findInterviewConfigsByBillId(
  billId: string
): Promise<InterviewConfig[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_configs")
    .select("*")
    .eq("bill_id", billId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch interview configs: ${error.message}`);
  }

  return data;
}

export async function findInterviewConfigById(
  configId: string
): Promise<InterviewConfig | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_configs")
    .select("*")
    .eq("id", configId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to fetch interview config: ${error.message}`);
  }

  return data;
}

/**
 * 議案のインタビュー設定の bill_id を取得する
 *
 * 議題（AIインタビュー広場）の設定は bill_id を持たないので、議案の設定でなければ例外にする。
 */
export async function findInterviewConfigBillId(
  configId: string
): Promise<{ bill_id: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_configs")
    .select("bill_id")
    .eq("id", configId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch interview config: ${error.message}`);
  }

  if (data.bill_id === null) {
    throw new Error("議案のインタビュー設定ではありません");
  }

  return { bill_id: data.bill_id };
}

export async function findInterviewQuestionsByConfigId(
  interviewConfigId: string
): Promise<InterviewQuestion[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_questions")
    .select("*")
    .eq("interview_config_id", interviewConfigId)
    .order("question_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch interview questions: ${error.message}`);
  }

  return data;
}

export async function closeOtherPublicConfigs(
  billId: string,
  excludeConfigId?: string
): Promise<void> {
  const supabase = createAdminClient();
  const query = supabase
    .from("interview_configs")
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .eq("bill_id", billId)
    .eq("status", "public");

  if (excludeConfigId) {
    query.neq("id", excludeConfigId);
  }

  await query;
}

export async function createInterviewConfigRecord(params: {
  bill_id: string;
  name: string;
  status: "public" | "closed";
  mode: "loop" | "bulk";
  themes: string[] | null;
  knowledge_source: string | null;
  chat_model: string | null;
  estimated_duration: number | null;
}): Promise<{ id: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_configs")
    .insert(params)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create interview config: ${error.message}`);
  }

  return data;
}

export async function updateInterviewConfigRecord(
  configId: string,
  params: {
    name: string;
    status: "public" | "closed";
    mode: "loop" | "bulk";
    themes: string[] | null;
    knowledge_source: string | null;
    chat_model: string | null;
    estimated_duration: number | null;
    updated_at: string;
  }
): Promise<{ id: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_configs")
    .update(params)
    .eq("id", configId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update interview config: ${error.message}`);
  }

  return data;
}

export async function deleteInterviewConfigRecord(
  configId: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("interview_configs")
    .delete()
    .eq("id", configId);

  if (error) {
    throw new Error(`Failed to delete interview config: ${error.message}`);
  }
}

export async function createInterviewQuestions(
  questions: {
    interview_config_id: string;
    question: string;
    follow_up_guide: string | null;
    quick_replies: string[] | null;
    question_order: number;
  }[]
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("interview_questions")
    .insert(questions);

  if (error) {
    throw new Error(`Failed to create interview questions: ${error.message}`);
  }
}

export async function deleteInterviewQuestionsByConfigId(
  interviewConfigId: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("interview_questions")
    .delete()
    .eq("interview_config_id", interviewConfigId);

  if (error) {
    throw new Error(`Failed to delete interview questions: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// 議題（AIインタビュー広場）のインタビュー設定。議題ごとに1つだけ持つ
// ---------------------------------------------------------------------------

/** 議題の設定に入れる値（作成者が触れない項目は固定。plaza-topics の buildTopicInterviewConfigRecord で作る） */
export type TopicInterviewConfigRecord = {
  name: string;
  status: "public" | "closed";
  mode: "loop" | "bulk";
  themes: string[] | null;
  knowledge_source: string | null;
  chat_model: string | null;
  estimated_duration: number | null;
};

const UNIQUE_VIOLATION = "23505";

/** 議題のインタビュー設定を読む。無ければ null */
export async function findInterviewConfigByTopicId(
  topicId: string
): Promise<InterviewConfig | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_configs")
    .select("*")
    .eq("interview_topic_id", topicId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch topic interview config: ${error.message}`);
  }

  return data;
}

/** その設定でインタビューが始まっているか（セッションが1件でもあるか。やり直しでアーカイブされたものも数える） */
export async function hasInterviewSessionsByConfigId(
  configId: string
): Promise<boolean> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("interview_sessions")
    .select("id", { count: "exact", head: true })
    .eq("interview_config_id", configId);

  if (error) {
    throw new Error(`Failed to count interview sessions: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

/**
 * 議題のインタビュー設定を作るか、あれば更新し、設定の ID を返す
 *
 * 同時に2回作ろうとした場合は、議題ごとに1つのユニーク制約で後の作成が失敗するので、
 * そのときは先にできた設定を更新する。
 */
export async function upsertTopicInterviewConfigRecord(
  topicId: string,
  record: TopicInterviewConfigRecord
): Promise<{ id: string }> {
  const supabase = createAdminClient();
  const existing = await findInterviewConfigByTopicId(topicId);

  if (!existing) {
    const { data, error } = await supabase
      .from("interview_configs")
      .insert({ ...record, interview_topic_id: topicId })
      .select("id")
      .single();

    if (!error) {
      return data;
    }
    if (error.code !== UNIQUE_VIOLATION) {
      throw new Error(
        `Failed to create topic interview config: ${error.message}`
      );
    }
  }

  const { data, error } = await supabase
    .from("interview_configs")
    .update({ ...record, updated_at: new Date().toISOString() })
    .eq("interview_topic_id", topicId)
    .select("id")
    .single();

  if (error) {
    throw new Error(
      `Failed to update topic interview config: ${error.message}`
    );
  }

  return data;
}
