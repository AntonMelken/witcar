import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeNext } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/lib/auth/supabase";
import { getEnv, siteUrl } from "@/lib/env";

/** Magic-link landing: PKCE code exchange or token_hash verification. */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const fail = new URL("/login?error=link", siteUrl());
  if (getEnv().WITCAR_AUTH !== "supabase") return NextResponse.redirect(fail);

  const supabase = await createSupabaseServerClient();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("missing code") };

  if (error) return NextResponse.redirect(fail);
  return NextResponse.redirect(new URL(next, siteUrl()));
}
