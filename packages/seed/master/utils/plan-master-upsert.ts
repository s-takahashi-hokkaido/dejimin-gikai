/**
 * マスタ（会派・委員会・タグ）の投入計画を組む。
 *
 * `factions` / `committees` には name の unique 制約が無いため、
 * Postgres の `on conflict` に頼らず「既存行を読んでから insert / update を振り分ける」形にしている。
 * 既存行の削除は行わない（DB に居て desired に無い行はそのまま残す）。
 *
 * 外部依存を持たない純粋関数なので、同階層の `plan-master-upsert.test.ts` でテストする。
 */

/** DB から読み出した既存行。id と、比較対象のカラムを持つ */
export type ExistingRow = { id: string } & Record<string, unknown>;

export type PlannedUpdate<T> = {
  id: string;
  key: string;
  row: T;
  /** 既存行と値が違ったカラム名（ログ用） */
  changedColumns: string[];
};

export type MasterUpsertPlan<T> = {
  inserts: T[];
  updates: PlannedUpdate<T>[];
  /** 既存行と完全に一致していたキー */
  unchangedKeys: string[];
};

export type PlanMasterUpsertInput<T> = {
  /** 投入したいマスタ行 */
  desired: readonly T[];
  /** DB にある既存行 */
  existing: readonly ExistingRow[];
  /** 行を一意に識別するキーを取り出す（tags なら label、factions / committees なら name） */
  keyOf: (row: Record<string, unknown>) => unknown;
};

/**
 * 値が実質的に同じか判定する。
 * - `null` と `undefined` は同じ扱い（desired で省略したカラムと DB の null を差分にしない）
 * - 配列は要素ごとに比較する（`alternative_names` のような text[] カラム向け）
 */
export function isSameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => isSameValue(v, b[i]));
  }
  return false;
}

/**
 * desired の行が持つカラムだけを既存行と比べ、違ったカラム名を返す。
 * desired に無いカラム（DB の created_at など）は比較しない。
 */
export function diffColumns(
  desired: Record<string, unknown>,
  existing: Record<string, unknown>,
): string[] {
  const changed: string[] = [];
  for (const [column, value] of Object.entries(desired)) {
    if (!isSameValue(value, existing[column])) changed.push(column);
  }
  return changed;
}

function requireKey(
  row: Record<string, unknown>,
  keyOf: (row: Record<string, unknown>) => unknown,
  where: string,
): string {
  const key = keyOf(row);
  if (typeof key !== "string" || key.trim() === "") {
    throw new Error(`${where}のキーが空です: ${JSON.stringify(row)}`);
  }
  return key;
}

export function planMasterUpsert<T extends Record<string, unknown>>({
  desired,
  existing,
  keyOf,
}: PlanMasterUpsertInput<T>): MasterUpsertPlan<T> {
  const seen = new Set<string>();
  for (const row of desired) {
    const key = requireKey(row, keyOf, "投入データ");
    if (seen.has(key)) {
      throw new Error(`投入データのキーが重複しています: ${key}`);
    }
    seen.add(key);
  }

  const existingByKey = new Map<string, ExistingRow>();
  for (const row of existing) {
    const key = requireKey(row, keyOf, "既存データ");
    if (existingByKey.has(key)) {
      // unique 制約が無いテーブルなので、重複があれば人が直すまで書き込まない
      throw new Error(
        `既存データのキーが重複しています: ${key}（DB を確認してください）`,
      );
    }
    existingByKey.set(key, row);
  }

  const plan: MasterUpsertPlan<T> = {
    inserts: [],
    updates: [],
    unchangedKeys: [],
  };

  for (const row of desired) {
    const key = requireKey(row, keyOf, "投入データ");
    const current = existingByKey.get(key);
    if (!current) {
      plan.inserts.push(row);
      continue;
    }
    const changedColumns = diffColumns(row, current);
    if (changedColumns.length === 0) {
      plan.unchangedKeys.push(key);
      continue;
    }
    plan.updates.push({ id: current.id, key, row, changedColumns });
  }

  return plan;
}
