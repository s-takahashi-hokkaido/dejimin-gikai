"use client";

import { CircleCheck, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const REVIEW_COMPLETE_TEXT =
  "この解説は、議案の原文と照らし合わせた内容の確認が済んでいます";

/**
 * 解説の確認が済んでいない議案で、記事の上部に出すお知らせ
 */
export function ReviewInProgressBanner() {
  return (
    <div className="flex gap-2 items-center rounded-2xl bg-mirai-surface-grouped px-4 py-2">
      <Info className="size-5 shrink-0 text-mirai-text" aria-hidden="true" />
      <p className="text-[13px] font-medium leading-[1.5] text-mirai-text">
        この解説は内容を確認しているところです。今後内容が変わることがあります。
      </p>
    </div>
  );
}

interface ReviewCompleteBadgeProps {
  /** true ならホバーとタップで説明を出す（スマホでも読めるようにタップで開く） */
  showTooltip?: boolean;
}

/**
 * 解説の確認が済んだ議案で、タイトルの横に出すチェックマーク
 */
export function ReviewCompleteBadge({
  showTooltip = false,
}: ReviewCompleteBadgeProps) {
  const [open, setOpen] = useState(false);
  // Radix の Tooltip をサーバーで描画すると、ハイドレーション時に後続の useId が
  // ずれて属性の不一致が起きる。初回はサーバーと同じ印だけを出し、
  // ハイドレーションが済んでから説明付きに切り替える。
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!showTooltip || !isHydrated) {
    return (
      // カードのタイトルの大きさに合わせるため em で指定する
      <span
        role="img"
        aria-label="解説は確認済み"
        className="inline-flex items-center relative top-[0.15em]"
      >
        <CircleCheck
          className="size-[1.2em] fill-primary text-white"
          aria-hidden="true"
        />
      </span>
    );
  }

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={REVIEW_COMPLETE_TEXT}
          className="relative top-1 size-8 rounded-full p-0 align-baseline hover:bg-transparent"
          onClick={() => setOpen(true)}
        >
          <CircleCheck
            className="size-7 fill-primary text-white"
            aria-hidden="true"
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="start"
        collisionPadding={16}
        className="max-w-[min(18rem,calc(100vw-2rem))] bg-mirai-surface-grouped text-mirai-text font-medium text-xs leading-relaxed rounded-lg px-4 py-2"
        arrowClassName="bg-mirai-surface-grouped fill-mirai-surface-grouped"
      >
        {REVIEW_COMPLETE_TEXT}
      </TooltipContent>
    </Tooltip>
  );
}
