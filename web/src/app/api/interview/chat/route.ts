import { getChatSupabaseUser } from "@/features/chat/server/utils/supabase-server";
import { ChatError, ChatErrorCode } from "@/features/chat/shared/types/errors";
import { handleInterviewChatRequest } from "@/features/interview-session/server/services/handle-interview-chat-request";

export async function POST(req: Request) {
  const body = await req.json();
  const {
    messages,
    billId,
    currentStage,
    isRetry,
  }: {
    messages: Array<{ role: string; content: string }>;
    billId: string;
    currentStage: "chat" | "summary" | "summary_complete";
    isRetry?: boolean;
  } = body;

  const {
    data: { user },
    error: getUserError,
  } = await getChatSupabaseUser();

  if (getUserError || !user) {
    return new Response(
      JSON.stringify({
        error: "Anonymous session required",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!billId) {
    return new Response(
      JSON.stringify({
        error: "billId is required",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    return await handleInterviewChatRequest({
      messages,
      billId,
      currentStage,
      isRetry,
    });
  } catch (error) {
    console.error("Interview chat request error:", error);

    // レートリミットエラー
    if (
      error instanceof ChatError &&
      error.code === ChatErrorCode.DAILY_COST_LIMIT_REACHED
    ) {
      return new Response(
        "本日の利用上限に達しました。明日0時以降に再度お試しください。",
        {
          status: 429,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }
      );
    }

    return new Response(
      error instanceof Error
        ? error.message
        : "エラーが発生しました。しばらく待ってから再度お試しください。",
      {
        status: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }
    );
  }
}
