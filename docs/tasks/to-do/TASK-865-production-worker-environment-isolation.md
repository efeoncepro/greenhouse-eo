# TASK-865 — Production Worker Environment Isolation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Crítico`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Incidente diagnosticado`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-865-production-worker-environment-isolation`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Eliminar el drift donde workflows de workers ejecutados por `push` en `develop`
terminan mutando los mismos servicios Cloud Run que producción. Production
workers deben quedar aislados del flujo de staging/develop y solo cambiar via
`production-release.yml` (`workflow_call`) o break-glass explícito auditado.

Decision operativa clave: `develop` sigue siendo una rama rápida para iterar y
desarrollar. Esta task **no** debe convertir cada push a `develop` en un deploy
completo y costoso de los cuatro workers. El V1 preferido es bloquear cualquier
mutación accidental de producción desde `develop` y dejar Cloud Run staging como
opt-in/on-demand o follow-up con recursos separados.

## Why This Task Exists

El watchdog `Production Release Watchdog` falló el 2026-05-11 porque
`platform.release.worker_revision_drift` detectó que los cuatro workers Cloud
Run no servían el SHA del último manifest `released/degraded`.

La investigación mostró una contradicción de contrato:

- Los workflows dicen que `push:develop` despliega `staging`.
- Los deploy scripts usan los mismos nombres de servicio Cloud Run productivos:
  - `ops-worker`
  - `commercial-cost-worker`
  - `ico-batch-worker`
  - `hubspot-greenhouse-integration`
- Por lo tanto, un push a `develop` puede pisar el `GIT_SHA` de producción sin
  pasar por el orquestador ni actualizar `greenhouse_sync.release_manifests`.

Esto hace que el watchdog falle correctamente, pero el sistema vuelva a drift
después de releases sanos.

## Goal

- Hacer imposible que un `push:develop` modifique los servicios Cloud Run de
  producción.
- Mantener `develop` liviano: test/build/contract checks sí; deploy automático
  de workers a Cloud Run solo si existe un servicio staging separado, explícito
  y barato de operar.
- Definir de forma explícita si staging usa servicios Cloud Run separados,
  manual/on-demand, nightly, o si los deploys automáticos de staging quedan
  deshabilitados hasta que existan.
- Mantener production deploys orchestrator-only vía `workflow_call`.
- Actualizar tests anti-regresión para que no vuelvan a aceptar `push:develop`
  apuntando al servicio productivo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/operations/runbooks/production-release.md`
- `.codex/skills/greenhouse-production-release/SKILL.md`
- `.claude/skills/greenhouse-production-release/SKILL.md`

Reglas obligatorias:

- Nunca desplegar production workers por `push:develop`.
- Nunca desplegar production workers por `push:main`.
- No introducir un paso obligatorio lento en `develop` para desplegar todos los
  workers; `develop` prioriza iteración rápida.
- Production normal vive en `production-release.yml` via `workflow_call`.
- `workflow_dispatch environment=production` queda solo como break-glass.
- Si staging sigue existiendo, debe apuntar a recursos Cloud Run staging
  explícitos, o el workflow debe hacer validate-only/skip loud antes de mutar
  producción.
- No cambiar comportamiento funcional de los workers; el cambio es de
  aislamiento de release/deploy.

## Current Evidence

- Watchdog run `25687679157` (`main` SHA `644120d455c0...`) falló con
  `worker_revision_drift`.
- Manifest SSoT más reciente `released`:
  - `release_id=4591bd8b28c8-59a904d6-a13c-4769-ab0f-f64813ecff27`
  - `target_sha=4591bd8b28c8a18eb0aa15cfc8e092eeec814467`
  - `state=released`
  - `started_at=2026-05-11T12:46:25.525Z`
- Cloud Run observado después:
  - `ops-worker` servía `GIT_SHA=0f003e5971c7...` desde run `push develop`
  - `commercial-cost-worker` servía `GIT_SHA=0f003e5971c7...` desde run `push develop`
  - `ico-batch-worker` servía `GIT_SHA=42805d3e3dfd...`
  - `hubspot-greenhouse-integration` servía `GIT_SHA=df15cccb1d60...`
- Workflows afectados:
  - `.github/workflows/ops-worker-deploy.yml`
  - `.github/workflows/commercial-cost-worker-deploy.yml`
  - `.github/workflows/ico-batch-deploy.yml`
  - `.github/workflows/hubspot-greenhouse-integration-deploy.yml`
- Deploy scripts afectados:
  - `services/ops-worker/deploy.sh`
  - `services/commercial-cost-worker/deploy.sh`
  - `services/ico-batch/deploy.sh`
  - `services/hubspot_greenhouse_integration/deploy.sh`
- Test actual que cristaliza el drift:
  - `src/lib/release/concurrency-fix-verification.test.ts` exige
    `push:develop` preserved, pero no verifica que staging use un servicio
    distinto de producción.

## Dependencies & Impact

### Depends on

- TASK-848 / TASK-849 / TASK-851 cerradas.
- TASK-861 cerrada, pero insuficiente para este problema porque solo endureció
  HubSpot dentro del detector/runbook, no aisló staging/prod.

### Blocks / Impacts

- Bloquea releases limpios: aunque un release quede `released`, cualquier push
  posterior a `develop` puede volver a generar drift.
- Impacta los cuatro workers Cloud Run.
- No debe tocar lógica de negocio, handlers, sync o integraciones externas.

### Files owned

- `.github/workflows/ops-worker-deploy.yml`
- `.github/workflows/commercial-cost-worker-deploy.yml`
- `.github/workflows/ico-batch-deploy.yml`
- `.github/workflows/hubspot-greenhouse-integration-deploy.yml`
- `services/ops-worker/deploy.sh`
- `services/commercial-cost-worker/deploy.sh`
- `services/ico-batch/deploy.sh`
- `services/hubspot_greenhouse_integration/deploy.sh`
- `src/lib/release/concurrency-fix-verification.test.ts`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/operations/runbooks/production-release.md`
- `.codex/skills/greenhouse-production-release/SKILL.md`
- `.claude/skills/greenhouse-production-release/SKILL.md`
- `Handoff.md`
- `changelog.md`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Environment-to-Service Contract

- Auditar si existen servicios staging reales para los cuatro workers.
- Si no existen, elegir la ruta menos costosa para `develop`:
  - V1 recomendado: `push:develop` ejecuta validate-only/summary y **no** hace
    `gcloud run deploy`.
  - Manual/on-demand staging deploy solo por `workflow_dispatch environment=staging`
    cuando el operador realmente lo necesite.
  - Crear servicios `*-staging` explícitos solo si Discovery demuestra que el
    costo/latencia/operación son aceptables y no convierten cada iteración en
    release-like.
- Documentar la decisión en arquitectura/runbook.

### Slice 2 — Workflow Guardrails

- Hacer que `push:develop` no pueda mutar servicios productivos.
- Mantener `workflow_call environment=production` para orquestador.
- Mantener `workflow_dispatch environment=production` solo break-glass.
- Agregar summary/notice claro cuando `push:develop` sea validate-only o cuando
  un deploy staging sea omitido por falta de servicio staging explícito.

### Slice 3 — Deploy Script Safety

- Agregar resolver canónico de service name por `ENV`.
- Si `ENV=staging` resuelve al mismo `SERVICE_NAME` productivo, fallar loud
  antes de `gcloud builds submit` o `gcloud run deploy`.
- Preservar nombres productivos para `ENV=production`.

### Slice 4 — Tests Anti-Regresión

- Actualizar `concurrency-fix-verification.test.ts`:
  - `push:main` no permitido.
  - `push:develop` permitido solo si no apunta a production service.
  - staging shared-service sin guard loud debe fallar.
- Agregar tests unitarios o fixture-based para service resolver si se crea.

### Slice 5 — Docs, Skills y Handoff

- Actualizar arquitectura, runbook y skills de release.
- Registrar incidente y decisión en `Handoff.md`.
- Actualizar `changelog.md` por cambio del protocolo de deploy.

## Out of Scope

- No cambiar lógica funcional de workers.
- No cambiar endpoints HubSpot ni contrato del bridge.
- No promover a producción.
- No aprobar gates de producción.
- No editar `greenhouse_sync.release_manifests` por SQL.

## Acceptance Criteria

- [ ] Un push a `develop` no puede cambiar `GIT_SHA` de los cuatro servicios
      Cloud Run productivos.
- [ ] Un push a `develop` no queda obligado a desplegar los cuatro workers; el
      default V1 es rápido y no muta Cloud Run si no hay staging aislado.
- [ ] Production workers solo cambian por `production-release.yml` o por
      break-glass explícito `workflow_dispatch environment=production`.
- [ ] Tests fallan si un workflow vuelve a permitir staging/develop sobre
      servicios productivos sin aislamiento.
- [ ] Watchdog `worker_revision_drift` queda estable después de un release sano
      y pushes posteriores a `develop`.
- [ ] Docs/skills reflejan que staging Cloud Run necesita recursos separados o
      no existe como deploy automático.

## Verification

- `pnpm vitest run src/lib/release/concurrency-fix-verification.test.ts`
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `GITHUB_RELEASE_OBSERVER_TOKEN="$(gh auth token)" pnpm release:watchdog --json`
- Verificación Cloud Run:
  - `gcloud run services describe ops-worker --region=us-east4`
  - `gcloud run services describe commercial-cost-worker --region=us-east4`
  - `gcloud run services describe ico-batch-worker --region=us-east4`
  - `gcloud run services describe hubspot-greenhouse-integration --region=us-central1`

## Closing Protocol

- [ ] `Lifecycle` sincronizado.
- [ ] `docs/tasks/README.md` sincronizado.
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` sincronizado.
- [ ] `Handoff.md` actualizado con evidencia del incidente.
- [ ] `GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` actualizado.
- [ ] Skills Codex/Claude de release actualizadas.
- [ ] `changelog.md` actualizado.

## Follow-ups

- Si se crean servicios `*-staging`, abrir task separada para DNS/URLs,
  schedulers y secrets staging por servicio si el scope crece.
- Si el equipo decide no tener Cloud Run staging, documentar que staging de
  workers es preflight/test-only hasta nuevo contrato.
- Si un dominio necesita validar worker runtime real antes de production, usar
  dispatch manual/on-demand o nightly por worker, no gatear todo `develop`.

## Delta 2026-05-11

Task creada tras diagnosticar que el watchdog fallaba por drift real causado
por deploys de workers desde `develop` hacia los mismos servicios Cloud Run
que production. Separada de TASK-864 porque TASK-864 arregla el doctor/preflight
del control plane, mientras esta task corrige aislamiento de runtime deploy.

## Open Questions

- ¿Staging debe tener servicios Cloud Run separados ahora, o se deshabilita
  `push:develop` para workers hasta diseñar staging Cloud Run V1?
  - Recomendación inicial: crear guard loud inmediato y, si no existen servicios
    staging, no desplegar staging sobre producción. La creación de `*-staging`
    puede ser Slice 1 si Discovery confirma que secrets/schedulers/URLs están
    listos sin scope creep.
