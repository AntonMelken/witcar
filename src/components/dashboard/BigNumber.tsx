import type { ReactNode } from "react";
import type { DashboardMode } from "@/widgets/types";

/**
 * Main value of a tile. Scales with the tile (container query units).
 * Drive mode: at least 64 CSS px (§12.3).
 */
export function BigNumber({
  children,
  mode,
  scale = 1,
  className = "",
}: {
  children: ReactNode;
  mode: DashboardMode;
  scale?: number;
  className?: string;
}) {
  const fontSize =
    mode === "drive"
      ? `max(64px, min(${52 * scale}cqh, ${24 * scale}cqw))`
      : `max(18px, min(${46 * scale}cqh, ${22 * scale}cqw))`;
  return (
    <div
      className={`tabular font-semibold leading-none tracking-tight whitespace-nowrap ${className}`}
      style={{ fontSize }}
      data-bignumber
    >
      {children}
    </div>
  );
}
