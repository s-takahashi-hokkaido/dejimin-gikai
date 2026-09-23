import type { PromptVariables } from "../interface/types";

const VARIABLE_PATTERN = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;

/**
 * プロンプト本文の {{変数名}} を値で置き換える純粋関数
 *
 * Langfuse（mustache）と同じく、値が渡されなかった変数は空文字にする。
 * 値の中の {{...}} は置き換えない（1回だけ走査する）。
 */
export function compilePrompt(
  template: string,
  variables?: PromptVariables
): string {
  return template.replace(
    VARIABLE_PATTERN,
    (_match, name: string) => variables?.[name] ?? ""
  );
}
