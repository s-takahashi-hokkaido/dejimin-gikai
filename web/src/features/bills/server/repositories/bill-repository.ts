import "server-only";
import { createAdminClient } from "@dejimin-gikai/supabase";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import type { MiraiStance } from "../../shared/types";

// ============================================================
// Bills
// ============================================================

/**
 * 公開済み議案を難易度コンテンツ・タグ付きで取得
 *
 * タグは埋め込みで一緒に引く。全議案の id を `.in()` に並べて別に引くと、
 * 議案が増えるにつれてリクエストの URL が伸び、nginx の上限（既定 8KB、
 * 200件ほど）を超えて取得ごと失敗する。
 */
export async function findPublishedBillsWithContents(
  difficultyLevel: DifficultyLevelEnum
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select(
      `
      *,
      bill_contents!inner (
        id,
        bill_id,
        title,
        summary,
        content,
        difficulty_level,
        created_at,
        updated_at
      ),
      bills_tags (
        tags (
          id,
          label
        )
      )
    `
    )
    .eq("publish_status", "published")
    .eq("bill_contents.difficulty_level", difficultyLevel)
    .order("published_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch bills: ${error.message}`);
  }

  return data;
}

/** Supabase が1リクエストで返す行数の上限（既定値）。 */
const SUPABASE_MAX_ROWS = 1000;

/**
 * 検索候補用に、公開済み議案の名称・番号・タイトル・タグだけを取得する。
 *
 * `findPublishedBillsWithContents` は解説本文（数KB／件）まで引くため、候補の
 * 絞り込みに使うには重すぎる。ここは候補行に出す最小限だけを選ぶ。
 */
export async function findPublishedBillsForSuggest(
  difficultyLevel: DifficultyLevelEnum
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select(
      `
      id,
      name,
      bill_number,
      bill_contents!inner (title),
      bills_tags (tags (id, label))
    `
    )
    .eq("publish_status", "published")
    .eq("bill_contents.difficulty_level", difficultyLevel)
    // 提出日は定例会ごとに数十件が同じ値を持つので、番号と id で順序を固定する。
    // 候補は上位数件で打ち切るため、並びが揺れると出る候補そのものが変わる。
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("bill_number", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    // 候補は検索の補助なので、落とさずに空で返して検索自体は使える状態にする。
    console.error("Failed to fetch bills for suggest:", error);
    return [];
  }

  const rows = data ?? [];
  // Supabase は max_rows を超えた行を返さない。到達したら古い議案が候補から
  // 静かに落ちるので、気づけるようにログを残す。
  if (rows.length >= SUPABASE_MAX_ROWS) {
    console.warn(
      `findPublishedBillsForSuggest hit the row limit (${SUPABASE_MAX_ROWS}). ` +
        "候補から漏れる議案が出ているため、サーバー側検索への移行を検討する。"
    );
  }

  return rows;
}

/**
 * 公開済み議案を1件取得
 */
export async function findPublishedBillById(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .eq("id", id)
    .eq("publish_status", "published")
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * 管理者用: ステータス問わず議案を1件取得
 */
export async function findBillById(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * 議案のmirai_stanceを取得
 * 札幌市議会DBにはmirai_stancesテーブルが存在しないため常にnullを返す
 */
export async function findMiraiStanceByBillId(
  _billId: string
): Promise<MiraiStance | null> {
  return null;
}

/**
 * 議案に紐づく会派見解を取得
 */
export async function findFactionStancesByBillId(billId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("faction_stances")
    .select(
      `
      id,
      type,
      comment,
      factions (
        id,
        name,
        display_name,
        sort_order
      )
    `
    )
    .eq("bill_id", billId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(`Failed to fetch faction stances: ${error.message}`);
    return [];
  }

  return data ?? [];
}

/**
 * 議案のタグを取得
 */
export async function findTagsByBillId(billId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills_tags")
    .select("tags(id, label)")
    .eq("bill_id", billId);

  if (error) {
    return null;
  }

  return data;
}

// ============================================================
// Bill Contents
// ============================================================

/**
 * 指定された難易度の議案コンテンツを取得
 */
export async function findBillContentByDifficulty(
  billId: string,
  difficultyLevel: DifficultyLevelEnum
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bill_contents")
    .select("*")
    .eq("bill_id", billId)
    .eq("difficulty_level", difficultyLevel)
    .single();

  if (error) {
    console.error(`Failed to fetch bill content: ${error.message}`);
    return null;
  }

  return data;
}

// ============================================================
// Tags (bulk)
// ============================================================

import { groupTagsByBillId } from "../../shared/utils/group-tags";

/**
 * 複数のbill_idに紐づくタグを一括取得し、bill_idごとにグループ化して返す
 */
export async function findTagsByBillIds(
  billIds: string[]
): Promise<Map<string, Array<{ id: string; label: string }>>> {
  if (billIds.length === 0) {
    return new Map();
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills_tags")
    .select("bill_id, tags(id, label)")
    .in("bill_id", billIds);

  if (error) {
    throw new Error(`Failed to fetch tags: ${error.message}`);
  }

  return groupTagsByBillId(data ?? []);
}

// ============================================================
// Council Session Bills
// ============================================================

/**
 * 定例会IDに紐づく公開済み議案を取得
 */
export async function findPublishedBillsByDietSession(
  councilSessionId: string,
  difficultyLevel: DifficultyLevelEnum
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select(
      `
      *,
      bill_contents!inner (
        id,
        bill_id,
        title,
        summary,
        content,
        difficulty_level,
        created_at,
        updated_at
      )
    `
    )
    .eq("council_session_id", councilSessionId)
    .eq("publish_status", "published")
    .eq("bill_contents.difficulty_level", difficultyLevel)
    .order("status_order", { ascending: true })
    .order("published_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to fetch bills by council session: ${error.message}`
    );
  }

  return data;
}

/**
 * 前回の定例会の公開済み議案を取得（件数制限あり）
 */
export async function findPreviousSessionBills(
  councilSessionId: string,
  difficultyLevel: DifficultyLevelEnum,
  limit: number
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select(
      `
      *,
      bill_contents!inner (
        id,
        bill_id,
        title,
        summary,
        content,
        difficulty_level,
        created_at,
        updated_at
      )
    `
    )
    .eq("council_session_id", councilSessionId)
    .eq("publish_status", "published")
    .eq("bill_contents.difficulty_level", difficultyLevel)
    .order("status_order", { ascending: true })
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch previous session bills:", error);
    return [];
  }

  return data ?? [];
}

/**
 * 前回の定例会の公開済み議案数を取得
 */
export async function countPublishedBillsByDietSession(
  councilSessionId: string,
  difficultyLevel: DifficultyLevelEnum
): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("bills")
    .select("*, bill_contents!inner(difficulty_level)", {
      count: "exact",
      head: true,
    })
    .eq("council_session_id", councilSessionId)
    .eq("publish_status", "published")
    .eq("bill_contents.difficulty_level", difficultyLevel);

  if (error) {
    console.error("Failed to count previous session bills:", error);
    return 0;
  }

  return count ?? 0;
}

// ============================================================
// Featured
// ============================================================

/**
 * featured_priorityが設定されているタグを取得
 *
 * 取得に失敗したときは `null` を返す。0件と区別できないと、呼び出し側が
 * 「タグが無い」としてキャッシュに載せてしまい、一時的なエラーで絞り込みが
 * 消えたまま固定される。
 */
export async function findFeaturedTags() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tags")
    .select("id, label, description, featured_priority")
    .not("featured_priority", "is", null)
    // 同じ優先度のタグは label で並べる。指定しないと順序が不定で、
    // カテゴリタブの並びがデプロイごとに入れ替わりうる。
    .order("featured_priority", { ascending: true })
    .order("label", { ascending: true });

  if (error) {
    console.error("Failed to fetch featured tags:", error);
    return null;
  }

  return data ?? [];
}

/**
 * 特定タグに紐づく公開済み議案を取得（bill_contents + タグ付き）
 */
export async function findPublishedBillsByTag(
  tagId: string,
  difficultyLevel: DifficultyLevelEnum,
  councilSessionId: string | null
) {
  const supabase = createAdminClient();
  let query = supabase
    .from("bills_tags")
    .select(
      `
      bill_id,
      bills!inner (
        *,
        bill_contents!inner (
          id,
          bill_id,
          title,
          summary,
          content,
          difficulty_level,
          created_at,
          updated_at
        ),
        bills_tags!inner (
          tags (
            id,
            label
          )
        )
      )
    `
    )
    .eq("tag_id", tagId)
    .eq("bills.publish_status", "published")
    .eq("bills.bill_contents.difficulty_level", difficultyLevel);

  if (councilSessionId) {
    query = query.eq("bills.council_session_id", councilSessionId);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Failed to fetch bills for tag:`, error);
    return null;
  }

  return data;
}

/**
 * 注目の議案を取得（公開済みかつ is_featured = true）
 */
export async function findFeaturedBillsWithContents(
  difficultyLevel: DifficultyLevelEnum,
  councilSessionId: string | null
) {
  const supabase = createAdminClient();
  let query = supabase
    .from("bills")
    .select(
      `
      *,
      bill_contents!inner (
        id,
        bill_id,
        title,
        summary,
        content,
        difficulty_level,
        created_at,
        updated_at
      ),
      tags:bills_tags(
        tag:tags(
          id,
          label
        )
      )
    `
    )
    .eq("publish_status", "published")
    .eq("is_featured", true)
    .eq("bill_contents.difficulty_level", difficultyLevel)
    .order("published_at", { ascending: false });

  if (councilSessionId) {
    query = query.eq("council_session_id", councilSessionId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch featured bills:", error);
    return [];
  }

  return data ?? [];
}

// ============================================================
// AI Interview
// ============================================================

/**
 * AIインタビューを受付中の公開済み議案を取得
 *
 * 受付中の判定は「status = public の interview_configs があること」。
 * 公開設定は1議案に1件しか作れない（idx_interview_configs_bill_public）ので、
 * inner join でも議案の行が重複しない。
 *
 * 既に議案の配列を持っている場合は `findBillIdsWithPublicInterview` で受付中の
 * 印を付けるだけで済む。こちらは「受付中の議案そのもの」を引くためのもの。
 *
 * 定例会では絞らない。インタビューの受付は会期の開閉とは独立に運用され、
 * 閉会中でも受付中のものは受付中として案内したいため。
 *
 * 解説本文（content）は引かない。数KB／件あるのに、カードが出すのは
 * タイトルと要約だけで、キャッシュにその分が丸ごと残ってしまう。
 */
export async function findBillsWithPublicInterview(
  difficultyLevel: DifficultyLevelEnum
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bills")
    .select(
      `
      *,
      bill_contents!inner (
        id,
        bill_id,
        title,
        summary,
        difficulty_level,
        created_at,
        updated_at
      ),
      bills_tags (
        tags (
          id,
          label
        )
      ),
      interview_configs!inner (
        id
      )
    `
    )
    .eq("publish_status", "published")
    .eq("bill_contents.difficulty_level", difficultyLevel)
    .eq("interview_configs.status", "public")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("bill_number", { ascending: true });

  // 空配列に潰さず投げる。呼び出し元は unstable_cache の外で受けるので、
  // 一時的なDBエラーが「0件」としてキャッシュに載ることを避けられる。
  if (error) {
    throw new Error(
      `Failed to fetch bills with public interview: ${error.message}`
    );
  }

  const rows = data ?? [];
  // Supabase は max_rows を超えた行を返さない。到達したら受付中の議案が
  // セクションから静かに落ちるので、気づけるようにログを残す。
  if (rows.length >= SUPABASE_MAX_ROWS) {
    console.warn(
      `findBillsWithPublicInterview hit the row limit (${SUPABASE_MAX_ROWS}).`
    );
  }

  return rows;
}

/**
 * 公開中のインタビュー設定を持つ議案の id をすべて取得
 *
 * 一覧の議案に受付中の印を付けるために使う。受付中の設定は1議案に1件までで
 * 全体でもごく少ないので、議案の id で絞らずに全件引く。全議案の id を
 * `.in()` に並べると、議案が増えたときに URL が上限を超える。
 *
 * status="public" のみで判定する。受付を終えた設定は status="closed" になる。
 */
export async function findBillIdsWithPublicInterview(): Promise<Set<string>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_configs")
    .select("bill_id")
    .eq("status", "public");

  if (error) {
    console.error("Failed to fetch interview configs:", error);
    return new Set();
  }

  return new Set(data.map((row) => row.bill_id));
}

// ============================================================
// Coming Soon
// ============================================================

/**
 * Coming Soon議案を取得
 */
export async function findComingSoonBills(councilSessionId: string | null) {
  const supabase = createAdminClient();
  let query = supabase
    .from("bills")
    .select(
      `
      id,
      name,
      bill_contents (
        title,
        difficulty_level
      ),
      council_sessions (
        council_url
      )
    `
    )
    .eq("publish_status", "coming_soon")
    .order("created_at", { ascending: false });

  if (councilSessionId) {
    query = query.eq("council_session_id", councilSessionId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch coming soon bills:", error);
    return [];
  }

  return data ?? [];
}

// ============================================================
// Preview Tokens
// ============================================================

/**
 * プレビュートークンを検証
 */
export async function findPreviewToken(billId: string, token: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("preview_tokens")
    .select("expires_at")
    .eq("bill_id", billId)
    .eq("token", token)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * 議案に紐づく質疑情報を取得
 */
export async function findDiscussionsByBillId(billId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bill_discussions")
    .select("*")
    .eq("bill_id", billId)
    .order("session_day", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error(`Failed to fetch bill discussions: ${error.message}`);
    return [];
  }

  return data ?? [];
}
