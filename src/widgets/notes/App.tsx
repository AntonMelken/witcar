"use client";

import { Pin, PinOff, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Section } from "@/components/apps/ui";
import { useT } from "@/i18n/lite";
import type { AppProps } from "../types";
import { NOTE_TEXT_MAX, NOTE_TITLE_MAX, NOTES_MAX, type Note, type NotesConfig } from "./definition";

const newId = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const heading = (n: Note, fallback: string) =>
  n.title ||
  n.text
    .split("\n")
    .find((l) => l.trim())
    ?.slice(0, NOTE_TITLE_MAX) ||
  fallback;

export default function NotesApp({ config, setConfig }: AppProps<NotesConfig>) {
  const t = useT("widgets.notes");
  const [editingId, setEditingId] = useState<string | null>(config.activeId ?? config.notes[0]?.id ?? null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editing = config.notes.find((n) => n.id === editingId) ?? config.notes[0] ?? null;
  const full = config.notes.length >= NOTES_MAX;

  const update = (id: string, patch: Partial<Note>) =>
    setConfig({ ...config, notes: config.notes.map((n) => (n.id === id ? { ...n, ...patch } : n)) });

  const create = () => {
    if (full) return;
    const note: Note = { id: newId(), title: "", text: "" };
    setConfig({ ...config, notes: [...config.notes, note], activeId: config.activeId ?? note.id });
    setEditingId(note.id);
    setConfirmDelete(false);
  };

  const remove = (id: string) => {
    const rest = config.notes.filter((n) => n.id !== id);
    setConfig({ ...config, notes: rest, activeId: config.activeId === id ? (rest[0]?.id ?? null) : config.activeId });
    setEditingId(rest[0]?.id ?? null);
    setConfirmDelete(false);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <Section
        title={t("app.list")}
        hint={t("app.count", { count: config.notes.length, max: NOTES_MAX })}
        actions={
          <button type="button" className="btn btn-primary" onClick={create} disabled={full} data-testid="note-new">
            <Plus size={18} aria-hidden="true" />
            {t("app.new")}
          </button>
        }
      >
        {config.notes.length === 0 ? <p className="text-dim">{t("app.none")}</p> : null}
        <ul className="space-y-2" data-testid="note-list">
          {config.notes.map((n) => {
            const selected = editing?.id === n.id;
            const active = config.activeId === n.id;
            return (
              <li
                key={n.id}
                className={`flex items-stretch rounded-xl border ${selected ? "border-accent bg-surface-2" : "border-border"}`}
              >
                <button
                  type="button"
                  className="min-h-14 min-w-0 flex-1 px-3 py-2 text-left"
                  aria-pressed={selected}
                  onClick={() => {
                    setEditingId(n.id);
                    setConfirmDelete(false);
                  }}
                >
                  <span className="block truncate font-semibold">{heading(n, t("app.untitled"))}</span>
                  <span className="block truncate text-sm text-dim">{n.text.replace(/\s+/g, " ") || t("empty")}</span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost self-center border-transparent"
                  aria-pressed={active}
                  aria-label={active ? t("app.isShown") : t("app.show", { name: heading(n, t("app.untitled")) })}
                  title={active ? t("app.isShown") : t("app.showShort")}
                  onClick={() => setConfig({ ...config, activeId: n.id })}
                >
                  {active ? <Pin size={18} aria-hidden="true" /> : <PinOff size={18} aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title={editing ? heading(editing, t("app.untitled")) : t("app.editor")}>
        {editing ? (
          <>
            <label className="block space-y-1">
              <span className="text-sm font-medium">{t("app.titleLabel")}</span>
              <input
                className="input"
                maxLength={NOTE_TITLE_MAX}
                value={editing.title}
                onChange={(e) => update(editing.id, { title: e.target.value })}
                data-testid="note-title"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">{t("app.textLabel")}</span>
              <textarea
                className="input min-h-56"
                maxLength={NOTE_TEXT_MAX}
                value={editing.text}
                onChange={(e) => update(editing.id, { text: e.target.value })}
                data-testid="note-text"
              />
              <span className="tabular text-xs text-dim">
                {editing.text.length}/{NOTE_TEXT_MAX}
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={`btn ${config.activeId === editing.id ? "btn-primary" : ""}`}
                aria-pressed={config.activeId === editing.id}
                onClick={() => setConfig({ ...config, activeId: editing.id })}
              >
                <Pin size={18} aria-hidden="true" />
                {config.activeId === editing.id ? t("app.isShown") : t("app.showInWidget")}
              </button>
              {confirmDelete ? (
                <span className="ml-auto flex items-center gap-2" role="alert">
                  <span className="text-sm">{t("app.confirmDelete")}</span>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => remove(editing.id)}
                    data-testid="note-delete-confirm"
                  >
                    {t("app.delete")}
                  </button>
                  <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>
                    {t("app.cancel")}
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="btn btn-danger ml-auto"
                  onClick={() => setConfirmDelete(true)}
                  data-testid="note-delete"
                >
                  <Trash2 size={18} aria-hidden="true" />
                  {t("app.delete")}
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="text-dim">{t("app.pick")}</p>
        )}
      </Section>
    </div>
  );
}
