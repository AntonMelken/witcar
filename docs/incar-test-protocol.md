# In-Car-Testprotokoll (Gates G0 und G1)

Ziel: Klären, ob eine Webseite im Fahrzeug-Browser **während der Fahrt** sichtbar bleibt und sich aktualisiert (G0),
und die echten Viewport-Maße/Farben je Modell messen (G1). Ergebnisse fließen in `DECISIONS.md` (G0, G1, D-011).

> Sicherheit zuerst: Der **Fahrer bedient nichts**. Alle Eingaben macht der Beifahrer oder sie erfolgen im Stand.
> Test nur auf ruhiger Strecke, StVO beachten (§ 23 StVO).

## Vorbereitung (im Stand)

1. Handy-Hotspot einschalten, Fahrzeug mit dem Hotspot verbinden (oder Fahrzeug-Konnektivität, falls der Browser sie nutzt).
2. Im Fahrzeug-Browser `https://<domain>/tools/drive-test` öffnen.
3. Prüfen: Uhr läuft, Zähler zählt, „Ping: n ok“ steigt alle 5 s, Netz „online“.
4. Notieren: Modell (neutral beschreiben, z. B. „Limousine 2021“), Baujahr, Software-Version (Fahrzeugmenü), Region.

## Fahrt (Beifahrer beobachtet)

5. Losfahren. Beifahrer beobachtet 5–10 Minuten und notiert:
   - Bleibt die Seite sichtbar? Wird sie ausgeblendet, gesperrt, geschlossen oder verkleinert?
   - Läuft der Sekundenzähler weiter (Seite nicht eingefroren)?
   - Steigt der Ping-Zähler weiter (Netz aktiv) oder steigen nur die Fehler?
   - Gibt es Meldungen des Fahrzeugs (z. B. „Browser während der Fahrt nicht verfügbar“)?
6. Anhalten (Parkplatz). Log-Spalten „visibilitychange“ und „online/offline“ ansehen.

## Ergebnis senden (im Stand)

7. Formular rechts ausfüllen (keine personenbezogenen Daten) und „Ergebnis senden“ tippen.
   Das Formular speichert anonym in der Tabelle `incar_reports` inkl. Zähler, Ping-Statistik, Viewport und DPR.

## Kalibrierung G1 (im Stand)

8. `https://<domain>/tools/calibrate` öffnen.
9. Viewport-Werte ablesen (steht oben im Kasten, auch als JSON).
10. Rand-Lineale (alle 10 px): zählen, wie viele Linien oben/unten/links/rechts von der Fahrzeug-UI verdeckt sind → Safe-Insets in px.
11. Farbfelder antippen (Vollbild) und das Feld wählen, das am besten zum Display-Schwarz der Fahrzeug-UI passt → Wert für `--bg`.
12. Werte mit Modell/Baujahr/Software in `DECISIONS.md` bei **D-011** und **G1** eintragen.

## Auswertung G0 (Masterplan §3)

- Seite sichtbar **und** Zähler läuft → Fahrmodus offiziell unterstützen (Marketing anpassen, D-006 neu bewerten).
- Seite gesperrt/geschlossen → Positionierung „Laden, Parken, Beifahrer“; Fahrmodus bleibt Stand-Modus.
- Seite sichtbar, aber keine Aktualisierung → Offline-Fallback und Stale-Anzeige sind Pflicht (bereits umgesetzt).

## Ergebnisse abfragen (Owner)

```sql
select created_at, model, software_version, region, build_year,
       visible_while_driving, counter_kept_running, network_active,
       viewport_w, viewport_h, device_pixel_ratio, measurements, notes
from public.incar_reports order by created_at desc;
```
