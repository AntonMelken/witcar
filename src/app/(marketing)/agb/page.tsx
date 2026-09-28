import type { Metadata } from "next";
import { OwnerTodo, Prose } from "@/components/site/Prose";

export const metadata: Metadata = { title: "AGB" };

export default function AgbPage() {
  return (
    <Prose title="Allgemeine Geschäftsbedingungen">
      <OwnerTodo>Platzhalter. AGB vom Owner/Anwalt erstellen lassen (Gate G3).</OwnerTodo>
      <h2>Leistung</h2>
      <p>
        WitCar stellt ein anpassbares Widget-Dashboard als Web-App bereit. Kurs- und Wetterdaten stammen von
        Drittanbietern, können verzögert sein und stellen keine Anlageberatung dar.
      </p>
      <h2>Nutzung im Fahrzeug</h2>
      <p>
        Die Bedienung ist nur im Stand vorgesehen. Der Fahrer bleibt jederzeit für die sichere Führung des Fahrzeugs
        verantwortlich (§ 23 StVO). WitCar ist nicht dafür ausgelegt, den Fahrer abzulenken.
      </p>
      <h2>Abo und Kündigung</h2>
      <p>
        Pro wird monatlich bzw. jährlich abgerechnet und ist jederzeit zum Ende des Abrechnungszeitraums über das
        Kundenportal kündbar. Bei einem Downgrade werden keine Daten gelöscht.
      </p>
    </Prose>
  );
}
