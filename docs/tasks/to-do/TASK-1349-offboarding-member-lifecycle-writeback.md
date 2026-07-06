# TASK-1349 — Offboarding → member lifecycle writeback + SCIM/Entra reconciliation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `task/TASK-1349-offboarding-member-lifecycle-writeback`
- Legacy ID: `none`
- GitHub Issue: `ISSUE-117`

## Summary

El executor de offboarding cierra elegibilidad de nómina y revoca acceso, pero **nunca desactiva el registro canónico `greenhouse_core.members`** (no hay ningún code path en el repo que ponga `members.active=false` ni un `status` de salida, en ninguna lane). Como consecuencia los colaboradores desvinculados siguen `active=true` y filtran a rosters, candidatos de nómina, Person/Account 360 y directorios. Esta task cierra el bug (ISSUE-117): agrega el writeback canónico del ciclo de vida al ejecutar el offboarding, define la política SCIM `identity_only`, detecta bajas de Entra sin caso, agrega reliability signals y hace backfill de los casos ya rotos.

## Why This Task Exists

Detectado el 2026-07-06 durante el envío de avisos de nómina 1:1: **María Camila Hoyos** y **Maggie Borralles** aparecían en el roster de `members active=true` pese a estar desvinculadas y removidas de Microsoft Entra. Investigación confirmó (ISSUE-117):

- `updateOffboardingCaseStatus` (transición `→ executed`) en `src/lib/workforce/offboarding/store.ts` hace `assertPayrollExecutionReadiness` → `closeFuturePayrollEligibility` → UPDATE del caso → eventos, pero **nunca** `UPDATE greenhouse_core.members`.
- No existe consumer reactivo del evento `workRelationshipOffboardingCaseExecuted` que desactive el member.
- `grep` global: cero paths que pongan `greenhouse_core.members.active=false` / `status` de salida. La desactivación del member simplemente no está implementada.
- Manifestaciones: (a) caso HR `executed` (María Camila) con member intacto; (b) baja de Entra sin ningún caso de offboarding (Maggie).

El objeto canónico `Colaborador` (`greenhouse_core.members`) queda mintiendo sobre quién es workforce activo. Es un bug de identity/lifecycle con blast radius transversal.

## Goal

- Al ejecutar un offboarding (`→ executed`), el member canónico queda inactivo con estado de salida, en la misma transacción, para las lanes que corresponda (`full`/`partial`).
- La política del lane SCIM `identity_only`/`informational` queda explícita y implementada (escala a cierre laboral que desactiva, o no-op declarado + reconciliación).
- Existe detección de bajas de Entra sin caso de offboarding (caso Maggie) y de members `executed` que siguen activos.
- Los casos ya rotos (María Camila, Maggie y cualquiera que el detector encuentre) quedan corregidos por el command canónico, no por SQL manual.

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
- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md` (§offboarding closure completeness, §workforce exit payroll eligibility)
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` (§SCIM provisioning/deprovisioning, §session access lifecycle)
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` (reliability signals)
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` (state-machine+CHECK+audit; outbox+reactive; flag default-OFF+shadow+flip)

Reglas obligatorias:

- Skill MANDATORIA `greenhouse-payroll-auditor` antes de tocar payroll/offboarding/exit eligibility.
- **NUNCA** escribir `greenhouse_core.members.active/status` con un `UPDATE` suelto: modelar un command auditado canónico (transacción única: member + audit/event).
- **Boundary duro:** este dominio no recalcula ni muta `payroll_entries`/`compensation_versions`/`final_settlements`; solo consume el resultado del offboarding y desactiva el member. Mantener `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` verde como gate.
- Backfill por el command canónico + dry-run/apply allowlist, **NUNCA** SQL manual.
- Flag default-OFF + shadow en staging + flip post-smoke (patrón canónico).

## Normative Docs

- `docs/issues/open/ISSUE-117-offboarding-executed-never-deactivates-member-canonical.md` (causa raíz + evidencia)

## Dependencies & Impact

### Depends on

- `greenhouse_core.members` (columnas `active`, `status`, `contract_end_date`, `workforce_intake_status`) — `[verificar]` el enum/dominio válido de `members.status` para el valor de salida canónico
- `greenhouse_hr.work_relationship_offboarding_cases` (+ `_events`) — SoT del caso
- `src/lib/workforce/offboarding/store.ts` (`updateOffboardingCaseStatus`, `closeFuturePayrollEligibility`)
- `src/lib/workforce/offboarding/lane.ts` (resolución de `ruleLane` + `greenhouseExecutionMode`)
- `GREENHOUSE_EVENT_CATALOG_V1.md` — registrar evento nuevo si se emite `member.deactivated`/equivalente

### Blocks / Impacts

- Cualquier reader de "workforce activo" (`members active`): rosters (skill `greenhouse-teams-message-operator` / `pnpm teams:payment-announcement`), candidatos de nómina, Person/Account 360, People directory
- SCIM deprovision path (`src/lib/scim/**`) — política `identity_only`

### Files owned

- `src/lib/workforce/offboarding/store.ts`
- `src/lib/workforce/offboarding/lane.ts` `[verificar]` si la política SCIM se resuelve aquí
- `src/lib/workforce/offboarding/member-lifecycle.ts` `[verificar]` (nuevo — command de desactivación)
- `src/lib/reliability/queries/*offboarding*` `[verificar]` (signals nuevos)
- `scripts/workforce/backfill-offboarding-member-deactivation.ts` `[verificar]` (nuevo — backfill dry-run/apply)
- `migrations/*` (si hace falta columna de auditoría / evento)
- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md` (delta writeback + política SCIM)

## Current Repo State

### Already exists

- State machine de offboarding + transición `→ executed` con `closeFuturePayrollEligibility` (`src/lib/workforce/offboarding/store.ts:926`)
- Resolución de lanes + execution mode (`src/lib/workforce/offboarding/lane.ts`)
- Eventos `workRelationshipOffboardingCase*` + outbox
- Casos reales para reproducir: `EO-OFF-2026-0609A520` (executed, member intacto), `EO-OFF-2026-FE2179AC` (scim identity_only needs_review); member Maggie sin caso

### Gap

- El executor no escribe `greenhouse_core.members` (active/status) → member sigue activo tras `executed`
- No hay command canónico de desactivación de member por offboarding
- Política SCIM `identity_only` no desactiva ni reconcilia
- Bajas de Entra sin caso (Maggie) no se detectan ni cierran
- No hay reliability signal para el drift
- Los casos rotos actuales no tienen ruta de corrección gobernada

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `greenhouse_core.members` (lifecycle) + `greenhouse_hr.work_relationship_offboarding_cases`
- Consumidores afectados: `UI/API/cron/worker` (todo reader de workforce activo) + `external` (Entra/SCIM)
- Runtime target: `staging` → `production` (+ `worker`/`cron` para detector/backfill)

### Contract surface

- Contrato existente a respetar: `src/lib/workforce/offboarding/store.ts` (state machine + transición atómica), invariantes en `PAYROLL_WORKFORCE_AGENT_INVARIANTS.md`
- Contrato nuevo o modificado: command `deactivateMemberForOffboarding(caseId, ...)` invocado dentro de la tx de `→ executed`; detector reader; backfill script; 2 reliability signals
- Backward compatibility: `gated` (flag default OFF; comportamiento actual se preserva hasta el flip)
- Full API parity: la desactivación es un command en `src/lib/**` reusable (executor, backfill, futura UI/Nexa), no lógica en un componente ni UPDATE ad hoc

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.members`, `greenhouse_hr.work_relationship_offboarding_cases` (+ `_events`)
- Invariantes que no se pueden romper:
  - Una transición `→ executed` de una lane que desactiva DEBE dejar `members.active=false` + `status` de salida en la MISMA transacción (o abortar completa).
  - **NUNCA** mutar `payroll_entries`/`compensation_versions`/`final_settlements` desde esta task.
  - El command es idempotente: reejecutar sobre un member ya inactivo no falla ni duplica auditoría.
  - Backfill append-only en auditoría; nunca borra filas.
- Tenant/space boundary: member resuelto desde el caso (`member_id` del `offboarding_case`); no cross-tenant.
- Idempotency/concurrency: `withTransaction` + `SELECT ... FOR UPDATE` del member; command idempotente por `member_id` + estado destino.
- Audit/outbox/history: evento `member.deactivated_by_offboarding` (o equivalente del catálogo) + fila de auditoría; `[verificar]` nombre canónico en `GREENHOUSE_EVENT_CATALOG_V1.md`.

### Migration, backfill and rollout

- Migration posture: `additive` (solo si hace falta columna de auditoría/estado; `[verificar]` si `members.status` ya soporta el valor de salida — si sí, `none`)
- Default state: `flag OFF` (`WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED=false`) — shadow en staging primero
- Backfill plan: script `dry-run` (lista los members con caso `executed` aún activos + bajas Entra sin caso) → `apply --allowlist` (María Camila `d1a72374-…`, Maggie `0e6a896e-…`) → verificación post-apply
- Rollback path: flag OFF + redeploy; el backfill es reversible reactivando el member por el mismo command (`[verificar]` que el command soporte reactivar, o documentar reversión manual auditada)
- External coordination: definir con People Ops el `status` de salida canónico y confirmar que la baja de Entra es autoritativa; env var nueva en Vercel (staging + prod)

### Security and access

- Auth/access gate: el command corre server-side dentro del executor (ya gateado por la capability de ejecutar offboarding) + backfill como script operado con credenciales; `[verificar]` capability específica si se expone endpoint
- Sensitive data posture: `identity/payroll` (member lifecycle) — no loggear PII; el evento lleva `member_id`, no datos personales
- Error contract: `canonicalErrorResponse` / `captureWithDomain(err,'identity'|'hr',...)`; nunca prosa cruda ni SQL error al cliente
- Abuse/rate-limit posture: N/A (server-side interno); backfill con allowlist + batch

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/workforce/offboarding src/lib/payroll` + tests focales del command + lint + `pnpm typecheck`
- DB/runtime checks: en staging, ejecutar un offboarding de prueba con flag ON y verificar `members.active=false` + `status` + `updated_at` movido en la misma tx; SQL a `information_schema` para el enum de `status` `[verificar]`
- Integration checks: caso SCIM `identity_only` de prueba → política aplicada; baja de Entra sin caso → detector la levanta
- Reliability signals/logs: `workforce.offboarding.executed_member_still_active` (steady=0), `identity.workforce.active_member_absent_from_entra` (steady=0)
- Production verification sequence: ver §Rollout

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Command canónico de desactivación de member + writeback en el executor (flag OFF)

- Command `deactivateMemberForOffboarding` en `src/lib/workforce/offboarding/member-lifecycle.ts` `[verificar]`: dado un caso `executed`, marca `greenhouse_core.members` (`active=false`, `status` de salida, `contract_end_date`/último día laboral) + audit/event, idempotente, dentro de tx.
- Cablearlo en `updateOffboardingCaseStatus` (transición `→ executed`) dentro de la MISMA `withTransaction`, gateado por `WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED` (default OFF).
- Aplica a lanes `full` y `partial` (incl. `external_payroll`/Deel: Greenhouse es el 360, desactiva el member aunque Deel haga la baja real).
- Tests focales del command (idempotencia, tx-atómica, lanes).

### Slice 2 — Política del lane SCIM `identity_only` / `informational`

- Definir e implementar: al confirmarse baja de acceso persistente vía SCIM, o (a) escalar a cierre laboral que desactiva el member, o (b) declarar explícito no-op + reconciliación por el detector (Slice 4). Decisión con People Ops.
- Documentar la política en `GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`.

### Slice 3 — Reliability signals (paralelizable con Slice 1)

- `workforce.offboarding.executed_member_still_active` (steady=0): member con caso `executed` que sigue `active=true`.
- `identity.workforce.active_member_absent_from_entra` (steady=0): member `active=true` sin cuenta en Entra.
- Registrarlos en el reliability control plane + dashboard.

### Slice 4 — Detector de bajas de Entra sin caso de offboarding

- Reader/job que detecta members `active` ausentes de Entra (caso Maggie) y los levanta como caso a revisar o los reconcilia por el command.

### Slice 5 — Backfill de casos rotos (dry-run/apply allowlist)

- `scripts/workforce/backfill-offboarding-member-deactivation.ts` `[verificar]`: `dry-run` lista los afectados; `apply --allowlist` corrige María Camila + Maggie por el command canónico; verificación post-apply.

## Out of Scope

- Cualquier recálculo o mutación de `payroll_entries`, `compensation_versions`, `final_settlements` o finiquito.
- Rediseño del flujo de offboarding UI o de la wizard.
- Cambios en el pipeline SCIM de **provisioning** (alta); esta task es sobre la baja/lifecycle.
- Reactivación/rehire flows más allá de la reversibilidad mínima del command.
- Migrar el backlog histórico de members inactivos "legacy" fuera de los detectados por el detector.

## Detailed Spec

Referencia canónica: `docs/issues/open/ISSUE-117-...`. El corazón es cerrar el hueco de writeback: hoy `updateOffboardingCaseStatus` (store.ts:926-999) transiciona el caso a `executed` sin tocar `members`. El command nuevo debe correr en esa misma transacción para preservar atomicidad (caso executed ⇔ member inactivo). El valor de `members.status` de salida debe confirmarse contra el dominio real de la columna (`information_schema` / CHECK constraint) — `[verificar]` durante Discovery; no inventar un literal.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (command + writeback, flag OFF) es foundation.
- Slice 3 (signals) puede correr en paralelo con Slice 1.
- Slice 2 (política SCIM) depende de la decisión con People Ops; puede ir tras Slice 1.
- Slice 4 (detector) requiere Slice 3 (reusa señal/lógica de "ausente de Entra").
- **Slice 5 (backfill) MUST ship AL FINAL**: requiere Slice 1 (command) mergeado + flag validado en staging + signals (Slice 3) live para verificar convergencia. Ejecutar backfill antes = mutar identity canónico sin red de seguridad.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Desactivar un member que NO debía (falso positivo de lane/backfill) | identity | medium | flag OFF + shadow staging + backfill allowlist explícita + command idempotente y reversible | `identity.workforce.active_member_absent_from_entra` |
| Writeback rompe la atomicidad de la tx `executed` (deja caso executed pero member intacto, o viceversa) | payroll/identity | low | mismo `withTransaction`; test de rollback de tx | `workforce.offboarding.executed_member_still_active` |
| Tocar por error payroll/finiquito | payroll | low | boundary duro + gate `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` verde | tests en rojo (CI) |
| Política SCIM escala de más y desactiva por una desactivación transitoria de Entra | identity/SCIM | medium | decisión explícita con People Ops + no-op default hasta confirmar; detector antes que auto-desactivación | `identity.workforce.active_member_absent_from_entra` |
| Valor de `members.status` inválido para el dominio de la columna | migration/identity | low | `[verificar]` enum/CHECK en Discovery antes de escribir | error de constraint (CI/staging) |

### Feature flags / cutover

- Env var `WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED` (default `false`). Controla si el executor invoca el command de desactivación. Shadow en staging, flip a `true` post-smoke. Revert: env var `false` + redeploy (<5 min via Vercel). Registrar en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` al declararla.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | flag OFF + redeploy | <5 min | sí |
| Slice 2 | flag OFF / revert PR | <10 min | sí |
| Slice 3 | revert PR (signals son read-only) | <10 min | sí |
| Slice 4 | revert PR / disable job | <10 min | sí |
| Slice 5 | reactivar member por el command (mismo path auditado) o reversión manual auditada | <30 min | parcial |

### Production verification sequence

1. `[verificar]` enum/dominio de `members.status` en staging antes de escribir el command.
2. Deploy code a staging con flag=false + verificar que offboarding existente NO cambió comportamiento.
3. Flip flag=true en staging + ejecutar offboarding de prueba (lane partial/full) + verificar `members.active=false` + `status` + `updated_at` en la misma tx.
4. Backfill `dry-run` en staging + verificar plan esperado (2 afectados conocidos + los que el detector encuentre).
5. Backfill `apply --allowlist` en staging + verificar post-apply + signals a 0.
6. Repetir 2-5 en producción con cooldown entre ambientes.
7. Monitorear `workforce.offboarding.executed_member_still_active` + `identity.workforce.active_member_absent_from_entra` 7d post-prod.

### Out-of-band coordination required

- People Ops: confirmar el `status` de salida canónico y la política SCIM `identity_only` (escalar vs no-op).
- Vercel: crear `WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED` en staging + prod.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un offboarding que llega a `executed` (lane `full`/`partial`) deja `greenhouse_core.members.active=false` + `status` de salida en la misma transacción (verificado en staging con un caso de prueba).
- [ ] El command de desactivación es idempotente (reejecutar no falla ni duplica auditoría) y emite audit/event canónico.
- [ ] Ningún path de esta task muta `payroll_entries`/`compensation_versions`/`final_settlements`; `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` verde.
- [ ] Política SCIM `identity_only` implementada y documentada (escala o no-op explícito + reconciliación).
- [ ] Detector de members activos ausentes de Entra existe y levanta el caso Maggie.
- [ ] Signals `workforce.offboarding.executed_member_still_active` y `identity.workforce.active_member_absent_from_entra` registrados y en 0 tras backfill.
- [ ] Backfill corrige María Camila (`d1a72374-…`) y Maggie (`0e6a896e-…`) por el command canónico; desaparecen del roster `members active`.
- [ ] Flag `WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED` default OFF + registrado en el Feature Flag State Ledger.
- [ ] Source of truth, contract surface, invariantes, boundary de acceso y postura de migración/rollback declarados con paths reales.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` (gate de no-regresión del boundary)
- Staging: offboarding de prueba con flag ON + query a `greenhouse_core.members` confirmando desactivación en la misma tx
- Backfill dry-run/apply en staging con verificación post-apply + signals a 0

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] ISSUE-117 movido a `resolved/` con verificación (writeback + backfill + signals) y el tracker actualizado
- [ ] `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md` actualizado con el writeback + política SCIM; invariantes agregados a `PAYROLL_WORKFORCE_AGENT_INVARIANTS.md` / `IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`

## Follow-ups

- Posible UI/Nexa consumer para "desactivar/reactivar member" gobernado (Full API Parity) si emerge necesidad operativa.
- Auditoría de otros readers de "workforce activo" que confían solo en `members.active` sin cruzar Entra.

## Open Questions

- ¿Cuál es el `status` de salida canónico de `members` (enum/CHECK real)? `[verificar]` en Discovery.
- Política SCIM `identity_only`: ¿escala automáticamente a cierre laboral que desactiva el member, o queda no-op + reconciliación por detector? (decisión People Ops)
- ¿La baja de Entra es autoritativa por sí sola para desactivar, o requiere confirmación HR?
