# ISSUE-111 — Flake de tests en CI/ci-deep bloqueó el preflight de un release productivo (2 veces)

## Ambiente

CI (GitHub Actions) — workflows `CI` (job `Fast feedback and conditional build`, step `Test`) y `CI Deep Verification` (job `Coverage and deep test observability`, step `Coverage` = `pnpm test:coverage`). Sobre el merge commit `1ac49552daf75405efa58cee114deb9c34be86bb` (release develop→main 2026-06-30).

## Detectado

2026-06-30, durante una promoción a producción vía el slash command `/release` (orquestador `production-release.yml`). El preflight (`ci_green`) abortó el orquestador **dos veces seguidas** porque CI y ci-deep estaban en `failure` sobre el merge commit.

## Síntoma

- `CI` y `CI Deep Verification` fallaron sobre `1ac49552d`. Resumen de vitest (step "Test observability summary"): **`1243 archivos / 1242 passed / 1 failed`** y **`8709 tests / 8602 passed / 3 failed`** — es decir **1 archivo de test con 3 tests fallando**.
- El **mismo árbol** (`d0d4b70b0`, develop HEAD) había pasado `CI` + Playwright smoke verde ~40 min antes. ci-deep nunca corre en develop (solo `push:main` + schedule), así que no había baseline.
- Al **re-correr** ambos jobs sobre el mismo commit (`gh run rerun --failed`), **pasaron verdes** → flake no-determinista confirmado.
- El log mostraba ruido de stderr Vertex (`Permission 'aiplatform.endpoints.predict' denied`, `Model overloaded`) que es un **red herring**: en `src/lib/nexa/nexa-service.test.ts` esos errores son **mocks intencionales** (`mockGenerateContent.mockRejectedValue(...)`) y esos tests pasan. No son la causa.

## Causa raíz

**No identificada con precisión.** El detalle del fallo (qué archivo/3 tests) no se imprime al stdout del job — vitest reporta el detalle vía artifact de resultados, y solo el conteo agregado llega al log de consola. El comportamiento (falla 1 vez, pasa en re-run sobre el mismo SHA) es consistente con un flake no-determinista: timeout/orden/paralelismo, o contención de recursos bajo `test:coverage` (instrumentación de coverage es más pesada y lenta). Precedente del mismo bug class: `ISSUE-052` (CI `test:coverage` flake por `testTimeout` default 5000ms).

## Impacto

- Bloqueó el preflight del orquestador 2 veces → 2 re-runs de CI/ci-deep (~20 min extra) + fricción operativa significativa durante un release productivo.
- No afectó producción: el preflight bloquea **antes** de mutar el ecosistema (workers/manifest). El frontend Vercel ya estaba live (auto-deploy en push), pero idéntico a develop verde.
- Riesgo recurrente: cualquier release futuro puede volver a trabarse en el preflight por este flake mientras no se aísle.

## Solución

Propuesta (follow-up, fuera del release que lo destapó):

1. **Aislar el test/archivo flaky**: descargar el artifact de resultados del attempt fallido (o reproducir local con `pnpm test:coverage` + repetición/seed) para nombrar los 3 tests.
2. Según la causa:
   - timeout → subir `testTimeout` del caso o global (patrón ISSUE-052);
   - orden/paralelismo → fijar aislamiento (mocks/cleanup entre tests, `vi.clearAllMocks`, estado compartido);
   - contención bajo coverage → ajustar concurrencia/pool de vitest en el job de coverage.
3. Considerar un **retry acotado** para el job de coverage (flake backstop) sin enmascarar fallos reales.

## Verificación

Pendiente. Criterio de cierre: el archivo identificado corre verde N veces seguidas bajo `pnpm test:coverage` (local + CI), y no reaparece en `main`/`ci-deep` en los siguientes releases.

## Estado

`open` — follow-up. No bloqueante una vez que CI/ci-deep quedan verdes por re-run.

## Relacionado

- Release que lo destapó: `release_id=1ac49552daf7-164b6042-42b5-480f-8f3a-99f58d9aae75` (develop→main `1ac49552d`, 2026-06-30).
- Precedente del bug class: `ISSUE-052` (CI `test:coverage` flake HrLeaveView timeout).
- Distinto del false-positive del watchdog `worker_revision_drift` (ops-worker GIT_SHA label stale por deploy-skip) → ese es `TASK-920`.
