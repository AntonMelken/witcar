// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLiveWidgets } from "@/components/dashboard/useLiveWidgets";
import type { RenderWidget } from "@/lib/layout/schema";

const widget = (id: string): RenderWidget => ({
  widgetId: id,
  type: "notes",
  x: 0,
  y: 0,
  w: 4,
  h: 4,
  config: { notes: [], activeId: null },
  locked: false,
});

const flushPromises = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

describe("useLiveWidgets (saving config changes from widget apps)", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("applies a change at once and saves only the last one after a pause", async () => {
    const { result } = renderHook(() => useLiveWidgets([widget("a"), widget("b")], "layout-1"));
    act(() => result.current.setConfig("a", { notes: [{ id: "n1", title: "x", text: "1" }], activeId: "n1" }));
    act(() => result.current.setConfig("a", { notes: [{ id: "n1", title: "x", text: "12" }], activeId: "n1" }));
    expect((result.current.widgets[0]!.config as { notes: { text: string }[] }).notes[0]!.text).toBe("12");
    expect(result.current.widgets[1]!.config).toEqual({ notes: [], activeId: null });
    expect(result.current.saveState).toBe("saving");
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(700);
      await flushPromises();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/layouts/layout-1/widgets/a");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({
      config: { notes: [{ id: "n1", title: "x", text: "12" }], activeId: "n1" },
    });
    expect(result.current.saveState).toBe("saved");
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });
    expect(result.current.saveState).toBe("idle");
  });

  it("flush saves immediately (when the app is closed)", async () => {
    const { result } = renderHook(() => useLiveWidgets([widget("a")], "layout-1"));
    act(() => result.current.setConfig("a", { notes: [], activeId: "z" }));
    await act(async () => {
      result.current.flush();
      await flushPromises();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports a failed save and keeps the local change", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 422 }));
    const { result } = renderHook(() => useLiveWidgets([widget("a")], "layout-1"));
    act(() => result.current.setConfig("a", { notes: [], activeId: "keep" }));
    await act(async () => {
      vi.advanceTimersByTime(700);
      await flushPromises();
    });
    expect(result.current.saveState).toBe("error");
    expect((result.current.widgets[0]!.config as { activeId: string }).activeId).toBe("keep");
  });

  it("calls onUnauthorized when the session is gone", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));
    const onUnauthorized = vi.fn();
    const { result } = renderHook(() => useLiveWidgets([widget("a")], "layout-1", onUnauthorized));
    act(() => result.current.setConfig("a", { notes: [], activeId: null }));
    await act(async () => {
      vi.advanceTimersByTime(700);
      await flushPromises();
    });
    expect(onUnauthorized).toHaveBeenCalled();
  });

  it("never calls the server without a layout (public demo)", async () => {
    const { result } = renderHook(() => useLiveWidgets([widget("a")], null));
    act(() => result.current.setConfig("a", { notes: [], activeId: "demo" }));
    await act(async () => {
      vi.advanceTimersByTime(5000);
      await flushPromises();
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect((result.current.widgets[0]!.config as { activeId: string }).activeId).toBe("demo");
    expect(result.current.saveState).toBe("idle");
  });
});
