import { isUuid } from "@/lib/utils/is-uuid";

/**
 * インタビュー設定の AI 生成の対象（議案か、AIインタビュー広場の議題か）
 *
 * D2（docs/20261112_2150_AIインタビュー広場_インタビュー対象の抽象化.md §4）の `InterviewSubjectRef` と同じ形。
 * P4 で packages/shared に共通の型ができたら、そちらに置き換える。
 */
export type InterviewSubjectKind = "bill" | "topic";

export type InterviewSubjectRef = {
  kind: InterviewSubjectKind;
  id: string;
};

/** 画面とプロンプトで対象を呼ぶ語（議案の文言は今のまま「法案」） */
export const SUBJECT_LABELS: Record<InterviewSubjectKind, string> = {
  bill: "法案",
  topic: "議題",
};

/** API の body から対象の参照を読む。形が違えば null */
export function parseInterviewSubjectRef(
  value: unknown
): InterviewSubjectRef | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const { kind, id } = value as { kind?: unknown; id?: unknown };
  if ((kind !== "bill" && kind !== "topic") || !isUuid(id)) {
    return null;
  }
  return { kind, id };
}
