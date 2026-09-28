import type { ReactNode } from "react";

/** Flat widget surface (no shadows/blur, §12.1). */
export function Tile({ children, label, footer }: { children: ReactNode; label?: string; footer?: ReactNode }) {
  return (
    <div className="wc-tile flex flex-col p-[clamp(8px,4cqmin,20px)]">
      {label ? (
        <div className="text-dim font-medium truncate" style={{ fontSize: "max(12px, min(7cqh, 5cqw, 20px))" }}>
          {label}
        </div>
      ) : null}
      <div className="flex-1 min-h-0 flex flex-col justify-center">{children}</div>
      {footer ? (
        <div className="text-dim truncate" style={{ fontSize: "max(10px, min(5.5cqh, 4cqw, 14px))" }}>
          {footer}
        </div>
      ) : null}
    </div>
  );
}
