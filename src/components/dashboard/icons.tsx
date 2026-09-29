import type { CSSProperties } from "react";

/**
 * Tiny stroke icon set for the dashboard/drive bundle (§17 budget).
 * Editor and marketing pages use lucide-react.
 * Some paths (sun, gauge, reset) are adapted from Lucide, ISC License,
 * Copyright (c) Lucide Icons and Contributors; credited on /lizenzen.
 */
const CLOUD = "M6.5 18a4.5 4.5 0 0 1-.4-8.98A6 6 0 0 1 17.6 8.1 5 5 0 0 1 17.5 18z";
const CLOUD_HIGH = "M6.5 14a4.5 4.5 0 0 1-.4-8.98A6 6 0 0 1 17.6 4.1 5 5 0 0 1 17.5 14z";

const PATHS = {
  sun: [
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
    "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  ],
  moon: ["M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"],
  cloud: [CLOUD],
  cloudSun: [
    "M8 2.5V4M3 7.5h1.5M4.5 4l1 1",
    "M5.3 11A3.8 3.8 0 0 1 11 5.6",
    "M9 21a3.8 3.8 0 0 1-.3-7.6A5 5 0 0 1 18.3 12a4.5 4.5 0 0 1 .2 9z",
  ],
  rain: [CLOUD_HIGH, "M8 17l-1 3M12 17l-1 3M16 17l-1 3"],
  drizzle: [CLOUD_HIGH, "M8 18v1M12 19v1M16 18v1"],
  snow: [CLOUD_HIGH, "M8 18h.01M12 20h.01M16 18h.01M8 21h.01M16 21h.01"],
  fog: [CLOUD_HIGH, "M4 18h16M6 21h12"],
  storm: [CLOUD_HIGH, "M13 14l-3 4h4l-3 4"],
  lock: ["M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z", "M8 11V7a4 4 0 0 1 8 0v4"],
  play: ["M7 4l13 8-13 8z"],
  pause: ["M8 5v14M16 5v14"],
  reset: ["M3 12a9 9 0 1 0 2.6-6.4L3 8", "M3 3v5h5"],
  pencil: ["M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"],
  gauge: ["M12 14l4-4", "M3.3 19a10 10 0 1 1 17.4 0"],
  settings: ["M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1", "M15 4v4M9 10v4M17 16v4"],
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, style }: { name: IconName; size?: number | string; style?: CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
