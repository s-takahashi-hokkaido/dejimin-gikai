import Link from "next/link";
import { ArrowRight, BarChart2 } from "lucide-react";

type BudgetOverviewBannerProps = {
  sessionSlug: string;
  /** 「令和8年度」のような年度ラベル。分からないときは出さない */
  fiscalYearLabel: string | null;
};

export function BudgetOverviewBanner({
  sessionSlug,
  fiscalYearLabel,
}: BudgetOverviewBannerProps) {
  return (
    <Link
      href={`/budget/${sessionSlug}`}
      className="flex items-center justify-between gap-4 bg-card border border-border rounded-lg px-5 py-4 hover:border-primary transition-colors"
    >
      <div className="flex items-start gap-3">
        <BarChart2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-mirai-text">
            {fiscalYearLabel ? `${fiscalYearLabel} ` : ""}各局の重点施策
          </p>
          <p className="mt-0.5 text-sm text-mirai-text-secondary">
            各局の予算の方向性と主要施策をわかりやすく解説します
          </p>
        </div>
      </div>
      <ArrowRight className="w-5 h-5 text-mirai-text-muted shrink-0" />
    </Link>
  );
}
