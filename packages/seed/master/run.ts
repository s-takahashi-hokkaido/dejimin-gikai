/**
 * マスタ（会派・委員会・タグ）だけを投入するスクリプト
 *
 * ## 何のためか
 * VPS の DB は空から作る（さくらVPS 立ち上げ手順 手順8）。
 * そこに入れるのは「マイグレーション + マスタ + 管理者1人」だけで、議案や定例会は入れない。
 * `pnpm seed`（main/run.ts）は `clearAllData` で全件消してから架空の議案まで入れるので本番には使えない。
 *
 * ## このスクリプトの約束
 * - **削除しない**。`delete` / `truncate` は一切実行しない。
 *   マスタに無い行（手で足した委員会など）も消さず、件数とキーを報告するだけにする
 * - **冪等**。既存行はキー（tags は label、factions / committees は name）で突き合わせ、
 *   差分があるカラムだけ update する。2回流しても重複しない
 * - **投入するのは会派・委員会・タグだけ**。議案（bills）・定例会（council_sessions）・
 *   bill_contents などは触らない（定例会は T4b で管理画面から作る）
 * - **既定は dry-run**。接続先を表示し、`--yes` を付けたときだけ書き込む
 * - **先に3テーブル分の計画を立ててから書く**。検証で弾かれた時に途中まで書かれた状態にしない
 *
 * ## 使い方
 * ```bash
 * pnpm seed:master              # 接続先と投入予定を表示するだけ
 * pnpm seed:master --yes        # 実際に投入する
 * ```
 * 接続先は `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`（既存の seed と同じ作法）。
 * VPS へ流す時は SSH トンネル越しの Kong を指す（手順8 参照）。
 */

import type { Database } from "@dejimin-gikai/supabase";
import { committees, factions, tags } from "../main/data";
import { type AdminClient, createAdminClient } from "../shared/helper";
import {
  type ExistingRow,
  type MasterUpsertPlan,
  planMasterUpsert,
} from "./utils/plan-master-upsert";
import {
  describeSeedTarget,
  resolveSeedTarget,
  SEED_MASTER_USAGE,
  type SeedTarget,
} from "./utils/resolve-seed-target";

type TagInsert = Database["public"]["Tables"]["tags"]["Insert"];
type FactionInsert = Database["public"]["Tables"]["factions"]["Insert"];
type CommitteeInsert = Database["public"]["Tables"]["committees"]["Insert"];

type ConnectedTarget = Extract<SeedTarget, { mode: "dry-run" | "apply" }>;

/** 1テーブル分の計画。書き込みはクロージャに閉じ込めて、テーブルごとの型をここから漏らさない */
type PlannedSync = {
  table: string;
  desiredCount: number;
  insertKeys: string[];
  updates: { key: string; changedColumns: string[] }[];
  unchangedCount: number;
  /** DB にあって投入データに無いキー。消さずに残す */
  extraKeys: string[];
  apply: () => Promise<void>;
};

type TableSyncOptions<T extends Record<string, unknown>> = {
  table: string;
  desired: readonly T[];
  /** 行を突き合わせるキーのカラム名 */
  keyColumn: string;
  fetchExisting: () => Promise<ExistingRow[]>;
  insert: (rows: T[]) => Promise<void>;
  update: (id: string, row: T) => Promise<void>;
};

/** 既存行を読んで計画を立てる（この関数は DB に書き込まない） */
async function planTable<T extends Record<string, unknown>>(
  options: TableSyncOptions<T>,
): Promise<PlannedSync> {
  const existing = await options.fetchExisting();
  const plan: MasterUpsertPlan<T> = planMasterUpsert({
    table: options.table,
    desired: options.desired,
    existing,
    keyOf: (row) => row[options.keyColumn],
  });

  return {
    table: options.table,
    desiredCount: options.desired.length,
    insertKeys: plan.inserts.map((row) => String(row[options.keyColumn])),
    updates: plan.updates.map(({ key, changedColumns }) => ({
      key,
      changedColumns,
    })),
    unchangedCount: plan.unchangedKeys.length,
    extraKeys: plan.extraKeys,
    apply: async () => {
      if (plan.inserts.length > 0) await options.insert(plan.inserts);
      for (const update of plan.updates) {
        await options.update(update.id, update.row);
      }
    },
  };
}

function unwrap<T>(
  result: { data: T | null; error: { message: string } | null },
  what: string,
): T {
  if (result.error) {
    throw new Error(`${what}に失敗しました: ${result.error.message}`);
  }
  if (result.data === null) throw new Error(`${what}の結果が空です`);
  return result.data;
}

function ensureNoError(
  result: { error: { message: string } | null },
  what: string,
): void {
  if (result.error) {
    throw new Error(`${what}に失敗しました: ${result.error.message}`);
  }
}

// 既存行は `select("*")` で全カラム取る。カラム名を手で並べると data.ts に
// カラムを足した時に「毎回 update される」状態になって冪等性が静かに壊れるため。
// 比較は desired が持つカラムだけなので、余分なカラム（created_at 等）は無害。

function planFactions(supabase: AdminClient) {
  return planTable<FactionInsert>({
    table: "factions",
    desired: factions,
    keyColumn: "name",
    fetchExisting: async () =>
      unwrap(
        await supabase.from("factions").select("*"),
        "factions の読み出し",
      ),
    insert: async (rows) =>
      ensureNoError(
        await supabase.from("factions").insert(rows),
        "factions の insert",
      ),
    update: async (id, row) =>
      ensureNoError(
        await supabase.from("factions").update(row).eq("id", id),
        `factions の update (${row.name})`,
      ),
  });
}

function planCommittees(supabase: AdminClient) {
  return planTable<CommitteeInsert>({
    table: "committees",
    desired: committees,
    keyColumn: "name",
    fetchExisting: async () =>
      unwrap(
        await supabase.from("committees").select("*"),
        "committees の読み出し",
      ),
    insert: async (rows) =>
      ensureNoError(
        await supabase.from("committees").insert(rows),
        "committees の insert",
      ),
    update: async (id, row) =>
      ensureNoError(
        await supabase.from("committees").update(row).eq("id", id),
        `committees の update (${row.name})`,
      ),
  });
}

function planTags(supabase: AdminClient) {
  return planTable<TagInsert>({
    table: "tags",
    desired: tags,
    keyColumn: "label",
    fetchExisting: async () =>
      unwrap(await supabase.from("tags").select("*"), "tags の読み出し"),
    insert: async (rows) =>
      ensureNoError(await supabase.from("tags").insert(rows), "tags の insert"),
    update: async (id, row) =>
      ensureNoError(
        await supabase.from("tags").update(row).eq("id", id),
        `tags の update (${row.label})`,
      ),
  });
}

function printPlan(plans: readonly PlannedSync[]): void {
  console.log("投入予定:");
  for (const plan of plans) {
    console.log(
      `  ${plan.table}: 全 ${plan.desiredCount} 件 / insert ${plan.insertKeys.length} / update ${plan.updates.length} / 変更なし ${plan.unchangedCount}`,
    );
    for (const key of plan.insertKeys) console.log(`    + ${key}`);
    for (const update of plan.updates) {
      console.log(`    ~ ${update.key} (${update.changedColumns.join(", ")})`);
    }
    if (plan.extraKeys.length > 0) {
      console.log(
        `    ! DB にあって投入データに無い行 ${plan.extraKeys.length} 件（消さずに残します）: ${plan.extraKeys.join(", ")}`,
      );
    }
  }
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
    console.log(SEED_MASTER_USAGE);
    return;
  }
  const connected: ConnectedTarget = target;

  console.log(
    "マスタ（会派・委員会・タグ）を投入します。既存データは削除しません。",
  );
  console.log(describeSeedTarget(connected));

  // 表示した接続先をそのまま使う（process.env を二度読みして食い違わせない）
  const supabase = createAdminClient({
    supabaseUrl: connected.supabaseUrl,
    serviceRoleKey: connected.serviceRoleKey,
  });

  // 3テーブル分の計画を先に全部立てる（検証で弾かれた時に書き込み済みの行を残さない）。
  // 読むだけなので並列でよい
  const plans = await Promise.all([
    planFactions(supabase),
    planCommittees(supabase),
    planTags(supabase),
  ]);

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
  for (const plan of plans) {
    await plan.apply();
    console.log(
      `  ${plan.table}: 投入しました（insert ${plan.insertKeys.length} / update ${plan.updates.length}）`,
    );
  }

  console.log("");
  console.log("完了しました。");
}

main().catch((error: unknown) => {
  console.error(
    `マスタ投入に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
