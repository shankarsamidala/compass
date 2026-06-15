# ADR-0004: BYO-LLM hybrid — career-ops prompts, local inference

**Status:** Accepted · 2026-06-13

## Context
Users who can't pay for cloud AI should run the product for free on local models. But career-ops's
mature prompts + rubric + user context must be preserved (no quality loss, no drift).

## Decision
**Hybrid model:**
- The **career-ops API owns prompts and context**. It exposes the *assembled* prompt via
  `promptOnly` endpoints (e.g. `/cover-letter`, `/pdf`) — returning `{ systemPrompt, userPrompt,
  schema? }` instead of calling the AI.
- The **app executes prompts locally** through `packages/llm` (default provider: Ollama). No prompt
  text is ever copied into the app.
- Features call `provider.complete({ system, user, schema })`; the provider is swappable
  (ollama / groq / gemini-cli / codex-cli) via settings.

## Consequences
- ✅ Zero inference cost for local users; full career-ops context retained; no prompt drift.
- ✅ API and app stay in lockstep — edit a prompt once in career-ops, both paths update.
- ⚠️ Quality varies by local model (capability, not context). Mitigate with `num_ctx`, model choice.
- ⚠️ Some chains (evaluation) still run server-side until ported to `promptOnly` + local provider.
