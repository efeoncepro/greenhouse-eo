# TASK-031 — HRIS Performance Evaluations

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno rebaselined al runtime 2026`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `task/TASK-031-hris-performance-evaluations`
- Legacy ID: `CODEX_TASK_HRIS_Performance_Evaluations`
- GitHub Issue: `none`

## Summary

Implementar el módulo HRIS de evaluaciones de desempeño 360 para que Greenhouse pueda correr ciclos formales de autoevaluación, evaluación de pares, evaluación de supervisor y consolidación HR sobre el runtime canónico actual. La task debe materializar schema `eval_*`, APIs, surfaces `/my/evaluation` y `/hr/evaluations`, y un summary cuantitativo/cualitativo que consuma `ICO` desde PostgreSQL y degrade con seguridad mientras `Goals` siga pendiente.

## Why This Task Exists

La necesidad funcional sigue viva: hoy Greenhouse tiene vistas de desempeño, métricas `ICO`, jerarquía supervisoria y un dominio HR cada vez más formal, pero no tiene un módulo canónico de evaluación 360 que registre inputs cualitativos, ownership del ciclo ni resúmenes cerrables por persona.

El brief legacy quedó desalineado por tres razones:

- seguía asumiendo BigQuery como fuente directa de métricas, cuando el carril canónico actual ya es `greenhouse_serving.ico_member_metrics`
- trataba `TASK-029` como bloqueo total, cuando el summary puede diseñarse con degradación graceful de goals
- describía un módulo completo, pero sin reconocer que hoy no existen tablas `eval_*`, routes ni event wiring para esta lane

Si no se reescribe, el riesgo es abrir una implementación frágil: leyendo fuentes equivocadas, duplicando lógica de jerarquía o atando el módulo a una dependencia todavía no materializada.

## Goal

- Materializar el dominio `greenhouse_hr.eval_*` como módulo canónico de evaluaciones 360.
- Reutilizar jerarquía, serving `ICO`, permissions y route groups existentes del portal en vez de crear contratos paralelos.
- Dejar el summary listo para combinar ratings cualitativos con métricas cuantitativas, usando `goals` como input opcional hasta que `TASK-029` cierre.

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
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`
- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`

Reglas obligatorias:

- Las métricas cuantitativas de desempeño deben leerse desde `greenhouse_serving.ico_member_metrics`; no leer BigQuery directo ni snapshots ad hoc.
- La asignación de supervisor y reportes debe consumir `greenhouse_core.members.reports_to_member_id`; no inventar otra fuente de jerarquía.
- Si `greenhouse_hr.goals` sigue ausente al implementar esta lane, el módulo debe degradar a `null` para campos de goals; no bloquear ni romper el summary completo.
- El módulo de evaluaciones consume `ICO`, People y HR, pero no modifica el contrato del engine ni escribe sobre serving tables.
- Las surfaces deben respetar route groups y authorization existentes (`my`, `hr`, `people`) sin abrir un permiso paralelo.
- Cualquier wiring de aprobación o snapshot debe reutilizar `workflowDomain = 'performance_evaluation'`, ya reservado en Approval Authority.
- Los eventos `hr.eval_*` solo se agregan si el discovery confirma consumers reales y aggregate names consistentes con el event catalog vigente.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/to-do/TASK-029-hris-goals-okrs.md`
- `docs/tasks/complete/TASK-026-hris-contract-type-consolidation.md`
- `docs/tasks/complete/TASK-180-hr-departments-postgres-runtime-cutover.md`
- `docs/tasks/complete/TASK-326-approval-authority-workflow-snapshots.md`

## Dependencies & Impact

### Depends on

- `src/lib/sync/projections/ico-member-metrics.ts`
- `src/lib/sync/projections/person-intelligence.ts`
- `src/app/api/my/performance/route.ts`
- `src/app/(dashboard)/my/performance/page.tsx`
- `src/views/greenhouse/my/MyPerformanceView.tsx`
- `src/views/greenhouse/people/tabs/PersonIntelligenceTab.tsx`
- `src/views/greenhouse/people/tabs/PersonHrProfileTab.tsx`
- `src/lib/approval-authority/config.ts`
- `src/lib/approval-authority/types.ts`
- `src/lib/hr-core/service.ts`
- `src/lib/hr-core/supervisor-workspace.ts`
- `src/lib/hr-core/talent-review.ts`
- `docs/tasks/to-do/TASK-029-hris-goals-okrs.md`

### Blocks / Impacts

- `/my/evaluation`
- `/hr/evaluations`
- People 360 / `person_intelligence`
- future notifications y lifecycle de resultados
- HR talent review, calibration y conversaciones de desarrollo

### Files owned

- `docs/tasks/to-do/TASK-031-hris-performance-evaluations.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/documentation/hr/evaluaciones-desempeno.md`
- `src/lib/hr-core/**`
- `src/lib/approval-authority/**`
- `src/lib/sync/projections/person-intelligence.ts`
- `src/lib/sync/event-catalog.ts`
- `src/app/api/my/**`
- `src/app/api/hr/**`
- `src/app/api/people/[memberId]/**`
- `src/views/greenhouse/my/**`
- `src/views/greenhouse/hr-core/**`
- `src/views/greenhouse/people/tabs/**`

## Current Repo State

### Already exists

- La arquitectura HRIS ya define el dominio `eval_*` bajo `greenhouse_hr` en `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`.
- El repo ya tiene carril cuantitativo canónico para desempeño:
  - `src/lib/sync/projections/ico-member-metrics.ts`
  - `greenhouse_serving.ico_member_metrics`
  - `src/app/api/my/performance/route.ts`
  - `src/views/greenhouse/my/MyPerformanceView.tsx`
- La jerarquía supervisoria y la elegibilidad base ya existen en el modelo canónico:
  - `greenhouse_core.members.reports_to_member_id`
  - `greenhouse_core.members.contract_type`
  - `greenhouse_core.members.payroll_via`
  - `greenhouse_core.members.department_id`
- Approval Authority ya reserva el dominio `performance_evaluation`:
  - `src/lib/approval-authority/config.ts`
  - `src/lib/approval-authority/types.ts`
- `person_intelligence` ya existe como surface/proyección para enriquecer People 360:
  - `src/lib/sync/projections/person-intelligence.ts`
  - `src/views/greenhouse/people/tabs/PersonIntelligenceTab.tsx`

### Gap

- No existen tablas `greenhouse_hr.eval_competencies`, `eval_cycles`, `eval_assignments`, `eval_responses` ni `eval_summaries` materializadas en repo ni en tipos.
- No existen APIs de evaluaciones en `/api/hr/evaluations` ni surface `/my/evaluation`.
- No existe wiring `hr.eval_*` en `src/lib/sync/event-catalog.ts`.
- `TASK-029` sigue pendiente y no existe todavía `greenhouse_hr.goals` materializado en el repo actual.
- El brief legacy todavía mezclaba la intención funcional correcta con supuestos técnicos ya obsoletos.

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

### Slice 1 — Canonical schema + domain runtime

- materializar las tablas `eval_competencies`, `eval_cycles`, `eval_assignments`, `eval_responses` y `eval_summaries`
- seedear un catálogo inicial de competencias compatible con niveles y categorías del HRIS
- crear types y store/helpers canónicos para:
  - lifecycle de ciclo
  - tipo de evaluador (`self`, `peer`, `manager`, `direct_report`)
  - status de assignment
  - estructura de summary y breakdown por origen

### Slice 2 — Cycle orchestration + assignments

- implementar creación/edición de ciclos y avance de fases
- auto-crear assignments usando supervisoría y peers sugeridos desde el modelo actual
- permitir override HR sobre assignments sin romper la matriz base
- definir elegibilidad usando `contract_type`, `payroll_via`, tenure y department sin introducir otra taxonomía

### Slice 3 — API routes + authorization

- crear readers/writers tenant-safe bajo:
  - `/api/hr/evaluations/*`
  - `/api/my/evaluation/*`
- reutilizar authorization y route groups existentes para `my`, `hr` y People 360
- exponer rutas para:
  - competencias
  - ciclos
  - assignments
  - responses
  - summaries

### Slice 4 — UI self-service + HR admin

- crear la vista `/my/evaluation` para autoevaluación, pendientes y resumen final
- crear la vista `/hr/evaluations` para ciclos, assignments, calibration y summaries
- reutilizar patrones Vuexy/MUI y componentes ya presentes en `my/performance`, `hr-core` y `people`
- dejar claro qué fase está activa y qué inputs están pendientes

### Slice 5 — Summary generation + People 360 enrichment

- generar `eval_summaries` combinando ratings cualitativos con métricas `ICO`
- dejar `goal_completion_pct` como campo opcional o `null` mientras `TASK-029` siga pendiente
- enriquecer `person_intelligence` o la surface equivalente con `eval_overall_rating`, `eval_cycle_id` y estado de cierre
- evaluar wiring de notificaciones y outbox solo si discovery confirma consumers reales

## Out of Scope

- implementar `TASK-029` dentro de esta misma lane
- leer métricas de desempeño directo desde BigQuery
- redefinir benchmarks o trust model de `ICO`
- abrir un sistema nuevo de jerarquía/ownership paralelo a `reports_to_member_id`
- convertir esta task en un programa completo de talento o calibration enterprise multi-módulo
- automatizar compensación, promociones o decisiones salariales dentro del mismo flujo

## Detailed Spec

La lectura correcta de esta task en 2026 es:

- el **producto** sigue siendo un módulo de evaluaciones 360
- el **runtime cuantitativo** ya no se apoya en BigQuery directo, sino en `greenhouse_serving.ico_member_metrics`
- la **dependencia de Goals** es importante, pero no debe impedir el primer corte del módulo
- el **summary** debe permitir inputs cualitativos y cuantitativos sin confundir benchmark operativo con policy de desarrollo

### Contrato funcional recomendado

El módulo debe permitir:

- crear ciclos de evaluación (`draft`, `self_eval`, `peer_eval`, `manager_review`, `calibration`, `closed`)
- asignar evaluadores automáticamente y permitir ajustes manuales
- registrar respuestas por competencia con rating y comentario
- consolidar un summary por persona y ciclo
- mostrar al colaborador solo su propia participación y resultado habilitado
- permitir a HR y supervisoría la lectura operativa necesaria sin sobreexponer inputs confidenciales

### Contrato técnico mínimo

El summary cuantitativo debe separar:

- rating cualitativo por competencias
- métricas `ICO` observadas durante el período
- campos derivados de goals solo si existen

Campos esperados del summary:

- `overall_rating`
- `self_rating`
- `peer_rating`
- `manager_rating`
- `ico_rpa_avg`
- `ico_otd_percent`
- `goal_completion_pct` o equivalente nullable
- `strengths`
- `development_areas`
- `hr_notes`
- `finalized_by`
- `finalized_at`

### Regla de goals

`TASK-029` sigue siendo un follow-on importante, pero ya no debe leerse como un bloqueo duro para arrancar esta lane. Si la tabla o reader de goals no existe al implementar:

- el summary debe persistir sin ese dato
- los campos de goals quedan `null`
- la UI debe comunicar que el componente estratégico todavía no está disponible

### Regla de eventos

No asumir que `hr.eval_*` ya existe en el event catalog. El discovery debe confirmar:

- si hay consumers reales
- si la granularidad correcta es por `evalCycle`, `evalAssignment` o `evalSummary`
- si `person_intelligence` necesita refresh reactivo inmediato o basta con refresh por read path

### Regla de People 360

People 360 debe recibir solo el output consolidado necesario:

- rating general
- ciclo activo/cerrado
- metadata de cierre

No debe exponerse sin filtro todo el detalle de respuestas crudas por evaluador salvo que exista una política explícita de visibilidad.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La task ya no asume BigQuery directo como fuente de métricas para evaluaciones
- [ ] Queda explícito que `goals` es una dependencia soft con degradación graceful, no un bloqueo duro del primer corte
- [ ] Queda documentado que el módulo debe reutilizar `reports_to_member_id`, `ico_member_metrics` y `performance_evaluation` del runtime actual
- [ ] El scope separa con claridad schema, orchestration, APIs, UI y summary enrichment
- [ ] La lane queda lista para implementación sin contradicciones materiales con arquitectura o repo actual

## Verification

- revisión documental contra:
  - `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
  - `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`
  - `docs/architecture/Contrato_Metricas_ICO_v1.md`
  - `docs/tasks/to-do/TASK-029-hris-goals-okrs.md`
- `git diff --check`

## Closing Protocol

- [ ] Actualizar `Handoff.md` dejando explícito si el módulo se implementó con o sin integración activa de goals
- [ ] Actualizar `docs/documentation/hr/evaluaciones-desempeno.md` cuando exista comportamiento visible de usuario
- [ ] Confirmar si `person_intelligence` absorbió el summary por projection reactiva o por read path explícito

## Follow-ups

- `TASK-029` — Goals y OKRs para completar el input estratégico del summary
- follow-on de notificaciones si HR pide avisos automáticos por fase
- follow-on de calibration/analytics enterprise si negocio pide comparativas transversales entre ciclos

## Delta 2026-04-13

- Task rebaselined al runtime actual del repo.
- `ICO` queda fijado a `greenhouse_serving.ico_member_metrics`.
- `Goals` pasa de hard dependency conceptual a integración opcional con degradación graceful hasta que `TASK-029` se materialice.
- Se reconoce que hoy no existe schema `eval_*`, APIs ni views del módulo en el repo.
