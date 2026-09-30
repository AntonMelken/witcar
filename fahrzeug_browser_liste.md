# Fahrzeug-Modelle mit nativem Webbrowser (für Witcar Integration)

Dieses Dokument dient als Kontext für Claude AI zur Weiterentwicklung des Projekts **Witcar**. Es listet gezielt Automodelle und Plattformen auf, die über einen vollwertigen, Chromium-basierten Webbrowser verfügen, auf dem Web-Apps ausgeführt werden können.

---

## 1. Tesla
* **Plattform:** Proprietäres OS (Chromium-basiert)
* **Unterstützte Modelle:**
  * Model 3 (Alle Baujahre)
  * Model Y (Alle Baujahre)
  * Model S (Modelle ab ca. 2018 mit MCU2 / MCU3-Prozessor)
  * Model X (Modelle ab ca. 2018 mit MCU2 / MCU3-Prozessor)
  * Cybertruck
* **Besonderheiten:** Sehr performanter Webbrowser im Vollbild (nur im Parkmodus 'P' nutzbar). Hervorragende Touch-Unterstützung.

## 2. Volvo & Polestar
* **Plattform:** Android Automotive OS (mit Google Built-in)
* **Browser-Verfügbarkeit:** Google Chrome & Vivaldi Browser über den Google Play Store im Fahrzeug.
* **Unterstützte Modelle:**
  * **Polestar:** Polestar 2, Polestar 3, Polestar 4
  * **Volvo EX-Serie:** EX30, EX40 (ehemals XC40 Recharge), EX90
  * **Volvo XC-Serie:** XC60 (ab MJ 2022), XC90 (ab MJ 2023)
  * **Volvo S/V-Serie:** S60, V60, S90, V90 (ab MJ 2023)

## 3. Mercedes-Benz
* **Plattform:** MBUX (Neuere Generationen ab 2023 / MB.OS-Vorläufer)
* **Browser-Verfügbarkeit:** Vivaldi Browser nativ im App-Store integriert.
* **Unterstützte Modelle:**
  * E-Klasse (W214) – inklusive MBUX Superscreen
  * CLE Coupé / Cabriolet (C236)
  * S-Klasse (W223) – mit aktuellem Software-Update
  * EQE & EQS (Sowohl Limousinen als auch SUVs, inklusive Hyperscreen)

## 4. Renault
* **Plattform:** OpenR Link (Android Automotive OS)
* **Browser-Verfügbarkeit:** Vivaldi Browser über den OpenR Link Store installierbar.
* **Unterstützte Modelle:**
  * Megane E-Tech Electric
  * Scenic E-Tech Electric
  * Austral
  * Rafale
  * Espace (Aktuelle Generation)

## 5. Volkswagen & Audi (Konzern-Plattformen)
* **Plattform:** ID. Software 4.0+ / Premium Platform Electric (PPE) Android-Basis
* **Browser-Verfügbarkeit:** Web-App-Kompatibilität & nativer Konzern-App-Store (mit Vivaldi/Chrome).
* **Unterstützte Modelle:**
  * Volkswagen ID.7
  * Audi Q6 e-tron
  * Porsche Macan Electric

---

## Technische Rahmenbedingungen für die Witcar-Integration
1. **Engine-Basis:** Nahezu alle modernen Fahrzeugbrowser setzen auf **Chromium**. JS-Frameworks (React, Vue, etc.) laufen in der Regel problemlos.
2. **Sicherheitsrestriktionen:** Die Browser sperren die Anzeige oder frieren die Ausführung ein, sobald das Fahrzeug anfährt (Verlassen von Gangstellung P). Die App muss stabil mit unerwarteten "Pauses/Freezes" umgehen können.
3. **Responsive Design:** Optimierung für typische Automotive-Displays erforderlich.
   * *Querformat:* Tesla (15-17 Zoll), VW ID.7 (15 Zoll)
   * *Hochformat:* Volvo/Polestar (11-12 Zoll), Renault OpenR Link
   * *Breitbild / Multi-Display:* Mercedes Hyperscreen / Superscreen
