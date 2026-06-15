# ADR-0001: Monorepo with pnpm workspaces + Turborepo

**Status:** Accepted · 2026-06-13

## Context
We have four surfaces — `api`, `studio` (web), `natively` (Electron), `compass` (Electron) — that
want to share design tokens, a UI component library, the LLM provider layer, auth/credentials, and
IPC types. Copy-paste between separate repos causes drift (we already saw this with prompts/tokens
in natively).

## Decision
Adopt a **monorepo** (pnpm workspaces + Turborepo) rooted at `compass/`:
- `apps/*` — deployable/shippable apps (start: `apps/desktop`).
- `packages/*` — shared libraries (`tokens`, `ui`, `llm`, `ipc-contract`).
Dependency direction is strictly `apps → packages`. Turborepo provides cached, parallel builds.
`natively` and `studio` migrate in incrementally; they are not blockers.

## Consequences
- ✅ Real code reuse; single source for tokens/UI/LLM; atomic cross-package changes.
- ✅ Cheap to set up now with one app present; expensive after entanglement.
- ⚠️ Slightly more tooling (workspace, Turbo). Contributors use pnpm, not npm.
- The **API stays out** of this repo (see ADR-0002).
