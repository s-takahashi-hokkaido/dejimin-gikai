/**
 * インタビューチャットで選択可能なAIモデルの定義
 * OpenAI を直接呼ぶため、OpenAI のモデルだけを並べる（送信先はプライバシーポリシーで OpenAI 1社としている）
 */

import { AI_MODELS, DEFAULT_INTERVIEW_CHAT_MODEL } from "@/lib/ai/models";
import {
  estimateInterviewCostUsd,
  formatEstimatedCost,
} from "./estimate-interview-cost";

type ChatModelOption = {
  value: string;
  label: string;
  estimatedCost: string | null;
};

export type ChatModelGroup = {
  provider: string;
  options: ChatModelOption[];
};

const OPENAI_MODELS = [
  { value: AI_MODELS.gpt4o_mini, label: "GPT-4o mini" },
  { value: AI_MODELS.gpt5, label: "GPT-5" },
  { value: AI_MODELS.gpt5_mini, label: "GPT-5 mini" },
  { value: AI_MODELS.gpt5_nano, label: "GPT-5 nano" },
  { value: AI_MODELS.gpt5_chat, label: "GPT-5 Chat" },
  { value: AI_MODELS.gpt5_1_chat, label: "GPT-5.1 Instant" },
  { value: AI_MODELS.gpt5_1, label: "GPT-5.1 Thinking" },
  { value: AI_MODELS.gpt5_2, label: "GPT-5.2" },
] as const;

/** フラットなモデル一覧（バリデーション用） */
export const CHAT_MODEL_OPTIONS = [...OPENAI_MODELS] as const;

export type ChatModelValue = (typeof CHAT_MODEL_OPTIONS)[number]["value"];

function buildGroupOptions(
  models: ReadonlyArray<{ value: string; label: string }>
): ChatModelOption[] {
  return models.map((m) => {
    const cost = estimateInterviewCostUsd(m.value);
    return {
      value: m.value,
      label: m.label,
      estimatedCost: cost !== null ? formatEstimatedCost(cost) : null,
    };
  });
}

/** プロバイダー別にグループ化されたモデル一覧（UI表示用） */
export const CHAT_MODEL_GROUPS: ChatModelGroup[] = [
  { provider: "OpenAI", options: buildGroupOptions(OPENAI_MODELS) },
];

/** 文字列が有効なチャットモデルIDかどうかを検証する */
export function isValidChatModel(model: string): model is ChatModelValue {
  return CHAT_MODEL_OPTIONS.some((opt) => opt.value === model);
}

/** デフォルトモデルの表示ラベル（例: "GPT-5.2 ~29円/回"） */
export const DEFAULT_MODEL_LABEL = (() => {
  const model = CHAT_MODEL_OPTIONS.find(
    (opt) => opt.value === DEFAULT_INTERVIEW_CHAT_MODEL
  );
  const cost = estimateInterviewCostUsd(DEFAULT_INTERVIEW_CHAT_MODEL);
  const costStr = cost !== null ? ` ${formatEstimatedCost(cost)}/回` : "";
  return `${model?.label ?? DEFAULT_INTERVIEW_CHAT_MODEL}${costStr}`;
})();
