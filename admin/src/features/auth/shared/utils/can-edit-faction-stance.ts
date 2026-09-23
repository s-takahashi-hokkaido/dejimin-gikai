import type { AdminRole } from "./role";

/** 会派見解の編集可否の判定に使う利用者の情報 */
export type FactionStanceEditor = {
  role: AdminRole;
  factionId: string | null;
};

/**
 * その会派の見解を編集できるか
 *
 * 運営者はすべての会派、議員は自分が所属する会派のみ。出馬者は編集できない。
 */
export function canEditFactionStance(
  editor: FactionStanceEditor,
  factionId: string
): boolean {
  switch (editor.role) {
    case "admin":
      return true;
    case "legislator":
      return editor.factionId !== null && editor.factionId === factionId;
    default:
      return false;
  }
}
