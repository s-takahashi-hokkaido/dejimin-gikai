import { DbPromptProvider } from "./db/db-prompt-provider";
import type { PromptProvider } from "./interface/prompt-provider";

/**
 * プロンプトプロバイダーの作成処理
 *
 * PromptProvider インターフェースで抽象化されているため、
 * テストでは deps から別の実装（test-utils/mock-prompt-provider.ts）を注入する。
 */
export function createPromptProvider(): PromptProvider {
  return new DbPromptProvider();
}

export type { PromptProvider } from "./interface/prompt-provider";
export type { CompiledPrompt, PromptVariables } from "./interface/types";
