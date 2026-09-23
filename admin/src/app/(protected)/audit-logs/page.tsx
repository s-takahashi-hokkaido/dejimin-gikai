import { AuditLogList } from "@/features/audit-logs/server/components/audit-log-list";
import { parseAuditLogFilters } from "@/features/audit-logs/shared/utils/audit-log-filters";
import { requireRoleOrRedirect } from "@/features/auth/server/lib/auth-server";

interface AuditLogsPageProps {
  searchParams: Promise<{
    table?: string;
    billId?: string;
    page?: string;
  }>;
}

export default async function AuditLogsPage({
  searchParams,
}: AuditLogsPageProps) {
  await requireRoleOrRedirect(["admin"]);

  const filters = parseAuditLogFilters(await searchParams);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">変更履歴</h1>
        <p className="text-gray-600 mt-1">
          議案マスタ・議案コンテンツ・会派見解を、誰がいつどう変えたかを確認できます
        </p>
      </div>

      <AuditLogList filters={filters} />
    </div>
  );
}
