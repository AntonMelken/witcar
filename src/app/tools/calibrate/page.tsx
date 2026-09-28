import type { Metadata } from "next";
import { Calibrate } from "@/components/tools/Calibrate";

export const metadata: Metadata = { title: "Kalibrierung (G1)", robots: { index: false } };

/** Gate G1: viewport sizes, safe insets and background color per vehicle. */
export default function CalibratePage() {
  return <Calibrate />;
}
