"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Gauge,
  LayoutDashboard,
  Minus,
  Plus,
  Redo2,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  arrangeForDrive,
  clampPosition,
  DRIVE_MAX_WIDGETS,
  findFreeSpot,
  moveItem,
  resizeItem,
} from "@/lib/layout/grid";
import { applyPlanForDisplay, newWidgetId, type LayoutWidget } from "@/lib/layout/schema";
import { PLAN_LIMITS, type Plan } from "@/lib/plan";
import { getPreset, PRESETS } from "@/lib/presets";
import { ACTIVE_WIDGET_TYPES, getWidgetMeta } from "@/widgets/registry";
import type { DashboardMode } from "@/widgets/types";
import { Canvas } from "./Canvas";
import { ConfigForm } from "./ConfigForm";
import { createHistory, push, redo, replace, undo, type History } from "./history";

export interface EditorLayoutSummary {
  id: string;
  name: string;
  mode: DashboardMode;
  isDefault: boolean;
  editable: boolean;
}

export interface EditorProps {
  plan: Plan;
  mode: DashboardMode;
  layoutId: string | null;
  initial: { name: string; preset: string; widgets: LayoutWidget[] };
  editable: boolean;
  layouts: EditorLayoutSummary[];
}

interface Doc {
  name: string;
  preset: string;
  widgets: LayoutWidget[];
}

type SaveState = { kind: "saved" } | { kind: "dirty" } | { kind: "saving" } | { kind: "error"; code: string };

const AUTOSAVE_MS = 800;

async function api<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { code: string } };
  if (!res.ok) throw new Error(data.error?.code ?? `http_${res.status}`);
  return data;
}

/** Layout editor: drag & drop, autosave (debounced), undo/redo, optimistic UI with rollback (§10.3). */
export function Editor(props: EditorProps) {
  const t = useTranslations("editor");
  const tw = useTranslations("widgets");
  const tp = useTranslations("presets");
  const limits = PLAN_LIMITS[props.plan];
  const isDrive = props.mode === "drive";
  const readOnly = !props.editable;
  const router = useRouter();

  const [history, setHistory] = useState<History<Doc>>(() => createHistory(props.initial));
  const [saved, setSaved] = useState<Doc>(props.initial);
  const [layoutId, setLayoutId] = useState(props.layoutId);
  const [status, setStatus] = useState<SaveState>({ kind: "saved" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const doc = history.present;

  const maxWidgets = isDrive ? Math.min(DRIVE_MAX_WIDGETS, limits.widgetsPerLayout) : limits.widgetsPerLayout;
  const lockedIds = useMemo(
    () =>
      new Set(
        applyPlanForDisplay(doc.widgets, props.plan, props.mode)
          .filter((w) => w.locked)
          .map((w) => w.widgetId),
      ),
    [doc.widgets, props.plan, props.mode],
  );
  const shown = useMemo(() => (isDrive ? arrangeForDrive(doc.widgets) : doc.widgets), [doc.widgets, isDrive]);
  const selected = doc.widgets.find((w) => w.widgetId === selectedId) ?? null;

  const commit = useCallback((next: Doc, coalesceKey: string | null = null) => {
    setHistory((h) => push(h, next, coalesceKey));
    setStatus({ kind: "dirty" });
  }, []);

  // ---- persistence -------------------------------------------------------
  const saving = useRef(false);
  const latest = useRef(history.present);
  useEffect(() => {
    latest.current = history.present;
  }, [history.present]);
  const save = useCallback(async () => {
    if (readOnly || saving.current) return;
    const current = history.present;
    if (current === saved) return setStatus({ kind: "saved" });
    saving.current = true;
    setStatus({ kind: "saving" });
    try {
      const payload = { name: current.name, preset: current.preset, widgets: current.widgets };
      if (layoutId) {
        await api(`/api/layouts/${layoutId}`, "PUT", payload);
      } else {
        const res = await api<{ layout: { id: string } }>("/api/layouts", "POST", {
          ...payload,
          mode: props.mode,
          makeDefault: true,
        });
        setLayoutId(res.layout.id);
      }
      setSaved(current);
      // edits made while the request was in flight still need saving
      setStatus(latest.current === current ? { kind: "saved" } : { kind: "dirty" });
    } catch (e) {
      // optimistic UI: roll back to the last saved state
      setHistory((h) => replace(h, saved));
      setStatus({ kind: "error", code: (e as Error).message });
    } finally {
      saving.current = false;
    }
  }, [history.present, saved, layoutId, props.mode, readOnly]);

  useEffect(() => {
    if (status.kind !== "dirty") return;
    const id = setTimeout(() => void save(), AUTOSAVE_MS);
    return () => clearTimeout(id);
  }, [status, history.present, save]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || readOnly) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.key.toLowerCase() === "z") {
        e.preventDefault();
        setHistory((h) => (e.shiftKey ? redo(h) : undo(h)));
        setStatus({ kind: "dirty" });
      } else if (e.key.toLowerCase() === "y") {
        e.preventDefault();
        setHistory((h) => redo(h));
        setStatus({ kind: "dirty" });
      }
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      if (status.kind === "dirty" || status.kind === "saving") e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [readOnly, status.kind]);

  // ---- widget operations -------------------------------------------------
  const setWidgets = (widgets: LayoutWidget[], key: string | null = null) => commit({ ...doc, widgets }, key);

  const addWidget = (type: string) => {
    const meta = getWidgetMeta(type);
    if (!meta) return;
    let spot: { x: number; y: number } | null = { x: 0, y: 0 };
    let size = meta.defaultSize;
    if (!isDrive) {
      spot = findFreeSpot(doc.widgets, size.w, size.h);
      if (!spot) {
        size = meta.minSize;
        spot = findFreeSpot(doc.widgets, size.w, size.h);
      }
      if (!spot) return setNotice(t("noSpace"));
    }
    const widget: LayoutWidget = {
      widgetId: newWidgetId(type),
      type: type as LayoutWidget["type"],
      ...spot,
      ...size,
      config: structuredClone(meta.defaultConfig) as Record<string, unknown>,
    };
    setWidgets([...doc.widgets, widget]);
    setSelectedId(widget.widgetId);
    setNotice(null);
  };

  const onMove = (id: string, x: number, y: number) => {
    const next = moveItem(doc.widgets, id, x, y);
    if (!next) {
      setNotice(t("collision"));
      return false;
    }
    setWidgets(next);
    setNotice(null);
    return true;
  };

  const onResize = (id: string, w: number, h: number) => {
    const meta = getWidgetMeta(doc.widgets.find((x) => x.widgetId === id)?.type ?? "");
    const next = resizeItem(doc.widgets, id, w, h, meta?.minSize);
    if (!next) {
      setNotice(t("collision"));
      return false;
    }
    setWidgets(next);
    setNotice(null);
    return true;
  };

  const nudge = (dx: number, dy: number) => {
    if (!selected) return;
    const pos = clampPosition(selected, selected.x + dx, selected.y + dy);
    onMove(selected.widgetId, pos.x, pos.y);
  };

  const reorder = (delta: -1 | 1) => {
    if (!selected) return;
    const i = doc.widgets.findIndex((w) => w.widgetId === selected.widgetId);
    const j = i + delta;
    if (j < 0 || j >= doc.widgets.length) return;
    const next = [...doc.widgets];
    [next[i], next[j]] = [next[j]!, next[i]!];
    setWidgets(next);
  };

  const remove = () => {
    if (!selected) return;
    setWidgets(doc.widgets.filter((w) => w.widgetId !== selected.widgetId));
    setSelectedId(null);
  };

  const updateConfig = (key: string, value: unknown, coalesce?: boolean) => {
    if (!selected) return;
    setWidgets(
      doc.widgets.map((w) => (w.widgetId === selected.widgetId ? { ...w, config: { ...w.config, [key]: value } } : w)),
      coalesce ? `cfg:${selected.widgetId}:${key}` : null,
    );
  };

  // ---- layout operations (standard mode) --------------------------------
  const standardLayouts = props.layouts.filter((l) => l.mode === "standard");
  const canCreateLayout = standardLayouts.length < limits.standardLayouts;

  const createLayout = async () => {
    try {
      const res = await api<{ layout: { id: string } }>("/api/layouts", "POST", {
        name: t("newLayoutName", { n: standardLayouts.length + 1 }),
        preset: doc.preset,
        mode: "standard",
        widgets: [],
      });
      router.push(`/editor?layout=${res.layout.id}`);
    } catch (e) {
      setNotice(t(`errors.${errorKey((e as Error).message)}`));
    }
  };

  const duplicate = async () => {
    if (!layoutId) return;
    try {
      const res = await api<{ layout: { id: string } }>(`/api/layouts/${layoutId}/duplicate`, "POST", {
        name: `${doc.name} (2)`.slice(0, 60),
      });
      router.push(`/editor?layout=${res.layout.id}`);
    } catch (e) {
      setNotice(t(`errors.${errorKey((e as Error).message)}`));
    }
  };

  const deleteLayout = async () => {
    if (!layoutId || !window.confirm(t("confirmDelete"))) return;
    try {
      await api(`/api/layouts/${layoutId}`, "DELETE");
      router.push("/editor");
      router.refresh();
    } catch (e) {
      setNotice(t(`errors.${errorKey((e as Error).message)}`));
    }
  };

  const makeDefault = async () => {
    if (!layoutId) return;
    try {
      await api(`/api/layouts/${layoutId}/default`, "POST");
      setNotice(t("defaultSet"));
    } catch (e) {
      setNotice(t(`errors.${errorKey((e as Error).message)}`));
    }
  };

  const preset = getPreset(doc.preset);
  const selectedMeta = selected ? getWidgetMeta(selected.type) : null;
  const statusText = status.kind === "error" ? t(`errors.${errorKey(status.code)}`) : t(`status.${status.kind}`);

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-border px-3 py-2 flex flex-wrap items-center gap-2">
        <Link href="/dashboard" className="btn btn-ghost" aria-label={t("toDashboard")} title={t("toDashboard")}>
          <LayoutDashboard size={20} />
        </Link>
        <select
          className="input w-auto max-w-56"
          aria-label={t("layout")}
          value={isDrive ? "drive" : (layoutId ?? "")}
          onChange={(e) => {
            const v = e.target.value;
            router.push(v === "drive" ? "/editor?mode=drive" : `/editor?layout=${v}`);
          }}
        >
          {standardLayouts.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
              {l.isDefault ? " ★" : ""}
              {!l.editable ? ` (${t("readOnlyShort")})` : ""}
            </option>
          ))}
          <option value="drive">{t("driveLayout")}</option>
        </select>
        <div className="flex gap-1">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setHistory(undo);
              setStatus({ kind: "dirty" });
            }}
            disabled={readOnly || history.past.length === 0}
            aria-label={t("undo")}
            title={t("undo")}
          >
            <Undo2 size={20} />
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setHistory(redo);
              setStatus({ kind: "dirty" });
            }}
            disabled={readOnly || history.future.length === 0}
            aria-label={t("redo")}
            title={t("redo")}
          >
            <Redo2 size={20} />
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => void save()}
            disabled={readOnly || status.kind === "saving"}
            data-testid="save"
          >
            <Save size={18} />
            <span className="hidden sm:inline">{t("save")}</span>
          </button>
        </div>
        <span
          className={`text-sm ${status.kind === "error" ? "text-negative" : "text-dim"}`}
          role="status"
          data-save-status={status.kind}
        >
          {statusText}
        </span>
        <div className="ml-auto flex gap-2">
          <a href="/dashboard?mode=drive" className="btn" title={t("startDrive")}>
            <Gauge size={18} />
            <span className="hidden sm:inline">{t("startDrive")}</span>
          </a>
        </div>
      </header>

      {readOnly ? (
        <p className="m-3 rounded-xl border border-warning/60 bg-warning/10 p-3 text-sm text-warning">
          {t("readOnly")}
        </p>
      ) : null}
      {notice ? (
        <p className="mx-3 mt-3 rounded-xl border border-border bg-surface-2 p-3 text-sm" role="alert">
          {notice}
        </p>
      ) : null}

      <div className="flex-1 grid gap-4 p-3 lg:grid-cols-[1fr_22rem]">
        <section className="space-y-3 min-w-0">
          {!isDrive ? (
            <div className="flex flex-wrap gap-2 items-center">
              <input
                className="input max-w-64"
                aria-label={t("layoutName")}
                value={doc.name}
                maxLength={60}
                disabled={readOnly}
                onChange={(e) => commit({ ...doc, name: e.target.value || doc.name }, "name")}
              />
              <select
                className="input w-auto"
                aria-label={t("preset")}
                value={doc.preset}
                disabled={readOnly}
                onChange={(e) => commit({ ...doc, preset: e.target.value })}
              >
                {PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {tp(`${p.label}.name`)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-sm text-dim">{t("driveIntro", { max: maxWidgets })}</p>
          )}
          <Canvas
            widgets={shown}
            aspect={preset.aspect}
            selectedId={selectedId}
            draggable={!readOnly && !isDrive}
            lockedIds={lockedIds}
            onSelect={setSelectedId}
            onMove={onMove}
            onResize={onResize}
          />
          {!isDrive ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn"
                onClick={() => void createLayout()}
                disabled={!canCreateLayout}
                title={!canCreateLayout ? t("proLayouts") : undefined}
              >
                <Plus size={18} />
                {t("newLayout")}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => void duplicate()}
                disabled={!layoutId || !canCreateLayout}
              >
                {t("duplicate")}
              </button>
              <button type="button" className="btn" onClick={() => void makeDefault()} disabled={!layoutId}>
                {t("makeDefault")}
              </button>
              <button type="button" className="btn btn-danger" onClick={() => void deleteLayout()} disabled={!layoutId}>
                {t("deleteLayout")}
              </button>
              {!canCreateLayout && props.plan === "free" ? (
                <Link href="/pricing" className="btn btn-ghost text-accent">
                  {t("proLayouts")}
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <div className="card p-4 space-y-3">
            <h2 className="font-semibold">
              {t("addWidget")}{" "}
              <span className="text-dim text-sm tabular">
                ({doc.widgets.length}/{maxWidgets})
              </span>
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {ACTIVE_WIDGET_TYPES.map((type) => {
                const meta = getWidgetMeta(type)!;
                const proBlocked = meta.proOnly && !limits.proWidgets;
                const disabled =
                  readOnly || proBlocked || doc.widgets.length >= maxWidgets || (isDrive && !meta.driveSafe);
                return (
                  <button
                    key={type}
                    type="button"
                    className="btn justify-start"
                    disabled={disabled}
                    onClick={() => addWidget(type)}
                    data-add-widget={type}
                  >
                    <Plus size={16} aria-hidden="true" />
                    <span className="truncate">{tw(`${type}.title`)}</span>
                    {proBlocked ? <span className="text-xs text-accent ml-auto">Pro</span> : null}
                  </button>
                );
              })}
            </div>
            {doc.widgets.length >= maxWidgets && props.plan === "free" ? (
              <p className="text-sm text-dim">
                {t("limitReached", { max: maxWidgets })}{" "}
                <Link href="/pricing" className="text-accent underline">
                  {t("upgrade")}
                </Link>
              </p>
            ) : null}
          </div>

          {selected && selectedMeta ? (
            <div className="card p-4 space-y-4" data-testid="widget-panel">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">{tw(`${selected.type}.title`)}</h2>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={remove}
                  disabled={readOnly}
                  aria-label={t("removeWidget")}
                >
                  <Trash2 size={18} />
                </button>
              </div>
              {!isDrive ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs text-dim">{t("size")}</span>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        className="btn"
                        aria-label={t("narrower")}
                        disabled={readOnly}
                        onClick={() => onResize(selected.widgetId, selected.w - 1, selected.h)}
                      >
                        <Minus size={16} />W
                      </button>
                      <button
                        type="button"
                        className="btn"
                        aria-label={t("wider")}
                        disabled={readOnly}
                        onClick={() => onResize(selected.widgetId, selected.w + 1, selected.h)}
                      >
                        <Plus size={16} />W
                      </button>
                      <button
                        type="button"
                        className="btn"
                        aria-label={t("shorter")}
                        disabled={readOnly}
                        onClick={() => onResize(selected.widgetId, selected.w, selected.h - 1)}
                      >
                        <Minus size={16} />H
                      </button>
                      <button
                        type="button"
                        className="btn"
                        aria-label={t("taller")}
                        disabled={readOnly}
                        onClick={() => onResize(selected.widgetId, selected.w, selected.h + 1)}
                      >
                        <Plus size={16} />H
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-dim">{t("position")}</span>
                    <div className="grid grid-cols-3 gap-1 w-fit">
                      <span />
                      <button
                        type="button"
                        className="btn"
                        aria-label={t("up")}
                        disabled={readOnly}
                        onClick={() => nudge(0, -1)}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <span />
                      <button
                        type="button"
                        className="btn"
                        aria-label={t("left")}
                        disabled={readOnly}
                        onClick={() => nudge(-1, 0)}
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn"
                        aria-label={t("down")}
                        disabled={readOnly}
                        onClick={() => nudge(0, 1)}
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn"
                        aria-label={t("right")}
                        disabled={readOnly}
                        onClick={() => nudge(1, 0)}
                      >
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => reorder(-1)}
                    disabled={readOnly}
                    aria-label={t("earlier")}
                  >
                    <ArrowLeft size={16} />
                    {t("earlier")}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => reorder(1)}
                    disabled={readOnly}
                    aria-label={t("later")}
                  >
                    {t("later")}
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
              {selectedMeta.fields.length > 0 ? (
                <ConfigForm
                  fields={selectedMeta.fields}
                  config={selected.config}
                  onChange={updateConfig}
                  maxListItems={limits.tickersPerWidget}
                  disabled={readOnly}
                />
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-dim px-1">{t("selectHint")}</p>
          )}
        </aside>
      </div>
    </div>
  );
}

const KNOWN_ERRORS = new Set([
  "overlap",
  "too_many_widgets",
  "pro_widget",
  "too_many_tickers",
  "invalid_config",
  "layout_limit",
  "read_only",
  "not_found",
  "too_small",
  "out_of_bounds",
  "rate_limited",
  "unauthorized",
]);

function errorKey(code: string): string {
  return KNOWN_ERRORS.has(code) ? code : "generic";
}
