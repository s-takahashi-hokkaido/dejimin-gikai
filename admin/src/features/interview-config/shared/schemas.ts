import { z } from "zod";

/**
 * AI設定生成の処理ステージ
 */
export const configGenerationStageSchema = z.enum([
  "theme_proposal",
  "theme_confirmed",
  "question_proposal",
  "question_confirmed",
]);

export type ConfigGenerationStage = z.infer<typeof configGenerationStageSchema>;

/**
 * テーマ提案フェーズ用のLLM出力スキーマ
 */
export const themeProposalSchema = z.object({
  text: z.string().describe("AIの説明テキスト"),
  themes: z.array(z.string()).describe("提案するテーマの配列"),
});

export type ThemeProposal = z.infer<typeof themeProposalSchema>;

/**
 * 質問提案フェーズ用のLLM出力スキーマ
 */
export const questionProposalSchema = z.object({
  text: z.string().describe("AIの説明テキスト"),
  questions: z
    .array(
      z.object({
        question: z.string().describe("質問文"),
        follow_up_guide: z
          .string()
          .nullable()
          .describe("フォローアップ指針（深掘り方法など）"),
        quick_replies: z
          .array(z.string())
          .nullable()
          .describe("クイックリプライの選択肢"),
      })
    )
    .describe("提案する質問の配列"),
});

export type QuestionProposal = z.infer<typeof questionProposalSchema>;

/**
 * クライアント側で使う統一レスポンススキーマ
 * stage フィールドはサーバー側で injectJsonFields により注入される
 */
export const configGenerationResponseSchema = z.object({
  text: z.string(),
  themes: z.array(z.string()).optional(),
  questions: z
    .array(
      z.object({
        question: z.string(),
        follow_up_guide: z.string().optional(),
        quick_replies: z.array(z.string()).optional(),
      })
    )
    .optional(),
  stage: configGenerationStageSchema.optional(),
});

export type ConfigGenerationResponse = z.infer<
  typeof configGenerationResponseSchema
>;

/**
 * AI 設定生成の API（/api/interview-config/generate）のリクエスト
 *
 * クライアントはこの型で送り、API はこのスキーマで確かめる。
 * 会話の role は user / assistant だけを受け付ける（system を混ぜてプロンプトを上書きさせない）。
 */
export const configGenerationRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  subject: z.object({
    kind: z.enum(["bill", "topic"]),
    id: z.string(),
  }),
  configId: z.string().optional(),
  stage: z.enum(["theme_proposal", "question_proposal"]),
  confirmedThemes: z.array(z.string()).optional(),
  existingThemes: z.array(z.string()).optional(),
  existingQuestions: z
    .array(
      z.object({
        question: z.string(),
        follow_up_guide: z.string().nullable().optional(),
        quick_replies: z.array(z.string()).nullable().optional(),
      })
    )
    .optional(),
});

export type ConfigGenerationRequest = z.infer<
  typeof configGenerationRequestSchema
>;
