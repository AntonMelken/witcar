import { z } from "zod";

export const dateSchema = z.object({
  style: z.enum(["long", "short"]).default("long"),
});
export type DateConfig = z.infer<typeof dateSchema>;
