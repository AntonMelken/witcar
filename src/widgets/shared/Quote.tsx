"use client";

import { formatSignedPercent } from "@/lib/client/format";
import type { DashboardMode } from "../types";

/** Change with arrow + sign + color: never color alone (§12.1). */
export function Change({ pct, mode }: { pct: number; mode: DashboardMode }) {
  const up = pct > 0;
  const down = pct < 0;
  return (
    <div
      className={`tabular font-semibold mt-[3cqh] ${up ? "text-positive" : down ? "text-negative" : "text-dim"}`}
      style={{ fontSize: mode === "drive" ? "max(28px, min(16cqh, 8cqw))" : "max(13px, min(12cqh, 6cqw))" }}
    >
      <span aria-hidden="true">{up ? "▲ " : down ? "▼ " : "■ "}</span>
      {formatSignedPercent(pct)}
    </div>
  );
}

export function QuoteRow({
  name,
  price,
  pct,
  rows,
}: {
  name: string;
  price: string;
  pct: number | null;
  rows: number;
}) {
  const size = `max(12px, min(${Math.floor(60 / Math.max(rows, 2))}cqh, 6cqw))`;
  return (
    <li className="flex items-baseline justify-between gap-3 tabular" style={{ fontSize: size }}>
      <span className="font-semibold truncate">{name}</span>
      <span className="flex items-baseline gap-3 whitespace-nowrap">
        <span>{price}</span>
        {pct != null ? (
          <span className={pct > 0 ? "text-positive" : pct < 0 ? "text-negative" : "text-dim"}>
            {pct > 0 ? "▲" : pct < 0 ? "▼" : "■"} {formatSignedPercent(pct)}
          </span>
        ) : null}
      </span>
    </li>
  );
}
