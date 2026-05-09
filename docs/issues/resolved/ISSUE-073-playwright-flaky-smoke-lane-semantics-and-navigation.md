# ISSUE-073 — Playwright flaky smoke-lane semantics and transient navigation timeouts

## Ambiente

GitHub Actions / Playwright E2E smoke (`develop`)

## Detectado

2026-05-09, revisión post-run del workflow Playwright `25606031281`.

## Síntoma

El workflow Playwright terminaba exitoso con `33 passed, 3 flaky`, pero el publisher registraba `status=failed total=36 passed=33 failed=3` en `greenhouse_sync.smoke_lane_runs`. En paralelo, los 3 flaky provenían de `page.goto` timeouts transitorios en `cron-staging-parity` y `login-session`, resueltos por retry del runner.

## Causa raíz

1. `scripts/publish-smoke-lane-run.ts` leía solo `test.results[0]`. Cuando Playwright reintentaba y el último intento pasaba, el publisher seguía contando el primer intento fallido como falla final.
2. Los smoke tests usaban `page.goto` directo o una fixture sin retry local ante cold-start/red transitoria. Eso trasladaba timeouts recuperables al retry global de Playwright, generando flakiness diaria.

## Impacto

La Reliability UI podía interpretar una suite verde como lane fallida, degradando confianza operacional y creando ruido falso. Los timeouts transitorios no rompían producto, pero sí consumían retries y hacían menos confiable el gate de staging.

## Solución

- Se creó `scripts/lib/smoke-lane-report.ts` como parser canónico del reporte Playwright.
- La semántica ahora es: último intento fallido = `failed`; intento fallido seguido de último intento `passed` = `flaky`; `flaky` no suma a `failed_tests`.
- `pnpm sync:smoke-lane` loguea `flaky=<n>` y persiste `status='flaky'` cuando no quedan fallas finales.
- `tests/e2e/fixtures/auth.ts` expone `gotoWithTransientRetries` con retry acotado solo para errores transitorios de navegación, y `gotoAuthenticated` lo reutiliza. Fallos HTTP, auth y asserts siguen fallando loud.
- `login-session.spec.ts` deja de usar `page.goto` crudo para las navegaciones afectadas.

## Verificación

- `pnpm test scripts/lib/smoke-lane-report.test.ts`
- Parseo del artifact real de Playwright `25606031281`: los 3 casos `failed -> passed` se clasifican como `flaky`, no como `failed`.
- Playwright post-push debe publicar `failed=0 flaky=<n>` si la suite termina verde con retries.

## Estado

resolved

## Relacionado

- TASK-607
- ISSUE-072
- `scripts/lib/smoke-lane-report.ts`
- `tests/e2e/fixtures/auth.ts`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
