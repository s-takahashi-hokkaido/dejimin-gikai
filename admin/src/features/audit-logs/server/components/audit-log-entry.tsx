import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/features/auth/shared/utils/role";
import type { AuditLogListItem } from "../../shared/types";
import { buildAuditLogsHref } from "../../shared/utils/audit-log-filters";
import {
  describeAuditAction,
  formatAuditActor,
  formatAuditValue,
  formatDifficultyLevel,
  getAuditFieldLabel,
} from "../../shared/utils/audit-log-labels";
import { diffAuditData } from "../../shared/utils/diff-audit-data";

const OPERATION_BADGE_VARIANTS = {
  insert: "secondary",
  update: "outline",
  delete: "destructive",
} as const;

function getOperationVariant(action: string) {
  const operation = action.slice(action.lastIndexOf(".") + 1);
  return (
    OPERATION_BADGE_VARIANTS[
      operation as keyof typeof OPERATION_BADGE_VARIANTS
    ] ?? "outline"
  );
}

export function AuditLogEntry({ log }: { log: AuditLogListItem }) {
  const { tableLabel, operationLabel } = describeAuditAction(log.action);
  const changes = diffAuditData(log.before_data, log.after_data);
  const difficulty =
    log.target_table === "bill_contents"
      ? formatDifficultyLevel(
          diffAuditData(null, log.after_data ?? log.before_data).find(
            (change) => change.field === "difficulty_level"
          )?.after
        )
      : null;

  return (
    <li className="rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <time className="text-gray-500" dateTime={log.created_at}>
          {new Date(log.created_at).toLocaleString("ja-JP", {
            timeZone: "Asia/Tokyo",
          })}
        </time>
        <Badge variant={getOperationVariant(log.action)}>
          {operationLabel}
        </Badge>
        <span className="font-semibold text-gray-900">{tableLabel}</span>
        {difficulty && <span className="text-gray-600">（{difficulty}）</span>}
        {log.factionName && (
          <span className="text-gray-600">{log.factionName}</span>
        )}
        {log.committeeName && (
          <span className="text-gray-600">{log.committeeName}</span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {log.bill_id && (
          <Link
            href={buildAuditLogsHref({
              table: null,
              billId: log.bill_id,
              page: 1,
            })}
            className="text-blue-600 hover:underline"
          >
            {log.billName ?? "（削除済みの議案）"}
          </Link>
        )}
        <span className="text-gray-600">
          実行者: {formatAuditActor(log, ROLE_LABELS)}
        </span>
      </div>

      {changes.length > 0 && (
        <details className="mt-3" open={log.action.endsWith(".update")}>
          <summary className="cursor-pointer text-sm text-gray-600">
            {changes.length}項目
          </summary>
          <table className="mt-2 w-full table-fixed border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="w-40 py-1 pr-2 font-medium">項目</th>
                <th className="py-1 pr-2 font-medium">変更前</th>
                <th className="py-1 font-medium">変更後</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((change) => (
                <tr key={change.field} className="border-b align-top">
                  <td className="py-2 pr-2 text-gray-700">
                    {getAuditFieldLabel(change.field)}
                  </td>
                  <td className="py-2 pr-2">
                    <div className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-gray-600">
                      {formatAuditValue(change.before)}
                    </div>
                  </td>
                  <td className="py-2">
                    <div className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-gray-900">
                      {formatAuditValue(change.after)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </li>
  );
}
