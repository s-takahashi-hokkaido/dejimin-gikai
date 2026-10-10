import "server-only";

import { getPublicReportCountsByBillIds } from "@/features/interview-report/server/loaders/get-public-report-counts-by-bill-ids";
import type { BillWithContent } from "../../shared/types";
import { getBills } from "./get-bills";

/**
 * 一覧用に、公開レポート件数（AIインタビューの回答数）を添えた議案を返す。
 *
 * 件数は議案ごとに数えるとクエリが議案数ぶんに膨らむので、DB側で集約する
 * （count_public_reports_by_bill_ids）。0件の議案は集計結果に現れないため 0 を埋める。
 */
export async function getBillsWithReportCounts(): Promise<BillWithContent[]> {
  const bills = await getBills();
  const counts = await getPublicReportCountsByBillIds(
    bills.map((bill) => bill.id)
  );

  return bills.map((bill) => ({
    ...bill,
    publicReportCount: counts.get(bill.id) ?? 0,
  }));
}
