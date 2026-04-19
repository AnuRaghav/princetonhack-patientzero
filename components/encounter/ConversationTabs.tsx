"use client";

import { Icon, Segmented } from "@/components/ui";

import type { EncounterMode } from "./lib/types";

type Props = {
  value: EncounterMode;
  onChange: (mode: EncounterMode) => void;
  className?: string;
};

const ITEMS = [
  { value: "text" as const, label: "Text", icon: <Icon.Send size={12} /> },
  { value: "voice" as const, label: "Voice", icon: <Icon.Mic size={12} /> },
];

/** Two-way segmented switch that toggles between text and voice input modes. */
export function ConversationTabs({ value, onChange, className }: Props) {
  return (
    <Segmented<EncounterMode>
      value={value}
      items={ITEMS}
      onChange={onChange}
      className={className}
    />
  );
}
