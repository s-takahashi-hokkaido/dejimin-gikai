import {
  AUDIT_TARGET_TABLES,
  type AuditLogFilters,
  type AuditTargetTable,
} from "../types";

export const AUDIT_LOGS_PER_PAGE = 50;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isAuditTargetTable(value: string): value is AuditTargetTable {
  return (AUDIT_TARGET_TABLES as readonly string[]).includes(value);
}

/** URL の検索パラメータから絞り込み条件を作る。不正な値は無視する */
export function parseAuditLogFilters(params: {
  table?: string;
  billId?: string;
  page?: string;
}): AuditLogFilters {
  const table =
    params.table && isAuditTargetTable(params.table) ? params.table : null;
  const billId =
    params.billId && UUID_PATTERN.test(params.billId) ? params.billId : null;
  const page = Number(params.page);

  return {
    table,
    billId,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

/** 絞り込み条件から一覧の URL を作る。既定値のパラメータは省く */
export function buildAuditLogsHref(filters: AuditLogFilters): string {
  const params = new URLSearchParams();
  if (filters.table) params.set("table", filters.table);
  if (filters.billId) params.set("billId", filters.billId);
  if (filters.page > 1) params.set("page", String(filters.page));

  const query = params.toString();
  return query ? `/audit-logs?${query}` : "/audit-logs";
}
