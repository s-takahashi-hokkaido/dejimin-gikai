import Link from "next/link";
import { BillCard } from "../../client/components/bill-list/bill-card";
import type { BillWithContent } from "../../shared/types";

interface InterviewOpenBillSectionProps {
  bills: BillWithContent[];
}

/**
 * トップの「AIインタビュー受付中」セクション。
 *
 * 受付中の議案はカード内のピルでしか分からず、他のセクションに散っていると
 * 「今どれに意見を出せるのか」を拾うのにトップ全体を追う必要がある。
 * 見出し付きで先頭にまとめて、意見を出す導線を最初に見せる。
 *
 * 他のセクションは2件目以降をコンパクトにするが、ここは意見を出す入口なので
 * 全件フルカードで要約まで見せる。
 */
export function InterviewOpenBillSection({
  bills,
}: InterviewOpenBillSectionProps) {
  if (bills.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-6">
      {/* セクションヘッダー */}
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[22px] font-bold text-mirai-text leading-[1.48]">
          AIインタビュー受付中
        </h2>
        <p className="text-xs font-medium text-mirai-text-secondary leading-[1.67]">
          意見を募集している議案
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {bills.map((bill) => (
          <Link key={bill.id} href={`/bills/${bill.id}`}>
            <BillCard bill={bill} />
          </Link>
        ))}
      </div>
    </section>
  );
}
