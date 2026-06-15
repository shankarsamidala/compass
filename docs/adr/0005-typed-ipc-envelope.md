# ADR-0005: Type-safe IPC with a single Result envelope

**Status:** Accepted · 2026-06-13

## Context
In natively, IPC results had ad-hoc shapes and the renderer called `window.electronAPI` with types
duplicated across preload and renderer (drift risk). We want a production-grade, type-safe boundary.

## Decision
- **One envelope** for every handler:
  ```ts
  type Result<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };
  ```
- **Channel naming:** `domain:action` (`auth:login`, `jobs:list`, `cv:generate`).
- **`safeHandle`** wraps every handler — catches throws → `{ ok:false, error, code }`; no stack
  traces leak to the renderer.
- **Shared contract** in `packages/ipc-contract` (channel signatures + envelope), imported by both
  `preload.ts` and the renderer's typed `lib/ipc.ts`. Single source — no main/renderer drift.
- **zod** validates IPC inputs in main.
- Renderer calls IPC **only** via `lib/ipc.ts`, never `window.compass` directly.

## Consequences
- ✅ End-to-end type safety; consistent error handling; one place to evolve the contract.
- ✅ TanStack Query consumes the envelope uniformly.
- ⚠️ Slightly more ceremony per channel (worth it).
