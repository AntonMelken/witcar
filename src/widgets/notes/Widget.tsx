"use client";

import { useT } from "@/i18n/lite";
import { Tile } from "@/components/dashboard/Tile";
import type { WidgetProps } from "../types";
import { activeNote, type NotesConfig } from "./definition";

export default function NotesWidget({ config, mode }: WidgetProps<NotesConfig>) {
  const t = useT("widgets.notes");
  const note = activeNote(config);
  const body = note?.text ?? "";
  // Text only, rendered as a React text node (never HTML). Drive mode: short excerpt.
  const text = mode === "drive" && body.length > 80 ? `${body.slice(0, 79)}…` : body;
  const total = config.notes.length;
  const index = note ? config.notes.findIndex((n) => n.id === note.id) + 1 : 0;
  return (
    <Tile
      label={note?.title || t("title")}
      footer={mode === "standard" && total > 1 ? t("count", { index, total }) : undefined}
    >
      <p
        className="whitespace-pre-wrap break-words overflow-hidden"
        style={{ fontSize: mode === "drive" ? "max(28px, min(16cqh, 7cqw))" : "max(14px, min(9cqh, 5cqw))" }}
      >
        {text || <span className="text-dim">{t("empty")}</span>}
      </p>
    </Tile>
  );
}
