"use client";

import type { FormEvent } from "react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { savePromptVersion } from "../../server/actions/save-prompt-version";
import {
  extractPromptVariables,
  findRemovedVariables,
} from "../../shared/utils/prompt-variables";

type PromptEditorProps = {
  promptId: string;
  activeContent: string;
};

export function PromptEditor({ promptId, activeContent }: PromptEditorProps) {
  const contentId = useId();
  const noteId = useId();
  const [content, setContent] = useState(activeContent);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const variables = extractPromptVariables(content);
  const removedVariables = findRemovedVariables(activeContent, content);
  const isUnchanged = content === activeContent;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error("本文を入力してください");
      return;
    }

    if (
      !confirm(
        "新しい版として保存し、本番の AI チャットにすぐ反映します。よろしいですか？"
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await savePromptVersion({ promptId, content, note });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`版 ${result.data?.version} を保存し、有効にしました`);
        setNote("");
      }
    } catch (error) {
      console.error("Save prompt version error:", error);
      toast.error("プロンプトの保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={contentId}>本文</Label>
        <Textarea
          id={contentId}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-96 font-mono"
          disabled={isSubmitting}
        />
        <p className="text-sm text-gray-600">
          使っている変数:{" "}
          {variables.length > 0
            ? variables.map((name) => `{{${name}}}`).join(" ")
            : "なし"}
        </p>
        {removedVariables.length > 0 && (
          <p className="text-sm text-red-600">
            有効な版にあった{" "}
            {removedVariables.map((name) => `{{${name}}}`).join(" ")}{" "}
            が消えています。消すと、その情報が AI に渡らなくなります。
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={noteId}>変更メモ</Label>
        <Input
          id={noteId}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="何をなぜ変えたか"
          disabled={isSubmitting}
        />
      </div>

      <Button type="submit" disabled={isSubmitting || isUnchanged}>
        {isSubmitting ? "保存中..." : "新しい版として保存して有効にする"}
      </Button>
    </form>
  );
}
