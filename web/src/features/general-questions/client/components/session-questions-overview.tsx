"use client";

import {
  ArrowRight,
  Baby,
  Building2,
  ChevronDown,
  Circle,
  Globe,
  Heart,
  Leaf,
  Shield,
  Sparkles,
  Stethoscope,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import type { SessionQuestionOverview } from "../../shared/types";
import type {
  TopicEntry,
  TopicGroup,
} from "../../shared/utils/build-topic-groups";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Baby,
  Shield,
  Heart,
  Stethoscope,
  Building2,
  Leaf,
  Trophy,
  Globe,
  Circle,
};

const CATEGORY_STYLE: Record<
  string,
  { card: string; header: string; text: string; iconBg: string }
> = {
  "子育て・教育": {
    card: "bg-sky-50 border-sky-200",
    header: "bg-white/60 border-sky-200",
    text: "text-sky-700",
    iconBg: "bg-sky-100",
  },
  "防災・安全": {
    card: "bg-orange-50 border-orange-200",
    header: "bg-white/60 border-orange-200",
    text: "text-orange-700",
    iconBg: "bg-orange-100",
  },
  "高齢者・福祉": {
    card: "bg-rose-50 border-rose-200",
    header: "bg-white/60 border-rose-200",
    text: "text-rose-700",
    iconBg: "bg-rose-100",
  },
  "健康・医療": {
    card: "bg-teal-50 border-teal-200",
    header: "bg-white/60 border-teal-200",
    text: "text-teal-700",
    iconBg: "bg-teal-100",
  },
  "交通・まちづくり": {
    card: "bg-violet-50 border-violet-200",
    header: "bg-white/60 border-violet-200",
    text: "text-violet-700",
    iconBg: "bg-violet-100",
  },
  "環境・脱炭素": {
    card: "bg-emerald-50 border-emerald-200",
    header: "bg-white/60 border-emerald-200",
    text: "text-emerald-700",
    iconBg: "bg-emerald-100",
  },
  "スポーツ・文化": {
    card: "bg-indigo-50 border-indigo-200",
    header: "bg-white/60 border-indigo-200",
    text: "text-indigo-700",
    iconBg: "bg-indigo-100",
  },
  "地域・国際交流": {
    card: "bg-amber-50 border-amber-200",
    header: "bg-white/60 border-amber-200",
    text: "text-amber-700",
    iconBg: "bg-amber-100",
  },
};

const DEFAULT_STYLE = {
  card: "bg-mirai-surface-muted border-border",
  header: "bg-card border-border",
  text: "text-mirai-text-secondary",
  iconBg: "bg-card",
};

function TopicCard({
  entry,
  style,
}: {
  entry: TopicEntry;
  style: typeof DEFAULT_STYLE;
}) {
  return (
    <div className={`rounded-xl border ${style.card} overflow-hidden`}>
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-2 mb-2">
          <h3 className={`text-base font-bold ${style.text} flex-1`}>
            {entry.title}
          </h3>
          {entry.topicCount > 1 && (
            <span
              className={`shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full ${style.iconBg} ${style.text}`}
            >
              {entry.topicCount}件
            </span>
          )}
        </div>
        <p className="text-sm text-mirai-text leading-relaxed">
          {entry.answerSummary}
        </p>
      </div>
      <div
        className={`px-4 py-2.5 border-t ${style.header} flex items-center justify-between gap-2`}
      >
        <p className="text-xs text-mirai-text-secondary line-clamp-1 flex-1">
          {entry.questioner.name}議員の質問より
        </p>
        <Link
          href={`/questions/${entry.questioner.id}#topic-${entry.topicIndex}`}
          className={`inline-flex items-center gap-1 text-xs font-medium ${style.text} hover:underline shrink-0`}
        >
          質疑の詳細
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

function ThemeAccordionItem({
  group,
  themeLines,
  isOpen,
  onToggle,
}: {
  group: TopicGroup;
  themeLines: string[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  const Icon = ICON_MAP[group.iconName] ?? Circle;
  const style = CATEGORY_STYLE[group.categoryLabel] ?? DEFAULT_STYLE;
  const count = group.entries.reduce((n, e) => n + e.topicCount, 0);
  const panelId = useId();
  // 畳んでいる間はテーマの3行を見せ、開くかどうか決める手がかりにする
  const showPreview = !isOpen && themeLines.length > 0;

  return (
    <div className={`rounded-xl border ${style.card} overflow-hidden`}>
      <Button
        type="button"
        variant="ghost"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className={`w-full h-auto flex-col items-stretch gap-2 px-4 py-3 rounded-none hover:bg-white/40 ${style.text}`}
      >
        <span className="flex w-full items-center gap-3">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.iconBg}`}
          >
            <Icon className={`h-4 w-4 ${style.text}`} />
          </span>
          <span className="flex-1 text-left font-bold">
            {group.categoryLabel}
          </span>
          <span
            className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${style.iconBg} ${style.text}`}
          >
            {count}件
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </span>
        {showPreview && (
          <span className="flex flex-col gap-1 pl-11 text-left">
            {themeLines.slice(0, 3).map((line) => (
              <span
                key={line}
                className="text-xs leading-relaxed text-mirai-text-secondary font-normal whitespace-normal"
              >
                {line}
              </span>
            ))}
          </span>
        )}
      </Button>
      {/* 畳んでいる間も DOM には残し（ページ内検索・aria-controls のため）、hidden で隠す */}
      <div id={panelId} hidden={!isOpen} className="px-4 pb-4 pt-1">
        <div className="grid gap-3 sm:grid-cols-2">
          {group.entries.map((entry, i) => (
            <TopicCard
              key={`${entry.title}-${i}`}
              entry={entry}
              style={style}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface SessionQuestionsOverviewProps {
  groups: TopicGroup[];
  overview: SessionQuestionOverview;
}

/**
 * 定例会の一般質問ページの本体。
 *
 * 冒頭に「どんな話があった？」の3行まとめ、その下にテーマごとのアコーディオンを置く。
 * 代表質問のある定例会はトピックが100件を超えるので、最初はすべて畳んでおき、
 * 関心のあるテーマだけ開いて読めるようにする。
 */
export function SessionQuestionsOverview({
  groups,
  overview,
}: SessionQuestionsOverviewProps) {
  const [openLabels, setOpenLabels] = useState<Set<string>>(new Set());

  const allOpen = groups.length > 0 && openLabels.size === groups.length;

  function toggle(label: string) {
    setOpenLabels((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }

  function toggleAll() {
    setOpenLabels(
      allOpen ? new Set() : new Set(groups.map((g) => g.categoryLabel))
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {overview.lines && (
        <section className="rounded-xl border border-primary-accent bg-mirai-surface-warm px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="font-bold text-mirai-text">
              どんな話があった？（今回の3行まとめ）
            </h2>
          </div>
          <ol className="flex flex-col gap-2">
            {overview.lines.slice(0, 3).map((line, i) => (
              <li key={line} className="flex gap-2 text-sm text-mirai-text">
                <span
                  aria-hidden="true"
                  className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold"
                >
                  {i + 1}
                </span>
                <span className="leading-relaxed">{line}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-mirai-text-secondary">
          テーマを選んで質疑の中身を確認できます
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={toggleAll}
          className="h-auto px-3 py-1.5 text-xs"
        >
          {allOpen ? "すべて閉じる" : "すべて開く"}
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <ThemeAccordionItem
            key={group.categoryLabel}
            group={group}
            themeLines={overview.themeLines[group.categoryLabel] ?? []}
            isOpen={openLabels.has(group.categoryLabel)}
            onToggle={() => toggle(group.categoryLabel)}
          />
        ))}
      </div>
    </div>
  );
}
