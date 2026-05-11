# TASK-861 — HubSpot Production Release Drift Hardening

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Shipped`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `none`
- Branch: `develop` (override explicito del usuario; no crear branch)
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Fortalece el contrato de release productivo del worker `hubspot-greenhouse-integration` para que no pueda quedar atras silenciosamente cuando el release canonico cambia de SHA. La task no rediseña el flujo global de produccion ni remueve `push:main`; se enfoca en tests, watchdog/remediation y documentacion operativa del caso HubSpot.

## Why This Task Exists

El incidente del 2026-05-11 mostro que HubSpot puede quedar en una revision anterior aunque otros workers avancen, no porque falle al desplegar, sino porque su workflow de `push` tiene path filters estrechos y el release global puede cambiar el SHA canonico sin tocar `services/hubspot_greenhouse_integration/**`.

Diagnostico verificado:

- El workflow HubSpot solo escucha cambios en `.github/workflows/hubspot-greenhouse-integration-deploy.yml` y `services/hubspot_greenhouse_integration/**`.
- Cuando se invoca explicita o via orchestrator, HubSpot despliega y smokea correctamente.
- `platform.release.worker_revision_drift` ya incluye HubSpot, pero el contrato anti-regresion de workflows no cubre HubSpot en `WORKER_WORKFLOWS`.
- La remediation correcta del drift confirmado fue correr `hubspot-greenhouse-integration-deploy.yml` con `environment=production` y `expected_sha=<target_sha>`, seguido por watchdog OK.

## Goal

- Incluir HubSpot en los tests de contrato release/worker para evitar drift documental o YAML no cubierto.
- Hacer que el watchdog/remediation para drift de HubSpot sea explicito, accionable y facil de ejecutar sin tocar manualmente `release_manifests`.
- Corregir documentacion viva que todavia sugiera estados de test/deploy obsoletos del bridge HubSpot.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `AGENTS.md`
- `project_context.md`
- `Handoff.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/operations/runbooks/production-release.md`
- `docs/manual-de-uso/plataforma/release-orchestrator.md`
- `docs/manual-de-uso/plataforma/release-watchdog.md`
- `services/hubspot_greenhouse_integration/README.md`

Reglas obligatorias:

- No cambiar el flujo global de produccion ni remover `push:main` de los workers en esta task.
- No mutar manualmente `greenhouse_sync.release_manifests`; el manifest sigue siendo SSoT append-only.
- No crear un path paralelo de deploy HubSpot; reutilizar `.github/workflows/hubspot-greenhouse-integration-deploy.yml`.
- No degradar HubSpot a sidecar opcional sin ADR de negocio y cambio explicito del release control plane.
- Si hay drift confirmado, remediation canonica = workflow HubSpot con `expected_sha=<release target_sha>` + smoke + watchdog.

## Normative Docs

- `.codex/skills/hubspot-greenhouse-bridge/SKILL.md`
- `.codex/skills/greenhouse-production-release/SKILL.md`
- `.claude/skills/greenhouse-production-release/SKILL.md`

## Dependencies & Impact

### Depends on

- `TASK-848` — Release Control Plane V1/V1.1.
- `TASK-849` — Watchdog + `platform.release.worker_revision_drift`.
- `TASK-851` — Orchestrator + worker `workflow_call` + `expected_sha`.
- `TASK-857` — GitHub webhook evidence ingestion, sin reemplazar watchdog.

### Blocks / Impacts

- Produccion release operations.
- HubSpot write bridge Cloud Run.
- Futuras decisiones sobre si workers productivos deben responder o no a `push:main`.

### Files owned

- `.github/workflows/hubspot-greenhouse-integration-deploy.yml`
- `.github/workflows/production-release.yml`
- `src/lib/release/concurrency-fix-verification.test.ts`
- `src/lib/release/workflow-allowlist.ts`
- `src/lib/release/workflow-allowlist.test.ts`
- `src/lib/reliability/queries/release-worker-revision-drift.ts`
- `scripts/release/production-release-watchdog.ts`
- `services/hubspot_greenhouse_integration/README.md`
- `docs/operations/runbooks/production-release.md`
- `docs/manual-de-uso/plataforma/release-watchdog.md`
- `.codex/skills/greenhouse-production-release/SKILL.md`
- `.claude/skills/greenhouse-production-release/SKILL.md`

## Current Repo State

### Already exists

- HubSpot deploy workflow con `push`, `workflow_dispatch`, `workflow_call`, `expected_sha`, `skip_tests` y smoke `/health` + `/contract`.
- `services/hubspot_greenhouse_integration/deploy.sh` inyecta `GIT_SHA=<EXPECTED_SHA>` y verifica la revision Cloud Run post-deploy.
- `src/lib/release/workflow-allowlist.ts` mapea `HubSpot Greenhouse Integration Deploy` a Cloud Run service `hubspot-greenhouse-integration` en `us-central1`.
- `src/lib/reliability/queries/release-worker-revision-drift.ts` compara el SHA canonico de `release_manifests` contra `GIT_SHA` de cada worker, incluyendo HubSpot.
- Watchdog manual post-remediation `25672721055` confirmo `4/4 workers synced` en `4591bd8b28c8a18eb0aa15cfc8e092eeec814467`.

### Gap

- `src/lib/release/concurrency-fix-verification.test.ts` cubre ops/commercial/ICO, pero no HubSpot, aunque HubSpot participa en el orchestrator y en drift detection.
- La remediation HubSpot existe como conocimiento operacional, pero no esta suficientemente codificada como contrato accionable en watchdog/runbook/skills.
- `services/hubspot_greenhouse_integration/README.md` contiene estado historico de tests que puede estar desactualizado frente al workflow actual.
- El problema real es acoplamiento de release insuficientemente visible, no fallo runtime del bridge.

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

### Slice 1 — Workflow Contract Coverage

- Incluir `.github/workflows/hubspot-greenhouse-integration-deploy.yml` en los tests anti-regresion de worker workflows.
- Verificar que HubSpot conserva:
  - `workflow_call.inputs.environment`
  - `workflow_call.inputs.expected_sha`
  - `workflow_call.inputs.skip_tests`
  - `secrets.GCP_WORKLOAD_IDENTITY_PROVIDER`
  - `workflow_dispatch.inputs.expected_sha`
  - `workflow_dispatch.inputs.environment`
  - `concurrency.cancel-in-progress` para production path
- Agregar assertion explicita de que `production-release.yml` sigue invocando `deploy-hubspot-integration` con `environment=production` y `expected_sha=${{ inputs.target_sha }}`.

### Slice 2 — HubSpot Drift Remediation Contract

- Reforzar `platform.release.worker_revision_drift` o el watchdog para que la evidencia de HubSpot drift incluya accion recomendada concreta:
  - workflow a ejecutar
  - `environment=production`
  - `expected_sha=<release target_sha>`
  - `skip_tests=false` salvo break-glass documentado
  - verificacion posterior `/health`, `/contract`, watchdog `drift_count=0`
- Agregar tests del caso `hubspot-greenhouse-integration` drifted mientras los otros workers estan synced.
- Mantener la semantica actual: drift confirmado = severity `error`/watchdog aggregate no-OK; no convertir HubSpot en warning ni sidecar.

### Slice 3 — Documentation & Skill Alignment

- Actualizar `services/hubspot_greenhouse_integration/README.md` para reflejar el estado real del workflow/test suite actual y separar historia pre-cutover de estado vigente.
- Actualizar `docs/operations/runbooks/production-release.md` con una seccion corta "HubSpot drift recovery" que prohiba SQL directo y use el workflow canonico.
- Actualizar `.codex/skills/greenhouse-production-release/SKILL.md` y `.claude/skills/greenhouse-production-release/SKILL.md` con el mismo recovery path.
- Documentar explicitamente que esta task NO cambia `push:main`; cualquier decision de orquestador-only para todos los workers requiere ADR/task separada.

## Out of Scope

- Remover `push:main` de cualquier worker workflow.
- Redisenar Vercel production deployment o alias promotion.
- Cambiar el estado de `release_manifests` via SQL manual.
- Crear capabilities nuevas.
- Cambiar HubSpot a componente sidecar/degraded opcional.
- Cambiar region `us-central1` o URL publica del bridge HubSpot.

## Detailed Spec

### Diagnostico fuente

El 2026-05-11 se observo:

- `hubspot-greenhouse-integration` podia desplegar correctamente al SHA objetivo cuando se invocaba `workflow_dispatch` con `expected_sha`.
- El workflow manual `25672532306` desplego `hubspot-greenhouse-integration-00057-np9`, smokeo `/health` + `/contract` y dejo `GIT_SHA=4591bd8b28c8a18eb0aa15cfc8e092eeec814467`.
- Watchdog `25672721055` quedo `aggregateSeverity=ok` con `4/4 workers synced`.
- La causa raiz operacional fue un release no orquestado correctamente y un HubSpot workflow path-filtered que no corrio automaticamente en el lote.

### Decision arquitectonica de esta task

Aplicar hardening especifico de HubSpot primero. No mover todavia la frontera global de deploy de todos los workers. Esta decision es reversible y reduce blast radius: fortalece deteccion, tests y recovery sobre el componente que quedo atras sin alterar la semantica normal de produccion.

### Self-critique obligatoria al ejecutar

El agente que tome la task debe responder en `plan.md`:

- Que falla en 12 meses si agregamos un quinto worker y no actualizamos tests?
- Que falla en 36 meses si Vercel sigue auto-deployando desde `main` y workers mantienen dual path?
- Donde queda la deuda cognitiva para agentes futuros?
- Que parte del incidente queda observable vs silenciosa despues de esta task?

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] HubSpot queda incluido en los tests de contrato worker workflow sin reducir cobertura de ops/commercial/ICO.
- [x] Existe test que falla si `production-release.yml` deja de invocar HubSpot con el `expected_sha` del release.
- [x] Watchdog o reader de drift entrega remediation accionable para HubSpot cuando `GIT_SHA` no matchea el `target_sha` canonico.
- [x] Existe test del caso HubSpot drifted contra manifest canonico.
- [x] Runbook + skills Codex/Claude documentan el recovery canonico sin SQL directo.
- [x] README del bridge HubSpot refleja estado vigente y no induce a pensar que la suite actual esta rota si el workflow esta verde.
- [x] La task no remueve `push:main`, no cambia Vercel y no degrada HubSpot a sidecar.

## Verification

- `pnpm test -- src/lib/release/concurrency-fix-verification.test.ts src/lib/release/workflow-allowlist.test.ts`
- `pnpm test -- src/lib/reliability/queries/release-worker-revision-drift.test.ts` si existe o se crea/actualiza una suite dedicada.
- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- Validacion manual read-only:
  - `gh run list --workflow hubspot-greenhouse-integration-deploy.yml --limit 5`
  - `gcloud run services describe hubspot-greenhouse-integration --project=efeonce-group --region=us-central1 --format='value(status.latestReadyRevisionName)'`
  - `curl https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app/health`

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [x] se dejo explicito si se recomendo abrir una ADR/task separada para orchestrator-only worker deploys

## Follow-ups

- Posible ADR/task separada: decidir si todos los Cloud Run workers productivos deben dejar de desplegar por `push:main` y moverse solo por `production-release.yml`.
- Posible V2: control de Vercel production promotion desde el orchestrator para atomicidad mas fuerte.

## Delta 2026-05-11

Task creada desde diagnostico post-incidente HubSpot drift. Decision: hardening acotado antes de cualquier cambio global de release semantics.

## Delta 2026-05-11 — Shipped

- Tests de workflow contract ahora cubren los 4 workers Cloud Run, incluyendo HubSpot.
- `production-release.yml` queda cubierto por test para asegurar que HubSpot recibe `expected_sha=${{ inputs.target_sha }}`.
- `platform.release.worker_revision_drift` agrega evidencia `recommended_action` cuando el drift confirmado corresponde a `hubspot-greenhouse-integration`.
- Watchdog Teams usa `recommended_action` desde evidence cuando existe, en vez de recomendar `gh run cancel` genericamente para drift.
- README, runbook, manual watchdog y skills Codex/Claude documentan recovery HubSpot con `skip_tests=false`, smoke `/health` + `/contract` y watchdog `drift_count=0`.
- No se modifico el runtime del bridge HubSpot: sin cambios en rutas, handlers, payloads, webhooks, secretos, region, deploy script ni cliente TS.
