import Image from "next/image";
import { Card } from "@/components/ui/card";
import { formatDateJST } from "@/lib/utils/date";
import type { BillWithContent } from "../../../shared/types";
import { resolveSubmittedDate } from "../../../shared/utils/bill-dates";
import { ReviewCompleteBadge } from "../bill-detail/review-status";
import { BillStatusBadge } from "./bill-status-badge";

interface CompactBillCardProps {
  bill: BillWithContent;
  className?: string;
}

/**
 * コンパクトな水平レイアウトの議案カード
 * 過去定例会セクションや過去定例会議案一覧ページで使用
 */
export function CompactBillCard({ bill, className }: CompactBillCardProps) {
  const displayTitle = bill.bill_content?.title || bill.name;
  const statusLabel = "提出";
  const submittedDate = resolveSubmittedDate(bill);

  return (
    <Card
      className={`border border-black shadow-none hover:bg-muted/50 transition-colors overflow-hidden ${className ?? ""}`}
    >
      <div className="flex">
        {/* コンテンツエリア */}
        <div className="flex-1 p-4 flex flex-col gap-2">
          <h3 className="font-bold text-[15px] leading-[1.6] line-clamp-2">
            {displayTitle}
            {bill.is_review_completed && (
              <>
                {" "}
                <ReviewCompleteBadge />
              </>
            )}
          </h3>
          <div className="flex items-center gap-3">
            <BillStatusBadge
              status={bill.status}
              billType={bill.bill_type}
              className="w-fit"
            />
            {submittedDate && (
              <span className="text-xs text-muted-foreground">
                {formatDateJST(submittedDate)} {statusLabel}
              </span>
            )}
          </div>
        </div>

        {/* サムネイル画像 */}
        {bill.thumbnail_url && (
          <div className="relative w-24 h-16 flex-shrink-0 self-center mr-4 rounded-lg overflow-hidden">
            <Image
              src={bill.thumbnail_url}
              alt={bill.name}
              fill
              className="object-cover"
              sizes="96px"
            />
          </div>
        )}
      </div>
    </Card>
  );
}
