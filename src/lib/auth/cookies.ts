import { isSecureSite } from "@/lib/env";

export const DEVICE_COOKIE = "wc_device";
export const SESSION_COOKIE = "wc_session";
export const THEME_COOKIE = "wc_theme";

export const DEVICE_COOKIE_MAX_AGE = 90 * 24 * 3600;
export const SESSION_COOKIE_MAX_AGE = 365 * 24 * 3600;

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: isSecureSite(),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function themeCookieOptions() {
  return { httpOnly: false, secure: isSecureSite(), sameSite: "lax" as const, path: "/", maxAge: 365 * 24 * 3600 };
}
