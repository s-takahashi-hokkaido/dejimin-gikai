/**
 * 監査ログの実行者（actor）をDBのトリガーへ渡すための変換
 *
 * admin アプリは PostgREST へのリクエストヘッダ AUDIT_ACTOR_HEADER に
 * base64(JSON) で実行者を載せ、トリガー record_admin_audit_log() がそれを読んで記録する。
 * JSON のキーはトリガー側（supabase/migrations/*_add_admin_audit_logs.sql）と揃えること。
 */

export const AUDIT_ACTOR_HEADER = "x-audit-actor";

export type AuditActor = {
  id: string;
  email: string;
  role: string;
  factionId: string | null;
};

/** 実行者をヘッダ値にする。ヘッダは ASCII しか通らないため base64 にする */
export function encodeAuditActor(actor: AuditActor): string {
  // 余計なプロパティ（displayName など）をヘッダに載せない
  const payload: AuditActor = {
    id: actor.id,
    email: actor.email,
    role: actor.role,
    factionId: actor.factionId,
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

/** 実行者を載せたリクエストヘッダ */
export function buildAuditActorHeaders(
  actor: AuditActor
): Record<string, string> {
  return { [AUDIT_ACTOR_HEADER]: encodeAuditActor(actor) };
}
