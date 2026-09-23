"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COMMITTEE_TYPE_LABELS, type CommitteeType } from "../../shared/types";

type CommitteeTypeSelectProps = {
  id?: string;
  value: CommitteeType;
  onChange: (value: CommitteeType) => void;
  disabled?: boolean;
};

export function CommitteeTypeSelect({
  id,
  value,
  onChange,
  disabled,
}: CommitteeTypeSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as CommitteeType)}
      disabled={disabled}
    >
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(COMMITTEE_TYPE_LABELS) as CommitteeType[]).map((type) => (
          <SelectItem key={type} value={type}>
            {COMMITTEE_TYPE_LABELS[type]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
