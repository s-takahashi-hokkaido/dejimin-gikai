import type { AuditJson, AuditLog, AuditLogListItem } from "../types";

function readString(data: AuditJson | null, key: string): string | null {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const value = data[key];
    return typeof value === "string" ? value : null;
  }
  return null;
}

/** 行の変更後（削除なら変更前）の列の値 */
function readLogField(log: AuditLog, key: string): string | null {
  return readString(log.after_data, key) ?? readString(log.before_data, key);
}

/** 一覧に表示する議案名・会派名を引くための ID を集める */
export function collectReferencedIds(logs: AuditLog[]): {
  billIds: string[];
  factionIds: string[];
} {
  const billIds = new Set<string>();
  const factionIds = new Set<string>();

  for (const log of logs) {
    if (log.bill_id) billIds.add(log.bill_id);
    const factionId = readLogField(log, "faction_id");
    if (factionId) factionIds.add(factionId);
  }

  return { billIds: [...billIds], factionIds: [...factionIds] };
}

/**
 * 議案名・会派名を付けて一覧の行にする
 *
 * 議案が削除済みで引けない場合、議案マスタの履歴なら記録した行の議案名を使う。
 */
export function toAuditLogListItems(
  logs: AuditLog[],
  billNames: Map<string, string>,
  factionNames: Map<string, string>
): AuditLogListItem[] {
  return logs.map((log) => {
    const billName =
      (log.bill_id ? billNames.get(log.bill_id) : undefined) ??
      (log.target_table === "bills" ? readLogField(log, "name") : null);
    const factionId = readLogField(log, "faction_id");

    return {
      ...log,
      billName,
      factionName: factionId ? (factionNames.get(factionId) ?? null) : null,
    };
  });
}
