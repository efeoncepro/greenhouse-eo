# TASK-559 — Ops Registry Validation, Query CLI & Generated Outputs

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-003`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-558`
- Branch: `task/TASK-559-ops-registry-validation-query-cli-generated-outputs`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Construir la capa operativa central de `Ops Registry`: validaciones automáticas, CLI de consulta e outputs generados en JSON aptos para humanos, CI y agentes.

## Why This Task Exists

El valor real del sistema aparece cuando deja de ser solo parser y empieza a contestar preguntas útiles: qué está stale, qué bloquea qué, qué documento gobierna una zona y dónde hay drift.

## Goal

- implementar validaciones operativas principales
- exponer una CLI útil
- generar outputs derivados estables en `.generated/ops-registry/`
- preparar validación y preview para comandos de escritura

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_OPS_REGISTRY_ARCHITECTURE_V1.md` (Delta 2026-05-07)
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- arch-architect overlay pinned decision #8 (reliability signals everywhere)
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — patrón canónico para registrar nuevos signals

Reglas obligatorias:

- outputs derivados no reemplazan la source of truth
- la CLI debe funcionar sin depender de base externa
- los outputs derivados se hidratan a `getReliabilityOverview` como signals **además** de quedar como JSON (JSON solo no es signal)
- la validación corre como **pre-commit hook** (mediante husky + lint-staged) y como **CI gate** (workflow GitHub Actions); fallos bloquean merge

## Dependencies & Impact

### Depends on

- `TASK-558`

### Blocks / Impacts

- `TASK-560`
- `TASK-561`

### Files owned

- `src/lib/ops-registry/**`
- `scripts/ops-registry-*.mjs`
- `.generated/ops-registry/**`

## Scope

### Slice 1 — Validation

- `Lifecycle` vs carpeta
- registry vs archivo
- epic ↔ child tasks
- links rotos
- paths inexistentes
- drift básico entre arquitectura y tasks
- validación estructural previa a `create/update/sync`

### Slice 2 — Query CLI

- `ops:index`
- `ops:validate`
- `ops:query`
- `ops:impact`
- `ops:domain`
- `ops:stale`

### Slice 3 — Generated outputs

- `registry.json`
- `graph.json`
- `validation-report.json`
- `stale-report.json`
- previews estructurados de mutación cuando aplique `dry_run`

### Slice 4 — Reliability signals + automation gates

Wirea los outputs del validador como signals canónicos del Reliability Control Plane bajo subsystem nuevo `Ops Registry Health`:

- `ops.registry.invalid_lifecycle` (kind=`drift`, severity=`error` si count>0, steady=0) — `Lifecycle` declarado vs carpeta real
- `ops.registry.broken_links` (kind=`drift`, severity=`error` si count>0, steady=0) — referencias a archivos/IDs inexistentes
- `ops.registry.stale_artifacts` (kind=`drift`, severity=`warning` si count>0) — artefactos sin actualizar > umbral declarado por policy
- `ops.registry.epic_child_drift` (kind=`drift`, severity=`error` si count>0, steady=0) — child tasks declaran un epic que no existe o el epic no las lista
- `ops.registry.registry_vs_file_mismatch` (kind=`drift`, severity=`error` si count>0, steady=0) — `TASK_ID_REGISTRY.md` no coincide con archivos reales
- `ops.registry.policy_violation` (kind=`drift`, severity=`error` si count>0, steady=0) — artefacto que no cumple su `Artifact Policy` (campos faltantes, lifecycle inválido, etc.)

Cada signal vive en `src/lib/reliability/queries/ops-registry-*.ts` con la firma estándar; se wirea en `getReliabilityOverview`. Subsystem `Ops Registry Health` rolla los 6 signals. Visible en `/admin/operations`.

**Automation gates** (entran como acceptance, no opcionales):

- pre-commit hook (husky + lint-staged): cuando un commit toca `docs/architecture/`, `docs/tasks/`, `docs/epics/`, `docs/mini-tasks/`, `docs/issues/`, `Handoff.md`, `project_context.md` o `changelog.md`, corre `pnpm ops:validate --staged` (errors bloquean, warnings no)
- CI workflow GitHub Actions: `.github/workflows/ops-registry-validate.yml` corre `pnpm ops:index && pnpm ops:validate --strict` en cada PR. Strict bloquea merge si hay errors o warnings.
- guardrail anti-bypass: NO usar `--no-verify` para saltarse el hook salvo emergencia documentada (mismo contrato que el resto de los hooks Greenhouse)

## Out of Scope

- UI humana
- endpoints internos
- mirror a Notion

## Acceptance Criteria

- [ ] El repo puede generar outputs derivados consumibles (`registry.json`, `graph.json`, `validation-report.json`, `stale-report.json`)
- [ ] Existen validaciones automáticas para las reglas operativas mínimas declaradas en el spec
- [ ] La CLI permite consultar artefactos, impacto y drift sin leer manualmente todos los docs
- [ ] La capa de validación soporta `dry_run` y preview antes de materializar comandos write-safe
- [ ] Los 6 signals (`ops.registry.invalid_lifecycle`, `broken_links`, `stale_artifacts`, `epic_child_drift`, `registry_vs_file_mismatch`, `policy_violation`) están wired a `getReliabilityOverview` y visibles en `/admin/operations` bajo subsystem `Ops Registry Health`
- [ ] Pre-commit hook (husky) corre `pnpm ops:validate --staged` en archivos relevantes y bloquea commit en errors
- [ ] CI workflow `.github/workflows/ops-registry-validate.yml` corre validación strict y bloquea merge en errors o warnings
- [ ] Tests unitarios de validators son **obligatorios** (no opcionales): un test por validator, golden fixtures con drift detectable
- [ ] Tests unitarios de la CLI cubren al menos `ops:query`, `ops:impact`, `ops:domain`, `ops:stale`, `ops:validate` con fixtures controladas

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/ops-registry` — validators y reliability queries verdes
- ejecución manual de CLI sobre al menos una task, un epic y un path real del repo
- ejecución manual de cada signal contra `/admin/operations` (verificar steady=0 cuando todo está limpio, count>0 con drift inyectado en fixture)
- pre-commit hook se dispara correctamente en commit de prueba con drift inyectado

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

## Follow-ups

- `TASK-560`
- `TASK-561`
