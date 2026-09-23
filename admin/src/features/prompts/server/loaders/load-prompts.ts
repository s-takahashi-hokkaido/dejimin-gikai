import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import type { PromptDetail, PromptSummary } from "../../shared/types";
import { findPromptById, findPrompts } from "../repositories/prompt-repository";

export async function loadPrompts(): Promise<PromptSummary[]> {
  noStore();

  const prompts = await findPrompts();

  return prompts.map((prompt) => ({
    id: prompt.id,
    name: prompt.name,
    description: prompt.description,
    activeVersion: prompt.active_version?.version ?? null,
    updatedAt: prompt.updated_at,
  }));
}

export async function loadPromptDetail(
  id: string
): Promise<PromptDetail | null> {
  noStore();

  const prompt = await findPromptById(id);
  if (!prompt) {
    return null;
  }

  const versions = prompt.versions.map((version) => ({
    id: version.id,
    version: version.version,
    content: version.content,
    note: version.note,
    createdAt: version.created_at,
    isActive: version.id === prompt.active_version_id,
  }));

  return {
    id: prompt.id,
    name: prompt.name,
    description: prompt.description,
    activeVersion: versions.find((version) => version.isActive) ?? null,
    versions,
  };
}
