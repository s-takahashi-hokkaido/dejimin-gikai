import "server-only";
import type { PromptProvider } from "../interface/prompt-provider";
import type { CompiledPrompt, PromptVariables } from "../interface/types";
import { compilePrompt } from "../shared/compile-prompt";
import { findActivePromptVersionByName } from "./prompt-repository";

/**
 * DB の prompts テーブルからプロンプトを取得する
 *
 * admin の画面で版を切り替えると、次のリクエストから反映される（キャッシュしない）。
 */
export class DbPromptProvider implements PromptProvider {
  async getPrompt(
    name: string,
    variables?: PromptVariables
  ): Promise<CompiledPrompt> {
    const version = await findActivePromptVersionByName(name);
    if (!version) {
      throw new Error(`Prompt "${name}" not found or has no active version`);
    }

    return {
      content: compilePrompt(version.content, variables),
      versionId: version.id,
    };
  }
}
