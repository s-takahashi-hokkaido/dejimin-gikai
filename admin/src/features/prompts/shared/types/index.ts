export type PromptVersion = {
  id: string;
  version: number;
  content: string;
  note: string | null;
  createdAt: string;
  isActive: boolean;
};

export type PromptSummary = {
  id: string;
  name: string;
  description: string | null;
  activeVersion: number | null;
  updatedAt: string;
};

export type PromptDetail = {
  id: string;
  name: string;
  description: string | null;
  activeVersion: PromptVersion | null;
  /** 新しい版が先頭 */
  versions: PromptVersion[];
};

export type SavePromptVersionInput = {
  promptId: string;
  content: string;
  note: string;
};
