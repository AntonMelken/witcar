import type { Metadata } from "next";
import { OwnerTodo, Prose } from "@/components/site/Prose";

export const metadata: Metadata = { title: "Impressum" };

export default function ImpressumPage() {
  return (
    <Prose title="Impressum">
      <OwnerTodo>Angaben gemäß § 5 DDG vom Owner eintragen und prüfen lassen.</OwnerTodo>
      <h2>Anbieter</h2>
      <p>
        [Vor- und Nachname]
        <br />
        [Straße Hausnummer]
        <br />
        [PLZ Ort]
        <br />
        Deutschland
      </p>
      <h2>Kontakt</h2>
      <p>E-Mail: [kontakt@domain]</p>
      <h2>Umsatzsteuer</h2>
      <p>Kleinunternehmer gemäß § 19 UStG, daher wird keine Umsatzsteuer ausgewiesen.</p>
      <h2>Verbraucherstreitbeilegung</h2>
      <p>[Hinweis zur Teilnahme an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle]</p>
      <h2>Marken</h2>
      <p>
        WitCar ist ein unabhängiges Produkt und steht in keiner Verbindung zu Tesla, Inc. Genannte Marken gehören ihren
        jeweiligen Inhabern und werden nur beschreibend verwendet.
      </p>
    </Prose>
  );
}
