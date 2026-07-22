# Growth Meeting Renderer Release Runbook V1

Use this lane for presentation-only changes to the public scheduler. API, schema, provider, flags and bindings remain in the Greenhouse release control plane.

## Release

1. Confirm `develop`, inspect `git status --short`, and preserve unrelated changes.
2. Run focal tests, typecheck/lint for touched files, and the local visual scenario at 1440/820/390 plus reduced motion and keyboard.
3. Run `RENDERER_SOURCE_SHA=$(git rev-parse HEAD) pnpm renderer:meeting:site:release`.
4. The command builds a content-addressed site, verifies hashes/loader contract, deploys without changing the stable alias, checks `health.json`, and only then assigns `efeonce-public-renderers.vercel.app` atomically.
5. Verify the stable health release, then `/agenda/` in a fresh browser. Confirm zero Greenhouse `growth-meetings` scripts, matching renderer/icon release markers, no overflow and no console errors.

## Rollback

Find the last known-good deployment in Vercel project `efeonce-public-renderers`, then run:

```bash
pnpm renderer:meeting:site:release -- --rollback=efeonce-public-renderers-<deployment>.vercel.app
```

Recheck stable `health.json` and `/agenda/`. Do not edit the immutable release directory or point WordPress back to `renderer-latest.js`.

## WordPress host migration

The live page is Elementor document `251583`. Normal renderer releases do not mutate it. If the stable loader origin itself changes, use the governed `Document::save()` rail, snapshot Elementor data/settings/protected Ohio metas, replace exactly one script URL, purge Kinsta and verify the full global footer remains unchanged.
