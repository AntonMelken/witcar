// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import messages from "../../messages/de.json";
import { LiteIntlProvider } from "@/i18n/lite";
import { DriveView, isNight, pixelShift } from "@/components/dashboard/DriveView";
import { applyPlanForDisplay } from "@/lib/layout/schema";
import { arrangeForDrive } from "@/lib/layout/grid";
import { DEMO_LAYOUT } from "@/lib/layout/fixtures";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

afterEach(cleanup);

describe("DriveView", () => {
  it("renders max 6 tiles, only the exit button, and opts out of animations", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => undefined)),
    );
    const widgets = arrangeForDrive(applyPlanForDisplay(DEMO_LAYOUT, "pro", "drive"));
    const { container } = render(
      <LiteIntlProvider messages={messages}>
        <DriveView widgets={widgets} isDevice={false} />
      </LiteIntlProvider>,
    );
    const root = container.querySelector("main")!;
    expect(root.classList.contains("wc-drive")).toBe(true);
    expect(container.querySelectorAll("[data-widget]").length).toBeLessThanOrEqual(6);
    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]!.hasAttribute("data-drive-exit")).toBe(true);
    expect(container.querySelectorAll("input, select, textarea, a")).toHaveLength(0);
    vi.unstubAllGlobals();
  });

  it("global CSS disables animations, transitions and scrolling in drive mode", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const block = css.slice(css.indexOf(".wc-drive,\n.wc-drive *"));
    expect(block).toMatch(/animation:\s*none !important/);
    expect(block).toMatch(/transition:\s*none !important/);
    expect(css).toMatch(/\.wc-drive \{[^}]*overflow: hidden !important/);
  });

  it("anti burn-in shift is <= 2 px and changes at most every 5 minutes", () => {
    const t = Date.parse("2026-09-28T10:00:00Z");
    const a = pixelShift(t);
    expect(pixelShift(t + 299_000)).toEqual(a);
    for (let i = 0; i < 20; i++) {
      const s = pixelShift(t + i * 300_000);
      expect(Math.abs(s.x)).toBeLessThanOrEqual(2);
      expect(Math.abs(s.y)).toBeLessThanOrEqual(2);
    }
    expect(isNight(new Date(2026, 8, 28, 22).getTime())).toBe(true);
    expect(isNight(new Date(2026, 8, 28, 12).getTime())).toBe(false);
  });
});
