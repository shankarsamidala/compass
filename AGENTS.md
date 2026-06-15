# Compass — Architecture & Conventions

Local-first job-search desktop app (career-ops client). Electron + Vite + React + Tailwind, in a
pnpm + Turborepo monorepo. **Read this before adding any feature.** These rules keep the codebase
consistent so we don't re-litigate foundations per feature.

**Further reading (read on demand — not auto-loaded):**
`ARCHITECTURE.md` (the full map) · `docs/adr/*` (decisions: monorepo, API-separate, tokens,
BYO-LLM, typed IPC). When a change touches a decision, read the relevant ADR first.

---

## 1. Product architecture (hybrid)

```
HOSTED API (career-ops)              LOCAL (this app)
├─ auth, user profile                ├─ Electron main = the engine
├─ prompts (assembled, promptOnly)   │   (IPC, HTTP, credentials, LLM providers)
├─ job data, evaluation              └─ inference on local Ollama (BYO model)
└─ analytics
```

- **career-ops API is the source of truth** for prompts, rubric, and user data.
- **Inference runs locally** (Ollama) so users pay nothing. API supplies the assembled prompt.
- The API base URL is configurable (hosted default; self-host/localhost supported).

### The two non-negotiable rules
1. **NEVER copy a career-ops prompt into this app.** Always fetch the assembled prompt from the
   API (`promptOnly` endpoints). The app executes prompts; it never owns them. (Prevents drift.)
2. **The renderer is dumb.** It never holds tokens, never spawns processes, never calls the API
   directly, never builds prompts. All of that lives in the Electron **main** process.

---

## 2. Boundaries (who does what)

| Concern | Lives in |
|---|---|
| Tokens / secrets | main → `core/credentials` (safeStorage). Renderer never sees them. |
| API calls (Bearer + refresh) | main → `core/http` (one authed client). Services never re-implement fetch. |
| Prompts / LLM execution | main → `services/*` + `llm/*` providers. |
| UI, state, navigation | renderer only. Talks to main **only** via the typed IPC client. |

---

## 3. Folder structure

```
electron/                      # MAIN process (the engine)
  main.ts  preload.ts
  core/
    config.ts                  # zod-validated env/config (API_URL, OLLAMA_URL, model)
    http.ts                    # authedFetch: Bearer + single-flight refresh
    credentials.ts             # safeStorage-backed token/session store
    settings.ts                # typed persisted settings (provider, model, apiUrl)
    ipc.ts                     # safeHandle wrapper + channel registration
    logger.ts
  llm/
    provider.ts                # LlmProvider interface + registry
    ollama.ts  groq.ts  ...    # one file per provider
  services/
    auth.service.ts  jobs.service.ts  coverLetter.service.ts  cv.service.ts
  ipc/handlers.ts              # registers all channels → services

src/                           # RENDERER
  app/                         # shell, router, providers (QueryClient)
  features/<name>/             # feature-first: components/, hooks/, api.ts
    auth/  jobs/  cover-letter/ cv/ settings/
  components/ui/               # design-system primitives (Button, Input, Field, Card, Modal, Spinner)
  lib/
    ipc.ts                     # typed wrapper over window.compass.* (the only IPC entry point)
    query.ts                   # TanStack Query client + keys
  types/ipc.ts                 # SHARED IPC contract types (imported by preload + renderer)
  styles/                      # tokens live in index.css (see §8)
```

Feature-first: a feature owns its UI + hooks + data access. Shared primitives go in `components/ui`.

---

## 4. IPC contract (type-safe, one envelope)

- **Channel naming:** `domain:action` — `auth:login`, `jobs:list`, `cv:generate`.
- **Every handler returns the same envelope:**
  ```ts
  type Result<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };
  ```
- **`safeHandle`** wraps every handler: catches throws → `{ ok:false, error, code }`. Handlers
  never leak stack traces to the renderer.
- **Types are shared.** Define channel signatures once in `src/types/ipc.ts`; both `preload.ts`
  and the renderer `lib/ipc.ts` import them. No drift between main and renderer.
- Renderer calls IPC **only** through `lib/ipc.ts` (typed), never `window.compass` directly.

---

## 5. Services (main process)

- One service per domain, singleton (`getInstance()`).
- Use `core/http.authedFetch` — never raw `fetch` with manual tokens.
- Return the `Result<T>` envelope; map upstream errors to user-safe messages + a `code`.
- Services contain **no UI assumptions** and **no prompt text**.

---

## 6. LLM provider layer

- `LlmProvider` interface: `{ id, label, isAvailable(), capabilities, complete({system,user,schema?}) }`.
- Features call `provider.complete(...)` — never a specific provider directly.
- A registry resolves the active provider from `settings` (default `ollama`).
- Each provider normalizes structured output (Ollama `format`, API `responseSchema`, CLI parse).
- BYO features (cover letter, CV, eval) = fetch prompt from API (`promptOnly`) → `provider.complete`.

---

## 7. Renderer data layer

- **TanStack Query for ALL IPC/server state.** No ad-hoc `useEffect` + `useState` fetching.
  - Query keys centralized in `lib/query.ts`.
  - Loading/error/empty handled via query state, rendered with shared `ui` components.
- Local UI state (open modals, form inputs) = `useState`. Server state = Query.
- Routing via a router (memory/hash) in `app/`. No giant `view` switch in one component.

---

## 8. Design tokens & UI

- **Dark/black-only.** Tokens are CSS vars in `src/index.css`, mapped in `tailwind.config.js`.
- Components use semantic utilities (`bg-surface`, `text-fg-muted`, `border-line`, `bg-accent`)
  — **NEVER hardcoded hex.** Re-skin = change one var.
- Reusable UI lives in `components/ui` (Button, Input, Field, Card, Modal, Spinner, Badge).
  Features compose these; they don't re-roll button/input styles.

---

## 9. Auth (the pattern every protected call follows)

- `auth.service` (main): login/signup/verify/refresh/logout → stores session in `credentials`.
- `core/http.authedFetch`: attaches Bearer, on 401 does single-flight refresh + retry once.
- Renderer: an `AuthGate` reads session via Query (`auth:session`); routes to login vs app.
- Session restored on launch. Renderer never touches tokens.

---

## 10. Quality gates

- TypeScript **strict**, `noUnusedLocals/Parameters` on. `npm run typecheck` must pass.
- ESLint + Prettier. Keep files focused (< ~300 lines; split features).
- Errors: surface the `error` string from the envelope in the UI; log details in main.
- After any `electron/**` change, rebuild — Vite HMR only reloads the renderer.

---

## 11. Naming

- Channels `domain:action`; services `*.service.ts`; providers `<id>.ts`; features lowercase-kebab.
- IPC types in `types/ipc.ts`; nowhere else duplicates them.
