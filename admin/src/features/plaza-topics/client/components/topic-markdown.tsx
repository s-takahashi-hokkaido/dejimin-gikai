import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type TopicMarkdownProps = {
  markdown: string;
  className?: string;
};

/**
 * 議題の本文（Markdown）を表示する。Server Component からもフォームのプレビューからも使う
 *
 * 生の HTML は描画しない（react-markdown は rehype-raw を足さないかぎり HTML をエスケープする）。
 * `javascript:` などのリンクは react-markdown の既定の URL 変換で無効になる。
 * 来訪者向け（web）の表示は議案詳細と同じ parseMarkdown を使う（P6）。ここは作成者の確認用。
 */
export function TopicMarkdown({ markdown, className }: TopicMarkdownProps) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none sm:prose-base prose-headings:font-bold prose-a:text-primary",
        className
      )}
    >
      <Markdown
        remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
        components={{
          a: ({ node: _node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          table: ({ node: _node, ...props }) => (
            <div className="overflow-x-auto">
              <table {...props} />
            </div>
          ),
        }}
      >
        {markdown}
      </Markdown>
    </div>
  );
}
