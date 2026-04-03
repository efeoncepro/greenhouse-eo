# TASK-204 - Delivery Carry-Over & Overdue Carried Forward Semantic Split

## Delta 2026-04-03 — Implementación completa del split semántico

- Split semántico implementado end-to-end:
  - `Carry-Over` = created_at in period + due_date > period_end (carga futura)
  - `Overdue Carried Forward` = due_date < period_start + abierta (deuda arrastrada)
  - `OTD = On-Time / (On-Time + Late Drop + Overdue)` — carry-over y OCF excluidos
- `buildPeriodFilterSQL()` ahora incluye 3 universos de tareas
- `overdue_carried_forward_count` materializado en todas las tablas (BQ + PG)
- Migración PG: `agency_performance_reports` + `ico_member_metrics`
- UI: cards en Agency ICO y IcoTab, publicación Notion
- Docs actualizados: ICO Engine, Performance Report Parity, Data Model Master, Operating Model

## Delta 2026-04-03 (previo)

- `TASK-206` cerrada: modelo canónico de atribución operativa formalizado en `GREENHOUSE_OPERATIONAL_ATTRIBUTION_MODEL_V1.md`
- `TASK-209` cerrada con control plane de orquestación y retry auditado

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Status real: `Cerrada`
- Rank: `57`
- Domain: `data`
- GitHub Project: `[pending]`
- GitHub Issue: `[pending]`

## Summary

Separar en el engine y en los read-models de Delivery dos conceptos que hoy están mezclados:

- `Carry-Over` como carga creada en el mes para el siguiente
- `Overdue Carried Forward` como deuda vencida que cruza de mes

Sin este split, `OTD` y el scorecard mensual siguen siendo defendibles solo a medias y la lectura operativa de carga vs atraso queda mezclada.

## Why This Task Exists

La aclaración funcional posterior a `TASK-200` y `TASK-201` confirmó:

- `Carry-Over` no significa “tarea vencida que sigue abierta”
- sí significa “tarea creada en el período con `due_date` posterior al cierre”
- la deuda vencida que pasa al siguiente mes necesita una métrica aparte

El contrato documental ya quedó corregido, pero el engine todavía necesita un slice explícito para implementar ese split sin romper scorecards existentes.

## Goal

- Implementar `Carry-Over` con semántica de carga futura, no de atraso.
- Introducir `Overdue Carried Forward` como métrica separada para deuda vencida que cruza de mes.
- Mantener `OTD` y el scorecard mensual de cumplimiento limpios y auditables.

## Recommended Execution Order

1. Ejecutar `TASK-209` primero.
2. Ejecutar `TASK-206` después.
3. Ejecutar `TASK-204` en tercer lugar.

Razonamiento:

- esta lane no debe redefinir semántica mensual sobre una base que todavía pueda desalinearse entre `raw` y `conformed`
- tampoco conviene cerrarla antes de fijar la capa canónica de atribución operativa en `TASK-206`
- una vez estabilizados pipeline y ownership, el split `Carry-Over` vs `Overdue Carried Forward` puede implementarse sin mezclar causas distintas en el scorecard

## Canonical Metric Contract

Para un período mensual `M`:

- `period_start` = primer día del mes
- `period_end` = último día del mes
- `cutoff` = `period_end + 1 day`

Definiciones:

- `On-Time`
  - tarea con `due_date` dentro de `M`
  - `completed_at <= due_date`

- `Late Drop`
  - tarea con `due_date` dentro de `M`
  - `completed_at > due_date`
  - `completed_at < cutoff`

- `Overdue`
  - tarea con `due_date` dentro de `M`
  - abierta al cierre del período (`cutoff`)

- `Carry-Over`
  - tarea con `created_at` dentro de `M`
  - `due_date > period_end`

- `Overdue Carried Forward`
  - tarea con `due_date <= period_end`
  - abierta en `cutoff`

Regla canónica para `OTD`:

- `OTD = On-Time / (On-Time + Late Drop + Overdue)`

Reglas complementarias:

- `Carry-Over` no penaliza `OTD`
- `Overdue Carried Forward` no penaliza `OTD`; describe deuda vencida que entra viva al siguiente mes
- una tarea puede ser `Overdue` en `M` y luego aparecer como `Overdue Carried Forward` al arrancar `M+1`
- `Carry-Over` y `Overdue Carried Forward` no deben mezclarse entre sí

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`
- `docs/operations/GREENHOUSE_PERFORMANCE_REPORT_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`

Reglas obligatorias:

- `Carry-Over` no entra al denominador de `OTD`
- `Overdue Carried Forward` no reemplaza a `Overdue`; lo complementa entre períodos
- el scorecard mensual de cumplimiento sigue anclado al universo `due_date in period`
- no introducir el split semántico “a ciegas” en el filtro compartido si rompe materializaciones históricas o readers existentes

## Dependencies & Impact

### Depends on

- `TASK-189 - ICO Period Filter: Due-Date Anchor & Carry-Over Logic`
- `TASK-200 - Delivery Performance Metric Semantic Contract`
- `TASK-201 - Delivery Performance Historical Materialization Reconciliation`
- `src/lib/ico-engine/shared.ts`
- `src/lib/ico-engine/materialize.ts`
- `src/lib/ico-engine/metric-registry.ts`
- `src/lib/ico-engine/performance-report.ts`

### Impacts to

- `TASK-196 - Delivery Performance Report Parity: Greenhouse Canonical Report & Notion Consumption`
- readers `ICO` por `member`, `project`, `space` y `agency`
- scorecard mensual y publicación a Notion

### Files owned

- `docs/tasks/to-do/TASK-204-delivery-carry-over-backlog-semantic-split.md`
- `src/lib/ico-engine/shared.ts`
- `src/lib/ico-engine/materialize.ts`
- `src/lib/ico-engine/metric-registry.ts`
- `src/lib/ico-engine/performance-report.ts`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`
- `docs/operations/GREENHOUSE_PERFORMANCE_REPORT_OPERATING_MODEL_V1.md`

## Current Repo State

### Ya existe

- `due_date` como ancla del período mensual
- snapshots congelados por tarea
- `OTD` materializado y readers canónicos endurecidos
- contrato documental corregido para distinguir `Carry-Over` de deuda vencida

### Gap actual

- el engine todavía no expone el split semántico completo de forma explícita
- `Carry-Over` y deuda vencida arrastrada pueden seguir mezclándose en consumers legacy o supuestos viejos
- falta decidir exactamente dónde vive `Overdue Carried Forward` en snapshots, readers y scorecards

## Scope

### Slice 1 - Semántica ejecutable

- actualizar la fórmula ejecutable de `Carry-Over`
- introducir `Overdue Carried Forward` como métrica canónica separada
- explicitar en código y en snapshots que `OTD` usa solo `On-Time`, `Late Drop` y `Overdue`

### Slice 2 - Materialización y readers

- alinear materializaciones mensuales y readers con el split nuevo
- evitar que `OTD` o `Top Performer` absorban estas métricas de carga

### Slice 3 - Contrato visible

- actualizar labels, documentación y payloads del `Performance Report`
- dejar validación explícita sobre un mes real

## Out of Scope

- reabrir el sync Notion -> conformed
- redefinir owner attribution
- cambiar la publicación a Notion por sí sola sin corregir antes el engine

## Acceptance Criteria

- [ ] `Carry-Over` queda calculado como tareas creadas en el período con `due_date` posterior al cierre.
- [ ] `Overdue Carried Forward` queda materializado como deuda vencida que cruza al mes siguiente.
- [ ] `OTD` y el scorecard mensual no usan ninguna de esas dos métricas en el denominador.
- [ ] Existe validación sobre un período real que demuestre el split sin inflar artificialmente el scorecard.
- [ ] La task deja explícito el contrato `On-Time / Late Drop / Overdue / Carry-Over / Overdue Carried Forward` con ejemplo y fórmula mensual.

## Verification

- `pnpm build`
- `pnpm lint`
- validación task-level de un período real (`Efeonce + Sky`)
- comparación de scorecard antes/después del split
