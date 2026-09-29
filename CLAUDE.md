@AGENTS.md

# WitCar — Agent Guide

Product: widget dashboard for car browsers (Tesla browser primarily), subscription via Stripe.
Master plan: docs/WITCAR_MASTERPLAN.md (source of truth). Decisions: DECISIONS.md.

## Commands

- pnpm dev | build | typecheck | lint | test | e2e
- Before marking any task done: pnpm typecheck && pnpm lint && pnpm test
- After adding/updating dependencies or bundled assets: pnpm licenses:gen (CI runs licenses:check; notices on /lizenzen).
- Local dev needs no external services: `.env.local` uses PGlite + dev auth + mock providers.
- E2E: `pnpm e2e` builds and starts the app on :3100 with the local backend (see playwright.config.ts).

## Hard rules

- No Tesla logos/fonts/vehicle imagery/"T" mark. "Tesla" only descriptively.
- Client never calls third-party data APIs. Everything via server cache proxy (src/lib/providers + src/lib/cache).
- No secrets in client or repo. Env via src/lib/env.ts (zod).
- Every API route validates input with zod (use `handler()` from src/lib/http/route.ts). Every table has RLS + a test (tests/unit/rls.test.ts).
- Drive mode: read-only, no animation, no scrolling, max 6 widgets, driveSafe widgets only.
- Free/Pro limits enforced server-side (src/lib/layout/schema.ts, src/lib/services/*).
- Stripe test mode only until owner says GO LIVE (env.ts refuses sk_live_ without WITCAR_STRIPE_LIVE=GO_LIVE).
- Verify third-party terms/limits in official docs before implementing; log in DECISIONS.md.
- Bundle budget: /dashboard initial JS <= 150 kB gzip (tests/e2e/budget.spec.ts).

## Architecture map

- Data access: `Db` interface (src/lib/db) -> postgres.js (Supabase pooler) in prod, PGlite locally/tests. Repos in src/lib/repo take `db` as first arg.
- Auth: Supabase Auth (magic link) or dev cookie; car devices use an HttpOnly device token (src/lib/auth).
- Widgets: meta/schema in src/widgets/<type>/definition.ts + registry.ts (isomorphic), UI in Widget.tsx + components.ts (client).
- Next.js 16: `proxy.ts` instead of middleware; async request APIs; read node_modules/next/dist/docs before using unfamiliar APIs.

## Workflow

Work phase by phase (masterplan section 19). Small commits (Conventional Commits).
Update CHANGELOG.md and DECISIONS.md after each phase. Ask owner questions in one batch.
