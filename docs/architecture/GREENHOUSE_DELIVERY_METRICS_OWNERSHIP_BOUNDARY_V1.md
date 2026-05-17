# Greenhouse Delivery Metrics Ownership Boundary V1

> **Spec canonical de boundary ownership** — formaliza qué responsabilidad vive en Notion y cuál vive en Greenhouse ICO Engine para todo lo relacionado a métricas de delivery (RpA, OTD, FTR, Cumplimiento, Cycle Time, Throughput, Pipeline Velocity, BCS, TTM, Iteration Velocity, futuras).

| Campo | Valor |
|---|---|
| Status | Accepted |
| Decision date | 2026-05-17 |
| Author | Operador + arch-architect |
| Supersedes | Implícito: el modelo previo donde fórmulas ICO viven como Notion formulas editables |
| Cross-refs | `Contrato_Metricas_ICO_v1.md` Delta 2026-05-17 sección F · `Greenhouse_ICO_Engine_v1.md` · `TASK-901` · `TASK-908` |

---

## 1. Decisión canonical

**Notion = Task Operating System.** Notion captura **datos operativos primitivos** de cada tarea (asignación, fechas, estado, tipo de entregable, archivos adjuntos, comentarios). Es la UI de gestión donde el operador crea, mueve y cierra tareas.

**Greenhouse ICO Engine = Motor exclusivo de métricas de delivery.** Greenhouse **computa todas las métricas** desde los primitives observados (eventos, transiciones, fechas) y **devuelve los valores a Notion vía writeback** a propiedades read-only `[GH] <métrica>`.

| Capa | Owner | Ejemplo |
|---|---|---|
| Datos operativos primitivos | Notion | `Asignado a`, `Estado`, `Fecha límite`, `Fecha de completado`, `Tipo de entregable`, comentarios, archivos |
| Eventos derivados (transitions, edits) | Notion → Greenhouse (vía webhook canonical) | `status: Listo para revisión → En Feedback` |
| Cómputo de métricas | Greenhouse ICO Engine | `RpA`, `OTD%`, `FTR`, `Cumplimiento`, `Cycle Time`, `Throughput`, `Pipeline Velocity`, `BCS`, `TTM`, `Iteration Velocity` |
| Writeback de métricas a Notion | Greenhouse (bulk PATCH) | propiedades `[GH] RpA`, `[GH] OTD%`, `[GH] FTR`, `[GH] Cumplimiento`, etc. (read-only para operadores) |
| Display de métricas al operador | Notion (formula passthrough) + Greenhouse dashboards | UI Notion muestra `[GH] <métrica>` live; Greenhouse muestra agregados (Pulse, Person 360, scorecards) |

---

## 2. Por qué este boundary (cinco razones canonical)

### 2.1 Las fórmulas como propiedades de Notion son frágiles

Cualquier operador con acceso de edición a la database puede romper, modificar o reemplazar accidentalmente una fórmula `RpA`/`OTD`/`FTR`/`Cumplimiento`. Sin git history, sin tests, sin code review, sin auditoría, sin observabilidad. Bug class real demostrado live:

- **TASK-877 follow-up 2026-05-16**: 3,168 tareas Sky en 10 meses con `rpa = null` 100%. La fórmula evaluaba correctamente per-page en Notion pero el sync `notion-bq-sync` perdía el valor. Detectado solo cuando un operador reportó UI rota. Sin audit trail.
- **Riesgo permanente**: cualquier cambio inadvertido por un operador en Notion = pérdida silenciosa de meses de métricas sin que el equipo se entere.

### 2.2 Greenhouse ya tiene el stack para hacer compute robusto

- Tests unitarios + integration verde como gate de merge
- Versionado git append-only con audit completo
- Code review obligatorio
- Observability via `captureWithDomain` + reliability signals
- Outbox pattern + reactive consumers idempotentes (TASK-773, TASK-771)
- Postgres como single source of truth runtime
- Materializer pattern (TASK-900) para BQ projections

Mover el compute a Greenhouse es **reusar infraestructura canonical existente**, no construir algo nuevo.

### 2.3 Notion sigue siendo la UI de gestión operativa

Los operadores NO pierden funcionalidad. **Siguen viendo las métricas live en Notion** — porque Greenhouse las escribe de vuelta vía bulk PATCH a propiedades `[GH] <métrica>` que renderean igual que cualquier number/formula property nativa. Latencia esperada: 5-30s post-edit (webhook → consumer → bulk PATCH).

La única diferencia operativa: las propiedades `[GH] <métrica>` son **read-only** (solo el integration token de Greenhouse las escribe). El operador no puede editarlas accidentalmente.

### 2.4 Las métricas se vuelven **observables**, **auditables** y **versionables**

Cada cómputo de métrica deja:
- Audit row en PG (cuándo se computó, con qué inputs)
- Outbox event versionado (`notion.task.metric_written v1`)
- Reliability signal de drift (compute canonical vs Notion-stored)
- Tests anti-regresión que documentan la fórmula vigente

Si un operador discute un valor de RpA, Greenhouse muestra el historial de transiciones que lo generaron + timestamp + actor. Hoy esto NO existe.

### 2.5 Una sola fuente de cómputo elimina drift cross-surface

Hoy el cómputo de métricas vive en al menos 3 lugares:
- Fórmulas Notion (UI Notion)
- `metric-registry.ts` SQL embebido (Greenhouse dashboards)
- BQ views materializadas (`v_tasks_enriched`, `metrics_by_*`)

Cualquier divergencia entre estos lugares = el operador ve un número en Notion y otro en `/agency/pulse`. Centralizar todo el compute en Greenhouse y devolver a Notion vía writeback **garantiza paridad exacta** porque el valor en Notion **viene** del compute de Greenhouse.

---

## 3. Pipeline canonical

```text
Notion edit (operador cambia status, fecha, asignación, etc.)
    ↓ webhook canonical (HMAC validated, echo-loop filtered)
Vercel /api/webhooks/notion-tasks/route.ts
    ↓ outbox event versionado
Cloud Scheduler */2 min → ops-outbox-publish (TASK-773 canonical)
    ↓ status = 'published'
Cloud Scheduler */5 min → ops-reactive-process
    ↓ reactive consumer en ops-worker
ICO Engine canonical compute (Greenhouse code)
  - calculateRpa(taskId)         ← lee greenhouse_delivery.task_status_transitions
  - calculateOtd(taskId)         ← lee performance_indicator state machine
  - calculateFtr(taskId)         ← delega a calculateRpa
  - calculateCumplimiento(taskId)
  - calculateCycleTime(taskId)   ← lee transitions + descuenta Bloqueado
  - calculateThroughput(...)     ← agregado mensual
  - calculatePipelineVelocity(...)
  - ... otras métricas progresivamente
    ↓ enqueue Cloud Tasks (throttled vs Notion rate limit 3 req/sec)
Cloud Tasks queue 'notion-writeback'
    ↓
ops-worker /notion-metrics/bulk-writeback (per-task endpoint)
    ↓ PATCH /v1/pages/bulk (up to 100 pages, Notion-Version 2026-02-01)
Notion properties [GH] RpA / [GH] OTD% / [GH] FTR / [GH] Cumplimiento updated
    ↓
Operador ve métrica live en UI Notion
```

Plus safety net nocturno: Cloud Run Job que escanea tareas con `last_edited_time > checkpoint`, recomputa via mismo helper canonical, detecta drift Greenhouse vs Notion-stored, re-writeback si hay drift > threshold.

---

## 4. Migración progresiva canonical (strangler pattern)

**NO migramos las 10+ métricas de una vez.** El roadmap canonical valida cada migración antes de aplicar el patrón a la siguiente:

| Fase | Métrica | Task | Status |
|---|---|---|---|
| **Foundation** | Status transition tracking (prerequisito de TODO compute basado en eventos) | TASK-908 | En diseño 2026-05-17 |
| **V1** | RpA (writeback completo del pattern) | TASK-901 | En diseño 2026-05-17 |
| **V2** | OTD (writeback) | TASK-902 (futuro) | Backlog |
| **V3** | FTR (writeback, delega a calculateRpa) | TASK-909 (parcial, V1 sin writeback) → TASK-903 (writeback) | TASK-909 a crear 2026-05-17 |
| **V4** | Cumplimiento (writeback) | TASK-904 (futuro) | Backlog |
| **V5+** | Throughput, Cycle Time SLO%, Pipeline Velocity, Iteration Velocity (writebacks) | TBD | Backlog |
| **V6+** | BCS, TTM (AI-derived, infra ya parcial) | TASK-910 BCS + futura TTM | Backlog |

Reglas de migración:

- Cada Vn ship con shadow mode mínimo 7 días (compute en Greenhouse + LOG-only, sin writeback) antes de activar writeback.
- Reliability signal `notion.metrics.shadow_paridad_<metrica>` debe estar verde 7d antes de avanzar.
- Después del writeback, las fórmulas Notion originales **se mantienen activas en paralelo** durante observación 7-14 días más (paridad cross). Después se deprecan.
- Cuando la métrica Vn entra en operación con writeback estable, la propiedad formula Notion original queda como **fallback histórico** (no se borra de templates legacy ni de tareas pre-migration, pero nuevas tareas usan solo `[GH] <métrica>`).

---

## 5. Hard rules canonical (no negociables)

- **NUNCA** introducir una propiedad formula nueva en Notion para calcular una métrica ICO. Toda métrica nueva nace en Greenhouse code (con tests + reliability signal + writeback).
- **NUNCA** modificar/editar/reemplazar una fórmula Notion existente de métrica ICO sin coordinar paralelamente con el helper canonical en Greenhouse (la métrica vive en código, Notion es solo display vía writeback).
- **NUNCA** computar una métrica ICO leyendo otra propiedad Notion como input cuando esa propiedad sea derivable de eventos canonical (transitions, fechas). Ejemplo prohibido: leer Notion `Correcciones` rollup para computar RpA — el RpA canonical viene de `countCorrectionTransitions(taskId)` que lee `greenhouse_delivery.task_status_transitions`.
- **NUNCA** consumer downstream (UI, dashboard, scorecard, report PDF) recomputa una métrica ICO inline. Toda lectura pasa por:
  1. La columna materializada (`v_tasks_enriched.rpa`, `metrics_by_*.otd_pct`, etc.) — fuente preferida para agregados.
  2. El helper canonical (`calculateRpa(taskId)`) — solo cuando se necesita compute on-the-fly para una tarea específica.
- **NUNCA** invocar `Sentry.captureException()` directo en code paths de compute o writeback. Usar `captureWithDomain(err, 'integrations.notion', { tags: { source: 'metric_compute' | 'metric_writeback', metric: '<name>' } })`.
- **NUNCA** activar writeback de una métrica nueva sin: (a) flag `NOTION_<METRIC>_WRITEBACK_ENABLED` (default false), (b) shadow mode 7 días verde, (c) reliability signal de paridad steady=0, (d) approval explícito en `Handoff.md` con allowlist de propiedades target.
- **SIEMPRE** que un input nuevo emerja para una métrica (e.g. Frame.io integration aporta `client_change_round` real para RpA), extender el helper canonical en Greenhouse + agregar tests anti-regresión + NO crear fórmula Notion paralela.
- **SIEMPRE** que se cree una propiedad Notion `[GH] <métrica>`, documentar en este doc + DECISIONS_INDEX + spec arquitectónica de la métrica que la propiedad es **read-only para operadores** (solo Greenhouse integration token escribe).

---

## 6. Excepciones canonical (lo que sí queda en Notion)

Notion **sigue siendo source of truth** para:

- **Datos operativos primitivos** que el operador edita (asignación, fechas planeadas/completadas, status, tipo de entregable, prioridad, dependencias, comentarios, archivos adjuntos).
- **Eventos disparadores** (status transitions, property edits, page creation) — Greenhouse los recibe vía webhook pero no los origina.
- **UI de gestión de tareas** (crear, mover, cerrar, asignar, comentar).
- **Vista live de métricas a operadores** (vía propiedades `[GH] <métrica>` escritas por Greenhouse).

Notion **NO** debe contener:

- Fórmulas que computen métricas ICO (RpA, OTD, FTR, Cumplimiento, Cycle Time, Throughput, Pipeline Velocity, Iteration Velocity, BCS, TTM, etc.).
- Rollups que sirvan como input directo a una métrica ICO cuando exista un canonical event capture (e.g. el rollup `Correcciones` queda deprecado para RpA cuando TASK-908 capture transitions esté activo).

---

## 7. Implementación referencia canonical (TASK-908 + TASK-901)

### 7.1 TASK-908 = Foundation de status transition capture

- Tabla canonical `greenhouse_delivery.task_status_transitions` (append-only, capturada vía webhook Notion).
- Helper canonical `countCorrectionTransitions(taskId)` = count de transiciones `Listo para revisión → En Feedback` para esa tarea.
- Helper canonical `calculateCycleTime(taskId)` = (start status → end timestamp) descontando intervalos `Bloqueado`/`Detenido`.

### 7.2 TASK-901 = Primera writeback completa (RpA)

- Helper canonical `calculateRpa(taskId)` **delega a `countCorrectionTransitions(taskId)`** del módulo TASK-908. NO lee propiedad Notion `Correcciones`.
- Webhook ingestion + outbox + reactive consumer + Cloud Tasks throttling + bulk PATCH a propiedad `[GH] RpA`.
- Pattern reusable para TASK-902/903/904 (OTD/FTR/Cumplimiento).

### 7.3 Semántica canonical de "corrección" (Delta 2026-05-17 sección G)

**1 corrección = 1 transición `Listo para revisión → En Feedback`.** No es ronda interna, no es comentario sin resolver, no es review del workflow team. Es específicamente "el cliente vio el entregable y pidió cambios".

Casos edge:

| Escenario | Cuenta como corrección? |
|---|---|
| Listo para revisión → En Feedback | **Sí** (+1) |
| En Feedback → Listo para revisión (re-submit) | No (colaborador re-entregando) |
| En curso → En Feedback (sin pasar por revisión) | No (trabajo en progreso, no rechazo del cliente) |
| Listo para revisión → Completado/Aprobado | No (aprobación directa, RpA=0 para esa tarea) |
| Listo para revisión → En curso (sin feedback) | No (colaborador decidió retomar) |

Forward-compat: cuando Frame.io exista, el helper `calculateRpa` extiende inputs para considerar también `client_review_open`, `workflow_review_open`, `open_frame_comments` (sin breaking change — solo agrega señales adicionales que el helper combina).

---

## 8. Consecuencias arquitectónicas downstream

- **`Greenhouse_ICO_Engine_v1.md`** queda como **conceptual spec** de qué mide cada métrica y por qué. La implementación canonical vive en `src/lib/ico-engine/` + `src/lib/notion-metrics/`. Drift entre Engine doc y código se resuelve actualizando el código primero, después el Engine doc para reflejar.
- **`Contrato_Metricas_ICO_v1.md`** queda como **contrato de medición** (qué cuenta como `On-Time`, qué es `Cumplimiento`, qué se excluye del denominador, etc.). El boundary doc actual (este) referencia el contrato pero lo extiende.
- **`metric-registry.ts`** queda como **runtime contract de qué métricas se exponen** (display name, unit, thresholds, formula SQL para agregados). Los helpers `calculate<Metric>(taskId)` viven en `src/lib/notion-metrics/` (compute per-task) y `metric-registry.ts` define los agregados que consumen las columnas materializadas.
- **Notion DB templates** quedan como **definición operativa** (propiedades, status options, default views) pero **NO** como definición de métricas. Cualquier template nuevo debe declarar las propiedades primitivas + las propiedades `[GH] <métrica>` (read-only target del writeback) — NO formulas de métricas.

---

## 9. Cross-references canonical

- `Contrato_Metricas_ICO_v1.md` Delta 2026-05-17 sección F — declara este boundary en el contrato de métricas
- `Greenhouse_ICO_Engine_v1.md` — conceptual spec de cada métrica (drift por resolver post-TASK-908/909/901)
- `TASK-901` — primera writeback completa (RpA), referencia este doc como precondition
- `TASK-908` — foundation de status transitions + helper `countCorrectionTransitions`
- `TASK-909` — FTR canonical (delega a calculateRpa) + Throughput + Pipeline Velocity definitions drift resolution
- `TASK-902/903/904` (futuras) — OTD/FTR/Cumplimiento writebacks progresivos
- `TASK-910` (futura) — BCS AI layer activation
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` — pattern webhook ingestion canonical
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — pattern outbox + consumer canonical
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — pattern reliability signal canonical
- `CLAUDE.md` sección "Delivery Metrics Ownership Boundary invariants (TASK-901+908+909, desde 2026-05-17)" — hard rules canonical para agentes

---

## 10. Open questions deliberadamente NO resueltas en V1

- **Notion DB templates legacy con formulas RpA/OTD/FTR/Cumplimiento embedded**: ¿deprecarlas globalmente post-V4 o dejarlas como fallback histórico inactivo? Decisión: dejar como fallback histórico hasta que steady-state ≥ 30d demuestre que el writeback canonical no falla; entonces remover formulas de templates nuevos (sin tocar tareas históricas).
- **Granularidad del writeback**: ¿escribir per-task tras cada transition o batchear cada 5 min? Decisión V1: batchear con bulk PATCH (hasta 100 tareas por request, 1 hit contra rate limit). Latencia esperada 5-30s.
- **Workflow team rounds (internal review)**: cuando emerja el sistema de internal review (workflow_change_round, workflow_review_open), ¿cuentan para RpA o se reportan en métrica separada? Decisión V1: NO cuentan para RpA (RpA es rondas de CLIENTE). Posible métrica futura `IRR` (Internal Review Rounds) reportada en paralelo, no agregada a RpA.
