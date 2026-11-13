import "server-only";

import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  type LanguageModel,
  Output,
  streamText,
} from "ai";
import { getBillById } from "@/features/bills-edit/server/loaders/get-bill-by-id";
import { getBillContents } from "@/features/bills-edit/server/loaders/get-bill-contents";
import { AI_MODELS, OPENAI_STRUCTURED_OUTPUT_OPTIONS } from "@/lib/ai/models";
import { injectJsonFields } from "@/lib/stream/inject-json-fields";
import {
  type ConfigGenerationStage,
  questionProposalSchema,
  themeProposalSchema,
} from "../../shared/schemas";
import { getInterviewConfigById } from "../loaders/get-interview-config";
import { buildConfigGenerationPrompt } from "../utils/build-config-generation-prompt";
import { buildTopicConfigGenerationPrompt } from "../utils/build-topic-config-generation-prompt";

/** 設定の AI 生成に使うモデル（利用量のコスト計算にも使う） */
export const CONFIG_GENERATION_MODEL = AI_MODELS.gpt5_2;

/**
 * 生成の対象。議案は ID から読み、議題は呼び出し側（認可で読んだ議題）から問いと本文を受け取る
 */
export type ConfigGenerationTarget =
  | { kind: "bill"; billId: string }
  | { kind: "topic"; title: string; bodyMd: string };

/** 生成1回の利用量 */
export type ConfigGenerationUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
};

interface ExistingQuestion {
  question: string;
  follow_up_guide?: string | null;
  quick_replies?: string[] | null;
}

interface HandleConfigGenerationParams {
  messages: Array<{ role: string; content: string }>;
  target: ConfigGenerationTarget;
  configId?: string;
  stage: ConfigGenerationStage;
  confirmedThemes?: string[];
  existingThemes?: string[];
  existingQuestions?: ExistingQuestion[];
  /** 生成が終わったときに利用量を受け取る（議題では作成者ごとの上限のために記録する） */
  onUsage?: (usage: ConfigGenerationUsage) => Promise<void>;
  /** テストで差し替えるためのモデル。省略すると CONFIG_GENERATION_MODEL を使う */
  model?: LanguageModel;
}

/** 対象に合わせたシステムプロンプトを組み立てる */
async function buildSystemPrompt(
  target: ConfigGenerationTarget,
  configId: string | undefined,
  params: Pick<
    HandleConfigGenerationParams,
    "stage" | "confirmedThemes" | "existingThemes" | "existingQuestions"
  >
): Promise<string> {
  if (target.kind === "topic") {
    return buildTopicConfigGenerationPrompt({
      topicTitle: target.title,
      topicBodyMd: target.bodyMd,
      ...params,
    });
  }

  const billId = target.billId;
  const [bill, billContents, config] = await Promise.all([
    getBillById(billId),
    getBillContents(billId),
    configId ? getInterviewConfigById(configId) : null,
  ]);

  if (!bill) {
    throw new Error("Bill not found");
  }

  // ふつう（normal）の難易度コンテンツを使用
  const normalContent = billContents.find(
    (c) => c.difficulty_level === "normal"
  );

  return buildConfigGenerationPrompt({
    billName: bill.name,
    billTitle: normalContent?.title || "",
    billSummary: normalContent?.summary || "",
    billContent: normalContent?.content || "",
    knowledgeSource: config?.knowledge_source || undefined,
    ...params,
  });
}

export async function handleConfigGeneration({
  messages,
  target,
  configId,
  stage,
  confirmedThemes,
  existingThemes,
  existingQuestions,
  onUsage,
  model = openai(CONFIG_GENERATION_MODEL),
}: HandleConfigGenerationParams) {
  const systemPrompt = await buildSystemPrompt(target, configId, {
    stage,
    confirmedThemes,
    existingThemes,
    existingQuestions,
  });

  // メッセージが空の場合は初回呼び出し用のユーザーメッセージを追加
  const subjectLabel = target.kind === "topic" ? "議題の" : "法案";
  const effectiveMessages =
    messages.length === 0
      ? [
          {
            role: "user" as const,
            content:
              stage === "theme_proposal"
                ? `${subjectLabel}内容を分析して、テーマを提案してください。`
                : "確定したテーマに基づいて、質問を提案してください。",
          },
        ]
      : messages;

  const uiMessages = effectiveMessages.map((message) => ({
    role: message.role as "user" | "assistant",
    parts: [{ type: "text" as const, text: message.content }],
  }));

  const modelMessages = await convertToModelMessages(uiMessages);

  // 利用量の記録に失敗しても、生成した結果は返す（ログには残す）
  const handleFinish = onUsage
    ? async ({
        usage,
      }: {
        usage: { inputTokens?: number; outputTokens?: number };
      }) => {
        try {
          await onUsage({
            model: CONFIG_GENERATION_MODEL,
            inputTokens: usage.inputTokens ?? 0,
            outputTokens: usage.outputTokens ?? 0,
          });
        } catch (error) {
          console.error("Record config generation usage error:", error);
        }
      }
    : undefined;

  // ステージに応じたスキーマで streamText を実行
  const result =
    stage === "theme_proposal"
      ? streamText({
          model,
          providerOptions: OPENAI_STRUCTURED_OUTPUT_OPTIONS,
          system: systemPrompt,
          messages: modelMessages,
          output: Output.object({ schema: themeProposalSchema }),
          onError: (error) => {
            console.error("LLM generation error:", error);
          },
          onFinish: handleFinish,
        })
      : streamText({
          model,
          providerOptions: OPENAI_STRUCTURED_OUTPUT_OPTIONS,
          system: systemPrompt,
          messages: modelMessages,
          output: Output.object({ schema: questionProposalSchema }),
          onError: (error) => {
            console.error("LLM generation error:", error);
          },
          onFinish: handleFinish,
        });

  // ストリームにstageを注入
  const transformedStream = injectJsonFields(result.textStream, {
    stage,
  });

  return new Response(transformedStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
