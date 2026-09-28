"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";

/**
 * Minimal client translator for the dashboard/drive bundle (§17 budget: the
 * next-intl client runtime alone is ~12 kB gzip). Same message files, same
 * keys; supports `{name}` interpolation only (no ICU plural/select).
 * Everything else in the app uses next-intl.
 */
type Messages = Record<string, unknown>;

const MessagesContext = createContext<Messages>({});

export function LiteIntlProvider({ messages, children }: { messages: Messages; children: ReactNode }) {
  return <MessagesContext.Provider value={messages}>{children}</MessagesContext.Provider>;
}

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

export function translate(messages: Messages, path: string, vars?: Record<string, string | number>): string {
  let node: unknown = messages;
  for (const part of path.split(".")) node = (node as Messages | undefined)?.[part];
  if (typeof node !== "string") return path;
  return vars ? node.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : node;
}

export function useT(namespace?: string): TranslateFn {
  const messages = useContext(MessagesContext);
  return useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      translate(messages, namespace ? `${namespace}.${key}` : key, vars),
    [messages, namespace],
  );
}
