"use server";

import { spawn } from "node:child_process";
import { assertClaudeCliEnabled } from "@/features/ai-collection/server/utils/execute-claude";
import { createAuditedAdminClient } from "@/features/audit-logs/server/lib/create-audited-admin-client";
import { requireAdmin } from "@/features/auth/server/lib/auth-server";
import {
  type BillForEval,
  buildEvalPrompt,
  EVAL_BATCH_SIZE,
  type EvalResult,
  extractEvalResults,
  FEATURE_THRESHOLD,
} from "../services/auto-feature-evaluator";

const CLAUDE_PATH = process.env.CLAUDE_CLI_PATH ?? "claude";

export type AutoFeatureResult = {
  success: boolean;
  featuredCount: number;
  totalEvaluated: number;
  results: EvalResult[];
  warnings: string[];
  error?: string;
};

// ---- Claude CLI を呼び出してテキストを返す ----

function callClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.CLAUDECODE;
    delete env.CLAUDE_CODE;

    const proc = spawn(
      CLAUDE_PATH,
      [
        "-p",
        prompt,
        "--output-format",
        "json",
        "--dangerously-skip-permissions",
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
        env,
      }
    );

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("error", (err) =>
      reject(new Error(`Claude の起動に失敗しました: ${err.message}`))
    );

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Claude がコード ${code} で終了しました。stderr: ${stderr.slice(0, 300)}`
          )
        );
        return;
      }
      try {
        const parsed = JSON.parse(stdout) as {
          result?: string;
          is_error?: boolean;
        };
        if (parsed.is_error) {
          reject(
            new Error(`Claude エラー: ${String(parsed.result).slice(0, 300)}`)
          );
          return;
        }
        resolve(parsed.result ?? "");
      } catch {
        // JSON でなければそのままテキストとして返す
        resolve(stdout.trim());
      }
    });
  });
}

// ---- メイン Server Action ----

export async function runAutoFeature(
  councilSessionId: string
): Promise<AutoFeatureResult> {
  try {
    const admin = await requireAdmin();
    assertClaudeCliEnabled();

    const supabase = createAuditedAdminClient(admin);

    // 対象会期の published 議案を取得
    const { data: bills } = await supabase
      .from("bills")
      .select("id, bill_number, name, bill_contents(title, summary, content)")
      .eq("council_session_id", councilSessionId)
      .eq("publish_status", "published")
      .order("bill_number");

    if (!bills || bills.length === 0) {
      return {
        success: false,
        featuredCount: 0,
        totalEvaluated: 0,
        results: [],
        warnings: [],
        error: "公開済み議案が見つかりません",
      };
    }

    // bill_contents がある議案のみ評価対象
    const billsForEval: BillForEval[] = bills
      .filter((b) => b.bill_contents && b.bill_contents.length > 0)
      .map((b) => {
        const content = Array.isArray(b.bill_contents)
          ? b.bill_contents[0]
          : b.bill_contents;
        return {
          id: b.id,
          bill_number: b.bill_number ?? "",
          name: b.name,
          title: (content as { title?: string })?.title ?? "",
          summary: (content as { summary?: string })?.summary ?? "",
          content: (content as { content?: string })?.content ?? "",
        };
      })
      .filter((b) => b.title || b.summary);

    const allResults: EvalResult[] = [];
    const warnings: string[] = [];

    // バッチ処理
    for (let i = 0; i < billsForEval.length; i += EVAL_BATCH_SIZE) {
      const batch = billsForEval.slice(i, i + EVAL_BATCH_SIZE);
      const prompt = buildEvalPrompt(batch);

      try {
        const response = await callClaude(prompt);
        const results = extractEvalResults(response);
        allResults.push(...results);
      } catch (err) {
        const billNums = batch.map((b) => b.bill_number).join(", ");
        warnings.push(
          `バッチ評価失敗 (${billNums}): ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    // 注目フラグを決定
    const featuredNumbers = new Set<string>(
      allResults
        .filter((r) => !r.excluded && r.score >= FEATURE_THRESHOLD)
        .map((r) => r.bill_number)
    );

    // DB 更新: 全議案を一旦 false に
    const billIds = bills.map((b) => b.id);
    await supabase
      .from("bills")
      .update({ is_featured: false })
      .in("id", billIds);

    // 注目議案を true に
    const featuredIds = bills
      .filter((b) => featuredNumbers.has(b.bill_number ?? ""))
      .map((b) => b.id);

    if (featuredIds.length > 0) {
      await supabase
        .from("bills")
        .update({ is_featured: true })
        .in("id", featuredIds);
    }

    return {
      success: true,
      featuredCount: featuredIds.length,
      totalEvaluated: allResults.length,
      results: [...allResults].sort((a, b) => b.score - a.score),
      warnings,
    };
  } catch (error) {
    console.error("runAutoFeature error:", error);
    return {
      success: false,
      featuredCount: 0,
      totalEvaluated: 0,
      results: [],
      warnings: [],
      error:
        error instanceof Error
          ? error.message
          : "自動設定中にエラーが発生しました",
    };
  }
}
