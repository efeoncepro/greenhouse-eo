# TASK-1275 — Growth AI Visibility: Recommendation Execution-Status Capability

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

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
- Backend impact: `migration`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `task/TASK-1275-aeo-recommendation-execution-status`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea el contrato gobernado de **estado de ejecución de las recomendaciones del Plan AEO** (por organización × recomendación): un operador de Efeonce marca cada foco como `not_started | in_progress | done | dismissed`, con audit append-only + outbox. Es la capa backend que falta para que la vista cliente del informe AEO (TASK-1248, `/aeo`) muestre el status del "Plan AEO" (hoy V1 sin status) y para que la vista operador (TASK-1276) lo edite.

## Why This Task Exists

TASK-1248 cerró la vista cliente reencuadrando las recomendaciones como **"Plan AEO" / "Foco del plan"** (servicio done-for-you: el cliente ya contrató AEO, no es su to-do — `Tu equipo de Efeonce está trabajando este foco contigo`). Pero hoy NO existe persistencia del estado de cada foco: la vista cliente no puede mostrar "en curso / hecho" y el operador no tiene dónde registrarlo. El estado de ejecución es un **dato gobernado** (afecta lo que el cliente ve sobre el servicio que paga), no UI-state efímero → debe nacer como contrato server-side (Full API Parity), no como flag dentro de un componente.

## Goal

- Tabla canónica de estado de ejecución por `organization_id` × recomendación (gap key) × grader run, con state machine + CHECK + audit trio.
- Command gobernado `setRecommendationStatus` (capability + grant en el mismo PR, tenant-safe, idempotente, audit + outbox, errores canónicos) y reader `readRecommendationStatuses`.
- Contrato consumible por la vista cliente (read-only del status) y por la vista operador (write) — TASK-1276 — sin lógica duplicada por consumer.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` (Organización → `greenhouse_core.organizations`)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` (un primitive, muchos consumers)
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` (state-machine + CHECK + audit trio · outbox + reactive · capability ⇒ grant + coverage)
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (dominio grader: scoring, recomendaciones, gap keys)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` (capability governance)

Reglas obligatorias:

- La regla de negocio vive en `src/lib/growth/ai-visibility/**` (command + reader), NUNCA dentro de un componente UI.
- Capability nueva + grant a ≥1 rol real en el MISMO PR (guard `src/lib/entitlements/capability-grant-coverage.test.ts`).
- Migration con marker `-- Up Migration` + bloque DO de verificación post-DDL (anti pre-up-marker bug); CHECK constraint para el enum de status.
- Tenant-safe: el status se ancla a `organization_id`; un operador solo puede escribir sobre orgs en su scope; el cliente solo lee el status de SU org (espeja `requireClientTenantContext` de TASK-1248).
- Escritura apta para `propose → confirm → execute` (runtime de acción gobernada Nexa); el LLM nunca escribe directo.

## Normative Docs

- `docs/tasks/complete/TASK-1248-growth-ai-visibility-client-report-ui.md` (recomendaciones = gap keys del `RecommendationGapKey`; reframe "Plan AEO")
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (registrar el evento outbox nuevo)

## Dependencies & Impact

### Depends on

- `greenhouse_core.organizations` (FK del status) — existe.
- `RecommendationGapKey` / contrato de recomendaciones del grader en `src/lib/growth/ai-visibility/**` `[verificar el path exacto del enum de gap keys]`.
- `capabilities_registry` (DB) + `src/lib/entitlements/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts`.

### Blocks / Impacts

- **TASK-1276** (vista operador AEO en Growth + Account 360) — consume el command (write) + reader.
- **TASK-1248** (vista cliente `/aeo`) — su follow-up de mostrar status consume el reader (read-only).

### Files owned

- `migrations/<timestamp>_task-1275-aeo-recommendation-status.sql`
- `src/lib/growth/ai-visibility/recommendation-status.ts` (command + reader) `[verificar naming definitivo]`
- `src/lib/entitlements/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts` (capability + grant) — edición acotada
- `src/app/api/**` ruta del command `[verificar lane: product API interna vs api/platform]`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (Delta del contrato de status)

## Current Repo State

### Already exists

- Vista cliente `/aeo` (TASK-1248) con el "Plan AEO" reencuadrado pero **sin** status persistido.
- Modelo de reporte + recomendaciones (gap keys) del grader; reader client-scoped vía boundary del portal (TASK-1243).
- Infra canónica: capabilities registry + entitlements, outbox publisher (Cloud Scheduler), audit pattern.

### Gap

- No hay tabla ni contrato de estado de ejecución de recomendaciones.
- La vista cliente no puede comunicar avance del Plan AEO; el operador no tiene dónde registrarlo.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration` (+ `command` + `reader`)
- Source of truth afectado: nueva tabla `greenhouse_growth.grader_recommendation_status` (+ audit log)
- Consumidores afectados: UI operador (TASK-1276, write) · UI cliente (TASK-1248, read) · Nexa/MCP (por construcción)
- Runtime target: `local|staging|production`

### Contract surface

- Contrato existente a respetar: reader client-scoped del reporte (TASK-1243) + `RecommendationGapKey`.
- Contrato nuevo: command `setRecommendationStatus({ organizationId, recommendationKey, status, reason? })` + reader `readRecommendationStatuses(organizationId)` + evento outbox `growth.ai_visibility.recommendation_status_changed`.
- Backward compatibility: `compatible` (additive; sin status, la UI degrada a "sin seguimiento aún").
- Full API parity: la regla vive en `src/lib/growth/ai-visibility/**`; UI/Nexa/MCP son clientes del mismo command/reader.

### Data model and invariants

- Entidades/tablas afectadas: `greenhouse_growth.grader_recommendation_status` (current-state) + `greenhouse_growth.grader_recommendation_status_history` (append-only) `[verificar schema greenhouse_growth]`.
- Invariantes:
  - `status` ∈ `{not_started, in_progress, done, dismissed}` (CHECK constraint).
  - Una fila current-state por `(organization_id, recommendation_key)`; las transiciones son append-only en el history (NUNCA UPDATE destructivo del history).
  - El status pertenece a una `organization_id` cliente; jamás se materializa para un perfil sin org enlazada.
- Tenant/space boundary: write gated por capability + scope de org del operador; read client-scoped por `requireClientTenantContext` (cliente) o por scope de org (operador).
- Idempotency/concurrency: command idempotente por `(organization_id, recommendation_key, status)`; transición dentro de `withTransaction` (current-state + history + outbox atómicos).
- Audit/outbox/history: history append-only + evento outbox (reactive/Nexa). Sin borrar filas.

### Migration, backfill and rollout

- Migration posture: `additive` (2 tablas nuevas + CHECK + GRANTs).
- Default state: `enabled` (additive; sin filas, la UI muestra "sin seguimiento"). El consumo en UI llega gateado por sus propias tasks (1276 / follow-up 1248).
- Backfill plan: ninguno (nace vacío; el estado lo genera el operador).
- Rollback path: `reverse migration` (DROP TABLE de las 2 tablas nuevas) — reversible, sin data productiva al inicio.
- External coordination: ninguna (repo-only + migración).

### Security and access

- Auth/access gate: capability `growth.ai_visibility.recommendation.set_status` (write, roles internos operador) + read gateado por org scope / capability de lectura del informe.
- Sensitive data posture: sin PII (gap keys + status + org_id); `reason` opcional es texto operativo, no sensible.
- Error contract: `canonicalErrorResponse` + `captureWithDomain(err, 'growth', …)`; sin prosa cruda inglesa al cliente.
- Abuse/rate-limit posture: write gated por capability + idempotencia; sin rate-limit dedicado (volumen bajo, operador interno).

### Runtime evidence

- Local checks: focal tests del command (transición + idempotencia + boundary) + `capability-grant-coverage.test.ts` verde.
- DB/runtime checks: `pnpm migrate:up` + verify tablas/CHECK/GRANTs via `information_schema`; smoke del command contra PG real (proxy) — patrón ISSUE-071/TASK-893.
- Integration checks: evento outbox publicado (state machine pending→published) en dev.
- Reliability signals/logs: reusar la observabilidad del outbox; opcional signal de status-write failed.
- Production verification sequence: migrate staging → verify → deploy → smoke command via agent → repetir en prod.

### Acceptance criteria additions

- [ ] Source of truth (`greenhouse_growth.grader_recommendation_status` + history), contract surface (command + reader + evento) y consumers nombrados con paths reales.
- [ ] Invariantes (enum CHECK, append-only history, una fila por org×rec), tenant boundary e idempotencia explícitos.
- [ ] Migration additive + rollback (DROP) explícito; bloque DO de verificación post-DDL.
- [ ] DB/runtime evidence listada (migrate verify + smoke command).
- [ ] Capability + grant en el mismo PR + coverage test verde; errores canónicos; sin leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema + state machine + audit

- Migration additive: `grader_recommendation_status` (current-state) + `grader_recommendation_status_history` (append-only) + CHECK del enum + GRANTs runtime + bloque DO de verificación.
- Regenerar `src/types/db.d.ts`.

### Slice 2 — Command + reader + capability/grant

- `setRecommendationStatus` (write gobernado: capability, tenant-safe, idempotente, `withTransaction` current+history+outbox, errores canónicos).
- `readRecommendationStatuses(organizationId)` (reader canónico).
- Capability `growth.ai_visibility.recommendation.set_status` en registry (DB seed) + catalog TS + grant a ≥1 rol operador real en `runtime.ts` (mismo PR) + coverage test.
- Evento outbox `growth.ai_visibility.recommendation_status_changed` en el event catalog.

### Slice 3 — API surface (parity) + tests

- Ruta del command `[verificar lane: product API interna]` + reader expuesto para los consumers.
- Focal tests: transición, idempotencia, boundary (org ajena rechazada), enum CHECK, leak-safe.

## Out of Scope

- UI operador (TASK-1276) y UI cliente del status (follow-up TASK-1248): esta task es SOLO el contrato backend.
- Métricas/analytics de avance del plan, notificaciones al cliente, SLA del plan.
- Re-scoring o cambio del modelo de recomendaciones (gap keys) del grader.

## Detailed Spec

State machine canónica (sin orden forzado entre estados; cualquier transición es válida y queda en el history):

```text
not_started <-> in_progress <-> done
"dismissed" alcanzable desde cualquier estado (foco descartado por el equipo, con reason)
```

- `grader_recommendation_status(organization_id, recommendation_key, status, updated_by, updated_at, reason)` UNIQUE`(organization_id, recommendation_key)`.
- `grader_recommendation_status_history(...append-only..., changed_by, changed_at, from_status, to_status, reason)`.
- El command hace UPSERT del current-state + INSERT del history + INSERT outbox, todo en una tx.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (schema) → Slice 2 (command/reader/capability) → Slice 3 (API/tests). El command no existe sin la tabla; el grant viaja con la capability en Slice 2.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Capability sin grant (build rojo) | identity/entitlements | medium | grant + coverage test en el mismo PR (Slice 2) | `capability-grant-coverage.test.ts` |
| Write de org ajena | growth/access | low | boundary tenant-safe + focal test de rechazo | error canónico + captureWithDomain |
| Migration silent (pre-up-marker) | migration | low | bloque DO RAISE EXCEPTION post-DDL + verify `information_schema` | migrate verify falla |

### Feature flags / cutover

- Sin flag: additive (tabla vacía + capability nueva). El consumo en UI llega gateado por TASK-1276 / follow-up 1248. Cutover inmediato seguro.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | reverse migration (DROP de las 2 tablas) | <5 min | sí (sin data productiva al inicio) |
| Slice 2 | revert PR (capability/command) | <10 min | sí |
| Slice 3 | revert PR (ruta API) | <5 min | sí |

### Production verification sequence

1. `pnpm migrate:up` staging + verify tablas/CHECK/GRANTs.
2. Deploy staging + smoke command via agent (set status + read back + history append).
3. Verify evento outbox publicado.
4. Repetir en prod con cooldown.

### Out-of-band coordination required

- N/A — repo-only change + migración.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `greenhouse_growth.grader_recommendation_status` + history (append-only) con CHECK del enum y GRANTs runtime; migración con bloque DO de verificación.
- [ ] `setRecommendationStatus` es tenant-safe, idempotente, atómico (current+history+outbox) y emite errores canónicos.
- [ ] `readRecommendationStatuses` devuelve el status por recomendación de una org; degrada honesto cuando no hay filas.
- [ ] Capability `growth.ai_visibility.recommendation.set_status` registrada (DB + TS) + grant a ≥1 rol operador real + coverage test verde.
- [ ] Evento outbox `growth.ai_visibility.recommendation_status_changed` en el event catalog y publicándose en dev.
- [ ] Sin lógica duplicada: UI/Nexa/MCP consumen el mismo command/reader (Full API Parity).

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm migrate:up` + verify `information_schema` + smoke del command contra PG real (proxy)

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomar, `complete` al cerrar)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1276, TASK-1248)
- [ ] Delta en `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` con el contrato de status

## Follow-ups

- TASK-1248 follow-up: mostrar el status en la vista cliente `/aeo` (read-only del reader).
- TASK-1276: vista operador que escribe el status.

## Open Questions

- Lane del API del command (`Product API interna` vs `api/platform/app`): resolver en Discovery.
- ¿`reason` obligatorio al `dismissed`? (probable sí, para trazabilidad del descarte).
