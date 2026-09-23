import "server-only";

import { createAdminClient } from "@dejimin-gikai/supabase";
import type { CouncilSession } from "../../shared/types";

/**
 * アクティブな定例会を取得
 */
export async function findActiveCouncilSession(): Promise<CouncilSession | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("council_sessions")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch active council session:", error);
    return null;
  }

  return data;
}

/**
 * 指定日時点で開催中の定例会を取得
 */
export async function findCurrentCouncilSession(
  targetDate: string
): Promise<CouncilSession | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("council_sessions")
    .select("*")
    .lte("start_date", targetDate)
    .or(`end_date.gte.${targetDate},end_date.is.null`)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch current council session:", error);
    return null;
  }

  return data;
}

/**
 * 全定例会を新しい順に取得（アクティブなものを除く、公開済み議案が1件以上あるもののみ）
 */
export async function findAllPastCouncilSessions(): Promise<CouncilSession[]> {
  const supabase = createAdminClient();

  // bills テーブルから published な議案がある会期IDを取得
  const { data: billData, error: billError } = await supabase
    .from("bills")
    .select("council_session_id")
    .eq("publish_status", "published");

  if (billError) {
    console.error("Failed to fetch published bills:", billError);
    return [];
  }

  const sessionIds = [
    ...new Set(
      (billData ?? [])
        .map((b) => b.council_session_id)
        .filter((id): id is string => id !== null)
    ),
  ];

  if (sessionIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("council_sessions")
    .select("*")
    .eq("is_active", false)
    .in("id", sessionIds)
    .order("start_date", { ascending: false });

  if (error) {
    console.error("Failed to fetch past council sessions:", error);
    return [];
  }

  return (data ?? []) as CouncilSession[];
}

/**
 * IDで定例会を取得
 */
export async function findCouncilSessionById(
  id: string
): Promise<CouncilSession | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("council_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch council session by id:", error);
    return null;
  }

  return data;
}

/**
 * 指定日より前の直近の定例会を取得
 */
export async function findPreviousCouncilSession(
  beforeStartDate: string
): Promise<CouncilSession | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("council_sessions")
    .select("*")
    .lt("start_date", beforeStartDate)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch previous council session:", error);
    return null;
  }

  return data;
}
