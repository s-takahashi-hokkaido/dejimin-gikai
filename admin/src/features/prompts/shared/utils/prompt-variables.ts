const VARIABLE_PATTERN = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;

/**
 * プロンプト本文に含まれる {{変数名}} を、出てきた順に重複なしで返す
 *
 * web 側の compilePrompt と同じパターンで判定する。
 */
export function extractPromptVariables(content: string): string[] {
  const names = Array.from(content.matchAll(VARIABLE_PATTERN), (m) => m[1]);
  return [...new Set(names)];
}

/**
 * 有効な版にはあったが、編集中の本文から消えた変数を返す
 *
 * コードは変数を渡し続けるので、消すと議案の情報などがプロンプトに入らなくなる。
 */
export function findRemovedVariables(
  previousContent: string,
  nextContent: string
): string[] {
  const next = new Set(extractPromptVariables(nextContent));
  return extractPromptVariables(previousContent).filter(
    (name) => !next.has(name)
  );
}
