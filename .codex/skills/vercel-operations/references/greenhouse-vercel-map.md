# Greenhouse Vercel Map

Use this file for repo-specific Vercel behavior. Treat `AGENTS.md`, `project_context.md`, and `Handoff.md` as the source of truth if they disagree with memory.

## Branch to environment policy

- `main`
  - production-ready only
  - maps to Vercel `Production`

- `develop`
  - shared integration branch
  - should map to the custom environment `Staging`

- `feature/*`, `fix/*`, `hotfix/*`
  - branch previews
  - should use Vercel `Preview`

## Ignored build policy

- `vercel.json` runs `node scripts/ci/vercel-ignore-build.mjs` as the Vercel
  Ignored Build Step.
- The command may cancel builds for `develop`, staging/custom previews and
  branch previews when the diff is only safe docs or local agent context:
  `docs/**`, root docs, Markdown files, `.codex/**`, `.claude/**`, `.agents/**`.
- It always continues the build for unknown/runtime/operations paths, including
  `src/**`, `app/**`, `public/**`, package/lockfiles, workflows, scripts,
  migrations, config/env, `services/ops-worker/**`, and release/deploy-control
  docs.
- It fails open when comparison SHAs are unavailable.
- `main`/Production is deliberately not skipped because
  `production-release.yml` still waits for a Vercel `READY` deployment for the
  release `target_sha`.
- Verified smoke (2026-07-08): branch
  `codex/vercel-docs-only-skip-smoke-20260708`, guard commit
  `685c33a76e7857a24eff070b75c1c2853f7a333b` built READY; docs-only commit
  `7cb31e34e0fd380b3fbba97238f143b087d88748` was `CANCELED` with GitHub/Vercel
  description `Canceled by Ignored Build Step`.

## Domain intent

- `greenhouse.efeoncepro.com`
  - production domain
  - should reflect `main`

- `dev-greenhouse.efeoncepro.com`
  - staging domain
  - should reflect `develop` / `Staging`

- `pre-greenhouse.efeoncepro.com`
  - preview validation domain
  - may be manually re-pointed to a specific preview deployment
  - do not assume it automatically follows the current feature branch

## Repo-specific operating notes

- This repo frequently needs exact verification of which deployment a custom domain currently serves.
- If `pre-greenhouse.efeoncepro.com` returns a Vercel auth page, that only proves the domain is alive and protected. It does not prove which branch is behind it.
- To prove the backing deployment for a protected domain, use one of:
  - `vercel curl`
  - Vercel MCP
  - a protection bypass secret
  - authenticated dashboard inspection via `vercel open`

## Validation checklist for this repo

When reporting on a preview or custom domain, include:
- branch name
- deployment URL
- whether the domain is aliased to that deployment
- whether deployment protection blocked content inspection
- whether the result was proven by CLI/MCP or inferred from Git/Vercel metadata
