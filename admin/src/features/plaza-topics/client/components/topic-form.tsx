"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createTopic } from "../../server/actions/create-topic";
import { updateTopic } from "../../server/actions/update-topic";
import type { TopicInput } from "../../shared/types/plaza-topic";
import {
  normalizeTopicInput,
  TOPIC_BODY_MAX_LENGTH,
  TOPIC_TITLE_MAX_LENGTH,
} from "../../shared/utils/validate-topic-input";
import { TopicMarkdown } from "./topic-markdown";

type TopicFormProps =
  | { mode: "create" }
  | {
      mode: "edit";
      topic: { id: string; title: string; bodyMd: string };
    };

/** 議題の作成・編集フォーム（タイトルと本文。本文は Markdown でプレビューつき） */
export function TopicForm(props: TopicFormProps) {
  const router = useRouter();
  const initial = props.mode === "edit" ? props.topic : null;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [bodyMd, setBodyMd] = useState(initial?.bodyMd ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cancelHref = initial ? `/plaza-topics/${initial.id}` : "/plaza-topics";

  /** 作成なら新しい議題、編集ならその議題の ID を返す */
  async function save(
    value: TopicInput
  ): Promise<{ id: string } | { error: string }> {
    if (!initial) {
      return createTopic(value);
    }
    const result = await updateTopic({ id: initial.id, ...value });
    return "error" in result ? result : { id: initial.id };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // サーバーでも同じ判定をする。ここでは送る前に気づけるようにするだけ
    const validated = normalizeTopicInput({ title, bodyMd });
    if (!validated.ok) {
      setError(validated.error);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await save(validated.value);
      if ("error" in result) {
        setError(result.error);
        toast.error(initial ? "保存に失敗しました" : "作成に失敗しました");
        setIsSubmitting(false);
        return;
      }

      // 成功したら、画面が切り替わるまでボタンを押せないままにする（もう一度押して二重に作らないため）
      toast.success(initial ? "議題を保存しました" : "下書きを作成しました");
      router.push(`/plaza-topics/${result.id}`);
      router.refresh();
    } catch (submitError) {
      console.error("Topic form error:", submitError);
      setError("通信中にエラーが発生しました。もう一度お試しください");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="topic-title">タイトル</Label>
        <Input
          id="topic-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={TOPIC_TITLE_MAX_LENGTH}
          placeholder="例: 冬の除雪で、いちばん困っていることは何ですか"
          required
        />
        <p className="text-xs text-gray-500">
          来訪者に向けた問いを、{TOPIC_TITLE_MAX_LENGTH}
          文字以内で書いてください。
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="topic-body">本文</Label>
        <Tabs defaultValue="edit">
          <TabsList>
            <TabsTrigger value="edit">編集</TabsTrigger>
            <TabsTrigger value="preview">プレビュー</TabsTrigger>
          </TabsList>
          <TabsContent value="edit">
            <Textarea
              id="topic-body"
              value={bodyMd}
              onChange={(event) => setBodyMd(event.target.value)}
              maxLength={TOPIC_BODY_MAX_LENGTH}
              className="min-h-[400px] font-mono text-sm"
              placeholder={
                "## 背景\n\n議題の背景を書きます。\n\n## 聞きたいこと\n\n- 1つめ\n- 2つめ"
              }
            />
          </TabsContent>
          <TabsContent value="preview">
            <div className="min-h-[400px] rounded-md border bg-white p-4">
              {bodyMd.trim() ? (
                <TopicMarkdown markdown={bodyMd} />
              ) : (
                <p className="text-sm text-gray-500">
                  本文を入力すると、ここに表示されます。
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
        <div className="flex flex-wrap justify-between gap-2 text-xs text-gray-500">
          <p>
            Markdown
            で書けます（見出し・箇条書き・表・リンクなど）。下書きのうちは空でも保存できますが、オープンするには本文が必要です。
          </p>
          <p className="tabular-nums">
            {bodyMd.length.toLocaleString()} /{" "}
            {TOPIC_BODY_MAX_LENGTH.toLocaleString()} 文字
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : initial ? "保存" : "下書きとして作成"}
        </Button>
        <Button asChild variant="outline">
          <Link href={cancelHref}>キャンセル</Link>
        </Button>
      </div>
    </form>
  );
}
