"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { siteConfig } from "@/config/site.config";
import { getInterviewChatLink } from "@/features/interview-config/shared/utils/interview-links";

const CONSENT_ITEMS = [
  `回答の内容は、${siteConfig.councilName}の議員や議員選挙の候補者が参照する場合があります。`,
  "回答の内容は、AIの応答を作るため、米国のOpenAIに送信されます。",
  "インタビューの最後に公開を許可した場合、要約とやり取りの全文が結果ページで公開されます。",
  "回答の削除をご希望の場合は、結果ページのURLを添えてお問い合わせください。",
];

interface InterviewConsentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId: string;
  previewToken?: string;
}

export function InterviewConsentModal({
  open,
  onOpenChange,
  billId,
  previewToken,
}: InterviewConsentModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleAgree = () => {
    setIsLoading(true);
    const destination = getInterviewChatLink(billId, previewToken);
    router.push(destination);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary text-center">
            AIインタビュー同意事項
          </DialogTitle>
          <div className="h-[1px] bg-mirai-gradient mt-4" />
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <p className="text-sm font-bold leading-[22px]">
            氏名・住所・連絡先など、ご自身や他人を特定できる情報は入力しないでください。
          </p>

          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-700">
            {CONSENT_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <p className="text-sm leading-relaxed text-gray-700">
            詳しくは
            <Link
              href="/terms"
              target="_blank"
              className="underline underline-offset-2"
            >
              利用規約
            </Link>
            と
            <Link
              href="/privacy"
              target="_blank"
              className="underline underline-offset-2"
            >
              プライバシーポリシー
            </Link>
            をご覧ください。
          </p>
        </div>

        <div className="space-y-3 mt-6">
          <Button onClick={handleAgree} disabled={isLoading} className="w-full">
            {"同意してはじめる"}
            {<ArrowRight className="ml-2 size-5" />}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full"
          >
            同意せずに戻る
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
