import { getJstDateParts } from "@/lib/utils/date";
import type { CouncilSession } from "../types";

export type SessionsByYear = {
  year: number;
  sessions: CouncilSession[];
};

/**
 * 定例会を start_date の年でグループ化する（新しい年順）
 */
export function groupSessionsByYear(
  sessions: CouncilSession[]
): SessionsByYear[] {
  const map = new Map<number, CouncilSession[]>();

  for (const session of sessions) {
    const year = getSessionStartYear(session);
    const existing = map.get(year);
    if (existing) {
      existing.push(session);
    } else {
      map.set(year, [session]);
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, sessionList]) => ({ year, sessions: sessionList }));
}

/**
 * 定例会の期間を "YYYY.M〜M" 形式でフォーマットする
 */
export function formatSessionPeriod(session: CouncilSession): string {
  const { year: startYear, month: startMonth } = getSessionStart(session);

  if (!session.end_date) {
    return `${startYear}.${startMonth}`;
  }

  const endMonth = getJstDateParts(session.end_date)?.month ?? startMonth;

  if (startMonth === endMonth) {
    return `${startYear}.${startMonth}`;
  }

  return `${startYear}.${startMonth}〜${endMonth}`;
}

/**
 * 定例会の開始年（日本時間）
 */
export function getSessionStartYear(session: CouncilSession): number {
  return getSessionStart(session).year;
}

/**
 * 定例会の説明文 "YYYY.M月〜M月に実施された{会期名}" を作る
 * end_date がない場合は開始月を終了月として扱う
 */
export function formatSessionDescription(session: CouncilSession): string {
  const { year, month: startMonth } = getSessionStart(session);
  const endMonth = session.end_date
    ? (getJstDateParts(session.end_date)?.month ?? startMonth)
    : startMonth;
  return `${year}.${startMonth}月〜${endMonth}月に実施された${session.name}`;
}

function getSessionStart(session: CouncilSession): {
  year: number;
  month: number;
} {
  const parts = getJstDateParts(session.start_date);
  // start_date は NOT NULL の date 型なので通常は不正値にならない
  return parts ?? { year: Number.NaN, month: Number.NaN };
}
