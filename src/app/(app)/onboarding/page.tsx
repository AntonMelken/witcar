import type { Metadata } from "next";
import { Onboarding } from "@/components/editor/Onboarding";
import { IntlProvider } from "@/components/site/IntlProvider";
import { requireUserPage } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { unavailableWidgetTypes } from "@/lib/providers/availability";
import { ensureProfile } from "@/lib/repo/profiles";
import { siteUrl } from "@/lib/env";

export const metadata: Metadata = { title: "Einrichtung", robots: { index: false } };

export default async function OnboardingPage() {
  const user = await requireUserPage("/onboarding");
  const profile = await ensureProfile(await getDb(), user.userId);
  return (
    <IntlProvider namespaces={["onboarding", "presets", "widgets", "editor"]}>
      <Onboarding
        initialPreset={profile.vehiclePreset}
        siteHost={siteUrl().host}
        unavailableTypes={unavailableWidgetTypes()}
      />
    </IntlProvider>
  );
}
