import type { Database } from "@dejimin-gikai/supabase";

export type AuditLog = Database["public"]["Tables"]["admin_audit_logs"]["Row"];

/** before_data / after_data に入る JSON の値 */
export type AuditJson = AuditLog["before_data"];

/** 監査ログを記録しているテーブル（トリガーを張っているもの） */
export const AUDIT_TARGET_TABLES = [
  "bills",
  "bill_contents",
  "faction_stances",
] as const;

export type AuditTargetTable = (typeof AUDIT_TARGET_TABLES)[number];

export type AuditLogFilters = {
  table: AuditTargetTable | null;
  billId: string | null;
  page: number;
};

/** 一覧の1行。議案名・会派名は表示用に解決したもの */
export type AuditLogListItem = AuditLog & {
  billName: string | null;
  factionName: string | null;
};
