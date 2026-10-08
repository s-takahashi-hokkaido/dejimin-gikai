"use client";

import { Switch } from "@/components/ui/switch";
import { useTextSizeToggle } from "./use-text-size-toggle";

export function TextSizeToggle() {
  const { isLarge, handleToggle } = useTextSizeToggle();

  return (
    <div className="flex items-center justify-between space-x-4">
      <div className="text-sm font-medium">文字を大きくする</div>
      <Switch
        checked={isLarge}
        onCheckedChange={handleToggle}
        aria-label="文字を大きくする"
      />
    </div>
  );
}
