import type { WidgetBaseMeta } from "../types";
import type { DateConfig } from "./schema";

export type { DateConfig } from "./schema";

export const dateMeta: WidgetBaseMeta<DateConfig> = {
  type: "date",
  title: "date.title",
  minSize: { w: 3, h: 2 },
  defaultSize: { w: 4, h: 2 },
  defaultConfig: { style: "long" },
  driveSafe: true,
  refreshMs: null,
  proOnly: false,
  fields: [
    {
      key: "style",
      kind: "select",
      label: "date.fields.style",
      options: [
        { value: "long", label: "date.styleLong" },
        { value: "short", label: "date.styleShort" },
      ],
    },
  ],
};
