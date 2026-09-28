import type { Metadata } from "next";
import { DriveTest } from "@/components/tools/DriveTest";

export const metadata: Metadata = { title: "Drive-Test (G0)", robots: { index: false } };

/** Gate G0: does a page stay visible and keep updating while driving? */
export default function DriveTestPage() {
  return <DriveTest />;
}
