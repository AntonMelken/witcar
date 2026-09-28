import { z } from "zod";

export const notesSchema = z.object({
  // plain text only, never rendered as HTML
  text: z.string().max(500).default(""),
});
export type NotesConfig = z.infer<typeof notesSchema>;
