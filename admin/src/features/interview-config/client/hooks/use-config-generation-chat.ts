"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { useCallback, useState } from "react";
import {
  type ConfigGenerationRequest,
  type ConfigGenerationStage,
  configGenerationResponseSchema,
} from "../../shared/schemas";
import type { InterviewQuestionInput } from "../../shared/types";
import {
  type InterviewSubjectRef,
  SUBJECT_LABELS,
} from "../../shared/utils/interview-subject-ref";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  themes?: string[];
  questions?: InterviewQuestionInput[];
}

interface UseConfigGenerationChatProps {
  /** 生成の対象（議案か、AIインタビュー広場の議題か） */
  subject: InterviewSubjectRef;
  configId?: string;
  existingThemes?: string[];
  existingQuestions?: InterviewQuestionInput[];
  onThemesConfirmed: (themes: string[]) => void;
  onQuestionsConfirmed: (questions: InterviewQuestionInput[]) => void;
}

export function useConfigGenerationChat({
  subject: { kind: subjectKind, id: subjectId },
  configId,
  existingThemes,
  existingQuestions,
  onThemesConfirmed,
  onQuestionsConfirmed,
}: UseConfigGenerationChatProps) {
  const subjectLabel = SUBJECT_LABELS[subjectKind];
  const hasExistingThemes = (existingThemes?.length ?? 0) > 0;
  const hasExistingQuestions = (existingQuestions?.length ?? 0) > 0;
  const [input, setInput] = useState("");
  const [stage, setStage] = useState<ConfigGenerationStage>("theme_proposal");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [confirmedThemes, setConfirmedThemes] = useState<string[]>([]);
  const [proposedThemes, setProposedThemes] = useState<string[]>([]);
  const [proposedQuestions, setProposedQuestions] = useState<
    InterviewQuestionInput[]
  >([]);

  const { object, submit, isLoading, error, stop } = useObject({
    api: "/api/interview-config/generate",
    schema: configGenerationResponseSchema,
    onFinish: ({ object: finishedObject, error: finishedError }) => {
      if (finishedError || !finishedObject) return;

      const { text, themes, questions } = finishedObject;

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: text ?? "",
          themes: themes ?? undefined,
          questions: questions as InterviewQuestionInput[] | undefined,
        },
      ]);

      if (themes && themes.length > 0) {
        setProposedThemes(themes);
      }
      if (questions && questions.length > 0) {
        setProposedQuestions(questions as InterviewQuestionInput[]);
      }
    },
  });

  /** API に送る。対象（subject）と設定 ID はここで必ず付ける */
  const submitRequest = useCallback(
    (request: Omit<ConfigGenerationRequest, "subject" | "configId">) => {
      const body: ConfigGenerationRequest = {
        ...request,
        subject: { kind: subjectKind, id: subjectId },
        configId,
      };
      submit(body);
    },
    [submit, subjectKind, subjectId, configId]
  );

  const handleSubmit = useCallback(
    (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");

      // 修正要望後はproposedをリセット
      setProposedThemes([]);
      setProposedQuestions([]);

      const apiMessages = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: text },
      ];

      const apiStage =
        stage === "theme_confirmed" || stage === "question_proposal"
          ? "question_proposal"
          : "theme_proposal";

      submitRequest({
        messages: apiMessages,
        stage: apiStage,
        confirmedThemes:
          apiStage === "question_proposal" ? confirmedThemes : undefined,
        existingThemes:
          apiStage === "theme_proposal" && hasExistingThemes
            ? existingThemes
            : undefined,
        existingQuestions:
          apiStage === "question_proposal" && hasExistingQuestions
            ? existingQuestions
            : undefined,
      });
    },
    [
      messages,
      stage,
      confirmedThemes,
      isLoading,
      hasExistingThemes,
      existingThemes,
      hasExistingQuestions,
      existingQuestions,
      submitRequest,
    ]
  );

  const startGeneration = useCallback(() => {
    if (hasExistingThemes || hasExistingQuestions) {
      // 既存設定あり: ブラッシュアップモード
      const parts: string[] = [
        "インタビュー設定アシスタントです。現在の設定を確認しました。",
      ];
      if (hasExistingThemes) {
        parts.push(
          `\n\n**現在のテーマ（${existingThemes?.length}件）:**\n${existingThemes?.map((t) => `- ${t}`).join("\n")}`
        );
      }
      if (hasExistingQuestions) {
        parts.push(
          `\n\n**現在の質問（${existingQuestions?.length}件）:**\n${existingQuestions?.map((q, i) => `${i + 1}. ${q.question}`).join("\n")}`
        );
      }
      parts.push(
        "\n\nどのようにブラッシュアップしますか？修正の要望をテキストで入力するか、バッジをクリックしてテーマ・質問の再生成ができます。"
      );
      setMessages([
        {
          id: "greeting",
          role: "assistant",
          content: parts.join(""),
        },
      ]);
      // 既存設定がある場合は自動生成せず、ユーザーの指示を待つ
    } else {
      // 新規: 自動でテーマ提案
      setMessages([
        {
          id: "greeting",
          role: "assistant",
          content: `インタビュー設定アシスタントです。${subjectLabel}内容を分析して、テーマと質問を提案します。まずはテーマから始めますね。`,
        },
      ]);
      submitRequest({
        messages: [],
        stage: "theme_proposal",
      });
    }
  }, [
    hasExistingThemes,
    hasExistingQuestions,
    existingThemes,
    existingQuestions,
    subjectLabel,
    submitRequest,
  ]);

  const confirmThemes = useCallback(
    (themes: string[]) => {
      setConfirmedThemes(themes);
      setStage("theme_confirmed");
      onThemesConfirmed(themes);

      // テーマ確定メッセージを追加
      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        role: "assistant",
        content:
          "テーマを確定しました。次に、テーマに基づいた質問を提案します。",
      };
      setMessages((prev) => [...prev, systemMessage]);
      setProposedThemes([]);
      setProposedQuestions([]);

      // 質問提案フェーズへ移行
      setStage("question_proposal");

      submitRequest({
        messages: [
          ...messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        ],
        stage: "question_proposal",
        confirmedThemes: themes,
        existingQuestions: hasExistingQuestions ? existingQuestions : undefined,
      });
    },
    [
      messages,
      onThemesConfirmed,
      hasExistingQuestions,
      existingQuestions,
      submitRequest,
    ]
  );

  const confirmQuestions = useCallback(
    (questions: InterviewQuestionInput[]) => {
      setStage("question_confirmed");
      onQuestionsConfirmed(questions);
    },
    [onQuestionsConfirmed]
  );

  const skipToQuestions = useCallback(
    (themes: string[]) => {
      if (isLoading) stop();

      setConfirmedThemes(themes);
      setStage("question_proposal");
      setProposedThemes([]);
      setProposedQuestions([]);

      const skipMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        role: "assistant",
        content:
          themes.length > 0
            ? "質問提案に移ります。フォームのテーマを使用します。"
            : `質問提案に移ります。${subjectLabel}内容から質問を提案します。`,
      };
      setMessages((prev) => [...prev, skipMessage]);

      submitRequest({
        messages: [],
        stage: "question_proposal",
        confirmedThemes: themes.length > 0 ? themes : undefined,
        existingQuestions: hasExistingQuestions ? existingQuestions : undefined,
      });
    },
    [
      isLoading,
      stop,
      hasExistingQuestions,
      existingQuestions,
      subjectLabel,
      submitRequest,
    ]
  );

  const switchToThemes = useCallback(() => {
    if (isLoading) stop();

    setStage("theme_proposal");
    setConfirmedThemes([]);
    setProposedThemes([]);
    setProposedQuestions([]);

    const switchMessage: ChatMessage = {
      id: `system-${Date.now()}`,
      role: "assistant",
      content: `テーマ提案に戻ります。${subjectLabel}内容を分析してテーマを提案します。`,
    };
    setMessages((prev) => [...prev, switchMessage]);

    submitRequest({
      messages: [],
      stage: "theme_proposal",
      existingThemes: hasExistingThemes ? existingThemes : undefined,
    });
  }, [
    isLoading,
    stop,
    hasExistingThemes,
    existingThemes,
    subjectLabel,
    submitRequest,
  ]);

  return {
    input,
    setInput,
    stage,
    messages,
    isLoading,
    error,
    object,
    proposedThemes,
    proposedQuestions,
    startGeneration,
    handleSubmit,
    confirmThemes,
    confirmQuestions,
    skipToQuestions,
    switchToThemes,
  };
}
