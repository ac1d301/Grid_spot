# Scaling Grid Spot to ~100k users

This documents the path from the current single-instance deployment to one that comfortably
serves ~100k users. The code is already **scale-ready** — the items under "Done" ship working
on free/single-instance infra; the items under "To reach 100k" are infra/config changes that
slot into seams left in the code, mostly without further code edits.

## Current architecture

- **Backend**: one Node/Express process. Fronts OpenF1 + Jolpica through an in-process caching
  gateway (`backend/services/cache.js` — fresh-hit / in-flight-dedup / stale-while-error). Forum
  on MongoDB (Mongoose) + a `ws` WebSocket server for live forum updates.
- **Frontend**: static SPA (React + Vite), TanStack Query over the API gateway.
- **Single-instance ceiling**: comfortable to a few thousand concurrent users. First limits hit:
  per-process cache (not shared), MongoDB connection pool, and one CPU core.

## Done in this pass (no paid services)

- **HTTP response caching** (`backend/middlewares/cacheControl.js`) on the public F1 read
  endpoints → browsers and any CDN absorb the bulk of repeat reads. This is the single biggest
  read-scale lever and works today.
- **gzip** (`compression`), **security headers** (`helmet`), **rate limiting**
  (`express-rate-limit`: tight on `/api/auth`, a generous global cap), **bounded Mongo pool**,
  **env validation**, **graceful shutdown** (drains WS + closes cleanly on SIGTERM),
  **DB-aware `/api/health`**, and gated request logging.
- **Cache storage seam**: the gateway's storage is isolated behind `createMemoryStore()` in
  `cache.js` so a shared store drops in without touching call sites.
- **Frontend**: vendor bundle split (recharts/react/query/date-fns — main entry ~510K→~300K,
  RaceCenter ~419K→~48K), polling discipline (no idle background refetch; news gated to tab
  visibility), and a persistent React Query cache (localStorage) for instant warm reloads.

## To reach 100k (infra + small config)

1. **Shared Redis cache** — replace `createMemoryStore()` in `cache.js` with a Redis-backed
   store (same shape; accessors become async). Result: **one** cold upstream fetch globally
   instead of one per instance. Also point the `express-rate-limit` store at Redis so limits are
   shared across instances.
2. **CDN in front of the read API** — the endpoints already send `Cache-Control`. A CDN
   (Cloudflare/Fastly) then serves the vast majority of calendar/standings/session reads from
   edge, so origin traffic is dominated by writes (forum/auth), which are comparatively tiny.
3. **MongoDB Atlas M-tier** — move off the shared free tier; raise `maxPoolSize` to match
   per-instance concurrency. Forum indexes are already in place (`backend/models/forum.js`).
4. **Horizontal scale (N instances)** — the app is stateless except the WebSocket layer. Add a
   **Redis pub/sub adapter** so `broadcastToThread` (in `backend/websocket.js`) fans out across
   instances; the per-process `clients` Map alone won't reach users connected to other instances.
   Use a host that supports multiple instances (Render Standard, Railway, Fly, a container
   platform) behind a load balancer.
5. **Static frontend on a CDN** — already a static build; host on Vercel/Netlify/CF Pages so the
   SPA + assets (content-hashed, long-cached) are served from edge.
6. **Observability** — structured logging (pino) + error monitoring (Sentry) before/at launch.

## Rough capacity reasoning

With CDN + response caching, F1 reads collapse to a handful of origin fetches per TTL window
regardless of user count. Remaining origin load is writes (forum posts/votes) and the WebSocket
fan-out — both light and horizontally scalable once Redis pub/sub is in. The practical ceiling
then becomes MongoDB write throughput (Atlas tier) and instance count, both of which scale with
spend rather than code.
