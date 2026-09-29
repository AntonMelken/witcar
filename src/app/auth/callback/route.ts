import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeNext } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/lib/auth/supabase";
import { getEnv, siteUrl } from "@/lib/env";

/**
 * Magic-link landing. Current links carry the session in the URL fragment,
 * which the server never sees: forward to /auth/confirm (browsers keep the
 * fragment across a redirect without one). Still handles token_hash links
 * (custom template) and PKCE codes from older mails.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const fail = new URL("/login?error=link", siteUrl());
  if (getEnv().WITCAR_AUTH !== "supabase" || url.searchParams.has("error")) return NextResponse.redirect(fail);

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  if (!code && !tokenHash) {
    const confirm = new URL("/auth/confirm", siteUrl());
    confirm.searchParams.set("next", next);
    return NextResponse.redirect(confirm);
  }

  const supabase = await createSupabaseServerClient();
  const type = (url.searchParams.get("type") as EmailOtpType | null) ?? "email";
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type });

  if (error) return NextResponse.redirect(fail);
  return NextResponse.redirect(new URL(next, siteUrl()));
}
