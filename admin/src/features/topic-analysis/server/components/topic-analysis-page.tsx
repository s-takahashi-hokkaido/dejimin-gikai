import "server-only";

import { notFound } from "next/navigation";
import { getBillById } from "@/features/bills-edit/server/loaders/get-bill-by-id";
import { RunAnalysisButton } from "../../client/components/run-analysis-button";
import { getTopicAnalysisVersions } from "../loaders/get-topic-analysis-versions";
import { TopicAnalysisHeader } from "./topic-analysis-header";
import { VersionList } from "./version-list";

interface TopicAnalysisPageContentProps {
  billId: string;
  /** 分析を実行できるか（運営者のみ） */
  canRunAnalysis: boolean;
}

export async function TopicAnalysisPageContent({
  billId,
  canRunAnalysis,
}: TopicAnalysisPageContentProps) {
  const [bill, versions] = await Promise.all([
    getBillById(billId),
    getTopicAnalysisVersions(billId),
  ]);

  if (!bill) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <TopicAnalysisHeader billId={billId} billName={bill.name} />
      {canRunAnalysis && <RunAnalysisButton billId={billId} />}
      <VersionList versions={versions} billId={billId} />
    </div>
  );
}
