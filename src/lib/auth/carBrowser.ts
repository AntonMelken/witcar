/**
 * Car browsers we tailor the login for. Tesla's Chromium appends "Tesla/<version>"
 * to its user agent; used only to pick the default login path, never for access.
 */
export function isCarBrowser(userAgent: string | null | undefined): boolean {
  return !!userAgent && /\bTesla\/\d/.test(userAgent);
}
