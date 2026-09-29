import "server-only";
import { getEnv } from "@/lib/env";
import type { ActiveWidgetType } from "@/widgets/meta";

/**
 * Widget types that cannot be offered right now because no licensed data
 * source is configured (stocks without a paid provider, D-008). The editor and
 * onboarding hide them; existing tiles show a hint instead of data.
 */
export function unavailableWidgetTypes(): ActiveWidgetType[] {
  return getEnv().STOCKS_PROVIDER === "off" ? ["stocks"] : [];
}
