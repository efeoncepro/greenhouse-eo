# TASK-864 — Production Readiness Control Plane Contract

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-864-production-readiness-control-plane-contract`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Endurecer el release a produccion separando el **Control Plane Doctor** del
**Product Release Preflight**. Produccion solo puede avanzar cuando el sistema
que observa y ejecuta el release esta sano, y cuando el SHA objetivo pasa todos
los checks obligatorios con `readyToDeploy=true`.

## Why This Task Exists

El incidente operativo del 2026-05-11 mostro que `production-release.yml` ya
bloquea correctamente `readyToDeploy=false`, pero el preflight mezcla tres
clases de falla: codigo/producto, infraestructura de deploy y observabilidad del
gate. Eso hace que releases sanos se vean como rotos cuando falta un token/WIF,
o que una fuente `unknown` obligue a diagnostico manual justo al promover.

La solucion robusta no es agregar mas bypasses ni confiar en el entorno local.
El release necesita un contrato explicito: primero demostrar que el control
plane puede observar GitHub, Vercel, GCP, Azure, Sentry y Postgres; despues
evaluar si el SHA concreto puede ir a produccion.

## Goal

- Crear un `release:doctor` canonico para validar credenciales, WIF, permisos y
  conectividad del control plane antes de cualquier preflight de producto.
- Hacer que `production-release.yml` falle temprano cuando el control plane no
  sea observable, con causa clara y artefacto JSON.
- Mantener `release:preflight` enfocado en el SHA objetivo y sin depender de
  tokens locales ni de reruns manuales como parte normal del flujo.
- Agregar un watchdog/schedule del doctor para detectar drift de credenciales
  antes de un release real.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`

Reglas obligatorias:

- `readyToDeploy=true` solo puede existir si todos los checks obligatorios
  llegaron a `severity='ok'` y `status='ok'`.
- El preflight autoritativo para produccion vive en GitHub Actions/orquestador;
  el preflight local es diagnostico.
- `unknown`, `warning`, `timeout`, `not_configured` o `error` bloquean produccion
  en modo `--fail-on-error`.
- No agregar bypasses silenciosos ni degradar fuentes obligatorias a warning para
  permitir deploy.
- No crear secrets nuevos sin documentar ownership, rotacion y verificacion.
- No tocar runtime funcional del producto ni workers de negocio salvo que el
  discovery demuestre que el bug vive ahi.

## Normative Docs

- `docs/operations/runbooks/production-release.md`
- `docs/operations/runbooks/production-release-watchdog.md`
- `docs/manual-de-uso/plataforma/release-preflight.md`
- `docs/manual-de-uso/plataforma/release-orchestrator.md`
- `docs/manual-de-uso/plataforma/release-watchdog.md`
- `.codex/skills/greenhouse-production-release/SKILL.md`
- `.claude/skills/greenhouse-production-release/SKILL.md`

## Dependencies & Impact

### Depends on

- TASK-848 / TASK-849 / TASK-850 / TASK-851 / TASK-853 / TASK-854 cerradas.
- TASK-861 follow-up ya endurecio `--fail-on-error` para no avanzar con
  `readyToDeploy=false`.
- Scripts existentes:
  - `scripts/release/production-preflight.ts`
  - `scripts/release/production-release-watchdog.ts`
  - `scripts/pg-doctor.ts`
  - `scripts/gcp-auth-doctor.ts`
- Checks existentes:
  - `src/lib/release/preflight/checks/*.ts`
  - `src/lib/release/preflight/composer.ts`
  - `src/lib/release/preflight/registry.ts`

### Blocks / Impacts

- Reduce falsos bloqueos y diagnostico manual durante release a `main`.
- Hace visible cuando el problema es el control plane y no el codigo del portal.
- Debe actualizar skills/runbooks porque cambia el flujo critico de produccion.

### Files owned

- `scripts/release/production-control-plane-doctor.ts` (nuevo)
- `src/lib/release/control-plane-doctor/**` (nuevo)
- `src/lib/release/preflight/**` (solo si discovery demuestra drift de contrato)
- `.github/workflows/production-release.yml`
- `.github/workflows/production-release-watchdog.yml`
- `.github/workflows/production-release-control-plane-doctor.yml` (nuevo si aplica)
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/operations/runbooks/production-release.md`
- `docs/operations/runbooks/production-release-watchdog.md`
- `docs/manual-de-uso/plataforma/release-preflight.md`
- `.codex/skills/greenhouse-production-release/SKILL.md`
- `.claude/skills/greenhouse-production-release/SKILL.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- `pnpm release:preflight` produce `ProductionPreflightV1` y falla con
  `--fail-on-error` cuando `readyToDeploy=false`.
- `production-release.yml` corre preflight antes de mutar manifests/deploys.
- `production-release-watchdog.yml` corre cada 30 minutos y detecta drift de
  approvals, pending runs y worker revisions.
- `release-worker-revision-drift.ts` usa `greenhouse_sync.release_manifests`
  como SSoT y fallback a GitHub API si Postgres no esta disponible.
- `release:watchdog` ya emite JSON y artifact `watchdog-output.json`.

### Gap

- No existe un `release:doctor` separado para validar que GitHub/Vercel/GCP/
  Azure/Sentry/Postgres son observables antes del preflight de producto.
- Algunos checks de `release:preflight` siguen mezclando "producto no listo" con
  "control plane no observable".
- El schedule actual detecta worker drift, pero no alerta de forma separada si
  el control plane perdio tokens/permisos antes de un release.
- El runbook aun no distingue claramente remediation de control-plane failure vs
  product-release failure.

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

### Slice 1 — Control Plane Doctor Contract

- Definir contrato versionado `ProductionControlPlaneDoctorV1`.
- Checks obligatorios:
  - GitHub Actions/API observable para repo `efeoncepro/greenhouse-eo`.
  - Vercel API token presente y con acceso al proyecto `greenhouse-eo`.
  - GCP WIF usable para Cloud Run + Secret Manager + Cloud SQL Connector.
  - Azure WIF usable para deployment health; Graph list puede ser evidencia
    adicional, no requisito si `az account show` prueba identidad.
  - Sentry incidents API observable.
  - Postgres reachable via Cloud SQL Connector y secret ref.
- Output JSON con `controlPlaneReady`, `checks[]`, `degradedSources[]`,
  `recommendedActions[]`.

### Slice 2 — CLI `release:doctor`

- Agregar script `pnpm release:doctor`.
- Soportar flags:
  - `--json`
  - `--fail-on-error`
  - `--output-file=<path>`
- Reusar helpers existentes (`github-helpers`, `resolveSecretByRef`,
  `createGoogleAuth`, Cloud SQL Connector) antes de crear paths paralelos.
- Tests unitarios para composer/exit policy/checks puros.

### Slice 3 — Orchestrator Wiring

- Modificar `production-release.yml` para correr `release:doctor` antes de
  `release:preflight`.
- Subir artifact JSON del doctor y summary legible.
- Si doctor falla, no ejecutar `record-started`, approval gate ni deploys.
- Mantener `release:preflight` enfocado en el target SHA.

### Slice 4 — Scheduled Doctor / Watchdog Integration

- Agregar workflow scheduled del doctor o integrar job separado dentro de
  `production-release-watchdog.yml` sin mezclar sus exit semantics.
- El schedule debe diferenciar:
  - `control_plane_unobservable`
  - `product_release_drift`
  - `worker_revision_drift`
- Mantener dedup de alertas Teams; no spammear si la causa no cambio.

### Slice 5 — Docs, Skills y ADR

- Agregar ADR o delta claro en
  `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`:
  "Production readiness is orchestrator-authoritative".
- Actualizar runbooks/manuales/skills para explicar:
  - doctor = salud del sistema que observa/ejecuta release.
  - preflight = salud del SHA producto.
  - watchdog = drift posterior y checks scheduled.
- Actualizar `Handoff.md` y `changelog.md`.

## Out of Scope

- No promover a produccion.
- No aprobar gates de produccion.
- No modificar workers de negocio salvo bug probado en el detector.
- No cambiar schemas de `release_manifests` salvo que Discovery demuestre
  necesidad y exista migracion canonica.
- No introducir UI nueva; dashboard queda follow-up si emerge.

## Detailed Spec

### Contrato esperado

```ts
interface ProductionControlPlaneDoctorV1 {
  contractVersion: 'production-control-plane-doctor.v1'
  startedAt: string
  completedAt: string
  durationMs: number
  controlPlaneReady: boolean
  overallStatus: 'healthy' | 'blocked' | 'unknown'
  checks: readonly ProductionControlPlaneDoctorCheck[]
  degradedSources: readonly ProductionControlPlaneDoctorDegradedSource[]
  recommendedActions: readonly string[]
}
```

### Politica de gate

- `controlPlaneReady=true` solo si todos los checks obligatorios son `ok`.
- `--fail-on-error` retorna exit 1 si `controlPlaneReady=false`.
- El orquestador debe tratar `release:doctor` fail como bloqueo previo al release,
  no como release degradado.

### Checks obligatorios iniciales

| Check | Evidencia minima | Falla bloquea |
| --- | --- | --- |
| `github_actions_api` | listar runs para repo y SHA conocido | Si |
| `vercel_project_access` | project/deployment inspect accesible | Si |
| `gcp_wif_runtime` | auth + secret access + Cloud Run describe | Si |
| `postgres_connector` | query `SELECT 1` via Connector | Si |
| `azure_wif_runtime` | `az account show` despues de login | Si |
| `sentry_incidents_api` | query incidents o releases scope | Si |

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `pnpm release:doctor --json --fail-on-error` existe y falla si cualquier
      fuente obligatoria del control plane no es observable.
- [ ] `production-release.yml` ejecuta `release:doctor` antes de `release:preflight`
      y no muta manifiestos/deploys si doctor falla.
- [ ] `release:preflight` queda documentado como SHA/product preflight, no como
      health check de credenciales del control plane.
- [ ] El schedule/watchdog detecta drift de credenciales/permisos sin depender de
      un release activo.
- [ ] Logs y artifacts distinguen claramente "control plane failure" vs
      "product release failure".
- [ ] Skills de Codex y Claude quedan actualizadas si cambia el flujo critico.

## Verification

- `pnpm vitest run src/lib/release/control-plane-doctor/**/*.test.ts src/lib/release/preflight/**/*.test.ts`
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm release:doctor --json --fail-on-error`
- `gh workflow run production-release-control-plane-doctor.yml --ref develop` si se agrega workflow nuevo
- `gh workflow run production-release.yml --ref main -f target_sha=<sha> -f force_infra_deploy=false` solo con aprobacion explicita del usuario

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress`
      al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o
      validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o
      protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` incluye el delta
      de contrato doctor/preflight/watchdog
- [ ] `.codex/skills/greenhouse-production-release/SKILL.md` y
      `.claude/skills/greenhouse-production-release/SKILL.md` reflejan el flujo nuevo

## Follow-ups

- Dashboard `/admin/releases` podria mostrar el ultimo doctor run como card
  separada. No bloquear V1.
- Si `release:doctor` encuentra permisos cloud insuficientes repetidos, abrir
  task separada de IAM least-privilege cleanup.

## Delta 2026-05-11

Task creada tras incidente operativo donde el usuario exigio que preflight no
dependa de suerte, tokens locales ni observabilidad parcial para pasar a
produccion.

## Open Questions

Ninguna bloqueante. El agente que ejecute debe resolver durante Discovery si el
schedule vive en un workflow nuevo o como job separado dentro de
`production-release-watchdog.yml`; decision esperada: separar exit semantics si
reduce ambiguedad operativa.
