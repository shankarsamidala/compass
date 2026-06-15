# ADR-0002: The career-ops API stays a separate service

**Status:** Accepted · 2026-06-13

## Context
The `career-ops/api` is a Fastify backend with Postgres (Supabase), Qdrant, Redis, and cloud AI
keys. The compass monorepo is a frontend/Electron workspace. They have different runtimes, deps,
deploy lifecycles, and scaling models.

## Decision
**Do not** bring the API into the compass monorepo. It remains an independently deployed service
(in `career-ops/api`). Compass communicates with it over HTTPS, configured via an API base URL
(hosted default; self-host/localhost supported for OSS users).

The client owns its own **view-model types** (e.g. `RawJob`, `CvContent`); it does not import API
internals. If we later want a shared API contract, we publish a small `api-contract` package — but
not by coupling the client to the server's source.

## Consequences
- ✅ Clean separation; API can scale/deploy on its own cadence.
- ✅ Hosted vs self-hosted is just a config switch on the client.
- ⚠️ API response types are mirrored client-side (acceptable; revisit with `api-contract` if drift hurts).
