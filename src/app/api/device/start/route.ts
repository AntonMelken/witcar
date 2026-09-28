import QRCode from "qrcode";
import { z } from "zod";
import { formatUserCode } from "@/lib/auth/tokens";
import { RULES } from "@/lib/cache/rateLimit";
import { getDb } from "@/lib/db";
import { siteUrl } from "@/lib/env";
import { handler, ok } from "@/lib/http/route";
import { isPresetId } from "@/lib/presets";
import { DEVICE_CODE_TTL_SEC, POLL_INTERVAL_SEC, startPairing } from "@/lib/services/pairing";

/** Car browser starts pairing: returns device code, user code and QR (§8.2). */
export const POST = handler(
  {
    auth: "none",
    body: z.object({ preset: z.string().max(40).optional() }),
    rateLimit: { rule: RULES.deviceStart, by: "ip" },
  },
  async ({ body }) => {
    const db = await getDb();
    const preset = body.preset && isPresetId(body.preset) ? body.preset : null;
    const { deviceCode, userCode, expiresAt } = await startPairing(db, preset);
    const verificationUri = new URL("/link", siteUrl()).toString();
    const verificationUriComplete = `${verificationUri}?code=${userCode}`;
    const qrSvg = await QRCode.toString(verificationUriComplete, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 1,
      color: { dark: "#0f1114", light: "#ffffff" },
    });
    return ok({
      deviceCode,
      userCode: formatUserCode(userCode),
      verificationUri,
      verificationUriComplete,
      qrSvg,
      expiresIn: DEVICE_CODE_TTL_SEC,
      expiresAt,
      interval: POLL_INTERVAL_SEC,
    });
  },
);
