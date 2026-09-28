import { GRID_COLS, GRID_ROWS } from "@/lib/layout/grid";

/**
 * Vehicle layout presets (masterplan §10.2). Presets are data, not code paths.
 * All viewport/inset values are ESTIMATES until gate G1 measures them with
 * /tools/calibrate (D-011). Labels are neutral: no brand or model names.
 */
export interface VehiclePreset {
  id: string;
  /** i18n key below `presets.<id>` */
  label: string;
  aspect: number;
  refViewport: { w: number; h: number };
  safeInsets: { top: number; right: number; bottom: number; left: number };
  gridCols: number;
  gridRows: number;
  /** true until measured in G1 */
  estimated: boolean;
}

const noInsets = { top: 0, right: 0, bottom: 0, left: 0 };

export const PRESETS: readonly VehiclePreset[] = [
  {
    id: "model-3-y",
    label: "compact",
    refViewport: { w: 1920, h: 1200 },
    aspect: 1920 / 1200,
    safeInsets: noInsets,
    gridCols: GRID_COLS,
    gridRows: GRID_ROWS,
    estimated: true,
  },
  {
    id: "model-s-x",
    label: "wide",
    refViewport: { w: 2200, h: 1300 },
    aspect: 2200 / 1300,
    safeInsets: noInsets,
    gridCols: GRID_COLS,
    gridRows: GRID_ROWS,
    estimated: true,
  },
  {
    id: "cybertruck",
    label: "ultrawide",
    refViewport: { w: 2448, h: 1080 },
    aspect: 2448 / 1080,
    safeInsets: noInsets,
    gridCols: GRID_COLS,
    gridRows: GRID_ROWS,
    estimated: true,
  },
  {
    id: "generic-landscape",
    label: "generic",
    refViewport: { w: 1280, h: 800 },
    aspect: 1280 / 800,
    safeInsets: noInsets,
    gridCols: GRID_COLS,
    gridRows: GRID_ROWS,
    estimated: true,
  },
];

export const DEFAULT_PRESET_ID = "generic-landscape";

export const PRESET_IDS = PRESETS.map((p) => p.id) as [string, ...string[]];

export function getPreset(id: string | null | undefined): VehiclePreset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS.find((p) => p.id === DEFAULT_PRESET_ID)!;
}

export function isPresetId(id: string): boolean {
  return PRESETS.some((p) => p.id === id);
}
