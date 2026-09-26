/**
 * マスタ投入スクリプトの接続先とモードを、環境変数とコマンドライン引数から決める。
 *
 * 外部依存を持たない純粋関数なので、同階層の `resolve-seed-target.test.ts` でテストする。
 */

/** 実行モード。`dry-run` は DB に一切書き込まない */
export type SeedMode = "dry-run" | "apply";

export type SeedTarget = {
  supabaseUrl: string;
  serviceRoleKey: string;
  /** 表示用のホスト名（ポート込み） */
  host: string;
  mode: SeedMode;
};

export type ResolveSeedTargetInput = {
  env: {
    SUPABASE_URL?: string | undefined;
    SUPABASE_SERVICE_ROLE_KEY?: string | undefined;
  };
  /** `process.argv.slice(2)` 相当 */
  argv: readonly string[];
};

export const SEED_MASTER_USAGE = [
  "使い方: pnpm seed:master [--yes | --dry-run]",
  "",
  "  --dry-run  既定。接続先と投入予定の件数だけを表示し、DB には書き込まない",
  "  --yes      実際に投入する（接続先を確認してから付けること）",
].join("\n");

/**
 * 秘密情報をログに出せる形に伏せる。
 * 接続先の取り違えに気付けるよう、先頭と末尾だけ残す。
 */
export function maskSecret(secret: string): string {
  if (secret.length < 12) return "*".repeat(8);
  return `${secret.slice(0, 4)}...${secret.slice(-4)} (${secret.length} 文字)`;
}

export function resolveSeedTarget(input: ResolveSeedTargetInput): SeedTarget {
  let yes = false;
  let dryRun = false;

  for (const arg of input.argv) {
    if (arg === "--yes") {
      yes = true;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else {
      throw new Error(`不明なオプションです: ${arg}\n\n${SEED_MASTER_USAGE}`);
    }
  }

  if (yes && dryRun) {
    throw new Error(
      `--yes と --dry-run は同時に指定できません\n\n${SEED_MASTER_USAGE}`,
    );
  }

  const supabaseUrl = input.env.SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    throw new Error(
      "SUPABASE_URL が設定されていません（.env を読み込んでいるか確認してください）",
    );
  }

  const serviceRoleKey = input.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY が設定されていません（.env を読み込んでいるか確認してください）",
    );
  }

  let host: string;
  try {
    host = new URL(supabaseUrl).host;
  } catch {
    throw new Error(`SUPABASE_URL が URL として解釈できません: ${supabaseUrl}`);
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    host,
    mode: yes ? "apply" : "dry-run",
  };
}

/**
 * 接続先を人が読める形にする。
 * SSH トンネル越しだと `127.0.0.1` が本番を指すこともあるため、
 * ホスト名だけでローカル判定はせず、必ず目で見て確認してもらう。
 */
export function describeSeedTarget(target: SeedTarget): string {
  const lines = [
    "─────────────────────────────────────────────",
    `  接続先 SUPABASE_URL : ${target.supabaseUrl}`,
    `  ホスト              : ${target.host}`,
    `  SERVICE_ROLE_KEY    : ${maskSecret(target.serviceRoleKey)}`,
    `  モード              : ${
      target.mode === "apply"
        ? "apply（DB に書き込みます）"
        : "dry-run（DB には書き込みません）"
    }`,
    "─────────────────────────────────────────────",
  ];
  return lines.join("\n");
}
