import type { Metadata } from "next";
import { OwnerTodo, Prose } from "@/components/site/Prose";

export const metadata: Metadata = { title: "Datenschutz" };

export default function DatenschutzPage() {
  return (
    <Prose title="Datenschutzerklärung">
      <OwnerTodo>Entwurf. Vor Go-Live vollständig vom Owner/Anwalt prüfen und ergänzen (Gate G3).</OwnerTodo>
      <h2>1. Verantwortlicher</h2>
      <p>[Name, Anschrift, E-Mail laut Impressum]</p>
      <h2>2. Welche Daten wir verarbeiten</h2>
      <ul>
        <li>Konto: E-Mail-Adresse (Anmeldung per Magic Link).</li>
        <li>
          Einstellungen: Layouts, Widget-Konfiguration (z. B. gewählte Stadt, Ticker, Notiztext), Theme,
          Fahrzeug-Preset.
        </li>
        <li>
          Geräte: gekoppelte Geräte mit Bezeichnung, Zeitpunkt der letzten Nutzung; das Geräte-Token wird nur als Hash
          gespeichert.
        </li>
        <li>Abo: Plan und Status, Stripe-Kunden-ID; Zahlungsdaten verarbeitet ausschließlich Stripe.</li>
        <li>Einwilligungen: Zeitpunkt der Zustimmung zum vorzeitigen Leistungsbeginn und zum Sicherheitshinweis.</li>
      </ul>
      <p>
        Es erfolgt keine automatische Standortabfrage. Wir setzen keine Tracker und keine Werbe-Cookies ein. Schriften
        werden lokal ausgeliefert.
      </p>
      <h2>3. Cookies</h2>
      <p>
        Technisch notwendige Cookies: Sitzungs-Cookie (Anmeldung), Geräte-Cookie (gekoppeltes Fahrzeug, 90 Tage
        rollierend), Theme-Cookie. Rechtsgrundlage: § 25 Abs. 2 TDDDG, Art. 6 Abs. 1 lit. b DSGVO.
      </p>
      <h2>4. Empfänger / Auftragsverarbeiter</h2>
      <ul>
        <li>Supabase (Datenbank und Authentifizierung, Region EU/Frankfurt)</li>
        <li>Vercel (Hosting, Region fra1)</li>
        <li>Stripe (Zahlungsabwicklung)</li>
      </ul>
      <p>
        Datenquellen (Abruf nur über unseren Server, deine IP-Adresse und Kontodaten werden nicht übermittelt): MET
        Norway (Wetter; gerundete Koordinaten der gewählten Stadt), OpenStreetMap Foundation/Nominatim (Ortssuche;
        eingegebener Suchbegriff), CoinMarketCap (Krypto-Kurse) und Europäische Zentralbank (Wechselkurse). Übersicht
        und Quellenangaben unter <a href="/lizenzen">Lizenzen &amp; Datenquellen</a>.
      </p>
      <OwnerTodo>
        AVV mit allen Auftragsverarbeitern abschließen, Drittlandtransfers (Stripe, Vercel) mit Rechtsgrundlage
        ergänzen.
      </OwnerTodo>
      <h2>5. Speicherdauer</h2>
      <p>
        Bis zur Löschung des Kontos. Kopplungscodes verfallen nach 10 Minuten und werden nach 24 Stunden gelöscht.
        Gesetzliche Aufbewahrungspflichten (z. B. Rechnungen bei Stripe) bleiben unberührt.
      </p>
      <h2>6. Deine Rechte</h2>
      <p>
        Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch. Export und Löschung
        kannst du direkt in den Einstellungen auslösen. Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde.
      </p>
    </Prose>
  );
}
