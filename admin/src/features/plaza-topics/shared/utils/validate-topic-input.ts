import type { TopicInput } from "../types/plaza-topic";

/** タイトルの上限（文字数。一覧のカードで読み切れる長さにする） */
export const TOPIC_TITLE_MAX_LENGTH = 100;

/** 本文の上限（文字数） */
export const TOPIC_BODY_MAX_LENGTH = 20000;

/** DB に入れる形に整えた議題の入力 */
export type NormalizedTopicInput = {
  title: string;
  bodyMd: string;
};

export type TopicInputValidation =
  | { ok: true; value: NormalizedTopicInput }
  | { ok: false; error: string };

/**
 * 議題の作成・編集フォームの入力を確かめて整える
 *
 * - タイトル: 改行や連続する空白を1つの空白にし、前後の空白を除く。必須
 * - 本文（Markdown）: 改行コードを LF にそろえる。空白だけなら空にする。下書きのうちは空でもよい
 *   （オープンするときに本文が要る。DB の CHECK 制約 interview_topics_published_requires_body）
 *
 * Server Action では、画面から何が送られてきても安全なように、型から確かめる。
 */
export function normalizeTopicInput(
  input: Partial<Record<keyof TopicInput, unknown>>
): TopicInputValidation {
  if (typeof input.title !== "string" || typeof input.bodyMd !== "string") {
    return { ok: false, error: "入力の形式が正しくありません" };
  }

  const title = input.title.replace(/\s+/g, " ").trim();
  if (title === "") {
    return { ok: false, error: "タイトルを入力してください" };
  }
  if (title.length > TOPIC_TITLE_MAX_LENGTH) {
    return {
      ok: false,
      error: `タイトルは${TOPIC_TITLE_MAX_LENGTH}文字以内で入力してください`,
    };
  }

  const normalizedBody = input.bodyMd.replace(/\r\n?/g, "\n");
  const bodyMd = normalizedBody.trim() === "" ? "" : normalizedBody;
  if (bodyMd.length > TOPIC_BODY_MAX_LENGTH) {
    return {
      ok: false,
      error: `本文は${TOPIC_BODY_MAX_LENGTH}文字以内で入力してください`,
    };
  }

  return { ok: true, value: { title, bodyMd } };
}
