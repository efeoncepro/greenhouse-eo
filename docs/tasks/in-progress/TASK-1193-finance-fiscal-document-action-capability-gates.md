# TASK-1193 — Finance fiscal/document action capability gates

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `api`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance|access|api|fiscal-controls`
- Blocked by: `none`
- Branch: `task/TASK-1193-finance-fiscal-document-action-capability-gates`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Segunda ola de remediación F9: agrega capabilities finas a mutaciones de DTE, income, expenses, HES y purchase orders. La meta es que emitir documentos fiscales, registrar pagos, editar documentos financieros y aprobar/rechazar HES no dependan solo de `requireFinanceTenantContext()`.

## Why This Task Exists

F9 confirmó que muchas rutas que cambian estado fiscal/documental están autorizadas por acceso general al módulo Finance. Eso no cumple controles enterprise ni Full API Parity: una acción fiscal o de pago debe ser un command gobernado con capability explícita, audit/outbox existente y errores sanitizados. Esta task separa autorización de lectura Finance vs autorización de mutar documentos/estados financieros.

## Goal

- DTE emission y batch emission requieren capabilities específicas.
- Income/Expense create/update/payment routes requieren capabilities específicas.
- HES submit/approve/reject requiere capabilities específicas.
- Purchase Order create/update/cancel requiere capabilities específicas.
- Tests demuestran que sin capability no se ejecuta el command y con grant se mantiene el contrato actual.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/audits/finance/FINANCE_ROUTE_CAPABILITY_AUDIT_2026-06-20.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/documentation/finance/modulos-caja-cobros-pagos.md`
- `docs/documentation/finance/ordenes-de-pago.md`

Reglas obligatorias:

- **NUNCA** permitir emisión DTE o registro de pago con solo route-group Finance.
- **SIEMPRE** mantener commands/readers existentes como source of truth; la UI no gana lógica local.
- **SIEMPRE** capability + grant + route tests en el mismo PR.
- **NUNCA** cambiar semántica fiscal/contable sin evidencia y doc de arquitectura.

## Normative Docs

- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `src/lib/entitlements/capability-grant-coverage.test.ts`
- `src/lib/finance/**` commands/readers de income, expenses, HES y purchase orders.

## Dependencies & Impact

### Depends on

- Auditoría F9: `docs/audits/finance/FINANCE_ROUTE_CAPABILITY_AUDIT_2026-06-20.md`
- Capability runtime/can(): `src/lib/entitlements/runtime.ts`
- Route families bajo `src/app/api/finance/income/**`, `expenses/**`, `hes/**`, `purchase-orders/**`.

### Blocks / Impacts

- Reduce riesgo de fiscal/document mutation con acceso demasiado amplio.
- Complementa TASK-1192; no depende técnicamente de ella, pero debe usar nombres/action scopes consistentes.
- Deja acciones fiscales preparadas para Nexa `propose → confirm → execute` sin construir nada Nexa-specific.

### Files owned

- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- migrations/seeds de registry/grants `[verificar path vigente]`
- `src/app/api/finance/income/**/route.ts`
- `src/app/api/finance/expenses/**/route.ts`
- `src/app/api/finance/hes/**/route.ts`
- `src/app/api/finance/purchase-orders/**/route.ts`
- tests focales por route family.

## Current Repo State

### Already exists

- Rutas y commands de income/expenses/HES/PO ya existen y son consumidas por UI.
- Algunas familias de Finance ya tienen capabilities finas como economic category reclassification, reconciliation y payment profiles.
- `requireFinanceTenantContext()` provee auth base.

### Gap

- DTE emission, payments, HES transitions y PO mutations quedan sin capability fina textual.
- No hay tests negativos de acceso por acción para estas rutas.
- El contrato programático existe, pero no está gobernado a nivel capability.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `api`
- Source of truth afectado: API route authorization + capability catalog/runtime
- Consumidores afectados: UI Finance, Nexa action runtime futuro, CLI/runbooks, Product API consumers
- Runtime target: `app`

### Contract surface

- Contrato existente a respetar: Product API routes + commands en `src/lib/finance/**`.
- Contrato nuevo o modificado:
  - `finance.income.create`
  - `finance.income.update`
  - `finance.income.emit_dte`
  - `finance.income.batch_emit_dte`
  - `finance.income.record_payment`
  - `finance.expenses.create`
  - `finance.expenses.update`
  - `finance.expenses.record_payment`
  - `finance.hes.create`
  - `finance.hes.submit`
  - `finance.hes.approve`
  - `finance.hes.reject`
  - `finance.purchase_orders.create`
  - `finance.purchase_orders.update`
  - `finance.purchase_orders.cancel`
- Backward compatibility: `gated` (access narrows to intended operators).
- Full API parity: existing Product API actions become governed business capabilities with capability checks; UI/Nexa/CLI consume same commands.

### Data model and invariants

- Entidades/tablas/views afectadas: capability registry/grants; no finance document schema changes expected.
- Invariantes que no se pueden romper:
  - DTE emission still uses Nubox gateway/canonical DTE flow.
  - Payment recording still uses normalized readers/commands; no ad hoc CLP math.
  - HES approval/rejection state machine remains command-owned.
  - Purchase Orders retain canonical client context and existing validation.
- Tenant/space boundary: internal Finance tenant; scope `tenant` unless a route is explicitly space-scoped today.
- Idempotency/concurrency: no change to command semantics; route gate before command execution.
- Audit/outbox/history: existing command audit/outbox remains; no command executes on denied request.

### Migration, backfill and rollout

- Migration posture: `seed` / capability registry + role grant rows if required.
- Default state: grant to roles currently intended to perform each action.
- Backfill plan: N/A.
- Rollback path: revert PR + reverse grant/registry migration if needed.
- External coordination: access owner/finance owner sign-off for role grants; no provider config.

### Security and access

- Auth/access gate: `requireFinanceTenantContext()` or existing route context + `can(tenant, capability, action, 'tenant')`.
- Sensitive data posture: finance + fiscal documents + payments; avoid raw provider errors.
- Error contract: forbidden canónico; existing fiscal/provider errors stay sanitized.
- Abuse/rate-limit posture: unchanged; DTE emission should continue using existing provider safeguards.

### Runtime evidence

- Local checks: route tests for 403 missing capability and happy path mocks.
- DB/runtime checks: capability/grant parity.
- Integration checks: staging smoke for DTE emission path only in safe/non-destructive mode if available; otherwise route-level contract smoke.
- Reliability signals/logs: existing DTE/payment/ledger health signals remain steady.
- Production verification sequence: deploy with grants → smoke allowed operator → smoke denied operator → monitor.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Business logic remains in existing commands/readers, not UI or route-only custom logic.
- [ ] Each write is modeled as action capability, not button semantics.
- [ ] Capability + grant in same PR.
- [ ] Programmatic path remains Product API; Nexa/CLI can use governed action later.
- [ ] Writes are compatible with `propose → confirm → execute`.
- [ ] Tests prove missing capability blocks before command execution.

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

### Slice 1 — Action matrix by route family

- Mapear income/expenses/HES/PO routes write a capability/action/scope.
- Separar read/list de write; no sobregatear GET si ya tiene contexto correcto.
- Confirmar si alguna ruta delega capability dentro de command antes de duplicar.

### Slice 2 — Catalog/grants

- Agregar capabilities a catalog/runtime/registry.
- Seed/grant a roles reales según acceso actual y principio de menor privilegio.
- Tests de grant coverage/parity.

### Slice 3 — DTE + Income gates

- Gatear DTE emission, batch emission, income create/update y income payments.
- Tests focales.

### Slice 4 — Expenses + HES gates

- Gatear expense create/update/bulk/payments y HES create/submit/approve/reject.
- Tests focales.

### Slice 5 — Purchase Order gates

- Gatear PO create/update/cancel.
- Tests focales, incluyendo que ISSUE-045 no regrese.

### Slice 6 — Docs + staging verification

- Actualizar audit F9 con Wave 2 status.
- Staging smoke allowed/forbidden por familia.

## Out of Scope

- Payment Orders admin lifecycle y Treasury/shareholder gates (TASK-1192).
- Sync/materializer endpoints (TASK-1194).
- Cambios UI visibles.
- Cambiar cálculo fiscal, IVA, PPM, retenciones o Nubox sync semantics.

## Detailed Spec

La implementación debe usar el patrón `requireFinanceTenantContext()` + `can()` por acción. Para rutas que hoy usan `requireCommercialTenantContext()` por contrato comercial, mantener ese contexto y sumar capability cuando la acción muta un documento financiero/fiscal. Las rutas GET pueden quedar con context gate si son read-only y no exponen datos sensibles adicionales.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slices 3/4/5 → Slice 6.
- No gatear rutas sin grants reales.
- No tocar sync/materializers hasta TASK-1194.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Bloquear emisión DTE legítima | finance/fiscal | medium | grants staging + safe smoke | DTE errors / 403 spike |
| Mantener acceso excesivo con grants amplios | access | medium | access owner sign-off + least privilege | F9 classifier |
| Tests mockean auth sin cubrir can() | quality | medium | tests negativos por route family | route test coverage |
| Cambiar flujo fiscal sin querer | finance | low | solo route gate; no command semantics | finance ledger/DTE signals |

### Feature flags / cutover

Sin flag: authorization cutover con grants en el mismo PR. Si staging detecta bloqueo, revert route gate o ajustar grants antes de prod.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 2 | reverse migration/grants + revert catalog | <15 min | sí |
| Slice 3 | revert DTE/Income route gates | <10 min | sí |
| Slice 4 | revert Expenses/HES route gates | <10 min | sí |
| Slice 5 | revert PO route gates | <10 min | sí |
| Slice 6 | docs revert si aplica | <5 min | sí |

### Production verification sequence

1. Local tests + grant coverage.
2. Staging deploy with grants.
3. Allowed operator smoke for one route per family.
4. Denied operator smoke returns 403.
5. Prod deploy + monitor DTE/payment error rates.

### Out-of-band coordination required

Finance owner sign-off for which roles can emit DTE, record payments, approve HES and mutate POs.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] DTE emission and batch emission require explicit capabilities.
- [ ] Income/Expense create/update/payment writes require explicit capabilities.
- [ ] HES submit/approve/reject require explicit capabilities.
- [ ] Purchase Order create/update/cancel require explicit capabilities.
- [ ] Capabilities exist in catalog + DB/grants with coverage tests.
- [ ] Missing capability returns 403 and command is not called.
- [ ] Existing route happy paths remain compatible.

## Verification

- `pnpm test -- src/lib/entitlements/capability-grant-coverage.test.ts`
- Focal route tests for DTE/Income/Expenses/HES/PO gates.
- `pnpm tsc --noEmit`
- `pnpm lint`
- `pnpm staging:request` allowed/forbidden smoke per family where safe.

## Closing Protocol

- [ ] `Lifecycle: complete` + mover a `complete/`
- [ ] `docs/tasks/README.md` + `docs/tasks/TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] `docs/audits/finance/FINANCE_ROUTE_CAPABILITY_AUDIT_2026-06-20.md` actualizado con status de Wave 2
- [ ] Arquitectura Finance actualizada si se agrega capability family permanente

## Follow-ups

- TASK-1194 para sync/materializer HTTP boundary.
- Posible maker-checker para DTE/HES/PO si Finance owner lo requiere.

## Open Questions

- ¿Quién puede emitir DTE en producción: `FINANCE_ADMIN` solamente o también `FINANCE_ANALYST`? Default recomendado: `FINANCE_ADMIN` + `EFEONCE_ADMIN`.
- ¿HES approval necesita segregación solicitante/aprobador? Esta task solo agrega capability gate; SoD puede quedar como follow-up.
