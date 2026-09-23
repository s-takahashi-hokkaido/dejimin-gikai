import { GitMerge, Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { canAccessPage } from "@/features/auth/shared/utils/can-access-page";
import type { AdminRole } from "@/features/auth/shared/utils/role";
import { AutoFeatureButton } from "../../../client/components/bill-list/auto-feature-button";
import { ResizableBillTable } from "../../../client/components/bill-list/resizable-bill-table";
import type { BillSortConfig } from "../../../shared/types";
import { getBills } from "../../loaders/get-bills";
import { getCouncilSessions } from "../../loaders/get-council-sessions";
import { getTags } from "../../loaders/get-tags";

type BillListProps = {
  role: AdminRole;
  sortConfig: BillSortConfig;
  sessionId?: string;
  tagId?: string;
  publishStatus?: string;
  reviewStatus?: string;
  isFeatured?: string;
};

export async function BillList({
  role,
  sortConfig,
  sessionId,
  tagId,
  publishStatus,
  reviewStatus,
  isFeatured,
}: BillListProps) {
  const [bills, sessions, tags] = await Promise.all([
    getBills(sortConfig, {
      sessionId,
      tagId,
      publishStatus,
      reviewStatus,
      isFeatured,
    }),
    getCouncilSessions(),
    getTags(),
  ]);

  const isAdmin = role === "admin";
  const isLocal = !process.env.VERCEL;
  const selectedSession = sessionId
    ? sessions.find((s) => s.id === sessionId)
    : null;

  return (
    <div>
      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="text-sm text-gray-600">{bills.length}件の議案</div>
        <div className="flex items-center gap-2">
          {isAdmin && isLocal && selectedSession && (
            <AutoFeatureButton
              councilSessionId={selectedSession.id}
              sessionName={selectedSession.name}
            />
          )}
          {canAccessPage(role, "/bills/merge") && (
            <Link href="/bills/merge">
              <Button variant="outline">
                <GitMerge className="h-4 w-4 mr-1" />
                重複統合
              </Button>
            </Link>
          )}
          {canAccessPage(role, "/bills/new") && (
            <Link href="/bills/new">
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                新規作成
              </Button>
            </Link>
          )}
        </div>
      </div>

      <ResizableBillTable
        role={role}
        bills={bills}
        sessions={sessions}
        tags={tags}
        sortConfig={sortConfig}
        sessionId={sessionId}
        tagId={tagId}
        publishStatus={publishStatus}
        reviewStatus={reviewStatus}
        isFeatured={isFeatured}
      />
    </div>
  );
}
