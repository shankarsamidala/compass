# Compass — Architecture

Deep reference for *why* the system is shaped this way. The enforceable rules live in
`AGENTS.md` (always loaded); decisions are recorded as ADRs in `docs/adr/`. This file is the map.

---

## 1. System context

```
┌────────────────────────────┐        HTTPS         ┌─────────────────────────────┐
│  Compass monorepo (client) │ ───────────────────▶ │  career-ops API (separate)  │
│  apps/desktop (Electron)   │  auth · prompts ·    │  Fastify · Postgres · cloud │
│  packages/{tokens,ui,llm,  │  profile · jobs ·    │  (deployed independently)   │
│            ipc-contract}   │  evaluation          └─────────────────────────────┘
└────────────┬───────────────┘
             │ localhost
             ▼
   ┌───────────────────┐
   │  Ollama (local)   │  ← inference runs on the user's machine (BYO model)
   └───────────────────┘
```

- **The API is a separate service**, not part of this repo (see ADR-0002). The client is
  configured with an API base URL (hosted default; self-host/localhost supported).
- **career-ops owns prompts + data; the app executes prompts locally** on Ollama (ADR-0004).

---

## 2. Monorepo layout (ADR-0001)

```
compass/                       # monorepo root (pnpm workspace + Turborepo)
  apps/
    desktop/                   # the Electron app (Vite + React)
      electron/                #   MAIN process (engine: ipc, http, credentials, llm, services)
      src/                     #   RENDERER (app shell, features, ui usage)
  packages/
    tokens/                    # design tokens → CSS vars + TS (single source)
    ui/                        # React component library (built on tokens)
    llm/                       # LlmProvider interface + providers (ollama/groq/cli)
    ipc-contract/              # shared IPC channel types + Result envelope
  docs/adr/                    # architecture decision records
  AGENTS.md  ARCHITECTURE.md   # conventions (loaded) + this map
  turbo.json  pnpm-workspace.yaml  tsconfig.base.json
```

Why monorepo: 4 surfaces (api, studio, natively, compass) share tokens/UI/LLM/auth. Shared
**packages** make that real instead of copy-paste. natively & studio migrate in incrementally.

---

## 3. Process boundaries (the core invariant)

| Layer | Responsibility | Never does |
|---|---|---|
| **Renderer** (`apps/desktop/src`) | UI, navigation, server-state via Query | hold tokens, build prompts, call API/Ollama, spawn |
| **Main** (`apps/desktop/electron`) | IPC, HTTP (auth+refresh), credentials, LLM exec | render UI |
| **Shared packages** | tokens, ui, llm, ipc types | app-specific logic |

Dependency direction: `apps → packages` only. Packages never import from apps.

---

## 4. Data flow (a feature end-to-end)

```
UI (feature) → lib/ipc (typed) → IPC channel → safeHandle → service (main)
  → core/http authedFetch (Bearer + refresh) → API
  → [BYO] promptOnly → packages/llm provider → local Ollama
  ← Result<T> envelope ← rendered via TanStack Query + packages/ui
```

- One **Result envelope** everywhere: `{ ok:true, data } | { ok:false, error, code }` (ADR-0005).
- zod validates every boundary (IPC input, API responses, config).

---

## 5. Theming (ADR-0003)

Dark/black-only. Three tiers: **primitive** (raw palette) → **semantic** (`bg`, `fg`, `accent`)
→ **component**. Authored in `packages/tokens`, consumed via Tailwind utilities. Re-skin = change
tokens; zero component edits. Built on accessible primitives (focus rings, contrast, ARIA).

---

## 6. Quality & delivery (targets)

- **CI (PR):** lint → typecheck → test → build → bundle-budget. Branch protection.
- **Release:** signed builds (Apple notarize + Azure Trusted Signing), electron-updater channels
  (stable/beta) + rollback. Conventional commits + changesets.
- **Testing pyramid:** Vitest (unit) · Testing Library (component) · Playwright (e2e) · IPC contract.
- **Security:** contextIsolation, no nodeIntegration, CSP, safeStorage secrets, signed updates,
  least-privilege (no mic/screen), dependency scanning.
- **Observability:** structured main logs · Sentry crash reports · opt-in anonymized telemetry.

See `AGENTS.md` §10 for the enforced subset and the "now vs later" sequencing.

---

## 7. Adoption sequence (avoid over-engineering)

**Now (expensive to retrofit):** monorepo, tiered tokens, typed IPC, strict TS + lint + pre-commit,
CI skeleton, test harness wired, security baseline, route code-splitting.
**Later (additive, zero refactor):** Storybook/Chromatic, Style Dictionary, staged rollout, SBOM,
remote Turbo cache, full e2e suite.
