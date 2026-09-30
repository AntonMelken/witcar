import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "@/lib/env";

/**
 * Proxy (formerly middleware):
 * 1. strict CSP with a per-request nonce for pages (masterplan §16.1)
 * 2. Supabase session refresh when Supabase Auth is configured
 */

function buildCsp(nonce: string, isDev: boolean, https: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // style attributes are used for grid placement; no external styles
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    // the browser only talks to our own origin (auth and data go through the server)
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
    "frame-ancestors 'none'",
    ...(https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const isApi = request.nextUrl.pathname.startsWith("/api/");
  const isDev = process.env.NODE_ENV === "development";
  const env = getEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const useSupabase = env.WITCAR_AUTH === "supabase";

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const https = (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");
  const csp = buildCsp(nonce, isDev, https);

  const requestHeaders = () => {
    const h = new Headers(request.headers);
    if (!isApi) {
      h.set("x-nonce", nonce);
      h.set("Content-Security-Policy", csp);
    }
    return h;
  };

  let response = NextResponse.next({ request: { headers: requestHeaders() } });

  if (useSupabase && supabaseUrl && supabaseKey) {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request: { headers: requestHeaders() } });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
          for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
        },
      },
    });
    // refreshes the session if needed; the result itself is not used here
    await supabase.auth.getClaims();
  }

  if (!isApi) response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|icons/|fonts/|sw.js|manifest.webmanifest|offline.html|third-party-licenses.txt|api/stripe/webhook|api/tools/ping|api/health).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
