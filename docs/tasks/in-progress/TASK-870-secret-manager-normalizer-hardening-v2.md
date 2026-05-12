---
id: TASK-870
title: Secret Manager normalizer hardening V2 — shape validation + active drift signal
type: hardening
priority: P0 (production release blocker)
size: S (~3h)
status: in-progress
created: 2026-05-12
created_by: Claude Opus 4.7
lifecycle: in-progress
target_branch: develop
release_train: hotfix-2026-05-12
depends_on: [TASK-742, TASK-849]
impacts: [release-control-plane, all_secret_ref_consumers]
---

# TASK-870 — Secret Manager normalizer hardening V2

## Trigger

Codex pasó ~3h intentando promover `develop → main` el 2026-05-12. Logró pushear el merge commit `75273cb7` y 4 fix commits (`59f5115c`, `a4d65aa2`, `7841f547`, `c41a26b8`), pero el `Production Release Orchestrator` falló preflight cada vez (runs `25729006167`, `25730555533`, `25734474468`, `25734817631`). Causa raíz NO investigada por Codex — sus 4 fixes hicieron la preflight gate **más permisiva** sin tocar el incidente subyacente.

## Causa raíz (3 capas)

1. **Capa runtime** — `Error: GitHub App private key from secret 'greenhouse-github-app-private-key' is not valid PEM` firing cada ~3min en production. Lanzado por [src/lib/release/github-app-token-resolver.ts:178-180](../../src/lib/release/github-app-token-resolver.ts#L178-L180). El resolver `resolveGithubAppInstallationToken` falla → fallback a PAT → `captureWithDomain('cloud', …)` captura a Sentry → la preflight check `sentry_critical_issues` (TASK-850) detecta el burst dentro de la ventana activa de 15min → bloquea `readyToDeploy` → exit 1.

2. **Capa env** — `GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF` en Vercel production almacenada como `"greenhouse-github-app-private-key\n"` (bytes hex `… 6b 65 79 5c 6e 22`). Probablemente persisted via `echo "..." | vercel env add` que appendea LF.

3. **Capa código** — drift entre los dos normalizers canónicos:
   - `normalizeSecretValue` (para contenido del secret) strippa comillas envolventes.
   - `normalizeSecretRefValue` (para nombre del ref) **NO** strippa comillas — solo `\\r`/`\\n` literal + `.trim()`.
   - Resultado: el `normalizeSecretRef` downstream construía `projects/efeonce-group/secrets/"name"/versions/latest` con quotes embebidos → GCP `accessSecretVersion` retornaba NOT_FOUND → catch silencioso → `resolveSecretByRef` retornaba null → resolver throw "is not valid PEM" → Sentry burst → preflight bloquea.

## Decisión arquitectónica (4-pillar verdict arch-architect 2026-05-12)

**Plan aprobado con 5 mejoras obligatorias (M1-M5)**:

- **M1**: Capa 1 (normalizer V2) + Capa 3 (fix env Vercel) atómicas (mismo deploy).
- **M2**: Capa 2 (shape regex) **obligatoria**, NO YAGNI — cierra la clase de bug en el boundary.
- **M3**: Falta una capa — reliability signal `secrets.env_ref_format_drift` (kind=drift, severity=error si count>0, steady=0).
- **M4**: `vercel env add --force` (overwrite atomic) en vez de `rm` + `add` (gap-window).
- **M5**: Rollback plan + audit pasivo S0 PRE-merge.

**Ship strategy** (atomic):
- S0: audit pasivo de 21 refs canónicos contra el V2 regex local. **Verde 21/21**.
- S1: refactor + tests + signal + docs en un commit.
- S2: re-set env var Vercel + redeploy.
- S3 (separado): re-disparar orchestrator después de que Sentry burst se enfríe (≥15min).

## Acceptance Criteria

- [x] `stripEnvVarContamination(value)` helper privado en `src/lib/secrets/secret-manager.ts`. Aplica `trim → strip surrounding quotes → strip trailing `\r`/`\n` literal y real → trim`.
- [x] `normalizeSecretValue` y `normalizeSecretRefValue` consumen el helper. Single-source-of-truth.
- [x] `SECRET_REF_SHAPE` regex en boundary de `normalizeSecretRefValue`. Acepta 3 formas canónicas + partial-path. Rechaza embedded spaces, quotes en medio, paths malformados.
- [x] `isCanonicalSecretRefShape(value)` predicate exportable.
- [x] `src/lib/release/github-app-token-resolver.ts` diferencia "ref corruption" (silent degrade a PAT, console.warn) de "content corruption" (throw + `captureWithDomain`).
- [x] Reliability signal nuevo `secrets.env_ref_format_drift` en `src/lib/reliability/queries/secrets-env-ref-format-drift.ts`. Module `cloud`, kind `drift`, steady=0.
- [x] Wire-up en `getReliabilityOverview` (preloaded sources type + builder + parallel resolver).
- [x] Tests anti-regresión 7 casos en `secret-manager.test.ts` (cubren bug class exacto: `"...\n"` quotes + literal backslash-n combo, embedded spaces, malformed paths, predicate exposure).
- [x] Tests para signal (7 cases) incluyendo recovery auto via quote-strip, embedded-space drift detection, payload evidence.
- [x] Test anti-regresión para resolver GH App: corrupt ref → silent fallback sin captureWithDomain.
- [x] CLAUDE.md + AGENTS.md "Secret Manager Hygiene" sections extendidas con reglas duras V2 + bug class canonizada + matriz Sentry decoupling.
- [x] ADR entry en `docs/architecture/DECISIONS_INDEX.md`.
- [ ] Audit S0 pre-merge — 21 canonical refs pass V2 regex. **Verde local (ver `/tmp/audit-known-refs.mjs` corrido 2026-05-12).**
- [ ] S2: env var Vercel re-setteada limpio con `printf %s … --force`.
- [ ] S3: orchestrator re-disparado para `c41a26b8` y completes successfully.

## Verification

```bash
# Tests anti-regresión
pnpm exec vitest run src/lib/secrets src/lib/reliability/queries/secrets-env-ref-format-drift src/lib/release/github-app-token-resolver --reporter=dot
# 52/52 verde

# Type check
pnpm exec tsc --noEmit --pretty false
# clean

# Audit S0
node /tmp/audit-known-refs.mjs    # 21/21 canonical refs pass V2 regex

# Post-deploy verification
# 1. Sentry "is not valid PEM" debería caer a 0 en <5min post deploy
# 2. /admin/operations debería mostrar signal secrets.env_ref_format_drift = ok
# 3. /api/auth/health debería seguir reportando readiness OK
```

## Out of Scope (follow-ups)

- **CI gate** `scripts/ci/audit-vercel-env-secret-refs.mjs` invocable desde preflight CLI (TASK-850). Útil pero no bloqueante; reliability signal cubre el caso runtime. Spawnar como task separada si emerge presión.
- **Format validation para SECRET content** (PEM, JWT, etc.) — fuera del scope del normalizer ref; cubierto por `validateSecretFormat` en `format-validators.ts` (TASK-742 Capa 1).
- **Auditoría de Cloud Run worker envs** — los workers leen secrets directo desde GCP Secret Manager via SA, no via `*_SECRET_REF` env vars de Vercel. Path distinto, no aplica.

## Riesgos colaterales mitigados

- **Cache stale**: `getCacheKey` (línea 171) usa `normalizeSecretRefValue` ya. Post-deploy del normalizer V2, si una entry cache previa tenía un secretRefValue corrupto cached, el cache key cambia → entry queda huérfana → TTL 60s la elimina. Sin ruptura.
- **Falso positivo del shape regex**: audit S0 verificó que los 21 refs canónicos (17 en Vercel production + variantes) pasan. Si emerge un ref legítimo con character fuera del set permitido (e.g. `.` o `+`), agregarlo al regex con migration explícita.
- **Sentry decoupling**: previo a este fix, cada falla del GH App token mintea generaba Sentry capture. Post-fix, solo el caso "secret existe pero contenido inválido" captura. El caso "ref corrupto" degrada silente — el signal upstream cubre la detección. NO se pierde observability total; se mueve a un canal más adecuado (drift signal vs incident capture).

## Pattern fuente

- TASK-742 Capa 1 — secret format validation (líneas 295-315 de `secret-manager.ts`).
- TASK-774 — reliability signal pattern (FX drift).
- TASK-844 Slice 5 — `cloud-run-silent-observability` signal pattern.

## Changelog

- 2026-05-12 (Claude Opus 4.7): task creada, S0 verde, S1 implementada y tests verde. Pendiente: S2 (env re-set) + S3 (orchestrator re-trigger).
