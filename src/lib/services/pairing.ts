import { generateUserCode, normalizeUserCode, randomToken, sha256 } from "@/lib/auth/tokens";
import type { Db } from "@/lib/db/types";
import { PLAN_LIMITS } from "@/lib/plan";
import * as codes from "@/lib/repo/deviceCodes";
import { countActiveDevices, createDevice } from "@/lib/repo/devices";
import { getUserPlan } from "./plan";

/** Device authorization flow (RFC 8628 inspired, masterplan §8). */
export const DEVICE_CODE_TTL_SEC = 600;
export const POLL_INTERVAL_SEC = 3;

export async function startPairing(db: Db, preset: string | null) {
  const deviceCode = randomToken(32);
  for (let attempt = 0; attempt < 5; attempt++) {
    const userCode = generateUserCode();
    try {
      const row = await codes.createDeviceCode(db, {
        deviceCodeHash: sha256(deviceCode),
        userCode,
        preset,
        ttlSeconds: DEVICE_CODE_TTL_SEC,
      });
      return { deviceCode, userCode: row.userCode, expiresAt: row.expiresAt };
    } catch (err) {
      // unique collision on user_code: retry with a new code
      if (attempt === 4 || !/unique|duplicate/i.test(String(err))) throw err;
    }
  }
  throw new Error("unreachable");
}

export type PollOutcome =
  | { status: "pending" }
  | { status: "expired" }
  | { status: "approved"; deviceToken: string; deviceId: string; userId: string };

export async function pollPairing(db: Db, deviceCode: string): Promise<PollOutcome> {
  const code = await codes.findByDeviceCodeHash(db, sha256(deviceCode));
  if (!code || code.status === "expired" || code.status === "consumed") return { status: "expired" };
  if (code.status === "pending") return { status: "pending" };
  // approved: consume exactly once, then issue the long-lived device token
  const consumed = await codes.consumeDeviceCode(db, code.id);
  if (!consumed || !consumed.userId) return { status: "expired" };
  const deviceToken = randomToken(32);
  const device = await createDevice(db, {
    userId: consumed.userId,
    label: consumed.label,
    preset: consumed.preset,
    tokenHash: sha256(deviceToken),
  });
  return { status: "approved", deviceToken, deviceId: device.id, userId: consumed.userId };
}

export type ApproveOutcome = { ok: true } | { ok: false; code: "invalid_code" | "not_found" | "device_limit" };

export async function approvePairing(
  db: Db,
  userId: string,
  rawCode: string,
  label: string | null,
): Promise<ApproveOutcome> {
  const userCode = normalizeUserCode(rawCode);
  if (!userCode) return { ok: false, code: "invalid_code" };
  const code = await codes.findByUserCode(db, userCode);
  if (!code || code.status !== "pending") return { ok: false, code: "not_found" };
  const { plan } = await getUserPlan(db, userId);
  if ((await countActiveDevices(db, userId)) >= PLAN_LIMITS[plan].devices) {
    return { ok: false, code: "device_limit" };
  }
  const approved = await codes.approveDeviceCode(db, userCode, userId, label);
  return approved ? { ok: true } : { ok: false, code: "not_found" };
}
