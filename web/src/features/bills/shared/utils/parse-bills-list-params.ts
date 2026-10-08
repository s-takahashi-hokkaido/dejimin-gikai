import { type BillStatusGroup, isBillStatusGroup } from "./bill-status-group";
import {
  type BillSortKey,
  DEFAULT_BILL_SORT,
  isBillSortKey,
} from "./sort-bills";

/** 議案一覧のパス。 */
export const BILLS_LIST_PATH = "/bills";

/** 一覧の絞り込み状態。すべて URL に載せる。 */
export type BillsListParams = {
  query: string;
  status: BillStatusGroup;
  /** タグ id。null は「すべて」。 */
  tagId: string | null;
  sort: BillSortKey;
  /** AIインタビュー受付中のみに絞るか。 */
  interviewOnly: boolean;
  /** 1始まりのページ番号。 */
  page: number;
};

/** ページ・コンポーネント間で共有する searchParams の形。 */
export type BillsListSearchParams = {
  q?: string | string[];
  status?: string | string[];
  tag?: string | string[];
  sort?: string | string[];
  interview?: string | string[];
  page?: string | string[];
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** 絞り込みなしの一覧。ここから1つだけ差し替えてリンクを作る。 */
export const DEFAULT_BILLS_LIST_PARAMS: Readonly<BillsListParams> = {
  query: "",
  status: "all",
  tagId: null,
  sort: DEFAULT_BILL_SORT,
  interviewOnly: false,
  page: 1,
};

/**
 * URL パラメータを一覧の状態に正規化する純粋関数。
 * 不正値は既定に倒す。URL 直打ちでページを壊せないようにする。
 *
 * `interviewEnabled` が false のとき（AIインタビューを使わない設定）は、
 * 受付中の絞り込みと回答数の並びを無視する。画面に出していない条件が URL から
 * だけ効くと、何で絞られているのか分からなくなる。
 */
export function parseBillsListParams(
  searchParams: BillsListSearchParams,
  { interviewEnabled = true }: { interviewEnabled?: boolean } = {}
): BillsListParams {
  const status = firstValue(searchParams.status);
  const sort = firstValue(searchParams.sort);
  const tag = firstValue(searchParams.tag)?.trim();
  const sortAllowed =
    isBillSortKey(sort) && (interviewEnabled || sort !== "voices");

  return {
    query: firstValue(searchParams.q)?.trim() ?? "",
    status: isBillStatusGroup(status) ? status : "all",
    tagId: tag || null,
    sort: sortAllowed ? sort : DEFAULT_BILL_SORT,
    interviewOnly:
      interviewEnabled && firstValue(searchParams.interview) === "1",
    page: parsePage(firstValue(searchParams.page)),
  };
}

/**
 * ページ番号は正の整数だけを受け付ける。「0」「-1」「1.5」「abc」は1ページ目に
 * 倒す。件数を超える番号はここでは丸めない（総数は絞り込みのあとで決まる）。
 */
function parsePage(value: string | undefined): number {
  if (!value || !/^\d+$/.test(value)) return 1;

  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

/**
 * 現在の状態から差し替えたクエリ文字列を作る純粋関数。
 * 既定値はURLに出さない。共有されたURLが読みやすくなる。
 *
 * ページ番号は patch で指定しない限り1ページ目に戻す。絞り込みや並びを
 * 変えたのに前のページ番号を引き継ぐと、件数が減ったときに範囲外を指す。
 */
export function buildBillsListQuery(
  current: BillsListParams,
  patch: Partial<BillsListParams> = {}
): string {
  const next = { ...current, page: 1, ...patch };
  const params = new URLSearchParams();

  if (next.query) params.set("q", next.query);
  if (next.status !== "all") params.set("status", next.status);
  if (next.tagId) params.set("tag", next.tagId);
  if (next.sort !== DEFAULT_BILL_SORT) params.set("sort", next.sort);
  if (next.interviewOnly) params.set("interview", "1");
  if (next.page > 1) params.set("page", String(next.page));

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

/** 一覧ページへのリンク。 */
export function billsListHref(
  current: BillsListParams,
  patch: Partial<BillsListParams> = {}
): string {
  return `${BILLS_LIST_PATH}${buildBillsListQuery(current, patch)}`;
}
