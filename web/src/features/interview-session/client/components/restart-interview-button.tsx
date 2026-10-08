"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getInterviewChatLink } from "@/features/interview-config/shared/utils/interview-links";
import { archiveInterviewSession } from "../../server/actions/archive-interview-session";
import { RestartConfirmDialog } from "./restart-confirm-dialog";

interface RestartInterviewButtonProps {
  sessionId: string;
  billId: string;
  previewToken?: string;
}

export function RestartInterviewButton({
  sessionId,
  billId,
  previewToken,
}: RestartInterviewButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // window.confirm はスマホで見た目が浮き、Safari の bfcache 復元時に
  // 正しく動かないことがあるため、自前の確認ダイアログを使う
  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const result = await archiveInterviewSession(sessionId);
      if (result.success) {
        // アーカイブ成功後、チャットページに遷移（新しいセッションが作成される）
        // 遷移完了までローディングを維持するため、成功時は setIsLoading(false) を呼ばない
        const chatLink = getInterviewChatLink(billId, previewToken);
        router.push(chatLink);
        return;
      }
      console.error("Failed to archive session:", result.error);
      alert(result.error || "やり直しに失敗しました");
    } catch (error) {
      console.error("Failed to archive session:", error);
      alert("やり直しに失敗しました");
    }
    setIsLoading(false);
    setShowConfirm(false);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowConfirm(true)}
        disabled={isLoading}
      >
        <RotateCcw className="size-4" />
        <span>もう一度最初から回答する</span>
      </Button>
      <RestartConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        onConfirm={handleConfirm}
        isLoading={isLoading}
      />
    </>
  );
}
