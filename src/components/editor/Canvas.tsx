"use client";

/* dnd-kit hook results mix refs and props; the React Compiler ref rule reports false positives here. */
/* eslint-disable react-hooks/refs */

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
} from "@dnd-kit/core";
import { GripVertical, Lock, MoveDiagonal2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type CSSProperties } from "react";
import { clampPosition, GRID_COLS, GRID_ROWS, type Rect } from "@/lib/layout/grid";
import type { LayoutWidget } from "@/lib/layout/schema";
import { getWidgetMeta } from "@/widgets/registry";

interface CanvasProps {
  widgets: LayoutWidget[];
  aspect: number;
  selectedId: string | null;
  draggable: boolean;
  lockedIds: Set<string>;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => boolean;
  onResize: (id: string, w: number, h: number) => boolean;
}

function toCells(delta: { x: number; y: number }, el: HTMLElement | null) {
  if (!el) return { dx: 0, dy: 0 };
  const rect = el.getBoundingClientRect();
  return { dx: Math.round(delta.x / (rect.width / GRID_COLS)), dy: Math.round(delta.y / (rect.height / GRID_ROWS)) };
}

/** Editor canvas: preset-shaped 12x8 grid with touch-friendly drag & resize (dnd-kit). */
export function Canvas(props: CanvasProps) {
  const t = useTranslations("editor");
  const gridRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<(Rect & { ok: boolean }) | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const target = (e: DragMoveEvent | DragEndEvent) => {
    const [kind, id] = String(e.active.id).split(":") as ["move" | "resize", string];
    const w = props.widgets.find((x) => x.widgetId === id);
    if (!w) return null;
    const { dx, dy } = toCells(e.delta, gridRef.current);
    if (kind === "move") {
      const pos = clampPosition(w, w.x + dx, w.y + dy);
      return { kind, id, rect: { ...w, ...pos } };
    }
    const meta = getWidgetMeta(w.type);
    const nw = Math.max(meta?.minSize.w ?? 1, Math.min(GRID_COLS - w.x, w.w + dx));
    const nh = Math.max(meta?.minSize.h ?? 1, Math.min(GRID_ROWS - w.y, w.h + dy));
    return { kind, id, rect: { ...w, w: nw, h: nh } };
  };

  const onDragMove = (e: DragMoveEvent) => {
    const tgt = target(e);
    if (!tgt) return;
    const ok = props.widgets.every(
      (o) =>
        o.widgetId === tgt.id ||
        !(
          tgt.rect.x < o.x + o.w &&
          o.x < tgt.rect.x + tgt.rect.w &&
          tgt.rect.y < o.y + o.h &&
          o.y < tgt.rect.y + tgt.rect.h
        ),
    );
    setPreview({ x: tgt.rect.x, y: tgt.rect.y, w: tgt.rect.w, h: tgt.rect.h, ok });
  };

  const onDragEnd = (e: DragEndEvent) => {
    setPreview(null);
    const tgt = target(e);
    if (!tgt) return;
    if (tgt.kind === "move") props.onMove(tgt.id, tgt.rect.x, tgt.rect.y);
    else props.onResize(tgt.id, tgt.rect.w, tgt.rect.h);
  };

  return (
    <DndContext sensors={sensors} onDragMove={onDragMove} onDragEnd={onDragEnd} onDragCancel={() => setPreview(null)}>
      <div className="w-full mx-auto" style={{ maxWidth: `calc(62dvh * ${props.aspect})` }}>
        <div
          ref={gridRef}
          className="relative grid rounded-2xl border border-border bg-bg p-1.5 gap-1.5"
          style={{
            aspectRatio: String(props.aspect),
            gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${GRID_ROWS}, minmax(0, 1fr))`,
            backgroundImage:
              "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
            backgroundSize: `calc(100% / ${GRID_COLS}) calc(100% / ${GRID_ROWS})`,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) props.onSelect(null);
          }}
          data-testid="editor-canvas"
        >
          {props.widgets.map((w) => (
            <CanvasTile
              key={w.widgetId}
              widget={w}
              title={t(`types.${w.type}`)}
              selected={props.selectedId === w.widgetId}
              locked={props.lockedIds.has(w.widgetId)}
              draggable={props.draggable}
              onSelect={() => props.onSelect(w.widgetId)}
              moveLabel={t("dragMove")}
              resizeLabel={t("dragResize")}
            />
          ))}
          {preview ? (
            <div
              aria-hidden="true"
              className={`pointer-events-none rounded-xl border-2 border-dashed ${preview.ok ? "border-accent" : "border-negative"}`}
              style={{
                gridColumn: `${preview.x + 1} / span ${preview.w}`,
                gridRow: `${preview.y + 1} / span ${preview.h}`,
              }}
            />
          ) : null}
        </div>
      </div>
    </DndContext>
  );
}

function CanvasTile({
  widget,
  title,
  selected,
  locked,
  draggable,
  onSelect,
  moveLabel,
  resizeLabel,
}: {
  widget: LayoutWidget;
  title: string;
  selected: boolean;
  locked: boolean;
  draggable: boolean;
  onSelect: () => void;
  moveLabel: string;
  resizeLabel: string;
}) {
  const move = useDraggable({ id: `move:${widget.widgetId}`, disabled: !draggable });
  const resize = useDraggable({ id: `resize:${widget.widgetId}`, disabled: !draggable });
  const translate = move.transform ? `translate3d(${move.transform.x}px, ${move.transform.y}px, 0)` : undefined;
  const style: CSSProperties = {
    gridColumn: `${widget.x + 1} / span ${widget.w}`,
    gridRow: `${widget.y + 1} / span ${widget.h}`,
    transform: translate,
    zIndex: move.isDragging || resize.isDragging ? 10 : selected ? 5 : 1,
  };
  return (
    <div
      ref={move.setNodeRef}
      style={style}
      className={`relative min-w-0 min-h-0 rounded-xl border bg-surface overflow-hidden ${selected ? "border-accent border-2" : "border-border"} ${locked ? "opacity-50" : ""}`}
      data-editor-widget={widget.type}
      data-widget-id={widget.widgetId}
    >
      <button
        type="button"
        className="absolute inset-0 w-full h-full text-left p-2 flex flex-col"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={title}
      >
        <span className="text-xs sm:text-sm font-semibold truncate pr-8">{title}</span>
        <span className="text-[10px] sm:text-xs text-dim tabular">
          {widget.w}×{widget.h}
        </span>
        {locked ? <Lock size={14} className="text-dim mt-auto" aria-hidden="true" /> : null}
      </button>
      {draggable ? (
        <>
          <span
            {...move.listeners}
            {...move.attributes}
            aria-label={moveLabel}
            className="absolute top-0 right-0 size-14 flex items-start justify-end p-1.5 text-dim touch-none cursor-grab"
            data-handle="move"
          >
            <GripVertical size={18} />
          </span>
          <span
            ref={resize.setNodeRef}
            {...resize.listeners}
            {...resize.attributes}
            aria-label={resizeLabel}
            className="absolute bottom-0 right-0 size-14 flex items-end justify-end p-1.5 text-dim touch-none cursor-se-resize"
            data-handle="resize"
          >
            <MoveDiagonal2 size={18} />
          </span>
        </>
      ) : null}
    </div>
  );
}
