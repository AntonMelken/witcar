import type { WidgetBaseMeta } from "../types";
import type { Note, NotesConfig } from "./schema";

export type { Note, NotesConfig } from "./schema";

export const NOTES_MAX = 12;
export const NOTE_TEXT_MAX = 600;
export const NOTE_TITLE_MAX = 40;

export const notesMeta: WidgetBaseMeta<NotesConfig> = {
  type: "notes",
  title: "notes.title",
  minSize: { w: 3, h: 2 },
  defaultSize: { w: 4, h: 3 },
  defaultConfig: { notes: [], activeId: null },
  driveSafe: true,
  refreshMs: null,
  proOnly: true,
  fields: [{ key: "notes", kind: "hint", label: "notes.fields.hint" }],
};

/** The note the widget shows (the chosen one, else the first). */
export function activeNote(config: NotesConfig): Note | null {
  return config.notes.find((n) => n.id === config.activeId) ?? config.notes[0] ?? null;
}
