"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfigGenerationChat } from "@/features/interview-config/client/components/config-generation-chat";
import {
  InterviewQuestionList,
  type SaveQuestionsHandler,
} from "@/features/interview-config/client/components/interview-question-list";
import type {
  InterviewQuestion,
  InterviewQuestionInput,
} from "@/features/interview-config/shared/types";
import {
  arrayToText,
  textToArray,
} from "@/features/interview-config/shared/utils/array-text-conversion";
import { saveTopicInterviewQuestions } from "../../server/actions/save-topic-interview-questions";
import { saveTopicInterviewSettings } from "../../server/actions/save-topic-interview-settings";
import {
  TOPIC_INTERVIEW_DURATION,
  TOPIC_INTERVIEW_THEMES_MAX,
} from "../../shared/utils/topic-interview-config";

type TopicInterviewConfigEditorProps = {
  topicId: string;
  initialThemes: string[];
  initialEstimatedDuration: number;
  questions: InterviewQuestion[];
};

/**
 * 議題のインタビュー設定（テーマ・目安時間・質問）の編集と、AI との対話による生成
 *
 * 作成者が触れるのはこの3つだけ。モード・AIモデルなどは運営側で固定している
 * （docs/20261113_2018_AIインタビュー広場_プロンプト設計.md §3-1）。
 */
export function TopicInterviewConfigEditor({
  topicId,
  initialThemes,
  initialEstimatedDuration,
  questions,
}: TopicInterviewConfigEditorProps) {
  const [themesText, setThemesText] = useState(arrayToText(initialThemes));
  const [estimatedDuration, setEstimatedDuration] = useState(
    initialEstimatedDuration
  );
  const [isSaving, setIsSaving] = useState(false);
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<
    InterviewQuestionInput[] | null
  >(null);

  const saveSettings = useCallback(
    async (themes: string[]) => {
      setIsSaving(true);
      try {
        const result = await saveTopicInterviewSettings({
          topicId,
          themes,
          estimatedDuration,
        });
        if ("error" in result) {
          toast.error(result.error);
          return false;
        }
        setThemesText(arrayToText(result.themes));
        toast.success("テーマと目安時間を保存しました");
        return true;
      } catch (error) {
        console.error("Save topic interview settings error:", error);
        toast.error("通信中にエラーが発生しました。もう一度お試しください");
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [topicId, estimatedDuration]
  );

  const handleSaveQuestions = useCallback<SaveQuestionsHandler>(
    async (questionsToSave) => {
      const result = await saveTopicInterviewQuestions({
        topicId,
        questions: questionsToSave,
      });
      return "error" in result
        ? { success: false, error: result.error }
        : { success: true };
    },
    [topicId]
  );

  // AI の提案したテーマを確定したら、フォームに入れて保存する
  const handleThemesConfirmed = useCallback(
    async (themes: string[]) => {
      setThemesText(arrayToText(themes));
      await saveSettings(themes);
    },
    [saveSettings]
  );

  // AI の提案した質問を確定したら、質問一覧に入れる（一覧の側で保存する）
  const handleQuestionsConfirmed = useCallback(
    (generated: InterviewQuestionInput[]) => {
      setAiGeneratedQuestions(generated);
    },
    []
  );

  const getFormThemes = useCallback(
    () => textToArray(themesText),
    [themesText]
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="topic-interview-themes">テーマ</Label>
              <Textarea
                id="topic-interview-themes"
                value={themesText}
                onChange={(event) => setThemesText(event.target.value)}
                className="min-h-[140px]"
                placeholder={"除雪の時間帯\n通学路・通勤路の安全\n情報の届き方"}
              />
              <p className="text-xs text-gray-500">
                AI がインタビューで扱うテーマです。1行に1つ、
                {TOPIC_INTERVIEW_THEMES_MAX}
                個まで書けます。
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic-interview-duration">目安時間（分）</Label>
              <Input
                id="topic-interview-duration"
                type="number"
                min={TOPIC_INTERVIEW_DURATION.min}
                max={TOPIC_INTERVIEW_DURATION.max}
                value={estimatedDuration}
                onChange={(event) =>
                  setEstimatedDuration(Number(event.target.value))
                }
                className="w-32"
              />
              <p className="text-xs text-gray-500">
                {TOPIC_INTERVIEW_DURATION.min}〜{TOPIC_INTERVIEW_DURATION.max}
                分。時間が近づくと、AI がまとめに入ります。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={() => saveSettings(textToArray(themesText))}
                disabled={isSaving}
              >
                {isSaving ? "保存中..." : "テーマと目安時間を保存"}
              </Button>
              <p className="text-xs text-gray-500">
                インタビューの進め方（深掘りのしかた）と AI
                のモデルは、運営側で決めています。
              </p>
            </div>
          </CardContent>
        </Card>

        <InterviewQuestionList
          onSave={handleSaveQuestions}
          questions={questions}
          aiGeneratedQuestions={aiGeneratedQuestions}
          onAiQuestionsApplied={() => setAiGeneratedQuestions(null)}
        />
      </div>

      <div>
        <ConfigGenerationChat
          subject={{ kind: "topic", id: topicId }}
          existingThemes={initialThemes}
          existingQuestions={questions.map((q) => ({
            question: q.question,
            follow_up_guide: q.follow_up_guide ?? undefined,
            quick_replies: q.quick_replies ?? undefined,
          }))}
          onThemesConfirmed={handleThemesConfirmed}
          onQuestionsConfirmed={handleQuestionsConfirmed}
          getFormThemes={getFormThemes}
        />
      </div>
    </div>
  );
}
