"use client";

import { Tile } from "@/components/dashboard/Tile";
import { formatDate } from "@/lib/client/format";
import { useNow } from "@/lib/client/tick";
import type { WidgetProps } from "../types";
import type { DateConfig } from "./definition";

export default function DateWidget({ config, mode }: WidgetProps<DateConfig>) {
  const now = useNow(60_000);
  const text = now == null ? "" : formatDate(new Date(now), config.style);
  const fontSize = mode === "drive" ? "max(40px, min(30cqh, 9cqw))" : "max(16px, min(30cqh, 9cqw))";
  return (
    <Tile>
      <div className="font-semibold leading-tight" style={{ fontSize }} suppressHydrationWarning>
        {text || " "}
      </div>
    </Tile>
  );
}
