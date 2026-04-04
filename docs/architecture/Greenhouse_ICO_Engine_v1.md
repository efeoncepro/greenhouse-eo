# EFEONCE GREENHOUSE™ — ICO Engine

## Delta 2026-04-04 — TASK-213 closes the umbrella on real runtime convergence

`TASK-213` deja de describir una foundation faltante y queda cerrada como umbrella de convergencia sobre el runtime ya implementado.

- la task paraguas ya refleja que `TASK-214` a `TASK-223` están cerradas
- `Creative Hub` ya no pierde la metadata trust de `throughput` al resumir `MetricsSummary` para `Revenue Enabled`
- `People > Person Intelligence` ya usa el reader trust-aware existente para mostrar estado de confianza de KPIs delivery sin abrir schema nuevo en `person_operational_360`
- `Agency > ICO Engine` ya expone una lectura compacta del `metricTrust` del `Performance Report` mensual
- implicación:
  - el residual real del programa ya no es “crear trust foundation”
  - los siguientes gaps pertenecen a follow-ons específicos por consumer o persistencia, no a esta umbrella

## Delta 2026-04-04 — TASK-223 ships the first methodological-accelerators runtime lane

`TASK-223` no crea una tabla nueva ni una materialización separada del engine, pero sí formaliza cómo se leen `Design System` y `Brand Voice para AI` sobre foundations ya existentes.

- baseline runtime nuevo:
  - contrato `methodological accelerators` dentro del `CVR`
  - lectura `proxy` de `Design System` apoyada en outcomes canónicos ya materializados
  - lectura `observed` de `Brand Voice para AI` solo cuando exista `brand_consistency_score` auditado en `ico_engine.ai_metric_scores`
- implicaciones inmediatas:
  - `Creative Hub` consume esta lane dentro del mismo host visible de `CVR`
  - `Brand Consistency` visible ya no debe reconstruirse con heurísticas locales cuando falte score auditado
  - la conexión a `Revenue Enabled` sigue siendo narrativa y policy-aware, no salto directo a revenue observado

## Delta 2026-04-04 — TASK-222 ships the first Creative Velocity Review runtime contract

`TASK-222` no agrega una materialización trimestral nueva del engine, pero sí deja un contrato runtime explícito para `CVR` y lo conecta a la surface client-facing de `Creative Hub`.

- el nuevo contrato compone:
  - `TTM`
  - `Iteration Velocity`
  - `Revenue Enabled`
  - estructura del review
  - matriz de visibilidad por tier
  - guardrails de narrativa
- implicaciones inmediatas:
  - `Creative Hub` ya no debe tratar `CVR` como copy estático o aspiracional; la surface ahora baja de un contrato único
  - `Early Launch` sigue cayendo a `unavailable` cuando la scope no trae evidencia suficiente de `TTM`
  - la matriz `Basic / Pro / Enterprise` sigue siendo editorial y no entitlement runtime persistido

## Delta 2026-04-04 — TASK-221 ships the first Revenue Enabled measurement-model contract

`TASK-221` no agrega todavía una materialización nueva del engine para `Revenue Enabled`, pero sí deja un contrato runtime explícito para que los consumers dejen de inventar atribución local.

- `src/lib/ico-engine/revenue-enabled.ts` ya compone las palancas sobre foundations reales:
  - `TTM`
  - `Iteration Velocity`
  - `throughput`
- el contrato ya distingue clases de atribución:
  - `observed`
  - `range`
  - `estimated`
  - `unavailable`
- regla vigente:
  - `Creative Hub` ya no debe derivar `Revenue Enabled` desde `OTD`, `RpA` ni benchmarks locales como si fueran revenue observado
  - `Throughput` actual sigue siendo output operativo y no debe presentarse todavía como “campañas adicionales con revenue observado”
- esta entrega permanece `on-read`:
  - no abre tabla nueva en `ico_engine`
  - no publica evento nuevo
  - deja el carril listo para futuros readers/materializaciones cuando exista attribution layer defendible

## Delta 2026-04-04 — TASK-220 ships the first BCS runtime contract

`TASK-220` activa el primer contrato runtime de `Brief Clarity Score` sin introducir todavía un writer canónico único para el AI layer.

- `src/lib/ico-engine/brief-clarity.ts` ya sirve `BCS` a nivel project con:
  - `value`
  - `passed`
  - `available/degraded/unavailable`
  - `confidenceLevel`
  - `intakePolicyStatus`
  - `effectiveBriefAt`
  - `qualityGateReasons`
- la source policy inicial lee el último `brief_clarity_score` disponible en `ico_engine.ai_metric_scores` y lo combina con `governance` de Notion por `space`
- el umbral operativo inicial de `brief efectivo` queda fijado en `>= 80` o `passed = true`
- `GET /api/projects/[id]/ico` ya expone `briefClarityScore`
- `campaign-metrics.ts` ya puede usar `effectiveBriefAt` observado para el start-side de `TTM`; si no hay score válido, el consumer cae a la jerarquía proxy previa
- la lane no asume cobertura universal: si el AI score no existe todavía, el contrato debe responder `unavailable` o `degraded`, no inventar evidencia

## Delta 2026-04-04 — TASK-219 ships the first Iteration Velocity evidence contract

`TASK-219` deja operativo el primer contrato runtime de `Iteration Velocity`, aunque la metrica todavia no entra al carril materialized-first del engine.

- `src/lib/ico-engine/iteration-velocity.ts` define el contrato inicial:
  - valor base = iteraciones utiles cerradas en ventana de `30d`
  - `available/degraded/unavailable`
  - `confidenceLevel`
  - `evidenceMode`
  - `qualityGateReasons`
- la source policy inicial se apoya en `greenhouse_conformed.delivery_tasks`:
  - `frame_versions`
  - `workflow_change_round`
  - `client_change_round_final`
  - `client_review_open`
  - `workflow_review_open`
  - `open_frame_comments`
- `pipeline_velocity` sigue siendo una metrica de flujo operativo y no puede reutilizarse como sustituto semantico de `Iteration Velocity`
- esta entrega expone el contrato en `GET /api/projects/[id]/ico` y corta `Creative Hub` a ese reader/helper canonico, reemplazando la heuristica legacy derivada de `RpA`
- mientras no exista evidencia observada de mercado o ads-platform, la lane debe viajar como `proxy` y `degraded`

## Delta 2026-04-04 — TASK-218 ships the first TTM evidence contract

`TASK-218` deja operativo el primer contrato runtime de `TTM` para campañas, aun cuando la métrica todavía no entra al carril materialized-first del engine.

- `src/lib/ico-engine/time-to-market.ts` define selección de evidencia, `available/degraded/unavailable` y `confidenceLevel`
- el evento de inicio ya puede ser **observed** cuando `TASK-220` encuentra `BCS` válido; si no, conserva la jerarquía proxy anterior
- la activación prioriza evidencia observada (`campaign.actual_launch_date` o publicación/activación detectada) y recién después cae a proxy o `planned`
- esta entrega no incorpora todavía `TTM` al `metric-registry`, `metric_snapshots_monthly` ni `read-metrics.ts`; el consumer inicial vive en `campaign-metrics.ts` y `CampaignDetailView.tsx`

## Delta 2026-04-03 — TASK-216 institutionalizes metric trust metadata and serving parity

`TASK-216` ya dejó operativo el trust model genérico del engine por encima de la semántica congelada en `TASK-214` y de la policy específica de `RpA` cerrada en `TASK-215`.

- `metric-registry.ts` ahora modela benchmark semantics por métrica:
  - `external`
  - `analog`
  - `adapted`
  - `internal`
- `read-metrics.ts` ya debe exponer por métrica:
  - `benchmarkType`
  - `qualityGateStatus`
  - `confidenceLevel`
  - evidencia reusable de soporte
- `RpA` conserva su sub-policy especializada (`dataStatus`, `suppressionReason`, `evidence`) y se integra al trust contract general sin redefinir la fórmula base
- `greenhouse_serving.ico_member_metrics` y `greenhouse_serving.agency_performance_reports` ya persisten `metric_trust_json`
- los readers serving-first (`People`, `Agency Performance Report`) deben leer ese JSON cuando exista y, si no existe todavía, derivarlo en runtime sin romper compatibilidad con filas legacy

Implicación:

- los consumers downstream ya no deben inferir benchmark o confianza localmente si el engine/serving ya entrega la metadata
- `Agency` puede enfocarse en response shaping y UI semantics (`TASK-217`), no en abrir un segundo contrato de trust

## Delta 2026-04-03 — TASK-215 formalizes RpA runtime policy and evidence contract

`TASK-215` no redefine la fórmula base de `RpA`; la formaliza como contrato runtime auditable sobre la policy implícita ya existente.

- `RpA` sigue calculándose desde tareas completadas terminales con `rpa_value > 0`
- el engine debe propagar además un estado de calidad para consumers downstream:
  - `valid`
  - `low_confidence`
  - `suppressed`
  - `unavailable`
- la señal debe viajar con evidencia mínima de coverage para que readers y consumers no reinterpreten localmente `0`, `null` o ausencia de datos
- `Payroll` debe seguir tratando la KPI surface con prudencia: la policy de negocio no se mueve al consumer, se propaga desde el engine

La implementación asociada a esta delta usa los mismos contratos troncales del engine y no rompe la semántica endurecida por `TASK-214`.

## Delta 2026-04-03 — TASK-214 closed completion semantics drift and serving member parity

`TASK-214` cerró el drift residual entre helpers, readers, materializaciones y serving member-level:

- `completed_at` solo cuenta como cierre cuando además existe estado terminal canónico:
  - `Listo`
  - `Done`
  - `Finalizado`
  - `Completado`
  - `Aprobado`
- `delivery_signal` ya no debe inferirse desde `completed_at` solo; requiere `completed_at + terminal status + due_date`
- `overdue`, `carry_over` y `overdue_carried_forward` deben exigir explícitamente semántica de tarea abierta, incluso si el upstream trae `performance_indicator_code`
- el carril activo de CSC se endurece con la misma regla de tarea abierta para no contaminar distribución de pipeline con filas cerradas
- `greenhouse_serving.ico_member_metrics` ya no puede quedar como subconjunto silencioso de `metrics_by_member`; debe incluir:
  - `on_time_count`
  - `late_drop_count`
  - `overdue_count`
  - `carry_over_count`
  - `overdue_carried_forward_count`
- `Person 360` y consumers member-level deben leer estos buckets desde el contrato canónico o desde serving alineado, no recalcular reglas locales

## Delta 2026-04-03 — Carry-Over & Overdue Carried Forward semantic split

`TASK-204` separa semánticamente carry-over de deuda vencida arrastrada en el engine y materialización:

- `Carry-Over` = tarea creada en el período con `due_date` posterior al cierre (carga futura, no penaliza OTD)
- `Overdue Carried Forward` = tarea con `due_date < period_start` y abierta al cierre (deuda arrastrada, no penaliza OTD)
- `OTD` = `On-Time / (On-Time + Late Drop + Overdue)` — carry-over y OCF excluidos del denominador
- `buildPeriodFilterSQL()` ahora incluye los 3 universos de tareas (due_date in period + carry-over + OCF)
- `overdue_carried_forward_count` materializado en todos los metrics tables (BQ) y serving tables (PG)
- migración: `greenhouse_serving.agency_performance_reports` y `greenhouse_serving.ico_member_metrics`

## Delta 2026-04-02 — Historical Delivery periods now support frozen task snapshots

`TASK-201` agrega una nueva pieza canónica al runtime de `ICO`:

- `ico_engine.delivery_task_monthly_snapshots`

Semántica:

- snapshot task-level por `period_year` + `period_month`
- `snapshot_status = 'working'` mientras el período sigue abierto
- `snapshot_status = 'locked'` al congelar el cierre mensual

Regla de lectura:

- si existe snapshot `locked`, las materializaciones mensuales Delivery deben leer desde esa tabla y no desde `v_tasks_enriched`
- `v_tasks_enriched` queda como source vivo para períodos abiertos y como fallback cuando todavía no existe snapshot congelado

Motivo:

- la calibración de `Marzo 2026` mostró que Notion puede reescribir historia después del cierre del período
- para evitar drift retroactivo, `ICO` necesita una foto congelada del universo task-level antes de publicar el scorecard mensual

## Delta 2026-04-02 — Monthly Delivery report semantics now use due-date scope

`TASK-200` fija un cambio semántico para los KPIs mensuales que alimentan el `Performance Report`:

- el período canónico del scorecard se define por `due_date in month`, no por `period_anchor_date`
- el cierre mensual usa `period_end + 1 day` como fecha de corte canónica
- `OTD` del reporte ya no es `on_time / (on_time + late_drop)`
- `OTD` del reporte pasa a ser `on_time / total_classified_tasks`
- `Overdue` y `Carry-Over` pasan a leerse como buckets mutuamente excluyentes del scorecard mensual
- `Top Performer` ya debe evaluarse con volumen total de tareas del período, no solo `throughput_count` de completadas

Regla vigente:

- la fuente ejecutable del contrato vive en `src/lib/ico-engine/shared.ts`
- `metric_snapshots_monthly`, `metrics_by_member`, `metrics_by_project` y `performance_report_monthly` deben materializarse desde esa misma semántica
- la reconciliación de históricos previos al contrato queda a cargo de `TASK-201`

## Delta 2026-04-02 — Member dimension now follows primary-owner attribution

`TASK-199` fija un cambio semántico para la dimensión `member`:

- antes: `metrics_by_member` acreditaba todas las tareas vía `UNNEST(assignee_member_ids)`
- ahora: `metrics_by_member`, `Top Performer` y los readers member-level deben acreditar solo al `primary owner member`

Regla vigente:

- `assignee_member_ids` sigue existiendo para trazabilidad y consumers operativos
- `v_tasks_enriched` debe exponer aliases explícitos de owner principal
- la dimensión `member` ya no debe expandir el array completo para scorecards canónicos

## Delta 2026-04-01 — Guardrail para snapshots por miembro materialized-first

El carril `materialized-first` por miembro quedó endurecido para `TASK-189`:

- `readMemberMetrics()` y `readMemberMetricsBatch()` ya no asumen que cualquier fila existente en `ico_engine.metrics_by_member` es válida para consumo
- si detectan buckets/contexto críticos en `null` (`on_time_count`, `late_drop_count`, `overdue_count`, `carry_over_count`) con `total_tasks > 0`, hacen fallback live al engine
- esto protege a:
  - `People > Activity`
  - `Payroll`
  - cualquier consumer runtime o batch basado en member metrics

Regla vigente:

- `metrics_by_member` sigue siendo el carril preferido
- pero un snapshot materializado legacy o parcial no debe ocultar trabajo comprometido real del período ni borrar el `carry-over` visible

## Delta 2026-04-01 — Performance Report mensual ya materializado dentro de ICO

`ICO` ya no solo expone snapshots por `space` y por dimensión; ahora también materializa un read-model mensual auditable para el scorecard Agency:

- tabla nueva: `ico_engine.performance_report_monthly`
- fuente del read-model:
  - `ico_engine.metric_snapshots_monthly` para resumen agregado del período
  - `ico_engine.metrics_by_member` para `Top Performer`
- contenido actual del snapshot:
  - resumen mensual (`On-Time %`, `Late Drops`, `Overdue`, `Carry-Over`, totales)
  - segmentación explícita `Tareas Efeonce` / `Tareas Sky`
  - `task_mix_json` con distribución por segmento adicional, agrupada sobre `client_id` / `space_id`
  - `Top Performer` MVP y sus supuestos operativos
- consumer formal:
  - `greenhouse_serving.agency_performance_reports` como cache OLTP del scorecard mensual
  - refrescado por la proyección reactiva `agency_performance_reports`
- regla vigente:
  - el `Performance Report` no debe abrir un carril de cálculo paralelo al engine
  - debe construirse sobre materializaciones ya consolidadas del propio `ICO`
  - el reader usa `Postgres-first`, luego `BigQuery materialized`, y recién después fallback computado si el snapshot aún no existe

Esto fortalece la auditabilidad del reporte mensual sin redefinir los KPIs troncales (`otd_pct`, `ftr_pct`, `rpa_avg`, `throughput_count`) ni romper consumers existentes.

## Delta 2026-04-01 — El Performance Report mensual ya tiene serving formal en PostgreSQL

El read-model mensual de Agency ya no depende solo de BigQuery para consumo runtime:

- `materializeMonthlySnapshots()` publica `ico.performance_report.materialized`
- la proyección `agency-performance-report` refleja el snapshot en:
  - `greenhouse_serving.agency_performance_reports`
- prioridad de lectura vigente del helper:
  - `greenhouse_serving.agency_performance_reports`
  - `ico_engine.performance_report_monthly`
  - fallback computado desde snapshots / métricas por miembro

Esto no reemplaza el engine; solo agrega una capa de serving estable para consumers runtime y futuras superficies cross-module.

## Delta 2026-04-01 — Bases de Notion que actúan como insumo principal del ICO actual

Aunque `ICO` consume su capa base desde `greenhouse_conformed.delivery_tasks` y no directamente desde Notion, los upstreams principales auditados hoy siguen siendo estas DBs de Notion:

- `Efeonce`
  - `Proyectos`: `15288d9b-1459-4052-9acc-75439bbd5470`
  - `Tareas`: `3a54f090-4be1-4158-8335-33ba96557a73`
- `Sky Airlines`
  - `Proyectos`: `23039c2f-efe7-817a-8272-ffe6be1a696a`
  - `Tareas`: `23039c2f-efe7-8138-9d1e-c8238fc40523`
- `ANAM`
  - `Proyectos`: `32539c2f-efe7-8053-94f7-c06eb3bbf530`
  - `Tareas`: `32539c2f-efe7-81a4-92f4-f4725309935c`

Lectura correcta:

- estos IDs no reemplazan el contrato `space_id -> space_notion_sources -> greenhouse_conformed`
- sí son la referencia práctica para auditar de dónde viene la señal que luego entra a `v_tasks_enriched` y a las materializaciones de `ICO`
- si una métrica de `ICO` deja de cuadrar con Notion, primero validar que el sync sigue apuntando a estas DBs antes de revisar fórmulas o materializaciones

Referencia cruzada:

- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/tasks/to-do/TASK-186-delivery-metrics-trust-notion-property-audit-contract.md`

## Delta 2026-04-01 — ICO es consumer protegido frente a nuevas lanes de integraciones

`ICO` ya entrega valor operativo real y no debe tratarse como un target libre para refactors amplios desde `TASK-186`, `TASK-187`, `TASK-188` o `TASK-189`.

Regla operativa:

- cambios para confianza de métricas o formalización de integraciones deben fortalecer el engine vigente
- no deben romper readers, materializaciones ni contratos existentes salvo corrección puntual y validada
- cualquier cambio al engine debe ser:
  - incremental
  - compatible hacia atrás cuando sea posible
  - verificable contra métricas existentes
  - reversible si degrada el comportamiento actual

## Especificación Técnica v1.0

**Efeonce Group — Marzo 2026 — CONFIDENCIAL**

---

## Estado 2026-03-18

Este documento sigue siendo una spec amplia de diseno del `ICO Engine`, pero ya no debe leerse como snapshot exacto del runtime por si solo.

Fuente operativa vigente para el estado actual:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
- `docs/tasks/complete/CODEX_TASK_ETL_ICO_Pipeline_Hardening.md`

Estado real ya absorbido en la arquitectura viva:
- el `ICO Engine` ya se documenta como servicio de metricas agnostico a dimension
- ya existen `metrics_by_member`, `GET /api/ico-engine/context`, multi-assignee support y `GET /api/ico-engine/health`
- el pipeline operativo ya se documenta como `notion-bq-sync -> /api/cron/sync-conformed -> /api/cron/ico-materialize`
- update `2026-04-03`:
  - `TASK-209` cerró el loop `notion-bq-sync -> sync-conformed` también en producción
  - `delivery_projects`, `delivery_tasks` y `delivery_sprints` ya no deben quedar desalineadas por reemplazos secuenciales parciales
  - la mejora no cambia las fórmulas ICO; mejora la consistencia del snapshot `greenhouse_conformed.delivery_*` que alimenta los cálculos

Lectura correcta de este documento:
- usarlo para entender la intencion funcional, el registro de metricas y extensiones futuras
- no tomar como source of truth literal las secciones que aun describen:
  - scoping por `notion_project_ids`
  - supuestos single-tenant del sync
  - pasos historicos ya corregidos por el hardening del pipeline

Cuando este documento choque con la arquitectura actualizada del 2026-03-18, prevalece la arquitectura.

## 1. Resumen ejecutivo

Este documento define el **ICO Engine**: la capa transversal de métricas de delivery de Greenhouse que calcula, materializa y expone las métricas operativas de Intelligent Creative Operations (ICO) para todos los servicios de Efeonce.

El ICO Engine no es un módulo de UI — es infraestructura de datos. Toma la data cruda que ya existe en BigQuery (sincronizada desde Notion, Frame.io, y otros sistemas operativos) y la transforma en métricas pre-calculadas, materializadas a distintos niveles de agregación, listas para ser consumidas por cualquier componente de Greenhouse.

**Principio rector:** Ningún módulo de presentación calcula métricas ICO al vuelo. Todo módulo que necesite RpA, OTD%, Cycle Time o cualquier métrica operativa lee del ICO Engine. El engine calcula una vez, los consumidores leen muchas veces.

### 1.1 Posición en la arquitectura de Greenhouse

```
Greenhouse (plataforma)
  │
  ├── Data Sources (BigQuery — capa cruda)
  │     notion_ops.tareas, notion_ops.proyectos, notion_ops.sprints
  │     notion_ops.revisiones (pendiente de agregar al sync)
  │     hubspot_crm.companies, hubspot_crm.deals
  │
  ├── ICO Engine (BigQuery — capa de cálculo, dataset: ico_engine)
  │     Metric Registry (TypeScript, código versionado)
  │     Scheduled queries (materialización diaria post-sync)
  │     Tablas materializadas por granularidad
  │     Views de consumo por módulo
  │
  ├── PostgreSQL (Cloud SQL — capa OLTP)
  │     greenhouse_core.organizations, spaces, services
  │     Fuente de verdad operativa para CRUD
  │     Recibe resúmenes ICO si se necesita real-time (futuro)
  │
  ├── Capabilities (capa de experiencia, por línea de servicio)
  │     Creative Production (Globe) — consume ICO + portfolio/pipeline UX
  │     Growth Engine (Digital) — consume ICO + performance/SEO UX
  │     CRM Suite (CRM Solutions) — consume ICO + CRM health UX
  │
  ├── Data Node (capa de export/API) — consume ICO directamente
  │
  └── Efeonce Ops (capa interna) — consume ICO para utilización, margen, benchmarks
```

### 1.2 Relación con otros documentos

| Documento | Relación |
|---|---|
| `Greenhouse_Services_Architecture_v1.md` | Define el objeto Service que el ICO Engine usa para agregar métricas por servicio. Services se implementa en paralelo; el engine ya incluye la granularidad de Service en su diseño. |
| `Greenhouse_Account_360_Object_Model_v1.md` | Define `organizations` y `spaces`. El ICO Engine agrega métricas a nivel Space (tenant). |
| `Greenhouse_Capabilities_Architecture_v1.md` | Define cómo se resuelven los módulos de UI. Los módulos consumen del ICO Engine; el engine no depende de capabilities. |
| `Greenhouse_Data_Node_Architecture_v1.md` | Define los mecanismos de export. El Data Node lee views del ICO Engine para generar CSV, XLSX, JSON y API responses. |
| `CODEX_TASK_Creative_Hub_Module.md` | Será actualizado para consumir del ICO Engine en vez de calcular métricas inline. |
| `ICO_Intelligent_Creative_Operations_v1.docx` | Define el framework conceptual de ICO. El engine es la implementación técnica de las métricas definidas ahí. |

### 1.3 Orden de implementación

```
1. Pipelines de data (prerequisito)
   Completar notion-bq-sync: agregar Proyectos, Sprints, Revisiones
   Verificar que las columnas necesarias fluyen a BigQuery

2. ICO Engine (este documento)
   Metric Registry en TypeScript
   Views base en BigQuery (capa conformed)
   Tablas materializadas (scheduled queries)
   Views de consumo

3. Services Architecture (en paralelo)
   PostgreSQL tables, HubSpot sync, CRUD
   Cuando esté listo: el engine agrega la dimensión Service

4. Capabilities / módulos de UI (después)
   Creative Production, Growth Engine, etc.
   Consumen del ICO Engine — no calculan nada
```

El ICO Engine y Services Architecture pueden avanzar en paralelo. El engine funciona sin Services (agrega por tarea → proyecto → space). Cuando Services esté operativo, el engine agrega la dimensión de servicio — es un enriquecimiento, no un prerequisito.

---

## 2. Fuentes de datos

### 2.1 Data que ya fluye a BigQuery

| Tabla | Dataset | Sync | Columnas relevantes para ICO |
|---|---|---|---|
| `tareas` | `notion_ops` | `notion-bq-sync` diario 03:00 AM | `estado`, `frame_versions`, `frame_comments`, `open_frame_comments`, `client_change_round`, `client_review_open`, `rpa`, `semaforo_rpa`, `created_time`, `last_edited_time`, `proyecto`, `sprint`, `url_frame_io`, `workflow_change_round`, `workflow_review_open`, `review_source`, `last_reviewed_version` |

### 2.2 Data que debe agregarse al sync

| Tabla | Dataset | Database ID | Estado actual | Acción requerida |
|---|---|---|---|---|
| `proyectos` | `notion_ops` | `15288d9b145940529acc75439bbd5470` | DB ID vacío en `.env.yaml` | Configurar `NOTION_DB_PROYECTOS` en `.env.yaml` y re-deploy |
| `sprints` | `notion_ops` | `0c40f928047a4879ae702bfd0183520d` | DB ID vacío en `.env.yaml` | Configurar `NOTION_DB_SPRINTS` en `.env.yaml` y re-deploy |
| `revisiones` | `notion_ops` | `f791ecc4f84c4cfc9d19fe0d42ec9a7f` | No incluida en el sync | Agregar como cuarta tabla en `SYNC_TABLES` del pipeline `notion-bq-sync` |

**Sobre el campo Responsable:** La tabla `tareas` no extrae actualmente el campo People de Notion. El Codex Task de Team Identity (`CODEX_TASK_Team_Identity_Capacity_System.md`) ya documenta este cambio. El ICO Engine funciona sin él para el MVP — las métricas se agregan por tarea/proyecto/servicio, no por persona. Cuando Responsable esté disponible, se habilita la granularidad por miembro del equipo.

### 2.3 Cadena de scope: cómo el engine sabe qué tareas pertenecen a qué

```
Space (PostgreSQL: greenhouse_core.spaces)
  │ notion_project_ids: TEXT[] — IDs de proyectos Notion del space
  │
  ├── [Hoy] Tarea pertenece a Space si:
  │     tarea.proyecto ∈ space.notion_project_ids
  │
  └── [Con Services] Tarea pertenece a Service si:
        service.notion_project_id = tarea.proyecto
        AND service.space_id = space.id
        Y a Space transitivamente via service.space_id
```

Para el MVP (sin Services), el JOIN es:

```sql
-- Tareas de un Space
SELECT t.*
FROM `notion_ops.tareas` t
JOIN UNNEST(@notion_project_ids) AS pid
  ON t.proyecto LIKE CONCAT('%', pid, '%')
```

Con Services operativo, el JOIN cambia a:

```sql
-- Tareas de un Service
SELECT t.*
FROM `notion_ops.tareas` t
JOIN `greenhouse_olap.services` s
  ON t.proyecto LIKE CONCAT('%', s.notion_project_id, '%')
WHERE s.space_id = @space_id
  AND s.pipeline_stage IN ('onboarding', 'active', 'renewal_pending', 'paused')
```

El engine materializa ambos caminos: métricas por proyecto (siempre disponible) y métricas por servicio (cuando el JOIN sea posible).

---

## 3. Metric Registry

### 3.1 Concepto

El Metric Registry es un archivo TypeScript versionado en el repositorio de Greenhouse que define cada métrica ICO: su identidad, su fórmula, las granularidades donde aplica, los umbrales de calidad, y los servicios donde es relevante.

Agregar una métrica nueva = agregar una entrada al registry. El scheduled query de BigQuery lee del registry (indirectamente, a través de las views que genera) para materializar los resultados.

### 3.2 Tipos

```typescript
// /src/config/ico-metric-registry.ts

// ─── Tipos base ───

export type MetricCategory =
  | 'quality'        // Calidad de entrega: RpA, FTR%
  | 'speed'          // Velocidad: Cycle Time, OTD%
  | 'efficiency'     // Eficiencia: Throughput, utilización
  | 'pipeline'       // Estado del pipeline: fase CSC, stuck, velocity
  | 'intelligence'   // AI-driven: Brief Clarity Score, Brand Consistency
  | 'custom'         // Métricas custom por cliente (futuro)

export type MetricFormulaType =
  | 'avg_field'           // Promedio de un campo numérico
  | 'count_where'         // Conteo de registros que cumplen condición
  | 'ratio'               // Numerador / denominador como porcentaje
  | 'percentile'          // Percentil de un campo (P50, P90, etc.)
  | 'days_diff'           // Diferencia en días entre dos timestamps
  | 'variance'            // Desviación estándar o coeficiente de variación
  | 'distribution'        // Conteo por categoría (pipeline phases, etc.)
  | 'threshold_count'     // Conteo de registros que exceden umbral
  | 'custom_sql'          // SQL custom (para métricas que no encajan en los tipos anteriores)

export type Granularity = 'task' | 'project' | 'service' | 'package' | 'space'

export type AggregationPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'all_time'

export interface ThresholdBands {
  green: number       // Valor debajo (o arriba, según direction) = verde
  yellow: number      // Entre green y red = amarillo
  red: number         // Valor arriba (o abajo) = rojo
  direction: 'lower_is_better' | 'higher_is_better'
}

export interface Benchmark {
  industry: number | null    // Promedio de industria (null si no disponible)
  ico_target: number | null  // Objetivo ICO (la promesa de Efeonce)
  source: string             // De dónde viene el benchmark
}

// ─── Definición de métrica ───

export interface ICOMetricDefinition {
  // Identidad
  id: string                          // Identificador único: 'rpa', 'otd_pct', 'cycle_time'
  name: string                        // Nombre en inglés (nunca se traduce)
  description: string                 // Descripción para tooltips (español neutro)
  category: MetricCategory
  
  // Cálculo
  formulaType: MetricFormulaType
  formulaConfig: Record<string, any>  // Configuración específica del tipo de fórmula
  
  // Alcance
  granularities: Granularity[]        // Niveles donde esta métrica se materializa
  aggregationPeriods: AggregationPeriod[]  // Períodos de agregación
  applicableServices: string[] | '*'  // Servicios donde aplica (* = todos)
  
  // Presentación
  format: 'number' | 'percentage' | 'days' | 'count' | 'ratio' | 'distribution'
  decimals: number
  suffix?: string                     // 'días', '%', 'x', 'assets/sem'
  thresholds: ThresholdBands | null   // null si no tiene semáforo
  benchmarks: Benchmark | null
  
  // Estado
  active: boolean                     // false = no se materializa
  comingSoon: boolean                 // true = se muestra placeholder en UI
  dependsOn: string[]                 // IDs de métricas de las que depende
  
  // Data source
  primaryTable: string                // Tabla fuente: 'notion_ops.tareas'
  requiredColumns: string[]           // Columnas que necesita de la tabla fuente
}
```

### 3.3 Registry: métricas MVP

```typescript
// /src/config/ico-metric-registry.ts (continuación)

export const ICO_METRIC_REGISTRY: ICOMetricDefinition[] = [

  // ═══════════════════════════════════════
  // CALIDAD
  // ═══════════════════════════════════════

  {
    id: 'rpa',
    name: 'Rounds per Asset',
    description: 'Promedio de rondas de revisión por pieza. La promesa ICO es máximo 2.',
    category: 'quality',
    formulaType: 'avg_field',
    formulaConfig: {
      field: 'client_change_round',
      nullHandling: 'exclude',           // Tareas sin rondas no cuentan
      filter: "estado NOT IN ('Backlog', 'Por hacer')"  // Solo tareas que entraron a producción
    },
    granularities: ['task', 'project', 'service', 'package', 'space'],
    aggregationPeriods: ['monthly', 'quarterly', 'all_time'],
    applicableServices: '*',
    format: 'number',
    decimals: 1,
    thresholds: {
      green: 2.0,
      yellow: 3.0,
      red: 3.0,
      direction: 'lower_is_better'
    },
    benchmarks: {
      industry: 3.5,
      ico_target: 2.0,
      source: 'ICO Framework v1 + Adobe/Forrester CSC benchmark'
    },
    active: true,
    comingSoon: false,
    dependsOn: [],
    primaryTable: 'notion_ops.tareas',
    requiredColumns: ['client_change_round', 'estado']
  },

  {
    id: 'ftr_pct',
    name: 'First Time Right',
    description: 'Porcentaje de assets aprobados sin solicitar cambios. FTR alto = brief claro + alineación de marca.',
    category: 'quality',
    formulaType: 'ratio',
    formulaConfig: {
      numerator: "COUNT(CASE WHEN IFNULL(client_change_round, 0) = 0 THEN 1 END)",
      denominator: "COUNT(*)",
      filter: "fase_csc = 'Completado'",  // Solo assets terminados
      multiplyBy: 100
    },
    granularities: ['project', 'service', 'package', 'space'],
    aggregationPeriods: ['monthly', 'quarterly', 'all_time'],
    applicableServices: '*',
    format: 'percentage',
    decimals: 0,
    suffix: '%',
    thresholds: {
      green: 70,
      yellow: 50,
      red: 50,
      direction: 'higher_is_better'
    },
    benchmarks: {
      industry: null,
      ico_target: 70,
      source: 'Objetivo interno Efeonce'
    },
    active: true,
    comingSoon: false,
    dependsOn: [],
    primaryTable: 'notion_ops.tareas',
    requiredColumns: ['client_change_round', 'fase_csc']
  },

  // ═══════════════════════════════════════
  // VELOCIDAD
  // ═══════════════════════════════════════

  {
    id: 'cycle_time',
    name: 'Cycle Time',
    description: 'Tiempo promedio en días desde la creación hasta la completación de un asset.',
    category: 'speed',
    formulaType: 'days_diff',
    formulaConfig: {
      startField: 'created_time',
      endField: 'last_edited_time',       // Proxy: última edición como completación
      filter: "fase_csc = 'Completado'",
      aggregation: 'avg'
    },
    granularities: ['task', 'project', 'service', 'package', 'space'],
    aggregationPeriods: ['monthly', 'quarterly', 'all_time'],
    applicableServices: '*',
    format: 'days',
    decimals: 1,
    suffix: 'días',
    thresholds: {
      green: 10,
      yellow: 14,
      red: 14,
      direction: 'lower_is_better'
    },
    benchmarks: {
      industry: 14.2,
      ico_target: 10.0,
      source: 'ICO Framework v1 — promedio agencia LATAM'
    },
    active: true,
    comingSoon: false,
    dependsOn: [],
    primaryTable: 'notion_ops.tareas',
    requiredColumns: ['created_time', 'last_edited_time', 'fase_csc']
  },

  {
    id: 'cycle_time_variance',
    name: 'Cycle Time Variance',
    description: 'Coeficiente de variación del cycle time. Mide la predictibilidad de la entrega.',
    category: 'speed',
    formulaType: 'variance',
    formulaConfig: {
      field: 'cycle_time_days',           // Campo derivado calculado en la view base
      type: 'coefficient_of_variation',   // stddev / avg * 100
      filter: "fase_csc = 'Completado'"
    },
    granularities: ['project', 'service', 'space'],
    aggregationPeriods: ['monthly', 'quarterly', 'all_time'],
    applicableServices: '*',
    format: 'percentage',
    decimals: 0,
    suffix: '%',
    thresholds: {
      green: 25,
      yellow: 40,
      red: 40,
      direction: 'lower_is_better'
    },
    benchmarks: {
      industry: null,
      ico_target: 25,
      source: 'Objetivo interno — operación predecible'
    },
    active: true,
    comingSoon: false,
    dependsOn: ['cycle_time'],
    primaryTable: 'notion_ops.tareas',
    requiredColumns: ['created_time', 'last_edited_time', 'fase_csc']
  },

  {
    id: 'otd_pct',
    name: 'OTD%',
    description: 'Porcentaje de assets entregados dentro del cycle time benchmark de industria.',
    category: 'speed',
    formulaType: 'ratio',
    formulaConfig: {
      numerator: "COUNT(CASE WHEN cycle_time_days <= 14.2 THEN 1 END)",
      denominator: "COUNT(*)",
      filter: "fase_csc = 'Completado'",
      multiplyBy: 100
    },
    granularities: ['project', 'service', 'package', 'space'],
    aggregationPeriods: ['monthly', 'quarterly', 'all_time'],
    applicableServices: '*',
    format: 'percentage',
    decimals: 0,
    suffix: '%',
    thresholds: {
      green: 89,
      yellow: 75,
      red: 75,
      direction: 'higher_is_better'
    },
    benchmarks: {
      industry: 70,
      ico_target: 89,
      source: 'ICO Framework v1 — HR Payroll Module v2 fija umbral en ≥89%'
    },
    active: true,
    comingSoon: false,
    dependsOn: ['cycle_time'],
    primaryTable: 'notion_ops.tareas',
    requiredColumns: ['created_time', 'last_edited_time', 'fase_csc']
  },

  // ═══════════════════════════════════════
  // EFICIENCIA
  // ═══════════════════════════════════════

  {
    id: 'throughput',
    name: 'Throughput',
    description: 'Assets completados por semana. Mide la capacidad de producción efectiva.',
    category: 'efficiency',
    formulaType: 'custom_sql',
    formulaConfig: {
      sql: `
        COUNT(CASE WHEN fase_csc = 'Completado'
          AND last_edited_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 28 DAY)
        THEN 1 END) / 4.0
      `,
      description: 'Assets completados en últimas 4 semanas / 4'
    },
    granularities: ['project', 'service', 'space'],
    aggregationPeriods: ['monthly', 'all_time'],
    applicableServices: '*',
    format: 'ratio',
    decimals: 1,
    suffix: 'assets/sem',
    thresholds: null,
    benchmarks: null,
    active: true,
    comingSoon: false,
    dependsOn: [],
    primaryTable: 'notion_ops.tareas',
    requiredColumns: ['fase_csc', 'last_edited_time']
  },

  // ═══════════════════════════════════════
  // PIPELINE
  // ═══════════════════════════════════════

  {
    id: 'csc_distribution',
    name: 'CSC Pipeline Distribution',
    description: 'Distribución de assets activos por fase de la Creative Supply Chain.',
    category: 'pipeline',
    formulaType: 'distribution',
    formulaConfig: {
      groupByField: 'fase_csc',
      expectedValues: ['Planning', 'Briefing', 'Producción', 'Aprobación', 'Asset Mgmt', 'Activación', 'Completado']
    },
    granularities: ['project', 'service', 'space'],
    aggregationPeriods: ['daily', 'all_time'],
    applicableServices: '*',
    format: 'distribution',
    decimals: 0,
    thresholds: null,
    benchmarks: null,
    active: true,
    comingSoon: false,
    dependsOn: [],
    primaryTable: 'notion_ops.tareas',
    requiredColumns: ['fase_csc']
  },

  {
    id: 'stuck_assets',
    name: 'Stuck Assets',
    description: 'Assets que llevan más de 48 horas en la misma fase sin cambio de estado.',
    category: 'pipeline',
    formulaType: 'threshold_count',
    formulaConfig: {
      field: 'hours_since_update',
      threshold: 48,
      filter: "fase_csc NOT IN ('Completado', 'Planning')",
      severity: {
        warning: 48,
        danger: 96
      }
    },
    granularities: ['project', 'service', 'space'],
    aggregationPeriods: ['daily'],
    applicableServices: '*',
    format: 'count',
    decimals: 0,
    thresholds: {
      green: 0,
      yellow: 1,
      red: 3,
      direction: 'lower_is_better'
    },
    benchmarks: null,
    active: true,
    comingSoon: false,
    dependsOn: [],
    primaryTable: 'notion_ops.tareas',
    requiredColumns: ['last_edited_time', 'fase_csc']
  },

  {
    id: 'pipeline_velocity',
    name: 'Pipeline Velocity',
    description: 'Tasa de assets que completan el pipeline por semana.',
    category: 'pipeline',
    formulaType: 'custom_sql',
    formulaConfig: {
      sql: `
        COUNT(CASE WHEN fase_csc = 'Completado'
          AND last_edited_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 28 DAY)
        THEN 1 END) / 4.0
      `,
      description: 'Idéntico a throughput — mismo cálculo, contexto diferente (pipeline vs eficiencia)'
    },
    granularities: ['project', 'service', 'space'],
    aggregationPeriods: ['monthly'],
    applicableServices: '*',
    format: 'ratio',
    decimals: 1,
    suffix: 'assets/sem',
    thresholds: null,
    benchmarks: null,
    active: true,
    comingSoon: false,
    dependsOn: ['throughput'],
    primaryTable: 'notion_ops.tareas',
    requiredColumns: ['fase_csc', 'last_edited_time']
  },

  // ═══════════════════════════════════════
  // INTELLIGENCE (coming soon)
  // ═══════════════════════════════════════

  {
    id: 'brief_clarity_score',
    name: 'Brief Clarity Score',
    description: 'Score de completitud del brief generado por IA. Quality gate: sin brief completo, no entra a producción.',
    category: 'intelligence',
    formulaType: 'avg_field',
    formulaConfig: {
      field: 'brief_clarity_score',
      nullHandling: 'exclude'
    },
    granularities: ['task', 'project', 'service', 'space'],
    aggregationPeriods: ['monthly', 'quarterly', 'all_time'],
    applicableServices: ['agencia_creativa', 'produccion_audiovisual', 'social_media_content'],
    format: 'percentage',
    decimals: 0,
    suffix: '%',
    thresholds: {
      green: 80,
      yellow: 60,
      red: 60,
      direction: 'higher_is_better'
    },
    benchmarks: null,
    active: false,
    comingSoon: true,
    dependsOn: [],
    primaryTable: 'notion_ops.tareas',
    requiredColumns: ['brief_clarity_score']
  },

  {
    id: 'brand_consistency_score',
    name: 'Brand Consistency Score',
    description: 'Porcentaje de assets validados como alineados a marca por el AI Agent de gobernanza.',
    category: 'intelligence',
    formulaType: 'ratio',
    formulaConfig: {
      numerator: "COUNT(CASE WHEN brand_validation_passed = true THEN 1 END)",
      denominator: "COUNT(CASE WHEN brand_validation_passed IS NOT NULL THEN 1 END)",
      multiplyBy: 100
    },
    granularities: ['project', 'service', 'space'],
    aggregationPeriods: ['monthly', 'quarterly', 'all_time'],
    applicableServices: ['agencia_creativa', 'produccion_audiovisual'],
    format: 'percentage',
    decimals: 0,
    suffix: '%',
    thresholds: {
      green: 85,
      yellow: 70,
      red: 70,
      direction: 'higher_is_better'
    },
    benchmarks: null,
    active: false,
    comingSoon: true,
    dependsOn: [],
    primaryTable: 'notion_ops.tareas',
    requiredColumns: ['brand_validation_passed']
  }
]
```

### 3.4 Extensibilidad

Para agregar una métrica nueva:

1. Agregar un objeto `ICOMetricDefinition` al array `ICO_METRIC_REGISTRY`
2. Si usa `formulaType: 'custom_sql'`, escribir el SQL en `formulaConfig.sql`
3. Si necesita una columna nueva en BigQuery, documentarla en `requiredColumns` y asegurar que el pipeline de sync la incluya
4. Correr el generador de views (§5) para que la métrica aparezca en las tablas materializadas
5. La UI la levanta automáticamente si está en el registry de un módulo que la referencia

Para métricas custom por cliente (futuro):

- Agregar campo `spaceId: string | null` a `ICOMetricDefinition`
- `null` = métrica global (aplica a todos)
- Un UUID = métrica exclusiva de ese Space
- El scheduled query filtra por `spaceId` al materializar
- El CRUD de métricas custom vive en Efeonce Ops y escribe a PostgreSQL; un ETL sincroniza las definiciones a BigQuery para el scheduled query

---

## 4. Capa conformed: views base en BigQuery

### 4.1 Dataset

```
BigQuery dataset: ico_engine
Proyecto: efeonce-group
Región: us-central1
```

### 4.2 View base: `ico_engine.v_tareas_enriched`

View que toma las tareas crudas de `notion_ops.tareas` y agrega campos derivados que el engine necesita. Esta es la única view que toca la data cruda — todo lo demás parte de aquí.

```sql
CREATE OR REPLACE VIEW `efeonce-group.ico_engine.v_tareas_enriched` AS
SELECT
  t.notion_page_id,
  t.titulo,
  t.estado,
  t.proyecto,
  t.sprint,
  t.url_frame_io,
  
  -- Frame.io / Review data
  t.frame_versions,
  t.frame_comments,
  t.open_frame_comments,
  IFNULL(t.client_change_round, 0) AS client_change_round,
  IFNULL(t.workflow_change_round, 0) AS workflow_change_round,
  t.client_review_open,
  t.workflow_review_open,
  t.review_source,
  t.rpa AS rpa_notion,                -- RpA calculado por fórmula de Notion
  t.semaforo_rpa,
  t.last_reviewed_version,
  
  -- Timestamps
  t.created_time,
  t.last_edited_time,
  
  -- ═══ Campos derivados ═══
  
  -- Fase CSC (calculada server-side)
  CASE
    WHEN t.estado IN ('Backlog', 'Por hacer')
      THEN 'Planning'
    WHEN t.estado IN ('Brief en revisión')
      OR (t.estado = 'En curso' AND IFNULL(t.frame_versions, 0) = 0 
          AND IFNULL(t.client_review_open, false) = false)
      THEN 'Briefing'
    WHEN t.estado = 'En curso' AND IFNULL(t.frame_versions, 0) > 0 
         AND IFNULL(t.client_review_open, false) = false
      THEN 'Producción'
    WHEN t.estado IN ('Listo para revisión', 'Cambios Solicitados') 
         OR IFNULL(t.client_review_open, false) = true
      THEN 'Aprobación'
    WHEN t.estado IN ('Aprobado', 'En entrega')
      THEN 'Asset Mgmt'
    WHEN t.estado IN ('Publicado', 'Activado', 'En distribución')
      THEN 'Activación'
    WHEN t.estado IN ('Listo', 'Completado')
      THEN 'Completado'
    ELSE 'Producción'  -- Fallback conservador
  END AS fase_csc,
  
  -- Cycle time en días (created → last_edited como proxy de completación)
  TIMESTAMP_DIFF(t.last_edited_time, t.created_time, HOUR) / 24.0 AS cycle_time_days,
  
  -- Horas desde última actualización (para stuck detection)
  TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), t.last_edited_time, HOUR) AS hours_since_update,
  
  -- First Time Right (booleano)
  CASE WHEN IFNULL(t.client_change_round, 0) = 0 
       AND t.estado IN ('Listo', 'Completado', 'Aprobado', 'Publicado', 'Activado')
    THEN true ELSE false 
  END AS first_time_right,
  
  -- RpA unificado: usa client_change_round como fuente primaria
  -- (Frame Versions puede sobre-contar si hay versiones técnicas)
  IFNULL(t.client_change_round, 0) + IFNULL(t.workflow_change_round, 0) AS rpa_calculated,
  
  -- Período de completación (para agregaciones temporales)
  CASE WHEN t.estado IN ('Listo', 'Completado')
    THEN FORMAT_TIMESTAMP('%Y-%m', t.last_edited_time)
    ELSE NULL
  END AS completion_month,
  
  -- Metadata de sync
  t._synced_at

FROM `efeonce-group.notion_ops.tareas` t
```

**IMPORTANTE:** El mapeo `estado → fase_csc` es una propuesta basada en los estados documentados. Antes de implementar, verificar los valores reales:

```sql
SELECT estado, COUNT(*) as count
FROM `efeonce-group.notion_ops.tareas`
GROUP BY estado
ORDER BY count DESC;
```

### 4.3 View de scope: `ico_engine.v_tareas_by_project`

Agrega la relación tarea → proyecto con metadata del proyecto.

```sql
CREATE OR REPLACE VIEW `efeonce-group.ico_engine.v_tareas_by_project` AS
SELECT
  te.*,
  p.notion_page_id AS project_id,
  p.titulo AS project_name
FROM `efeonce-group.ico_engine.v_tareas_enriched` te
LEFT JOIN `efeonce-group.notion_ops.proyectos` p
  ON te.proyecto LIKE CONCAT('%', p.notion_page_id, '%')
```

### 4.4 View de scope con Service (disponible cuando Services esté operativo)

```sql
-- FUTURO: activar cuando greenhouse_olap.services tenga data
CREATE OR REPLACE VIEW `efeonce-group.ico_engine.v_tareas_by_service` AS
SELECT
  tp.*,
  s.id AS service_id,
  s.name AS service_name,
  s.servicio_especifico,
  s.linea_de_servicio,
  s.space_id,
  s.pipeline_stage AS service_stage,
  s.modalidad
FROM `efeonce-group.ico_engine.v_tareas_by_project` tp
JOIN `efeonce-group.greenhouse_olap.services` s
  ON tp.project_id = s.notion_project_id
WHERE s.pipeline_stage IN ('onboarding', 'active', 'renewal_pending', 'paused')
```

---

## 5. Tablas materializadas

### 5.1 Estrategia de materialización

Un scheduled query de BigQuery corre diario a las **03:15 AM** (15 minutos después del sync de Notion). Materializa las métricas a tres niveles de granularidad. Cada tabla se sobrescribe completamente (WRITE_TRUNCATE) — simple, idempotente, sin CDC.

### 5.2 Tabla: `ico_engine.metrics_by_project`

Métricas ICO agregadas por proyecto y período.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.ico_engine.metrics_by_project` (
  -- Dimensiones
  project_id STRING NOT NULL,
  project_name STRING,
  period STRING NOT NULL,               -- 'all_time' | '2026-03' | '2026-Q1'
  period_type STRING NOT NULL,          -- 'all_time' | 'monthly' | 'quarterly'
  
  -- Métricas de calidad
  rpa_avg FLOAT64,                      -- Promedio RpA
  rpa_median FLOAT64,                   -- Mediana RpA
  ftr_pct FLOAT64,                      -- First Time Right %
  total_tasks INT64,                    -- Total de tareas en el período
  completed_tasks INT64,                -- Tareas completadas
  
  -- Métricas de velocidad
  cycle_time_avg FLOAT64,              -- Cycle Time promedio (días)
  cycle_time_p50 FLOAT64,             -- Cycle Time mediana
  cycle_time_p90 FLOAT64,             -- Cycle Time P90
  cycle_time_variance FLOAT64,         -- Coeficiente de variación (%)
  otd_pct FLOAT64,                     -- On-Time Delivery %
  
  -- Métricas de eficiencia
  throughput_weekly FLOAT64,           -- Assets completados por semana
  
  -- Métricas de pipeline (solo para period_type = 'all_time' o 'daily')
  pipeline_planning INT64,
  pipeline_briefing INT64,
  pipeline_production INT64,
  pipeline_approval INT64,
  pipeline_asset_mgmt INT64,
  pipeline_activation INT64,
  pipeline_completed INT64,
  stuck_count_48h INT64,               -- Assets stuck >48h
  stuck_count_96h INT64,               -- Assets stuck >96h
  
  -- Metadata
  _materialized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### 5.3 Tabla: `ico_engine.metrics_by_service`

Métricas ICO agregadas por servicio y período. **Disponible cuando Services Architecture esté operativo.** Mientras tanto, la tabla existe vacía.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.ico_engine.metrics_by_service` (
  -- Dimensiones
  service_id STRING NOT NULL,
  service_name STRING,
  servicio_especifico STRING,
  linea_de_servicio STRING,
  space_id STRING NOT NULL,
  period STRING NOT NULL,
  period_type STRING NOT NULL,
  
  -- Métricas (misma estructura que metrics_by_project)
  rpa_avg FLOAT64,
  rpa_median FLOAT64,
  ftr_pct FLOAT64,
  total_tasks INT64,
  completed_tasks INT64,
  cycle_time_avg FLOAT64,
  cycle_time_p50 FLOAT64,
  cycle_time_p90 FLOAT64,
  cycle_time_variance FLOAT64,
  otd_pct FLOAT64,
  throughput_weekly FLOAT64,
  pipeline_planning INT64,
  pipeline_briefing INT64,
  pipeline_production INT64,
  pipeline_approval INT64,
  pipeline_asset_mgmt INT64,
  pipeline_activation INT64,
  pipeline_completed INT64,
  stuck_count_48h INT64,
  stuck_count_96h INT64,
  
  -- Metadata
  _materialized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### 5.4 Tabla: `ico_engine.metrics_by_space`

Métricas ICO agregadas por Space (tenant). Es la agregación que ve el dashboard principal del cliente.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.ico_engine.metrics_by_space` (
  -- Dimensiones
  space_id STRING NOT NULL,             -- UUID del Space en PostgreSQL (o legacy client_id)
  period STRING NOT NULL,
  period_type STRING NOT NULL,
  
  -- Métricas (misma estructura)
  rpa_avg FLOAT64,
  rpa_median FLOAT64,
  ftr_pct FLOAT64,
  total_tasks INT64,
  completed_tasks INT64,
  cycle_time_avg FLOAT64,
  cycle_time_p50 FLOAT64,
  cycle_time_p90 FLOAT64,
  cycle_time_variance FLOAT64,
  otd_pct FLOAT64,
  throughput_weekly FLOAT64,
  pipeline_planning INT64,
  pipeline_briefing INT64,
  pipeline_production INT64,
  pipeline_approval INT64,
  pipeline_asset_mgmt INT64,
  pipeline_activation INT64,
  pipeline_completed INT64,
  stuck_count_48h INT64,
  stuck_count_96h INT64,
  
  -- Metadata
  _materialized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### 5.5 Tabla: `ico_engine.stuck_assets_detail`

Detalle de assets detenidos, actualizado diariamente. Los módulos de UI consumen esta tabla para mostrar la lista de stuck assets sin recalcular.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.ico_engine.stuck_assets_detail` (
  notion_page_id STRING NOT NULL,
  titulo STRING,
  project_id STRING,
  project_name STRING,
  fase_csc STRING,
  hours_since_update FLOAT64,
  days_since_update FLOAT64,
  severity STRING,                     -- 'warning' (>48h) | 'danger' (>96h)
  rpa_calculated INT64,
  url_frame_io STRING,
  client_review_open BOOL,
  _materialized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### 5.6 Tabla: `ico_engine.rpa_trend`

Serie temporal de RpA por proyecto y mes, pre-calculada para charts de tendencia.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.ico_engine.rpa_trend` (
  project_id STRING,
  project_name STRING,
  month STRING NOT NULL,               -- 'YYYY-MM'
  rpa_avg FLOAT64,
  rpa_median FLOAT64,
  tasks_completed INT64,
  _materialized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

---

## 6. Scheduled queries

### 6.1 Orquestación

```
Cloud Scheduler
  │
  ├── 03:00 AM — notion-bq-sync (data cruda)
  ├── 03:15 AM — ico-engine-materialize (scheduled query de BigQuery)
  └── 03:30 AM — hubspot-bq-sync (CRM data)
```

El scheduled query `ico-engine-materialize` es un BigQuery scheduled query nativo (no Cloud Function). Se configura vía `bq mk --transfer_config` o desde la consola de BigQuery.

### 6.2 Query de materialización: metrics_by_project

```sql
-- Scheduled query: ico_engine.metrics_by_project
-- Schedule: diario 03:15 AM (America/Santiago)
-- Write disposition: WRITE_TRUNCATE

-- Materializar métricas por proyecto, all_time
INSERT INTO `efeonce-group.ico_engine.metrics_by_project`
SELECT
  project_id,
  project_name,
  'all_time' AS period,
  'all_time' AS period_type,
  
  -- Calidad
  AVG(CASE WHEN rpa_calculated > 0 THEN rpa_calculated END) AS rpa_avg,
  APPROX_QUANTILES(CASE WHEN rpa_calculated > 0 THEN rpa_calculated END, 2)[SAFE_OFFSET(1)] AS rpa_median,
  SAFE_DIVIDE(
    COUNTIF(first_time_right = true AND fase_csc = 'Completado'),
    COUNTIF(fase_csc = 'Completado')
  ) * 100 AS ftr_pct,
  COUNT(*) AS total_tasks,
  COUNTIF(fase_csc = 'Completado') AS completed_tasks,
  
  -- Velocidad
  AVG(CASE WHEN fase_csc = 'Completado' THEN cycle_time_days END) AS cycle_time_avg,
  APPROX_QUANTILES(CASE WHEN fase_csc = 'Completado' THEN cycle_time_days END, 2)[SAFE_OFFSET(1)] AS cycle_time_p50,
  APPROX_QUANTILES(CASE WHEN fase_csc = 'Completado' THEN cycle_time_days END, 10)[SAFE_OFFSET(9)] AS cycle_time_p90,
  SAFE_DIVIDE(
    STDDEV(CASE WHEN fase_csc = 'Completado' THEN cycle_time_days END),
    AVG(CASE WHEN fase_csc = 'Completado' THEN cycle_time_days END)
  ) * 100 AS cycle_time_variance,
  SAFE_DIVIDE(
    COUNTIF(fase_csc = 'Completado' AND cycle_time_days <= 14.2),
    COUNTIF(fase_csc = 'Completado')
  ) * 100 AS otd_pct,
  
  -- Eficiencia
  SAFE_DIVIDE(
    COUNTIF(fase_csc = 'Completado' 
      AND last_edited_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 28 DAY)),
    4.0
  ) AS throughput_weekly,
  
  -- Pipeline
  COUNTIF(fase_csc = 'Planning') AS pipeline_planning,
  COUNTIF(fase_csc = 'Briefing') AS pipeline_briefing,
  COUNTIF(fase_csc = 'Producción') AS pipeline_production,
  COUNTIF(fase_csc = 'Aprobación') AS pipeline_approval,
  COUNTIF(fase_csc = 'Asset Mgmt') AS pipeline_asset_mgmt,
  COUNTIF(fase_csc = 'Activación') AS pipeline_activation,
  COUNTIF(fase_csc = 'Completado') AS pipeline_completed,
  COUNTIF(hours_since_update > 48 AND fase_csc NOT IN ('Completado', 'Planning')) AS stuck_count_48h,
  COUNTIF(hours_since_update > 96 AND fase_csc NOT IN ('Completado', 'Planning')) AS stuck_count_96h,
  
  CURRENT_TIMESTAMP() AS _materialized_at

FROM `efeonce-group.ico_engine.v_tareas_by_project`
WHERE project_id IS NOT NULL
GROUP BY project_id, project_name

UNION ALL

-- Materializar métricas por proyecto, por mes (últimos 12 meses)
SELECT
  project_id,
  project_name,
  FORMAT_TIMESTAMP('%Y-%m', last_edited_time) AS period,
  'monthly' AS period_type,
  
  AVG(CASE WHEN rpa_calculated > 0 THEN rpa_calculated END) AS rpa_avg,
  APPROX_QUANTILES(CASE WHEN rpa_calculated > 0 THEN rpa_calculated END, 2)[SAFE_OFFSET(1)] AS rpa_median,
  SAFE_DIVIDE(
    COUNTIF(first_time_right = true AND fase_csc = 'Completado'),
    COUNTIF(fase_csc = 'Completado')
  ) * 100 AS ftr_pct,
  COUNT(*) AS total_tasks,
  COUNTIF(fase_csc = 'Completado') AS completed_tasks,
  AVG(CASE WHEN fase_csc = 'Completado' THEN cycle_time_days END) AS cycle_time_avg,
  APPROX_QUANTILES(CASE WHEN fase_csc = 'Completado' THEN cycle_time_days END, 2)[SAFE_OFFSET(1)] AS cycle_time_p50,
  APPROX_QUANTILES(CASE WHEN fase_csc = 'Completado' THEN cycle_time_days END, 10)[SAFE_OFFSET(9)] AS cycle_time_p90,
  SAFE_DIVIDE(
    STDDEV(CASE WHEN fase_csc = 'Completado' THEN cycle_time_days END),
    AVG(CASE WHEN fase_csc = 'Completado' THEN cycle_time_days END)
  ) * 100 AS cycle_time_variance,
  SAFE_DIVIDE(
    COUNTIF(fase_csc = 'Completado' AND cycle_time_days <= 14.2),
    COUNTIF(fase_csc = 'Completado')
  ) * 100 AS otd_pct,
  NULL AS throughput_weekly,          -- No aplica a período mensual
  NULL AS pipeline_planning,          -- Pipeline es snapshot, no histórico
  NULL AS pipeline_briefing,
  NULL AS pipeline_production,
  NULL AS pipeline_approval,
  NULL AS pipeline_asset_mgmt,
  NULL AS pipeline_activation,
  NULL AS pipeline_completed,
  NULL AS stuck_count_48h,
  NULL AS stuck_count_96h,
  
  CURRENT_TIMESTAMP() AS _materialized_at

FROM `efeonce-group.ico_engine.v_tareas_by_project`
WHERE project_id IS NOT NULL
  AND last_edited_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 365 DAY)
GROUP BY project_id, project_name, FORMAT_TIMESTAMP('%Y-%m', last_edited_time)
```

### 6.3 Query de materialización: stuck_assets_detail

```sql
-- Scheduled query: ico_engine.stuck_assets_detail
-- Schedule: diario 03:15 AM
-- Write disposition: WRITE_TRUNCATE

SELECT
  notion_page_id,
  titulo,
  project_id,
  project_name,
  fase_csc,
  hours_since_update,
  ROUND(hours_since_update / 24.0, 1) AS days_since_update,
  CASE 
    WHEN hours_since_update > 96 THEN 'danger'
    WHEN hours_since_update > 48 THEN 'warning'
  END AS severity,
  rpa_calculated,
  url_frame_io,
  client_review_open,
  CURRENT_TIMESTAMP() AS _materialized_at

FROM `efeonce-group.ico_engine.v_tareas_by_project`
WHERE hours_since_update > 48
  AND fase_csc NOT IN ('Completado', 'Planning')
ORDER BY hours_since_update DESC
```

### 6.4 Query de materialización: rpa_trend

```sql
-- Scheduled query: ico_engine.rpa_trend
-- Schedule: diario 03:15 AM
-- Write disposition: WRITE_TRUNCATE

SELECT
  project_id,
  project_name,
  completion_month AS month,
  AVG(rpa_calculated) AS rpa_avg,
  APPROX_QUANTILES(rpa_calculated, 2)[SAFE_OFFSET(1)] AS rpa_median,
  COUNT(*) AS tasks_completed,
  CURRENT_TIMESTAMP() AS _materialized_at

FROM `efeonce-group.ico_engine.v_tareas_by_project`
WHERE fase_csc = 'Completado'
  AND completion_month IS NOT NULL
  AND last_edited_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 365 DAY)
GROUP BY project_id, project_name, completion_month
ORDER BY project_id, month
```

---

## 7. Views de consumo

Cada consumidor del ICO Engine tiene su view dedicada que proyecta exactamente los datos que necesita, con el scope correcto.

### 7.1 View para módulos client-facing (capabilities)

```sql
-- Los módulos de UI llaman a esta view filtrada por project_ids del Space
CREATE OR REPLACE VIEW `efeonce-group.ico_engine.v_client_metrics` AS
SELECT
  project_id,
  project_name,
  period,
  period_type,
  rpa_avg,
  ftr_pct,
  cycle_time_avg,
  cycle_time_p50,
  cycle_time_variance,
  otd_pct,
  throughput_weekly,
  total_tasks,
  completed_tasks,
  pipeline_planning,
  pipeline_briefing,
  pipeline_production,
  pipeline_approval,
  pipeline_asset_mgmt,
  pipeline_activation,
  pipeline_completed,
  stuck_count_48h,
  stuck_count_96h,
  _materialized_at
FROM `efeonce-group.ico_engine.metrics_by_project`
-- El filtro por Space se aplica en el query builder del módulo:
-- WHERE project_id IN (SELECT project_id FROM space_projects WHERE space_id = @space_id)
```

### 7.2 View para Efeonce Ops (internal)

```sql
-- Efeonce Ops ve todas las métricas de todos los proyectos, sin filtro de Space
-- Incluye benchmarks cross-client para comparación
CREATE OR REPLACE VIEW `efeonce-group.ico_engine.v_ops_metrics` AS
SELECT
  m.*,
  -- Benchmarks cross-project (percentiles globales)
  p50.rpa_avg AS global_rpa_p50,
  p50.cycle_time_avg AS global_cycle_time_p50,
  p50.otd_pct AS global_otd_p50
FROM `efeonce-group.ico_engine.metrics_by_project` m
CROSS JOIN (
  SELECT
    APPROX_QUANTILES(rpa_avg, 2)[SAFE_OFFSET(1)] AS rpa_avg,
    APPROX_QUANTILES(cycle_time_avg, 2)[SAFE_OFFSET(1)] AS cycle_time_avg,
    APPROX_QUANTILES(otd_pct, 2)[SAFE_OFFSET(1)] AS otd_pct
  FROM `efeonce-group.ico_engine.metrics_by_project`
  WHERE period_type = 'all_time'
) p50
```

### 7.3 View para Data Node (export)

```sql
-- El Data Node exporta un subset limpio, sin datos internos
CREATE OR REPLACE VIEW `efeonce-group.ico_engine.v_export_metrics` AS
SELECT
  project_name,
  period,
  period_type,
  rpa_avg AS rounds_per_asset,
  ftr_pct AS first_time_right_pct,
  cycle_time_avg AS avg_cycle_time_days,
  otd_pct AS on_time_delivery_pct,
  throughput_weekly AS weekly_throughput,
  total_tasks,
  completed_tasks,
  _materialized_at AS data_as_of
FROM `efeonce-group.ico_engine.metrics_by_project`
```

---

## 8. API de consumo desde Greenhouse

### 8.1 Patrón de lectura

Los módulos de Greenhouse leen del ICO Engine vía BigQuery client en las API Routes. El patrón reemplaza al query builder monolítico del Creative Hub actual.

```typescript
// /src/lib/ico-engine/read-metrics.ts

import { BigQuery } from '@google-cloud/bigquery'

const bq = new BigQuery()

export interface ICOMetricsQuery {
  projectIds: string[]          // IDs de proyectos Notion del Space
  period?: string               // 'all_time' | 'YYYY-MM' | 'YYYY-QN'
  periodType?: string           // 'all_time' | 'monthly' | 'quarterly'
}

export async function getMetricsByProject(query: ICOMetricsQuery) {
  const [rows] = await bq.query({
    query: `
      SELECT * FROM \`efeonce-group.ico_engine.v_client_metrics\`
      WHERE project_id IN UNNEST(@projectIds)
        AND period_type = @periodType
      ORDER BY project_name, period
    `,
    params: {
      projectIds: query.projectIds,
      periodType: query.periodType || 'all_time'
    }
  })
  return rows
}

export async function getMetricsBySpace(spaceProjectIds: string[]) {
  // Agrega todas las métricas de los proyectos del Space
  const [rows] = await bq.query({
    query: `
      SELECT
        'space' AS scope,
        period,
        period_type,
        AVG(rpa_avg) AS rpa_avg,
        AVG(ftr_pct) AS ftr_pct,
        AVG(cycle_time_avg) AS cycle_time_avg,
        AVG(otd_pct) AS otd_pct,
        SUM(throughput_weekly) AS throughput_weekly,
        SUM(total_tasks) AS total_tasks,
        SUM(completed_tasks) AS completed_tasks,
        SUM(pipeline_planning) AS pipeline_planning,
        SUM(pipeline_briefing) AS pipeline_briefing,
        SUM(pipeline_production) AS pipeline_production,
        SUM(pipeline_approval) AS pipeline_approval,
        SUM(pipeline_asset_mgmt) AS pipeline_asset_mgmt,
        SUM(pipeline_activation) AS pipeline_activation,
        SUM(pipeline_completed) AS pipeline_completed,
        SUM(stuck_count_48h) AS stuck_count_48h,
        SUM(stuck_count_96h) AS stuck_count_96h,
        MAX(_materialized_at) AS _materialized_at
      FROM \`efeonce-group.ico_engine.v_client_metrics\`
      WHERE project_id IN UNNEST(@projectIds)
      GROUP BY period, period_type
    `,
    params: { projectIds: spaceProjectIds }
  })
  return rows
}

export async function getStuckAssets(projectIds: string[]) {
  const [rows] = await bq.query({
    query: `
      SELECT * FROM \`efeonce-group.ico_engine.stuck_assets_detail\`
      WHERE project_id IN UNNEST(@projectIds)
      ORDER BY hours_since_update DESC
    `,
    params: { projectIds }
  })
  return rows
}

export async function getRpaTrend(projectIds: string[]) {
  const [rows] = await bq.query({
    query: `
      SELECT
        month,
        AVG(rpa_avg) AS rpa_avg,
        SUM(tasks_completed) AS tasks_completed
      FROM \`efeonce-group.ico_engine.rpa_trend\`
      WHERE project_id IN UNNEST(@projectIds)
      GROUP BY month
      ORDER BY month
    `,
    params: { projectIds }
  })
  return rows
}
```

### 8.2 Cómo un módulo de capability consume

El query builder de un módulo (ej: Creative Production) ya no calcula métricas — solo lee del engine y estructura la respuesta para el frontend:

```typescript
// /src/lib/capability-queries/creative-production.ts

import { getMetricsBySpace, getStuckAssets, getRpaTrend } from '@/lib/ico-engine/read-metrics'

export async function creativeProductionQuery(
  spaceProjectIds: string[],
  activeServices: ActiveService[]     // Disponible cuando Services esté operativo
) {
  // Leer métricas pre-calculadas del ICO Engine
  const [spaceMetrics, stuckAssets, rpaTrend] = await Promise.all([
    getMetricsBySpace(spaceProjectIds),
    getStuckAssets(spaceProjectIds),
    getRpaTrend(spaceProjectIds)
  ])

  const allTime = spaceMetrics.find(m => m.period_type === 'all_time')

  // Estructurar para el frontend — sin calcular nada
  return {
    // Capa 1: Revenue Enabled (lógica de presentación, usa métricas del engine)
    earlyLaunch: allTime?.cycle_time_avg
      ? Math.max(0, Math.round((14.2 - allTime.cycle_time_avg) * 10) / 10)
      : null,
    iterationVelocity: allTime?.cycle_time_avg && allTime.cycle_time_avg > 0
      ? Math.round((14.2 / allTime.cycle_time_avg) * 10) / 10
      : null,
    throughput: allTime?.rpa_avg && allTime.rpa_avg > 0
      ? Math.round(((3.5 / allTime.rpa_avg) - 1) * 100)
      : null,

    // Capa 2: Brand Intelligence (métricas directas del engine)
    firstTimeRight: allTime?.ftr_pct,
    rpaTrend,
    brandConsistency: null,    // Coming soon
    knowledgeBase: null,       // Coming soon

    // Capa 3: CSC Pipeline (métricas directas del engine)
    cscPipeline: allTime ? {
      Planning: allTime.pipeline_planning,
      Briefing: allTime.pipeline_briefing,
      Producción: allTime.pipeline_production,
      Aprobación: allTime.pipeline_approval,
      'Asset Mgmt': allTime.pipeline_asset_mgmt,
      Activación: allTime.pipeline_activation,
      Completado: allTime.pipeline_completed,
    } : null,
    pipelineMetrics: {
      cycleTime: allTime?.cycle_time_avg,
      otd: allTime?.otd_pct,
      velocity: allTime?.throughput_weekly,
      stuckCount: allTime?.stuck_count_48h,
    },
    stuckAssets,

    // Metadata
    _materializedAt: allTime?._materialized_at,
  }
}
```

---

## 9. Prerequisitos de pipeline

Antes de que el ICO Engine pueda materializar métricas, los pipelines de data deben estar completos.

### 9.1 Acciones requeridas en `notion-bq-sync`

| Acción | Detalle | Esfuerzo |
|---|---|---|
| Configurar `NOTION_DB_PROYECTOS` | Valor: `15288d9b145940529acc75439bbd5470` en `.env.yaml` | 5 min |
| Configurar `NOTION_DB_SPRINTS` | Valor: `0c40f928047a4879ae702bfd0183520d` en `.env.yaml` | 5 min |
| Agregar `revisiones` al sync | Agregar a `SYNC_TABLES`: `"revisiones": DB_REVISIONES` con env var `NOTION_DB_REVISIONES: "f791ecc4f84c4cfc9d19fe0d42ec9a7f"` | 30 min |
| Re-deploy Cloud Function | `./deploy.sh` | 5 min |
| Ejecutar sync manual | `curl -X POST <URL>` para poblar las tablas | 5 min |
| Verificar data en BigQuery | Confirmar que las 4 tablas tienen datos y las columnas esperadas | 15 min |

### 9.2 Verificación post-sync

```sql
-- Verificar tareas
SELECT COUNT(*) AS total, COUNT(DISTINCT proyecto) AS projects
FROM `efeonce-group.notion_ops.tareas`;

-- Verificar columnas clave para ICO
SELECT
  COUNTIF(estado IS NOT NULL) AS has_estado,
  COUNTIF(frame_versions IS NOT NULL) AS has_frame_versions,
  COUNTIF(client_change_round IS NOT NULL) AS has_client_change_round,
  COUNTIF(client_review_open IS NOT NULL) AS has_client_review_open,
  COUNTIF(created_time IS NOT NULL) AS has_created_time,
  COUNTIF(last_edited_time IS NOT NULL) AS has_last_edited_time,
  COUNT(*) AS total
FROM `efeonce-group.notion_ops.tareas`;

-- Verificar proyectos
SELECT COUNT(*) FROM `efeonce-group.notion_ops.proyectos`;

-- Verificar sprints
SELECT COUNT(*) FROM `efeonce-group.notion_ops.sprints`;

-- Verificar revisiones
SELECT COUNT(*) FROM `efeonce-group.notion_ops.revisiones`;

-- Verificar estados existentes (para ajustar mapeo CSC)
SELECT estado, COUNT(*) AS count
FROM `efeonce-group.notion_ops.tareas`
GROUP BY estado ORDER BY count DESC;
```

---

## 10. Consideraciones técnicas

### 12.1 Costos de BigQuery

Las scheduled queries operan sobre data que ya está en BigQuery — no hay costos de ingesta adicionales. El costo es por bytes procesados en cada query.

Estimación: con ~5,000 tareas (escala actual), cada materialización procesa ~5-10 MB. A $5/TB, el costo diario es negligible (~$0.001/día).

### 12.2 Latencia

Las métricas se refrescan una vez al día (03:15 AM). Los módulos de UI muestran el timestamp de última materialización (`_materialized_at`) para que el cliente sepa la frescura de los datos. El patrón es consistente con el refresh diario de los syncs de Notion y HubSpot.

Si en el futuro se necesita refresh más frecuente (ej: durante horario laboral), se puede agregar un segundo scheduled query a las 12:00 PM sin cambiar nada en la arquitectura.

### 12.3 Multi-tenant enforcement

El ICO Engine materializa métricas por proyecto, no por Space. El filtro de tenant se aplica en la capa de consumo: el query builder del módulo filtra por `projectIds` que pertenecen al Space autenticado. Esto es el mismo patrón que usa el sistema actual — el engine no agrega surface de ataque.

### 12.4 Evolución hacia Services

Cuando `greenhouse_olap.services` tenga data (post implementación de Services Architecture):

1. Activar la view `v_tareas_by_service`
2. Agregar un scheduled query que materialice `metrics_by_service` (mismo SQL, agrupado por `service_id` en vez de `project_id`)
3. Los módulos de UI que necesiten métricas por servicio consumen de `metrics_by_service`
4. La view `v_tareas_by_project` sigue existiendo — ambas granularidades coexisten

No hay migración — es aditivo.

### 12.5 Intelligence Layer (Fase futura)

El ICO Engine está diseñado para incorporar métricas generadas por inteligencia artificial sin cambiar su arquitectura de consumo. Esta sección documenta el diseño de la extensión para que las bases queden listas desde la Fase 1.

#### 12.5.1 Concepto

Hoy todas las métricas del engine son **determinísticas**: SQL puro que promedia, cuenta, o calcula ratios sobre data estructurada. La Intelligence Layer agrega métricas **probabilísticas**: un AI Agent analiza contenido no-estructurado (briefs, assets visuales, guidelines de marca) y produce scores que se materializan en BigQuery como cualquier otra métrica.

Desde el punto de vista del consumidor (módulos de UI, Data Node, Ops), una métrica generada por IA es indistinguible de una métrica SQL. Se lee igual, se agrega igual, se exporta igual. Lo que cambia es el **pipeline de generación**, no la arquitectura de consumo.

#### 12.5.2 Métricas candidatas para IA

| Métrica | Qué hace el AI Agent | Input | Output | Prioridad |
|---|---|---|---|---|
| **Brief Clarity Score** | Evalúa completitud del brief contra criterios de calidad (audiencia, objetivo, deliverables, restricciones, tono, referencias) | Texto del brief en Notion (page content) | Score 0-100 + desglose por criterio | Alta — quality gate para producción |
| **Brand Consistency Score** | Valida que un asset final esté alineado a las brand guidelines documentadas | Asset visual (Frame.io thumbnail/URL) + brand guidelines (Notion wiki) | passed/failed + score 0-100 + observaciones | Alta — diferenciador Globe |
| **Brief-to-Output Alignment** | Compara el output final contra el brief original para medir fidelidad | Brief (Notion) + asset final (Frame.io) | Score 0-100 + delta analysis | Media |
| **Feedback Quality Score** | Evalúa la calidad del feedback del cliente (específico vs ambiguo) | Comentarios de Frame.io | Score 0-100 + clasificación | Baja — experimental |

#### 12.5.3 Tabla de scores: `ico_engine.ai_metric_scores`

Esta tabla se creó en la Fase 1 como carril auditado para métricas probabilísticas. `TASK-220` activa ya el primer reader runtime sobre `brief_clarity_score` cuando exista data, sin asumir todavía que todos los tenants tengan el AI writer operativo.

```sql
CREATE TABLE IF NOT EXISTS `efeonce-group.ico_engine.ai_metric_scores` (
  -- Identidad
  id STRING NOT NULL,                      -- UUID generado por el AI Agent
  task_id STRING NOT NULL,                 -- notion_page_id de la tarea evaluada
  metric_id STRING NOT NULL,               -- ID del Metric Registry: 'brief_clarity_score', 'brand_consistency_score'
  
  -- Resultado
  score FLOAT64,                           -- Valor numérico producido (0-100 para scores, boolean cast para passed/failed)
  passed BOOL,                             -- Para métricas binarias (brand validation)
  breakdown JSON,                          -- Desglose por criterio (JSON: { "audiencia": 85, "objetivo": 90, ... })
  reasoning STRING,                        -- Explicación del AI Agent (para auditoría y transparencia)
  
  -- Trazabilidad del modelo
  model STRING NOT NULL,                   -- Modelo usado: 'claude-sonnet-4-20250514', 'gemini-2.0-flash', etc.
  prompt_version STRING NOT NULL,          -- Versión del prompt (tag de Git: 'bcs-v1.0', 'brand-v1.2')
  prompt_hash STRING,                      -- SHA-256 del prompt efectivo (para reproducibilidad)
  confidence FLOAT64,                      -- Confianza del modelo si aplica (0-1)
  tokens_used INT64,                       -- Tokens consumidos (para tracking de costos)
  latency_ms INT64,                        -- Latencia de la llamada al modelo
  
  -- Contexto
  input_snapshot_url STRING,               -- URL o referencia al input que evaluó (para auditoría)
  space_id STRING,                         -- Space al que pertenece la tarea
  project_id STRING,                       -- Proyecto al que pertenece la tarea
  
  -- Metadata
  processed_at TIMESTAMP NOT NULL,         -- Cuándo se generó el score
  _synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(processed_at)
CLUSTER BY metric_id, task_id;
```

#### 12.5.4 Integración con readers y futura view base

Lectura vigente de `TASK-220`:

- `GET /api/projects/[id]/ico` lee el último `brief_clarity_score` por proyecto y lo combina con `Notion governance`
- `campaign-metrics.ts` toma el primer `brief efectivo` observado desde `ai_metric_scores.processed_at` para mejorar el start-side de `TTM`

Futuro deseado cuando la cobertura del AI layer sea estable:

la view `v_tareas_enriched` se extiende con un LEFT JOIN:

```sql
-- FUTURO: agregar a v_tareas_enriched cuando los AI Agents estén operativos
LEFT JOIN (
  SELECT task_id, score AS brief_clarity_score
  FROM `efeonce-group.ico_engine.ai_metric_scores`
  WHERE metric_id = 'brief_clarity_score'
  QUALIFY ROW_NUMBER() OVER (PARTITION BY task_id ORDER BY processed_at DESC) = 1
) bcs ON te.notion_page_id = bcs.task_id

LEFT JOIN (
  SELECT task_id, score AS brand_consistency_score, passed AS brand_validation_passed
  FROM `efeonce-group.ico_engine.ai_metric_scores`
  WHERE metric_id = 'brand_consistency_score'
  QUALIFY ROW_NUMBER() OVER (PARTITION BY task_id ORDER BY processed_at DESC) = 1
) brand ON te.notion_page_id = brand.task_id
```

La lógica toma el score **más reciente** por tarea y métrica (`QUALIFY ROW_NUMBER`), lo que permite re-evaluar un asset sin perder el historial.

#### 12.5.5 Pipeline de procesamiento (diseño, no implementación)

```
Trigger: nueva tarea entra a fase "Producción" (Brief Clarity Score)
         o tarea pasa a "Completado" (Brand Consistency Score)
  │
  ├── Opción A: Event-driven (webhook de Notion → Cloud Function)
  │     Cloud Function detecta cambio de estado
  │     Lee contenido del brief/asset via Notion API + Frame.io API
  │     Llama al AI Agent (Claude via Vertex AI)
  │     Escribe score a ico_engine.ai_metric_scores en BigQuery
  │
  └── Opción B: Batch (scheduled, post-sync)
        Scheduled query a las 03:20 AM identifica tareas sin score
        Cloud Function lee tareas pendientes, las procesa en batch
        Escribe scores a BigQuery
        Más simple, consistente con el patrón batch del engine
```

**Recomendación:** Opción B para el MVP de IA (batch, simple, predecible). Opción A cuando la latencia importe (ej: Brief Clarity Score como quality gate en tiempo real que bloquea el paso a producción).

#### 12.5.6 Gobernanza

Reglas que aplican a toda métrica generada por IA dentro del ICO Engine:

1. **Prompts versionados en Git.** Cada prompt tiene un tag (`bcs-v1.0`) y el `prompt_version` se registra en cada score. Si un prompt cambia, se pueden comparar resultados entre versiones.
2. **Nunca acción automática.** Los scores de IA informan, nunca bloquean ni ejecutan. Si Brief Clarity Score < 60, la UI muestra una alerta; no impide que la tarea entre a producción. Esta restricción se puede relajar por Space (opt-in) cuando la confianza en los scores sea alta.
3. **Auditable.** El campo `reasoning` almacena la explicación del modelo. El campo `input_snapshot_url` referencia el input exacto que se evaluó. Cualquier score se puede reconstruir.
4. **Sin cross-contamination.** Un AI Agent que evalúa briefs de un cliente no tiene acceso a data de otros clientes. El `space_id` en cada score refuerza el tenant boundary.
5. **Modelo configurable por métrica.** El Metric Registry puede definir qué modelo usar por métrica (Claude para análisis de texto, Gemini para análisis visual). No hay lock-in a un solo proveedor.

#### 12.5.7 Extensión al Metric Registry

Las métricas de IA ya están en el registry con `active: false, comingSoon: true` (§3.3). Cuando se implementen, solo cambian esos flags y se agrega el campo opcional `aiConfig`:

```typescript
// Extensión futura al ICOMetricDefinition (agregar como campo opcional)
export interface AIMetricConfig {
  agentId: string                    // ID del AI Agent que genera el score
  model: string                      // Modelo default: 'claude-sonnet-4-20250514'
  promptVersionTag: string           // Tag del prompt en Git
  triggerEvent: 'phase_change' | 'batch' | 'manual'
  triggerPhase?: string              // Si triggerEvent = 'phase_change', qué fase lo dispara
  maxTokens: number                  // Límite de tokens por evaluación
  costPerEvalUsd: number             // Costo estimado por evaluación (para tracking)
}

// Agregar a ICOMetricDefinition:
//   aiConfig?: AIMetricConfig        // Solo para métricas de categoría 'intelligence'

// Ejemplo de uso en el registry:
{
  id: 'brief_clarity_score',
  // ... (resto de la definición existente en §3.3) ...
  active: true,                      // Flip cuando esté listo
  comingSoon: false,
  aiConfig: {
    agentId: 'ico-brief-evaluator',
    model: 'claude-sonnet-4-20250514',
    promptVersionTag: 'bcs-v1.0',
    triggerEvent: 'batch',
    maxTokens: 2000,
    costPerEvalUsd: 0.003
  }
}
```

#### 12.5.8 Stack técnico alineado

La Intelligence Layer usa el mismo stack definido para Kortex (`Kortex_Arquitectura_Tecnica_v1_1.docx`):

| Componente | Tecnología | Rol |
|---|---|---|
| Framework de agentes | Google ADK | Orquestación de agentes |
| LLM primario | Claude via Vertex AI | Análisis de texto, evaluación de briefs |
| LLM visual (futuro) | Gemini via Vertex AI | Análisis de assets visuales |
| Ejecución | Cloud Functions (Python 3.12) | Serverless, misma infra que los syncs |
| Secrets | GCP Secret Manager | API keys, tokens (mismo patrón que Frame.io) |
| Versionado de prompts | Git (repo del engine o dedicado) | Trazabilidad |
| Output | BigQuery `ico_engine.ai_metric_scores` | Materialización al data lake |

#### 12.5.9 Qué se crea en Fase 1 (ahora) vs Fase AI (futuro)

| Artefacto | Fase 1 | Motivo |
|---|---|---|
| Tabla `ico_engine.ai_metric_scores` (DDL) | **Crear vacía** | La infraestructura existe lista para cuando los agents escriban |
| Tipo `AIMetricConfig` en TypeScript | **Crear como tipo exportado** | El registry ya lo importa aunque ninguna métrica lo use aún |
| Métricas `brief_clarity_score` y `brand_consistency_score` en el registry | **Ya creadas** con `active: false, comingSoon: true` | `BCS` ya tiene reader runtime; `brand_consistency_score` ahora también puede alimentar la lane runtime inicial de `Brand Voice para AI` cuando exista data auditada |
| LEFT JOINs en `v_tareas_enriched` | **No crear aún** | Se agregan cuando la tabla tenga data, para no degradar performance de la view con JOINs a tablas vacías |
| Cloud Functions de AI Agents | **No crear** | Se implementan cuando los prompts estén diseñados y validados |
| Prompts | **No crear** | Requieren diseño deliberado con datos reales de briefs/assets |

---

## 11. Estructura de archivos (actualizada)

```
/src
├── config/
│   ├── capability-registry.ts           # Existente — sin cambios
│   └── ico-metric-registry.ts           # NUEVO: definiciones de métricas ICO
├── lib/
│   ├── ico-engine/
│   │   ├── read-metrics.ts              # NUEVO: funciones de lectura del engine
│   │   ├── metric-types.ts              # NUEVO: tipos TypeScript (incluye AIMetricConfig)
│   │   └── benchmarks.ts                # NUEVO: constantes de benchmarks de industria
│   ├── capability-queries/
│   │   ├── creative-production.ts       # ACTUALIZAR: consumir del ICO Engine
│   │   └── ...
│   └── ...
├── sql/
│   └── ico-engine/
│       ├── 01-create-dataset.sql        # CREATE SCHEMA ico_engine
│       ├── 02-views-base.sql            # v_tareas_enriched, v_tareas_by_project
│       ├── 03-views-service.sql         # v_tareas_by_service (futuro — activar con Services)
│       ├── 04-tables-materialized.sql   # DDL de tablas materializadas
│       ├── 05-table-ai-scores.sql       # DDL de ai_metric_scores (crear vacía en Fase 1)
│       ├── 06-scheduled-metrics.sql     # Query de materialización
│       ├── 07-scheduled-stuck.sql       # Query de stuck assets
│       ├── 08-scheduled-rpa-trend.sql   # Query de RpA trend
│       └── 09-views-consumption.sql     # Views de consumo por módulo
└── ...
```

---

## 12. Roadmap de implementación

| Fase | Entregable | Dependencia | Estimado |
|---|---|---|---|
| **ICO-0** | Completar pipelines de sync (Proyectos, Sprints, Revisiones) | Acceso a `.env.yaml` y deploy | 1 hora |
| **ICO-0** | Verificar data en BigQuery, ajustar mapeo CSC | ICO-0 sync completo | 0.5 día |
| **ICO-1** | Crear dataset `ico_engine` en BigQuery | GCP access | 10 min |
| **ICO-1** | Crear views base (`v_tareas_enriched`, `v_tareas_by_project`) | ICO-0 verificación | 0.5 día |
| **ICO-1** | Crear tablas materializadas (DDL) + tabla `ai_metric_scores` vacía | ICO-1 views | 0.5 día |
| **ICO-2** | Metric Registry TypeScript (incluye tipo `AIMetricConfig`) | — | 0.5 día |
| **ICO-2** | Configurar scheduled queries en BigQuery | ICO-1 tablas | 0.5 día |
| **ICO-2** | Ejecutar materialización manual y verificar | ICO-2 scheduled queries | 0.5 día |
| **ICO-3** | Crear views de consumo (client, ops, export) | ICO-2 verificado | 0.5 día |
| **ICO-3** | API de lectura TypeScript (`/lib/ico-engine/read-metrics.ts`) | ICO-2 tablas con data | 1 día |
| **ICO-3** | Tests: verificar queries con data real | ICO-3 API | 0.5 día |
| — | — | — | — |
| **ICO-AI** *(futuro)* | Diseñar y validar prompts para Brief Clarity Score | Domain expertise + test data | 2-3 días |
| **ICO-AI** *(futuro)* | Cloud Function: AI Agent para BCS (batch) | Prompts validados + Vertex AI access | 2 días |
| **ICO-AI** *(futuro)* | Activar LEFT JOINs en `v_tareas_enriched` | `ai_metric_scores` con data | 0.5 día |
| **ICO-AI** *(futuro)* | Flip `active: true` en registry + integrar en módulos de UI | Agent operativo | 0.5 día |

**Total Fase 1 (determinístico): ~5.5 días**
**Total Fase AI (futuro, por métrica): ~5 días adicionales por métrica**

---

## Apéndice A: Correcciones post-validación arquitectónica (2026-03-16)

> Este apéndice documenta las correcciones necesarias identificadas al contrastar esta especificación
> contra la arquitectura real de Greenhouse, el modelo de datos en producción, y los patrones de código
> existentes en el repositorio.

### A.1 Scoping de Spaces: `space_id` directo, NO `notion_project_ids`

**Spec original:** Proponía JOIN de tareas a Spaces via `notion_project_ids TEXT[]` en tabla `clients`.

**Corrección:** El sync multi-tenant ya estampa `space_id` directamente en `notion_ops.tareas` y `notion_ops.proyectos`. Todas las queries de agency usan este patrón:
```sql
FROM notion_ops.tareas t WHERE t.space_id IN (SELECT space_id FROM ...)
```
El ICO Engine debe usar `space_id` directo, no el array `notion_project_ids`.

### A.2 DDL de BigQuery: Sin cláusulas `DEFAULT`

**Spec original:** Incluía `DEFAULT CURRENT_TIMESTAMP()` y `DEFAULT 'v1.0.0'`.

**Corrección:** BigQuery `CREATE TABLE` no soporta `DEFAULT`. Los valores por defecto se aplican en las sentencias INSERT o en el código de aplicación.

### A.3 Materialización: `WRITE_TRUNCATE` es configuración de job, no SQL

**Spec original:** Mezclaba `INSERT INTO ... SELECT` con `WRITE_TRUNCATE`.

**Corrección:** En BigQuery scheduled queries, `WRITE_TRUNCATE` es una configuración del job (`writeDisposition`), no una instrucción SQL. El SQL debe ser un `SELECT` puro; la tabla destino y `WRITE_TRUNCATE` se configuran en el job.

### A.4 Dataset `greenhouse_olap` no existe

**Spec original:** Referenciaba `greenhouse_olap.services`.

**Corrección:** Los módulos de servicio viven en `greenhouse.service_modules` y `greenhouse.client_service_modules` (BigQuery), y en `greenhouse_core.service_modules` (PostgreSQL).

### A.5 Capa conformada ya existe — no duplicar

**Spec original:** Proponía crear `v_tareas_enriched` desde `notion_ops.tareas` directamente.

**Corrección:** `greenhouse_conformed.delivery_tasks` (47 columnas, nombres en inglés) ya existe con `space_id`, `client_id`, `module_id` y campos normalizados. El ICO Engine debe construir sus views SOBRE la capa conformada, agregando solo los campos derivados (`fase_csc`, `cycle_time_days`, `is_stuck`, `delivery_signal`).

**Columnas clave de `greenhouse_conformed.delivery_tasks`:**
- `task_status` (no `estado`)
- `completed_at` (no `fecha_de_completado`)
- `due_date` (no `fecha_límite`)
- `rpa_value` (no `rpa`)
- `client_change_round_final` (mismo nombre)
- `blocker_count` (derivado de `bloqueado_por_ids`)
- `last_edited_time`, `synced_at`, `space_id`, `client_id`

### A.5.1 Período operativo canónico (Delta 2026-04-01)

- El período operativo de `ICO` ya no debe leerse como “mes de `completed_at`”.
- La pertenencia de una tarea al período se ancla en `due_date`, con fallback a `created_at` / `synced_at` cuando falte fecha límite.
- `carry-over` se define relativo al período consultado/materializado:
  - `period_anchor_date < first_day(period)`
  - tarea aún activa
- Este cambio endurece la paridad con los `Performance Reports` operativos sin reescribir el engine ni cambiar el upstream Notion.

### A.5.2 Buckets canónicos del scorecard (Delta 2026-04-01)

- `ICO` mantiene sus métricas troncales (`otd_pct`, `ftr_pct`, `rpa_avg`, `throughput_count`, etc.) sin redefinirlas.
- Encima de ese contrato, el engine ahora materializa buckets operativos aditivos para acercarse al `Performance Report`:
  - `on_time_count`
  - `late_drop_count`
  - `overdue_count`
  - `carry_over_count`
- Estos buckets se exponen como `context` en los snapshots (`SpaceMetricSnapshot`, `IcoMetricSnapshot`, métricas por proyecto y por miembro) para que consumers UI puedan mostrar scorecards más auditables sin recalcular inline.
- La regla es de compatibilidad: los buckets fortalecen `ICO`, pero no reemplazan ni renombran métricas existentes consumidas por payroll, serving o inteligencia de personas.

### A.5.3 FTR canónico compuesto (Delta 2026-04-01)

- `FTR` no debe leerse como alias de una sola propiedad (`client_change_round_final`).
- La definición canónica del engine queda compuesta por señales ya disponibles en `greenhouse_conformed.delivery_tasks`:
  - tarea completada
  - `rpa_value <= 1` cuando exista
  - si `rpa_value` falta, fallback a `client_change_round_final = 0` y `workflow_change_round = 0`
  - sin `client_review_open`
  - sin `workflow_review_open`
  - sin `open_frame_comments`
- Esta semántica busca aproximar mejor “asset aprobado a la primera” usando correcciones, `RpA` y estado real de revisión al cierre.
- `client_review_open` y `workflow_review_open` se usan como guardrails de cierre, no como reemplazo del núcleo de calidad.
- Regla semántica actual:
  - `on_time` y `late_drop` prefieren `performance_indicator_code` si el upstream ya lo trae normalizado; si no existe, el engine cae a derivación por `completed_at` vs `due_date`
  - `overdue` y `carry-over` no se leen desde labels de Notion; permanecen como reglas propias de `ICO` relativas al período consultado/materializado
  - `FTR` se define por `client_change_round_final = 0` en tareas completadas; `client_review_open` es estado de workflow y no fuente de verdad para esta métrica

### A.5.4 Inventario canónico de métricas y señales del ICO Engine (Delta 2026-04-03)

Para evitar drift entre arquitectura, registry y SQL runtime, este inventario consolida qué señales:

1. ya vienen calculadas o normalizadas desde la capa base
2. calcula el engine a nivel tarea
3. agrega/materializa el engine como métricas canónicas
4. expone como contexto operativo o scorecard auditable

#### A.5.4.0 Categorías funcionales de métricas ICO

Para diseño de readers, priorización de hardening y lectura de negocio, las métricas de `ICO` deben agruparse en estas categorías funcionales:

| Categoría | Qué cubre | Métricas / señales principales | Pregunta de negocio troncal |
|---|---|---|---|
| Calidad de entrega | retrabajo, correcciones y calidad del cierre | `rpa_avg`, `rpa_median`, `ftr_pct`, `rpa_value`, `client_change_round_final`, `workflow_change_round` | ¿Qué tan buena fue la entrega realmente cerrada? |
| Cumplimiento de promesa | cumplimiento del compromiso del período | `otd_pct`, `on_time_count`, `late_drop_count`, `overdue_count` | ¿Estamos cumpliendo la promesa operativa del período? |
| Flujo operativo | velocidad de producción y capacidad real de cierre | `throughput_count`, `pipeline_velocity`, `cycle_time_avg_days`, `cycle_time_p50_days`, `cycle_time_variance` | ¿Qué tan rápido y predecible convierte el equipo trabajo en output cerrado? |
| Carga abierta y deuda | trabajo abierto, compromiso futuro y arrastre histórico | `active_tasks`, `carry_over_count`, `overdue_carried_forward_count`, `total_tasks`, `completed_tasks` | ¿Cuánta carga sigue abierta y cuánta deuda vieja arrastramos? |
| Riesgo de ejecución | bloqueo o inmovilidad operativa | `stuck_asset_count`, `stuck_asset_pct`, `hours_since_update`, `is_stuck` | ¿Qué parte de la operación está detenida o en riesgo de atasco? |
| Distribución del pipeline | ubicación del trabajo dentro de la CSC | `csc_distribution`, `fase_csc` | ¿En qué fase del pipeline se está acumulando la carga? |
| Contexto de auditoría | señales explicativas que ayudan a entender el resultado del KPI | `performance_indicator_code`, `performance_indicator_label`, `delivery_signal`, `completion_label`, `delivery_compliance`, `days_late`, `is_rescheduled`, `period_anchor_date` | ¿Por qué esta tarea o este scorecard cayó en este bucket o resultado? |
| Confianza de dato | salud del insumo y capacidad real de confiar en la métrica | cobertura de `due_date`, `completed_at`, `rpa_value`, rounds/review fields, `% fase_csc = otros`, `completed_at` en estados no terminales | ¿Esta métrica hoy merece confianza operativa o necesita warning/fallback? |

Regla operativa:

- las tasks de hardening deben priorizar al menos estas 4 categorías:
  - `Calidad de entrega`
  - `Cumplimiento de promesa`
  - `Flujo operativo`
  - `Confianza de dato`
- los readers client-facing no deben mezclar categorías sin hacerlo explícito; por ejemplo, `OTD` no reemplaza por sí solo a la categoría `Carga abierta y deuda`

#### A.5.4.1 Señales base que ICO ya recibe calculadas o normalizadas

Estas señales viven en `greenhouse_conformed.delivery_tasks` y llegan al engine sin que `ICO` tenga que inventarlas:

| Señal | Tipo | Uso principal |
|---|---|---|
| `rpa_value` | score por tarea | base de `rpa_avg`, `rpa_median`, FTR compuesto |
| `client_change_round_final` | count | calidad / FTR |
| `workflow_change_round` | count | calidad / FTR |
| `open_frame_comments` | count | guardrail de revisión abierta |
| `client_review_open` | bool | guardrail de revisión cliente |
| `workflow_review_open` | bool | guardrail de revisión workflow |
| `blocker_count` | count | contexto operativo / blocked workload |
| `completion_label` | label | lectura humana del estado de entrega |
| `delivery_compliance` | label | semántica operacional upstream |
| `days_late` | duration | soporte de compliance / análisis de atraso |
| `is_rescheduled` | bool | contexto de promesa movida |
| `performance_indicator_code` | enum | preferencia upstream para `on_time`, `late_drop`, `carry_over`, `overdue_carried_forward` |
| `performance_indicator_label` | label | lectura humana del bucket |
| `task_status` | enum | estado canónico de tarea |
| `due_date` | date | ancla primaria del período |
| `original_due_date` | date | auditoría de reschedules |
| `completed_at` | timestamp | cierre real de tarea |
| `created_at` | timestamp | inicio / carry-over / cycle time |
| `last_edited_time` | timestamp | frescura / stuck detection |
| `synced_at` | timestamp | fallback temporal y auditoría |

#### A.5.4.2 Señales derivadas por el engine a nivel tarea

Estas señales se derivan en `ico_engine.v_tasks_enriched` antes de cualquier agregado:

| Señal derivada | Cómo se calcula | Para qué se usa |
|---|---|---|
| `period_anchor_date` | `COALESCE(due_date, DATE(created_at), DATE(synced_at))` | pertenencia temporal / fallback |
| `fase_csc` | mapping `task_status -> CSC` configurable por `space` con fallback default | distribución CSC y contexto de pipeline |
| `cycle_time_days` | días entre creación y completion/now | `cycle_time_*`, variabilidad |
| `hours_since_update` | horas desde `last_edited_time` | stuck detection / health |
| `is_stuck` | 72h+ sin movimiento en estado activo | `stuck_asset_count`, `stuck_asset_pct` |
| `delivery_signal` | `on_time`, `late`, `unknown` según `completed_at` vs `due_date` | contexto operacional auxiliar |
| `has_co_assignees` | cardinalidad de `assignee_member_ids` | contexto de ownership / colaboración |

#### A.5.4.3 Métricas agregadas canónicas calculadas por `buildMetricSelectSQL()`

Estas son las métricas que el engine calcula/materializa como contrato troncal reusable:

| Métrica | En qué consiste el cálculo | Qué pregunta responde | Columnas expuestas |
|---|---|---|---|
| `RpA` | promedio y mediana de `rpa_value > 0` en tareas completadas terminales del período, con evidencia de coverage | ¿Cuántas rondas de revisión estamos necesitando por activo realmente terminado? | `rpa_avg`, `rpa_median`, `rpa_eligible_task_count`, `rpa_missing_task_count`, `rpa_non_positive_task_count` |
| `OTD` | `on_time / (on_time + late_drop + overdue)`; excluye `carry_over` y `overdue_carried_forward` del denominador | ¿Qué porcentaje de la promesa del período se entregó a tiempo? | `otd_pct` |
| `FTR` | porcentaje de tareas completadas terminales con `client_change_round_final = 0` | ¿Qué proporción de activos salió bien a la primera, sin cambios finales del cliente? | `ftr_pct` |
| `Cycle Time` | promedio, P50 y desviación de `cycle_time_days` en tareas completadas terminales | ¿Cuánto tarda realmente el flujo de producción en cerrar un activo y cuán predecible es ese tiempo? | `cycle_time_avg_days`, `cycle_time_p50_days`, `cycle_time_variance` |
| `Throughput` | conteo absoluto de tareas clasificadas como `on_time` o `late_drop` | ¿Cuántos activos logró cerrar el equipo en el período? | `throughput_count` |
| `Pipeline Velocity` | `throughput / active_tasks` | ¿Con qué velocidad el equipo convierte trabajo activo en trabajo efectivamente cerrado? | `pipeline_velocity` |
| `Stuck Assets` | conteo absoluto y porcentaje de `is_stuck = TRUE` sobre tareas activas | ¿Cuánta carga operativa está detenida o sin movimiento anormalmente largo? | `stuck_asset_count`, `stuck_asset_pct` |

Contratos de lectura para `RpA`:

| Estado | Lectura operativa | Uso downstream |
|---|---|---|
| `valid` | hay evidencia suficiente y el valor agregado es confiable | mostrar / consumir normalmente |
| `low_confidence` | hay valor, pero la cobertura del insumo es parcial o degradada | mostrar con cautela y sin reinterpretación local |
| `suppressed` | el período completado no tiene evidencia útil suficiente para un agregado sano | no tratar `0` como señal positiva |
| `unavailable` | no existe universo completado suficiente para calcular `RpA` | propagar ausencia, no inferir score |

Evidencia mínima esperada para el contrato:

- `rpa_eligible_task_count`
- `rpa_missing_task_count`
- `rpa_non_positive_task_count`

Regla operativa:

- `null` representa ausencia, supresión o imposibilidad de cálculo
- `0` no debe colapsarse automáticamente a `valid`
- cualquier fallback visible debe ser explícito, documentado y auditable en el engine o en un read model derivado

Regla vigente de completitud:

- una tarea solo cuenta como completada para `RpA`, `FTR`, `cycle time`, `throughput`, `on_time` y `late_drop` si:
  - `completed_at IS NOT NULL`
  - `task_status IN ('Listo','Done','Finalizado','Completado','Aprobado')`

#### A.5.4.4 Buckets y contexto operativo aditivo

Además de los KPIs troncales, el engine materializa buckets auditables para scorecards y readers:

| Bucket / contexto | En qué consiste el cálculo | Qué pregunta responde |
|---|---|---|
| `total_tasks` | total de tareas clasificadas por el filtro canónico del período | ¿Cuál es el universo total de trabajo que este scorecard está leyendo? |
| `completed_tasks` | `on_time + late_drop` | ¿Cuánto trabajo del período ya se cerró efectivamente? |
| `active_tasks` | `overdue + carry_over + overdue_carried_forward` | ¿Cuánto trabajo sigue abierto o pendiente dentro del scope del período? |
| `on_time_count` | tareas completadas terminales a tiempo | ¿Cuántos entregables cumplieron la promesa del período? |
| `late_drop_count` | tareas completadas terminales fuera de plazo | ¿Cuántos entregables sí cerraron, pero tarde? |
| `overdue_count` | tareas del período ya vencidas y aún abiertas | ¿Cuánta promesa del período ya está incumplida hoy? |
| `carry_over_count` | tareas creadas en el período con `due_date` posterior al cierre del período | ¿Cuánta carga nueva ya quedó comprometida hacia adelante? |
| `overdue_carried_forward_count` | tareas vencidas de períodos previos que siguen abiertas | ¿Cuánta deuda vieja está contaminando la operación actual? |

#### A.5.4.5 Métricas registradas en el catálogo del engine

El `metric-registry.ts` expone hoy estas métricas como catálogo activo del producto:

| ID / code | Label | Qué pregunta responde |
|---|---|---|
| `rpa` | Rendimiento por Activo | ¿Qué tan costosa en revisiones está siendo la producción cerrada? |
| `otd_pct` | Entrega a tiempo | ¿Estamos cumpliendo la promesa operativa del período? |
| `ftr_pct` | Primera entrega correcta | ¿Qué tanto sale bien a la primera sin retrabajo del cliente? |
| `cycle_time` | Tiempo de ciclo | ¿Cuánto tarda un activo en recorrer el flujo completo? |
| `cycle_time_variance` | Varianza del ciclo | ¿Qué tan predecible o caótico es ese tiempo de ciclo? |
| `throughput` | Throughput | ¿Cuánto output real produjo el equipo en el período? |
| `pipeline_velocity` | Velocidad del pipeline | ¿Qué tan rápido convierte backlog activo en output cerrado? |
| `csc_distribution` | Distribución CSC | ¿En qué fase de la cadena creativa se está acumulando la carga? |
| `stuck_assets` | Activos estancados | ¿Cuántos activos llevan demasiado tiempo sin movimiento? |
| `stuck_asset_pct` | Porcentaje estancado | ¿Qué proporción de la carga activa está estancada? |
| `overdue_carried_forward` | Overdue Carried Forward | ¿Cuánta deuda vencida heredada seguimos cargando al período actual? |

#### A.5.4.6 Métricas y rollups adicionales de reportes materializados

Estas no reemplazan el contrato troncal del engine, pero sí forman parte del serving/reporting construido sobre él:

| Rollup | Dónde vive | En qué consiste el cálculo | Qué pregunta responde |
|---|---|---|---|
| `on_time_pct` | `ico_engine.performance_report_monthly` | porcentaje agregado de cumplimiento agency-level | ¿Cuál es el cumplimiento global del portfolio en el período? |
| `efeonce_tasks_count` | `ico_engine.performance_report_monthly` | conteo del mix perteneciente a Efeonce | ¿Qué peso tiene Efeonce dentro del portfolio medido? |
| `sky_tasks_count` | `ico_engine.performance_report_monthly` | conteo del mix perteneciente a Sky | ¿Qué peso tiene Sky dentro del portfolio medido? |
| `task_mix_json` | `ico_engine.performance_report_monthly` | breakdown materializado del mix operativo | ¿Cómo se compone el volumen del período por segmento o fuente? |
| `top_performer_otd_pct` | `ico_engine.performance_report_monthly` | OTD del top performer del período | ¿Quién lideró el cumplimiento de promesa? |
| `top_performer_throughput_count` | `ico_engine.performance_report_monthly` | throughput del top performer | ¿Quién cerró mayor volumen real? |
| `top_performer_rpa_avg` | `ico_engine.performance_report_monthly` | RpA del top performer | ¿Quién sostuvo mejor calidad/retrabajo dentro del top de ejecución? |
| `top_performer_ftr_pct` | `ico_engine.performance_report_monthly` | FTR del top performer | ¿Quién logró mayor calidad a la primera entre los performers elegibles? |

#### A.5.4.7 Fuente de verdad operativa

Cuando exista tensión entre documentos:

1. la semántica contractual vive en este documento
2. el catálogo expuesto vive en `src/lib/ico-engine/metric-registry.ts`
3. la fórmula efectiva runtime vive en `src/lib/ico-engine/shared.ts`
4. los campos base y derivados por tarea viven en `src/lib/ico-engine/schema.ts`

La arquitectura y el código deben mantenerse alineados; si una fórmula cambia en `shared.ts`, este inventario debe actualizarse en el mismo lote.

### A.5.5 Benchmarks externos y estándar recomendado para Greenhouse (Delta 2026-04-03)

No todas las métricas de `ICO` tienen un estándar externo maduro.

- algunas sí tienen benchmarks cross-industry relativamente estables (`OTD`, `FTR` / `First-Time-Right` vía `FPY` o `first-time error-free`)
- otras tienen solo referencias parciales en creative operations (`RpA`, approval rounds, approval cycle time)
- otras son esencialmente internas y deben tratarse como métricas de gobierno operativo, no como KPIs “de mercado” (`pipeline_velocity`, `carry_over`, `overdue_carried_forward`, `stuck_assets`)

La regla para Greenhouse debe ser:

1. adoptar estándares externos cuando exista una definición madura y comparable
2. declarar explícitamente cuándo un benchmark es solo un análogo
3. no presentar como “estándar de industria” lo que en realidad es una policy interna del engine

#### A.5.5.1 First Time Right (FTR)

**Análogo externo más cercano**

- `First Pass Yield (FPY)` / `Right First Time`
- `first-time error-free`

**Qué dicen las referencias externas**

- `APQC` define una actividad `first-time error-free` como una actividad finalizada sin ningún esfuerzo posterior para ajustes o correcciones.
- `APQC` expone además una mediana de `90%` para `% of annual sales orders processed first time error free`.
- `IndustryWeek` reporta para manufactura:
  - mediana de `95.5%` en `current first-pass yield`
  - `97.0%` en `world-class manufacturers`
  - `99.0%` en `top performers`

**Interpretación para Greenhouse**

`FTR` en Greenhouse no es idéntico a `FPY` industrial:

- el output creativo es más subjetivo
- hay más variación por stakeholder
- el retrabajo puede ser estratégicamente legítimo, no solo defecto

Por eso los benchmarks manufactureros sirven como **techo aspiracional**, no como target literal.

**Estándar recomendado Greenhouse**

| Banda | FTR recomendado | Lectura |
|---|---|---|
| `world-class` | `>= 85%` | operación creativa excepcionalmente clara y bien alineada |
| `strong` | `70% - 84.9%` | buen estándar de trabajo para creative ops maduras |
| `attention` | `60% - 69.9%` | exceso de retrabajo o definición débil |
| `critical` | `< 60%` | retrabajo estructuralmente alto |

**Decisión**

- la banda actual del engine (`80/60`) es exigente pero razonable para Greenhouse
- no conviene subirla a `95%+` porque eso importaría un estándar industrial que no refleja bien trabajo creativo iterativo

#### A.5.5.2 RpA (Rounds per Asset)

**Estándar externo**

- no existe un estándar cross-industry maduro y universal equivalente a `SCOR` o `APQC`

**Mejor referencia disponible**

- benchmarks de creative review / approval workflows
- `visualloop` analizó `523` proyectos en `47` equipos
- para `marketing campaigns`, reporta:
  - `top quartile`: `1-2` rounds
  - `median`: `3` rounds
  - `bottom quartile`: `5+` rounds
- el mismo estudio muestra que agencias promedian `25%` más rounds que equipos in-house comparables

**Interpretación para Greenhouse**

`RpA` en Greenhouse es un proxy de retrabajo por activo terminado.

- es cercano al problema de “revision rounds”
- pero no es idéntico a todos los estudios externos, porque depende de cómo se modelen `client_change_round_final`, `workflow_change_round` y `rpa_value`

**Estándar recomendado Greenhouse**

| Banda | RpA recomendado | Lectura |
|---|---|---|
| `world-class` | `<= 2.0` | retrabajo bajo, dirección clara |
| `strong` | `> 2.0 y <= 3.0` | nivel aceptable / cercano al benchmark creativo medio |
| `attention` | `> 3.0 y <= 4.0` | demasiadas idas y vueltas |
| `critical` | `> 4.0` | proceso roto o brief/approval governance débil |

**Decisión**

- el threshold actual del engine (`<=1.5` óptimo, `<=2.5` atención, `>2.5` crítico) es más estricto que el benchmark externo disponible
- si Greenhouse quiere una postura premium, esa severidad es defendible
- si quiere alinearse más al benchmark creativo observado, la frontera roja debería moverse más cerca de `> 3.0`

#### A.5.5.3 On-Time Delivery (OTD)

**Estándar externo más cercano**

- `SCOR`: `Delivery Performance to Customer Commit Date`
- `% orders delivered on the customer’s originally committed date`

**Qué dicen las referencias externas**

- `SCOR` define `on-time` contra la fecha compromiso acordada con el cliente
- `IndustryWeek` reporta para manufactura una mediana de `96%` de on-time delivery
- `IndustryWeek` usa `98%+` on-time delivery como umbral de top performers
- `APQC` reporta `88%` de mediana para `Perfect Order Performance`, que es una métrica más dura que incluye on-time + completeness + damage-free + accurate documentation

**Interpretación para Greenhouse**

`OTD` sí tiene una familia de benchmarks mucho más madura que `RpA`.

Pero Greenhouse debe recordar que:

- el `OTD` actual no es `perfect order`
- no incluye documentación, condition ni completeness tipo supply-chain
- además hoy excluye `carry_over` y `overdue_carried_forward` del denominador

**Estándar recomendado Greenhouse**

| Banda | OTD recomendado | Lectura |
|---|---|---|
| `world-class` | `>= 98%` | cumplimiento excepcional |
| `strong` | `95% - 97.9%` | buen estándar enterprise |
| `attention` | `90% - 94.9%` | promesa bajo presión |
| `critical` | `< 90%` | incumplimiento material |

**Decisión**

- la banda actual del engine (`>= 90%` como óptimo) es laxa frente a referencias de delivery maduras
- cuando la confianza del insumo esté saneada, Greenhouse debería endurecer sus thresholds de `OTD`

#### A.5.5.4 Cycle Time

**Estándar externo**

- no existe un benchmark universal útil sin segmentar por tipo de asset/proyecto

**Referencia parcial disponible**

- `visualloop` reporta `time to approval` por tipo de trabajo:
  - `marketing campaign`: mediana `8 días`, top quartile `4 días`
  - `landing page`: mediana `10 días`, top quartile `5 días`
  - `product UI feature`: mediana `2 semanas`, top quartile `1 semana`

**Interpretación para Greenhouse**

`Cycle Time` debe benchmarkearse:

- por asset type
- por service line
- por complejidad

No conviene publicar un único estándar universal del portal.

**Estándar recomendado Greenhouse**

- mantenerlo como benchmark interno segmentado por `service` / `asset family`
- usar percentiles internos y deltas históricos, no un solo número global

#### A.5.5.5 Throughput y Pipeline Velocity

**Estándar externo**

- no existe un benchmark externo fuerte y portable sin normalizar por:
  - team size
  - asset complexity
  - mix de servicios
  - ventana temporal

**Estándar recomendado Greenhouse**

- tratarlos como métricas internas de capacidad/flujo
- compararlos por:
  - `space`
  - `service`
  - `squad`
  - trailing 3-month baseline

No deben documentarse como “estándar de industria”.

#### A.5.5.6 Stuck Assets, Carry-Over y Overdue Carried Forward

**Estándar externo**

- no existe benchmark cross-industry robusto y portable para estas métricas tal como Greenhouse las define

**Estándar recomendado Greenhouse**

- tratarlas como métricas internas de control operacional
- el estándar debe ser policy-driven:
  - `Stuck Assets`: ideal cercano a `0`; tolerancia depende de volumen y fase
  - `Carry-Over`: no es necesariamente malo; debe interpretarse junto con capacidad y planning
  - `Overdue Carried Forward`: sí debe tender a `0` y usarse como deuda estructural

#### A.5.5.7 Síntesis ejecutiva

| Métrica | ¿Existe estándar externo maduro? | Tipo de estándar recomendado |
|---|---|---|
| `FTR` | `Sí, por análogo (FPY / first-time error-free)` | externo adaptado a creative ops |
| `RpA` | `No universal; sí benchmark parcial creativo` | benchmark creativo adaptado + policy interna |
| `OTD` | `Sí` | benchmark externo fuerte |
| `Cycle Time` | `Parcial` | benchmark segmentado por asset/service |
| `Throughput` | `No portable` | estándar interno relativo |
| `Pipeline Velocity` | `No portable` | estándar interno relativo |
| `Stuck Assets` | `No` | estándar interno de control |
| `Carry-Over` | `No` | estándar interno de planning |
| `Overdue Carried Forward` | `No` | estándar interno de deuda operacional |

#### A.5.5.8 Fuentes externas usadas

- SCOR Supply Chain Council / APICS — `Perfect Order Fulfillment` y `Delivery Performance to Customer Commit Date`  
  https://economia.uniroma2.it/public/ba/files/SCOR11PDF_%281%29.pdf
- APQC — `Percentage of annual sales orders processed first time error free`  
  https://www.apqc.org/what-we-do/benchmarking/open-standards-benchmarking/measures/percentage-annual-sales-orders
- APQC — `Perfect order performance`  
  https://www.apqc.org/resources/benchmarking/open-standards-benchmarking/measures/perfect-order-performance
- APQC Open Standards Benchmarking Glossary — definiciones de `Finished First-Pass Quality Yield` y `first-time error-free`  
  https://www.apqc.org/sites/default/files/files/Glossary_5-13.pdf
- IndustryWeek 2023 Statistical Profile — benchmarks de `first-pass yield` y `on-time delivery`  
  https://img.industryweek.com/files/base/ebm/industryweek/document/2023/12/6581e0cffdf988001e28684c-2023statprofilefinal.pdf
- IndustryWeek Quality Tables — world-class / top performer thresholds para `first-pass yield` y delivery  
  https://www.industryweek.com/leadership/companies-executives/article/21956429/quality-tables
- visualloop — creative feedback benchmarks (`47` teams, `523` projects)  
  https://visualloop.io/blog/design-feedback-benchmarks/

### A.6 TypeScript: Sin `any`

**Spec original:** Usaba `formulaConfig: Record<string, any>`.

**Corrección:** Implementado con tipo `FormulaConfig` con unión discriminada (`kind: MetricKind`).

### A.7 Throughput vs Pipeline Velocity — diferenciados

**Spec original:** Ambas métricas usaban SQL idéntico.

**Corrección:**
- **Throughput** = `COUNT(completed_at IS NOT NULL)` — conteo absoluto
- **Pipeline velocity** = `throughput / active_tasks` — ratio de flujo

### A.8 Métricas AI (brief_clarity_score, brand_consistency_score)

**Spec original:** Incluidas en MVP con SQL determinístico.

**Corrección:** Requieren NLP y análisis de imagen respectivamente. Diferidas a Phase 4 (Intelligence Layer). No hay infraestructura de IA para procesamiento batch aún.

### A.9 Implementación Phase 1 completada

Los siguientes archivos fueron creados como implementación de la Phase 1:

```
src/lib/ico-engine/
├── shared.ts              # IcoEngineError, runIcoEngineQuery, coercion utils
├── metric-registry.ts     # 10 MetricDefinition[], FormulaConfig, CSC mapping
├── schema.ts              # ensureIcoEngineInfrastructure() — dataset + view + table
└── read-metrics.ts        # readSpaceMetrics(), computeSpaceMetricsLive()

src/app/api/ico-engine/
├── registry/route.ts      # GET /api/ico-engine/registry
├── metrics/route.ts       # GET /api/ico-engine/metrics?spaceId=X&year=Y&month=M
└── metrics/agency/route.ts # GET /api/ico-engine/metrics/agency?year=Y&month=M
```

### A.10 Implementación completa — Phases 2-5 (2026-03-17)

Todas las fases determinísticas del ICO Engine están implementadas. Commit `d2483fd` en `develop`.

#### Estado por sección del spec

| Sección | Estado | Notas |
|---------|--------|-------|
| §1 Resumen ejecutivo | ✅ Implementado | — |
| §2 Fuentes de datos | ✅ Implementado | Usa `greenhouse_conformed.delivery_tasks` (ver A.5) |
| §3 Metric Registry | ✅ Implementado | 10 métricas determinísticas + `AIMetricConfig` type |
| §4 Capa conformed | ✅ Implementado | `v_tasks_enriched` sobre `delivery_tasks` |
| §5.1 `metric_snapshots_monthly` | ✅ Implementado | MERGE mensual + cron diario 06:15 UTC |
| §5.2 `metrics_by_project` | ✅ Implementado | DELETE+INSERT por período, ORDER BY throughput |
| §5.3 `rpa_trend` | ✅ Implementado | DELETE+INSERT últimos 12 meses, AVG + APPROX_QUANTILES |
| §5.4 `stuck_assets_detail` | ✅ Implementado | DELETE+INSERT, severity warning (72h) / danger (96h) |
| §5.5 `ai_metric_scores` | ✅ DDL creado | Tabla vacía — se llena cuando AI layer esté activo |
| §6 Scheduled queries | ✅ Implementado | Vercel cron `/api/cron/ico-materialize` diario |
| §7 Views de consumo | ✅ Implementado | `v_metric_latest` |
| §8 API de consumo | ✅ Implementado | 6 endpoints (ver tabla abajo) |
| §9 Prerequisitos pipeline | ✅ Resuelto | `delivery_tasks` provee la data necesaria |
| §10 Consideraciones técnicas | ✅ Implementado | Auth guards, pagination, error handling |
| §11 Estructura de archivos | ✅ Implementado | Ver estructura actualizada abajo |
| §12 Roadmap ICO-0 a ICO-3 | ✅ Completado | Todo lo determinístico implementado |
| §12 Roadmap ICO-AI | ⏳ Futuro | Requiere Vertex AI + prompt engineering |

#### Archivos implementados (estructura final)

```
src/lib/ico-engine/
├── shared.ts              # IcoEngineError, runIcoEngineQuery, coercion utils
├── metric-registry.ts     # 10 MetricDefinition[], FormulaConfig, CSC mapping, AIMetricConfig
├── schema.ts              # ensureIcoEngineInfrastructure() — 6 tables + dataset + view
├── read-metrics.ts        # readSpaceMetrics, readLatestSpaceMetrics, readAgencyMetrics,
│                          # computeSpaceMetricsLive, readProjectMetrics,
│                          # readLatestMetricsSummary, readMetricsSummaryByClientId
└── materialize.ts         # materializeMonthlySnapshots (space + stuck + rpa_trend + project)

src/app/api/ico-engine/
├── registry/route.ts          # GET /api/ico-engine/registry
├── metrics/route.ts           # GET /api/ico-engine/metrics?spaceId&year&month
├── metrics/agency/route.ts    # GET /api/ico-engine/metrics/agency?year&month&live
├── metrics/project/route.ts   # GET /api/ico-engine/metrics/project?spaceId&year&month
├── stuck-assets/route.ts      # GET /api/ico-engine/stuck-assets?spaceId
└── trends/rpa/route.ts        # GET /api/ico-engine/trends/rpa?spaceId&months

src/app/api/cron/
└── ico-materialize/route.ts   # GET (cron) — materialización diaria

src/components/agency/
├── IcoGlobalKpis.tsx          # KPI cards (RPA, OTD, FTR, throughput, velocity, stuck)
├── IcoCharts.tsx              # CSC distribution bar + velocity gauge + RPA trend line
├── SpaceIcoScorecard.tsx      # Sortable table with per-space metrics
└── StuckAssetsDrawer.tsx      # Right drawer with stuck asset details

src/views/agency/
└── AgencyIcoEngineView.tsx    # ICO Engine tab orchestrator (data + trend fetch)

src/lib/capability-queries/
├── creative-hub.ts            # MODIFIED: fetches ICO summary in parallel
└── helpers.ts                 # MODIFIED: buildCreativeRevenueCardData + buildCreativeBrandMetricsCardData
                               # accept optional icoSummary for RPA/FTR/OTD override
```

#### Lo que queda fuera (explícitamente diferido)

| Item | Razón | Dependencia |
|------|-------|-------------|
| `metrics_by_service` | Blocked hasta que Services Architecture esté operativa | `greenhouse_core.services` + mapping |
| AI Cloud Functions / prompts | Futuro — requiere Vertex AI batch processing | Prompt engineering + test data |
| LEFT JOINs a `ai_metric_scores` | Tabla vacía, no activar hasta que AI layer escriba scores | AI layer operativo |
| `brief_clarity_score`, `brand_consistency_score` | Métricas AI, no determinísticas | AI layer |

---

## Apéndice B: Context-Agnostic Metrics Service (2026-03-18)

> Este apéndice documenta la evolución del ICO Engine de un sistema space-only a un servicio de métricas
> agnóstico al contexto, capaz de responder consultas para cualquier dimensión del modelo de datos.

### B.1 Principio rector

**"ICO siempre debe poderse consultar por cualquier otro objeto y entregar métricas consistentes basadas en el contexto que se le solicite."**

Antes de esta refactorización, las fórmulas de métricas estaban duplicadas en 3 ubicaciones (`materializeMonthlySnapshots`, `materializeProjectMetrics`, `computeSpaceMetricsLive`), cada una hardcoded a una dimensión específica. Agregar cualquier consumidor nuevo requería copiar el SQL.

### B.2 Shared SQL Metric Builder

Todas las fórmulas de métricas ICO se definen **una sola vez** en `buildMetricSelectSQL()` (`src/lib/ico-engine/shared.ts`). Esta función genera el fragmento SQL canónico para las 14 columnas de métricas:

```
rpa_avg, rpa_median, otd_pct, ftr_pct,
cycle_time_avg_days, cycle_time_p50_days, cycle_time_variance,
throughput_count, pipeline_velocity,
stuck_asset_count, stuck_asset_pct,
total_tasks, completed_tasks, active_tasks
```

`buildPeriodFilterSQL()` genera el WHERE canónico para filtrar por período + activos.

Consumidores: `materializeMonthlySnapshots`, `materializeProjectMetrics`, `materializeMemberMetrics`, `computeSpaceMetricsLive`, `computeMetricsByContext`.

### B.3 ICO_DIMENSIONS — Allowlist de dimensiones

```typescript
export const ICO_DIMENSIONS = {
  space:   { column: 'space_id' },
  project: { column: 'project_source_id' },
  member:  { column: 'assignee_member_id' },
  client:  { column: 'client_id' },
  sprint:  { column: 'sprint_source_id' },
} as const
```

El allowlist previene SQL injection mientras habilita consultas parametrizadas. La columna se inyecta via interpolación de string (segura — proviene del allowlist); el valor se pasa como parámetro de BigQuery.

### B.4 computeMetricsByContext()

Función genérica de cómputo en vivo para CUALQUIER dimensión:

```typescript
export const computeMetricsByContext = async (
  dimensionKey: IcoDimensionKey,  // 'space' | 'project' | 'member' | 'client' | 'sprint'
  dimensionValue: string,
  periodYear: number,
  periodMonth: number
): Promise<IcoMetricSnapshot | null>
```

Para la dimensión `member`, usa `UNNEST(assignee_member_ids)` para acreditar todas las asignaciones (sin doble conteo para otras dimensiones).

### B.5 Multi-Assignee Enrichment

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `assignee_member_id` | `STRING` | Primer responsable de Notion resuelto a member ID (backward compat) |
| `assignee_member_ids` | `ARRAY<STRING>` | Todos los responsables de Notion resueltos a member IDs |

`v_tasks_enriched` expone `assignee_member_ids` con fallback: `COALESCE(dt.assignee_member_ids, IF(dt.assignee_member_id IS NOT NULL, [dt.assignee_member_id], []))`.

### B.6 Tablas materializadas nuevas

| Tabla | Clave | Fuente |
|-------|-------|--------|
| `metrics_by_member` | `member_id + period_year + period_month` | `UNNEST(assignee_member_ids)` de `v_tasks_enriched` |

Mismas columnas que `metrics_by_project` pero agrupadas por `member_id`. Se materializa en el cron diario junto con las demás tablas.

### B.7 API de contexto genérico

```
GET /api/ico-engine/context?dimension=member&value=mem-xxx&year=2026&month=3
GET /api/ico-engine/context?dimension=space&value=spc-xxx&year=2026&month=3
GET /api/ico-engine/context?dimension=project&value=proj-xxx&year=2026&month=3
```

Valida dimensión contra `ICO_DIMENSIONS`, intenta caché materializado primero, y cae a `computeMetricsByContext()` en vivo.

Retorna `IcoMetricSnapshot`:
```typescript
interface IcoMetricSnapshot {
  dimension: IcoDimensionKey
  dimensionValue: string
  dimensionLabel: string | null
  periodYear: number
  periodMonth: number
  metrics: MetricValue[]
  cscDistribution: CscDistributionEntry[]
  context: { totalTasks: number; completedTasks: number; activeTasks: number }
  computedAt: string | null
  engineVersion: string
  source: 'materialized' | 'live'
}
```

### B.8 Person ICO Tab

Nueva pestaña ICO en Person 360:
- Consume de `GET /api/ico-engine/context?dimension=member&value={memberId}`
- KPIs: RpA, OTD%, FTR%, Throughput, Ciclo, Stuck assets
- Charts: CSC donut, health radar, pipeline velocity gauge
- Selectores de período (mes/año)

Permisos: `efeonce_admin`, `efeonce_operations`.

### B.9 Agregar dimensiones futuras (Service, Campaign, etc.)

Solo 3 pasos necesarios:
1. Asegurar que la columna existe en `delivery_tasks` → `v_tasks_enriched`
2. Agregar entrada a `ICO_DIMENSIONS` en `shared.ts`
3. Opcionalmente agregar tabla de materialización + función

No se requiere cambiar fórmulas de métricas, duplicar SQL, ni crear nuevos endpoints.

### B.10 Archivos modificados

| Archivo | Acción |
|---------|--------|
| `src/lib/ico-engine/shared.ts` | `ICO_DIMENSIONS`, `buildMetricSelectSQL()`, `buildPeriodFilterSQL()`, status constants |
| `src/lib/ico-engine/materialize.ts` | Refactored to use shared builders + `materializeMemberMetrics()` |
| `src/lib/ico-engine/read-metrics.ts` | `IcoMetricSnapshot`, `computeMetricsByContext()`, `readMemberMetrics()` |
| `src/lib/ico-engine/schema.ts` | `metrics_by_member` DDL, `assignee_member_ids` in view |
| `src/lib/sync/sync-notion-conformed.ts` | Multi-assignee array + `ensureMultiAssigneeColumn()` |
| `src/app/api/ico-engine/context/route.ts` | NEW — generic context API |
| `src/app/api/people/[memberId]/ico/route.ts` | NEW — person ICO convenience endpoint |
| `src/views/greenhouse/people/tabs/PersonIcoTab.tsx` | NEW — person ICO tab with charts |
| `src/types/people.ts` | Added `'ico'` to `PersonTab` |
| `src/views/greenhouse/people/helpers.ts` | Tab config + permissions |
| `src/views/greenhouse/people/PersonTabs.tsx` | Registered ICO tab |
| `scripts/setup-bigquery-source-sync.sql` | Added `assignee_member_ids` column |

---

## 13. AI Core & Robustness Roadmap (TASK-118)

> Agregado 2026-03-28. Actualizado 2026-04-04. Spec viva: `docs/tasks/complete/TASK-118-ico-ai-core-embedded-intelligence.md`

### 13.0 Estado runtime actual

- Ya existe foundation backend/pipeline para AI Core dentro del backbone canónico de `ICO`:
  - `ico_engine.ai_signals` y `ico_engine.ai_prediction_log` se provisionan desde `ensureIcoEngineInfrastructure()`
  - `materializeMonthlySnapshots()` ejecuta `materializeAiSignals()` como step aditivo posterior a las métricas base
  - el runtime emite `ico.ai_signals.materialized`
  - `greenhouse_serving.ico_ai_signals` funciona como cache serving y se refresca vía proyección reactiva BQ -> PG
- El scope actual sigue siendo internal-only y advisory-only. Los follow-ons de scoring compuesto, riesgo, churn, forecast avanzado o surfaces client-facing permanecen en `TASK-150` a `TASK-159`.
- `TASK-118` queda cerrada sobre esta foundation determinística.
- La lane LLM async de quality scoring / explanations continúa separada en `TASK-232`.

### 13.1 Visión

Transformar ICO de motor de medición pasivo a motor de inteligencia embebida. La IA corre como daemon en cada ciclo de materialización — no como chat, no bajo demanda. Genera señales que se persisten como first-class data y se consumen directamente en dashboards.

### 13.2 Design Decisions

| Decisión | Postura | Razón |
|----------|---------|-------|
| Autonomía | **Advisory-only** | ICO alimenta bonos de payroll; acciones automáticas afectan liquidaciones reales |
| Audiencia | **Internal-only** (agency surfaces) | El equipo ve predicciones y actúa; el cliente solo ve el resultado |
| Runtime | **TypeScript in-process** | Math simple (z-scores, regression) es suficiente; BigQuery ML solo si la complejidad lo requiere |
| Observabilidad | Dentro de **Ops Health** existente | Nueva sección como subsystem, no surface separada |
| Threshold | **>=30 tasks completadas / 3 meses** por Space | Flag `ai_eligible`; spaces debajo ven métricas sin señales IA |
| Calibración | **Prediction tracking desde día 1** | `ai_prediction_log` compara forecast vs actual al cierre de período |

### 13.3 Pipeline Architecture

```
Steps 1-7: materialización actual (intacta, zero cambios)
     ↓
Step 8:  Anomaly Detection     — z-score sobre series históricas
Step 9:  Root Cause Analysis   — drill-down dimensional automático
Step 10: Predictive Metrics    — linear extrapolation / Markov (con CSC)
Step 11: Persist ai_signals    — BigQuery + sync a Postgres cache
```

**Principio:** puramente aditivo. Si cualquier step AI falla, la materialización completa sin IA (graceful degradation).

### 13.4 Tablas nuevas

| Tabla | Schema | Propósito |
|-------|--------|-----------|
| `ai_signals` | `ico_engine` (BQ) + `greenhouse_serving` (PG) | Anomalías, predicciones, root cause, recomendaciones |
| `ai_prediction_log` | `ico_engine` (BQ) | Tracking predicción vs resultado para calibración |
| `csc_transition_matrix` | `ico_engine` (BQ) | Probabilidades Markov por Space |
| `csc_dwell_times` | `ico_engine` (BQ) | Tiempo promedio por fase CSC |
| `seasonal_indices` | `ico_engine` (BQ) | Index estacional por (Space, metric, month) |

La tabla `ai_metric_scores` (§5.5, ya creada vacía) se activa en `TASK-232` (Quality Scoring con LLM async).

### 13.5 Roadmap de ejecución

#### Phase 1 — AI Intelligence

| Slice | Entregable | Algoritmo | Esfuerzo |
|-------|-----------|-----------|----------|
| **1** | Anomaly Detection | Z-score (|z| >2 = warning, >3 = critical) | ~2h |
| **2** | Root Cause Analysis | Top 3 contributors por member/project/phase | ~3h |
| **3** | Predictive Metrics | Linear extrapolation + progress blending | ~4h |
| **4** | Capacity Forecasting | Throughput × pipeline vs FTE contratado | ~3h |
| **5** | Resource Optimization | Rule engine sobre señales 1-4 | ~3h |
| **6** | Quality Scoring | LLM async sobre tasks completadas → `ai_metric_scores` | ~6h |

#### Phase 2 — Robustness

| Slice | Entregable | Qué mejora | Esfuerzo |
|-------|-----------|------------|----------|
| **7** | Data Quality Scoring | Confianza de cada métrica basada en completitud de campos | ~2h |
| **8** | Revenue-Weighted Metrics | Pondera KPIs por revenue del Space (bridge `fin_income`) | ~3h |
| **9** | CSC Pipeline Analytics | Markov chain: transition matrix + predicted delivery date | ~5h |
| **10** | Seasonality Model | Seasonal adjustment para anomaly detection (>=12 meses) | ~3h |
| **11** | Operational Maturity Model | 4 etapas (Onboarding→Excelling) con targets dinámicos | ~3h |
| **12** | Member Growth Trajectory | Trends, peer comparison, early warning en Person 360 | ~4h |
| **13** | Multi-Source Enrichment | Señales cross-schema: ICO × Finance × Payroll × Email | ~4h |

**Total estimado:** ~45 horas (13 slices desplegables independientemente).

**Slice 7 (Data Quality)** es prerequisite de confianza para toda Phase 1 — ejecutar antes o en paralelo con Slice 1.

### 13.6 Ejemplo de output integrado

**Hoy (solo medición):**
```
OTD: 84% ↓ — Atención
```

**Con AI Core (Phase 1 + 2):**
```
OTD: 84% ↓ — Anomalía detectada (z=2.3, ajustado por estacionalidad)
  Confianza: 92% (data quality score del Space)
  Predicción fin de mes: 79% (confidence 0.72)
  Causa raíz: 4 tasks en revisión_interna >5d, proyecto Acme
    → 65% probabilidad de ir a cambios_cliente (Markov)
    → María contribuye 35% del delta (dedicación: 140%)
  Revenue at risk: $28K/mes (Space Acme = 22% del revenue total)
  Recomendación: Reasignar 2 tasks a Diego (60% capacity disponible)
  Maturity stage: Optimizing (target OTD: 85%)
```

### 13.7 Relación con otros sistemas

| Sistema | Cómo se relaciona |
|---------|-------------------|
| **Nexa** (TASK-114/115) | Consume `ico_ai_signals` como contexto enriquecido — no calcula, lee |
| **Payroll** | Las señales son advisory; no modifican cálculos de bonos directamente |
| **Person 360** | Slice 12 enriquece el perfil con trajectory y peer comparison |
| **Agency Delivery** | Surface principal de consumo de todas las señales |
| **Ops Health** | AI Core como subsystem en health check |
| **Finance** | Slice 8 y 13 cruzan datos de revenue para ponderación |

---

*Efeonce Greenhouse™ • ICO Engine Spec v1.0 + Apéndice B (v2 Context-Agnostic) + §13 AI Core Roadmap*
*Efeonce Group — Marzo 2026 — CONFIDENCIAL*
*Documento técnico interno. Su reproducción o distribución sin autorización escrita está prohibida.*
