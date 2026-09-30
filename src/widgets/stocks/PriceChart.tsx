"use client";

import { useState, type PointerEvent } from "react";
import { formatPrice } from "@/lib/client/format";
import { areaPath, indexAt, linePath, paddedRange, sma, smaWindow, timeLabel } from "./chartMath";
import type { StockHistory } from "./definition";

const W = 600;
const H = 240;

/**
 * Price line as inline SVG (no chart library): area under the line, optional
 * moving average, and a crosshair that follows finger/mouse and shows value + time.
 */
export function PriceChart({
  history,
  showAverage,
  label,
  averageLabel,
}: {
  history: StockHistory;
  showAverage: boolean;
  label: string;
  averageLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const pts = history.points;
  const closes = pts.map((p) => p.c);
  const avg = showAverage ? sma(closes, smaWindow(closes.length)) : [];
  const range = paddedRange(showAverage ? [...closes, ...avg.filter((v): v is number => v != null)] : closes);
  const up = closes.length < 2 || closes[closes.length - 1]! >= closes[0]!;
  const color = up ? "var(--positive)" : "var(--negative)";
  const fmt = (v: number) => formatPrice(v, history.currency);
  const active = hover ?? closes.length - 1;
  const point = pts[active];

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    setHover(indexAt((e.clientX - box.left) / box.width, pts.length));
  };

  const x = pts.length > 1 ? (active / (pts.length - 1)) * 100 : 50;
  const y = point ? ((range.max - point.c) / (range.max - range.min || 1)) * 100 : 0;

  return (
    <div className="space-y-1" data-testid="price-chart">
      <div className="flex min-h-6 items-baseline justify-between gap-3 text-sm tabular">
        <span className="font-semibold">{point ? fmt(point.c) : ""}</span>
        <span className="text-dim">{point ? timeLabel(point.t, history.range, true) : ""}</span>
      </div>
      <div
        className="relative touch-pan-y select-none"
        role="img"
        aria-label={label}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
        onPointerCancel={() => setHover(null)}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="block h-56 w-full sm:h-64"
          aria-hidden="true"
        >
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1="0"
              x2={W}
              y1={H * f}
              y2={H * f}
              stroke="var(--border)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path d={areaPath(closes, W, H, range)} fill={color} opacity="0.12" />
          {showAverage ? (
            <path
              d={linePath(avg, W, H, range)}
              fill="none"
              stroke="var(--text-dim)"
              strokeWidth="2"
              strokeDasharray="6 5"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          <path
            d={linePath(closes, W, H, range)}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span className="pointer-events-none absolute top-1 left-1 text-xs tabular text-dim">{fmt(range.max)}</span>
        <span className="pointer-events-none absolute bottom-1 left-1 text-xs tabular text-dim">{fmt(range.min)}</span>
        {point ? (
          <>
            <span
              className="pointer-events-none absolute top-0 bottom-0 w-px bg-text/40"
              style={{ left: `${x}%` }}
              aria-hidden="true"
            />
            <span
              className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg"
              style={{ left: `${x}%`, top: `${y}%`, background: color }}
              aria-hidden="true"
            />
          </>
        ) : null}
      </div>
      <div className="flex justify-between text-xs tabular text-dim">
        <span>{pts[0] ? timeLabel(pts[0].t, history.range) : ""}</span>
        {showAverage ? <span>--- {averageLabel}</span> : null}
        <span>{pts.length ? timeLabel(pts[pts.length - 1]!.t, history.range) : ""}</span>
      </div>
    </div>
  );
}
