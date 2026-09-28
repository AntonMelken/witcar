import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WitCar – Dein Überblick im Auto-Browser",
    short_name: "WitCar",
    description: "Anpassbares Widget-Dashboard für den Browser deines Fahrzeugs.",
    start_url: "/dashboard",
    scope: "/",
    display: "fullscreen",
    orientation: "landscape",
    background_color: "#0f1114",
    theme_color: "#0f1114",
    lang: "de",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
