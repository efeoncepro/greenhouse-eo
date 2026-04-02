# TASK-200 - Delivery Performance Metric Semantic Contract

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Status real: `Diseño`
- Rank: `56`
- Domain: `data`
- GitHub Project: `[pending]`
- GitHub Issue: `[pending]`

## Summary

Congelar el contrato semántico de las métricas del `Performance Report` mensual para que `OTD`, `Late Drop`, `Overdue`, `Carry-Over`, `FTR`, `RpA` y comparativos mensuales signifiquen exactamente lo mismo en Greenhouse y en Notion.

Esta task es el centro lógico de la paridad. Sin ella, aunque sync, identidad y owner estén correctos, el resultado final seguirá divergiendo por definiciones distintas.

## Why This Task Exists

La reconciliación de `Daniela / Marzo 2026` ya mostró drift semántico:

- Greenhouse hoy calcula `otd_pct = on_time / (on_time + late_drop)`
- el reporte de Notion para Daniela parece usar `on_time / total_tasks`

Además, el reporte depende de filtros y exclusiones no triviales:

- tasks con `due date` en el período
- exclusión de `Archivada`, `Cancelada`, `Tomado`
- exclusión de ciertos actores
- reglas específicas para overdue, carry-over y cambios de estado

## Goal

- Definir formalmente cada métrica del `Performance Report`.
- Definir filtros, período, exclusiones y grano canónico.
- Convertir `Marzo 2026` en baseline contractual para validar la semántica.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`
- `docs/operations/GREENHOUSE_PERFORMANCE_REPORT_OPERATING_MODEL_V1.md`
- `docs/tasks/in-progress/TASK-196-delivery-performance-report-parity-greenhouse-notion.md`

Reglas obligatorias:

- ninguna métrica del reporte debe depender de interpretación implícita no versionada
- la semántica debe poder expresarse en SQL o código determinístico
- las exclusiones deben quedar nombradas y auditables
- el contrato debe usar fechas absolutas y timezone explícita cuando aplique

## Dependencies & Impact

### Depends on

- `TASK-196 - Delivery Performance Report Parity: Greenhouse Canonical Report & Notion Consumption`
- `TASK-199 - Delivery Performance Owner Attribution Contract`
- `src/lib/ico-engine/shared.ts`
- `src/lib/ico-engine/schema.ts`
- `src/lib/ico-engine/read-metrics.ts`
- `docs/operations/GREENHOUSE_PERFORMANCE_REPORT_OPERATING_MODEL_V1.md`

### Impacts to

- `TASK-201 - Delivery Performance Historical Materialization Reconciliation`
- `TASK-202 - Delivery Performance Report Publication & Notion Consumption Cutover`
- scorecards mensuales en `ICO`
- cualquier consumer futuro de métricas Delivery

### Files owned

- `docs/tasks/to-do/TASK-200-delivery-performance-metric-semantic-contract.md`
- `src/lib/ico-engine/shared.ts`
- `src/lib/ico-engine/schema.ts`
- `src/lib/ico-engine/read-metrics.ts`
- `docs/operations/GREENHOUSE_PERFORMANCE_REPORT_OPERATING_MODEL_V1.md`

## Current Repo State

### Ya existe

- Greenhouse ya produce parte de las métricas Delivery
- Notion ya tiene un reporte mensual real que sirve de baseline
- existen propiedades calculadas en Notion que permiten reconstruir varias clasificaciones

### Gap actual

- la fórmula de `OTD` no está alineada
- no existe contrato único de exclusiones
- no existe una definición versionada del grano mensual del reporte
- algunas métricas históricas dependen de interpretación contextual no formalizada

## Scope

### Slice 1 - Métricas canónicas

- definir `OTD`, `Late Drop`, `Overdue`, `Carry-Over`, `FTR`, `RpA`
- definir numerador, denominador y reglas de inclusión

### Slice 2 - Período y exclusiones

- definir base temporal del reporte
- definir filtros de estados, personas y casos borde
- dejar explícita la timezone y la fecha de corte

### Slice 3 - Contrato auditable

- dejar la semántica lista para implementarse en SQL o código
- vincular cada métrica con sus propiedades fuente necesarias

## Out of Scope

- corregir el sync de responsables y proyecto
- resolver el grafo de identidad humana
- publicar reportes a Notion por sí solo

## Acceptance Criteria

- [ ] Existe definición explícita de cada métrica principal del `Performance Report`.
- [ ] Existe definición explícita de período, exclusiones y grano del reporte.
- [ ] El caso `Daniela / Marzo 2026` puede expresarse con el contrato documentado.
- [ ] La task deja base implementable para recalcular `Marzo 2026` en Greenhouse.

## Verification

- comparación manual del contrato contra el reporte de marzo
- revisión de fórmula actual vs fórmula objetivo
- matriz `métrica -> propiedades -> regla`

