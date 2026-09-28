/**
 * Service worker served from a route so every deployment ships a byte-different
 * script (build id) -> browsers detect the update (masterplan §14, §17).
 * Strategy: app shell + static assets cache-first, dashboard navigations
 * network-first with cached fallback. API responses are never cached here;
 * the last widget data lives in localStorage on the client.
 */
export const dynamic = "force-static";

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

const script = `
const VERSION = ${JSON.stringify(BUILD_ID)};
const STATIC_CACHE = "wc-static-" + VERSION;
const PAGE_CACHE = "wc-pages-v1";
const SHELL = ["/offline.html", "/icons/icon-192.png", "/icons/icon.svg", "/manifest.webmanifest"];
const PAGE_PATHS = ["/dashboard", "/demo"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(SHELL)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith("wc-static-") && key !== STATIC_CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

function isStatic(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/fonts/") || url.pathname.startsWith("/icons/");
}

function isCachedPage(url) {
  return PAGE_PATHS.includes(url.pathname);
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function networkFirstPage(request) {
  const url = new URL(request.url);
  const cache = await caches.open(PAGE_CACHE);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok && isCachedPage(url) && !res.redirected) cache.put(url.pathname + url.search, res.clone());
    return res;
  } catch (err) {
    const hit = (await cache.match(url.pathname + url.search)) || (await cache.match(url.pathname));
    if (hit) return hit;
    const offline = await caches.match("/offline.html");
    return offline || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (isStatic(url)) {
    event.respondWith(cacheFirst(request));
  } else if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
  }
});

// The page reports the assets it already loaded before the SW took control.
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "CLEAR") {
    event.waitUntil(caches.delete(PAGE_CACHE));
    return;
  }
  if (data.type !== "PRECACHE") return;
  event.waitUntil((async () => {
    const statics = await caches.open(STATIC_CACHE);
    const urls = Array.isArray(data.urls) ? data.urls.slice(0, 200) : [];
    await Promise.all(urls.map(async (u) => {
      try {
        const url = new URL(u);
        if (url.origin !== self.location.origin || !isStatic(url)) return;
        if (!(await statics.match(u))) await statics.add(u);
      } catch (e) {}
    }));
    if (typeof data.page === "string") {
      const url = new URL(data.page, self.location.origin);
      if (isCachedPage(url)) {
        try {
          const res = await fetch(url.pathname + url.search, { credentials: "include" });
          if (res.ok && !res.redirected) await (await caches.open(PAGE_CACHE)).put(url.pathname + url.search, res);
        } catch (e) {}
      }
    }
    if (event.source) event.source.postMessage({ type: "PRECACHED" });
  })());
});
`;

export function GET() {
  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
