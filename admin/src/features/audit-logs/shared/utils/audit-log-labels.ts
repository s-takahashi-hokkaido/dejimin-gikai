import type { AuditJson, AuditLog, AuditTargetTable } from "../types";

export const AUDIT_TABLE_LABELS: Record<AuditTargetTable, string> = {
  bills: "議案マスタ",
  bill_contents: "議案コンテンツ",
  faction_stances: "会派見解",
  bill_committees: "付託委員会",
  admin_profiles: "アカウント",
  interview_topics: "議題（AIインタビュー広場）",
};

const OPERATION_LABELS: Record<string, string> = {
  insert: "作成",
  update: "更新",
  delete: "削除",
};

/** 列名の表示名。無いものは列名をそのまま出す */
const FIELD_LABELS: Record<string, string> = {
  // bills
  name: "議案名",
  status: "ステータス",
  status_note: "ステータス備考",
  published_at: "公開日時",
  submitted_date: "提出年月日",
  decided_date: "議決年月日",
  thumbnail_url: "サムネイル画像URL",
  publish_status: "公開状態",
  is_featured: "注目",
  is_review_completed: "解説の確認済み",
  share_thumbnail_url: "シェア用画像URL",
  council_session_id: "定例会",
  committee_id: "委員会",
  bill_number: "議案番号",
  source_url: "出典URL",
  bill_type: "議案種別",
  discussion_overview_points: "議論概要ポイント",
  // bill_contents
  bill_id: "議案",
  difficulty_level: "難易度",
  title: "タイトル",
  summary: "要約",
  content: "本文",
  // faction_stances（faction_id は admin_profiles の所属会派も兼ねる）
  faction_id: "会派",
  type: "賛否",
  comment: "コメント",
  // admin_profiles
  user_id: "ユーザーID",
  role: "ロール",
  display_name: "表示名",
  // interview_topics（title・status は上の表示名を使う）
  author_user_id: "作成者",
  body_md: "本文（Markdown）",
  opened_at: "オープン日時",
  closes_at: "自動クローズの期限",
  closed_at: "クローズ日時",
  closed_reason: "クローズの理由",
  author_display_name: "作成者の表示名（オープン時点）",
  author_role: "作成者のロール（オープン時点）",
  author_faction_name: "作成者の会派名（オープン時点）",
  withdrawn_at: "取り下げ日時",
  withdrawn_reason: "取り下げの理由",
};

/** ロールを値に持つ列（表示名に変えて出す） */
const ROLE_FIELDS = new Set(["role", "author_role"]);

const DIFFICULTY_LABELS: Record<string, string> = {
  normal: "ふつう",
  hard: "難しい",
};

/** 議案コンテンツの難易度の表示名 */
export function formatDifficultyLevel(value: AuditJson | undefined): string {
  if (typeof value !== "string") return "";
  return DIFFICULTY_LABELS[value] ?? value;
}

/** action（例: bill_contents.update）を「議案コンテンツ」「更新」に分ける */
export function describeAuditAction(action: string): {
  tableLabel: string;
  operationLabel: string;
} {
  const separator = action.lastIndexOf(".");
  const table = separator >= 0 ? action.slice(0, separator) : action;
  const operation = separator >= 0 ? action.slice(separator + 1) : "";

  return {
    tableLabel: AUDIT_TABLE_LABELS[table as AuditTargetTable] ?? table,
    operationLabel: OPERATION_LABELS[operation] ?? operation,
  };
}

export function getAuditFieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

/** 実行者の表示。actor が無いのは SQL・スクリプトによる直接操作 */
export function formatAuditActor(
  log: Pick<AuditLog, "actor_email" | "actor_role">,
  roleLabels: Record<string, string>
): string {
  if (!log.actor_email) {
    return "直接操作（SQL・スクリプト）";
  }
  const role = log.actor_role
    ? (roleLabels[log.actor_role] ?? log.actor_role)
    : null;
  return role ? `${log.actor_email}（${role}）` : log.actor_email;
}

/** 列の値を表示用の文字列にする */
export function formatAuditValue(value: AuditJson | undefined): string {
  if (value === undefined || value === null) {
    return "（なし）";
  }
  if (typeof value === "string") {
    return value === "" ? "（空）" : value;
  }
  if (typeof value === "boolean") {
    return value ? "はい" : "いいえ";
  }
  if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
    return value.length === 0 ? "（空）" : value.join("\n");
  }
  return JSON.stringify(value, null, 2);
}

/** 列の値を表示用の文字列にする。アカウント・議題の作成者のロールは表示名にする */
export function formatAuditFieldValue(
  field: string,
  value: AuditJson | undefined,
  roleLabels: Record<string, string>
): string {
  if (ROLE_FIELDS.has(field) && typeof value === "string") {
    return roleLabels[value] ?? value;
  }
  return formatAuditValue(value);
}
