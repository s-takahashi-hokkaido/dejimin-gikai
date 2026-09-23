export interface PromptVariables {
  [key: string]: string;
}

export interface CompiledPrompt {
  content: string;
  /** 使った版の ID（DB 管理外のプロンプトは null） */
  versionId: string | null;
}
