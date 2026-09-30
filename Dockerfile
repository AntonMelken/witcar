# WitCar production image for self-hosting (Hetzner + Coolify, see docs/deploy-hetzner.md).
# NEXT_PUBLIC_* values are inlined into the browser bundle, so they are build args.
# Secrets (DATABASE_URL, Supabase secret key, Stripe keys ...) are runtime env only:
# set them in Coolify, never as build args (build args end up in the image history).

FROM node:24-bookworm-slim AS deps
WORKDIR /app
RUN npm install -g pnpm@12.6.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install -g pnpm@12.6.0
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG SOURCE_COMMIT
# the env check runs at container start instead (first request fails loudly on missing values)
ENV NEXT_OUTPUT=standalone \
    WITCAR_ENV_CHECK=off \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    SOURCE_COMMIT=$SOURCE_COMMIT
RUN pnpm build

FROM node:24-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
