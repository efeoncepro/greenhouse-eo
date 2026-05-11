# TASK-866 — Release Deployment Plan V2: Impact-Aware Worker Deploys

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-865`
- Branch: `task/TASK-866-release-deployment-plan-v2-impact-aware-workers`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Evolucionar el Production Release Orchestrator desde "deployar todos los
workers al `target_sha` global" hacia un **Deployment Plan V2** deterministic,
auditable e impact-aware. Cada surface productiva declara si debe desplegarse o
mantener su revision actual, y el watchdog valida contra el `expectedSha` de
cada surface, no contra un SHA global único para todo.

## Why This Task Exists

El modelo actual es seguro por simplicidad, pero ineficiente y con blast radius
innecesario: cada release productivo intenta desplegar los cuatro workers aunque
el diff no toque su código, libs compartidas, contrato de deploy, secrets o
runtime. Eso:

- alarga el tiempo de release;
- aumenta costo de Cloud Build/Cloud Run deploy;
- agrega puntos de falla no relacionados al cambio;
- permite que un worker como HubSpot bloquee releases que no lo afectan;
- fuerza al watchdog a comparar todos los workers contra `release.target_sha`,
  aunque algunos podrían seguir correctamente en un SHA anterior.

La evolución robusta es que el orquestador calcule y persista un plan por
surface:

```txt
target_sha: 644120d...

surfaces:
- vercel_app: deploy, expectedSha=644120d...
- ops-worker: skip, expectedSha=4591bd8...
- commercial-cost-worker: deploy, expectedSha=644120d...
- ico-batch-worker: skip, expectedSha=42805d...
- hubspot-greenhouse-integration: skip, expectedSha=df15ccc...
```

## Goal

- Agregar un planner canónico de impacto de release para surfaces productivas.
- Mantener workers como jobs estáticos de GitHub Actions con `if`, no crear
  workflows dinámicos.
- Persistir el deployment plan y su evidencia en el manifest de release.
- Hacer que el watchdog compare cada worker contra su `expectedSha` planificado.
- Mantener safety conservadora: si el planner no tiene confianza alta, despliega
  el worker afectado o un set conservador.

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
- `docs/operations/runbooks/production-release-watchdog.md`
- `docs/manual-de-uso/plataforma/release-orchestrator.md`
- `docs/manual-de-uso/plataforma/release-watchdog.md`
- `.codex/skills/greenhouse-production-release/SKILL.md`
- `.claude/skills/greenhouse-production-release/SKILL.md`

Reglas obligatorias:

- Production sigue siendo orquestada por `production-release.yml`.
- No se reintroducen deploys productivos por `push:main` ni `push:develop`.
- No se crean jobs GitHub dinámicos; los workers conocidos quedan como jobs
  estáticos con `if`.
- Un `skip` de worker solo es válido si el plan persiste `expectedSha` y
  evidencia de por qué no cambió.
- Si el diff toca paths globales de riesgo o el mapa de impacto no cubre la
  dependencia, la decisión default es conservadora: deploy del worker afectado
  o `force_all_workers`.
- TASK-865 debe cerrarse primero o estar suficientemente implementada para que
  `develop` no pueda pisar production Cloud Run.

## Current Repo State

### Already exists

- `.github/workflows/production-release.yml` con workers estáticos:
  - `deploy-ops-worker`
  - `deploy-commercial-cost-worker`
  - `deploy-ico-batch`
  - `deploy-hubspot-integration`
- Worker workflows con `workflow_call` y `expected_sha`.
- `src/lib/release/workflow-allowlist.ts` con mapping workflow ↔ Cloud Run.
- `greenhouse_sync.release_manifests` como SSoT de release.
- `src/lib/reliability/queries/release-worker-revision-drift.ts` compara
  Cloud Run `GIT_SHA` contra el último manifest `released/degraded`.

### Gap

- No existe `DeploymentPlanV2`.
- `production-release.yml` despliega todos los workers siempre.
- `release_manifests` no declara per-surface `expectedSha`.
- El watchdog asume `worker.GIT_SHA == release.target_sha`.
- Los path filters de GitHub no son suficiente fuente canónica porque no
  modelan dependencias compartidas ni decisiones conservadoras.

## Dependencies & Impact

### Depends on

- `TASK-865` para aislar staging/develop de production workers.
- `TASK-864` no bloquea esta task, pero puede mejorar la observabilidad del
  control plane antes de ejecutar el planner.

### Blocks / Impacts

- Reduce tiempo/costo de release.
- Reduce blast radius de workers no impactados.
- Cambia semántica del watchdog y del manifest de release.
- Requiere actualizar skills/runbooks/arquitectura porque cambia el flujo
  crítico de producción.

### Files likely owned

- `.github/workflows/production-release.yml`
- `src/lib/release/workflow-allowlist.ts`
- `src/lib/release/deployment-plan/**` (nuevo)
- `scripts/release/production-deployment-plan.ts` (nuevo si aplica)
- `scripts/release/orchestrator-record-started.ts`
- `scripts/release/orchestrator-transition-state.ts`
- `src/lib/reliability/queries/release-worker-revision-drift.ts`
- `src/lib/release/concurrency-fix-verification.test.ts`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/operations/runbooks/production-release.md`
- `docs/operations/runbooks/production-release-watchdog.md`
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

### Slice 1 — DeploymentPlanV2 Contract

- Definir contrato versionado:

```ts
interface ProductionDeploymentPlanV2 {
  contractVersion: 'production-deployment-plan.v2'
  targetSha: string
  baseReleaseSha: string | null
  surfaces: readonly ProductionDeploymentSurfacePlan[]
  conservativeMode: boolean
  evidence: readonly unknown[]
}
```

- Surface plan mínimo:

```ts
interface ProductionDeploymentSurfacePlan {
  surfaceKey: 'vercel_app' | 'ops-worker' | 'commercial-cost-worker' | 'ico-batch-worker' | 'hubspot-greenhouse-integration'
  action: 'deploy' | 'skip'
  expectedSha: string
  reason: string
  confidence: 'high' | 'conservative'
  changedPaths: readonly string[]
}
```

### Slice 2 — Impact Map Canonical

- Crear mapa declarativo por worker:
  - paths propios del service;
  - workflow/deploy script;
  - libs compartidas que consume;
  - files globales que fuerzan conservative deploy (`package.json`,
    `pnpm-lock.yaml`, Dockerfiles, migrations, `src/types/db.d.ts`, runtime DB
    helpers, event catalog).
- Tests fixture-based con diffs representativos:
  - UI-only → workers skip.
  - HubSpot service path → HubSpot deploy only.
  - `package.json`/lockfile → conservative set.
  - migration/schema shared → workers afectados o conservative all.

### Slice 3 — Planner CLI / Orchestrator Job

- Agregar CLI o helper invocable por `production-release.yml`.
- El job `plan-deployments` emite outputs estables:
  - `<surface>_deploy=true|false`
  - `<surface>_expected_sha=<sha>`
  - `deployment_plan_file=deployment-plan.json`
- Subir artifact JSON y summary legible.

### Slice 4 — production-release.yml Conditional Workers

- Mantener jobs estáticos, agregar `if` por output del planner.
- Para workers con `action=deploy`, pasar `expected_sha=${{ inputs.target_sha }}`.
- Para workers con `action=skip`, no llamar workflow.
- Jobs posteriores deben tratar skipped como OK si el plan decía `skip`.
- Agregar override input:
  - `force_all_workers=false` default;
  - `force_worker_keys` opcional si se decide soportarlo en V1.

### Slice 5 — Manifest Persistence

- Persistir deployment plan en el manifest de release.
- Preferir columna JSONB dedicada si Discovery confirma que `release_manifests`
  no tiene campo canónico para esto; si `post_release_health` o metadata
  existente no es semánticamente correcto, no reutilizarla como dumping ground.
- Registrar evidencia suficiente para auditoría:
  - base release usado;
  - diff range;
  - changed paths;
  - decisión por surface.

### Slice 6 — Watchdog V2

- Cambiar `release-worker-revision-drift` para leer el plan per-surface.
- Comparar:

```txt
cloud_run.GIT_SHA == deploymentPlan.surfaces[worker].expectedSha
```

- Fallback seguro:
  - si no hay plan V2, usar legacy global `target_sha` y marcar evidence
    `legacy_comparison=true`;
  - si plan incompleto, severity `unknown`/`error` según riesgo definido en
    arquitectura.

### Slice 7 — Docs / Skills / Tests

- Actualizar arquitectura release control plane.
- Actualizar runbook del orquestador y watchdog.
- Actualizar skills Codex/Claude de release.
- Tests anti-regresión de:
  - planner;
  - workflow jobs `if`;
  - watchdog per-surface expectedSha;
  - summary de skipped workers.

## Out of Scope

- No implementar staging Cloud Run separado; eso vive en TASK-865/follow-up.
- No cambiar lógica funcional de workers.
- No cambiar runtime HubSpot ni APIs del bridge.
- No hacer deploy a producción.
- No editar manifests live por SQL.

## Acceptance Criteria

- [ ] `production-release.yml` calcula un DeploymentPlanV2 antes de deployar.
- [ ] Workers no impactados se saltan sin fallar el release.
- [ ] Workers impactados se deployan con `expected_sha=target_sha`.
- [ ] Manifest persiste plan per-surface con `expectedSha`, `action`, reason y
      evidence.
- [ ] Watchdog compara cada worker contra su `expectedSha` per-surface.
- [ ] Si el planner no puede decidir con confianza alta, usa modo conservador.
- [ ] Existe override documentado para forzar todos los workers.
- [ ] Docs/skills/runbooks reflejan el nuevo contrato.

## Verification

- `pnpm vitest run src/lib/release/deployment-plan/**/*.test.ts`
- `pnpm vitest run src/lib/release/concurrency-fix-verification.test.ts`
- `pnpm vitest run src/lib/reliability/queries/release-worker-revision-drift.test.ts`
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `GITHUB_RELEASE_OBSERVER_TOKEN="$(gh auth token)" pnpm release:watchdog --json`
- Dry-run planner contra commits recientes:
  - UI/docs-only change → workers skip.
  - HubSpot-only change → HubSpot deploy.
  - global runtime change → conservative deploy.

## Closing Protocol

- [ ] `Lifecycle` sincronizado.
- [ ] `docs/tasks/README.md` sincronizado.
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` sincronizado.
- [ ] `Handoff.md` actualizado.
- [ ] `GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` actualizado.
- [ ] Skills Codex/Claude actualizadas.
- [ ] `changelog.md` actualizado.

## Follow-ups

- Dashboard `/admin/releases` puede mostrar el deployment plan por surface.
- Si el planner detecta demasiados conservative-all, abrir task para mejorar
  dependency graph por imports reales.
- Evaluar nightly/on-demand staging workers después de TASK-865.

## Delta 2026-05-11

Task creada tras cuestionar si era eficiente desplegar todos los workers en cada
release aunque no hubieran cambiado. Decisión de arquitectura: V2 debe ser
impact-aware y auditable, no deploy-all por costumbre.

## Open Questions

Ninguna bloqueante. Discovery debe resolver si el plan se persiste en una
columna JSONB nueva o en una estructura existente semánticamente correcta.
