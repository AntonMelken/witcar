import type { Metadata } from "next";
import { Prose } from "@/components/site/Prose";

export const metadata: Metadata = { title: "Hinweise & Haftung" };

export default function DisclaimerPage() {
  return (
    <Prose title="Hinweise & Haftung">
      <h2>Sicherheit im Straßenverkehr</h2>
      <p>
        WitCar ist nicht für die Nutzung mit Ablenkung des Fahrers ausgelegt. Bediene WitCar nur im Stand. Ein Blick auf
        das Display darf nur kurz und der Verkehrssituation angepasst erfolgen (§ 23 StVO). Der Fahrer bleibt jederzeit
        verantwortlich.
      </p>
      <h2>Fahrmodus</h2>
      <p>
        Der Fahrmodus ist experimentell. Ob der Browser deines Fahrzeugs Webseiten während der Fahrt anzeigt, hängt vom
        Hersteller, der Software-Version und der Region ab.
      </p>
      <h2>Keine Anlageberatung</h2>
      <p>
        Kurse werden verzögert angezeigt und dienen nur der Information. Sie sind keine Anlageberatung und keine
        Aufforderung zum Kauf oder Verkauf.
      </p>
      <h2>Marken</h2>
      <p>
        WitCar ist ein unabhängiges Produkt und steht in keiner Verbindung zu Tesla, Inc. „Tesla“ wird ausschließlich
        beschreibend verwendet.
      </p>
    </Prose>
  );
}
