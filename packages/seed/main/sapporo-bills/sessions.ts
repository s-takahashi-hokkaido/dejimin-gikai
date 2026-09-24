import { session_r8_1 } from "./r8-1";
import { session_r8_1r } from "./r8-1r";
import { session_r8_2 } from "./r8-2";
import { session_r8_3 } from "./r8-3";
import type { SeedSession } from "./types";

export const sapporoSessions: SeedSession[] = [
  session_r8_1,
  session_r8_1r,
  session_r8_2,
  session_r8_3,
];

// インタビューのデモデータを付ける議案（令和8年第3回定例会 議案第11号）
export const INTERVIEW_TARGET = {
  sessionSlug: "r8-3",
  billNumber: "議案第11号",
} as const;
