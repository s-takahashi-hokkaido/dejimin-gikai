/**
 * 議案投入（`pnpm seed:bills`）の行を組み立てる純粋関数群。
 *
 * DB にも環境変数にも触らないので、同階層の `plan-bill-seed.test.ts` でテストする。
 * 書き込みの方針そのもの（どの列を更新し、どの列を守るか）をここに集めている。
 */

import type { Database } from "@dejimin-gikai/supabase";
import type { SeedBill, SeedSession } from "../../main/sapporo-bills/types";

type CouncilSessionInsert =
  Database["public"]["Tables"]["council_sessions"]["Insert"];
type BillInsert = Database["public"]["Tables"]["bills"]["Insert"];
type BillContentInsert =
  Database["public"]["Tables"]["bill_contents"]["Insert"];
type BillCommitteeInsert =
  Database["public"]["Tables"]["bill_committees"]["Insert"];
type FactionStanceInsert =
  Database["public"]["Tables"]["faction_stances"]["Insert"];
type BillsTagInsert = Database["public"]["Tables"]["bills_tags"]["Insert"];

/**
 * 本会議で採決があったことを示す status。これ以外の議案には会派賛否を登録しない。
 * `main/run.ts` もここから読む（二重管理を避けるため）。
 */
export const VOTED_STATUSES: readonly string[] = [
  "approved",
  "rejected",
  "adopted",
  "partially_adopted",
];

/**
 * 議案を一意に識別するキー。
 * `bills` には (council_session_id, bill_number, bill_type) の unique 制約が無いので、
 * 定例会ごとに読み出した既存行をこのキーで突き合わせる。
 */
export function billKey(billNumber: string, billType: string): string {
  return `${billNumber}|${billType}`;
}

/**
 * timestamptz を比較できる形に揃える。
 *
 * seed は `2026-03-01T00:00:00+09:00`、PostgREST は同じ時刻を `2026-02-28T15:00:00+00:00`
 * として返すため、文字列のまま比べると毎回「差分あり」になって 129 件の無駄な update が走る。
 * 同じ瞬間なら同じ文字列になるよう、両側を UTC の ISO 文字列にしてから比べる。
 * 解釈できない値はそのまま返す（差分として人に気付かせる）。
 */
export function normalizeTimestamp(value: unknown): unknown {
  if (typeof value !== "string" || value === "") return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString();
}

/** DB から読んだ議案の行を、比較できる形に揃える */
export function normalizeExistingBill<T extends Record<string, unknown>>(row: T): T {
  if (!("published_at" in row)) return row;
  return { ...row, published_at: normalizeTimestamp(row.published_at) };
}

export function buildSessionRow(session: SeedSession): CouncilSessionInsert {
  return {
    slug: session.slug,
    name: session.name,
    start_date: session.startDate,
    end_date: session.endDate,
    council_url: session.councilUrl,
    is_active: session.isActive,
  };
}

/**
 * 新規議案の行。初回だけ `publish_status` と `is_featured` を seed の値で入れる。
 */
export function buildBillInsert(
  bill: SeedBill,
  councilSessionId: string,
): BillInsert {
  return {
    ...buildBillUpdate(bill),
    council_session_id: councilSessionId,
    bill_number: bill.billNumber,
    bill_type: bill.billType,
    publish_status: "published",
    is_featured: bill.isFeatured,
  };
}

/**
 * 既存議案を更新するときに上書きしてよい列だけを返す。
 *
 * 意図的に含めていないもの:
 * - `publish_status` / `is_featured` … 管理画面で運用者が切り替える。seed で戻さない
 * - `thumbnail_url` / `share_thumbnail_url` … 管理画面でアップロードしたものを消さない
 * - `discussion_overview_points` … 管理画面で編集する
 *
 * 含めているのは議会の一次情報（議案名・原案PDF・議決結果）だけで、
 * 第3回定例会の議決結果が後から確定した時に流し直せるようにしてある。
 */
export function buildBillUpdate(
  bill: SeedBill,
): Omit<BillInsert, "council_session_id" | "bill_number" | "bill_type"> {
  return {
    name: bill.name,
    source_url: bill.sourceUrl,
    status: bill.status,
    status_note: bill.statusNote,
    // 比較のために UTC の ISO 文字列で持つ（timestamptz なので表記が違っても同じ瞬間）
    published_at: normalizeTimestamp(bill.publishedAt) as string,
  };
}

export type MasterReferences = {
  committees: string[];
  factions: string[];
  tags: string[];
};

/** 議案データが参照しているマスタの名前を、重複を除いて並べる */
export function collectMasterReferences(
  sessions: readonly SeedSession[],
): MasterReferences {
  const committees = new Set<string>();
  const factions = new Set<string>();
  const tags = new Set<string>();

  for (const session of sessions) {
    for (const bill of session.bills) {
      for (const name of bill.committees) committees.add(name);
      for (const name of bill.againstFactions) factions.add(name);
      for (const label of bill.tags) tags.add(label);
    }
  }

  return {
    committees: [...committees].sort(),
    factions: [...factions].sort(),
    tags: [...tags].sort(),
  };
}

/** 参照しているのに DB に無いマスタを返す。空なら投入して問題ない */
export function findMissingMasters(
  references: MasterReferences,
  available: MasterReferences,
): MasterReferences {
  const missing = (want: string[], have: string[]) => {
    const haveSet = new Set(have);
    return want.filter((name) => !haveSet.has(name));
  };

  return {
    committees: missing(references.committees, available.committees),
    factions: missing(references.factions, available.factions),
    tags: missing(references.tags, available.tags),
  };
}

export function hasMissingMasters(missing: MasterReferences): boolean {
  return (
    missing.committees.length > 0 ||
    missing.factions.length > 0 ||
    missing.tags.length > 0
  );
}

export type ChildRowsInput = {
  session: SeedSession;
  /** 議案キー（`billKey`）から bills.id を引く。未登録なら例外を投げる */
  billIdOf: (bill: SeedBill) => string;
  committeeIdByName: ReadonlyMap<string, string>;
  tagIdByLabel: ReadonlyMap<string, string>;
  /** 会派の全件。採決のあった議案には、反対会派以外を賛成として登録する */
  factions: readonly { id: string; name: string }[];
};

export type ChildRows = {
  contents: BillContentInsert[];
  committees: BillCommitteeInsert[];
  stances: FactionStanceInsert[];
  tags: BillsTagInsert[];
};

function requireId(
  map: ReadonlyMap<string, string>,
  key: string,
  kind: string,
): string {
  const id = map.get(key);
  if (!id) throw new Error(`${kind}がマスタにありません: ${key}`);
  return id;
}

/** 議案にぶら下がる4テーブルの行を組み立てる */
export function buildChildRows({
  session,
  billIdOf,
  committeeIdByName,
  tagIdByLabel,
  factions,
}: ChildRowsInput): ChildRows {
  const contents = session.bills.flatMap((bill) => {
    const billId = billIdOf(bill);
    return (["normal", "hard"] as const).map((level) => ({
      bill_id: billId,
      difficulty_level: level,
      ...bill.contents[level],
    }));
  });

  const committees = session.bills.flatMap((bill) =>
    bill.committees.map((name) => ({
      bill_id: billIdOf(bill),
      committee_id: requireId(committeeIdByName, name, "委員会"),
    })),
  );

  const stances = session.bills
    .filter((bill) => VOTED_STATUSES.includes(bill.status))
    .flatMap((bill) => {
      const known = new Set(factions.map((faction) => faction.name));
      for (const name of bill.againstFactions) {
        if (!known.has(name)) throw new Error(`会派がマスタにありません: ${name}`);
      }
      const billId = billIdOf(bill);
      return factions.map((faction) => ({
        bill_id: billId,
        faction_id: faction.id,
        type: bill.againstFactions.includes(faction.name)
          ? ("against" as const)
          : ("for" as const),
      }));
    });

  const tags = session.bills.flatMap((bill) =>
    bill.tags.map((label) => ({
      bill_id: billIdOf(bill),
      tag_id: requireId(tagIdByLabel, label, "タグ"),
    })),
  );

  return { contents, committees, stances, tags };
}

/**
 * 既に DB にある行を除いて、新しく入れる行だけを返す。
 * `bill_contents`（市民向け解説）のように、一度入れたら seed で上書きしたくないものに使う。
 */
export function selectNewRows<T>(
  desired: readonly T[],
  existingKeys: ReadonlySet<string>,
  keyOf: (row: T) => string,
): { inserts: T[]; skipped: number } {
  const inserts = desired.filter((row) => !existingKeys.has(keyOf(row)));
  return { inserts, skipped: desired.length - inserts.length };
}
