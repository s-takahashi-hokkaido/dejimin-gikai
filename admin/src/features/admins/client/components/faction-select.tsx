"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FactionOption } from "../../shared/types";

type FactionSelectProps = {
  id?: string;
  value: string | null;
  options: FactionOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function FactionSelect({
  id,
  value,
  options,
  onChange,
  disabled,
  placeholder = "会派を選択",
}: FactionSelectProps) {
  // 使われていない会派は、今の所属先のときだけ選択肢に残す
  const visibleOptions = options.filter(
    (option) => option.isActive || option.id === value
  );

  return (
    <Select value={value ?? ""} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {visibleOptions.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}
            {!option.isActive && "（無効の会派）"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
