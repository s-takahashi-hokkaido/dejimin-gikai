/**
 * 定例会と議案を投入するスクリプト（札幌市の実データ）
 *
 * ## 何のためか
 * `pnpm seed:master` が入れるのは会派・委員会・タグだけで、議案は入らない（議案はマスタではない）。
 * `pnpm seed`（main/run.ts）は `clearAllData` で全件消してから入れるので本番には使えない。
 * VPS に 129 件の議案を入れる手段がこれまで無く、管理画面から手入力するのも現実的でないため、
 * 削除しない・冪等な投入コマンドとして分けた。
 *
 * ## このスクリプトの約束
 * - **削除しない**。`delete` / `truncate` は一切実行しない
 * - **冪等**。定例会は slug、議案は (議案番号, 種別) で突き合わせ、差分のある列だけ update する
 * - **管理画面が持つ列を上書きしない**。`publish_status` / `is_featured` / サムネイル /
 *   `discussion_overview_points` は新規作成時にだけ入れ、以後は触らない（`buildBillUpdate` を参照）
 * - **市民向け解説（bill_contents）は一度入れたら上書きしない**。AI 生成文を人が直したものを
 *   流し直しで戻さないため。作り直したい時は管理画面で編集する
 * - **マスタが揃っていなければ何も書かずに落ちる**。先に `pnpm seed:master` を流す
 * - **既定は dry-run**。接続先を表示し、`--yes` を付けたときだけ書き込む
 *
 * ## 使い方
 * ```bash
 * pnpm seed:bills              # 接続先と投入予定を表示するだけ
 * pnpm seed:bills --yes        # 実際に投入する
 * ```
 * 接続先は `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`（既存の seed と同じ作法）。
 * VPS へ流す時は SSH トンネル越しの Kong を指す（さくらVPS 立ち上げ手順 手順8）。
 */

import type { Database } from "@dejimin-gikai/supabase";
import type { SeedBill, SeedSession } from "../main/sapporo-bills/types";
import { sapporoSessions } from "../main/sapporo-bills/sessions";
import {
  type ExistingRow,
  planMasterUpsert,
} from "../master/utils/plan-master-upsert";
import {
  describeSeedTarget,
  resolveSeedTarget,
  type SeedTarget,
} from "../master/utils/resolve-seed-target";
import { type AdminClient, createAdminClient } from "../shared/helper";
import {
  billKey,
  buildBillInsert,
  buildBillUpdate,
  buildChildRows,
  buildSessionRow,
  collectMasterReferences,
  findMissingMasters,
  hasMissingMasters,
  type MasterReferences,
  normalizeExistingBill,
  selectNewRows,
} from "./utils/plan-bill-seed";

type BillInsert = Database["public"]["Tables"]["bills"]["Insert"];

type ConnectedTarget = Extract<SeedTarget, { mode: "dry-run" | "apply" }>;

const SEED_BILLS_USAGE = [
  "使い方: pnpm seed:bills [--yes | --dry-run]",
  "",
  "  --dry-run  既定。接続先と投入予定の件数だけを表示し、DB には書き込まない",
  "  --yes      実際に投入する（接続先を確認してから付けること）",
  "  --help     この使い方を表示する",
  "",
  "接続先は環境変数 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY で指定する。",
  "先に pnpm seed:master でマスタ（会派・委員会・タグ）を入れておくこと。",
].join("\n");

function unwrap<T>(
  result: { data: T | null; error: { message: string } | null },
  what: string,
): T {
  if (result.error) throw new Error(`${what}に失敗しました: ${result.error.message}`);
  if (result.data === null) throw new Error(`${what}の結果が空です`);
  return result.data;
}

function ensureNoError(
  result: { error: { message: string } | null },
  what: string,
): void {
  if (result.error) throw new Error(`${what}に失敗しました: ${result.error.message}`);
}

type Masters = {
  factions: { id: string; name: string }[];
  committeeIdByName: Map<string, string>;
  tagIdByLabel: Map<string, string>;
  available: MasterReferences;
};

async function readMasters(supabase: AdminClient): Promise<Masters> {
  const [factions, committees, tags] = await Promise.all([
    unwrap(await supabase.from("factions").select("id, name"), "factions の読み出し"),
    unwrap(await supabase.from("committees").select("id, name"), "committees の読み出し"),
    unwrap(await supabase.from("tags").select("id, label"), "tags の読み出し"),
  ]);

  return {
    factions,
    committeeIdByName: new Map(committees.map((row) => [row.name, row.id])),
    tagIdByLabel: new Map(tags.map((row) => [row.label, row.id])),
    available: {
      committees: committees.map((row) => row.name),
      factions: factions.map((row) => row.name),
      tags: tags.map((row) => row.label),
    },
  };
}

/** 議案の突き合わせ用に、キー列 + 更新してよい列だけを持つ行を作る */
function desiredBillRow(bill: SeedBill, councilSessionId: string) {
  return {
    council_session_id: councilSessionId,
    bill_number: bill.billNumber,
    bill_type: bill.billType,
    ...buildBillUpdate(bill),
  };
}

type SessionPlan = {
  session: SeedSession;
  /** 既に DB にある定例会の id。無ければ null（この実行で作る） */
  existingId: string | null;
  billInserts: number;
  billUpdates: { key: string; changedColumns: string[] }[];
  billUnchanged: number;
  billExtras: string[];
};

async function planSession(
  supabase: AdminClient,
  session: SeedSession,
  sessionIdBySlug: ReadonlyMap<string, string>,
): Promise<SessionPlan> {
  const existingId = sessionIdBySlug.get(session.slug) ?? null;

  if (!existingId) {
    // この実行で作る定例会。議案は全て新規
    return {
      session,
      existingId: null,
      billInserts: session.bills.length,
      billUpdates: [],
      billUnchanged: 0,
      billExtras: [],
    };
  }

  const existing = unwrap(
    await supabase.from("bills").select("*").eq("council_session_id", existingId),
    `${session.slug} の bills 読み出し`,
  );

  const plan = planMasterUpsert({
    table: `bills (${session.slug})`,
    desired: session.bills.map((bill) => desiredBillRow(bill, existingId)),
    existing: existing.map(normalizeExistingBill) as ExistingRow[],
    keyOf: (row) => billKey(String(row.bill_number), String(row.bill_type)),
  });

  return {
    session,
    existingId,
    billInserts: plan.inserts.length,
    billUpdates: plan.updates.map(({ key, changedColumns }) => ({ key, changedColumns })),
    billUnchanged: plan.unchangedKeys.length,
    billExtras: plan.extraKeys,
  };
}

/** 定例会を作る／直して、slug から id を引ける Map を返す */
async function applySessions(
  supabase: AdminClient,
  existingSessions: ExistingRow[],
): Promise<Map<string, string>> {
  const plan = planMasterUpsert({
    table: "council_sessions",
    desired: sapporoSessions.map(buildSessionRow),
    existing: existingSessions,
    keyOf: (row) => row.slug,
  });

  if (plan.inserts.length > 0) {
    ensureNoError(
      await supabase.from("council_sessions").insert(plan.inserts),
      "council_sessions の insert",
    );
  }
  for (const update of plan.updates) {
    ensureNoError(
      await supabase.from("council_sessions").update(update.row).eq("id", update.id),
      `council_sessions の update (${update.key})`,
    );
  }

  const rows = unwrap(
    await supabase.from("council_sessions").select("id, slug"),
    "council_sessions の読み直し",
  );
  return new Map(
    rows.flatMap((row) => (row.slug ? [[row.slug, row.id] as const] : [])),
  );
}

type ChildCounts = {
  contentsInserted: number;
  contentsKept: number;
  committeesInserted: number;
  tagsInserted: number;
  stancesUpserted: number;
};

async function applyBillsAndChildren(
  supabase: AdminClient,
  session: SeedSession,
  councilSessionId: string,
  masters: Masters,
): Promise<ChildCounts> {
  const existing = unwrap(
    await supabase.from("bills").select("*").eq("council_session_id", councilSessionId),
    `${session.slug} の bills 読み出し`,
  );

  const billBySeedKey = new Map(
    session.bills.map((bill) => [billKey(bill.billNumber, bill.billType), bill]),
  );

  const plan = planMasterUpsert({
    table: `bills (${session.slug})`,
    desired: session.bills.map((bill) => desiredBillRow(bill, councilSessionId)),
    existing: existing.map(normalizeExistingBill) as ExistingRow[],
    keyOf: (row) => billKey(String(row.bill_number), String(row.bill_type)),
  });

  // 新規は publish_status / is_featured も入れる（更新時は触らない）
  const inserts: BillInsert[] = plan.inserts.map((row) => {
    const key = billKey(String(row.bill_number), String(row.bill_type));
    const bill = billBySeedKey.get(key);
    if (!bill) throw new Error(`投入データに見つかりません: ${key}`);
    return buildBillInsert(bill, councilSessionId);
  });

  if (inserts.length > 0) {
    ensureNoError(
      await supabase.from("bills").insert(inserts),
      `${session.slug} の bills insert`,
    );
  }
  for (const update of plan.updates) {
    ensureNoError(
      await supabase.from("bills").update(update.row).eq("id", update.id),
      `${session.slug} の bills update (${update.key})`,
    );
  }

  // 書き終えてから id を読み直す（新規分の id が要る）
  const saved = unwrap(
    await supabase
      .from("bills")
      .select("id, bill_number, bill_type")
      .eq("council_session_id", councilSessionId),
    `${session.slug} の bills 読み直し`,
  );
  const idByKey = new Map(
    saved.map((row) => [billKey(row.bill_number, row.bill_type), row.id]),
  );
  const billIdOf = (bill: SeedBill) => {
    const id = idByKey.get(billKey(bill.billNumber, bill.billType));
    if (!id) throw new Error(`議案の id が取れません: ${bill.billNumber}`);
    return id;
  };

  const child = buildChildRows({
    session,
    billIdOf,
    committeeIdByName: masters.committeeIdByName,
    tagIdByLabel: masters.tagIdByLabel,
    factions: masters.factions,
  });
  const billIds = [...idByKey.values()];

  // bill_contents は一度入れたら触らない（人が直した解説を戻さないため）
  const existingContents = unwrap(
    await supabase
      .from("bill_contents")
      .select("bill_id, difficulty_level")
      .in("bill_id", billIds),
    `${session.slug} の bill_contents 読み出し`,
  );
  const contentPlan = selectNewRows(
    child.contents,
    new Set(existingContents.map((row) => `${row.bill_id}|${row.difficulty_level}`)),
    (row) => `${row.bill_id}|${row.difficulty_level}`,
  );
  if (contentPlan.inserts.length > 0) {
    ensureNoError(
      await supabase.from("bill_contents").insert(contentPlan.inserts),
      `${session.slug} の bill_contents insert`,
    );
  }

  // 中身を持たない紐付けは、無いものだけ足す
  const existingCommittees = unwrap(
    await supabase.from("bill_committees").select("bill_id, committee_id").in("bill_id", billIds),
    `${session.slug} の bill_committees 読み出し`,
  );
  const committeePlan = selectNewRows(
    child.committees,
    new Set(existingCommittees.map((row) => `${row.bill_id}|${row.committee_id}`)),
    (row) => `${row.bill_id}|${row.committee_id}`,
  );
  if (committeePlan.inserts.length > 0) {
    ensureNoError(
      await supabase.from("bill_committees").insert(committeePlan.inserts),
      `${session.slug} の bill_committees insert`,
    );
  }

  const existingTags = unwrap(
    await supabase.from("bills_tags").select("bill_id, tag_id").in("bill_id", billIds),
    `${session.slug} の bills_tags 読み出し`,
  );
  const tagPlan = selectNewRows(
    child.tags,
    new Set(existingTags.map((row) => `${row.bill_id}|${row.tag_id}`)),
    (row) => `${row.bill_id}|${row.tag_id}`,
  );
  if (tagPlan.inserts.length > 0) {
    ensureNoError(
      await supabase.from("bills_tags").insert(tagPlan.inserts),
      `${session.slug} の bills_tags insert`,
    );
  }

  // 会派賛否は議会の一次情報なので、変わっていれば直す（第3回の議決結果が後から確定する）
  if (child.stances.length > 0) {
    ensureNoError(
      await supabase
        .from("faction_stances")
        .upsert(child.stances, { onConflict: "bill_id,faction_id" }),
      `${session.slug} の faction_stances upsert`,
    );
  }

  return {
    contentsInserted: contentPlan.inserts.length,
    contentsKept: contentPlan.skipped,
    committeesInserted: committeePlan.inserts.length,
    tagsInserted: tagPlan.inserts.length,
    stancesUpserted: child.stances.length,
  };
}

function printPlan(plans: readonly SessionPlan[]): void {
  console.log("投入予定:");
  for (const plan of plans) {
    const where = plan.existingId ? "既存" : "新規";
    console.log(
      `  ${plan.session.slug}（${where}の定例会）: 議案 全 ${plan.session.bills.length} 件 / insert ${plan.billInserts} / update ${plan.billUpdates.length} / 変更なし ${plan.billUnchanged}`,
    );
    for (const update of plan.billUpdates) {
      console.log(`    ~ ${update.key} (${update.changedColumns.join(", ")})`);
    }
    if (plan.billExtras.length > 0) {
      console.log(
        `    ! DB にあって投入データに無い議案 ${plan.billExtras.length} 件（消さずに残します）: ${plan.billExtras.join(", ")}`,
      );
    }
  }
  console.log("");
  console.log(
    "解説（bill_contents）・付託委員会・タグは、まだ無いものだけを足します（既にあるものは触りません）。",
  );
  console.log("会派賛否は議会の一次情報なので、変わっていれば直します。");
}

async function main() {
  const target = resolveSeedTarget({
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    argv: process.argv.slice(2),
  });

  if (target.mode === "help") {
    console.log(SEED_BILLS_USAGE);
    return;
  }
  const connected: ConnectedTarget = target;

  console.log("定例会と議案（札幌市の実データ）を投入します。既存データは削除しません。");
  console.log(describeSeedTarget(connected));

  const supabase = createAdminClient({
    supabaseUrl: connected.supabaseUrl,
    serviceRoleKey: connected.serviceRoleKey,
  });

  // マスタが揃っていなければ、1行も書かずに落とす
  const masters = await readMasters(supabase);
  const missing = findMissingMasters(
    collectMasterReferences(sapporoSessions),
    masters.available,
  );
  if (hasMissingMasters(missing)) {
    const lines = [
      "マスタが足りません。先に `pnpm seed:master --yes` を流してください。",
      ...(missing.committees.length > 0 ? [`  委員会: ${missing.committees.join(", ")}`] : []),
      ...(missing.factions.length > 0 ? [`  会派: ${missing.factions.join(", ")}`] : []),
      ...(missing.tags.length > 0 ? [`  タグ: ${missing.tags.join(", ")}`] : []),
    ];
    throw new Error(lines.join("\n"));
  }

  const existingSessions = unwrap(
    await supabase.from("council_sessions").select("*"),
    "council_sessions の読み出し",
  ) as ExistingRow[];
  const sessionIdBySlug = new Map(
    existingSessions.flatMap((row) =>
      typeof row.slug === "string" ? [[row.slug, row.id] as const] : [],
    ),
  );

  const plans: SessionPlan[] = [];
  for (const session of sapporoSessions) {
    plans.push(await planSession(supabase, session, sessionIdBySlug));
  }
  printPlan(plans);

  if (connected.mode === "dry-run") {
    console.log("");
    console.log(
      "DB には書き込んでいません。上の接続先が正しいことを確かめて、--yes を付けて再実行してください。",
    );
    return;
  }

  console.log("");
  console.log("投入します...");

  const idBySlug = await applySessions(supabase, existingSessions);
  console.log(`  council_sessions: ${idBySlug.size} 件を確認しました`);

  for (const session of sapporoSessions) {
    const councilSessionId = idBySlug.get(session.slug);
    if (!councilSessionId) throw new Error(`定例会の id が取れません: ${session.slug}`);

    const counts = await applyBillsAndChildren(supabase, session, councilSessionId, masters);
    console.log(
      `  ${session.slug}: 議案 ${session.bills.length} 件 / 解説 +${counts.contentsInserted}（据え置き ${counts.contentsKept}）/ 委員会 +${counts.committeesInserted} / タグ +${counts.tagsInserted} / 会派賛否 ${counts.stancesUpserted}`,
    );
  }

  console.log("");
  console.log("完了しました。");
}

main().catch((error: unknown) => {
  console.error(
    `議案投入に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
