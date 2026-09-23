import Link from "next/link";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { AUDIT_TARGET_TABLES, type AuditLogFilters } from "../../shared/types";
import { buildAuditLogsHref } from "../../shared/utils/audit-log-filters";
import { AUDIT_TABLE_LABELS } from "../../shared/utils/audit-log-labels";
import { loadAuditLogs } from "../loaders/load-audit-logs";
import { AuditLogEntry } from "./audit-log-entry";

const TABLE_TABS = [
  { table: null, label: "すべて" },
  ...AUDIT_TARGET_TABLES.map((table) => ({
    table,
    label: AUDIT_TABLE_LABELS[table],
  })),
];

export async function AuditLogList({ filters }: { filters: AuditLogFilters }) {
  const { items, total, totalPages } = await loadAuditLogs(filters);
  const billName = filters.billId
    ? (items.find((item) => item.bill_id === filters.billId)?.billName ?? null)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABLE_TABS.map((tab) => (
          <Link
            key={tab.label}
            href={buildAuditLogsHref({ ...filters, table: tab.table, page: 1 })}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              filters.table === tab.table
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "bg-white text-gray-600 hover:bg-gray-100"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {filters.billId && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border bg-white px-4 py-2 text-sm">
          <span>
            議案で絞り込み中:{" "}
            <span className="font-semibold">{billName ?? filters.billId}</span>
          </span>
          <Link
            href={buildAuditLogsHref({ ...filters, billId: null, page: 1 })}
            className="text-blue-600 hover:underline"
          >
            解除
          </Link>
          <Link
            href={`/bills/${filters.billId}/edit`}
            className="text-blue-600 hover:underline"
          >
            議案を開く
          </Link>
        </div>
      )}

      <p className="text-sm text-gray-600">{total}件</p>

      {items.length === 0 ? (
        <p className="text-gray-500">変更履歴はありません</p>
      ) : (
        <ul className="space-y-3">
          {items.map((log) => (
            <AuditLogEntry key={log.id} log={log} />
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={buildAuditLogsHref({
                  ...filters,
                  page: Math.max(1, filters.page - 1),
                })}
                aria-disabled={filters.page <= 1}
                className={cn(
                  filters.page <= 1 && "pointer-events-none opacity-50"
                )}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="px-3 text-sm text-gray-600">
                {filters.page} / {totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href={buildAuditLogsHref({
                  ...filters,
                  page: Math.min(totalPages, filters.page + 1),
                })}
                aria-disabled={filters.page >= totalPages}
                className={cn(
                  filters.page >= totalPages && "pointer-events-none opacity-50"
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
