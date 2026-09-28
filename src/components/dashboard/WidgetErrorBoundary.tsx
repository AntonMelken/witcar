"use client";

import { Component, type ReactNode } from "react";

/** Isolates widget crashes so one widget never blocks the others (§9.3). */
export class WidgetErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[widget] render failed", error instanceof Error ? error.message : error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
