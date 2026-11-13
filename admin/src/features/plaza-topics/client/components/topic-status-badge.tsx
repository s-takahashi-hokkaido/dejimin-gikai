import { Badge } from "@/components/ui/badge";
import type { TopicStatus } from "../../shared/types/plaza-topic";
import { TOPIC_STATUS_LABELS } from "../../shared/utils/topic-status";

const STATUS_BADGE_VARIANTS = {
  draft: "outline",
  open: "default",
  closed: "secondary",
} as const satisfies Record<TopicStatus, string>;

/** 議題の状態のバッジ。Server Component からも使う */
export function TopicStatusBadge({ status }: { status: TopicStatus }) {
  return (
    <Badge variant={STATUS_BADGE_VARIANTS[status]}>
      {TOPIC_STATUS_LABELS[status]}
    </Badge>
  );
}
