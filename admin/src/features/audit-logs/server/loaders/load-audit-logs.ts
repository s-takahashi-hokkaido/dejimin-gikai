import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import type { AuditLogFilters, AuditLogListItem } from "../../shared/types";
import { AUDIT_LOGS_PER_PAGE } from "../../shared/utils/audit-log-filters";
import {
  collectReferencedIds,
  toAuditLogListItems,
} from "../../shared/utils/resolve-audit-log-names";
import {
  findAuditLogs,
  findBillNamesByIds,
  findFactionNamesByIds,
} from "../repositories/audit-log-repository";

export async function loadAuditLogs(filters: AuditLogFilters): Promise<{
  items: AuditLogListItem[];
  total: number;
  totalPages: number;
}> {
  noStore();

  const { logs, total } = await findAuditLogs({
    table: filters.table,
    billId: filters.billId,
    offset: (filters.page - 1) * AUDIT_LOGS_PER_PAGE,
    limit: AUDIT_LOGS_PER_PAGE,
  });

  const { billIds, factionIds } = collectReferencedIds(logs);
  const [billNames, factionNames] = await Promise.all([
    findBillNamesByIds(billIds),
    findFactionNamesByIds(factionIds),
  ]);

  return {
    items: toAuditLogListItems(logs, billNames, factionNames),
    total,
    totalPages: Math.max(1, Math.ceil(total / AUDIT_LOGS_PER_PAGE)),
  };
}
