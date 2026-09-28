import type { ReactNode } from "react";

export function Prose({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-5 py-10 space-y-4 leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_p]:text-dim [&_li]:text-dim [&_ul]:list-disc [&_ul]:pl-6">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {children}
    </article>
  );
}

/** Visible marker for legal placeholder text the owner must replace (§19 Phase 4). */
export function OwnerTodo({ children }: { children: ReactNode }) {
  return (
    <p
      className="rounded-xl border border-warning/60 bg-warning/10 p-4 text-warning text-sm"
      data-todo="TODO_OWNER_LEGAL"
    >
      TODO_OWNER_LEGAL: {children}
    </p>
  );
}
