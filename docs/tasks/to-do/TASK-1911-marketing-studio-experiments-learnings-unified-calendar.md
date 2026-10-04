# TASK-1911 — Marketing Studio: experimentos, biblioteca de aprendizajes y calendario unificado

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-10-04 — activaciones y calendario de Studio (TASK-2001/2002)

- Por decisión del operador (ADR de estrategia §15) el **calendario unificado** pasa a TASK-2001 (reader de activaciones con evidencia de ejecución y estados `planned · scheduled · scheduled_off_plan · published · overdue · cancelled`) y TASK-2002 (UI). Esta task conserva experimentos y biblioteca de aprendizajes, y suma las **ventanas de experimento** al reader de calendario de TASK-2001 como capa adicional; no construye otro reader de calendario.

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-049`
- Status real: `Diseno — creada 2026-09-26 desde el ADR de capa de estrategia (§4.7); prioridad P2 inferida (cierra el ciclo pero no bloquea planificar ni medir)`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-1907 (hipótesis del plan y plan de contenidos) · TASK-1910 (observaciones y progreso de KPIs como evidencia) · TASK-1899 (T2 por MCP)`
- Branch: `efeonce-marketing-studio main (experimentos, aprendizajes, calendario) · Greenhouse develop (docs, manual servido) · efeonce-mcp rama + PR (sync y versión); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra el ciclo de la capa de estrategia: **experimentos** que nacen de una hipótesis del plan aprobado, con variantes
reales (pieza, copy, audiencia o destino), métrica primaria, regla de decisión y ventana, y cuyo resultado se captura de
las observaciones de Studio con fuente y fecha; una **biblioteca de aprendizajes append-only** donde cada aprendizaje
cita su evidencia, declara su alcance (organización, canal, persona, etapa, formato) y su confianza, y sólo alimenta a la
IA cuando una persona lo valida; y un **calendario unificado** (vuelos pagados, posts orgánicos, contenido planificado y
evergreen, ventanas de experimentos) en un solo reader.

## Why This Task Exists

- El plan de TASK-1907 declara hipótesis, pero nada las prueba ni registra si se sostuvieron; cada campaña vuelve a
  empezar sin memoria (ADR de capa de estrategia §4.7: experimentos → aprendizaje).
- La IA (TASK-1909) necesita recuperación **con cita**: sin una biblioteca con evidencia y validación humana, un agente
  repetiría intuiciones como hechos, que el ADR prohíbe.
- El calendario vigente (`getCalendarRange`, tool `studio.calendar.get`) muestra vuelos y posts, pero no lo planificado
  ni lo evergreen; el ADR pide una sola vista y un solo reader.

## Goal

- Experimentos gobernados con diseño, ejecución declarada, resultado capturado y conclusión `T2` por una persona.
- Aprendizajes inmutables con evidencia obligatoria, validación y retiro `T2`, consultables por alcance.
- Resultado de hipótesis visible junto al plan aprobado sin modificar la versión aprobada.
- Calendario unificado por el reader existente, con cada evento marcado como planificado, programado u observado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md` (**gobernante**: §4.7, §5,
  §8)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md` (§3 invariantes: programado ≠
  publicado, `null` = ausente)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md` (§9: cambiar la descripción de una tool existente
  es bump mayor del gateway)

Reglas obligatorias:

- **Un aprendizaje sin evidencia no existe:** proponerlo exige al menos una referencia de evidencia; la IA sólo recibe
  aprendizajes `validated`.
- **Append-only:** el contenido de un aprendizaje nunca cambia; corregirlo es proponer uno nuevo que lo supersede;
  validar y retirar son eventos.
- **La versión aprobada del plan no se toca:** el resultado de una hipótesis vive en `hypothesis_outcome`, fuera de la
  versión.
- **Experimento ≠ operación en plataformas:** declarar un experimento `running` no crea, pausa ni cambia nada en Meta,
  LinkedIn u otra plataforma.
- **Resultado con fuente:** el resultado se captura de readers de Studio (observaciones de pauta, métricas de TASK-1892,
  posts observados) con `dataThrough`; valores tipeados a mano se marcan `manual` con método declarado.
- **Calendario:** cada evento declara `planned | scheduled | observed`; programado nunca se muestra como publicado.

## Normative Docs

- `.claude/skills/efeonce-campaign-planning/SKILL.md` (hipótesis y variantes de prueba).
- `.claude/skills/growth-marketing-cro/SKILL.md` (diseño de experimentos y reglas de decisión).
- `.claude/skills/efeonce-marketing-studio/SKILL.md` (contrato de mantenimiento).
- `.claude/skills/efeonce-mcp-platform/SKILL.md` + `mcp-craft`.

## Contrato editorial SEO reconciliado — 2026-10-04

Calendario/experimentos referencian el trabajo editorial TASK-1667/TASK-1913 y su publicación
observada. Aprendizajes SEO usan outcomes TASK-1668 por referencia/as-of/metodología/cobertura;
no recalculan GSC/rank/AEO/ETV ni deducen causalidad. La siguiente iteración es un work item
Studio nuevo con parent/reason/evidence, nunca una producción o publicación automática.

Canon: ADR de estrategia Studio §14. Esta precisión documental no implementa ni cierra esta task.

## Dependencies & Impact

### Depends on

- `TASK-1907`: `plan_hypothesis`, `plan_kpi`, `plan_content_item` y su progreso.
- `TASK-1910`: `ad_performance_observation`, `getKpiProgress`; `TASK-1892`: métricas por campaña.
- `TASK-1899`: `T2` por MCP; `TASK-1905`: `channel_key` para el alcance.

### Blocks / Impacts

- TASK-1667/TASK-1913 para calendario/iteración y TASK-1668 para aprendizaje medido.

- `TASK-1909`: su contexto por campaña incluye aprendizajes `validated` con evidencia.
- `TASK-1912`: pinta experimentos, biblioteca y calendario unificado.
- `TASK-1895`/`TASK-1887`: la vista Calendario consume el mismo reader extendido (aditivo).

### Files owned

- Repo Studio: `packages/contracts/src/{experiments,learnings}.ts` [nuevos], `packages/contracts/src/dto.ts` (eventos del calendario), `packages/domain/src/experiments/**` [nuevo], `packages/domain/src/learnings/**` [nuevo], `packages/domain/src/commands/{experiment,learning}.ts` [nuevos], `packages/domain/src/readers/calendar.ts` (extensión), `packages/database/migrations/<ts>_experiments-learnings.sql` [nuevo], `packages/database/src/schema.ts`, `packages/contracts/src/operations.ts`, rutas `apps/web/src/app/api/v1/{campaigns/[campaignId]/experiments,experiments,learnings}/**`
- Greenhouse: `docs/mcp/skills/marketing-studio/SKILL.md`, docs de Studio
- Gateway: `package.json` (bump mayor por la descripción del calendario), `surface-baseline.json`

## Current Repo State

### Already exists

- `getCalendarRange` (`GET /api/v1/calendar?from&to`, tool `studio.calendar.get`) con vuelos y posts.
- Observación de posts por Metricool (TASK-1893) y `scheduled_post` programado ≠ publicado.

### Gap

- No hay experimentos, resultados de hipótesis ni aprendizajes.
- El calendario no incluye contenido planificado, evergreen ni ventanas de experimento.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-marketing-studio` (`packages/domain/src/{experiments,learnings}/**`, reader de calendario, rutas) + manual servido en Greenhouse + sync en `efeonce-mcp`
- Future candidate home: `remain-shared`
- Boundary: commands y readers en `packages/domain`; consumers: `/api/v1`, tools, contexto de IA de TASK-1909, UI de TASK-1912
- Server/browser split: dominio en servidor; el navegador consume `/api/v1`
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `studio.experiment`, `experiment_result_snapshot`, `hypothesis_outcome`, `learning`, `learning_event` (nuevas); reader de calendario
- Consumidores afectados: agentes, IA de TASK-1909, UI, vista Calendario vigente
- Runtime target: Studio staging/production; gateway

### Contract surface

- Contrato existente a respetar: `getCalendarRange` (compatibilidad: sin `kinds` devuelve lo de hoy más los tipos nuevos marcados; los campos existentes no cambian de significado)
- Contrato nuevo o modificado: operaciones de Detailed Spec; parámetro `kinds` y campo `status` por evento en el calendario
- Backward compatibility: `compatible` en datos; bump mayor del gateway por la descripción de `studio.calendar.get`
- Full API parity: todo por `/api/v1` y MCP

### Data model and invariants

- Entidades/tablas/views afectadas: nuevas de Detailed Spec §«Modelo»
- Invariantes que no se pueden romper:
  - `learning` inmutable (trigger); `learning_event` append-only
  - aprendizaje sin evidencia ⇒ `422 learning_evidence_required`
  - concluir experimento y validar/retirar aprendizaje exigen persona y digest
  - `hypothesis_outcome` nunca escribe en la versión aprobada del plan
  - variantes de un experimento pertenecen a la campaña del experimento
- Write-target allowlist: N/A (Studio)
- Tenant/space boundary: experimentos por campaña; aprendizajes por `organization_id` (nunca cruzan organizaciones)
- Idempotency/concurrency: `Idempotency-Key` + `If-Match` en experimentos; aprendizajes idempotentes por llave
- Audit/outbox/history: `audit_event` por command; eventos de aprendizaje como historia

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `STUDIO_EXPERIMENTS_ENABLED=false` (experimentos y aprendizajes); el calendario unificado sale con la task (aditivo)
- Backfill plan: ninguno; aprendizajes históricos sólo si una persona los propone con evidencia
- Rollback path: flag OFF; revert PR; tablas quedan
- External coordination: dispatch del gateway (bump mayor)

### Security and access

- Auth/access gate: lecturas `.campaign.read`; diseñar/iniciar/capturar experimento y proponer aprendizaje `.campaign.write` (`T1`); concluir, abandonar, validar y retirar `.campaign.approve` (`T2`, persona)
- Sensitive data posture: sin PII; evidencia por referencia
- Error contract: `learning_evidence_required`, `experiment_variant_invalid`, `experiment_not_running`, `hypothesis_not_in_approved_plan`, `confirmation_required`
- Abuse/rate-limit posture: tope de 20 experimentos activos por campaña

### Runtime evidence

- Local checks: tests de inmutabilidad, evidencia obligatoria, conclusión con digest, `hypothesis_outcome` fuera de la versión, calendario con los cinco tipos y estados
- DB/runtime checks: migración y triggers verificados
- Integration checks: canary MCP en `CMP-900`: hipótesis → experimento → resultado capturado de observaciones → conclusión con digest → aprendizaje propuesto → validado → aparece en el contexto de TASK-1909
- Reliability signals/logs: frescura `experiments_overdue` (experimentos `running` con ventana vencida sin conclusión)
- Production verification sequence: ver Rollout Plan

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo. (Studio: N/A declarado.)
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en `packages/domain/src/{experiments,learnings}/**`.
- [ ] Recursos y commands con `riskTier`.
- [ ] Sin capability nueva (`.campaign.read/.write/.approve`).
- [ ] Camino programático: `/api/v1` + tools federadas.
- [ ] `T2` con digest y persona.
- [ ] Un primitive, muchos consumers (UI, agentes, contexto de IA).
- [ ] Parity check = SÍ.

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

### Slice 1 — Modelo

- Migración `<ts>_experiments-learnings.sql` con las tablas de Detailed Spec, triggers de inmutabilidad
  (`learning`, `experiment_result_snapshot`) y bloque `DO`.

### Slice 2 — Experimentos

- Commands `upsertExperimentDesign` (`T1`: hipótesis del plan **aprobado**, variantes con `kind` y ref de la misma
  campaña, KPI primario, regla de decisión literal + umbral opcional, ventana), `startExperiment` (`T1`: declara
  `running` desde una fecha, sin tocar plataformas), `captureExperimentResult` (`T1`: lee readers de Studio por variante
  y guarda un snapshot inmutable con fuente y `dataThrough`; `manual` exige método), `concludeExperiment` (`T2`:
  veredicto `supported | refuted | inconclusive` + nota de confianza; escribe `hypothesis_outcome`) y
  `abandonExperiment` (`T2`).

### Slice 3 — Biblioteca de aprendizajes

- Commands `proposeLearning` (`T1`: enunciado literal, alcance, evidencia ≥ 1, confianza, `supersedes` opcional,
  procedencia de TASK-1909 si lo redacta un agente), `validateLearning` y `retireLearning` (`T2`, persona, digest).
- Readers `listLearnings` (filtros por alcance y estado; por defecto `validated`) y `getLearning` (con evidencia y
  cadena de supersesión).
- Enganche con TASK-1909: la sección de aprendizajes del contexto por campaña lee `validated` filtrados por alcance.

### Slice 4 — Calendario unificado

- `getCalendarRange` agrega `kinds ∈ {flight, organic_post, planned_content, evergreen_content, experiment_window}`
  (por defecto todos) y `status ∈ {planned, scheduled, observed}` por evento; `planned_content` desde ítems activos del
  plan aprobado (y borrador marcado), `evergreen_content` = ítems de canales `owned` sin ventana de campaña.
- Descripción de `studio.calendar.get` actualizada con `mcp-craft` (bump mayor del gateway declarado).

### Slice 5 — Exposición, gateway, canary y docs

- Rutas, registro con `riskTier`, manifiesto, sync del gateway con bump mayor, `surface:baseline`, dispatch.
- Manual servido (experimentos y aprendizajes: cuándo proponer, por qué la evidencia es obligatoria), docs de Studio,
  ledger de flags, skills.

## Out of Scope

- Ejecutar pruebas A/B en plataformas publicitarias (ADR de escritura aparte).
- Estadística avanzada (potencia, secuencial bayesiano); la regla de decisión es declarada y literal.
- UI (TASK-1912).
- Compartir aprendizajes entre organizaciones.

## Detailed Spec

### Modelo

| Tabla | Columnas clave |
|---|---|
| `experiment` | `experiment_id PK`, `campaign_id`, `hypothesis_id`, `plan_version_no`, `name`, `variants jsonb` (`[{variantKey, kind asset\|copy\|audience\|landing, ref}]`), `primary_kpi_id`, `decision_rule`, `threshold jsonb NULL`, `window_starts_on`, `window_ends_on`, `status design\|running\|concluded\|abandoned`, `verdict NULL`, `confidence_note NULL`, `decided_by NULL`, `decided_at NULL`, `revision` |
| `experiment_result_snapshot` | `snapshot_id PK`, `experiment_id`, `values jsonb` (por variante: métrica, valor, fuente, `dataThrough`), `method observed\|manual`, `manual_method NULL`, `captured_at`, `captured_by` |
| `hypothesis_outcome` | `(campaign_id, hypothesis_id) PK`, `status open\|supported\|refuted\|inconclusive`, `experiment_ids text[]`, `updated_at` |
| `learning` | `learning_id PK`, `organization_id`, `statement`, `scope jsonb` (`channelKeys`, `segmentIds`, `personaIds`, `bowtieStage`, `funnelPhase`, `formatKeys`), `evidence jsonb` (`[{kind experiment\|observation\|seo_snapshot\|post_observation, ref, asOf}]`), `confidence`, `supersedes NULL`, `provenance_id NULL`, `proposed_by`, `created_at` |
| `learning_event` | `event_id PK`, `learning_id`, `kind validated\|retired`, `person_actor`, `reason NULL`, `at` |

### Operaciones y tools

| operationId | Método y ruta | Tool | Nivel |
|---|---|---|---|
| `listExperiments` · `getExperiment` | `GET /api/v1/campaigns/{campaignId}/experiments` · `GET /api/v1/experiments/{experimentId}` | `studio.campaign.experiments.list` · `studio.experiment.get` | T0 |
| `upsertExperimentDesign` | `PUT /api/v1/campaigns/{campaignId}/experiments/{experimentId}` | `studio.experiment.design.upsert` | T1 |
| `startExperiment` | `POST /api/v1/experiments/{experimentId}/start` | `studio.experiment.start` | T1 |
| `captureExperimentResult` | `POST /api/v1/experiments/{experimentId}/results` | `studio.experiment.result.capture` | T1 |
| `concludeExperiment` · `abandonExperiment` | `POST /api/v1/experiments/{experimentId}/conclude` · `…/abandon` | `studio.experiment.conclude` · `studio.experiment.abandon` | T2 (persona) |
| `listLearnings` · `getLearning` | `GET /api/v1/learnings?organizationId=&…` · `GET /api/v1/learnings/{learningId}` | `studio.learnings.list` · `studio.learning.get` | T0 |
| `proposeLearning` | `POST /api/v1/learnings` | `studio.learning.propose` | T1 |
| `validateLearning` · `retireLearning` | `POST /api/v1/learnings/{learningId}/validate` · `…/retire` | `studio.learning.validate` · `studio.learning.retire` | T2 (persona) |
| `getCalendarRange` (extendida) | `GET /api/v1/calendar?from&to&kinds=` | `studio.calendar.get` | T0 |

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1907 y TASK-1910 en producción → Slice 1 → Slices 2 y 3 → Slice 4 (puede adelantarse tras Slice 1 porque es
  aditivo) → Slice 5.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Aprendizajes sin rigor alimentan a la IA | calidad de IA | medium | evidencia obligatoria + validación `T2` + sólo `validated` en contexto | tasa de retiro |
| Confundir planificado con publicado en el calendario | lectura | medium | `status` por evento; descripción de tool | revisión del canary |
| Bump mayor del gateway sorprende a clientes | agentes | low | declarado; descripción nueva probada con `mcp-craft` | canary MCP |

### Feature flags / cutover

- `STUDIO_EXPERIMENTS_ENABLED` (Vercel de Studio; default `false`); fila en el ledger. El calendario unificado no tiene
  flag (aditivo; rollback por revert).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slices 1–3 | flag OFF; revert PR; tablas quedan | < 15 min | sí |
| Slice 4 | revert PR (el reader vuelve a vuelos y posts) | < 15 min | sí |
| Slice 5 | revert del sync + dispatch | < 30 min | sí |

### Production verification sequence

1. Migración y triggers en staging.
2. Canary MCP completo en `CMP-900` (ver Runtime evidence).
3. Calendario de staging muestra los cinco tipos con estado correcto.
4. Production con flag OFF → ON tras un release.

### Out-of-band coordination required

- Dispatch del gateway con bump mayor.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Calendario editorial distingue planned/scheduled/observed desde evidencia 1667, sin marcar publicado por aprobación o draft privado.
- [ ] Aprendizaje SEO referencia outcome1668 con as-of/método/cobertura y loop parcial si falta conversión; sin recálculo ni causalidad automática.
- [ ] Iteración recomendada abre trabajo Studio por el command dueño con parent/reason/evidence; no autoedita contenido ni publica.

- [ ] Un experimento sólo nace de una hipótesis del plan aprobado y con variantes de su campaña.
- [ ] El resultado se captura desde readers de Studio con fuente y `dataThrough`, o como `manual` con método.
- [ ] Concluir exige persona y digest y actualiza `hypothesis_outcome` sin tocar la versión aprobada.
- [ ] Proponer un aprendizaje sin evidencia responde `422 learning_evidence_required`.
- [ ] Un aprendizaje no se puede modificar; corregir crea uno nuevo que lo supersede.
- [ ] Validar y retirar exigen persona y digest; sólo `validated` aparece en el contexto de TASK-1909.
- [ ] El calendario devuelve los cinco tipos con `planned | scheduled | observed` y nunca marca publicado sin observación.
- [ ] Operaciones en el registro con `riskTier`, federadas; sesión MCP real verde.

## Verification

- Studio: `pnpm check` + `pnpm build`.
- Gateway: tests + `pnpm surface:baseline` (bump mayor).
- Canary MCP en staging y production.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Skill `efeonce-marketing-studio` actualizada (contrato de mantenimiento) y espejada.
- [ ] `EPIC-049` refleja el estado de esta task.

## Follow-ups

- Pruebas A/B nativas en plataformas (requiere ADR de escritura).
- Aprendizajes compartidos a nivel programa.

## Open Questions

- ¿Validar un aprendizaje exige `.campaign.approve` o basta `.campaign.write`? Por defecto `.campaign.approve` (es una decisión que alimenta a la IA); confirmar con el operador.
