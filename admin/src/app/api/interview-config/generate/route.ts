import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import {
  isConfigGenerationBudgetExhausted,
  recordConfigGenerationUsage,
} from "@/features/interview-config/server/services/config-generation-budget";
import {
  type ConfigGenerationTarget,
  handleConfigGeneration,
} from "@/features/interview-config/server/services/handle-config-generation";
import { parseInterviewSubjectRef } from "@/features/interview-config/shared/utils/interview-subject-ref";
import { requirePlazaAuthor } from "@/features/plaza-topics/server/lib/plaza-access";
import { authorizeTopicInterviewConfigEdit } from "@/features/plaza-topics/server/lib/topic-interview-config-access";

type GenerateRequestBody = {
  messages: Array<{ role: string; content: string }>;
  subject: unknown;
  configId?: string;
  stage: "theme_proposal" | "question_proposal";
  confirmedThemes?: string[];
  existingThemes?: string[];
  existingQuestions?: Array<{
    question: string;
    follow_up_guide?: string | null;
    quick_replies?: string[] | null;
  }>;
};

function textResponse(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/**
 * インタビュー設定の AI 生成
 *
 * - 議案（subject.kind = "bill"）: 運営者だけ。利用量の上限はかけない（今までどおり）
 * - 議題（subject.kind = "topic"）: AIインタビュー広場の機能フラグが有効で、議題の作成者本人が、
 *   下書きで回答が始まる前の議題に対してだけ使える。作成者ごとに1日の上限をかける
 *
 * エラーの本文は、画面にそのまま出せる日本語にする（AI チャットがエラー表示に使う）。
 */
export async function POST(req: Request) {
  const body = (await req
    .json()
    .catch(() => null)) as GenerateRequestBody | null;
  const subject = parseInterviewSubjectRef(body?.subject);
  if (!body || !subject) {
    return textResponse("生成の対象が正しくありません", 400);
  }

  let target: ConfigGenerationTarget;
  let onUsage: Parameters<typeof handleConfigGeneration>[0]["onUsage"];

  if (subject.kind === "bill") {
    try {
      await requireAdmin();
    } catch {
      return textResponse("Unauthorized", 401);
    }
    target = { kind: "bill", billId: subject.id };
  } else {
    let actor: Awaited<ReturnType<typeof requirePlazaAuthor>>;
    try {
      actor = await requirePlazaAuthor();
    } catch (error) {
      return textResponse(
        error instanceof Error ? error.message : "Unauthorized",
        401
      );
    }

    const access = await authorizeTopicInterviewConfigEdit(actor, subject.id);
    if (!access.ok) {
      return textResponse(access.error, access.status);
    }

    if (await isConfigGenerationBudgetExhausted(actor.id)) {
      return textResponse(
        "本日の AI による設定の生成の利用上限に達しました。明日またお試しいただくか、手で入力してください",
        429
      );
    }

    target = {
      kind: "topic",
      title: access.topic.title,
      bodyMd: access.topic.bodyMd,
    };
    const topicId = access.topic.id;
    onUsage = (usage) =>
      recordConfigGenerationUsage({ userId: actor.id, topicId, usage });
  }

  try {
    return await handleConfigGeneration({
      messages: body.messages ?? [],
      target,
      configId: subject.kind === "bill" ? body.configId : undefined,
      stage: body.stage,
      confirmedThemes: body.confirmedThemes,
      existingThemes: body.existingThemes,
      existingQuestions: body.existingQuestions,
      onUsage,
    });
  } catch (error) {
    console.error("Config generation error:", error);
    return textResponse(
      error instanceof Error ? error.message : "エラーが発生しました。",
      500
    );
  }
}
