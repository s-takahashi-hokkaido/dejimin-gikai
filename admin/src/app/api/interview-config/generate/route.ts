import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import {
  isConfigGenerationBudgetExhausted,
  recordConfigGenerationUsage,
} from "@/features/interview-config/server/services/config-generation-budget";
import {
  type ConfigGenerationTarget,
  type ConfigGenerationUsage,
  handleConfigGeneration,
} from "@/features/interview-config/server/services/handle-config-generation";
import { configGenerationRequestSchema } from "@/features/interview-config/shared/schemas";
import { parseInterviewSubjectRef } from "@/features/interview-config/shared/utils/interview-subject-ref";
import { validateTopicGenerationRequest } from "@/features/interview-config/shared/utils/validate-topic-generation-request";
import { requirePlazaAuthor } from "@/features/plaza-topics/server/lib/plaza-access";
import { authorizeTopicInterviewConfigEdit } from "@/features/plaza-topics/server/lib/topic-interview-config-access";

/** 議題の作成者に見せる、生成に失敗したときの文（内部のエラーの中身は出さない） */
const TOPIC_GENERATION_FAILED =
  "AI による生成に失敗しました。時間をおいてもう一度お試しください";

function textResponse(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

type PreparedGeneration =
  | {
      ok: true;
      target: ConfigGenerationTarget;
      onUsage?: (usage: ConfigGenerationUsage) => Promise<void>;
    }
  | { ok: false; response: Response };

/** 議題の生成: 作成者本人か・回答が始まっていないか・1日の上限に収まるかを確かめる */
async function prepareTopicGeneration(
  topicId: string
): Promise<PreparedGeneration> {
  let actor: Awaited<ReturnType<typeof requirePlazaAuthor>>;
  try {
    actor = await requirePlazaAuthor();
  } catch (error) {
    return {
      ok: false,
      response: textResponse(
        error instanceof Error ? error.message : "Unauthorized",
        401
      ),
    };
  }

  const access = await authorizeTopicInterviewConfigEdit(actor, topicId);
  if (!access.ok) {
    return { ok: false, response: textResponse(access.error, access.status) };
  }

  if (await isConfigGenerationBudgetExhausted(actor.id)) {
    return {
      ok: false,
      response: textResponse(
        "本日の AI による設定の生成の利用上限に達しました。明日またお試しいただくか、手で入力してください",
        429
      ),
    };
  }

  const topic = access.topic;
  return {
    ok: true,
    target: { kind: "topic", title: topic.title, bodyMd: topic.bodyMd },
    onUsage: (usage) =>
      recordConfigGenerationUsage({
        userId: actor.id,
        topicId: topic.id,
        usage,
      }),
  };
}

/**
 * インタビュー設定の AI 生成
 *
 * - 議案（subject.kind = "bill"）: 運営者だけ。利用量の上限はかけない（今までどおり）
 * - 議題（subject.kind = "topic"）: AIインタビュー広場の機能フラグが有効で、議題の作成者本人が、
 *   下書きで回答が始まる前の議題に対してだけ使える。作成者ごとに1日の上限をかけ、1回に送れる量も抑える
 *
 * 議題のエラーの本文は、画面にそのまま出せる日本語にする（AI チャットがエラー表示に使う）。
 */
export async function POST(req: Request) {
  const parsed = configGenerationRequestSchema.safeParse(
    await req.json().catch(() => null)
  );
  const subject = parsed.success
    ? parseInterviewSubjectRef(parsed.data.subject)
    : null;
  if (!parsed.success || !subject) {
    return textResponse("生成のリクエストが正しくありません", 400);
  }
  const request = parsed.data;

  let prepared: PreparedGeneration;
  if (subject.kind === "bill") {
    try {
      await requireAdmin();
    } catch {
      return textResponse("Unauthorized", 401);
    }
    prepared = { ok: true, target: { kind: "bill", billId: subject.id } };
  } else {
    const tooLarge = validateTopicGenerationRequest(request);
    if (tooLarge) {
      return textResponse(tooLarge, 400);
    }
    try {
      prepared = await prepareTopicGeneration(subject.id);
    } catch (error) {
      console.error("Config generation authorization error:", error);
      return textResponse(TOPIC_GENERATION_FAILED, 500);
    }
  }
  if (!prepared.ok) {
    return prepared.response;
  }

  try {
    return await handleConfigGeneration({
      messages: request.messages,
      target: prepared.target,
      configId: subject.kind === "bill" ? request.configId : undefined,
      stage: request.stage,
      confirmedThemes: request.confirmedThemes,
      existingThemes: request.existingThemes,
      existingQuestions: request.existingQuestions,
      onUsage: prepared.onUsage,
    });
  } catch (error) {
    console.error("Config generation error:", error);
    if (subject.kind === "topic") {
      return textResponse(TOPIC_GENERATION_FAILED, 500);
    }
    return textResponse(
      error instanceof Error ? error.message : "エラーが発生しました。",
      500
    );
  }
}
