# CODEX TASK — HRIS Fase 2B: Goals y OKRs

## Lifecycle: complete

## Delta 2026-04-16 — Implementacion completada

- 4 tablas creadas en `greenhouse_hr`: `goal_cycles`, `goals`, `goal_key_results`, `goal_progress`
- 3 core lib files: `postgres-goals-store.ts`, `eligibility.ts`, `progress-calculator.ts`
- 12 API routes en `/api/hr/goals/`
- 5 outbox events registrados en event catalog
- 2 view codes: `equipo.objetivos`, `mi_ficha.mis_objetivos`
- 2 paginas: `/my/goals` (self-service), `/hr/goals` (admin 3 tabs: Ciclos, Seguimiento, Empresa)
- Elegibilidad por `contract_type` implementada
- Menu integration completada
- Follow-ups diferidos: People 360 tab "Objetivos", auto-derive goals from ICO metrics

## Delta 2026-04-03 — Metric-linked goals must follow the ICO contract

- Si esta lane usa metricas `ICO` como contexto o ejemplo de goal, debe alinearse a `docs/architecture/Contrato_Metricas_ICO_v1.md`.
- Regla nueva:
  - los ejemplos de objetivos basados en `RpA`, `FTR`, `OTD`, `throughput` o metricas afines no deben leerse como thresholds canonicos de salud si contradicen el contrato actualizado
  - goals estrategicos pueden usar targets propios, pero deben distinguirse de benchmark/trust del engine
  - no auto-derivar goals desde metricas `ICO` inmaduras sin respetar `confidence_level` y `quality_gate_status`

## Delta 2026-04-01 — TASK-026 ya resuelta

- Esta lane ya no depende de una migracion futura de contratos: `greenhouse_core.members` expone `contract_type`, `pay_regime`, `payroll_via` y `deel_contract_id` como canon vigente.

## Delta 2026-04-01

- `greenhouse_core.departments` ya es runtime operacional Postgres-first por cierre de `TASK-180`.

## Delta 2026-03-27 — Alineacion arquitectonica

- **Fuente ICO corregida**: las metricas ICO como contexto operativo deben leerse de `greenhouse_serving.ico_member_metrics`.
- **Outbox events obligatorios**: `goal.created`, `goal.updated`, `goal.progress_recorded`, `goal_cycle.activated`, `goal_cycle.closed`
- **Complementariedad con ICO**: Goals miden intencion estrategica, ICO mide delivery operativo. No se solapan.

## Resumen

Modulo de objetivos y OKRs del HRIS en Greenhouse. Permite definir ciclos de objetivos (trimestrales, semestrales, anuales), crear goals que cascadean desde empresa → departamento → individuo, con key results medibles y tracking de progreso.

## Criterios de aceptacion

- [x] 4 tablas creadas en `greenhouse_hr`
- [x] Cycles CRUD con lifecycle: draft → active → review → closed
- [x] Goals cascade: company → department → individual
- [x] Key results con target_value y current_value trackeable
- [x] Progress recording recalcula `goals.progress_percent` automaticamente
- [x] Self-service view muestra mis goals + context de departamento y empresa
- [x] Admin tracking view muestra heatmap de progreso por persona
- [x] Elegibilidad por `contract_type` funciona correctamente
- [ ] People 360 tab "Objetivos" muestra goals across cycles — **diferido como follow-up**

## Implementation notes

### Tablas PostgreSQL (greenhouse_hr)

- `goal_cycles` — ciclos con lifecycle draft/active/review/closed
- `goals` — goals con cascade via `parent_goal_id`, FK a cycles/members/departments
- `goal_key_results` — indicadores medibles con target_value y current_value
- `goal_progress` — log de avance con recalculo automatico

### Core lib (src/lib/hr-goals/)

- `postgres-goals-store.ts` — queries PostgreSQL para CRUD de cycles, goals, KRs y progress
- `eligibility.ts` — reglas de acceso por contract_type (indefinido, plazo_fijo, honorarios, contractor, eor)
- `progress-calculator.ts` — recalculo de progress_percent como promedio de KRs

### API routes (12 endpoints en /api/hr/goals/)

- Cycles: list, create, detail, update, activate, close
- Goals: list, create, detail, update, delete, my, department, company
- Key Results: create, update, delete
- Progress: record, list

### Vistas

- `/my/goals` — self-service con selector de ciclo, cards por goal, registro de avance
- `/hr/goals` — admin con 3 tabs (Ciclos, Seguimiento global, Goals de empresa)

### Outbox events

- `goal.created`, `goal.updated`, `goal.progress_recorded`
- `goal_cycle.activated`, `goal_cycle.closed`

## Lo que NO incluye (follow-ups)

- People 360 tab "Objetivos" — se implementara como follow-up
- Auto-derivacion de goals desde ICO metrics
- Integracion con Notion tasks para tracking automatico
- Gamification o badges por completar goals
- Peer visibility (ver goals de otros colaboradores del mismo nivel)
- Weighting de key results (todos pesan igual en MVP)

---

*Efeonce Greenhouse™ · Efeonce Group · Abril 2026*
