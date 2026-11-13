"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteTopic } from "../../server/actions/delete-topic";

type DeleteTopicButtonProps = {
  topicId: string;
  title: string;
};

/** 議題の削除ボタン（確認ダイアログつき） */
export function DeleteTopicButton({ topicId, title }: DeleteTopicButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDelete() {
    setIsSubmitting(true);
    try {
      const result = await deleteTopic({ id: topicId });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("議題を削除しました");
      router.push("/plaza-topics");
      router.refresh();
    } catch (error) {
      console.error("Delete topic error:", error);
      toast.error("通信中にエラーが発生しました。もう一度お試しください");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isSubmitting}
          className="text-red-600 hover:bg-red-50 hover:text-red-800"
        >
          <Trash2 className="h-4 w-4" />
          削除
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>議題の削除</AlertDialogTitle>
          <AlertDialogDescription>
            「{title}」を削除しますか？元に戻せません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isSubmitting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? "削除中..." : "削除"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
