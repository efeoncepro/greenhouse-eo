# Contrato de métricas ICO

## Delta 2026-05-17 — Precisión implementacional sesión RpA / Indicador de Performance / Cumplimiento / Cycle Time

Post-incidente TASK-877 follow-up (commit `4fc8c0c4` 2026-05-16) que recuperó el bridge Notion↔member, esta sesión hizo deep-dive del contrato de métricas para detectar gaps entre el conceptual (este doc + `Greenhouse_ICO_Engine_v1.md`) y la implementación runtime (`src/lib/ico-engine/`, formulas Notion en Sky y Efeonce DBs). Esta Delta consolida (A) confirmaciones canonical del estado actual, (B) gaps implementacionales detectados pendientes de remediation, y (C) decisiones pendientes sobre Cycle Time antes de canonizar el compute helper.

Esta Delta es precondición canonical para `TASK-901 — Canonical Notion Metric Compute V1 (RpA-only)`. La precisión documentada acá alimenta el Discovery slice + Slice 1 (canonical helper) sin re-derivar interpretación de la fórmula Notion vigente.

### A) Confirmados del estado actual (2026-05-17)

#### A.1 RpA — fuente de datos hoy en producción

- La fórmula canónica de `RpA` en Notion (data sources `23039c2f-efe7-81f8-af2d-000b67594d18` Sky + `5126d7d8-bf3f-454c-80f4-be31d1ca38d4` Efeonce, formula codeUrl `PVhQTw` compartido) lee según `Review Source` (select Notion: `Auto` / `Frame.io` / `Workflow`):
  - `Review Source = Frame.io` → `Client Change Round` (number property, contador automático esperado desde Frame.io)
  - `Review Source = Workflow` → `Workflow Change Round` (number property, contador automático esperado desde workflow)
  - `Review Source = Auto` → `Correcciones` rollup (count de la relation `Correcciones` con base Correcciones, manual)
- **Estado actual canonical**: la integración Frame.io **NO está desarrollada todavía**. `Client Change Round` y `Workflow Change Round` están vacíos en 100% de las tareas Sky y en la gran mayoría de Efeonce. En producción hoy, **RpA per-task = count de `Correcciones` rollup exclusivamente** (path `Auto` del dispatcher, o fallback cuando `Review Source` está null).
- **RpA semánticamente es rondas DE CLIENTE solamente**. Una ronda = ciclo completo de cambios solicitados por cliente entre 2 envíos a revisión. Workflow rounds (internos del equipo) **NO** deben contar para RpA. La fórmula Notion respeta esto vía `Review Source` dispatcher, pero el dispatcher solo aplica cuando el property se setea explícitamente — por defecto cae en `Auto` (Correcciones manual), que conceptualmente representa correcciones cliente capturadas manualmente.
- Bug class detectado live 2026-05-16: BQ `notion_ops.tareas.rpa` = `null` en 100% para Sky (3,168 tareas completadas en 10 meses, Aug 2025 – May 2026). La fórmula evalúa correctamente per-page en Notion (verified vía MCP fetch + Notion Web UI), pero el sync `notion-bq-sync` no extrae `prop.formula.number` correctamente. **Es bug del sync, no de la fórmula Notion ni del schema**. Esto motiva `TASK-901` (mover compute canonical a Greenhouse code + writeback a propiedad `[GH] RpA`).

#### A.2 Indicador de Performance — 4 buckets canonical per-task

- Property Notion: `Indicador de Performance` (formula, codeUrl `b00_Og` Sky)
- Descripción canónica verbatim del property: *"Clasifica cada tarea del mes actual en On-Time, Late Drop, Overdue o Carry-Over."*

| Bucket | ¿Tarea cerrada? | ¿Pasada fecha límite? | Entra en OTD denominador? | Entra en OTD numerador? |
|---|---|---|---|---|
| **On-Time** | ✅ Sí (estado terminal) | ❌ No | ✅ | ✅ |
| **Late Drop** | ✅ Sí | ✅ Sí | ✅ | ❌ |
| **Overdue** | ❌ No (abierta) | ✅ Sí | ✅ | ❌ |
| **Carry-Over** | ❌ No (abierta) | ❌ No (aún dentro de plazo) | ❌ | ❌ |

`Carry-Over` no entra en OTD porque la tarea **aún tiene tiempo** — no es un "fracaso de entrega", solo continuación de trabajo del mes anterior dentro del plazo. Esto es coherente con el código actual (`src/lib/ico-engine/metric-registry.ts:202-206`) que define el denominador OTD como `(on_time OR late_drop OR overdue)`, excluyendo `carry_over`.

**Naming canonical aclarado** (resolución sesión 2026-05-17):

| Concepto | Naming canonical | Granularidad | Para qué sirve |
|---|---|---|---|
| El bucket per-task (4 categorías) | `performance_indicator_code` / `Indicador de Performance` | Per-task | Saber en qué bucket cayó UNA tarea |
| El % entregadas a tiempo del período | `OTD%` / `otd_pct` | Per-member-month o per-space-month | KPI agregado canonical |
| El label per-task de velocidad relativa al plazo | `Cumplimiento %` / `delivery_compliance` | Per-task | Audit signal cualitativo (`"100 %"`, `"100+ %"`) |
| La narrativa agregada de OTD family | "Cumplimiento de promesa" | Per-período | Lectura de negocio en QBR/CVR |

**Acción canonical sugerida**: agregar `carry_over` como 4° valor explícito al enum `performance_indicator_code` en código (hoy solo se manejan `on_time`, `late_drop`, `overdue`). Sin esto, `carry_over` tasks llegan como string suelto sin clasificación enum.

#### A.3 Cumplimiento — dual meaning canonical

`Cumplimiento` se usa con DOS significados distintos en el ecosistema. Esta Delta los formaliza separados para que el código no los confunda:

- **Cumplimiento de promesa (agregado, categoría narrativa)**: alias de la familia OTD% en lectura de negocio. Agrupa `otd_pct` + `on_time_count` + `late_drop_count` + `overdue_count`. Documentado canonical en `Greenhouse_ICO_Engine_v1.md` línea 2363, sección `A.5.4.0 Categorías funcionales de métricas ICO`. **NO es métrica separada** — es categoría narrativa para QBR/CVR. Responde la pregunta de negocio "¿Estamos cumpliendo la promesa operativa del período?".
- **Cumplimiento % (per-task, audit signal)**: property Notion `Cumplimiento %` (formula codeUrl `Yk47Tg` Sky), sincronizada como columna `delivery_compliance` en `greenhouse_conformed.delivery_tasks` y `greenhouse_delivery.tasks` (vía `src/lib/sync/sync-notion-conformed.ts:1284` y aliases definidos en `src/lib/space-notion/notion-governance-contract.ts:204`). Valores observados en BQ: `"100 %"` (cumplimiento exacto), `"100+ %"` (entrega adelantada), presumiblemente `"<100 %"` cuando hay atraso. Clasificada como **"Contexto de auditoría"** en `Greenhouse_ICO_Engine_v1.md` línea 2372 — **NO entra en agregados de métricas**, es señal explicativa per-task que sirve para entender por qué una tarea individual cayó en su bucket.

**Implicación canonical**: `delivery_compliance` se persiste per-task pero NO se agrega a `metrics_by_member` ni a `metrics_by_*`. Es solo lectura per-task en `get-project-detail.ts:494` (campo `deliveryCompliance` del API response). Esto es coherente con el contrato y NO debe modificarse.

#### A.4 Regla canonical de exclusión de tareas

Validado con operador en sesión 2026-05-17:

- **Denominador de OTD / RpA / FTR / Cycle Time / Cycle Time Variance**: excluye tareas en estados `Bloqueado`, `Detenido`, `Archivada`, `Archivadas`, `Archivado`, `Cancelada`, `Canceled`, `Cancelled`.
- **Total de tareas visible (reporting/UI, count para mostrar carga)**: incluye TODAS las tareas independiente del estado. Operador necesita ver carga completa para gestión.
- **Justificación operativa**: tareas bloqueadas o detenidas no son "fracaso del colaborador" — están bloqueadas por dependencias externas o decisiones del cliente. Contaminar el denominador con esas tareas penalizaría injustamente al equipo en OTD/RpA/FTR. Pero el operador SÍ necesita contarlas para entender carga real (planning, capacity).

#### A.5 RpA per-task helper canonical (input para TASK-901 Slice 1)

Con A.1 confirmado, el helper canonical `calculateRpa(taskInputs) → number | null` que TASK-901 Slice 1 debe implementar se simplifica a:

```typescript
type TaskInputsForRpa = {
  reviewSource: 'auto' | 'frame_io' | 'workflow' | null
  clientChangeRound: number | null      // hoy SIEMPRE null (Frame.io integration pendiente)
  workflowChangeRound: number | null    // hoy SIEMPRE null (workflow integration pendiente)
  correccionesCount: number             // rollup count, valor real hoy
}

// Lógica canonical 2026-05-17:
calculateRpa({ reviewSource, clientChangeRound, workflowChangeRound, correccionesCount }) → number
// = reviewSource === 'frame_io' && clientChangeRound != null ? clientChangeRound
// : reviewSource === 'workflow' && workflowChangeRound != null ? workflowChangeRound
// : correccionesCount  // fallback canonical (Auto path)
```

Hoy, en práctica, **siempre retorna `correccionesCount`** porque las 2 fuentes automáticas están vacías. Pero el helper queda forward-compatible cuando Frame.io / workflow integrations se desarrollen (no requerirá refactor — solo poblar los inputs).

### B) Gaps implementacionales detectados — pendientes de remediation

#### B.1 ⚠️ `Bloqueado` no excluido del denominador de métricas

**Evidencia**: `src/lib/ico-engine/metric-registry.ts:122-123`:

```typescript
export const EXCLUDED_STATUSES = ['Archivadas', 'Archivada', 'Cancelada', 'Canceled', 'Cancelled', 'Archivado'] as const
export const BLOCKED_STATUSES = ['Bloqueado', 'Detenido'] as const
```

`CANONICAL_OPEN_TASK_SQL` (líneas 133-136):

```typescript
const CANONICAL_OPEN_TASK_SQL = `(
  completed_at IS NULL
  AND (task_status IS NULL OR task_status NOT IN (${EXCLUDED_STATUSES_SQL}))
)`
```

`BLOCKED_STATUSES` está **declarada pero NO usada** en exclusion SQL. Tareas en `Bloqueado` o `Detenido` entran al denominador de OTD/RpA/FTR.

**Severity**: contradice la regla A.4 confirmada con operador. Si el equipo tiene N tareas bloqueadas en el período (e.g. esperando assets del cliente, esperando aprobación legal), su OTD% queda artificialmente diluido — esas N tareas cuentan como `overdue` cuando pasan fecha, contaminando el denominador con "fallas" que no son atribuibles al equipo.

**Remediation pattern recomendado**:

```typescript
// Extender o crear EXCLUDED_FROM_METRICS_STATUSES que combine ambos
const EXCLUDED_FROM_METRICS_STATUSES = [...EXCLUDED_STATUSES, ...BLOCKED_STATUSES] as const
const EXCLUDED_FROM_METRICS_SQL = EXCLUDED_FROM_METRICS_STATUSES.map(s => `'${s}'`).join(',')

const CANONICAL_OPEN_TASK_SQL = `(
  completed_at IS NULL
  AND (task_status IS NULL OR task_status NOT IN (${EXCLUDED_FROM_METRICS_SQL}))
)`
```

Las queries canonical (`CANONICAL_OPEN_TASK_SQL`, `CANONICAL_COMPLETED_TASK_SQL`, derivadas) deben usar el conjunto extendido. Tests anti-regresión necesarios para verificar que el cambio NO altera el resultado para tareas que ya estaban excluidas (archivadas/canceladas) y SÍ cambia el resultado para tareas bloqueadas.

**TASK derivada candidata**: small fix `TASK-902 — Excluir Bloqueado del denominador de métricas ICO` (estimación ~2h con tests + signal de validación que el conteo de tareas excluidas crece monotónicamente post-fix). Out of scope inmediato de TASK-901 (que se enfoca en writeback architecture).

#### B.2 ⚠️ Estados Sky-specific NO mapeados a CSC en código

**Evidencia**: Sky DB (data source `23039c2f-efe7-81f8-af2d-000b67594d18`) usa estos `Estado 1` status options canonical (per Notion schema fetched 2026-05-17):

```
groups:
  to_do:       [Sin empezar, Pendiente, Bloqueado, Tomado]
  in_progress: [En curso, Listo para revisión, En feedback]
  complete:    [Aprobado, Archivado]
```

`src/lib/ico-engine/metric-registry.ts:103-115` `TASK_STATUS_TO_CSC`:

```typescript
{
  'Sin empezar': 'briefing',
  'Backlog': 'briefing',
  'Pendiente': 'briefing',
  'Listo para diseñar': 'briefing',
  'En curso': 'produccion',
  'En Curso': 'produccion',
  'Cambios Solicitados': 'cambios_cliente',
  'Listo': 'entrega',
  'Done': 'entrega',
  'Finalizado': 'entrega',
  'Completado': 'entrega'
}
```

**Estados Sky NO mapeados**: `Tomado`, `Listo para revisión`, `En feedback`, `Aprobado`, `Bloqueado`.

**Severity**: Sky tasks con estos status caen en `fase_csc = NULL` o `otros` cuando se proyectan a `v_tasks_enriched` BQ. **CSC distribution charts** en `/people/[id]?tab=activity` (Person 360), `/agency/pulse` y Sky scorecards pueden mostrar información parcial/incorrecta para Sky. OTD/RpA/FTR siguen OK porque NO dependen de CSC mapping — usan `performance_indicator_code` directamente.

**Mapeo canonical sugerido** (validado contra workflow operativo Sky en sesión 2026-05-17):

```typescript
'Tomado': 'briefing',              // estado inicial Sky-side: equipo Sky toma la pieza (similar a "Sin empezar" pero post-asignación)
'Listo para revisión': 'entrega',  // pieza casi entregada, antes del primer envío al cliente
'En feedback': 'cambios_cliente',  // equivalente a "Cambios Solicitados" en otros DBs
'Aprobado': 'entrega',             // estado terminal Sky-side (= Listo/Done en otros DBs)
'Bloqueado': N/A                   // no se mapea, debería excluirse al igual que `Archivado` (ver B.1)
```

**TASK derivada candidata**: small fix `TASK-903 — Mapear estados Sky a CSC canonical` (estimación ~2h con tests + smoke visual de Sky CSC charts pre/post fix). Out of scope inmediato de TASK-901. Puede paquetearse con B.1 en una sola TASK `TASK-902 — ICO status hygiene Sky + Bloqueado exclusion`.

#### B.3 ⚠️ Bug class TASK-877: sync notion-bq-sync pierde el value del formula RpA para Sky (referencia, ya en flight)

Detectado live 2026-05-16: BQ `notion_ops.tareas.rpa` = `null` en 100% (3,168 tasks 10 meses) para Sky DB. Notion MCP confirmó que la formula evalúa correctamente per-page (Correcciones rollup populated con valores 2-3 en samples, formula returns number). El sync `notion-bq-sync` no lee `prop.formula.number` correctamente o tiene drift de Notion-Version.

**Estado de remediation**: `TASK-901` (Canonical Notion Metric Compute V1) es la solución canonical permanente — mover el compute a Greenhouse code con writeback. Eso elimina la dependencia del sync para entregar el value del formula. **Out of scope de patches al sync legacy** — el patch sería deuda temporal que TASK-901 absorbe.

### C) Cycle Time — DECISIONES CANONICAL TOMADAS 2026-05-17

Las 3 ambigüedades operativas previamente abiertas fueron resueltas con operador en sesión 2026-05-17 + agregada decisión nueva (C.4) sobre Bloqueado.

#### C.1 INICIO canonical: status transition → `En curso` / `Tomado`

Cycle Time arranca cuando el equipo toma la pieza activamente (status pasa a `En curso` en Efeonce, o `Tomado` en Sky-side). **NO** desde `created_at` Notion. Justificación operativa: tareas pueden vivir días/semanas en backlog antes de que alguien arranque trabajo real; contar ese tiempo infla CT con espera no-productiva y desincentiva grooming agresivo del backlog.

**Impacto vs código actual**: el código hoy (`src/lib/ico-engine/schema.ts:108-113`) usa `created_at` como inicio. **Requiere cambio canonical**. Sin embargo, Notion hoy NO captura el timestamp de status transition — la única señal cercana es `last_edited_time` (que se sobreescribe en cada edit, no preserva el momento exacto del cambio de estado). Requiere infra nueva (ver D).

#### C.2 FIN canonical: `Fecha de completado` (property Notion `Fecha de completado` → BQ `completed_at`)

Cycle Time termina cuando el equipo marca la pieza como completada internamente. **NO** cuando el cliente aprueba (`Aprobado` state). Justificación operativa: la aprobación del cliente es un **milestone separado de validación** que mide otra cosa (responsividad del cliente, alignment del brief original con expectativas) — no la duración de producción.

**Impacto vs código actual**: el código hoy ya usa `completed_at`. **Sin cambios**.

Métrica complementaria canonical sugerida (out of scope V1, considerar V2): `time_to_client_approval` = días entre `Fecha de completado` y `Aprobado` cliente — mide responsividad del cliente, no del equipo.

#### C.3 Tiempo en `En feedback` (cliente revisando): SE INCLUYE en CT

Cuando una pieza está `En feedback`, el cliente está revisando. Greenhouse no controla ese tiempo, pero **se incluye en CT** porque refleja el calendar real que vivió la pieza. Justificación operativa: alineado con TTM y Early Launch Advantage — al cliente le importa el calendar completo, no la eficiencia interna. Además, el equipo PUEDE gestionar la espera (pasar a otra tarea mientras tanto, no quedar bloqueado contemplando el feedback que no llega).

**Impacto vs código actual**: el código hoy ya incluye `En feedback` time (es `DATE_DIFF` calendar puro). **Sin cambios**.

#### C.4 Tiempo en `Bloqueado` / `Detenido`: SE EXCLUYE de CT (NUEVO)

Cuando una pieza pasa a `Bloqueado` o `Detenido`, ese tiempo NO debe contar para CT. Justificación operativa: coherencia con regla A.4 (tareas bloqueadas fuera del denominador de métricas) — si excluimos tareas bloqueadas del COUNT, no podemos a la vez contar su TIEMPO bloqueado en el promedio CT. Penalizaría al equipo por dependencias externas (cliente no envía assets, legal no firma, vendor no responde).

**Impacto vs código actual**: el código hoy NO descuenta tiempo en Bloqueado (es `DATE_DIFF` puro). **Requiere cambio canonical**. Igual que C.1, requiere capturar entry/exit timestamps de Bloqueado — infra nueva (ver D).

#### Cycle Time canonical — fórmula final

```
CT canonical = (Fecha completado − Timestamp status→En curso)
              − (Tiempo total acumulado en Bloqueado/Detenido durante esa ventana)
```

Donde el tiempo en `En feedback` SÍ se cuenta (no se descuenta).

### D) OTD% vs CT SLO% — separación canonical 2026-05-17

Decisión arquitectónica: separar 2 KPIs hoy mezclados conceptualmente en lectura. Las 2 mediciones son útiles, pero responden preguntas distintas y NO deben presentarse como la misma métrica:

| KPI canonical | Pregunta de negocio | Fórmula | Source actual |
|---|---|---|---|
| **OTD% (canonical, existente)** | "¿Cumplimos el deadline que **nosotros** prometimos al cliente?" | `% tareas con performance_indicator_code = 'on_time'` (per-task deadline compliance) | `src/lib/ico-engine/metric-registry.ts:202-206` |
| **CT SLO% (canonical, NUEVA)** | "¿Nuestro tiempo de ciclo es competitivo vs **industria**?" | `% tareas con cycle_time_days ≤ threshold` (default 14.2 días, calibrable per tipo de pieza) | NO existe hoy — métrica nueva |

**Justificación operativa**:

- **OTD%** mide **promise compliance** — accountability del equipo por el deadline acordado en el brief individual.
- **CT SLO%** mide **competitive benchmark** — performance del equipo vs estándar de industria, indicador de eficiencia operativa absoluta.

Una pieza puede ser **on_time** (cumplió SU deadline de 30 días) pero **fuera del SLO** (tomó >14.2 días, lento vs industria). Otra puede ser **late_drop** (no cumplió SU deadline) pero **dentro del SLO** (tomó <14.2 días, rápido pero el deadline original era irrealmente corto).

Por eso son **métricas hermanas pero NO redundantes**. Ambas son canonical.

**Threshold inicial**: 14.2 días (per `Greenhouse_ICO_Engine_v1.md` línea 912, "promedio agencia LATAM"). **Calibrable per tipo de pieza** (Sección 7.2 del contrato): video > sitio web > estático > GIF. Implementation guarda el threshold en config externa (no hard-coded).

**Resuelve drift detected**: `Greenhouse_ICO_Engine_v1.md` líneas 958-992 tiene una versión OUTDATED que mezcla OTD% con CT SLO% (define OTD% como `cycle_time_days <= 14.2`). Post-decisión 2026-05-17 esa parte del Engine spec doc queda **explícitamente desactualizada** — TASK derivada incluye housekeeping de actualizar el Engine spec para reflejar la separación canonical OTD% (promise) vs CT SLO% (benchmark).

### E) TASK derivada candidata (paquete combinado)

Las decisiones C.1, C.2, C.3, C.4 + separación D requieren infra nueva (status transition tracking) que conviene paquetarse con los gaps B.1 (Bloqueado en denominador) + B.2 (estados Sky no mapeados a CSC) ya que comparten la misma capa de status taxonomy. Estimación combinada: 1-2 semanas dev (status transition capture + CT canonical helper + CT SLO% nueva + fix B.1 + fix B.2 + housekeeping Engine spec doc).

Spec canonical referenciada: `docs/tasks/to-do/TASK-908-ico-status-transition-tracking-canonical-cycle-time.md` (creada en misma sesión 2026-05-17).

### F) Ownership boundary canonical — Notion = Task OS, ICO Engine = motor exclusivo de métricas (NUEVO 2026-05-17)

**Decisión arquitectónica canonical** (formalizada en ADR `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`):

- **Notion** queda como **Task Operating System**: captura datos operativos primitivos (asignación, fechas, estado, tipo de entregable, archivos), recibe transiciones de estado, sirve como UI de gestión del operador.
- **Greenhouse ICO Engine** queda como **motor exclusivo de cómputo** de TODAS las métricas (RpA, OTD, FTR, Cumplimiento, Cycle Time, Throughput, Pipeline Velocity, BCS, TTM, Iteration Velocity, futuras).
- **Greenhouse devuelve los valores computados a Notion vía bulk PATCH** a propiedades `[GH] <métrica>` read-only para que el operador siga viendo las métricas live en la UI Notion (la única superficie de gestión operativa hoy).

**Por qué este boundary** (5 razones canonical):

1. Fórmulas como propiedades Notion son frágiles — cualquier operador puede romperlas sin git history, tests, code review, observabilidad. Bug TASK-877 follow-up 2026-05-16 lo demostró (3,168 tareas Sky con `rpa=null` 10 meses sin que nadie se enterara).
2. Greenhouse ya tiene el stack (tests, git, code review, captureWithDomain, reliability signals, outbox pattern, materializer) — mover el compute es reusar infra canonical.
3. Notion sigue siendo UI de gestión — operadores NO pierden funcionalidad, ven `[GH] <métrica>` live con latencia 5-30s post-edit.
4. Las métricas se vuelven observables, auditables, versionables (cada compute deja audit row + outbox event + reliability signal).
5. Una sola fuente de cómputo elimina drift cross-surface (Notion vs `metric-registry.ts` vs BQ views).

**Hard rules canonical** (subset, ver ADR completo):

- NUNCA introducir propiedad formula nueva en Notion para calcular una métrica ICO. Toda métrica nueva nace en Greenhouse code.
- NUNCA modificar/editar fórmula Notion existente sin coordinar con helper canonical en Greenhouse.
- NUNCA computar métrica ICO leyendo propiedad Notion como input cuando esa propiedad sea derivable de eventos canonical (transitions, fechas).
- NUNCA consumer downstream recomputa métrica inline. Toda lectura pasa por columna materializada o helper canonical.

**Migración progresiva canonical** (strangler pattern):

| Fase | Métrica | Task | Status |
|---|---|---|---|
| Foundation | Status transition tracking | TASK-908 | En diseño 2026-05-17 |
| V1 | RpA (writeback completo del pattern) | TASK-901 | En diseño 2026-05-17 |
| V2 | OTD writeback | TASK-902 (futuro) | Backlog |
| V3 | FTR writeback (delega a calculateRpa) | TASK-903 (futuro) | Backlog post TASK-909 |
| V4 | Cumplimiento writeback | TASK-904 (futuro) | Backlog |
| V5+ | Throughput, Cycle Time SLO%, Pipeline Velocity writebacks | TBD | Backlog |
| V6+ | BCS, TTM (AI-derived) | TASK-910 + futura TTM | Backlog |

Cada Vn ship con shadow mode mínimo 7 días verde antes de activar writeback. Después del writeback, las fórmulas Notion originales se mantienen en paralelo 7-14 días más para paridad cross.

### G) Semántica canonical de "corrección" para RpA / FTR (NUEVO 2026-05-17)

Consecuencia de la decisión F: RpA y FTR dejan de depender de la propiedad Notion `Correcciones` rollup y pasan a computarse desde el **status history canonical** capturado por TASK-908.

**Definición canonical**:

> **1 corrección = 1 transición `Listo para revisión → En Feedback`** en el status history de la tarea.

No es ronda interna del equipo. No es comentario sin resolver. No es review del workflow team. Es específicamente **"el cliente vio el entregable y pidió cambios"**, observado como evento de transición de estado.

**Helper canonical**: `countCorrectionTransitions(taskId)` vive en TASK-908 foundation (`src/lib/notion-metrics/count-correction-transitions.ts`). Lee `greenhouse_delivery.task_status_transitions` capturada vía webhook Notion.

**Re-shape de helpers downstream**:

- `calculateRpa(taskId)` (TASK-901 Slice 1) **delega a** `countCorrectionTransitions(taskId)`. NO lee propiedad Notion `Correcciones`.
- `calculateFtr(taskId)` (TASK-909 Slice 1) **delega a** `calculateRpa(taskId) === 0`. NO duplica lógica.

**Casos edge canonical**:

| Escenario | Cuenta como corrección? | Justificación |
|---|---|---|
| Listo para revisión → En Feedback | **Sí** (+1) | El cliente vio el entregable y pidió cambios |
| En Feedback → Listo para revisión (re-submit) | No | Colaborador re-entregando, no rechazo del cliente |
| En curso → En Feedback (sin pasar por revisión) | No | Trabajo en progreso, no rechazo |
| Listo para revisión → Completado/Aprobado | No | Aprobación directa, RpA=0 para esa tarea |
| Listo para revisión → En curso (sin feedback) | No | Colaborador decidió retomar sin envío al cliente |

**Forward-compat Frame.io** (cuando exista la integración):

`calculateRpa` extiende inputs **sin breaking change** — el helper combina:

- `correctionTransitionsCount` (siempre, fuente primaria)
- `clientReviewOpen` (Frame.io, opcional)
- `workflowReviewOpen` (Frame.io, opcional)
- `openFrameComments` (Frame.io, opcional)

Sin Frame.io (hoy), `calculateRpa = correctionTransitionsCount`. Con Frame.io (futuro), `calculateRpa` puede sumar señales adicionales bajo policy a definir.

**Workflow team rounds (internal review)**:

NO cuentan para RpA. RpA es exclusivamente rondas de **cliente**. Si emerge necesidad de medir internal review rounds, se reporta en métrica separada `IRR` (Internal Review Rounds) en paralelo, no agregada a RpA.

**Implicación para TASK-901**:

El scope de TASK-901 Slice 1 (helper canonical `calculateRpa`) cambia: en vez de leer propiedad Notion `Correcciones`, lee el conteo de transiciones canonical. **Esto vuelve TASK-908 prerequisite arquitectónico de TASK-901**. Orden canonical de ship: TASK-908 Slices 0-3 (foundation transitions + helper countCorrectionTransitions) → TASK-901 Slice 1 (calculateRpa delega) → resto de TASK-901 (webhook + Cloud Tasks + writeback).

**Implicación para TASK-909**:

FTR V1 ship con `calculateFtr(taskId) = calculateRpa(taskId) === 0`. NO ship con motor compuesto de 5 señales (Frame.io 4 de las 5 NO existe hoy). Cuando Frame.io exista, `calculateRpa` se extiende (no `calculateFtr`) y FTR se beneficia automático.

### H) Migración progresiva a specs canonical por métrica (NUEVO 2026-05-17)

**Decisión arquitectónica canonical** (formalizada en ADR `GREENHOUSE_METRIC_SPEC_PATTERN_V1.md`):

Cada métrica crítica de delivery tiene su **spec canonical dedicado** en `docs/architecture/metrics/<METRIC>_V1.md` con 12 secciones obligatorias (definición / fórmula / inputs / helper canonical / agregado canonical / semántica edge / estados / threshold / writeback / histórico / cross-refs / open questions). **Este doc (Contrato) queda como narrativa de negocio + contratos cross-métrica** (Revenue Enabled, palancas, CSC, tier matrix, policy observed/range/estimated). Referencia los specs canonicalmente sin duplicar definiciones de métrica individual.

**4 specs canonical Accepted al cierre de la sesión 2026-05-17**:

- [`metrics/RPA_V1.md`](metrics/RPA_V1.md) — RpA (Rounds per Asset). Source canonical = `countCorrectionTransitions` (TASK-908). Writeback V1 = TASK-901.
- [`metrics/FTR_V1.md`](metrics/FTR_V1.md) — FTR (First-Time Right). Delega a `calculateRpa === 0`. Helper V1 = TASK-909. Writeback futura = TASK-903.
- `metrics/THROUGHPUT_V1.md` — Throughput mensual (monthly_count canonical, resuelve drift Engine doc `weekly_rate / 4`). Creada en TASK-909.
- `metrics/PIPELINE_VELOCITY_V1.md` — Pipeline Velocity (ratio `completed/(completed+open)`, distinto a Throughput). Creada en TASK-909.

**9 specs pendientes** (strangler migration — emergerán cuando cada task toque la métrica): OTD, Cumplimiento, Cycle Time, CT SLO%, Iteration Velocity, BCS, TTM. Ver [`metrics/METRICS_INDEX.md`](metrics/METRICS_INDEX.md) para status maestro.

**Reglas canonical de migración**:

- Cuando una task toca métrica sin spec canonical, **primer slice de la task crea el spec** antes de tocar código. Sin spec previo = trabajo no canonical.
- Las secciones acá (Contrato) que definen métrica individual van migrando progresivamente a **cross-refs al spec canonical** + 2-3 líneas de narrativa de negocio. NO se borran de un golpe.
- Si emerge drift entre Contrato/Engine doc vs spec canonical, **el spec canonical gana**.

**Disparador de la decisión**: pre-2026-05-17, entender una métrica como RpA requería leer 6 fuentes distintas (Contrato + Delta + Engine doc + código + 2 tasks) — fragmentación insostenible para métricas contractuales con clientes/equipo/management.

### I) Evidencia citada de esta sesión

- **Notion MCP fetch** del Sky Tasks DB schema 2026-05-17: data source `23039c2f-efe7-81f8-af2d-000b67594d18`, page `23039c2f-efe7-8138-9d1e-c8238fc40523`, teamspace Sky Airlines `22d39c2f-efe7-8142-a645-00427b6a67d5`.
- **Sibling Efeonce Tasks DB** (formula IDs compartidos, mismo template canonical): data source `5126d7d8-bf3f-454c-80f4-be31d1ca38d4`, page `3a54f090-4be1-4158-8335-33ba96557a73`.
- **BQ query histórico Sky RpA**: `notion_ops.tareas` 10 meses (Aug 2025 – May 2026), 3,168 tareas completadas (`task_status IN DONE_STATUSES`), 100% `rpa = null`. Confirmado pattern es del sync, no del template Notion.
- **BQ query Daniela May 2026 Efeonce-internal**: 8 tareas completadas, 8/8 con `Review Source = null` → `rpa = 0` per formula evaluation. Tareas son trabajo interno (AXIS Design System, GTM, Berel ops setup) que sí debería contar para RpA per regla operativa.
- **Properties Notion confirmadas vivas en Sky DB** (vía MCP schema fetch):
  - `RpA` (formula, codeUrl `PVhQTw`)
  - `Semáforo RpA` (formula, codeUrl `aVZIVQ`)
  - `Indicador de Performance` (formula, codeUrl `b00_Og`) — descripción canonical "Clasifica cada tarea del mes actual en On-Time, Late Drop, Overdue o Carry-Over"
  - `Cumplimiento %` (formula, codeUrl `Yk47Tg`)
  - `Días de retraso` (formula, codeUrl `UWtcbw`)
  - `Client Change Round` (number, empty 100% rows) — Frame.io integration pendiente
  - `Workflow Change Round` (number, empty 100% rows) — workflow integration pendiente
  - `Review Source` (select: `Auto` / `Frame.io` / `Workflow`)
  - `Correcciones` (relation rollup, populated con valores reales)
  - `Estado 1` (status property con groups `to_do`, `in_progress`, `complete` enumerados en B.2)

### E) Cross-references canonical

- `TASK-877` follow-up commit `4fc8c0c4` (2026-05-16) — recovery del bridge Notion↔member, motiva esta deep-dive
- `TASK-900` — ICO Materializer Hardening (MERGE incremental + freshness guard) — complementario, ataca el materializer downstream
- `TASK-901` — Canonical Notion Metric Compute V1 (RpA-only) — consume esta Delta como precondición canonical
- `Greenhouse_ICO_Engine_v1.md` sección `A.5.4.0 Categorías funcionales de métricas ICO` (línea 2363) — fuente del dual-meaning de Cumplimiento
- `src/lib/ico-engine/metric-registry.ts` — implementación runtime de las métricas (gaps B.1 y B.2 referenciados con file:line)
- `src/lib/ico-engine/rpa-policy.ts` — TASK-215 confidence policy (no afectada por esta Delta, sigue vigente)

## Delta 2026-04-04 — TASK-223 formaliza la lane runtime inicial de aceleradores metodológicos

`TASK-223` no convierte todavía `Design System` ni `Brand Voice para AI` en productos visibles independientes, pero sí deja su primera lectura runtime defendible dentro del contrato `CVR`.

- regla vigente:
  - `Design System` se lee primero como acelerador `proxy`, apoyado en outcomes canónicos (`FTR`, `RpA`, `Cycle Time`, `Throughput`, `Iteration Velocity`)
  - `Brand Voice para AI` solo puede comunicarse como señal `observed` cuando exista `brand_consistency_score` auditado en `ico_engine.ai_metric_scores`
  - si falta score auditado, la lectura correcta es parcial o sin evidencia; no se reemplaza con heurísticas heroicas de portfolio
- implicaciones inmediatas:
  - `Creative Hub` debe enchufar esta lane al bloque `CVR` ya existente y no abrir una segunda narrativa enterprise
  - la conexión a `Revenue Enabled` sigue siendo policy-aware; estas capas no saltan directo a revenue observado
  - `Brand Consistency` visible debe priorizar el carril auditado antes de cualquier proxy local

## Delta 2026-04-04 — TASK-222 formaliza el contrato inicial de Creative Velocity Review

`TASK-222` deja el primer contrato runtime de `CVR` y lo baja a una surface client-facing real dentro de `Creative Hub`.

- el `CVR` ya no vive solo como doctrina documental:
  - existe contrato runtime inicial
  - existe matriz visible `Basic / Pro / Enterprise`
  - existen guardrails explícitos para narrativa client-facing
- regla vigente:
  - la visibilidad por tier sigue siendo un contrato editorial de comunicación
  - todavía no existe un entitlement runtime persistido para `Basic`, `Pro` o `Enterprise`
  - por lo tanto, el portal hoy puede mostrar la matriz y sus límites, pero no hacer hard-gating comercial real por tier
- implicaciones inmediatas:
  - `Creative Hub` pasa a separar explícitamente drivers operativos, métricas puente y `Revenue Enabled`
  - `Early Launch` sigue controlado por el contrato de `TTM`; si la scope no trae evidencia suficiente, debe quedar `unavailable`
  - `Iteration` y `Throughput` ya no pueden venderse como revenue observado cuando la evidencia siga en `proxy` o `estimated`

## Delta 2026-04-04 — TASK-221 formaliza el measurement model inicial de Revenue Enabled

`TASK-221` no convierte todavía `Revenue Enabled` en un KPI universal con monto total por tenant, pero sí cierra su primer contrato defendible de medición y atribución.

- `Revenue Enabled` ya debe leerse como un modelo con clases explícitas:
  - `observed`
  - `range`
  - `estimated`
- regla vigente:
  - `observed` exige linkage directo entre la palanca y un outcome real de revenue/performance
  - `range` exige señal operativa suficientemente observada + baseline comparable de revenue
  - `estimated` cubre señales operativas válidas que todavía no tienen baseline directo o que siguen en `proxy`
- implicaciones inmediatas por palanca:
  - `Early Launch` ya no puede inferirse desde `OTD`; depende de `TTM`
  - `Iteration` ya no puede inferirse desde `RpA` ni `pipeline_velocity`; depende del contrato canónico de `Iteration Velocity`
  - `Throughput` no puede vender el `throughput_count` actual como si ya fuera “campañas adicionales con revenue observado”; hoy esa palanca sigue estimada
- `Creative Hub` ya no debe presentar revenue habilitado desde benchmarks heurísticos locales; debe explicitar la clase de atribución y los límites de cada palanca

## Delta 2026-04-04 — TASK-220 formaliza el contrato inicial de Brief Clarity Score

`TASK-220` cierra el primer contrato runtime de `BCS` y de `brief efectivo` sin esperar al AI layer completo end-to-end.

- `Brief Clarity Score` ya puede servirse como contrato canónico project-level desde el score auditado más reciente en `ico_engine.ai_metric_scores`
- la lectura se combina con `governance` de Notion por `space`, usando estados `ready`, `degraded` y `blocked`
- el umbral operativo inicial de `brief efectivo` queda fijado en `>= 80/100` o `passed = true`
- `TTM` ya no debe tratar siempre el inicio como `proxy`: cuando existe `BCS` válido y fecha procesada, el evento de inicio puede viajar como evidencia `observed`; si no existe ese score, el fallback proxy sigue vigente
- la ausencia de score auditado no significa “brief malo”; significa que la lane sigue `unavailable` o `degraded` y no debe venderse como evidencia plenamente observada

## Delta 2026-04-04 — TASK-219 formaliza la source policy inicial de Iteration Velocity

`TASK-219` no cambia el rol conceptual de `Iteration Velocity` dentro de `Revenue Enabled`, pero sí cierra su primer contrato runtime para que deje de depender de heurísticas locales.

- `Iteration Velocity` significa capacidad habilitada por Greenhouse para que el cliente testee mas rapido en mercado; no equivale a `pipeline_velocity`, a conteo de comentarios ni a rondas de correccion
- la source policy inicial usa evidencia operativa de `delivery_tasks`:
  - `frame_versions`
  - `workflow_change_round`
  - `client_change_round_final`
  - `client_review_open`
  - `workflow_review_open`
  - `open_frame_comments`
- una iteracion util requiere evidencia de versionado / iteracion interna y ausencia de arrastre correctivo client-facing
- mientras no exista evidencia observada de mercado o ads-platform ligada a la iteracion, la metrica debe servirse como `proxy operativo` y `degraded`
- `Creative Hub` no puede volver a derivar `Iteration Velocity` desde `RpA`; cualquier consumer nuevo debe usar este contrato y no la heuristica legacy

## Delta 2026-04-04 — TASK-218 formaliza la source policy inicial de TTM

`TASK-218` no cambia la definición conceptual de `TTM`, pero sí cierra la primera policy runtime para servir la métrica con evidencia y sin vender como canónico lo que todavía es proxy.

- el evento de inicio (`brief efectivo`) ahora puede ser **observed** cuando existe un `BCS` válido; si no existe, sigue degradando a la jerarquía proxy previa
- la prioridad actual para inicio es: primera tarea en `briefing` -> `delivery_projects.start_date` -> `campaign.actual_start_date` -> primera tarea creada -> `campaign.planned_start_date`
- la prioridad actual para activación es: `campaign.actual_launch_date` -> primera tarea con evidencia de activación/publicación -> `delivery_projects.end_date` -> `campaign.planned_launch_date`
- `TTM` solo puede servirse como `available` cuando ambos extremos son observados; si usa `proxy` o `planned`, debe viajar como `degraded`, y si falta evidencia o hay inconsistencia temporal, como `unavailable`
- `pipeline_activation` sigue siendo señal útil de pipeline, pero no equivale por sí sola a evidencia canónica de salida real a mercado

## Delta 2026-04-03 — TASK-215 adds runtime RpA confidence policy

`TASK-215` no cambia la definición conceptual de `RpA`, pero sí formaliza que su lectura runtime debe viajar con policy de confianza y evidencia desde el `ICO Engine`.

- la métrica sigue significando `Rounds per Asset`
- el engine es quien clasifica la lectura como `valid`, `low_confidence`, `suppressed` o `unavailable`
- los consumers no deben reinventar localmente la interpretación de `0` o `null`
- cualquier surface que presente `RpA` debe respetar la naturaleza benchmark adaptada de la métrica y su estado de confianza

Esta delta no altera la tabla de benchmarks de la sección 7; solo aclara el contrato de consumo para no perder trazabilidad entre métrica y evidencia.

**Sistema de medición que conecta operación creativa con Revenue Enabled**

Documento ancla — Fuente de verdad del ecosistema de métricas

Metodología propietaria de Efeonce Group | Versión 1.0 | 2026

---

## 1. Propósito de este documento

Este documento es la **fuente de verdad canónica** del sistema de métricas que opera ICO (Intelligent Creative Operations) dentro de Globe by Efeonce. Define qué se mide, cómo se mide, cuándo se mide, qué significa cada resultado y cómo conecta con el impacto en negocio del cliente.

Cuando cualquier otro documento del ecosistema Efeonce haga referencia a métricas ICO, Revenue Enabled, o la cadena causal entre operación creativa y crecimiento, este documento es la referencia autoritativa.

### 1.1 Qué problema resuelve

Las métricas de producción creativa en la industria están rotas. La mayoría de las agencias miden piezas entregadas y satisfacción subjetiva. Los clientes miden performance de campaña (CTR, ROAS, conversiones) pero no la cadena operativa que produce esas campañas. El resultado: nadie conecta cómo se produce con cuánto se vende.

ICO resuelve esto con un sistema de medición en tres niveles que fluye de abajo hacia arriba: **drivers operativos** (lo que Globe controla) → **velocidad competitiva** (lo que el negocio siente) → **Revenue Enabled** (lo que el negocio gana).

> *La creatividad sin velocidad no compite. La velocidad sin medición no mejora. La medición sin conexión a negocio no justifica inversión.*

### 1.2 Documentos que derivan de este contrato

Las secciones de métricas en los siguientes documentos deben ser consistentes con este contrato:

| Documento | Sección que referencia métricas ICO |
|---|---|
| ICO — Intelligent Creative Operations v1 | Sección 4: Sistema de Métricas ICO |
| Globe Pitch Comercial ICO 2026 v3 | Cadena causal completa |
| Globe Pitch Comercial 2026 | Revenue Enabled / 3 palancas |
| Ecosistema Efeonce Group v5.3+ | Revenue Enabled: la cadena causal |
| ASaaS Strategy Efeonce 2026 | Métricas Operativas Core / Revenue Enabled |
| CSC Whitepaper Efeonce | KPIs de la cadena |
| Greenhouse Sistema Experiencia | Visibilidad de métricas por tier |

---

## 2. North Star Metric: Revenue Enabled

### 2.1 Definición formal

> **Revenue Enabled (RE)** es el revenue incremental que el cliente captura gracias a la velocidad creativa competitiva habilitada por Globe operando bajo ICO.

No es "entregamos a tiempo". Es: **el cliente gana más porque lanza antes, itera más y ejecuta más iniciativas.**

Revenue Enabled es una métrica ofensiva (crecimiento), positiva (dinero capturado), basada en hechos observables (fechas, campañas, performance, volumen de iniciativas) y conectada directamente con el claim de Efeonce: Empower your Growth.

### 2.2 Por qué Revenue Enabled y no Cost of Delay

Cost of Delay Avoided (CoDA) puede servir como métrica defensiva de soporte, pero como North Star es débil por cuatro razones:

- Es contrafactual: mide "lo que no pasó".
- Se percibe como cumplimiento mínimo: el cliente piensa "para eso te pago".
- Requiere baselines negativos para sonar bien.
- No escala a campañas no críticas.

Revenue Enabled invierte la narrativa: no es "evitamos que perdieras" sino **"ganaste más porque operamos mejor"**.

### 2.3 Las tres palancas de Revenue Enabled

Revenue Enabled se descompone en tres fuentes independientes pero acumulativas:

#### Palanca 1: Early Launch Advantage

Revenue habilitado por días ganados. Lanzar antes = más tiempo en mercado = más captura de demanda.

- **Indicador de soporte:** Time-to-Market (TTM)
- **Uso ideal:** Campañas estacionales, ventanas competitivas, lanzamientos.

#### Palanca 2: Iteration Velocity Impact

Revenue habilitado por mejora de performance gracias a iteraciones rápidas. Más tests = mejor ROAS.

- **Indicador de soporte:** Iteration Velocity, #tests, cadencia de variantes
- **Uso ideal:** Performance marketing, creatividades para paid, optimización continua.

#### Palanca 3: Throughput Expandido

Revenue habilitado por más iniciativas ejecutadas con la misma capacidad. Más campañas/mes.

- **Indicador de soporte:** Creative Throughput, capacidad liberada
- **Uso ideal:** Portafolios con alta carga operativa, equipos internos saturados.

### 2.4 Estructura de cálculo (alto nivel)

| Palanca | Fórmula | Supuestos requeridos |
|---|---|---|
| **RE Early Launch** | Días ganados × revenue diario estimado (o proxy de captura) | Revenue diario promedio de campaña comparable. Ventana de demanda definida por el cliente. |
| **RE Iteration** | Uplift de performance × revenue base de campaña | Baseline de ROAS/CTR antes de iteración. Revenue atribuible a campaña. |
| **RE Throughput** | Campañas adicionales × revenue promedio por campaña | Baseline de campañas/mes antes de Globe. Revenue promedio histórico por campaña. |

> *Regla de oro: Revenue Enabled se presenta en QBR como "RE observado" + "RE estimado (rango)" según disponibilidad de data. Supuestos siempre explícitos. Nunca se promete exactitud absoluta cuando la atribución no lo permite.*

### 2.5 Policy de observed / range / estimated

`Revenue Enabled` ya no debe viajar como una sola cifra sin clase de evidencia.

| Clase | Cuándo aplica | Qué permite decir | Qué NO permite decir |
|---|---|---|---|
| **Observed** | Existe linkage directo entre la palanca y el outcome económico o de performance relevante. | “Hay evidencia observada de impacto habilitado por esta palanca.” | No autoriza extrapolar a todo el trimestre o tenant sin el mismo linkage. |
| **Range** | Existe señal operativa suficientemente observada y un baseline comparable de revenue, pero no linkage causal directo completo. | “El impacto razonable cae dentro de este rango.” | No autoriza presentar una cifra puntual como verdad exacta. |
| **Estimated** | Existe señal operativa útil, pero la palanca sigue en proxy, sin baseline comparable o sin attribution layer defendible. | “Hay evidencia operativa que sostiene la hipótesis, pero el impacto económico sigue siendo estimado.” | No autoriza hablar de revenue observado. |

Aplicación vigente por palanca:

- **Early Launch**
  - usa `TTM` como señal puente obligatoria
  - si `TTM` no existe para la scope, la palanca queda `unavailable`
  - si `TTM` existe pero no hay linkage directo a revenue, la lectura es `range` o `estimated`, nunca `observed`
- **Iteration**
  - usa el contrato canónico de `Iteration Velocity`
  - mientras la iteración siga en `proxy operativo`, la palanca no puede declararse `observed`
- **Throughput**
  - el `throughput_count` actual mide output operativo, no todavía campañas adicionales o revenue incremental capturado
  - por lo tanto esta palanca debe leerse como `estimated` hasta que exista un carril de iniciativas incrementales atribuibles

Regla de consumer:

- ningún consumer debe volver a reconstruir `Revenue Enabled` desde benchmarks locales de industria, `OTD`, `RpA` o `pipeline_velocity`
- si la scope no tiene la métrica puente correcta, el estado correcto es `unavailable`, no una heurística heroica

---

## 3. Métricas de velocidad competitiva (nivel puente)

Estas métricas son el puente entre lo que Globe controla (drivers operativos) y lo que el negocio gana (Revenue Enabled). Miden lo que el negocio siente.

| Métrica | Definición | Fórmula / Fuente | Conexión con RE |
|---|---|---|---|
| **Time-to-Market (TTM)** | Días desde brief efectivo hasta asset activo en mercado. | Fecha de activación – Fecha de brief aprobado. Fuente: activación observada + `brief efectivo` observado cuando exista `BCS` válido; si no, fallback proxy de delivery/campaign. | TTM ↓ → Early Launch Advantage ↑ |
| **Creative Throughput** | Cantidad de iniciativas (campañas / paquetes de assets) ejecutadas por período. | Conteo mensual de campañas completadas. Fuente: Notion. | Throughput ↑ → Throughput Expandido ↑ |
| **Iteration Velocity** | Cuántas iteraciones útiles cerradas puede habilitar Globe para que el cliente testee más rápido en mercado. | Contrato inicial: iteraciones útiles cerradas / período (`30d`) usando `delivery_tasks.frame_versions`, `workflow_change_round`, `client_change_round_final` y señales de review. Ads-platform / mercado observado quedan como capa futura. | IV ↑ → Iteration Velocity Impact ↑ |
| **On-Time Delivery (OTD)** | Puntualidad real para cumplir el calendario del negocio. | Piezas entregadas on-time / total piezas. Fuente: Notion automático. | OTD ↑ → Early Launch Advantage ↑ (prerequisito) |

> *TTM y OTD son necesarias, pero el valor heroico está en adelantar, iterar y expandir throughput, no solo "cumplir". Cumplir es el baseline. Habilitar crecimiento es la promesa.*

---

## 4. Métricas operativas core (drivers)

Estas son las palancas que el equipo de Globe controla directamente. Se miden en tiempo real a nivel de pieza individual. No son métricas agregadas que se revisan una vez al mes: son indicadores vivos que permiten intervención inmediata.

| Métrica | Definición | Fórmula / Cálculo | Conexión causal |
|---|---|---|---|
| **OTD%** | % de piezas entregadas dentro del plazo del brief. | Piezas on-time / Total piezas × 100. Fuente: Notion automático. | OTD% ↑ → Early Launch Advantage → más días de captura de demanda. |
| **Cycle Time** | Tiempo promedio desde brief aprobado hasta pieza entregada. | Promedio de (Fecha entrega – Fecha brief aprobado). Fuente: Notion. | CT ↓ → Iteration Velocity ↑ → más tests, mejor ROAS. |
| **Cycle Time Variance** | Desviación del estándar. Detecta dónde está la fricción (interna vs. cliente). | Desviación estándar del CT por tipo de pieza. Fuente: Notion. | CTV alta → fricción no resuelta → oportunidad de mejora identificable. |
| **Rounds per Asset (RpA)** | Número promedio de rondas de revisión por pieza. | Total rondas / Total piezas. Fuente: Frame.io + Notion. | RpA ↓ → menor fricción → menor costo de producción → Throughput ↑. |
| **First Time Right % (FTR)** | % de assets aprobados en la primera ronda. | Piezas aprobadas en R1 / Total piezas × 100. Fuente: Frame.io + Notion. | FTR ↑ → RpA ↓ → CT ↓ → Throughput Expandido ↑. |
| **Brief Clarity Score (BCS)** | Score de completitud del brief validado de forma auditable. | Último score auditado en `ico_engine.ai_metric_scores` + governance por `space` desde Notion. Umbral operativo inicial: `>= 80/100` o `passed = true`. | BCS ↑ → FTR ↑ → menos iteraciones desde el origen. |

---

## 5. Cadena causal formal

Este es el mapa completo de cómo cada driver operativo conecta con cada palanca de Revenue Enabled. La cadena fluye de abajo hacia arriba: inputs de calidad generan velocidad competitiva que habilita revenue.

### 5.1 Flujo completo

**Nivel 1 — Inputs de calidad (proceso)**

Brief Clarity Score alto + Alineación cliente temprana + Utilización saludable del equipo (<80-85%).

**Nivel 2 — Palancas operativas (lo que Globe controla)**

BCS ↑ → FTR ↑ → RpA ↓ → Cycle Time ↓

**Nivel 3 — Velocidad competitiva (lo que el negocio siente)**

- Cycle Time ↓ → TTM ↓ (lanzas antes)
- RpA ↓ → Throughput ↑ (ejecutas más con la misma capacidad)
- FTR ↑ → Iteration Velocity ↑ (iteraciones sobre performance, no sobre correcciones)

**Nivel 4 — Revenue Enabled (lo que el negocio gana)**

- TTM ↓ → Early Launch Advantage ↑
- Iteration Velocity ↑ → Iteration Velocity Impact ↑
- Throughput ↑ → Throughput Expandido ↑

### 5.2 Tabla de conexiones directas

| Driver operativo | Impacta a | Que mueve | Habilitando RE | Dirección deseada |
|---|---|---|---|---|
| BCS | FTR | RpA, CT | Las 3 palancas | BCS ↑ |
| FTR% | RpA, CT | Throughput, IV | Throughput Expandido + IV Impact | FTR ↑ |
| RpA | CT | Throughput | Throughput Expandido | RpA ↓ |
| Cycle Time | TTM | Early Launch | Early Launch Advantage | CT ↓ |
| OTD% | TTM | Early Launch | Early Launch Advantage | OTD ↑ |

---

## 6. Capas metodológicas aceleradoras

ICO opera dos capas metodológicas que aceleran la cadena causal. No son productos standalone ni se venden por separado: son capacidades embebidas en el servicio de Globe que impactan directamente las métricas operativas.

### 6.1 Design System

Globe construye y opera un **Design System** para cada cliente como infraestructura visual que habilita consistencia, reutilización de componentes y velocidad de producción. No es un manual de marca en PDF. Es una biblioteca viva de componentes, tokens de diseño, templates y patrones que el equipo creativo usa para producir más rápido y con menos error.

En runtime Greenhouse, la primera instrumentación válida de esta capa no expone componentes, tokens ni artefactos internos. La lectura inicial conecta su efecto a outcomes canónicos del engine y por eso arranca como señal `proxy`, no como score metodológico autónomo.

**Impacto en métricas:**

| Métrica impactada | Cómo impacta | Mecanismo |
|---|---|---|
| **FTR% ↑** | Componentes pre-validados reducen errores de ejecución. | El creativo trabaja sobre una base aprobada, no desde cero. |
| **RpA ↓** | Menos correcciones de consistencia visual. | Los componentes ya cumplen guidelines. Las rondas se enfocan en concepto, no en ejecución. |
| **Cycle Time ↓** | Reutilización de componentes acelera producción. | No se rediseña lo que ya existe. Se adapta, se combina, se escala. |
| **Throughput ↑** | Misma capacidad produce más iniciativas. | Efecto acumulativo: menos tiempo por pieza = más piezas por período. |

**Qué se comunica al cliente:**
- **Sí se comunica:** "Globe construye tu infraestructura visual para que cada pieza sea consistente, rápida de producir y escalable."
- **No se expone:** Las bibliotecas de componentes, tokens de diseño, archivos fuente ni la mecánica interna del sistema.

### 6.2 Brand Voice para AI

Globe opera una metodología de **Brand Voice para AI** que codifica la voz, tono y estilo de cada cliente en un framework estructurado que permite que las herramientas de IA generativa repliquen esa voz de forma consistente y gobernada.

En runtime Greenhouse, esta capa se considera `observed` solo cuando exista `brand_consistency_score` auditado en `ico_engine.ai_metric_scores`. Si el score todavía no existe para la cuenta, la narrativa correcta es `sin evidencia` o `parcial`, no una reconstrucción heurística de consistencia de marca.

No es "usar ChatGPT para escribir". Es un proceso formal donde se audita la voz actual del cliente, se codifica en un framework de prompts estructurados, se testea contra los modelos del Multi-Model AI Studio, y se itera hasta lograr consistencia medible.

**Impacto en métricas:**

| Métrica impactada | Cómo impacta | Mecanismo |
|---|---|---|
| **FTR% ↑** | IA produce contenido on-brand desde el primer draft. | El framework de prompts incluye restricciones de voz, tono y estilo. El output ya suena como la marca. |
| **RpA ↓** | Menos rondas de corrección de tono y estilo. | Las correcciones se concentran en mensaje estratégico, no en "eso no suena como nosotros". |
| **Cycle Time ↓** | Ideación y primeros drafts más rápidos. | IA genera opciones que el copywriter refina, en vez de partir de página en blanco. |
| **Iteration Velocity ↑** | Más variantes de copy para testing en menos tiempo. | El framework permite generar variantes consistentes con la voz de marca rápidamente. |

**Qué se comunica al cliente:**
- **Sí se comunica:** "Globe codifica tu voz de marca para que la inteligencia artificial trabaje con tu identidad, no contra ella."
- **No se expone:** Los prompts específicos, las bibliotecas de voz, el stack de modelos ni la mecánica interna del framework.

> *Ambas capas metodológicas se instrumentalizan a través de ICO y se gestionan operativamente en Verk. No son productos standalone. Son lo que hace que Globe produzca con calidad predecible a velocidad industrial.*

---

## 7. Umbrales y targets

No todas las métricas de `ICO` tienen el mismo tipo de respaldo:

- `OTD%` tiene benchmark externo fuerte
- `FTR%` usa benchmark por análogo (`FPY` / `first-time error-free`)
- `RpA` usa benchmark creativo adaptado
- `Cycle Time`, `Cycle Time Variance` y `BCS` siguen siendo métricas con calibración principalmente interna por tipo de pieza, cuenta y contexto operativo

Por esa razón, el contrato distingue dos grupos:

### 7.1 Métricas con benchmark informado por referencias externas

Estas bandas quedan alineadas al criterio documentado en `Greenhouse_ICO_Engine_v1.md` § `A.5.5 Benchmarks externos y estándar recomendado para Greenhouse`.

| Métrica | World-class | Strong | Attention | Critical |
|---|---|---|---|---|
| **OTD%** | `>= 98%` | `95% - 97.9%` | `90% - 94.9%` | `< 90%` |
| **FTR%** | `>= 85%` | `70% - 84.9%` | `60% - 69.9%` | `< 60%` |
| **RpA** | `<= 2.0` | `> 2.0 y <= 3.0` | `> 3.0 y <= 4.0` | `> 4.0` |

Lectura correcta:

- `OTD%` adopta una referencia enterprise más exigente que el baseline previo del contrato
- `FTR%` no se lleva a niveles manufactureros (`95%+`) porque el trabajo creativo es más iterativo y subjetivo
- `RpA` se interpreta con benchmark creativo adaptado, no como estándar universal cross-industry

### 7.2 Métricas con calibración interna por cuenta o tipo de pieza

Estas métricas siguen calibrándose durante el mes 1 de baseline y pueden variar por cuenta, complejidad y categoría de contenido.

| Métrica | Saludable ✅ | Alerta ⚠️ | Crítico 🛑 |
|---|---|---|---|
| **Cycle Time** | Dentro del estándar por tipo de pieza | `+20–40%` sobre estándar | `+40%` sobre estándar |
| **Cycle Time Variance** | Baja dispersión (`DE < 30%` del promedio) | Dispersión media (`DE 30–60%`) | Dispersión alta (`DE >60%`) |
| **BCS** | `>= 80/100` | `60–79/100` | `<60/100` |

> *Los umbrales benchmark-informed y los umbrales internos no deben venderse como equivalentes. Una cuenta con contenido regulado (financiero, farmacéutico) o con alta complejidad de aprobación puede requerir calibraciones distintas en `Cycle Time`, `CTV` y `BCS`, pero no debería bajar arbitrariamente el estándar de referencia para `OTD%`, `FTR%` o `RpA` sin explicitar la excepción.*

---

## 8. Cadencia de medición

ICO mide en cuatro niveles de cadencia. Cada nivel tiene un propósito distinto y audiencia distinta.

| Cadencia | Nivel | Qué se revisa | Audiencia |
|---|---|---|---|
| **Tiempo real** | Pieza individual | OTD%, estado en pipeline, alertas de retraso, aprobaciones pendientes. | Equipo operativo Globe + cliente (vía Notion/Frame.io). |
| **Semanal** | Operativo | Cuellos de botella activos, proyectos atrasados, brief queue, capacidad vs. demanda. | Ops Lead Globe + Account Lead. |
| **Mensual** | Táctico | KPIs vs. mes anterior: OTD%, Cycle Time, FTR%, RpA. Volumen de producción. Tendencias. | Cliente (contacto operativo) + equipo Globe. |
| **Trimestral** | Estratégico | Revenue Enabled (3 palancas), calidad creativa, consistencia de marca, salud de relación, mejora continua. | Cliente (CMO/VP Marketing) + Director Globe + Managing Director Efeonce. |

---

## 9. Creative Velocity Review (CVR)

La **Creative Velocity Review** es el rito trimestral donde Globe presenta al cliente el impacto de la operación creativa en términos de negocio. Es el momento donde Revenue Enabled deja de ser una métrica interna y se convierte en una conversación de crecimiento con el cliente.

### 9.1 Estructura del CVR

1. **Resumen ejecutivo (5 min):** Revenue Enabled total del trimestre + tendencia vs. trimestre anterior.
2. **Las 3 palancas (10 min):** Desglose por Early Launch, Iteration Velocity, Throughput Expandido. Con casos concretos de campañas.
3. **Drivers operativos (10 min):** OTD%, FTR%, RpA, Cycle Time. Tendencias y mejoras implementadas.
4. **Capas metodológicas (5 min):** Evolución del Design System y Brand Voice para AI. Qué se construyó, qué se mejoró y qué outcomes canónicos ya sostienen esa lectura sin exponer IP interna.
5. **Plan de mejora continua (5 min):** 1-2 mejoras priorizadas para el próximo trimestre.
6. **Oportunidades de expansión (5 min):** Nuevos carriles de producción, formatos o mercados donde la velocidad creativa puede habilitar más revenue.

### 9.2 Reglas del CVR

- Siempre con datos reales. Nunca con estimaciones sin respaldo.
- Supuestos explícitos cuando la atribución no es directa.
- RE presentado como "observado" + "estimado (rango)".
- El CVR es también el momento para detectar oportunidades de cross-sell hacia otras unidades del ecosistema Efeonce.
- En runtime Greenhouse, el primer host visible del `CVR` es `Creative Hub`; hoy funciona como surface client-facing y no como publicación trimestral persistida independiente.
- La matriz `Basic / Pro / Enterprise` se trata hoy como contrato editorial de visibilidad. No existe todavía un hard-gating canónico por tier comercial en sesión, tenant context ni base de datos.

> *El CVR eleva la relación de proveedor a partnership de crecimiento. Es lo que diferencia a Globe de una agencia que manda un informe mensual de vanity metrics.*

---

## 10. Reglas de comunicación por tier de Greenhouse

No todos los clientes ven las mismas métricas. La visibilidad se escala según el tier de Greenhouse, alineado con el modelo ASaaS:

| Métrica / Nivel | Basic | Pro | Enterprise |
|---|---|---|---|
| **OTD%** | ✅ Visible | ✅ Visible | ✅ Visible |
| **RpA** | ✅ Visible | ✅ Visible | ✅ Visible |
| **Cycle Time** | — | ✅ Visible | ✅ Visible |
| **FTR%** | — | ✅ Visible | ✅ Visible |
| **Revenue Enabled** | — | ✅ Visible | ✅ Visible |
| **CVR trimestral** | — | ✅ Incluido | ✅ Incluido |
| **Benchmarks de industria** | — | — | ✅ Incluido |
| **Revenue Enabled comparativo** | — | — | ✅ Incluido |

---

## 11. Checklist de coherencia trimestral

Antes de cada Creative Velocity Review, el equipo interno valida:

1. ¿Estamos moviendo FTR hacia arriba y bajando RpA?
2. ¿Cycle Time está dentro del target por tipo de pieza?
3. ¿TTM bajó vs. trimestre anterior?
4. ¿Iteration Velocity subió?
5. ¿Throughput subió o se mantuvo con la misma capacidad?
6. ¿Tenemos un Revenue Enabled Story por cliente?
7. ¿El Design System evolucionó (nuevos componentes, mejoras)?
8. ¿Brand Voice para AI está calibrado con los últimos outputs?
9. ¿Los supuestos de RE son trazables y defendibles?
10. ¿Hay oportunidades de expansión identificadas para proponer en el CVR?

---

## 12. Glosario

| Término | Definición |
|---|---|
| **ICO** | Intelligent Creative Operations. Capa propietaria de Efeonce que habilita gobernanza, medición y automatización en la Creative Supply Chain. |
| **CSC** | Creative Supply Chain. Modelo operativo de referencia de industria (7 fases) que estructura cómo se produce contenido creativo. ICO opera sobre la CSC. |
| **Revenue Enabled (RE)** | North Star Metric. Revenue incremental que el cliente captura gracias a la velocidad creativa competitiva. |
| **OTD%** | On-Time Delivery Rate. % de piezas entregadas dentro del plazo del brief. |
| **Cycle Time (CT)** | Tiempo promedio desde brief aprobado hasta pieza entregada. |
| **RpA** | Rounds per Asset. Número promedio de rondas de revisión por pieza. |
| **FTR%** | First Time Right. % de assets aprobados en primera ronda. |
| **BCS** | Brief Clarity Score. Score de completitud del brief validado por AI Agent. |
| **TTM** | Time-to-Market. Días desde brief efectivo hasta asset activo en mercado. |
| **CVR** | Creative Velocity Review. Rito trimestral de presentación de Revenue Enabled al cliente. |
| **Design System** | Capa metodológica: infraestructura visual de componentes, tokens y patrones que habilita consistencia y velocidad. |
| **Brand Voice para AI** | Capa metodológica: framework que codifica voz, tono y estilo del cliente para que la IA generativa produzca contenido on-brand. |

---

**Efeonce Group SpA**

ICO — Intelligent Creative Operations™

Loop Marketing™ | Nested Loops™ | Creative Supply Chain + ICO

Chile | Colombia | México | Perú

*Este documento es propiedad intelectual de Efeonce Group SpA. Su reproducción total o parcial está prohibida sin autorización escrita.*
