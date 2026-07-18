# TASK-1428 — Growth CTA suppression, exposure and kill switches

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-023`
- Status real: `Definida`
- Rank: `2`
- Domain: `growth|data|ops`
- Blocked by: `none`
- Branch: `task/TASK-1428-growth-cta-suppression-exposure-kill-switches`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Completa el data plane V1 del motor CTA con visitor state pseudónimo, suppression/frequency capping server-side, exposición Tier B fuera del ledger OLTP de conversión y kill switches global/per-surface operables sin redeploy. Extiende signals y conserva el browser como fuente no confiable.

## Why This Task Exists

La foundation actual arbitra y registra conversiones Tier A, pero todavía no puede limitar exposición por visitante ni detener una surface dentro del cache TTL. Lanzar placements interruptivos sin estas defensas sería una regresión de privacidad y experiencia; además, `viewed/eligible/suppressed` no debe inflar `cta_conversion_event`.

## Goal

- Suppression/frequency cap determinista y server-side antes de arbitrar.
- Tier B analítico/sampled separado del ledger de conversión.
- Kill switch global/per-surface con command/reader/API, audit y signals.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md`

Reglas obligatorias:

- Browser events siguen `untrusted`; personalization requiere consentimiento explícito.
- Conversion truth queda en Tier A; exposición alta va a Tier B sampled/analítico.
- Kill switches no dependen de deploy y deben invalidar/evitar cache stale dentro del TTL documentado.
- No almacenar identificadores crudos, PII o fingerprinting invasivo.

## Normative Docs

- `src/lib/growth/ctas/**`
- `migrations/20260718001431135_task-1339-growth-cta-foundation.sql`
- `docs/tasks/complete/TASK-1339-growth-cta-engine-foundation.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- Foundation `growth.cta` y schema `greenhouse_growth.cta_*` de TASK-1339.
- Política de consentimiento vigente del renderer/ingest.

### Blocks / Impacts

- Bloquea rollout interruptivo TASK-1429 y controles de kill switch en TASK-1430.
- Cambia arbiter, render API, commands/readers, schema y reliability plane.

### Files owned

- `src/lib/growth/ctas/**`
- `src/app/api/admin/growth/ctas/**`
- `src/app/api/public/growth/ctas/**`
- `src/lib/reliability/queries/growth-cta-*.ts`
- `migrations/*task-1428-growth-cta-suppression*.sql`
- `src/types/db.d.ts`

## Current Repo State

### Already exists

- Arbiter server-side, surface binding, priority, Tier A ledger, rate limit/idempotency y lifecycle commands.
- Pausa por versión y flag global por redeploy.

### Gap

- Sin visitor-state/frequency cap, Tier B, kill switch instantáneo global/per-surface ni signals de collision/backpressure/kill-switch.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/ctas/**` + Postgres + APIs Next.js
- Future candidate home: `domain-package`
- Boundary: commands/readers/arbiter/events `growth.cta`; routes/UI son adapters
- Server/browser split: policy/identity/state server-only; browser contract no expone candidatos ni reglas
- Build impact: sin SDK pesado nuevo; cualquier sink analítico queda aislado por adapter
- Extraction blocker: transacción Postgres, auth/capabilities y sink analítico

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration`
- Source of truth afectado: `greenhouse_growth.cta_*` + sink Tier B gobernado
- Consumidores afectados: render API, renderer, admin/Nexa/MCP, reliability
- Runtime target: `staging|production`

### Contract surface

- Contrato existente a respetar: `greenhouse-growth-cta-popup.v1`, readers/commands `src/lib/growth/ctas`
- Contrato nuevo o modificado: visitor state, suppression decision, kill-switch commands/readers y exposure event adapter
- Backward compatibility: `compatible|gated`
- Full API parity: UI/agentes operan kill switches y leen estado mediante commands/readers canónicos

### Data model and invariants

- Entidades/tablas/views afectadas: definir aditivamente en discovery; no reutilizar `cta_conversion_event` para exposure
- Invariantes que no se pueden romper:
  - 0–1 interruptivo por arbitraje y frequency cap aplicado antes del render
  - solo `server_confirmed` alimenta conversion truth
  - visitor key es pseudónima/rotatable y consent-aware
- Tenant/space boundary: surface binding + scope global/per-surface; admin por `growth.cta.*`
- Idempotency/concurrency: upsert/transaction o lock para ventanas; commands reintentables
- Audit/outbox/history: cambios de kill switch auditados + outbox; exposure sampled con retención explícita

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: frequency cap/suppression shadow; kill switches inactivos
- Backfill plan: ninguno sobre visitantes históricos
- Rollback path: flag/estado shadow + revert adapters; tablas aditivas pueden quedar dormidas
- External coordination: definir sink/retención y aplicar migrations/redeploy

### Security and access

- Auth/access gate: admin session + capabilities `growth.cta.pause/read`; público por surface binding
- Sensitive data posture: sin PII; hashes con rotación/retención
- Error contract: canónico/sanitizado + `captureWithDomain`
- Abuse/rate-limit posture: cuotas, sampling, bot filtering y fail-open/fail-closed explícito por decisión

### Runtime evidence

- Local checks: focal tests arbiter/store/commands/APIs
- DB/runtime checks: migration status + concurrencia/frequency smoke PG real
- Integration checks: render repetido por visitor/surface y kill switch sin redeploy
- Reliability signals/logs: render/ingest/backpressure/collision/kill-switch-active
- Production verification sequence: shadow → compare → staging enforcement → production gradual

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done

- [ ] Kill switch/suppression logic lives in domain commands/readers/arbiter, not UI.
- [ ] Read/write paths have fine authorization, idempotency, audit/outbox and canonical errors.
- [ ] Existing `growth.cta.*` capabilities/grants are reused or extended with coverage tests.
- [ ] Product API/admin routes expose the same primitive to UI/Nexa/MCP.
- [ ] Propose→confirm→execute applies to mutating kill switches.

<!-- ZONE 2 — PLAN MODE intentionally empty -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Detailed Spec

Implementar primero el modelo durable de visitor state, suppression y controles; después conectar el arbiter y el ingest Tier B; finalmente exponer readers/commands gobernados para consumidores UI/runtime. La política vive en `growth.cta`, las superficies solo envían contexto verificable y ningún evento browser se trata como conversión confiable.

## Scope

### Slice 1 — Visitor state and suppression

- Define consent-aware pseudonymous state, frequency windows and server-side decision.
- Integrate with arbiter in shadow first; add collision/suppression evidence.

### Slice 2 — Tier B exposure

- Separate `eligible/suppressed/viewed` from conversion OLTP through sampled/analytical adapter.
- Define retention, bot filtering, backpressure and reconciliation identifiers.

### Slice 3 — Kill switches and signals

- Add global/per-surface command/read/API, audit/outbox and cache behavior.
- Register/test missing signals and run live no-redeploy disable/restore smoke.

## Out of Scope

- Renderer popup/slide-in, cockpit UI, experiments/winner selection y nuevos action kinds.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Visitor-state schema → shadow decisions → Tier B adapter → kill switches/signals → enforcement gradual.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Sobre-suppression elimina conversiones | arbiter | medium | shadow compare + defaults conservadores | suppression/collision |
| Exposure satura OLTP/sink | data | medium | Tier B + sampling/backpressure | ingest backpressure |
| Kill switch stale por cache | runtime | medium | TTL/invalidation + smoke | kill-switch-active/render |
| Visitor state invade privacidad | public | low | pseudónimo, consentimiento, retención | privacy audit |

### Feature flags / cutover

- Introducir flag shadow/enforcement si el contrato vigente no tiene control equivalente; default OFF.
- Kill switch se persiste como estado operativo, no env var.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| Visitor state | enforcement OFF; revert reader | <5 min | si |
| Tier B | disable adapter/sampling | <5 min | si |
| Kill switches | restore state/revert command | <5 min | si |

### Production verification sequence

1. Migration y smoke PG staging.
2. Shadow compare sin cambiar renders.
3. Tier B low-volume + backpressure test.
4. Kill switch staging disable/restore sin redeploy.
5. Enforcement gradual en producción y monitor siete días.

### Out-of-band coordination required

- Aprobación de retención/sink analítico y rollout productivo.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Frequency capping/suppression es server-side, consent-aware y probado bajo concurrencia.
- [ ] Tier B no escribe exposure de alto volumen en `cta_conversion_event`.
- [ ] Kill switches global/per-surface detienen render dentro del TTL sin redeploy y son reversibles.
- [ ] Browser data sigue untrusted y conversion truth solo usa `server_confirmed`.
- [ ] Commands/readers/APIs, access, audit/outbox, errors y capability coverage pasan.
- [ ] Signals requeridas quedan visibles y probadas con runtime real.
- [ ] Migration, rollback y flags/estado operativo están documentados.

## Verification

- `pnpm exec vitest run src/lib/growth/ctas src/app/api/public/growth/ctas src/app/api/admin/growth/ctas`
- `pnpm migrate:status`
- `pnpm task:lint --task TASK-1428`
- `pnpm qa:gates --changed --agent codex --task TASK-1428 --runtime --data --security`

## Closing Protocol

- [ ] Lifecycle/carpeta/README/registry/EPIC-023 sincronizados.
- [ ] Arquitectura/ADR, Handoff y changelog actualizados según docs governor.
- [ ] QA Release Auditor sin blockers y smoke staging/productivo documentado.
- [ ] Chequeo de impacto cruzado sobre TASK-1429/1430 completado.

## Follow-ups

- TASK-1429 consume suppression/kill switches para el placement interruptivo.
- TASK-1430 expone su operación en el cockpit.
