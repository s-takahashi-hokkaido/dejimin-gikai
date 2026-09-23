import type { Database } from "@dejimin-gikai/supabase";
import type { UIMessage } from "ai";

export type ChatLogInsert = Database["public"]["Tables"]["chat_logs"]["Insert"];

export type ChatLogContext = {
  userId: string;
  sessionId: string | null;
  pageType: "home" | "bill" | "budget";
  billId: string | null;
  promptName: string;
  promptVersionId: string | null;
  model: string;
};

const PAGE_TYPES = ["home", "bill", "budget"] as const;

/**
 * ブラウザが送ってきたページ種別を、会話ログに入れられる値に揃える
 *
 * handleChatRequest は home・budget 以外を議案のチャットとして扱うため、
 * それ以外の値は "bill" にする（DB の check 制約でログごと落ちないように）。
 */
export function normalizeChatPageType(
  value: string | undefined
): ChatLogContext["pageType"] {
  return PAGE_TYPES.find((type) => type === value) ?? "bill";
}

/**
 * 最新のユーザーの発言のテキストを取り出す
 *
 * ブラウザは毎回それまでの会話を全部送ってくるため、
 * 今回のリクエストで新しく増えたのは最後のユーザーの発言だけ。
 */
export function extractLatestUserText(
  messages: Pick<UIMessage, "role" | "parts">[]
): string {
  const latest = messages.findLast((message) => message.role === "user");
  if (!latest) {
    return "";
  }
  return latest.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("\n");
}

/**
 * 1往復分（ユーザーの発言と AI の応答）の会話ログの行を組み立てる
 *
 * 本文が空の発言は保存しない（ツール呼び出しだけの応答など）。
 */
export function buildChatLogRows({
  context,
  userText,
  assistantText,
}: {
  context: ChatLogContext;
  userText: string;
  assistantText: string;
}): ChatLogInsert[] {
  const common = {
    user_id: context.userId,
    session_id: context.sessionId || null,
    page_type: context.pageType,
    bill_id: context.billId,
    prompt_name: context.promptName,
    prompt_version_id: context.promptVersionId,
  };

  const rows: ChatLogInsert[] = [];
  if (userText.trim()) {
    rows.push({ ...common, role: "user", message: userText, model: null });
  }
  if (assistantText.trim()) {
    rows.push({
      ...common,
      role: "assistant",
      message: assistantText,
      model: context.model,
    });
  }
  return rows;
}
