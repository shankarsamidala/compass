# Compass

Local-first job-search desktop app in a pnpm + Turborepo monorepo.

## What Is In This Repo

- `apps/desktop`: Electron + Vite + React desktop client
- `packages/ipc-contract`: shared IPC contract types
- `packages/llm`: shared LLM abstractions/utilities
- `packages/tokens`: shared design tokens
- `packages/ui`: shared UI exports

## Prerequisites

- Node.js 20+
- pnpm 11+
- macOS/Windows/Linux environment for desktop development

## Setup

1. Clone and enter the repo.

```bash
git clone <your-repo-url> compass
cd compass
```

2. Install dependencies.

```bash
pnpm install
```

3. Verify workspace packages are detected.

```bash
pnpm -r list --depth 0
```

## Running The App

From repo root:

```bash
pnpm dev
```

This runs `turbo run dev`, which starts dev tasks for workspace packages/apps that define a `dev` script.

For the desktop app specifically:

```bash
cd apps/desktop
pnpm dev
```

## Build

From repo root (all workspaces via Turbo):

```bash
pnpm build
```

Desktop app only:

```bash
cd apps/desktop
pnpm build
```

Create distributables (Electron Builder):

```bash
cd apps/desktop
pnpm dist
```

## Quality Checks

Run from repo root:

```bash
pnpm typecheck
pnpm lint
```

## Docker Status

There is currently no official `Dockerfile` or `docker-compose` setup in this repository.

- Full desktop runtime in Docker is not a supported workflow.
- Electron GUI, native desktop permissions, and audio/screen integrations are host-native concerns.
- Recommended workflow is local host development using pnpm.

## Common Commands

```bash
# root
pnpm dev
pnpm build
pnpm typecheck
pnpm lint

# desktop app
cd apps/desktop
pnpm dev
pnpm build
pnpm pack
pnpm dist
```
