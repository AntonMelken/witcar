import { describe, expect, it } from "vitest";
import { createHistory, HISTORY_LIMIT, push, redo, replace, undo } from "@/components/editor/history";

describe("editor history", () => {
  it("supports at least 20 undo/redo steps", () => {
    let h = createHistory(0);
    for (let i = 1; i <= 25; i++) h = push(h, i);
    for (let i = 0; i < 20; i++) h = undo(h);
    expect(h.present).toBe(5);
    for (let i = 0; i < 20; i++) h = redo(h);
    expect(h.present).toBe(25);
    expect(HISTORY_LIMIT).toBeGreaterThanOrEqual(20);
  });

  it("a new change clears the redo stack and caps the history", () => {
    let h = createHistory(0);
    for (let i = 1; i <= HISTORY_LIMIT + 10; i++) h = push(h, i);
    expect(h.past).toHaveLength(HISTORY_LIMIT);
    h = undo(h);
    h = push(h, 999);
    expect(h.future).toHaveLength(0);
    expect(redo(h)).toBe(h);
  });

  it("coalesces typing into one step and replace does not record", () => {
    let h = createHistory("");
    h = push(h, "a", "name");
    h = push(h, "ab", "name");
    h = push(h, "abc", "name");
    expect(h.past).toEqual([""]);
    h = replace(h, "saved");
    expect(h.present).toBe("saved");
    expect(undo(h).present).toBe("");
  });
});
