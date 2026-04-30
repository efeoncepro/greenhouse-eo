# TASK-740 — Critical Metrics Change Safety Harness

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-009`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `none`
- Branch: `task/TASK-740-critical-metrics-change-safety-harness`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea la red de seguridad previa a cualquier cambio en el carril crítico `Notion -> ICO -> Payroll -> Reliquidación`: invariantes formales, golden datasets, replay harness, contract tests mínimos, observabilidad de cambio y protocolo de rollout/rollback. Esta task existe para que `TASK-732`, `TASK-733` y `TASK-734` no arranquen “a ciegas”.

## Why This Task Exists

Las auditorías ya identificaron los riesgos funcionales, pero para un flujo que impacta bonificaciones y puede terminar en reliquidaciones no basta con “arreglar el bug”. Antes de tocar runtime necesitamos una capa de seguridad que nos permita:

- saber exactamente qué no puede romperse
- comparar comportamiento antes/después con casos reales y edge cases
- detectar drift entre contratos viejos y nuevos
- desplegar en fases con rollback claro

Sin esto, incluso una mejora correcta puede introducir regresiones silenciosas en payroll, ICO o consumers downstream.

## Goal

- declarar invariantes no negociables del carril crítico
- montar golden datasets y replay checks reproducibles
- dejar contract tests mínimos entre boundaries críticos
- definir rollout/rollback plan operativo para las tasks del epic

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`

Reglas obligatorias:

- ninguna task del `EPIC-009` que toque cálculo o materialización crítica se considera cerrable sin pasar por este harness
- los golden datasets deben incluir casos reales y edge cases con expected outputs explícitos
- el harness debe ser útil tanto para humanos como para agentes futuros

## Normative Docs

- `docs/audits/ico/ICO_ENGINE_AUDIT_2026-04-30.md`
- `docs/audits/notion/notion-bq-sync/NOTION_BQ_SYNC_AUDIT_2026-04-30.md`
- `docs/audits/notion/notion-bq-sync/GREENHOUSE_CONSUMPTION_AUDIT_2026-04-30.md`
- `docs/tasks/to-do/TASK-732-payroll-ico-safety-gate-and-kpi-provenance.md`
- `docs/tasks/to-do/TASK-733-ico-locked-snapshot-immutability-and-reliquidation-reproducibility.md`
- `docs/tasks/to-do/TASK-734-ico-materialization-concurrency-idempotency-and-ai-isolation.md`

## Dependencies & Impact

### Depends on

- `src/lib/ico-engine/**`
- `src/lib/payroll/**`
- `src/lib/sync/**`
- Cloud SQL / BigQuery runtime contracts reales

### Blocks / Impacts

- `TASK-732`
- `TASK-733`
- `TASK-734`
- en menor medida `TASK-735` a `TASK-739`

### Files owned

- `docs/tasks/**`
- `docs/architecture/**`
- `docs/operations/**`
- `scripts/**` o `src/test/**` si el harness se automatiza parcialmente

## Current Repo State

### Already exists

- auditorías técnicas recientes y verificadas
- `pnpm pg:doctor` operativo de nuevo tras refresco de `gcloud/ADC`
- evidencia de reliquidación real en Cloud SQL (`payroll_period_reopen_audit`, `version > 1`)

### Gap

- no existe una lista formal de invariantes del cálculo
- no existe golden dataset/replay harness específico del carril crítico
- no existe gate común que obligue a contrastar before/after antes de tocar el runtime

## Scope

### Slice 1 — Invariants catalog

- documentar invariantes formales del carril crítico
- clasificar cuáles son hard blockers, cuáles warnings y cuáles observabilidad obligatoria

### Slice 2 — Golden datasets and replay harness

- definir casos canónicos:
  - período normal
  - período con KPI completo
  - período con KPI faltante
  - fallback live
  - reliquidación v2
  - período histórico real como `2026-03`
- dejar formato y procedimiento reproducible para replay before/after

### Slice 3 — Contract tests and blast radius map

- identificar boundaries críticos:
  - `notion_ops -> conformed`
  - `conformed -> ICO`
  - `ICO -> payroll`
  - `payroll -> reliquidación`
  - `reliquidación -> finance delta`
- definir contract checks mínimos y blast radius downstream

### Slice 4 — Rollout / rollback protocol

- documentar strategy de rollout segura:
  - flagging
  - shadow/dual-read cuando aplique
  - validación en preview/staging
  - período controlado
  - rollback por slice

## Out of Scope

- implementar los cambios funcionales de `TASK-732`, `TASK-733` o `TASK-734`
- absorber `notion-bq-sync`
- migrar todavía al SDK de Notion

## Detailed Spec

El entregable ideal de esta task no es solo un markdown. Debe dejar al menos:

- un catálogo de invariantes consumible por tasks futuras
- uno o más scripts/checklists de replay
- un mapa claro de datasets/casos de prueba
- un protocolo operativo de despliegue seguro para el epic

Si parte del harness no puede automatizarse completo en esta fase, debe quedar al menos semi-automatizado y con procedimiento manual verificable.

## Acceptance Criteria

- [ ] existe un catálogo explícito de invariantes del carril crítico
- [ ] existe un golden dataset/replay procedure para comparar before/after
- [ ] existe un mapa de boundaries y blast radius downstream
- [ ] existe un protocolo de rollout/rollback para las tasks críticas del epic
- [ ] `TASK-732`, `TASK-733` y `TASK-734` referencian este harness como prerrequisito operativo

## Verification

- `pnpm lint`
- `pnpm test`
- `pnpm pg:doctor`
- validación manual del replay procedure sobre al menos un período real controlado

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible
- [ ] se ejecutó chequeo de impacto cruzado sobre `TASK-732`, `TASK-733` y `TASK-734`

## Follow-ups

- hacer que el replay harness alimente después el Reliability Control Plane si agrega señales reutilizables
- decidir si parte de este harness vive luego como runbook permanente del dominio payroll/ICO

## Delta 2026-04-30

Task creada como wave 0 del `EPIC-009` para evitar cambios inseguros sobre un carril que ya impacta payroll y reliquidación real.
