import type { WidgetBaseMeta } from "../types";
import type { NotesConfig } from "./schema";

export type { NotesConfig } from "./schema";

export const notesMeta: WidgetBaseMeta<NotesConfig> = {
  type: "notes",
  title: "notes.title",
  minSize: { w: 3, h: 2 },
  defaultSize: { w: 4, h: 3 },
  defaultConfig: { text: "" },
  driveSafe: true,
  refreshMs: null,
  proOnly: true,
  fields: [{ key: "text", kind: "textarea", label: "notes.fields.text", maxLength: 500 }],
};
