import { describe, expect, it } from "vitest";
import { cleanName, decodeSession, encodeSession, nameEmail, nameKey } from "@/lib/auth/name";
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

describe("name session cookie", () => {
  const secret = "s".repeat(40);
  it("round-trips and rejects tampering/expiry", () => {
    const v = encodeSession({ uid: "u1", name: "Anton", exp: 2_000 }, secret);
    expect(decodeSession(v, secret, 1_000)).toEqual({ uid: "u1", name: "Anton", exp: 2_000 });
    expect(decodeSession(v, secret, 3_000)).toBeNull();
    expect(decodeSession(v, "other".repeat(10), 1_000)).toBeNull();
    const [payload] = v.split(".");
    const forged = Buffer.from(JSON.stringify({ uid: "admin", name: "x", exp: 9e15 })).toString("base64url");
    expect(decodeSession(`${forged}.${v.split(".")[1]}`, secret, 1_000)).toBeNull();
    expect(decodeSession(`${payload}.`, secret, 1_000)).toBeNull();
    expect(decodeSession(undefined, secret)).toBeNull();
  });
});

describe("account names", () => {
  it("accepts ordinary names and cleans whitespace", () => {
    expect(cleanName("  Anton   Melken ")).toBe("Anton Melken");
    expect(cleanName("Zoë")).toBe("Zoë");
    expect(cleanName("Юрий")).toBe("Юрий");
    expect(cleanName("O'Neil-Smith")).toBe("O'Neil-Smith");
  });

  it("rejects too short/long names and markup or control characters", () => {
    expect(cleanName("A")).toBeNull();
    expect(cleanName("x".repeat(33))).toBeNull();
    expect(cleanName("<script>")).toBeNull();
    expect(cleanName("a\u0000b")).toBeNull();
    expect(cleanName(" .abc")).toBeNull();
    expect(cleanName("")).toBeNull();
  });

  it("identifies a name case-insensitively and maps it to a stable placeholder address", () => {
    expect(nameKey("  ANTON  Melken")).toBe(nameKey("anton melken"));
    expect(nameEmail(nameKey("Anton"))).toBe(nameEmail(nameKey("anton ")));
    expect(nameEmail("a")).not.toBe(nameEmail("b"));
    expect(nameEmail("a")).toMatch(/^[0-9a-f]{64}@name\.witcar\.invalid$/);
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
