/** WitCar mark: abstract widget grid. No vehicle imagery, no brand symbols (§2.2). */
export function Logo({ size = 28, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect x="2" y="2" width="16" height="12" rx="3.5" fill="var(--accent)" />
        <rect x="20" y="2" width="10" height="12" rx="3.5" fill="var(--text)" opacity="0.85" />
        <rect x="2" y="16" width="10" height="14" rx="3.5" fill="var(--text)" opacity="0.85" />
        <rect x="14" y="16" width="16" height="14" rx="3.5" fill="var(--accent)" opacity="0.55" />
      </svg>
      {withText ? <span style={{ fontSize: size * 0.72 }}>WitCar</span> : null}
    </span>
  );
}
