# Rechtliche Notizen und Owner-Checkliste (Gate G3)

> Keine Rechtsberatung. Alle Texte sind Entwürfe und müssen vom Owner bzw. einer Anwältin/einem Anwalt geprüft werden.
> Platzhalter auf den Seiten sind mit `TODO_OWNER_LEGAL` markiert (E2E prüft, dass sie sichtbar sind).

## Checkliste vor Go-Live

- [ ] Impressum (§ 5 DDG) mit ladungsfähiger Anschrift, Kontakt, Hinweis § 19 UStG
- [ ] Datenschutzerklärung vollständig (Empfänger, Drittlandtransfers, Rechtsgrundlagen, Speicherdauer, Rechte)
- [ ] AVV abgeschlossen mit: Supabase, Vercel, Stripe, Upstash (falls genutzt), ggf. Error-Tracking
- [ ] AGB (Leistungsbeschreibung, Laufzeit/Kündigung, Haftung, Nutzung im Fahrzeug)
- [ ] Widerrufsbelehrung + Muster-Widerrufsformular (digitale Dienstleistung)
- [ ] Datenlizenzen geklärt (G2: D-007, D-008, D-009)
- [ ] Markenrecherche „WitCar“ (DPMA/EUIPO), Domain
- [ ] Steuerlicher Status (Kleinunternehmer § 19 UStG; OSS bei EU-Verbrauchern prüfen) mit Steuerberater
- [ ] Stripe: Konto verifiziert, Produkt/Preise im **Test-Modus** angelegt, Customer Portal aktiviert (Kündigung erlauben)

## Vorlage: Zustimmung zum vorzeitigen Leistungsbeginn (Checkout)

Die Checkbox vor dem Checkout lautet (Version `2026-09-28`, gespeichert in `consents` mit Zeitstempel):

> Ich verlange ausdrücklich, dass WitCar vor Ablauf der Widerrufsfrist mit der Leistung beginnt, und habe zur Kenntnis
> genommen, dass mein Widerrufsrecht dadurch nach den gesetzlichen Vorgaben erlöschen kann.

Hinweise für die Prüfung:

- WitCar Pro ist voraussichtlich eine **digitale Dienstleistung** (Abo-Zugang). Für Dienstleistungen gelten §§ 356 Abs. 4, 357a BGB
  (Wertersatz bei vorzeitigem Beginn, Erlöschen bei vollständiger Erbringung). Für digitale Inhalte § 356 Abs. 5 BGB.
  Welche Variante greift und wie die Checkbox/Bestätigung (Textform, § 312f BGB) genau formuliert wird, bitte prüfen lassen.
- Bestätigung auf dauerhaftem Datenträger: Stripe-Rechnung/E-Mail oder eigene Bestätigungsmail – Owner entscheidet.
- „Kündigungsbutton“ (§ 312k BGB): Kündigung ist über das Stripe Customer Portal möglich; ob zusätzlich ein eigener
  Kündigungsbutton auf der Website nötig ist, prüfen lassen.

## Sicherheitshinweis Fahrmodus

Version `2026-09-28`, einmalig bestätigt, gespeichert in `profiles.safety_ack_at` und `consents` (`safety_notice`).
