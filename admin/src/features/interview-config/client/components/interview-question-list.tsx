"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  InterviewQuestion,
  InterviewQuestionInput,
} from "../../shared/types";
import { InterviewQuestionForm } from "./interview-question-form";

/** 質問の一覧を保存する。失敗したら画面に出すメッセージを返す */
export type SaveQuestionsHandler = (
  questions: InterviewQuestionInput[]
) => Promise<{ success: true } | { success: false; error?: string }>;

interface InterviewQuestionListProps {
  /** 保存先（議案の設定か、議題の設定か）は呼び出し側で決める */
  onSave: SaveQuestionsHandler;
  questions: InterviewQuestion[];
  aiGeneratedQuestions?: InterviewQuestionInput[] | null;
  onAiQuestionsApplied?: () => void;
  /** 質問の数の上限。指定すると、上限に達したら追加の欄を出さない */
  maxQuestions?: number;
}

export function InterviewQuestionList({
  onSave,
  questions: initialQuestions,
  aiGeneratedQuestions,
  onAiQuestionsApplied,
  maxQuestions,
}: InterviewQuestionListProps) {
  const [questions, setQuestions] = useState<InterviewQuestionInput[]>(
    initialQuestions.map((q) => ({
      question: q.question,
      follow_up_guide: q.follow_up_guide || undefined,
      quick_replies: q.quick_replies || undefined,
    }))
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  // 最後に保存できた一覧。保存に失敗したら画面をこれに戻し、DB と食い違わないようにする
  const savedQuestionsRef = useRef(questions);

  /** 画面に先に反映してから保存する。失敗したら元に戻し、成功したときだけ成功のメッセージを出す */
  const saveQuestions = useCallback(
    (questionsToSave: InterviewQuestionInput[], successMessage: string) => {
      setQuestions(questionsToSave);
      startTransition(async () => {
        const result = await onSave(questionsToSave);

        if (!result.success) {
          setQuestions(savedQuestionsRef.current);
          toast.error(result.error || "質問の保存に失敗しました");
          return;
        }
        savedQuestionsRef.current = questionsToSave;
        toast.success(successMessage);
      });
    },
    [onSave]
  );

  // AI生成質問の反映
  useEffect(() => {
    if (aiGeneratedQuestions && aiGeneratedQuestions.length > 0) {
      saveQuestions(
        aiGeneratedQuestions,
        `AIが${aiGeneratedQuestions.length}件の質問を生成しました`
      );
      onAiQuestionsApplied?.();
    }
  }, [aiGeneratedQuestions, saveQuestions, onAiQuestionsApplied]);

  const canAdd = maxQuestions === undefined || questions.length < maxQuestions;

  const handleAdd = (newQuestion: InterviewQuestionInput) => {
    saveQuestions([...questions, newQuestion], "質問を追加しました");
  };

  const handleUpdate = (
    index: number,
    updatedQuestion: InterviewQuestionInput
  ) => {
    const newQuestions = [...questions];
    newQuestions[index] = updatedQuestion;
    setEditingIndex(null);
    saveQuestions(newQuestions, "質問を更新しました");
  };

  const handleDelete = (index: number) => {
    if (confirm("この質問を削除してもよろしいですか？")) {
      const newQuestions = questions.filter((_, i) => i !== index);
      setEditingIndex(null);
      saveQuestions(newQuestions, "質問を削除しました");
    }
  };

  return (
    <Card>
      <CardContent className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">質問一覧 ({questions.length}件)</h3>
            {isPending && (
              <span className="text-sm text-gray-500">保存中...</span>
            )}
          </div>

          {questions.length === 0 ? (
            <p className="text-sm text-gray-500">
              質問が登録されていません。上記のフォームから質問を追加してください。
            </p>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => {
                const isEditing = editingIndex === index;
                const questionKey = `question-${index}-${question.question}`;
                return (
                  <div key={questionKey}>
                    {isEditing ? (
                      <InterviewQuestionForm
                        onSubmit={(updated) => handleUpdate(index, updated)}
                        onCancel={() => setEditingIndex(null)}
                        initialData={question}
                        submitLabel="更新"
                      />
                    ) : (
                      <Card>
                        <CardContent>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-500">
                                  Q{index + 1}
                                </span>
                                <div className="font-semibold text-gray-900">
                                  {question.question}
                                </div>
                              </div>
                              {question.follow_up_guide && (
                                <div className="text-sm text-gray-600">
                                  <span className="font-medium">
                                    フォローアップ指針:
                                  </span>{" "}
                                  {question.follow_up_guide}
                                </div>
                              )}
                              {question.quick_replies &&
                                question.quick_replies.length > 0 && (
                                  <div className="text-sm text-gray-600">
                                    <span className="font-medium">
                                      クイックリプライ:
                                    </span>{" "}
                                    {question.quick_replies.join(", ")}
                                  </div>
                                )}
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingIndex(index)}
                              >
                                編集
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(index)}
                              >
                                削除
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-bold mb-4">質問を追加</h3>
          {canAdd ? (
            <InterviewQuestionForm onSubmit={handleAdd} />
          ) : (
            <p className="text-sm text-gray-500">
              質問は{maxQuestions}
              個までです。追加するには、どれかを削除してください。
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
