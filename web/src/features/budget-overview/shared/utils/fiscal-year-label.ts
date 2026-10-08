/**
 * 会期名（例: 「令和8年第1回定例会」）から予算の年度ラベル「令和8年度」を取り出す。
 * 札幌市の当初予算は第1回定例会で審議されるため、会期の年をそのまま年度とする。
 * 会期名に「令和N年」が無いときは null。
 */
export function getFiscalYearLabel(sessionName: string): string | null {
  const match = sessionName.match(/令和(\d+)年/);
  return match ? `令和${match[1]}年度` : null;
}
