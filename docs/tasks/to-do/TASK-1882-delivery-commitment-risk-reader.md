# TASK-1882 — Delivery commitment risk: lectura prospectiva canónica de compromisos en riesgo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-048`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `delivery`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido, sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea el primer reader **prospectivo** del dominio delivery: qué compromisos están en riesgo de incumplirse en los próximos días, con sujeto, fecha y evidencia. Hoy todo el motor ICO mira hacia atrás sobre agregados mensuales cerrados; no existe ninguna lectura de "qué vence pronto y no se está moviendo". El reader alimenta los indicadores ACC y FRM de TASK-1880 y el digest semanal de TASK-1884, sin recomputar ninguna métrica ICO.

## Why This Task Exists

Un barrido por `src/lib/ico-engine/`, `src/lib/delivery/` y `src/lib/agency/` buscando ventanas futuras (`due_date >= CURRENT_DATE`, `DATE_ADD(CURRENT_DATE`, horizonte prospectivo) devuelve **cero coincidencias**. Las únicas ventanas futuras del repo viven en otros dominios (`finance/payment-orders/get-kpis.ts`, `hr-core/talent-ops.ts`, `home/loaders/load-calendar-rail.ts`). El único predicado prospectivo del motor, `CARRY_OVER_SQL` en `src/lib/ico-engine/shared.ts:278-287` — cuyo propio comentario dice *"Represents forward-looking workload, not overdue debt"* — se materializa como `carry_over_count` y **no alimenta ninguna métrica del registry ni ningún insight**.

La consecuencia es medible. El 2026-09-21, a la misma hora en que el digest semanal salió hablando del OTD de agosto de un proyecto con una tarea, el sistema tenía estos datos ya materializados y sin lector:

| horizonte (tareas abiertas, período 2026-09) | tareas | atascadas | aún en `briefing` |
|---|---|---|---|
| ya vencidas | 385 | 86 | — |
| **vencen en ≤7 días** | **156** | **78 (50 %)** | 31 |
| vencen en ≤30 días | 75 | 53 | — |

Desglose por espacio de lo que vence en ≤7 días: Grupo Berel 104 (37 atascadas, 20 todavía en `briefing`, 28 en última milla, 3,2 días de inmovilidad promedio); Sky Airline 52 (41 atascadas = 79 %, 11 en `briefing`, 4,8 días de inmovilidad). Efeonce: 0 con vencimiento futuro y 178 vencidas abiertas — el perfil de un tablero que dejó de mantenerse, no de un equipo que incumple.

Además, la deuda arrastrada existe, se calcula y nadie la lee: `overdue_carried_forward_count` para 2026-09 es 177 en Efeonce, **164 en Sky Airline** y 28 en Berel. Sky exhibe OTD 94,5 % (zona óptima del registry) porque el denominador del OTD sólo cuenta vencimientos **del mes en curso** — `DERIVED_OVERDUE_SQL` está acotado por `REPORT_PERIOD_SCOPE_SQL` (`shared.ts:289-293`) y `OVERDUE_CARRIED_FORWARD_SQL` (`shared.ts:296-301`) queda fuera del denominador. La métrica verde y las 164 promesas incumplidas conviven sin contradecirse.

Un tercer hecho que sólo se ve mirando hacia adelante: de las 369 tareas vencidas y abiertas, **272 (74 %) no tienen `primary_owner_member_id`**, con ~235 días de antigüedad promedio. Eso no es atraso operativo: es higiene de registro, y contamina todos los denominadores aguas abajo, incluido el insumo del bono.

El EPIC-048 declara en su cadencia *"Daily: captura/materialización y cola de riesgos/ownership"* y define ACC (*"¿Tiene dueño el trabajo y cabe en la capacidad?"*) y FRM (*"¿Se atienden riesgos con evidencia y a tiempo?"*). Ninguna de las tres hijas existentes construye esa cola: TASK-1879 es fuentes y cartera, TASK-1880 es la proyección de indicadores, TASK-1881 es Person 360. Esta task construye el insumo que ACC y FRM necesitan y que hoy no existe.

## Goal

- Un reader canónico server-side que responda "qué compromisos están en riesgo" con cohortes explícitas, sujeto resuelto y evidencia por tarea, sin recomputar ninguna métrica ICO.
- Cohorte de higiene separada de cohorte de riesgo: trabajo sin responsable y deuda antigua no se mezclan con entregas en peligro real.
- Contrato gobernado (Full API Parity) consumible por UI, Nexa, MCP y el digest, con un único primitive.
- Snapshot diario de estado de riesgo que permita, más adelante, medir si estas alertas aciertan.
- Dos reliability signals que vigilen la cola y la cobertura de responsable.

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
- `docs/architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_OPERATIONAL_LEADERSHIP_MEASUREMENT_V1.md`
- `docs/architecture/agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md`

Reglas obligatorias:

- **Este reader NO es una métrica ICO y no puede comportarse como una.** No calcula OTD, FTR, RpA ni cycle time, no escribe en `metric_snapshots_monthly` ni en `metrics_by_*`, y no toca el insumo del bono. Cuenta tareas contra su `due_date` y su estado. Si en el futuro alguien quiere derivar un porcentaje de esto, es otra task con spec de métrica propia.
- **Ningún consumer recomputa.** `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` §5 prohíbe que UI, dashboards, scorecards, reportes o agentes recalculen inline. El reader es el único lugar donde vive la definición de cada cohorte; el digest, Nexa y TASK-1880 lo consumen.
- **Reusar los predicados canónicos de `shared.ts`.** `CANONICAL_OPEN_TASK_SQL`, `CANONICAL_COMPLETED_TASK_SQL`, `OVERDUE_CARRIED_FORWARD_SQL` y `CARRY_OVER_SQL` ya existen. Prohibido escribir un predicado paralelo de "tarea abierta" o "vencida".
- **Prohibido introducir o leer fórmulas Notion.** No se crea propiedad formula nueva; no se lee `Correcciones` ni `Indicador de Performance` como input.
- **Fecha contra fecha es `integer` en PostgreSQL y en BigQuery el tipo importa.** `SQL_DATE_MATH_AGENT_INVARIANTS.md`: nunca `EXTRACT(EPOCH FROM (X - Y))` cuando algún lado es `DATE`. Para días entre fechas, `DATE_DIFF(a, b, DAY)` en BigQuery y `(a - b)::int` en PostgreSQL.
- **Zona horaria canónica `America/Santiago`.** El "hoy" del horizonte se resuelve con `CURRENT_DATE('America/Santiago')` en BigQuery y con los helpers de `src/lib/calendar/business-time.ts` en TypeScript. Nunca `new Date()` crudo para decidir el corte del horizonte.
- **Degradación honesta.** Si el snapshot del período está stale o la cobertura de `due_date` en un espacio es insuficiente, el reader devuelve ese espacio con estado explícito (`unavailable` / `low_confidence`), nunca cero.

## Normative Docs

- `docs/architecture/Contrato_Metricas_ICO_v1.md` §8 — cadencia canónica: el ritmo semanal pide *"Cuellos de botella activos, proyectos atrasados, brief queue, capacidad vs. demanda"* para Ops Lead + Account Lead. Este reader es el insumo de esas cuatro cosas.
- `docs/operations/EFEONCE_OPERATING_CODE_V1.md:117-122` — las cuatro preguntas del weekly. La primera (*"¿Qué riesgo estamos viendo antes de que explote?"*) es literalmente el contrato de este reader.
- `docs/epics/to-do/EPIC-048-operational-leadership-performance-ico-person-360.md` — §Cadence and rollout punto 1 (daily: cola de riesgos/ownership) y los indicadores ACC y FRM.
- `docs/architecture/metrics/ACC_V1.md` y `docs/architecture/metrics/FRM_V1.md` — definiciones que consumirán este reader. **Leerlas antes de nombrar cohortes**: los nombres de cohorte de esta task no deben contradecir el numerador/denominador que esas specs declaran.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `efeonce-group.ico_engine.delivery_task_monthly_snapshots` (BigQuery) — tabla existente, sincronizada a diario. Campos requeridos verificados presentes: `task_source_id`, `task_name`, `project_source_id`, `space_id`, `client_id`, `task_status`, `primary_owner_member_id`, `assignee_member_id`, `due_date`, `original_due_date`, `completed_at`, `fase_csc`, `is_stuck`, `hours_since_update`, `blocker_count`, `days_late`, `is_rescheduled`, `delivery_signal`, `performance_indicator_code`, `snapshot_status`, `synced_at`.
- `efeonce-group.ico_engine.stuck_assets_detail` — 345 filas materializadas al 2026-09-21 06:17 UTC, con `severity` (`danger` ≥96h / `warning`) y `days_since_update`.
- `src/lib/ico-engine/shared.ts` — predicados canónicos y `buildDeliveryPeriodSourceSql`.
- `src/lib/ico-engine/materialized-freshness.ts` — para declarar frescura del insumo.
- `src/lib/calendar/business-time.ts` — `getSantiagoDateParts`, corte horario canónico.
- `src/lib/ico-engine/ai/entity-display-resolution.ts` — resolución de label de proyecto (evita exponer IDs técnicos y sentinels).

### Blocks / Impacts

- `TASK-1880` (EPIC-048) — ACC y FRM consumen este reader en vez de construir su propia cola. **Coordinar antes de ejecutar**: si TASK-1880 arranca primero, debe consumir este contrato, no duplicarlo.
- `TASK-1884` — el digest semanal operativo se construye sobre este reader.
- `TASK-1883` — comparte el criterio de "muestra insuficiente"; ambos deben usar el mismo helper de confianza.
- `TASK-1217` (OTD explainability) — complementaria, no solapada: 1217 expone el atraso **imputable ya ocurrido**; esta task expone el riesgo **todavía no consumado**. Ninguna de las dos calcula la del otro.
- `TASK-152` — el registry declarativo de anomalías podrá declarar reglas sobre estas cohortes; no las recalcula.

### Files owned

- `src/lib/ico-engine/delivery-commitment-risk.ts` (nuevo)
- `src/lib/ico-engine/delivery-commitment-risk.test.ts` (nuevo)
- `src/lib/ico-engine/delivery-commitment-risk-types.ts` (nuevo)
- `src/app/api/platform/app/delivery/commitment-risk/route.ts` (nuevo)
- `src/lib/reliability/queries/delivery-commitment-risk-queue.ts` (nuevo)
- `src/lib/reliability/queries/delivery-unassigned-overdue-coverage.ts` (nuevo)
- `migrations/<timestamp>_task-1882-delivery-commitment-risk-daily-snapshot.sql` (nuevo)
- `src/lib/ico-engine/schema.ts` (modificado — sólo si el snapshot diario requiere una tabla BigQuery adicional)

## Current Repo State

### Already exists

- `delivery_task_monthly_snapshots` con los 8 campos de señal por tarea ya sincronizados: `is_stuck` (definido en `src/lib/ico-engine/schema.ts:128-136` como estado ∉ completado/excluido/briefing **y** `hours_since_update >= 72`), `hours_since_update` (`schema.ts:124`), `delivery_signal` (`schema.ts:139-149`), `days_late`, `is_rescheduled`, `blocker_count`, `performance_indicator_code`, `gh_otd_bucket` (`schema.ts:158`, shadow por diseño).
- `materializeStuckAssetsDetail` en `src/lib/ico-engine/materialize.ts:514-548` con clasificación de severidad.
- Frescura diaria real del insumo: cron `ico-materialize-daily` en `services/ico-batch/deploy.sh:255` (`15 3 * * *`, `monthsBack: 3`). Al 2026-09-21: `synced_at` máximo de tareas 2026-09-20 10:20 UTC, `materialized_at` de stuck assets 2026-09-21 06:17 UTC.
- `src/app/api/ico-engine/stuck-assets/route.ts` — endpoint puntual que ya expone stuck assets con `urgency` derivada (`critical` ≥96h, `attention` ≥48h).
- `src/lib/home/loaders/load-at-risk-watchlist.ts` — score de riesgo por espacio, **retrospectivo** (ICO + ΔFTR + días de inactividad) y con `catch { return [] }` en sus cuatro lecturas.

### Gap

- No existe ninguna lectura que cruce `due_date` futuro con estado de la tarea. Verificado por barrido: cero coincidencias de ventana prospectiva en `src/lib/ico-engine/`, `src/lib/delivery/`, `src/lib/agency/`, `src/lib/projects/`.
- `overdue_carried_forward_count` se materializa y no tiene un solo consumer que lo exponga.
- No hay lectura de cobertura de responsable sobre trabajo vencido: las 272 tareas huérfanas no aparecen en ninguna superficie.
- No hay historia diaria del estado de riesgo, así que hoy **es imposible medir si una alerta acertó**. No se puede responder "de las tareas que estaban atascadas a 7 días de vencer, ¿cuántas llegaron tarde?". Los snapshots son mensuales y se sobrescriben dentro del mes.
- `load-at-risk-watchlist.ts` traga sus errores en silencio: un fallo de lectura se presenta como "sin riesgo".

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/ico-engine/` (Next.js server-only; consumido desde route handlers de Vercel y desde el ops-worker vía el bundle compartido)
- Future candidate home: `domain-package`
- Boundary: candidato a un futuro `@greenhouse/delivery-metrics` junto a los helpers canónicos de `shared.ts`; hoy permanece compartido. El reader `readDeliveryCommitmentRisk` es el único productor de cohortes de riesgo. Consumers autorizados: `TASK-1884` (digest), `TASK-1880` (ACC/FRM), Nexa vía el contrato `/api/platform/app/delivery/commitment-risk`, y reliability. Ningún consumer reimplementa el predicado de cohorte.
- Server/browser split: `server-only` estricto. El módulo importa `server-only` en la primera línea; el cliente BigQuery, las credenciales y los predicados SQL nunca cruzan al bundle del browser. La UI recibe el DTO ya resuelto.
- Build impact: `none` — reusa `@google-cloud/bigquery` ya presente en el bundle del motor ICO; sin dependencia nueva ni input de filesystem.
- Extraction blocker: la resolución de `space_id` autorizado depende de la sesión y de los entitlements del portal; extraer el reader exige antes extraer el contrato de autorización.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `efeonce-group.ico_engine.delivery_task_monthly_snapshots` (lectura) + tabla nueva de snapshot diario de riesgo (escritura aditiva)
- Consumidores afectados: digest semanal (TASK-1884), proyección de liderazgo ACC/FRM (TASK-1880), Nexa vía contrato de plataforma, reliability
- Runtime target: `production` (Vercel route handler + ops-worker)

### Contract surface

- Contrato existente a respetar: `src/lib/ico-engine/shared.ts` (predicados canónicos), `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (lane `api/platform/app/*`)
- Contrato nuevo o modificado: reader `readDeliveryCommitmentRisk(input)` + DTO `DeliveryCommitmentRiskSnapshot` + ruta `GET /api/platform/app/delivery/commitment-risk`
- Backward compatibility: `compatible` — additive, no modifica ningún contrato existente
- Full API parity: la lógica de cohorte vive en `src/lib/ico-engine/delivery-commitment-risk.ts`. La ruta de plataforma es un cliente delgado del reader; el digest importa el reader directamente; Nexa consume la ruta. Un primitive, cuatro consumers, cero duplicación.

### Data model and invariants

- Entidades/tablas/views afectadas: `ico_engine.delivery_task_monthly_snapshots` (read), `ico_engine.stuck_assets_detail` (read), `greenhouse_serving.delivery_commitment_risk_daily` (write, nueva)
- Invariantes que no se pueden romper:
  - El reader **nunca** calcula ni devuelve OTD/FTR/RpA/cycle time. Devuelve conteos y listas de tareas.
  - Una tarea pertenece a **exactamente una** cohorte de riesgo (`overdue_open`, `due_soon_at_risk`, `due_soon_healthy`, `carried_debt`). Las cohortes de higiene (`unassigned`, `stale_abandoned`) son **ortogonales** y se declaran como banderas, no como cohorte excluyente: una tarea puede estar vencida y además sin responsable. El test debe verificar ambas propiedades por separado.
  - El horizonte se mide siempre contra `CURRENT_DATE('America/Santiago')`, no contra el fin de período ni contra `new Date()` del runtime.
  - `due_date IS NULL` nunca entra en una cohorte de riesgo; se reporta aparte como `sin_fecha` — un compromiso sin fecha no es un compromiso en riesgo, es un compromiso sin definir.
  - La deuda arrastrada se lee de `OVERDUE_CARRIED_FORWARD_SQL`, no se recalcula.
  - El snapshot diario es **append-only**: una fila por `(space_id, risk_date)`. Nunca se hace `UPDATE` de un día ya escrito; un recálculo del mismo día escribe una generación nueva identificada por `computed_at` y la VIEW canónica devuelve la última.
- Write-target allowlist: `greenhouse_serving.delivery_commitment_risk_daily` es el único destino de escritura. `src/lib/ico-engine/` no tiene hoy boundary test de destinos; si al ejecutar existe uno, declarar la tabla ahí en el mismo PR con el comentario de justificación.
- Tenant/space boundary: `space_id` se deriva de los espacios autorizados de la sesión vía los readers de entitlements del portal; la ruta nunca acepta un `spaceId` arbitrario sin verificar pertenencia. Respuesta anti-oracle: espacio no autorizado devuelve `404`, no `403`.
- Idempotency/concurrency: el cómputo es idempotente por `(space_id, risk_date)`; dos corridas el mismo día producen dos generaciones y la VIEW resuelve la última. Sin locks.
- Audit/outbox/history: sin outbox (es lectura). El snapshot diario **es** la historia: existe para permitir calibración posterior, no para disparar efectos.

### Migration, backfill and rollout

- Migration posture: `additive` — una tabla nueva en `greenhouse_serving` + una VIEW `*_current`. Sin tocar tablas existentes.
- Default state: el reader es consumible desde el día uno (lectura pura, sin flag). La **escritura** del snapshot diario nace detrás de `DELIVERY_COMMITMENT_RISK_SNAPSHOT_ENABLED` (default `false`) para poder encenderla sin re-deploy del reader.
- Backfill plan: **no hay backfill posible y eso es parte del hallazgo.** El estado de riesgo es una foto del presente; no existe historia diaria previa que reconstruir. La serie empieza el día que se enciende el flag. Declararlo explícito en la doc funcional para que nadie prometa retroactividad.
- Rollback path: flag a `false` (deja de escribir; el reader sigue sirviendo) → revert PR → la migración es additive y puede quedarse sin daño.
- External coordination: alta de `DELIVERY_COMMITMENT_RISK_SNAPSHOT_ENABLED` en los runtimes donde se lea. **Mapear antes con `grep -rn "DELIVERY_COMMITMENT_RISK_SNAPSHOT_ENABLED" src/ services/`** y declarar la fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR. Si el escritor corre en el ops-worker, declararlo en `services/ops-worker/deploy.sh` **además** de aplicarlo en vivo: los `deploy.sh` usan `--set-env-vars` destructivo.

### Security and access

- Auth/access gate: `session` + capability de lectura de delivery del espacio. Reusar el gate que ya protege `src/app/api/ico-engine/stuck-assets/route.ts`; si esa ruta usa un gate más laxo que el canónico, **no copiarlo**: declararlo como hallazgo y usar el canónico.
- Sensitive data posture: sin PII ni datos de Payroll. Se exponen nombres de tarea, proyecto y el `member_id` del responsable. El nombre de la persona se resuelve para display; **no se expone ningún dato de compensación, ni se deriva desempeño individual de estas cohortes**.
- Error contract: `canonicalErrorResponse` de `src/lib/api/canonical-error-response.ts`. Prohibido `NextResponse.json({ error: 'English prose' })`. Errores de BigQuery van a `captureWithDomain(err, 'delivery', ...)`, nunca al cliente.
- Abuse/rate-limit posture: la ruta es autenticada y de bajo volumen. **Atención ISSUE-174**: no abrir pool por invocación ni permitir ráfagas concurrentes contra la instancia compartida; la lectura principal es BigQuery, la escritura del snapshot es PostgreSQL y debe ser secuencial por espacio, nunca `Promise.all` sobre todos los espacios.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/ico-engine/delivery-commitment-risk.test.ts`, `pnpm local:check`
- DB/runtime checks: ejercitar el SQL real contra BigQuery vía `bq query` antes de commitear (los mocks de Vitest ejercitan el TypeScript, **no el SQL**); `pnpm migrate:up` + verificación de que la tabla y la VIEW existen con `information_schema`
- Integration checks: `pnpm staging:request /api/platform/app/delivery/commitment-risk` con un espacio autorizado y con uno no autorizado (debe dar 404)
- Reliability signals/logs: `delivery.commitment_risk.queue_depth`, `delivery.commitment_risk.unassigned_overdue_coverage`
- Production verification sequence: ver `### Production verification sequence`

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

### Slice 1 — Tipos y contrato del DTO

- `src/lib/ico-engine/delivery-commitment-risk-types.ts` con `DeliveryCommitmentRiskSnapshot`, `CommitmentRiskCohort`, `CommitmentRiskItem`, `CommitmentRiskSpaceSummary` y `CommitmentRiskDataState`.
- El DTO declara explícitamente `computedAt`, `horizonDays`, `asOfDate` (fecha Santiago usada como "hoy") y `sourceFreshness` — quien lo consuma debe poder saber a qué momento corresponde la foto sin inferirlo.
- Test de contrato que congela la forma del DTO (un cambio de forma debe ser una decisión, no un accidente).

### Slice 2 — Reader canónico

- `src/lib/ico-engine/delivery-commitment-risk.ts` con `readDeliveryCommitmentRisk({ spaceIds, horizonDays, asOf })`.
- Una sola query BigQuery que produzca las cohortes agregadas + una segunda para el detalle de ítems, con `LIMIT` explícito y orden determinista.
- Reuso obligatorio de los predicados de `shared.ts`; cero predicados nuevos de "tarea abierta".
- Resolución de labels de proyecto vía `resolveProjectDisplayBatch` para no exponer IDs técnicos ni sentinels.
- Degradación honesta: espacio con snapshot stale o sin cobertura de `due_date` devuelve `dataState: 'low_confidence' | 'unavailable'` con razón, nunca cero silencioso.
- Tests con los casos: espacio sin tareas, todas sin `due_date`, todas vencidas, mezcla de cohortes, tarea vencida **y** sin responsable (debe aparecer en la cohorte de riesgo **y** con la bandera de higiene), snapshot stale, horizonte 0 y 30.

### Slice 3 — Contrato de plataforma

- `GET /api/platform/app/delivery/commitment-risk` con `?horizonDays=` (default 7, máximo 30) y `?spaceId=` opcional.
- Autorización por sesión + espacios autorizados; espacio ajeno → 404 anti-oracle.
- Errores canónicos vía `canonicalErrorResponse`.
- Smoke contra staging con espacio autorizado y no autorizado.

### Slice 4 — Snapshot diario append-only

- Migración additive: `greenhouse_serving.delivery_commitment_risk_daily` + VIEW `*_current` (última generación por `(space_id, risk_date)`).
- Escritor invocado desde el ciclo diario existente, detrás de `DELIVERY_COMMITMENT_RISK_SNAPSHOT_ENABLED`. **No crear cron nuevo** si el ciclo ICO ya corre a diario: el EPIC-048 dice explícitamente *"no se necesita un nuevo cron para pintar el perfil si puede consumirse el ciclo ICO existente"*.
- Bloque `DO $$ ... RAISE EXCEPTION` de verificación post-DDL en la propia migración (anti pre-up-marker bug).
- Fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR.

### Slice 5 — Reliability signals

- `delivery.commitment_risk.queue_depth` — kind `data_quality`. Severidad por proporción, no por valor absoluto: `warning` si >30 % de lo que vence en el horizonte está en riesgo, `error` si >60 %. Evidencia: conteos por espacio.
- `delivery.commitment_risk.unassigned_overdue_coverage` — kind `data_quality`. Mide la fracción de trabajo vencido sin responsable. Steady state declarado explícitamente: **no es 0 hoy** (es 74 %), así que el signal nace con el valor observado como baseline documentado y alerta sobre el deterioro, no sobre la existencia.
- Ambos registrados en el módulo `delivery` del control plane.

### Slice 6 — Documentación

- Funcional: `docs/documentation/delivery/riesgo-de-compromisos.md` — qué significa cada cohorte en lenguaje simple, qué NO mide, y la advertencia explícita de que la serie empieza el día del encendido.
- Manual: `docs/manual-de-uso/plataforma/leer-la-cola-de-riesgo.md` — cómo leerla, qué hacer con cada cohorte, cómo distinguir riesgo real de higiene de tablero.
- Técnica: delta en `docs/architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md` declarando el reader como único productor de cohortes de riesgo.

## Out of Scope

- **No se toca ninguna fórmula de métrica ICO.** OTD, FTR, RpA, cycle time y el insumo del bono quedan exactamente como están. Cambiar el denominador del OTD para que vea la deuda arrastrada es una conversación de métrica con spec propia y stop-gates — **no se hace aquí, ni siquiera "de paso"**.
- No se construye UI. El digest es TASK-1884; Person 360 es TASK-1881.
- No se emite ninguna notificación ni push. La entrega por Teams/in-app/email tiene dueño: TASK-695, TASK-436, TASK-439.
- No se agrega CTA accionable al ítem de riesgo. Eso es TASK-435 (contrato de CTA) y TASK-1184 (acción gobernada sobre insight).
- No se calculan ACC ni FRM. Este reader es su insumo; los indicadores son de TASK-1880.
- No se corrige la higiene de datos detectada. Las 272 tareas huérfanas y los 333 assets en `danger` se **exponen**; decidir qué hacer con ellas es una decisión operativa, y si requiere una acción masiva será otra task con su propio gate.
- No se toca `load-at-risk-watchlist.ts` ni su `catch` silencioso. Queda como follow-up.

## Detailed Spec

### Cohortes canónicas

Dos planos ortogonales. El primero clasifica el compromiso; el segundo marca banderas de higiene que pueden coexistir con cualquier cohorte.

**Plano 1 — cohorte de compromiso (excluyentes, una tarea cae en exactamente una):**

| Cohorte | Definición | Por qué importa |
|---|---|---|
| `overdue_open` | abierta, `due_date < hoy`, `due_date` dentro del período en curso | incumplimiento ya consumado y todavía reversible |
| `carried_debt` | abierta, `due_date < inicio del período en curso` | la deuda que el OTD no ve — 369 tareas al 2026-09-21 |
| `due_soon_at_risk` | abierta, `hoy <= due_date <= hoy + horizonte`, **y** (`is_stuck` **o** fase en `briefing`/`produccion` con menos de N días hábiles restantes **o** `blocker_count > 0`) | el pronóstico accionable: 78 de 156 al 2026-09-21 |
| `due_soon_healthy` | abierta, dentro del horizonte, sin señal de riesgo | el denominador honesto: sin esto, "78 en riesgo" no significa nada |
| `no_due_date` | abierta, `due_date IS NULL` | no es riesgo, es compromiso sin definir |

El umbral de "fase temprana a pocos días" se declara como constante nombrada en el módulo, con el valor por defecto justificado en un comentario, y se calcula con días **hábiles** vía `src/lib/calendar/operational-calendar.ts` — un vencimiento el lunes visto un viernes no tiene tres días de margen.

**Plano 2 — banderas de higiene (no excluyentes):**

| Bandera | Definición | Observado 2026-09-21 |
|---|---|---|
| `unassigned` | `primary_owner_member_id` nulo o vacío | 272 de 369 vencidas (74 %), ~235 días de antigüedad |
| `stale_abandoned` | `hours_since_update` por encima del umbral de abandono (muy por encima del `STUCK_THRESHOLD_HOURS = 72` del registry) | 333 assets en `danger`, 56 días promedio sin tocar, peor caso 394 días |
| `rescheduled` | `is_rescheduled` o `due_date > original_due_date` | 12 en 2026-09 |

La distinción entre los dos planos es el punto de la task: **"el equipo va atrasado" y "el tablero no se mantiene" exigen decisiones opuestas**, y hoy el sistema las presenta como el mismo número. En Efeonce, 178 vencidas abiertas con 87 sin responsable y 4 tareas completadas en el mes es el segundo caso, no el primero; el digest del 2026-09-21 lo reportó como caída de desempeño y recomendó *"revisar backlog y asignación de recursos"*.

### Forma del DTO

```ts
export interface DeliveryCommitmentRiskSnapshot {
  asOfDate: string            // YYYY-MM-DD en America/Santiago
  horizonDays: number
  computedAt: string          // ISO
  sourceFreshness: {
    lastSyncedAt: string | null
    lastMaterializedAt: string | null
    state: 'fresh' | 'stale' | 'unknown'
  }
  spaces: CommitmentRiskSpaceSummary[]
  totals: CommitmentRiskCounts
}

export interface CommitmentRiskSpaceSummary {
  spaceId: string
  spaceName: string
  clientName: string | null
  dataState: 'ready' | 'low_confidence' | 'unavailable'
  dataStateReason: string | null
  counts: CommitmentRiskCounts
  hygiene: { unassigned: number; staleAbandoned: number; rescheduled: number }
  topItems: CommitmentRiskItem[]   // ordenados por vencimiento, luego por inmovilidad
}
```

`CommitmentRiskItem` lleva `taskSourceId`, `taskName`, `projectLabel`, `phase`, `dueDate`, `daysUntilDue` (negativo si vencida), `daysIdle`, `ownerMemberId`, `ownerDisplayName`, `cohort` y `flags`. Cada ítem es una fila que un humano puede accionar sin abrir nada más.

### Nota de método sobre `is_stuck`

`is_stuck` (`schema.ts:128-136`) excluye por construcción las tareas en `briefing`: una tarea recién creada nunca es "stuck". Eso es correcto para el concepto de asset detenido, pero significa que **`is_stuck` por sí solo no detecta el riesgo de una pieza que lleva días en briefing y vence el viernes** — de las 156 que vencían en ≤7 días al 2026-09-21, 31 estaban en `briefing` y por definición ninguna contaba como stuck. Por eso `due_soon_at_risk` combina tres condiciones y no delega en `is_stuck`. El test debe cubrir explícitamente el caso "en briefing, vence en 2 días, no stuck" y verificar que entra en la cohorte de riesgo.

### Sobre medir si esto acierta

No se puede hoy y la task no lo simula. El snapshot diario del Slice 4 existe para que **dentro de algunas semanas** se pueda responder: de las tareas marcadas `due_soon_at_risk` el día D, ¿qué fracción terminó `late_drop` u `overdue`? Esa medición es una task futura (ver Follow-ups) y es la única forma honesta de calibrar los umbrales. Hasta entonces, los umbrales de este reader son **declarados, no validados**, y la documentación funcional debe decirlo con esas palabras.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (tipos) → Slice 2 (reader) → Slice 3 (ruta). El reader no se expone antes de tener el DTO congelado por test.
- Slice 4 (snapshot) **sólo después** de que Slice 2 esté verde contra BigQuery real: escribir una serie histórica a partir de un cómputo no verificado es peor que no tenerla, porque queda como evidencia falsa.
- Slice 5 (signals) requiere Slice 2; puede correr en paralelo con Slice 4.
- Slice 6 (docs) al final, pero **antes** de declarar la task complete.
- La migración del Slice 4 se genera siempre con `pnpm migrate:create`, nunca a mano.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El reader se interpreta como métrica y alguien lo conecta al bono o a un porcentaje público | payroll / metrics | medium | Invariante explícito en el módulo y en los invariantes de dominio; el DTO no expone ningún ratio; nombres de cohorte sin sufijo `_pct` | revisión humana en PR; grep de `commitment_risk` en `src/lib/payroll/**` debe dar cero |
| Query BigQuery cara o lenta por escanear la tabla completa de tareas | cost / runtime | medium | Filtrar por `period_year`/`period_month` (la tabla está clusterizada por `period_month`, `space_id`, `task_source_id`); `LIMIT` explícito en el detalle; medir bytes escaneados antes de mergear | costo GCP; latencia del route handler |
| Ráfaga de escritura del snapshot agota conexiones de la instancia compartida | PostgreSQL | medium | Escritura secuencial por espacio, nunca `Promise.all`; reusar el pool canónico de `src/lib/postgres/client.ts`; precedente ISSUE-174 | conexiones idle en Cloud SQL |
| El SQL revienta en runtime por aritmética de fechas mal tipada | runtime | medium | `DATE_DIFF` en BigQuery, `(a - b)::int` en PostgreSQL; ejercitar cada query contra la base real antes de commitear | error en logs del route handler |
| Cohortes que se solapan y hacen que los conteos no sumen | data quality | low | Test que verifica que la suma de cohortes excluyentes == total de tareas abiertas con `due_date`, y que las banderas se cuentan aparte | test unitario |
| El snapshot diario se lee como si tuviera historia previa | interpretación | medium | La doc funcional declara la fecha de inicio de la serie; el DTO expone `asOfDate`; sin backfill silencioso | revisión humana |

### Feature flags / cutover

- El **reader y la ruta** no llevan flag: son lectura aditiva, sin efecto sobre nada existente. Cutover inmediato.
- La **escritura del snapshot diario** va detrás de `DELIVERY_COMMITMENT_RISK_SNAPSHOT_ENABLED` (default `false`). Mapear los runtimes que lo leen con `grep -rn` antes de prenderlo y aplicarlo en **todos** ellos. Si el escritor vive en el ops-worker, declararlo en `services/ops-worker/deploy.sh` además de aplicarlo en vivo con `--update-env-vars`. Revert: flag a `false`, sin re-deploy del reader.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR | <5 min | sí |
| Slice 2 | revert PR; ningún consumer en producción todavía | <5 min | sí |
| Slice 3 | revert PR; la ruta es additive y nadie depende de ella aún | <5 min | sí |
| Slice 4 | flag a `false` (deja de escribir); la tabla queda con las filas ya escritas, sin daño; `pnpm migrate:down` sólo si hay que retirar la tabla | <5 min flag / ~15 min migración | sí |
| Slice 5 | quitar los signals del registro del módulo | <10 min | sí |
| Slice 6 | revert de docs | <5 min | sí |

### Production verification sequence

1. `bq query` con el SQL exacto del reader sobre `2026-09` y los tres espacios reales; comparar los conteos contra los valores de referencia de esta task (156 en ≤7 días, 78 en riesgo, 369 vencidas abiertas, 272 sin responsable al 2026-09-21). Un desvío grande es señal de predicado mal escrito, no de cambio operativo.
2. `pnpm vitest run src/lib/ico-engine/delivery-commitment-risk.test.ts` verde.
3. Deploy a staging. `pnpm staging:request /api/platform/app/delivery/commitment-risk?horizonDays=7` con espacio autorizado → 200 con cohortes; con espacio ajeno → 404.
4. `pnpm migrate:up` en staging; verificar tabla y VIEW con `information_schema`; verificar que el bloque `DO` no abortó.
5. Encender `DELIVERY_COMMITMENT_RISK_SNAPSHOT_ENABLED` en staging; esperar un ciclo diario; verificar una fila por espacio con `risk_date` correcto.
6. Repetir 3-5 en producción con 24 h de separación.
7. Observar los dos signals durante 7 días antes de que TASK-1884 consuma el reader en el correo real.

### Out-of-band coordination required

- Alta de `DELIVERY_COMMITMENT_RISK_SNAPSHOT_ENABLED` en los runtimes que la leen (Vercel y/o Cloud Run) + fila en `FEATURE_FLAG_STATE_LEDGER.md`.
- Aviso al owner de TASK-1880 (EPIC-048) antes de mergear: ACC y FRM deben consumir este contrato y no construir una cola propia.
- Ninguna coordinación con Notion, HubSpot, Azure ni proveedores externos: es lectura de datos ya sincronizados.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `readDeliveryCommitmentRisk` existe en `src/lib/ico-engine/delivery-commitment-risk.ts`, es `server-only`, y es el único lugar del repo donde se define una cohorte de riesgo de compromiso.
- [ ] El reader no calcula ni devuelve OTD, FTR, RpA ni cycle time; `grep` de esos nombres en el módulo nuevo devuelve sólo comentarios explicativos.
- [ ] Las cinco cohortes del plano 1 son mutuamente excluyentes y su suma es igual al total de tareas abiertas del espacio; hay un test que lo verifica.
- [ ] Las tres banderas de higiene son ortogonales a la cohorte; hay un test con una tarea vencida y sin responsable que aparece en `overdue_open` **y** con `unassigned: true`.
- [ ] Una tarea en `briefing`, que vence en 2 días y no es `is_stuck`, cae en `due_soon_at_risk`; hay un test explícito.
- [ ] El horizonte se calcula contra `America/Santiago` y con días hábiles del calendario operativo; hay un test con un vencimiento en lunes evaluado un viernes.
- [ ] Un espacio con snapshot stale devuelve `dataState` distinto de `ready` con razón legible; nunca cero silencioso.
- [ ] `GET /api/platform/app/delivery/commitment-risk` responde 200 para espacio autorizado y **404** para espacio ajeno; los errores usan `canonicalErrorResponse`.
- [ ] La migración del snapshot incluye el marker `-- Up Migration` al inicio y un bloque `DO $$ ... RAISE EXCEPTION` que aborta si la tabla no quedó creada.
- [ ] El snapshot diario es append-only: no existe ningún `UPDATE` sobre `delivery_commitment_risk_daily` en el código.
- [ ] `DELIVERY_COMMITMENT_RISK_SNAPSHOT_ENABLED` tiene fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con su runtime declarado, en el mismo PR.
- [ ] Los dos reliability signals están registrados en el módulo `delivery` y `delivery.commitment_risk.unassigned_overdue_coverage` documenta su baseline observado en vez de asumir steady state 0.
- [ ] Cada query SQL nueva fue ejercitada al menos una vez contra BigQuery/PostgreSQL real antes del commit, con la evidencia pegada en el PR.
- [ ] La documentación funcional declara explícitamente que los umbrales son declarados y no validados, y que la serie histórica empieza el día del encendido.
- [ ] Las tres capas documentales (técnica, funcional, manual) quedaron creadas o actualizadas.

## Verification

- `pnpm vitest run src/lib/ico-engine/delivery-commitment-risk.test.ts`
- `pnpm local:check`
- `pnpm test` (suite completa) + `pnpm build` como gate de cierre, según `docs/operations/TASK_CLOSING_QUALITY_GATE_V1.md`
- `pnpm migrate:up` + verificación de objetos con `information_schema`
- `bq query` con el SQL del reader contra los tres espacios reales
- `pnpm staging:request /api/platform/app/delivery/commitment-risk?horizonDays=7`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `EPIC-048` quedó actualizado con el estado real de esta hija
- [ ] TASK-1880 fue notificada de que ACC/FRM deben consumir este contrato
- [ ] Los criterios tildados corresponden a evidencia real; lo no verificado queda sin tildar con su razón escrita

## Follow-ups

- Task futura de **calibración**: cuando el snapshot diario acumule ≥6 semanas, medir qué fracción de `due_soon_at_risk` terminó `late_drop`/`overdue` y ajustar umbrales con evidencia. Es la única forma honesta de validar este reader.
- `src/lib/home/loaders/load-at-risk-watchlist.ts` traga errores con `catch { return [] }` en sus cuatro lecturas: un fallo se presenta como "sin riesgo". Candidato a aplicar `observeAndRethrow`/`observeAndDegrade`.
- El denominador del OTD no ve la deuda arrastrada (`OVERDUE_CARRIED_FORWARD_SQL` fuera de `OTD_DENOMINATOR_SQL`). No se toca aquí; merece conversación de métrica con spec propia y stop-gates del strangler.
- Decidir qué hacer operativamente con las 272 tareas huérfanas y los 333 assets abandonados que este reader expone.

## Open Questions

- ¿El umbral de "fase temprana con pocos días hábiles" debe ser el mismo para todos los espacios, o depende del tipo de entregable? V1 usa una constante única y lo declara; si Berel y Sky tienen ciclos muy distintos, puede necesitar parametrización por espacio en una V2.
- ¿`stale_abandoned` debe tener un umbral propio o derivarse del `severity: danger` que `stuck_assets_detail` ya calcula (≥96 h)? Con 56 días de promedio observado, 96 h parece demasiado bajo para separar "detenido" de "abandonado".
