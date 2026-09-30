"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useT } from "@/i18n/lite";
import { formatTime } from "@/lib/client/format";
import type { SaveState } from "@/widgets/types";
import { Icon } from "./icons";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Full-screen frame of a widget app: title, refresh, close. Keeps focus inside
 * while open, closes with Escape and gives the focus back to the widget.
 */
export function AppShell({
  title,
  onClose,
  onRefresh,
  refreshing,
  updatedAt,
  failed,
  saveState,
  children,
}: {
  title: string;
  onClose: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  updatedAt: number | null;
  failed: boolean;
  saveState: SaveState;
  children: ReactNode;
}) {
  const t = useT("dashboard");
  const root = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    root.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !root.current) return;
      const items = [...root.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && (document.activeElement === first || document.activeElement === root.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  const status =
    saveState === "error"
      ? { text: t("saveError"), cls: "text-negative" }
      : saveState === "saving"
        ? { text: t("saving"), cls: "text-dim" }
        : saveState === "saved"
          ? { text: t("saved"), cls: "text-dim" }
          : null;

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabIndex={-1}
      className="wc-app fixed inset-0 z-50 flex flex-col bg-bg text-text outline-none"
      data-app-open
    >
      <header className="flex items-center gap-2 border-b border-border px-3 py-2 sm:px-5">
        <h2 className="flex-1 truncate text-xl font-semibold">{title}</h2>
        <span className="hidden min-w-0 items-center gap-3 text-sm sm:flex" aria-live="polite">
          {status ? <span className={status.cls}>{status.text}</span> : null}
          {failed ? (
            <span className="text-warning">{t("refreshFailed")}</span>
          ) : updatedAt ? (
            <span className="tabular text-dim">
              {t("updatedAt", { time: formatTime(new Date(updatedAt), { seconds: false }) })}
            </span>
          ) : null}
        </span>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label={t("refresh")}
          title={t("refresh")}
          data-testid="app-refresh"
        >
          <span className={refreshing ? "wc-spin inline-flex" : "inline-flex"}>
            <Icon name="refresh" />
          </span>
        </button>
        <button type="button" className="btn" onClick={onClose} aria-label={t("closeApp")} data-testid="app-close">
          <Icon name="close" />
          <span className="hidden sm:inline">{t("closeApp")}</span>
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl p-3 sm:p-5">{children}</div>
      </div>
      {status && saveState === "error" ? (
        <p role="alert" className="border-t border-border px-4 py-2 text-sm text-negative sm:hidden">
          {status.text}
        </p>
      ) : null}
    </div>
  );
}
