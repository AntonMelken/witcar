/** Abstract screen shape for a preset (no vehicle images, §2.2). */
export function PresetShape({ aspect, active }: { aspect: number; active: boolean }) {
  const w = 72;
  const h = Math.round(w / aspect);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <rect
        x="1"
        y="1"
        width={w - 2}
        height={h - 2}
        rx="6"
        fill="none"
        stroke={active ? "var(--accent)" : "var(--text-dim)"}
        strokeWidth="2"
      />
    </svg>
  );
}
