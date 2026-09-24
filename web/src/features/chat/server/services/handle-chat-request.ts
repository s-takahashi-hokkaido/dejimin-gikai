import { openai } from "@ai-sdk/openai";
import type { Database } from "@dejimin-gikai/supabase";
import {
  convertToModelMessages,
  type LanguageModel,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import type { BillWithContent } from "@/features/bills/shared/types";
import {
  SUGGEST_INTERVIEW_TOOL_NAME,
  SUGGEST_INTERVIEW_TOOL_TYPE,
} from "@/features/chat/shared/constants";
import { ChatError, ChatErrorCode } from "@/features/chat/shared/types/errors";
import { GENERIC_ERROR_MESSAGE } from "@/features/chat/shared/utils/user-facing-error-message";
import { findPublicInterviewConfigByBillId } from "@/features/interview-config/server/repositories/interview-config-repository";
import { findLatestNonArchivedSession } from "@/features/interview-session/server/repositories/interview-session-repository";
import { AI_MODELS } from "@/lib/ai/models";
import { env } from "@/lib/env";
import { createPromptProvider, type PromptProvider } from "@/lib/prompt";
import {
  buildChatLogRows,
  extractLatestUserText,
  normalizeChatPageType,
} from "../../shared/utils/chat-log";
import { insertChatLogs } from "../repositories/chat-log-repository";
import { checkDailyCostGuard, recordChatUsage } from "./cost-tracker";

export type BudgetChatContext = {
  departmentName: string;
  direction?: string | null;
  totalBudget?: number | null;
  themes?: Array<{
    title: string;
    aiSummary?: string | null;
    initiatives?: Array<{ title: string; description?: string | null }>;
  }>;
};

export type ChatMessageMetadata = {
  billContext?: BillWithContent;
  hasInterviewConfig?: boolean;
  pageContext?: {
    type: "home" | "bill" | "budget";
    bills?: Array<{ id: string; name: string; summary?: string }>;
    budget?: BudgetChatContext;
  };
  difficultyLevel: DifficultyLevelEnum;
  sessionId: string;
};

type ChatRequestParams = {
  messages: UIMessage<ChatMessageMetadata>[];
  userId: string;
  deps?: HandleChatDeps;
};

/** テスト時にモック注入するための外部依存 */
export type HandleChatDeps = {
  promptProvider?: PromptProvider;
  model?: LanguageModel;
};

type ChatUsageMetadata =
  Database["public"]["Tables"]["chat_usage_events"]["Insert"]["metadata"];

/**
 * チャットリクエストを処理してストリーミングレスポンスを返す
 */
export async function handleChatRequest({
  messages,
  userId,
  deps,
}: ChatRequestParams) {
  const promptProvider = deps?.promptProvider ?? createPromptProvider();

  // Extract context from messages
  const context = extractChatContext(messages);

  try {
    // Check cost limit before processing
    const guard = await checkDailyCostGuard({
      userId,
      perUserLimitUsd: env.chat.dailyCostLimitUsd,
    });
    if (!guard.allowed) {
      console.warn(`Chat cost limit reached: reason=${guard.reason}`);
      throw new ChatError(ChatErrorCode.DAILY_COST_LIMIT_REACHED);
    }
  } catch (error) {
    if (error instanceof ChatError) {
      throw error;
    }
    // コストチェックに失敗した場合はログに記録して続行
    console.error("Cost limit check error:", error);
  }

  // Build prompt configuration
  const { promptName, promptResult } = await buildPrompt(
    context,
    promptProvider
  );
  // Model configuration
  const model = deps?.model ?? openai(AI_MODELS.gpt4o);
  const modelName =
    typeof model === "string" ? model : (model.modelId ?? "unknown");

  // Determine if interview suggestion should be enabled
  const shouldSuggestInterview = await determineShouldSuggestInterview(
    context,
    messages,
    userId
  );

  // Build system prompt with interview suggestion instructions
  const systemPrompt = buildSystemPromptWithInterviewInstructions(
    promptResult.content,
    shouldSuggestInterview
  );

  // Build tools configuration
  const tools = buildTools(shouldSuggestInterview);

  const userText = extractLatestUserText(messages);

  // Generate streaming response
  try {
    const result = streamText({
      model,
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools,
      onFinish: async (event) => {
        try {
          await recordChatUsage({
            userId,
            sessionId: context.sessionId || undefined,
            promptName,
            model: modelName,
            usage: event.totalUsage,
            metadata: buildUsageMetadata(context, event),
          });
        } catch (usageError) {
          console.error("Failed to record chat usage:", usageError);
        }

        // 会話ログの保存に失敗してもチャットは止めない
        try {
          await insertChatLogs(
            buildChatLogRows({
              context: {
                userId,
                sessionId: context.sessionId,
                pageType: normalizeChatPageType(context.pageContext?.type),
                billId: context.billContext?.id ?? null,
                promptName,
                promptVersionId: promptResult.versionId,
                model: modelName,
              },
              userText,
              assistantText: event.text,
            })
          );
        } catch (logError) {
          console.error("Failed to save chat logs:", logError);
        }
      },
      // ストリーミング中のエラーは外側の try/catch では捕まらないため、ここで入力とあわせて記録する
      onError: ({ error }) => {
        console.error("LLM stream error:", {
          promptName,
          model: modelName,
          userId,
          sessionId: context.sessionId,
          billId: context.billContext?.id ?? null,
          userText,
          error,
        });
      },
    });

    // 既定では OpenAI のエラー文（英語・請求情報を含む）がそのまま利用者に届くため、汎用の文面に差し替える
    return result.toUIMessageStreamResponse({
      onError: () => GENERIC_ERROR_MESSAGE,
    });
  } catch (error) {
    console.error("LLM generation error:", { promptName, userText, error });
    throw new ChatError(
      ChatErrorCode.LLM_GENERATION_FAILED,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * メッセージから最初のメタデータを抽出してコンテキストを作成
 */
function extractChatContext(
  messages: UIMessage<ChatMessageMetadata>[]
): ChatMessageMetadata {
  const metadata = messages[0]?.metadata;

  return {
    billContext: metadata?.billContext,
    hasInterviewConfig: metadata?.hasInterviewConfig,
    pageContext: metadata?.pageContext,
    difficultyLevel: (metadata?.difficultyLevel ||
      "normal") as DifficultyLevelEnum,
    sessionId: metadata?.sessionId || "",
  };
}

/**
 * コンテキストに基づいてプロンプトを組み立てる
 */
async function buildPrompt(
  context: ChatMessageMetadata,
  promptProvider: PromptProvider
) {
  // Budget チャットはインラインプロンプトを使用（DB 管理外）
  if (context.pageContext?.type === "budget") {
    return buildBudgetPrompt(context);
  }

  // Determine prompt name
  const promptName =
    context.pageContext?.type === "home"
      ? "top-chat-system"
      : `bill-chat-system-${context.difficultyLevel}`;

  // Prepare prompt variables
  const variables: Record<string, string> =
    context.pageContext?.type === "home"
      ? { billSummary: JSON.stringify(context.pageContext.bills ?? "") }
      : {
          billName: context.billContext?.name ?? "",
          billTitle: context.billContext?.bill_content?.title ?? "",
          billSummary: context.billContext?.bill_content?.summary ?? "",
          billContent: context.billContext?.bill_content?.content ?? "",
        };

  // Fetch prompt from DB
  try {
    const promptResult = await promptProvider.getPrompt(promptName, variables);
    return { promptName, promptResult };
  } catch (error) {
    console.error("Prompt fetch error:", error);
    throw new ChatError(
      ChatErrorCode.PROMPT_FETCH_FAILED,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 予算概要チャット用のインラインプロンプトを生成
 */
function buildBudgetPrompt(context: ChatMessageMetadata) {
  const budget = context.pageContext?.budget;
  const promptName = "budget-chat-system";

  const themesText =
    budget?.themes
      ?.map((t) => {
        const initiatives = t.initiatives
          ?.map(
            (i) => `  - ${i.title}${i.description ? `：${i.description}` : ""}`
          )
          .join("\n");
        return `【${t.title}】${t.aiSummary ? `\n${t.aiSummary}` : ""}${initiatives ? `\n施策:\n${initiatives}` : ""}`;
      })
      .join("\n\n") ?? "";

  const content = `あなたは札幌市の予算概要を市民にわかりやすく説明するAIアシスタントです。

## 対象局の情報
- 局名: ${budget?.departmentName ?? ""}
- 予算総額: ${budget?.totalBudget ? `${(budget.totalBudget / 10000).toFixed(0)}億円` : "不明"}
- 今年度の方向性: ${budget?.direction ?? ""}

## 重点テーマと施策
${themesText}

## 回答ガイドライン
- 市民目線でわかりやすく、具体的に説明してください
- 専門用語は噛み砕いて説明してください
- 「この施策は自分にどう関係するか」という視点を意識してください
- 上記の情報に基づいて回答し、情報がない場合は正直にその旨を伝えてください
- 予算額の比較や施策の背景など、市民が気になりそな点を補足してください`;

  return {
    promptName,
    promptResult: { content, versionId: null },
  };
}

function buildUsageMetadata(
  context: ChatMessageMetadata,
  finishEvent: { finishReason?: unknown; steps?: unknown[] }
): ChatUsageMetadata {
  const finishReason =
    typeof finishEvent.finishReason === "string"
      ? finishEvent.finishReason
      : null;
  const stepCount = Array.isArray(finishEvent.steps)
    ? finishEvent.steps.length
    : 0;

  return {
    pageType: context.pageContext?.type ?? null,
    difficultyLevel: context.difficultyLevel,
    billId: context.billContext?.id ?? null,
    finishReason,
    stepCount,
  };
}

const INTERVIEW_SUGGESTION_PROMPT = `

## AIインタビュー提案について
この法案にはAIインタビュー機能があります。以下の条件に該当する場合、通常のテキスト応答と併せて suggest_interview ツールを呼び出してください。
ただし、1つの会話の中で suggest_interview ツールを呼び出すのは1回のみとしてください。

### suggest_interview を呼び出す条件:
- ユーザーがこの法案の当事者や関係者であることがわかった場合
- ユーザーがこの法案について専門的な知識を持っていると判断できる場合
- ユーザーがこの法案に対して具体的な提言や意見を述べた場合
- ユーザーがインタビューや意見提出について質問した場合
- ユーザーが自分の意見を共有したい、政策に反映してほしいと表明した場合

### 重要:
- suggest_interview ツールの呼び出しは、通常のテキスト応答と同時に行ってください。ツールだけを呼び出してテキスト応答を省略しないでください。
- ツールの呼び出しは会話全体で最大1回です。既に呼び出し済みの場合は再度呼び出さないでください。
`;

/**
 * インタビュー提案を有効にすべきか判定
 *
 * 以下のすべてを満たす場合にtrueを返す:
 * - 法案ページである
 * - サーバー側でインタビュー設定が公開状態であることを確認
 * - 会話中にまだsuggest_interviewツールが呼び出されていない
 * - ユーザーがこの法案のインタビューを受けたことがない
 */
async function determineShouldSuggestInterview(
  context: ChatMessageMetadata,
  messages: UIMessage<ChatMessageMetadata>[],
  userId: string
): Promise<boolean> {
  if (!context.billContext) {
    return false;
  }

  if (hasExistingSuggestInterview(messages)) {
    return false;
  }

  // サーバー側でインタビュー設定の存在を検証（クライアント側のメタデータを信頼しない）
  const { data: interviewConfig } = await findPublicInterviewConfigByBillId(
    context.billContext.id
  );
  if (!interviewConfig) {
    return false;
  }

  const hasSession = await hasExistingInterviewSession(
    interviewConfig.id,
    userId
  );
  return !hasSession;
}

/**
 * 会話履歴にsuggest_interviewツール呼び出しが既に存在するか判定
 */
function hasExistingSuggestInterview(
  messages: UIMessage<ChatMessageMetadata>[]
): boolean {
  return messages.some(
    (msg) =>
      msg.role === "assistant" &&
      msg.parts.some(
        (part) =>
          "toolCallId" in part && part.type === SUGGEST_INTERVIEW_TOOL_TYPE
      )
  );
}

/**
 * ユーザーがこのインタビュー設定に対するセッションを持っているか判定
 * fail-closed: エラー時はtrue（セッションあり）を返し、誤ったバナー表示を防ぐ
 */
async function hasExistingInterviewSession(
  interviewConfigId: string,
  userId: string
): Promise<boolean> {
  try {
    const session = await findLatestNonArchivedSession(
      interviewConfigId,
      userId
    );
    return session !== null;
  } catch (error) {
    console.error("Failed to check existing interview session:", error);
    return true;
  }
}

/**
 * インタビュー提案の指示をシステムプロンプトに追加
 */
function buildSystemPromptWithInterviewInstructions(
  basePrompt: string,
  shouldSuggestInterview: boolean
): string {
  if (shouldSuggestInterview) {
    return basePrompt + INTERVIEW_SUGGESTION_PROMPT;
  }
  return basePrompt;
}

/**
 * チャットで使用するツール一覧を構築
 */
function buildTools(shouldSuggestInterview: boolean) {
  // biome-ignore lint/suspicious/noExplicitAny: OpenAI web_search tool type incompatibility
  const tools: Record<string, any> = {
    web_search: openai.tools.webSearch(),
  };

  if (shouldSuggestInterview) {
    tools[SUGGEST_INTERVIEW_TOOL_NAME] = tool({
      description:
        "ユーザーが法案の当事者・有識者であると判断された場合、またはインタビューについて聞かれた場合に呼び出す。通常のテキスト応答と同時に呼び出すこと。",
      inputSchema: z.object({}),
      execute: async () => ({ suggested: true }),
    });
  }

  return tools;
}
