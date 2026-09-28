/**
 * Minimal structured logger without personal data (masterplan §16.1):
 * e-mail addresses and long tokens are scrubbed from messages and metadata.
 * Output goes to stdout/stderr (Vercel logs, region fra1). An EU error
 * tracker can be attached later in instrumentation.ts (D-018).
 */

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const TOKEN = /\b[A-Za-z0-9_-]{32,}\b/g;

export function scrub(value: string): string {
  return value.replace(EMAIL, "[email]").replace(TOKEN, "[token]");
}

function scrubMeta(meta: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (/email|token|secret|password|text|note/i.test(k)) continue;
    out[k] = typeof v === "string" ? scrub(v) : v;
  }
  return out;
}

export function logError(scope: string, err: unknown, meta?: Record<string, unknown>): void {
  const e = err instanceof Error ? err : new Error(String(err));
  console.error(
    JSON.stringify({
      level: "error",
      scope,
      message: scrub(e.message),
      name: e.name,
      stack: e.stack ? scrub(e.stack.split("\n").slice(0, 6).join("\n")) : undefined,
      ...scrubMeta(meta),
    }),
  );
}

export function logWarn(scope: string, message: string, meta?: Record<string, unknown>): void {
  console.warn(JSON.stringify({ level: "warn", scope, message: scrub(message), ...scrubMeta(meta) }));
}

export function logInfo(scope: string, message: string, meta?: Record<string, unknown>): void {
  console.info(JSON.stringify({ level: "info", scope, message: scrub(message), ...scrubMeta(meta) }));
}
