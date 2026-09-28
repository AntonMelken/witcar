import type { Metadata } from "next";
import { OwnerTodo, Prose } from "@/components/site/Prose";

export const metadata: Metadata = { title: "Widerrufsbelehrung" };

export default function WiderrufPage() {
  return (
    <Prose title="Widerrufsbelehrung">
      <OwnerTodo>
        Muster-Widerrufsbelehrung (Anlage 1 zu Art. 246a § 1 EGBGB) für digitale Dienstleistungen einsetzen und prüfen
        lassen. Vorlage: docs/legal-notes.md.
      </OwnerTodo>
      <h2>Widerrufsrecht</h2>
      <p>[Belehrungstext: 14 Tage ab Vertragsschluss, Adressat, Musterformular]</p>
      <h2>Vorzeitiges Erlöschen</h2>
      <p>
        Beim Kauf von Pro stimmst du ausdrücklich zu, dass wir vor Ablauf der Widerrufsfrist mit der Leistung beginnen,
        und bestätigst deine Kenntnis, dass dein Widerrufsrecht mit vollständiger Vertragserfüllung bzw. nach Maßgabe
        der gesetzlichen Regelungen erlischt. Der Zeitpunkt deiner Zustimmung wird gespeichert.
      </p>
    </Prose>
  );
}
