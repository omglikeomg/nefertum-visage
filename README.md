# nefertum-visage — Web BFF for the Nefertum fragrance platform

Express backend-for-frontend serving server-rendered HTML via Nunjucks, with
HTMX for interactivity and Tailwind v4 for styling. Vite drives the asset
pipeline.

## Why this stack

Server-rendered HTML gives SEO and instant first paint. HTMX delivers
SPA-like interactivity in ~14KB instead of a megabyte-scale SPA bundle, so no
client-side state management is needed. The BFF is also a security boundary —
the browser never sees the upstream GraphQL schema.

## Architecture

- **SSR via Nunjucks** — templates under `apps/web-bff/views/`
- **Interactivity via HTMX 2.x** — self-hosted at `apps/web-bff/public/scripts/htmx.min.js`, no CDN
- **Mock data layer** — `MockDataService` implements the exact interface the
  future `GraphQLService` will implement, so swapping mocks for real GraphQL is
  a one-line import change in the routers

## Layout

```
apps/web-bff/
├── src/          Express entry, middleware, routes, services, mocks, types
├── views/        Nunjucks templates (layouts, pages, components, partials)
└── public/       Static assets (CSS, JS, images) served at /static
```

## Local dev

```bash
npm install
npm run dev:server   # Express BFF on http://localhost:3001
npm run dev          # Vite asset pipeline
```

## Build + test

```bash
npm run build       # tsc -> dist/ + vite build
npm test            # vitest run
npm run lint
npm run typecheck
```

## Status

**v1 mock data layer; real GraphQL integration pending `nefertum-nest` resolver
extensions.** The upstream `PerfumeDetails` GraphQL surface currently exposes
only `id, name, slug, description, releaseYear, discontinued` — note pyramids,
scale histograms, and vote/shelf mutations are not yet wired, so the BFF renders
against in-memory mocks.

Auth is deliberately absent in v1: `nefertum-nest` has no JWT/cookie scheme yet,
so there is no auth middleware, no cookie parsing, and no session propagation.
Mock mutation state is in-memory and resets on process restart.

Specs, architecture docs, and agent instructions live in the hub under
`repo-specs/nefertum-visage/` — this repo holds application code only.
