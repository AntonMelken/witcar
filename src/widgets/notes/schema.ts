import { z } from "zod";
import { NOTE_TEXT_MAX, NOTE_TITLE_MAX, NOTES_MAX } from "./definition";

const noteSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,16}$/),
  title: z.string().trim().max(NOTE_TITLE_MAX).default(""),
  // plain text only, never rendered as HTML
  text: z.string().max(NOTE_TEXT_MAX).default(""),
});
export type Note = z.infer<typeof noteSchema>;

const base = z
  .object({
    notes: z.array(noteSchema).max(NOTES_MAX).default([]),
    /** the note the widget shows */
    activeId: z.string().nullable().default(null),
  })
  .transform((c) => ({
    ...c,
    activeId: c.notes.some((n) => n.id === c.activeId) ? c.activeId : (c.notes[0]?.id ?? null),
  }));

/** Configs saved before there were several notes have a single `text`: converted on read. */
export const notesSchema = z.preprocess((raw) => {
  if (raw && typeof raw === "object" && !("notes" in raw)) {
    const text = (raw as { text?: unknown }).text;
    if (typeof text === "string") {
      return text ? { notes: [{ id: "n1", title: "", text: text.slice(0, NOTE_TEXT_MAX) }], activeId: "n1" } : {};
    }
  }
  return raw;
}, base);
export type NotesConfig = z.infer<typeof base>;
