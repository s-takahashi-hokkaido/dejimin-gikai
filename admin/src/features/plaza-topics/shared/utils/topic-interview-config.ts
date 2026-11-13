import {
  canCreateTopic,
  canEditTopic,
  isOwnTopic,
  type TopicAccessTarget,
  type TopicActor,
} from "./topic-permissions";

/**
 * 議題のインタビュー設定（AIインタビュー広場）
 *
 * 作成者が触れるのはテーマ・質問・目安時間だけ。ほかの項目は固定する
 * （docs/20261113_2018_AIインタビュー広場_プロンプト設計.md §3-1）。
 */

/** 設定名。議題の設定は1つだけなので見分ける必要がなく、タイトルを入れると古いまま残るので固定にする */
export const TOPIC_INTERVIEW_CONFIG_NAME = "議題のインタビュー設定";

/** 目安時間（分）の範囲と既定値 */
export const TOPIC_INTERVIEW_DURATION = {
  min: 5,
  max: 30,
  default: 10,
} as const;

/** テーマの数の上限 */
export const TOPIC_INTERVIEW_THEMES_MAX = 10;

/** テーマ1つの文字数の上限 */
export const TOPIC_INTERVIEW_THEME_MAX_LENGTH = 100;

/** 議題の質問の数の上限 */
export const TOPIC_INTERVIEW_QUESTIONS_MAX = 15;

export type TopicInterviewSettings = {
  themes: string[];
  estimatedDuration: number;
};

export type TopicInterviewSettingsValidation =
  | { ok: true; value: TopicInterviewSettings }
  | { ok: false; error: string };

/**
 * 作成者が入力したテーマと目安時間を確かめて整える
 *
 * テーマは前後の空白を除き、空の行と重複を除く。Server Action では型から確かめる。
 */
export function normalizeTopicInterviewSettings(input: {
  themes?: unknown;
  estimatedDuration?: unknown;
}): TopicInterviewSettingsValidation {
  if (
    !Array.isArray(input.themes) ||
    !input.themes.every((theme) => typeof theme === "string")
  ) {
    return { ok: false, error: "テーマの形式が正しくありません" };
  }

  const themes = [
    ...new Set(
      (input.themes as string[])
        .map((theme) => theme.replace(/\s+/g, " ").trim())
        .filter((theme) => theme !== "")
    ),
  ];
  if (themes.length > TOPIC_INTERVIEW_THEMES_MAX) {
    return {
      ok: false,
      error: `テーマは${TOPIC_INTERVIEW_THEMES_MAX}個までにしてください`,
    };
  }
  if (themes.some((theme) => theme.length > TOPIC_INTERVIEW_THEME_MAX_LENGTH)) {
    return {
      ok: false,
      error: `テーマは1つ${TOPIC_INTERVIEW_THEME_MAX_LENGTH}文字以内で入力してください`,
    };
  }

  const duration = input.estimatedDuration;
  if (
    typeof duration !== "number" ||
    !Number.isInteger(duration) ||
    duration < TOPIC_INTERVIEW_DURATION.min ||
    duration > TOPIC_INTERVIEW_DURATION.max
  ) {
    return {
      ok: false,
      error: `目安時間は${TOPIC_INTERVIEW_DURATION.min}〜${TOPIC_INTERVIEW_DURATION.max}分の整数で入力してください`,
    };
  }

  return { ok: true, value: { themes, estimatedDuration: duration } };
}

/**
 * 議題の設定として DB に入れる値
 *
 * - モードは都度深掘り（loop）に固定（プロンプト設計 §4-1）
 * - モデルは既定値（null）に固定。作成者ごとに違うモデルにしない
 * - ナレッジソースは使わない。来訪者に見えないところで AI の聞き方を変えられないようにするため
 * - status は既定値（closed）のまま。受付の可否は議題の状態で決まる（D2 §6-2）
 */
export function buildTopicInterviewConfigRecord(
  settings: TopicInterviewSettings
) {
  return {
    name: TOPIC_INTERVIEW_CONFIG_NAME,
    status: "closed" as const,
    mode: "loop" as const,
    chat_model: null,
    knowledge_source: null,
    themes: settings.themes.length > 0 ? settings.themes : null,
    estimated_duration: settings.estimatedDuration,
  };
}

/**
 * 議題のインタビュー設定（テーマ・質問・目安時間）を変えられるか。できなければ理由を返す
 *
 * 議題の本文と同じ条件（自分の議題で、編集できる状態）に加えて、回答が始まっていないこと。
 * 「回答が始まった」は、その議題の設定にインタビューセッションが1件でもあること（D2 §6-2）。
 */
export function validateTopicInterviewConfigEdit(
  actor: TopicActor,
  topic: TopicAccessTarget,
  { hasResponses }: { hasResponses: boolean }
): string | null {
  if (!canCreateTopic(actor.role)) {
    return "インタビュー設定を変更できるのは議員と出馬者だけです";
  }
  if (!isOwnTopic(actor, topic)) {
    return "自分の議題のインタビュー設定だけ変更できます";
  }
  // ロールと作成者は上で確かめたので、ここで落ちるのは議題の状態による
  if (!canEditTopic(actor, topic)) {
    return "下書きの議題のインタビュー設定だけ変更できます";
  }
  if (hasResponses) {
    return "回答が始まった議題のインタビュー設定は変更できません";
  }
  return null;
}
