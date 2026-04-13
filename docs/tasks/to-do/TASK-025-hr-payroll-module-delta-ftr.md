# TASK-025 — Payroll FTR Bonus Policy Decision

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `policy`
- Status real: `Deferred hasta decisión explícita de producto`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `task/TASK-025-payroll-ftr-bonus-policy-decision`
- Legacy ID: `CODEX_TASK_HR_Payroll_Module_v2_DELTA_FTR`
- GitHub Issue: `none`

## Summary

Formalizar si `Payroll` debe seguir usando `OTD + RpA` como incentivo variable o si en el futuro `FTR` entra como reemplazo o complemento. Esta task rescata la lane legacy y la convierte en policy ejecutable: define los no-negociables, el contrato de datos y los gates que cualquier implementación futura debe respetar para no romper nómina, projected payroll, receipts, exports y consumers financieros.

## Why This Task Exists

La task original proponía reemplazar `RpA` por `FTR` como si bastara un rename de columnas y queries sobre BigQuery. Eso hoy es peligroso y conceptualmente incorrecto:

- el runtime real de Payroll sigue pagándose con `OTD + RpA`
- `TASK-065` endureció esa policy con bandas suaves y compatibilidad transversal
- `FTR` ya existe como KPI del ecosistema `ICO`, pero su benchmark de salud no equivale automáticamente a un threshold de bono
- el módulo de nómina, projected payroll, exports, receipts, `personnel-expense` y consumers de Finance siguen anclados a `bonus_rpa_*`

La lane sigue teniendo valor, pero ya no como implementación inmediata. Su cabida actual es decidir **si** y **cómo** `FTR` podría entrar a la compensación variable sin causar un corte destructivo del runtime actual.

## Goal

- Convertir la propuesta legacy `RpA -> FTR` en una policy canónica y compatible con el runtime actual.
- Definir el contrato de datos y los guardrails de cualquier adopción futura de `FTR` en Payroll.
- Dejar explícito si `FTR` queda descartado, diferido, complementario o reemplaza a `RpA` en una lane posterior de implementación.

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
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`

Reglas obligatorias:

- `Payroll` no puede redefinir localmente `OTD`, `RpA` o `FTR`; debe consumir el contrato canónico de `ICO`.
- Si `FTR` entra a nómina alguna vez, su fuente debe venir del reader/materialización oficial de `ICO`, no de `notion_ops.tareas` ni de queries ad hoc.
- El benchmark de salud de `FTR` no equivale automáticamente al threshold de bono; compensation policy y metric contract son capas distintas.
- Una futura activación de `FTR` no puede renombrar ni eliminar en caliente `bonus_rpa_*`, `kpi_rpa_*` o `rpa_soft_band_*`; debe convivir de forma aditiva o migrarse con plan explícito.
- Cualquier cambio futuro debe preservar consistencia entre:
  - official payroll
  - projected payroll
  - recalculate-entry
  - receipts / PDF / Excel / exports
  - `personnel-expense` y consumers financieros

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/complete/TASK-065-payroll-variable-bonus-policy-recalibration.md`
- `docs/tasks/complete/TASK-078-payroll-chile-previsional-foundation.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-065-payroll-variable-bonus-policy-recalibration.md`
- `docs/tasks/complete/TASK-078-payroll-chile-previsional-foundation.md`
- `src/lib/payroll/fetch-kpis-for-period.ts`
- `src/lib/payroll/bonus-proration.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/recalculate-entry.ts`
- `src/lib/payroll/postgres-store.ts`
- `src/lib/payroll/projected-payroll-store.ts`
- `src/lib/payroll/generate-payroll-pdf.tsx`
- `src/lib/payroll/generate-payroll-excel.ts`
- `src/lib/payroll/export-payroll.ts`

### Blocks / Impacts

- futura política de bono variable en Payroll
- projected payroll y explainability
- exports y recibos legales
- `personnel-expense` y lectura de bonos por Finance
- cualquier futura lane de payout basada en `FTR`

### Files owned

- `docs/tasks/to-do/TASK-025-hr-payroll-module-delta-ftr.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- `src/lib/payroll/**`

## Current Repo State

### Already exists

- `TASK-065` dejó una policy vigente de bonos basada en `OTD + RpA` con bandas suaves y compatibilidad runtime.
- `TASK-078` cerró el forward engine que hoy gobierna payroll oficial y projected payroll.
- El esquema y el runtime actual siguen materialmente anclados a `RpA`:
  - `bonus_rpa_min` / `bonus_rpa_max`
  - `kpi_rpa_avg` / `kpi_rpa_qualifies`
  - `bonus_rpa_amount` / `bonus_rpa_proration_factor`
  - `rpa_soft_band_*` en `greenhouse_payroll.payroll_bonus_config`
- `FTR` ya existe como métrica canónica en el ecosistema `ICO` y en su contrato documental, pero Payroll todavía no la consume en el bonus flow.
- `src/lib/payroll/fetch-kpis-for-period.ts` hoy trae `OTD` y `RpA`, no `FTR`.

### Gap

- No existe una decisión institucional sobre si `FTR` entra a Payroll como reemplazo, complemento o no entra.
- La task legacy propone cambios destructivos incompatibles con el runtime real actual.
- Falta un contrato explícito de activación futura para `FTR` que preserve compatibilidad con official payroll, projected payroll y exports.

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

### Slice 1 — Decision Frame

- documentar las opciones válidas de producto:
  - `RpA` sigue como KPI de bonus y `FTR` queda solo como health metric
  - `FTR` complementa a `RpA`
  - `FTR` reemplaza a `RpA` en una lane futura
  - `FTR` se descarta para comp variable aunque siga vivo como KPI operativo
- dejar explícito qué pregunta de negocio resuelve cada opción
- separar benchmark de salud del KPI vs threshold de pago

### Slice 2 — Canonical Data Contract

- definir la fuente aprobada para una futura lectura de `FTR` en Payroll
- prohibir explícitamente queries crudas a BigQuery/Notion desde la lane de compensación
- definir compatibilidad mínima de schema/runtime si `FTR` se activa:
  - convivencia aditiva con `bonus_rpa_*`
  - no rename destructivo
  - no tabla paralela innecesaria

### Slice 3 — Activation Gates

- listar las precondiciones para abrir una task de implementación futura
- definir qué surfaces y consumers deben entrar en cualquier rollout:
  - official payroll
  - projected payroll
  - recalculate-entry
  - receipts / PDF / Excel / exports
  - `personnel-expense`
- proponer la estrategia de rollout:
  - paralela
  - feature-flagged
  - dual-write / dual-read si aplica
  - validación comparativa antes de cutover

## Out of Scope

- implementar `FTR` en payroll hoy
- cambiar el schema actual para borrar o renombrar `RpA`
- alterar la fórmula canónica de `FTR` dentro de `ICO`
- recalibrar nuevamente la policy vigente de `OTD + RpA`
- reabrir `TASK-065` o `TASK-078`

## Detailed Spec

La forma correcta de rescatar esta lane es convertirla en una **policy de decisión**, no en un brief de implementación inmediata.

### Hechos duros del runtime actual

- `Payroll` hoy paga con `OTD + RpA`
- `RpA` ya tiene semántica, trust model, exports y consumers downstream
- `FTR` existe en el ecosistema `ICO`, pero todavía no está cableado al bonus flow de Payroll

### Contrato mínimo si FTR se activa en el futuro

Una futura implementación de `FTR` en nómina debe respetar estas reglas:

1. **Source of truth**
   - leer `FTR` desde el carril canónico de `ICO` que consume Payroll, no desde queries directas a BigQuery o Notion
   - si el reader actual de Payroll no expone `FTR`, la futura lane debe extenderlo primero

2. **Compatibilidad de schema**
   - agregar campos `ftr_*` si hacen falta
   - no eliminar ni renombrar `rpa_*` en caliente
   - cualquier deprecación posterior exige migración, backfill, rollout y consumers cerrados

3. **Compatibilidad funcional**
   - official y projected payroll deben seguir dando la misma historia
   - receipts / exports / explain dialogs deben soportar la transición sin ambigüedad semántica
   - Finance no debe perder trazabilidad de bonos en `personnel-expense`

4. **Compensation policy != benchmark**
   - `FTR >= 85` como banda benchmark de salud no obliga a usar `85` como threshold de bono
   - el threshold de payout es una decisión de compensación y debe documentarse como tal

### Recomendación base

Mientras no exista decisión explícita de producto:

- `RpA` sigue como policy de bonus vigente
- `FTR` sigue como métrica operativa y de calidad
- `TASK-025` no debe ejecutarse como implementación

Si negocio decide avanzar, esta misma task debe servir como gate de entrada para abrir una nueva lane de implementación compatible con el runtime actual.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La task ya no propone renames o drops destructivos sobre `RpA`
- [ ] Queda explícita la distinción entre benchmark `FTR` y threshold de bono
- [ ] Queda documentado que una futura activación de `FTR` debe ser compatible con official payroll, projected payroll, receipts y exports
- [ ] Queda definida la fuente canónica aprobada para una futura lectura de `FTR` en Payroll
- [ ] La lane queda clasificada como policy estratégica y no como implementación inmediata

## Verification

- revisión documental contra:
  - `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
  - `docs/architecture/Contrato_Metricas_ICO_v1.md`
  - `docs/tasks/complete/TASK-065-payroll-variable-bonus-policy-recalibration.md`
- verificación manual de consistencia con el schema/runtime actual

## Closing Protocol

- [ ] Actualizar `Handoff.md` dejando explícito que `TASK-025` fue rescatada como policy y no reactivada como implementación
- [ ] Mantener `TASK-025` fuera de la cola inmediata de ejecución hasta que exista decisión de producto

## Follow-ups

- si negocio aprueba mover el incentivo a `FTR`, abrir una nueva `TASK-###` de implementación compatible con el runtime actual
- si negocio decide que `FTR` no entra a compensación, cerrar `TASK-025` como policy descartada
- si se decide una convivencia `RpA + FTR`, abrir una lane específica de rollout y explainability

## Delta 2026-04-13

- Task rescatada desde brief legacy destructivo a policy canónica.
- Se elimina la lectura de implementación inmediata basada en rename de `RpA`.
- La lane queda reencuadrada como decisión estratégica de compensación variable futura.

## Open Questions

- si el negocio quiere que `FTR` reemplace, complemente o solo informe respecto a `RpA`
- si una futura activación de `FTR` usaría threshold binario, banda suave o score híbrido
- qué consumer downstream debe considerarse criterio de cierre para una futura implementación
