"use client";

import { useT } from "@/i18n/lite";
import { Tile } from "@/components/dashboard/Tile";
import type { WidgetProps } from "../types";
import type { NotesConfig } from "./definition";

export default function NotesWidget({ config, mode }: WidgetProps<NotesConfig>) {
  const t = useT("widgets.notes");
  // Text only, rendered as a React text node (never HTML). Drive mode: short excerpt.
  const text = mode === "drive" && config.text.length > 80 ? `${config.text.slice(0, 79)}…` : config.text;
  return (
    <Tile label={t("title")}>
      <p
        className="whitespace-pre-wrap break-words overflow-hidden"
        style={{ fontSize: mode === "drive" ? "max(28px, min(16cqh, 7cqw))" : "max(14px, min(9cqh, 5cqw))" }}
      >
        {text || <span className="text-dim">{t("empty")}</span>}
      </p>
    </Tile>
  );
}
