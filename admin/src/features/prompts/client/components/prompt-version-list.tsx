"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { activatePromptVersion } from "../../server/actions/save-prompt-version";
import type { PromptVersion } from "../../shared/types";

type PromptVersionListProps = {
  promptId: string;
  versions: PromptVersion[];
};

export function PromptVersionList({
  promptId,
  versions,
}: PromptVersionListProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleActivate = async (version: PromptVersion) => {
    if (
      !confirm(
        `版 ${version.version} に戻し、本番の AI チャットにすぐ反映します。よろしいですか？`
      )
    ) {
      return;
    }

    setPendingId(version.id);
    try {
      const result = await activatePromptVersion({
        promptId,
        versionId: version.id,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`版 ${version.version} を有効にしました`);
      }
    } catch (error) {
      console.error("Activate prompt version error:", error);
      toast.error("版の切り替えに失敗しました");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <ul className="divide-y">
      {versions.map((version) => (
        <li key={version.id} className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold">版 {version.version}</span>
              {version.isActive && <Badge>有効</Badge>}
              <span className="text-sm text-gray-500">
                {new Date(version.createdAt).toLocaleString("ja-JP")}
              </span>
            </div>
            {!version.isActive && (
              <Button
                variant="outline"
                size="sm"
                disabled={pendingId !== null}
                onClick={() => handleActivate(version)}
              >
                {pendingId === version.id ? "切り替え中..." : "この版に戻す"}
              </Button>
            )}
          </div>
          {version.note && (
            <p className="mt-1 text-sm text-gray-700">{version.note}</p>
          )}
          <details className="mt-2">
            <summary className="cursor-pointer text-sm text-gray-500">
              本文を見る
            </summary>
            <pre className="mt-2 whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm">
              {version.content}
            </pre>
          </details>
        </li>
      ))}
    </ul>
  );
}
