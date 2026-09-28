"use client";

import { useT } from "@/i18n/lite";
import { formatAge } from "@/lib/client/format";
import { useNow } from "@/lib/client/tick";

/**
 * Subtle age marker for data older than 2x its refresh interval or served
 * stale by the server (§9.3, §17). Never a dialog.
 */
export function StaleBadge({
  fetchedAt,
  refreshMs,
  serverStale,
  error,
}: {
  fetchedAt: string | null;
  refreshMs: number;
  serverStale?: boolean;
  error?: string | null;
}) {
  const t = useT("widgets");
  const now = useNow(30_000);
  if (!fetchedAt || now == null) return null;
  const age = now - Date.parse(fetchedAt);
  const stale = age > 2 * refreshMs || (serverStale && age > refreshMs) || (!!error && age > refreshMs);
  if (!stale) return null;
  return (
    <span className="inline-flex items-center gap-1 text-warning" data-stale="true" title={t("staleTitle")}>
      <span aria-hidden="true">●</span>
      {t("staleAge", { age: formatAge(age) })}
    </span>
  );
}
