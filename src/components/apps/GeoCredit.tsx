/** Attribution that the place search data requires, shown next to search results. */
export function GeoCredit({ source }: { source: string | null }) {
  if (source === "nominatim") {
    // Nominatim results are OpenStreetMap data (ODbL)
    return (
      <p className="text-dim text-xs">
        Ortssuche: Daten ©{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          OpenStreetMap-Mitwirkende
        </a>{" "}
        (ODbL)
      </p>
    );
  }
  if (source === "open-meteo-geo") {
    // Open-Meteo geocoding data comes from GeoNames (CC BY 4.0)
    return (
      <p className="text-dim text-xs">
        Ortssuche:{" "}
        <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="underline">
          Open-Meteo.com
        </a>
        , Ortsdaten:{" "}
        <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer" className="underline">
          GeoNames
        </a>{" "}
        (
        <a
          href="https://creativecommons.org/licenses/by/4.0/deed.de"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          CC BY 4.0
        </a>
        )
      </p>
    );
  }
  return null;
}
