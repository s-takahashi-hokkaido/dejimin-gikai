import "server-only";

import { createAdminClient } from "@dejimin-gikai/supabase";
import {
  type AuditActor,
  buildAuditActorHeaders,
} from "../../shared/utils/audit-actor";

/**
 * 監査ログに実行者が残る Service Role クライアント
 *
 * bills / bill_contents / faction_stances への書き込みは DB のトリガーで
 * admin_audit_logs に記録される。このクライアント経由で書くと実行者も記録され、
 * createAdminClient() で書くと「直接操作（実行者なし）」として記録される。
 * 管理画面の操作でこれらのテーブルに書き込むときは必ずこちらを使うこと。
 */
export function createAuditedAdminClient(actor: AuditActor) {
  return createAdminClient({ headers: buildAuditActorHeaders(actor) });
}
