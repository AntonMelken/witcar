import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Editor } from "@/components/editor/Editor";
import { IntlProvider } from "@/components/site/IntlProvider";
import { requirePrincipalPage } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getDefaultLayout, getLayout, listLayouts } from "@/lib/repo/layouts";
import { ensureProfile } from "@/lib/repo/profiles";
import { layoutEditability } from "@/lib/services/layouts";
import { getUserPlan } from "@/lib/services/plan";

export const metadata: Metadata = { title: "Editor", robots: { index: false } };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function EditorPage(props: PageProps<"/editor">) {
  const sp = await props.searchParams;
  const mode = sp.mode === "drive" ? "drive" : "standard";
  const principal = await requirePrincipalPage("/editor");
  const db = await getDb();
  const t = await getTranslations("editor");
  const [profile, { plan }, summaries] = await Promise.all([
    ensureProfile(db, principal.userId),
    getUserPlan(db, principal.userId),
    listLayouts(db, principal.userId),
  ]);
  const editability = await layoutEditability(db, principal.userId, summaries);

  const requested =
    typeof sp.layout === "string" && UUID.test(sp.layout) ? await getLayout(db, principal.userId, sp.layout) : null;
  const layout = requested && requested.mode === mode ? requested : await getDefaultLayout(db, principal.userId, mode);

  const initial = layout
    ? { name: layout.name, preset: layout.preset, widgets: layout.widgets }
    : { name: mode === "drive" ? t("driveLayout") : t("defaultName"), preset: profile.vehiclePreset, widgets: [] };

  return (
    <IntlProvider namespaces={["editor", "widgets", "presets"]}>
      <Editor
        key={layout?.id ?? mode}
        plan={plan}
        mode={mode}
        layoutId={layout?.id ?? null}
        initial={initial}
        editable={layout ? editability[layout.id] !== false : true}
        layouts={summaries.map((s) => ({
          id: s.id,
          name: s.name,
          mode: s.mode,
          isDefault: s.isDefault,
          editable: editability[s.id] !== false,
        }))}
      />
    </IntlProvider>
  );
}
