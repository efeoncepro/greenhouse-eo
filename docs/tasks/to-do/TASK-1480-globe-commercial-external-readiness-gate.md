# TASK-1480 — Globe Commercial and External-client Readiness Gate

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Diseño gobernado; implementación pendiente`
- Rank: `TBD`
- Domain: `commercial|legal|finance|security`
- Blocked by: `TASK-1477, TASK-1478, TASK-1479, TASK-1482`
- Branch: `task/TASK-1480-globe-commercial-external-readiness-gate`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Emitir decisión go, conditional-go o no-go para oferta comercial y clientes externos con evidencia de producto, seguridad, legal, finance, operaciones y soporte.

## Why This Task Exists

EPIC-028 exige que integración de modelos, plataforma gobernada y validación comercial avancen en paralelo, pero con gates distintos. Greenhouse gobierna esta task y su evidencia; Efeonce Globe posee el código, datos y runtime creativo.

## Goal

Evitar que la disponibilidad técnica se interprete como autorización comercial.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- `../efeonce-globe/docs/architecture/PLATFORM_FOUNDATION_V1.md`
- `../efeonce-globe/docs/operations/EPIC_028_PARALLEL_EXECUTION_PLAN_V1.md`

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`


## Dependencies & Impact

### Depends on

- `TASK-1477`, `TASK-1478`, `TASK-1479` y `TASK-1482`.
- `TASK-1483` es evidencia obligatoria si el scope incluye operación `client-operated` o budget administrado
  por el cliente; no bloquea un go estrictamente managed.

### Blocks / Impacts

- Las tasks downstream declaradas en el grafo de EPIC-028 y el execution plan de Globe.
- No habilita producción ni clientes externos por sí sola.

### Files owned

- `docs/business-models/creative-studio/`
- `docs/services/`
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- `../efeonce-globe/docs/operations/`

## Current Repo State

### Already exists

- Globe dispone de repo separado, identidad internal-only, Node 24, SDK/WIF base y primera shell branded.
- Greenhouse dispone del harness canónico de TASK/EPIC, hooks, lint, QA, documentación y handoff.

### Gap

- Falta cerrar el alcance binario de esta task con código/evidencia runtime en Globe y lifecycle gobernado en Greenhouse.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Efeonce Globe como plataforma hermana; Greenhouse como control plane operativo/documental`
- Future candidate home: `remain-shared`
- Boundary: `Globe Commercial and External-client Readiness Gate`
- Server/browser split: `secrets, providers y writes server-only; contratos serializables y consumidores explícitos`
- Build impact: `Globe valida su runtime; Greenhouse valida task, docs, integraciones y proyecciones en scope`
- Extraction blocker: `ninguno: el runtime ya nace fuera del monolito Greenhouse`

## Backend/Data Contract

No aplica: esta task consolida evidencia ya producida por las tasks técnicas y emite una decisión de readiness;
no crea ni modifica schema, API, commands, readers, migrations o integraciones runtime.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1

- Consolidar readiness dossier y riesgos residuales.

### Slice 2

- Obtener sign-off explícito de Finance, Legal, Security y Leadership.
- Emitir un `commercial_decision_record` versionado, firmado y machine-readable con `go | conditional-go |
  no-go`, scope y restricciones. Un go aprueba parámetros; no habilita runtime, cobros ni clientes.

### Slice 3

- Definir rollout/rollback, límites de oferta y próximos gates.
- Registrar segmentos/geografías/canales, packages y cinco líneas económicas, pricing/rate versions,
  monedas/FX, descuentos, tax/accounting memo, revenue recognition, expiry/rollover/breakage, refunds,
  top-up/overage, soporte/SLA, stop-loss y rollback aprobados.

## Out of Scope

- Producción pública, clientes externos, pricing/wallet self-serve o permisos más amplios que los aprobados expresamente.
- Mover runtime creativo, datos, provider secrets o lógica de Globe a Greenhouse.
- Crear un segundo harness o namespace de tasks dentro de Globe.
- Implementar monetización, billing, tax, checkout o revenue projections: eso pertenece a `TASK-1484` y
  permanece fail-closed hasta que esta task produzca un record aplicable.

## Detailed Spec

La ejecución comienza desde Greenhouse con `pnpm codex:task-hook TASK-1480 --develop` cuando el operador apruebe su goal. El plan puede modificar el repositorio hermano en los paths owned, pero lifecycle, checkpoints, QA y cierre permanecen en esta spec canónica.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Contrato y guardrails -> implementación local -> pruebas negativas -> canary internal-only -> evidencia -> promoción explícita si corresponde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Salida comercial sin autoridad cross-functional | Globe/Greenhouse | medium | gate binario, allowlist, audit y rollback antes de ampliar | cliente externo habilitado sin decision record |
| Deriva entre task y runtime | documentation | medium | task hook, checkpoint, QA y closure en Greenhouse | cambio Globe sin evidencia TASK |
| Habilitación accidental externa | security/commercial | low | internal-only, deny tests y sign-off separado | actor externo obtiene acceso |

### Feature flags / cutover

Default internal-only. Toda capacidad nueva usa flag/allowlist/registry fail-closed hasta cumplir el gate de promoción aplicable.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Contrato/docs | revert commit correctivo y restaurar versión anterior | <15 min | sí |
| Runtime Globe | desactivar flag/route y revertir deploy | <30 min | sí |
| Datos/externos | detener writes, reconciliar desde audit y aplicar runbook | <60 min | depende del provider |

### Production verification sequence

Local-first; sandbox no productivo; allowlist interna; tests negativos; evidencia runtime; QA release auditor; documentación; sólo después puede evaluarse un rollout adicional.

### Out-of-band coordination required

Provider/GCP/Legal/Finance/Security sólo cuando el slice los afecte. Ninguna ausencia de coordinación autoriza ampliar el scope.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] La decisión identifica alcance, fecha, owners y evidencia.
- [ ] Existe un `commercial_decision_record` versionado/firmado con go state, segments/geographies/channels,
      packages/five-line economics, pricing/rates, currency/FX, discounts, tax/accounting/revenue memo refs,
      expiry/rollover/breakage/refunds/top-up/overage y support/SLA/stop-loss/rollback.
- [ ] `conditional-go` expresa restricciones machine-readable y `TASK-1484` falla cerrado fuera de ellas.
- [ ] Sign-off contable/tributario y legal referencia profesionales habilitados para entidades/jurisdicciones
      incluidas; ausencia o ambigüedad no se interpreta como aprobación.
- [ ] Sin sign-off el estado permanece internal-only/no production.
- [ ] Go parcial no habilita capacidades o segmentos no evaluados.
- [ ] El dossier incluye coverage machine-readable y conformance PASS por capability crítica; cualquier
      business capability con surface `missing`, lógica duplicada o provider bypass obliga `no-go`.
- [ ] Greenhouse conserva lifecycle, audit, plan, QA, changelog y handoff; Globe conserva runtime/evidencia técnica.
- [ ] No se habilitan producción ni clientes externos sin una task/gate posterior explícito.
- [ ] El go aprueba parámetros pero no activa feature flags, adapters de pago, external tenants ni cobros.

## Verification

- `pnpm task:lint --task TASK-1480`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `cd ../efeonce-globe && pnpm check && pnpm build` cuando exista cambio de runtime.

## Closing Protocol

- [ ] Lifecycle/carpeta, `docs/tasks/README.md`, registry, EPIC-028, changelog y Handoff sincronizados.
- [ ] QA release auditor y documentation governor ejecutados.
- [ ] Evidencia faltante queda declarada como `code complete, rollout pendiente` o bloqueo operativo.

## Follow-ups

- Las dependencias sucesoras se leen desde EPIC-028 y `docs/tasks/README.md`.
