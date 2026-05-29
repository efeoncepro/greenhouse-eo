---
name: greenhouse-browser-diagnostics
description: Use this skill whenever a user asks Codex to open, inspect, review, test, debug, diagnose, screenshot, or capture a Greenhouse portal route or URL, including localhost, dev-greenhouse, staging, preview, production, /admin, UI errors, browser console, network failures, Playwright, Chromium, Chrome, or agent authenticated sessions.
---

# Greenhouse Browser Diagnostics

This skill is the default browser diagnostics hook for Greenhouse portal routes.

## Hard Rule

When the user asks to inspect a Greenhouse route, do not ask them to remind you about credentials or browser tooling. Use:

- the dedicated agent user `agent@greenhouse.efeonce.org`
- `scripts/playwright-auth-setup.mjs`
- Playwright with Chromium or the Chrome/Playwright MCP tools available in the session
- the canonical staging `.vercel.app` URL plus Vercel automation bypass when the target is protected

Do not use anonymous navigation as the first diagnostic path. Do not silence UI errors. Treat visible reliability, warning, or error states as product signals and investigate their underlying API, data, env, queue, or platform cause.

## Visual UI Verification Hook

When the request is a visual/UI verification, UI review, microinteraction audit, screenshot loop, frame sequence, design QA, or "does this look right?" check, the default path is `pnpm fe:capture` and its companion commands:

- Use `pnpm fe:capture <scenario> --env=staging` when a scenario exists.
- Use `pnpm fe:capture --route=<path> --env=staging --hold=3000` for quick route evidence.
- Use `pnpm fe:capture:review <scenario-or-capture-dir> --env=staging` when the output should feed a UI review dossier.
- Use `pnpm fe:capture:diff <previous-run> <current-run>` for before/after visual comparison.
- Use `pnpm fe:capture:health` when recent capture reliability is relevant.

Only bypass `pnpm fe:capture` for a focused Playwright/Chromium script when the diagnosis needs browser console, network payloads, API response inspection, local-only auth state, or an interaction not representable in the scenario DSL. If bypassed, still save artifacts under `.captures/`, explain why the canonical capture helper was insufficient, and prefer adding/updating a scenario afterward.

If `pnpm fe:capture` is blocked by missing env such as `VERCEL_AUTOMATION_BYPASS_SECRET`, report that exact blocker, try local `--env=local` when appropriate, and do not silently fall back to ad-hoc screenshots as the primary visual evidence.

## Canonical Targets

- Custom staging domain: `https://dev-greenhouse.efeoncepro.com` is protected by Vercel SSO for automation.
- Programmatic staging target: `https://greenhouse-eo-env-staging-efeonce-7670142f.vercel.app`
- Local target: use the exact localhost port from the running dev server.

If the user gives `dev-greenhouse.efeoncepro.com`, switch automation to the canonical `.vercel.app` deployment unless they explicitly need to inspect the SSO wall itself.

## Session Setup

Use the repo auth setup before opening the route:

```bash
set -a; source .env.local; set +a
AGENT_AUTH_BASE_URL="https://greenhouse-eo-env-staging-efeonce-7670142f.vercel.app" \
AGENT_AUTH_STORAGE_PATH=".auth/storageState.staging.json" \
node scripts/playwright-auth-setup.mjs
```

For local dev, set `AGENT_AUTH_BASE_URL` to the localhost URL and use a local storage state path.

## Browser Workflow

1. Open the route with Playwright/Chromium using the generated storage state.
2. For protected Vercel deployments, add `x-vercel-protection-bypass` only to Greenhouse/Vercel-origin requests. Do not leak that header to third-party origins such as Sentry.
3. For visual/UI verification, run `pnpm fe:capture` / `pnpm fe:capture:review` first and use its `.webm`, marker PNG frames, manifest, optional GIF, and dossier as the primary evidence.
4. Capture additional browser evidence when needed: console messages, page errors, failed requests, non-2xx/3xx app responses, and relevant API payloads.
5. Save artifacts under `.captures/<route-or-scenario>-<iso>/` when the run produces screenshots, videos, traces, or JSON evidence.
6. If the UI reports operational drift, query the underlying source of truth with the repo's canonical tools: `pnpm staging:request`, `pnpm pg:doctor`, `pnpm pg:connect`, Vercel CLI, GitHub CLI, or focused runtime scripts.

Use a focused Playwright script when console/network/API evidence is required, but keep `pnpm fe:capture` as the visual artifact producer whenever feasible.

## Output Contract

Report:

- exact URL/environment inspected
- authenticated actor used
- UI-visible problems
- console/network/API findings
- root causes or strongest evidence-backed hypotheses
- fixes applied, if any
- what remains unresolved

Prefer root-cause fixes over hiding or muting UI signals.
