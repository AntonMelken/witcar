import { describe, expect, it } from "vitest";
import { isCarBrowser } from "@/lib/auth/carBrowser";
import { decodeDevSession, encodeDevSession } from "@/lib/auth/dev";
import { safeNext } from "@/lib/auth/redirect";
import { formatUserCode, generateUserCode, normalizeUserCode, sha256, USER_CODE_ALPHABET } from "@/lib/auth/tokens";

describe("device codes", () => {
  it("generates 8-char codes without 0/O/1/I", () => {
    for (let i = 0; i < 500; i++) {
      const code = generateUserCode();
      expect(code).toMatch(/^[A-Z2-9]{8}$/);
      expect(code).not.toMatch(/[01OI]/);
      for (const ch of code) expect(USER_CODE_ALPHABET).toContain(ch);
    }
  });

  it("normalizes manual input case-insensitively", () => {
    expect(normalizeUserCode("abcd-efgh")).toBe("ABCDEFGH");
    expect(normalizeUserCode(" abcd efgh ")).toBe("ABCDEFGH");
    expect(normalizeUserCode("ABCD-EFG0")).toBeNull();
    expect(normalizeUserCode("ABC")).toBeNull();
    expect(formatUserCode("ABCDEFGH")).toBe("ABCD-EFGH");
  });

  it("hashes tokens (only hashes are stored)", () => {
    expect(sha256("x")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("car browser detection", () => {
  it("recognizes the Tesla browser and nothing else", () => {
    expect(
      isCarBrowser(
        "Mozilla/5.0 (X11; GNU/Linux) AppleWebKit/537.36 (KHTML, like Gecko) Chromium/136.0.0.0 Chrome/136.0.0.0 Safari/537.36 Tesla/2025.20.6-a5a2b5b5b4b",
      ),
    ).toBe(true);
    expect(
      isCarBrowser(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(false);
    expect(isCarBrowser("TeslaFanBot")).toBe(false);
    expect(isCarBrowser(null)).toBe(false);
  });
});

describe("dev session cookie", () => {
  const secret = "s".repeat(40);
  it("round-trips and rejects tampering/expiry", () => {
    const v = encodeDevSession({ uid: "u1", email: "a@b.c", exp: 2_000 }, secret);
    expect(decodeDevSession(v, secret, 1_000)).toEqual({ uid: "u1", email: "a@b.c", exp: 2_000 });
    expect(decodeDevSession(v, secret, 3_000)).toBeNull();
    expect(decodeDevSession(v, "other".repeat(10), 1_000)).toBeNull();
    const [payload] = v.split(".");
    const forged = Buffer.from(JSON.stringify({ uid: "admin", email: "x", exp: 9e15 })).toString("base64url");
    expect(decodeDevSession(`${forged}.${v.split(".")[1]}`, secret, 1_000)).toBeNull();
    expect(decodeDevSession(`${payload}.`, secret, 1_000)).toBeNull();
    expect(decodeDevSession(undefined, secret)).toBeNull();
  });
});

describe("safeNext (open redirect guard)", () => {
  it("only allows same-site relative paths", () => {
    expect(safeNext("/link?code=ABCD")).toBe("/link?code=ABCD");
    expect(safeNext("https://evil.example")).toBe("/dashboard");
    expect(safeNext("//evil.example")).toBe("/dashboard");
    expect(safeNext("/\\evil")).toBe("/dashboard");
    expect(safeNext(null)).toBe("/dashboard");
  });
});
