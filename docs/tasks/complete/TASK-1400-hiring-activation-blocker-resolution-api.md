# TASK-1400 — Hiring Activation Blocker Resolution API

## Delta 2026-07-13 — Blocker stale resuelto antes de ejecución

- `TASK-770` ya vive en `docs/tasks/complete/` y el bridge de Hiring Activation existe en `develop`; el bloqueo declarado era histórico.
- Esta task queda desbloqueada para implementar el contrato backend/API de resolución de blockers como follow-up de TASK-1368, sin simular resolución client-side.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
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
- Epic: `EPIC-011`
- Status real: `Complete 2026-07-13; reader actionable + command + API resolve-blocker + audit redacted implementados y validados localmente`
- Rank: `TBD`
- Domain: `hr|agency|data`
- Blocked by: `none`
- Branch: `develop`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Entrega el contrato backend/API para **resolver blockers de Hiring Activation con payloads ricos y seguros**, en vez de que la UI de TASK-1368 simule resolución local. Extiende el bridge de TASK-770 con un reader de blockers accionables y un command gobernado `resolveHiringActivationBlocker`, devolviendo siempre el detail fresco y auditado.

## Why This Task Exists

La UI fuente de TASK-1368 incluye acciones tipo "resolver blocker" para contrato, datos legales y plantilla de onboarding, pero el runtime real de TASK-770 sólo expone `review`, `create-member`, `open-onboarding`, `complete` y `cancel`. Implementar ese botón en UI sin un command real crearía una promesa falsa y rompería Full API Parity.

El gap correcto es backend: cada blocker debe declarar qué se puede resolver, qué payload requiere, qué capability gobierna la acción, qué primitive canonical ejecuta la reparación y qué evidencia/audit queda. La UI debe ser consumidora del contrato, no dueña de la lógica.

## Goal

- Exponer un reader de blockers accionables para `HiringActivationDetail` con payloads ricos por tipo de blocker/readiness lane.
- Implementar un command gobernado e idempotente para resolver blockers soportados sin duplicar lógica de HRIS, legal profile, templates ni Workforce Activation.
- Devolver errores canónicos y estados `not_resolvable` cuando el blocker requiere otra surface o revisión humana.
- Habilitar a TASK-1368 y Nexa a operar la misma capacidad por Full API Parity.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/tasks/complete/TASK-770-hiring-to-hris-collaborator-activation.md`
- `docs/tasks/in-progress/TASK-1368-hiring-activation-lane-ui.md`

Reglas obligatorias:

- La UI no resuelve blockers por mutación local ni infiere readiness; consume el reader/command server-side.
- El command no reimplementa Workforce Activation, person legal profile, onboarding templates ni identity merge; delega a primitives existentes o falla cerrado.
- Cada blocker declara payload schema, capability requerida, acción soportada, surface alternativa y evidencia/audit.
- Ningún payload expone ni acepta `value_full` de PII sensible; datos legales siguen bajo person-legal-profile y reveal auditado.
- `readyToActivate` sigue derivado live desde `resolveWorkforceActivationReadiness`; no se persiste un estado paralelo.
- Full API Parity: el mismo primitive debe servir a UI, Nexa y futuros consumers programáticos.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/context/00_INDEX.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-770` — bridge actual, APIs y estado `HiringActivationRequest`.
- `src/lib/workforce/hiring-activation/**`
- `src/app/api/hr/hiring-activation/**`
- `src/lib/workforce/activation/readiness.ts`
- `src/lib/person-legal-profile/**`
- `src/lib/hr-onboarding/**`
- `src/lib/entitlements/**`

### Blocks / Impacts

- Desbloquea la versión real de "resolver blocker" para TASK-1368.
- Permite que Nexa opere resolución de blockers con `propose → confirm → execute`.
- Reduce operación manual de People Ops para blockers recuperables de legal data/template/onboarding/member conflict.

### Files owned

- `src/lib/workforce/hiring-activation/**`
- `src/app/api/hr/hiring-activation/[id]/**`
- `src/lib/copy/hiring.ts` o `src/lib/copy/dictionaries/{es-CL,en-US}/hiringActivation.ts` si se agrega copy reutilizable de códigos
- Tests focales bajo `src/lib/workforce/hiring-activation/**` y `src/app/api/hr/hiring-activation/**`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` si el contract final agrega una delta relevante

## Current Repo State

### Already exists

- `listHiringActivationQueue()` y `getHiringActivationDetail()` devuelven cola/detail con request y readiness live.
- APIs actuales: `review`, `create-member`, `open-onboarding`, `complete`, `cancel`.
- Estados/request blockers actuales: `pending_hr_review|blocked|member_created|onboarding_open|active|cancelled` y razones estables `ambiguous_identity|member_conflict|member_already_active|onboarding_template_missing|handoff_not_approved|legal_data_missing`.
- Workforce readiness ya produce lanes/checks para completar ficha laboral.
- Person legal profile y HR onboarding templates ya tienen primitives propios.

### Gap

- No existe reader de blockers accionables con payload schema/acciones/capabilities.
- No existe `resolveHiringActivationBlocker` ni endpoint equivalente.
- La UI de TASK-1368 sólo puede mostrar remediación informativa; no puede ejecutar resolución real sin inventar lógica.
- No existe contrato programático para que Nexa proponga/resuelva blockers recuperables.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/lib/workforce/hiring-activation/**` plus the existing `src/app/api/hr/hiring-activation` route-handler tree inside the Next.js portal.
- Future candidate home: `domain-package`
- Boundary: `resolveHiringActivationBlocker` command + `listHiringActivationBlockers`/detail enrichment; consumers autorizados son UI TASK-1368, Nexa y API routes gobernadas.
- Server/browser split: DTO/schema browser-safe en archivo sin `server-only`; DB, legal profile, onboarding, readiness y entitlements quedan server-side.
- Build impact: `none` beyond existing Next.js API/runtime.
- Extraction blocker: transacciones DB y capability/session context comparten runtime con HRIS/Hiring hasta una extracción domain-package autorizada.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `src/lib/workforce/hiring-activation/**` como bridge; readiness y dominios vecinos como primitives delegados.
- Consumidores afectados: TASK-1368 UI, Nexa/governed actions, APIs internas HR.
- Runtime target: `local|staging|production`

### Contract surface

- Contrato existente a respetar: `getHiringActivationDetail`, `HiringActivationRequest`, `resolveWorkforceActivationReadiness`, APIs `/api/hr/hiring-activation/[id]/[action]`.
- Contrato nuevo o modificado:
  - Reader/enrichment: `listHiringActivationBlockers(detail)` o field `blockers` en detail con discriminated union browser-safe.
  - Command: `resolveHiringActivationBlocker({ hiringHandoffId, blockerKey, action, payload, actorUserId, reason })`.
  - Endpoint: `POST /api/hr/hiring-activation/[id]/resolve-blocker` o extension equivalentemente gobernada bajo `[action]`.
  - Response: refreshed `HiringActivationDetail` con blockers/readiness actualizados.
- Backward compatibility: `compatible`; additive detrás de `HIRING_ACTIVATION_ENABLED`.
- Full API parity: UI y Nexa llaman el mismo command; ningún click-handler ni tool construye su propia resolución.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_hr.hiring_activation_request` y su audit/event trail existente; dominios delegados según blocker.
- Invariantes que no se pueden romper:
  - No crear ni activar `member` fuera de los commands de TASK-770/Workforce.
  - No escribir PII legal sensible desde payload no gobernado ni exponer `value_full`.
  - No resolver `ambiguous_identity` con auto-merge silencioso.
  - No marcar `readyToActivate` persistido; siempre deriva live.
  - `complete` sigue exigiendo evidencia/readiness; resolver blocker no activa por side effect.
- Tenant/space boundary: se deriva de `requireInternalTenantContext()` y capabilities; `space_id`/org salen del handoff/request, nunca del payload arbitrario.
- Idempotency/concurrency: command state-safe por `hiring_handoff_id + blockerKey + action + normalized payload digest`; row lock sobre activation request al auditar; los commands delegados no duplican member/onboarding. El audit registra intentos con digest redacted para trazabilidad.
- Audit/outbox/history: append en activation events/audit con actor, blockerKey, action, payload redacted digest y resultado; outbox sólo si un dominio delegado ya emite evento o si se agrega evento bridge justificado.

### Migration, backfill and rollout

- Migration posture: `none` por defecto; si el audit trail actual no permite payload redacted/digest, migration additive menor.
- Default state: hereda `HIRING_ACTIVATION_ENABLED`; sin flag nuevo salvo que el executor identifique riesgo operativo.
- Backfill plan: N/A; blockers se resuelven on-demand.
- Rollback path: revert PR o deshabilitar `HIRING_ACTIVATION_ENABLED`; si hay migration additive, dejar columnas/tables sin uso hasta cleanup posterior.
- External coordination: People Ops sign-off sobre copy/acciones soportadas; no requiere proveedor externo.

### Security and access

- Auth/access gate:
  - Read/review: `hiring.activation.review`
  - Member/intake-affecting actions: `workforce.member.intake.update`
  - Onboarding/template actions: `hr.onboarding_instance` o capability específica vigente del primitive delegado
  - Legal data actions: capability vigente de person legal profile; reveal/escritura con reason auditado
- Sensitive data posture: PII/legal data redacted; payloads guardan hashes/resúmenes, no valores completos.
- Error contract: errores canónicos `hiring_activation_blocker_not_resolvable`, `hiring_activation_blocker_payload_invalid`, `hiring_activation_blocker_capability_required`, `hiring_activation_blocker_stale`, sin raw errors; `captureWithDomain(error,'workforce')`.
- Abuse/rate-limit posture: sesión interna + capability; no endpoint público. Reintentos idempotentes; stale blocker devuelve 409 con detail fresco.

### Runtime evidence

- Local checks: tests unitarios del discriminated union de blockers, command idempotente, capability gates y canonical errors.
- DB/runtime checks: smoke local/staging con un caso por blocker soportado o fixtures controlados; verify audit event redacted.
- Integration checks: legal profile/onboarding/workforce delegated commands mock/focal + al menos un smoke real para blocker template/legal si hay data.
- Reliability signals/logs: usar existing `workforce.hiring_activation_stuck`; agregar signal sólo si se introduce nueva cola/estado persistente.
- Production verification sequence:
  1. Deploy con flag existente OFF/estado actual y verificar APIs actuales sin cambio.
  2. Staging con `HIRING_ACTIVATION_ENABLED=true` y handoff fixture.
  3. Ejecutar `resolve-blocker` soportado → audit redacted → detail refrescado.
  4. Ejecutar stale/forbidden/invalid payload → 409/403/400 canónicos.
  5. Verificar TASK-1368 consume el payload sin lógica duplicada.

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk.
- [x] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [x] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [x] Lógica en el primitive, no en la UI.
- [x] Modelada como command/reader gobernado, no como click-handler acoplado.
- [x] Read expuesto como reader/recurso canónico; write como command con authorization fina, idempotencia, audit, errores sanitizados y observabilidad.
- [x] Capability + grant en el MISMO PR si se agrega un gate nuevo; si se reusan capabilities existentes, coverage test lo prueba.
- [x] Camino programático declarado para UI y Nexa.
- [x] Write apto para `propose → confirm → execute`.
- [x] Un primitive, muchos consumers.
- [x] Parity check = SÍ.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

## Execution Plan 2026-07-13 — Codex

- Confirmar bloqueo stale: `TASK-770` vive en `complete/`, por lo que TASK-1400 queda desbloqueada.
- Slice 1: agregar contrato browser-safe `HiringActivationActionableBlocker` + derivador puro `deriveHiringActivationBlockers`.
- Slice 2: enriquecer `getHiringActivationDetail()` con `blockers[]` sin persistir readiness.
- Slice 3: implementar `resolveHiringActivationBlocker` server-side con stale-check, payload normalization, digest SHA-256 y audit redacted.
- Slice 4: extender el route-handler `[action]` con `resolve-blocker` y gate por action contract.
- Slice 5: cubrir happy path, not_resolvable, stale, payload digest, forbidden/action-specific gate y boundary.

Decisiones de scope:

- No se agrega migration ni flag nuevo: la capacidad hereda `HIRING_ACTIVATION_ENABLED`.
- V1 no escribe legal profile ni templates; sólo reintenta primitives existentes después de que la surface dueña haya corregido la causa.
- El payload V1 permitido es deliberadamente estrecho (`reason` opcional) para evitar PII/legal values en este endpoint.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Blocker contract and reader

- Definir un contrato browser-safe discriminated union para blockers: `key`, `source`, `severity`, `status`, `resolvable`, `allowedActions`, `requiredPayload`, `requiredCapability`, `targetSurface`, `copyKey`, `evidence`.
- Enriquecer `getHiringActivationDetail` o agregar reader hermano para devolver blockers accionables sin duplicar readiness.
- Mapear blockers actuales de request y lanes de readiness a payloads ricos.

### Slice 2 — Governed resolve command

- Implementar `resolveHiringActivationBlocker` con validación por blocker/action/payload.
- Delegar a primitives existentes para acciones soportadas; devolver `not_resolvable` para blockers que requieren otra surface/humano.
- Garantizar idempotencia, lock y stale-check antes de mutar.

### Slice 3 — API route and capability gates

- Exponer endpoint interno gobernado para resolución.
- Aplicar capabilities por acción delegada; no usar `admin` coarse.
- Normalizar errores canónicos y payload redaction.

### Slice 4 — Audit, tests and parity

- Registrar audit/event redacted con digest de payload.
- Tests focales de happy path, stale blocker, forbidden, invalid payload, no PII leak e idempotencia.
- Documentar consumo desde TASK-1368/Nexa como same primitive.

## Out of Scope

- No implementa la UI de TASK-1368.
- No crea una nueva surface de legal profile, template editor o Workforce Activation.
- No auto-mergea identidades ni resuelve conflictos ambiguos sin humano.
- No cambia el estado `complete` del bridge ni activa miembros por side effect.
- No introduce payroll, compensation ni access provisioning.

## Detailed Spec

Payload mínimo esperado por blocker:

- `legal_data_missing`: acción soportada sólo si existe primitive legal profile apto; payload redacted y reason obligatorio. Si no, `not_resolvable` con `targetSurface`.
- `onboarding_template_missing`: V1 no acepta `templateId`; devuelve `retry-open-onboarding` para reintentar `createOnboardingInstance` después de que la plantilla exista/corrija en su surface dueña.
- `member_conflict` / `ambiguous_identity`: V1 devuelve `retry-create-member` para reintentar el primitive source-neutral después de que People/Identity corrija el conflicto; nunca auto-merge.
- `member_already_active`: V1 devuelve `retry-create-member` como retry seguro; si sigue activo/conflictivo, el bridge queda blocked y auditado.
- `handoff_not_approved`: no resolvable desde activation; retorna acción hacia handoff/desk.
- Readiness lanes adicionales: contract/legal_entity/manager/payment/external_identity se mapean a `targetSurface` o command delegado si existe un primitive canónico.

La respuesta del command debe incluir:

- `detail`: refreshed HiringActivationDetail
- `blocker`: estado resultante del blocker resuelto/no resuelto
- `payloadDigest`: digest SHA-256 de auditoría redacted
- `status`: `resolved|still_blocked|not_resolvable`

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (contract/reader) -> Slice 2 (command) -> Slice 3 (API gates) -> Slice 4 (audit/tests/parity).
- No exponer endpoint antes de que el command tenga validation + capability gates.
- No conectar UI/Nexa antes de tener stale-check y canonical errors.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Resolver legal data filtra PII o acepta valores sensibles sin audit | identity / legal profile | medium | payload redacted, reason obligatorio, delegar a primitive legal profile, tests anti-leak | logs `workforce:hiring_activation` + audit review |
| Un blocker stale se resuelve después de que readiness cambió | workforce / hiring | medium | re-read detail bajo lock y 409 `hiring_activation_blocker_stale` con detail fresco | API 409 rate |
| Capability demasiado amplia permite resolución indebida | identity / access | medium | per-action `can()` + coverage test; no admin coarse | entitlements coverage |
| Command duplica onboarding/member state | HRIS | low | delegar a TASK-770/HR onboarding primitives; tests de idempotencia | `workforce.hiring_activation_stuck` |

### Feature flags / cutover

- Sin flag nuevo por defecto. La capacidad hereda `HIRING_ACTIVATION_ENABLED` y `HIRING_HANDOFF_BRIDGES_ENABLED`.
- Si durante implementación aparece una acción mutante de alto riesgo, agregar flag específico `HIRING_ACTIVATION_BLOCKER_RESOLUTION_ENABLED` default OFF y registrar en ledger.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert reader/contract; UI vuelve a remediación informativa | <10 min | sí |
| Slice 2 | Revert command o deshabilitar flag si se agregó | <10 min | sí |
| Slice 3 | Revert route/API action; existing TASK-770 APIs siguen intactas | <10 min | sí |
| Slice 4 | Revert audit enrichment/tests; si hubo migration additive, dejar sin uso hasta cleanup | <30 min | parcial |

### Production verification sequence

1. Verificar APIs existentes de TASK-770 sin regresión.
2. Staging con flags de activation ON y fixture controlado.
3. Resolver blocker soportado y confirmar detail/readiness/audit.
4. Probar forbidden/invalid/stale y confirmar errores canónicos.
5. Smoke de TASK-1368 o client API consumiendo el payload rico.

### Out-of-band coordination required

- People Ops debe validar qué blockers son realmente resolubles desde activation y cuáles sólo deben enlazar a otra surface.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `HiringActivationDetail` o reader hermano expone blockers accionables con discriminated union, payload schema, capability requerida, `targetSurface` y estado resoluble/no resoluble.
- [x] `resolveHiringActivationBlocker` existe como command server-side idempotente, con stale-check y sin lógica en UI.
- [x] API interna gobernada permite resolver blockers soportados y devuelve detail fresco.
- [x] Blockers no soportados devuelven `not_resolvable`/`targetSurface`, no éxito falso.
- [x] Capabilities se aplican por acción y hay coverage test si se agregan capabilities nuevas.
- [x] Audit/event trail redacted registra actor, blocker, action, digest y resultado.
- [x] Tests cubren happy path, invalid payload, forbidden, stale blocker, state-safe retries y no PII leak.
- [x] TASK-1368 puede consumir el payload rico sin simular resolución client-side.

## Verification

- `pnpm vitest run src/lib/workforce/hiring-activation/service.test.ts src/lib/workforce/hiring-activation/boundary.test.ts 'src/app/api/hr/hiring-activation/[id]/[action]/route.test.ts'` → PASS 3 files / 30 tests.
- `pnpm typecheck` → PASS.
- `pnpm lint` → PASS.
- `pnpm build` → PASS; warning preexistente de Turbopack en `src/lib/roadmap/work-item-index/reader.ts`.
- `pnpm task:lint --task TASK-1400` → PASS.
- `pnpm ops:lint --changed` → primer run PASS antes de que entraran cambios concurrentes; rerun final falló por dirty worktree ajeno (`TASK-813` legacy y warning `TASK-1358`), no por TASK-1400. Gate focal vigente: `pnpm task:lint --task TASK-1400` PASS.
- `git diff --check -- <TASK-1400 pathspecs>` → PASS.
- `pnpm qa:gates --changed --agent codex --task TASK-1400 --runtime --auth --data --docs` → advisory PASS command exit 0; report incluyó unrelated dirty worktree de Claude, por lo que el cierre se acotó a pathspecs TASK-1400.
- Smoke staging con blocker real: no ejecutado en este cierre local; no hay migration/flag/secret nuevo. Rollout se activa vía push a `develop`; fixture real puede correrse como follow-up operativo si People Ops quiere validar data viva.

## Closing Protocol

- [x] `Lifecycle` del markdown quedó sincronizado con el estado real.
- [x] El archivo vive en la carpeta correcta.
- [x] `docs/tasks/README.md` quedó sincronizado con el cierre.
- [x] `docs/tasks/TASK_ID_REGISTRY.md` quedó sincronizado.
- [x] `Handoff.md` quedó actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes.
- [x] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible.
- [x] Se ejecutó chequeo de impacto cruzado sobre TASK-1368 y TASK-770.
- [x] Si se agregó flag nuevo, quedó registrado en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — N/A, no se agregó flag.
- [x] Rollout staging posterior autorizado por operador: `HIRING_HANDOFF_BRIDGES_ENABLED=true` + `HIRING_ACTIVATION_ENABLED=true` en Vercel `staging`; redeploy remoto `greenhouse-ird9fygnf` sobre commit `16d0dc154`; smoke autenticado `/api/hr/hiring-activation?limit=5` → `200 { enabled, items }`; smoke no-mutante `resolve-blocker` con ID inexistente → `404 hiring_activation_not_found`, no disabled.

## Follow-ups

- TASK-1368 puede conectar el dialog informativo de resolver blocker al command real cuando haga su siguiente slice UI/API wiring.
- Nexa governed action para resolver blockers puede agregarse después sobre el mismo primitive.

## Open Questions

- Confirmar con People Ops cuáles blockers se deben resolver inline versus redirigir a Workforce Activation, Legal Profile o Templates.
- Confirmado en ejecución: no se necesita flag específico; basta heredar `HIRING_ACTIVATION_ENABLED`.
