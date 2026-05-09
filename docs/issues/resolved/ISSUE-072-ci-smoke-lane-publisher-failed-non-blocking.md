# ISSUE-072 — CI smoke-lane publisher fallaba con warning non-blocking

## Ambiente

GitHub Actions `develop` / Playwright E2E smoke.

## Detectado

2026-05-09 — revisión de warnings en GitHub Actions tras push a `develop`.

## Síntoma

El workflow Playwright terminaba en verde, pero dejaba annotations:

```text
sync:smoke-lane finance.web failed (non-blocking).
sync:smoke-lane delivery.web failed (non-blocking).
sync:smoke-lane identity.web failed (non-blocking).
```

Esto impedía confiar en `greenhouse_sync.smoke_lane_runs` como fuente fresca para `test_lane` en el Reliability Control Plane. El warning Node.js 20 observado en el mismo workflow queda fuera de este issue y está cubierto por TASK-607.

## Causa raíz

El fallo tenía cuatro capas reales:

1. `pnpm sync:smoke-lane` ejecutaba `tsx scripts/publish-smoke-lane-run.ts` sin `scripts/lib/server-only-shim.cjs`. Al importar `src/lib/postgres/client.ts` -> Secret Manager -> `server-only`, el CLI fallaba fuera del runtime Next.js.
2. `.github/workflows/playwright.yml` enviaba `GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF=greenhouse-pg-dev-app-password:latest`. El resolver canónico acepta nombre de secreto o ruta completa `projects/.../secrets/.../versions/...`; `secret:version` no es formato válido y producía una ruta Secret Manager inválida.
3. `github-actions-deployer@efeonce-group.iam.gserviceaccount.com` no tenía `roles/cloudsql.client`, por lo que Cloud SQL Connector fallaba con `cloudsql.instances.get` denied.
4. Al corregir IAM, apareció presión transitoria de Postgres: `53300 remaining connection slots are reserved`. El cliente Postgres solo reintentaba algunos errores TLS/reset, no saturación de conexiones.

## Impacto

- Playwright podía pasar o fallar funcionalmente, pero el resultado no se publicaba a Postgres.
- El RCP podía quedar con filas antiguas o `awaiting_data` para lanes críticos.
- El ruido diario generaba "tapar goteras": cada corrida podía exponer otra capa del mismo contrato incompleto.

## Solución

Se resolvió en los contratos compartidos, no en un caller aislado:

- `package.json`: `sync:smoke-lane` ahora carga `tsx --require ./scripts/lib/server-only-shim.cjs`.
- `.github/workflows/playwright.yml`: usa `GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF=greenhouse-pg-dev-app-password` y `GREENHOUSE_POSTGRES_MAX_CONNECTIONS=1`.
- GCP IAM: `github-actions-deployer@efeonce-group.iam.gserviceaccount.com` recibió `roles/cloudsql.client`.
- `scripts/setup-github-actions-wif.sh`: versiona `roles/cloudsql.client` para que el setup idempotente no derive.
- `src/lib/postgres/client.ts`: trata errores transitorios de conexión (`53300`, `080xx`, `57P0x`, TLS/reset/too many connections) como retryable con backoff acotado y reset de pool.
- Documentación viva actualizada:
  - `.github/DEPLOY.md`
  - `project_context.md`
  - `docs/architecture/DECISIONS_INDEX.md`
  - `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
  - `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
  - `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
  - `docs/documentation/plataforma/reliability-control-plane.md`
  - `docs/documentation/plataforma/sistema-observabilidad-de-tests.md`
  - `docs/documentation/operations/postura-cloud-gcp.md`
  - `changelog.md`
  - `Handoff.md`

## Verificación

- `pnpm sync:smoke-lane finance.web --report=/tmp/greenhouse-missing-playwright-report.json` falla solo por `ENOENT`, no por `server-only`.
- `pnpm pg:doctor` OK con perfil runtime.
- `pnpm vitest run src/lib/postgres/client.test.ts` OK.
- `pnpm exec tsc --noEmit --pretty false` OK.
- Pre-push `pnpm lint` + `pnpm tsc --noEmit` OK.
- Playwright run `25605103310`:
  - `finance.web`: `status=passed total=36 passed=36 failed=0`
  - `delivery.web`: `status=passed total=36 passed=36 failed=0`
  - `identity.web`: `status=passed total=36 passed=36 failed=0`
  - sin annotations `sync:smoke-lane <lane> failed`.
- CI run `25605103305` OK: lint, tests, coverage y build.

## Estado

resolved (2026-05-09)

## Relacionado

- TASK-607 — warning Node.js 20 de GitHub Actions, fuera de scope de este issue.
- `src/lib/postgres/client.ts`
- `.github/workflows/playwright.yml`
- `scripts/setup-github-actions-wif.sh`
- `scripts/publish-smoke-lane-run.ts`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
