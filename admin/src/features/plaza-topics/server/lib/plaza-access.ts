import "server-only";
import { notFound } from "next/navigation";
import {
  type AdminUser,
  requireRole,
} from "@/features/auth/server/lib/auth-server";
import { PLAZA_AUTHOR_ROLES } from "@/features/auth/shared/utils/role";
import { env } from "@/lib/env";

/**
 * AIインタビュー広場の機能フラグ（ADMIN_ENABLE_PLAZA）の確認
 *
 * 公開前の機能なので、フラグがオフの間は画面も Server Action も使えないようにする
 * （実装タスク分割 §0「公開までの安全策」）。
 */

/** ページ（Server Components）の先頭で呼ぶ。フラグがオフなら 404 にする */
export function notFoundUnlessPlazaEnabled(): void {
  if (!env.plazaEnabled) {
    notFound();
  }
}

/**
 * Server Action の先頭で呼ぶ。議題を出せる人（議員・出馬者）であることを要求する。無ければ throw
 *
 * 「自分の議題か」は議題を読んでから topic-permissions の判定で確かめる。
 */
export async function requirePlazaAuthor(): Promise<AdminUser> {
  if (!env.plazaEnabled) {
    throw new Error("AIインタビュー広場は現在利用できません");
  }
  return requireRole(PLAZA_AUTHOR_ROLES);
}
