/**
 * マスタ（会派・委員会・タグ）の投入計画を組む。
 *
 * `factions` / `committees` には name の unique 制約が無いため、
 * Postgres の `on conflict` に頼らず「既存行を読んでから insert / update を振り分ける」形にしている。
 * 既存行の削除は行わない（DB に居て desired に無い行は `extraKeys` として報告するだけで残す）。
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
  /** DB にあって投入データに無いキー。消さずに残すが、気付けるよう報告する */
  extraKeys: string[];
};

export type PlanMasterUpsertInput<T> = {
  /** エラーメッセージに出すテーブル名 */
  table: string;
  /** 投入したいマスタ行 */
  desired: readonly T[];
  /** DB にある既存行 */
  existing: readonly ExistingRow[];
  /** 行を一意に識別するキーを取り出す（tags なら label、factions / committees なら name） */
  keyOf: (row: Record<string, unknown>) => unknown;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * 値が実質的に同じか判定する。
 * - `null` と `undefined` は同じ扱い（desired で省略したカラムと DB の null を差分にしない）
 * - 配列は要素ごとに比較する（`alternative_names` のような text[] カラム向け）
 * - プレーンなオブジェクトは構造で比較する（jsonb カラムが増えても毎回 update にならないように）
 */
export function isSameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => isSameValue(v, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every(
      (key) => key in b && isSameValue(a[key], (b as Record<string, unknown>)[key]),
    );
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

/**
 * キーを取り出して正規化する。
 * 前後の空白は落とす（「総務委員会 」と「総務委員会」を別行として二重登録しないため。
 * 既存行側の空白付きの名前は update で正しい名前に直る）。
 */
function requireKey(
  row: Record<string, unknown>,
  keyOf: (row: Record<string, unknown>) => unknown,
  where: string,
): string {
  const key = keyOf(row);
  if (typeof key !== "string" || key.trim() === "") {
    throw new Error(`${where}のキーが空です: ${JSON.stringify(row)}`);
  }
  return key.trim();
}

/** キーで引ける Map を作る。重複キーがあれば投入せず落とす */
function indexByKey<T extends Record<string, unknown>>(
  rows: readonly T[],
  keyOf: (row: Record<string, unknown>) => unknown,
  where: string,
): Map<string, T> {
  const byKey = new Map<string, T>();
  for (const row of rows) {
    const key = requireKey(row, keyOf, where);
    if (byKey.has(key)) {
      throw new Error(`${where}のキーが重複しています: ${key}`);
    }
    byKey.set(key, row);
  }
  return byKey;
}

export function planMasterUpsert<T extends Record<string, unknown>>({
  table,
  desired,
  existing,
  keyOf,
}: PlanMasterUpsertInput<T>): MasterUpsertPlan<T> {
  const desiredByKey = indexByKey(desired, keyOf, `${table} の投入データ`);
  // unique 制約が無いテーブルなので、既存行に重複があれば人が直すまで書き込まない
  const existingByKey = indexByKey(
    existing,
    keyOf,
    `${table} の既存データ（DB を確認してください）`,
  );

  const plan: MasterUpsertPlan<T> = {
    inserts: [],
    updates: [],
    unchangedKeys: [],
    extraKeys: [],
  };

  for (const [key, row] of desiredByKey) {
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

  for (const key of existingByKey.keys()) {
    if (!desiredByKey.has(key)) plan.extraKeys.push(key);
  }

  return plan;
}
