# TASK-1192 — Finance payment & treasury capability gates

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
- Backend impact: `api`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance|access|api|controls`
- Blocked by: `none`
- Branch: `task/TASK-1192-finance-payment-treasury-capability-gates`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Primera ola de remediación F9: agrega gates de capability fina a las mutaciones más sensibles de Finance — Payment Orders, Bank/Treasury, settlements y shareholder current account. Cierra el gap entre "tiene acceso al módulo Finance" y "puede ejecutar una acción financiera específica", manteniendo Full API Parity.

## Why This Task Exists

La auditoría `FINANCE_ROUTE_CAPABILITY_AUDIT_2026-06-20` encontró que Finance no está expuesto anónimamente, pero muchas mutaciones críticas usan `requireFinanceTenantContext()` o `requireBankTreasuryTenantContext()` como único gate. Eso autoriza por route-group/view, no por acción. En pagos y tesorería, una persona que puede leer banco no necesariamente debe poder marcar una orden como pagada, registrar una transferencia o crear movimientos de cuenta corriente de accionista.

## Goal

- Payment Orders admin mutations requieren capabilities finas por acción.
- Bank/Treasury/settlement/shareholder movements requieren capabilities finas por acción.
- Las capabilities nuevas existen en catálogo + registry DB/grants para roles reales en el mismo PR.
- Las rutas tienen tests 403/200 por capability y siguen llamando los commands server-side canónicos.
- La UI y Nexa/API Platform heredan Full API Parity porque el contrato gobernado vive en el API boundary + command, no en botones ad hoc.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/audits/finance/FINANCE_ROUTE_CAPABILITY_AUDIT_2026-06-20.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`

Reglas obligatorias:

- **NUNCA** reemplazar invariantes del command/DB con una capability superficial; la capability es gate de acceso, no regla de negocio.
- **SIEMPRE** agregar capability + grant a rol real + test en el mismo PR (`capability-grant-coverage`).
- **SIEMPRE** mantener Full API Parity: UI/Nexa/MCP/CLI consumen la misma ruta/command gobernada, no lógica duplicada.
- **NUNCA** ampliar acceso existente por accidente; el default para nueva capability debe conservar o restringir el acceso actual.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `src/lib/entitlements/capability-grant-coverage.test.ts`

## Dependencies & Impact

### Depends on

- Auditoría F9: `docs/audits/finance/FINANCE_ROUTE_CAPABILITY_AUDIT_2026-06-20.md`
- Helpers de acceso actuales: `src/lib/tenant/authorization.ts`
- Capability catalog/runtime: `src/config/entitlements-catalog.ts`, `src/lib/entitlements/runtime.ts`
- Payment Orders command layer: `src/lib/finance/payment-orders/**`
- Bank/Treasury/shareholder routes existentes.

### Blocks / Impacts

- Desbloquea controles enterprise para acciones de pago/tesorería.
- Alimenta la deuda general de `TASK-1178` con un slice Finance específico ya priorizado.
- Precede cualquier exposición Nexa write sobre pagos/tesorería.

### Files owned

- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- migrations/seeds de registry/grants `[verificar path vigente]`
- `src/app/api/admin/finance/payment-orders/**/route.ts`
- `src/app/api/finance/bank/**/route.ts`
- `src/app/api/finance/settlements/payment/route.ts`
- `src/app/api/finance/shareholder-account/**/route.ts`
- tests de rutas y grants asociados.

## Current Repo State

### Already exists

- `payment_profiles` ya modela capabilities finas (`finance.payment_profiles.*`) y es precedente sano.
- Reconciliation ya usa `finance.reconciliation.*` en la mayoría de mutaciones.
- Recovery endpoints sensibles ya tienen capabilities (`finance.payment_orders.recover`, `finance.payroll.rematerialize`, `finance.payments.repair_clp`).
- Payment Orders tiene invariantes fuertes en command/DB: state machine, source account required, anti-zombie trigger, outbox y reliability signals.

### Gap

- Payment Orders lifecycle común (`create`, `submit`, `approve`, `schedule`, `mark_paid`, `cancel`, `update`) queda mayoritariamente bajo `requireFinanceTenantContext()`.
- Bank/Treasury writes y shareholder movements quedan bajo view/route-group, sin capability de acción.
- Falta matriz formal de actions/scopes y tests negativos de acceso por ruta.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `api`
- Source of truth afectado: capability catalog/runtime + API route authorization boundaries
- Consumidores afectados: UI Finance, Nexa action runtime, API Platform/MCP futuros, CLI/runbooks, tests E2E
- Runtime target: `app` (Next route handlers) + registry/grants DB

### Contract surface

- Contrato existente a respetar: route handlers existentes + commands en `src/lib/finance/**`; `can(tenant, capability, action, scope)`.
- Contrato nuevo o modificado:
  - `finance.payment_orders.create`
  - `finance.payment_orders.update`
  - `finance.payment_orders.submit`
  - `finance.payment_orders.approve`
  - `finance.payment_orders.schedule`
  - `finance.payment_orders.mark_paid`
  - `finance.payment_orders.cancel`
  - `finance.bank_accounts.create`
  - `finance.bank_accounts.update`
  - `finance.bank_transfers.create`
  - `finance.settlements.record_payment`
  - `finance.shareholder_account.create`
  - `finance.shareholder_account.record_movement`
- Backward compatibility: `gated` (access may narrow for users with broad Finance route group but without the new grants).
- Full API parity: each business action remains an API route/command, now governed by capability fine-grained; UI/Nexa/CLI call the same contract.

### Data model and invariants

- Entidades/tablas/views afectadas: entitlement/capability registry tables `[verificar nombres]`; no finance ledger schema changes.
- Invariantes que no se pueden romper:
  - Payment Order state machine and atomic mark-paid path remain command/DB enforced.
  - Treasury movement commands remain server-side; no UI-only mutations.
  - Existing valid Finance Admin/Efeonce Admin operators keep intended access through explicit grants.
- Tenant/space boundary: scope `tenant` for internal finance actions; no client-facing access.
- Idempotency/concurrency: no change to command idempotency; route gates execute before command.
- Audit/outbox/history: existing command audit/outbox remains; capability denial returns 403 without leaking object existence beyond current route behavior.

### Migration, backfill and rollout

- Migration posture: `seed` / registry-grant migration if capabilities require DB rows.
- Default state: capabilities granted to current intended operator roles (`FINANCE_ADMIN`, `EFEONCE_ADMIN`, and `FINANCE_ANALYST` only for read/low-risk if needed).
- Backfill plan: N/A, no finance data backfill.
- Rollback path: revert PR + reverse grant/registry migration if needed.
- External coordination: no provider coordination; requires access owner review for role grants.

### Security and access

- Auth/access gate: tenant context + `can(tenant, capability, action, 'tenant')`.
- Sensitive data posture: finance, bank, payment operations, shareholder account; no secrets.
- Error contract: `403` via `canonicalErrorResponse('forbidden')` or existing route forbidden shape; no raw auth details.
- Abuse/rate-limit posture: unchanged; sensitive retries remain governed by existing command semantics.

### Runtime evidence

- Local checks: focal route tests for missing capability and allowed capability; entitlement grant coverage tests.
- DB/runtime checks: registry/grant parity check if live/migration exists.
- Integration checks: staging smoke for one happy path per family (`payment_orders.mark_paid` dry/fixture if available, bank transfer validation path, shareholder movement).
- Reliability signals/logs: existing payment order signals remain steady; no new signal required.
- Production verification sequence: deploy → smoke current Finance Admin operator can perform intended actions → smoke user without capability gets 403.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en el primitive, no en la UI. La regla de negocio vive en `src/lib/**` commands/readers.
- [ ] Modelada como command/action capability, no como click-handler.
- [ ] Write con authorization fina, audit/outbox existente cuando aplica, errores canónicos sanitizados.
- [ ] Capability + grant en el MISMO PR.
- [ ] Camino programático declarado: Product API actual; follow-up API Platform/MCP solo si se requiere exposición externa.
- [ ] Write apto para `propose → confirm → execute`: las rutas tienen capability explícita y command reutilizable.
- [ ] Un primitive, muchos consumers: UI/Nexa/CLI no duplican lógica.
- [ ] Parity check = SÍ: cada acción sensible tiene contrato gobernado a nivel capability.

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

### Slice 1 — Capability matrix + grant design

- Mapear cada ruta write afectada a capability/action/scope.
- Confirmar roles actuales (`FINANCE_ADMIN`, `EFEONCE_ADMIN`, `FINANCE_ANALYST`) y no-regression esperado.
- Decidir si payment-order read/list sigue en route-group o recibe capability read separada.

### Slice 2 — Registry/catalog/grants

- Agregar capabilities a `src/config/entitlements-catalog.ts`.
- Agregar registry/grants DB si aplica al modelo vigente.
- Actualizar tests de grant coverage/parity.

### Slice 3 — Payment Orders route gates

- Agregar `can()` checks a create/update/submit/approve/schedule/mark-paid/cancel.
- Tests negativos 403 y positivos para cada acción sensible.
- No cambiar commands ni state machine salvo que el test revele bypass real.

### Slice 4 — Treasury/shareholder route gates

- Agregar `can()` checks a bank account create/update, internal transfer, settlement payment, shareholder account create y movement create.
- Tests negativos 403 y positivos por familia.

### Slice 5 — Docs + staging verification

- Delta corto en arquitectura Finance/Payment Orders indicando capability families.
- Staging smoke de al menos un operador con grants y un sujeto sin grant.

## Out of Scope

- DTE/Income/Expense/HES/Purchase Orders (TASK-1193).
- Sync/materializer HTTP boundary (TASK-1194).
- Rehacer UI visible o introducir nuevos botones.
- Cambiar la state machine de Payment Orders o la semántica contable.
- Exponer API Platform/MCP público nuevo; esta task deja Product API gobernada.

## Detailed Spec

Usar el patrón existente de reconciliation/payment profiles: `require*TenantContext()` sigue siendo guard transversal, luego `can(tenant, capability, action, 'tenant')` decide la acción. Si el route handler llama a un command que ya audita/outboxea, no duplicar audit; solo asegurar que la denegación no ejecuta el command.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (matrix) → Slice 2 (catalog/grants) → Slice 3/4 (route gates) → Slice 5 (docs/staging).
- No mergear route gates sin grants reales; eso generaría 403 operativos.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Bloquear operadores legítimos por grants incompletos | finance/access | medium | grant matrix + staging smoke con usuario real | 403 en rutas Finance |
| Capability demasiado amplia mantiene el gap | finance/access | medium | review contra audit F9 + tests por acción | audit route classifier |
| Cambiar involuntariamente command semantics | finance/payment-orders | low | solo route boundary; tests existentes de command | payment order reliability signals |
| Denegación filtra datos sensibles | finance/security | low | forbidden canónico antes de command/object detail | route tests 403 |

### Feature flags / cutover

Sin feature flag: cambio de autorización por capability con grants en el mismo PR. Rollback por revert + reverse grants si staging detecta bloqueo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 2 | reverse migration/grants + revert catalog | <15 min | sí |
| Slice 3 | revert route gates Payment Orders | <10 min | sí |
| Slice 4 | revert route gates Treasury/shareholder | <10 min | sí |
| Slice 5 | docs revert si aplica | <5 min | sí |

### Production verification sequence

1. Run tests + grant coverage locally.
2. Apply registry/grants in staging.
3. Deploy staging.
4. Smoke Finance Admin/Efeonce Admin can execute intended action paths.
5. Smoke subject lacking capability receives 403.
6. Deploy prod and monitor Finance 403 spikes plus payment order signals.

### Out-of-band coordination required

Access owner sign-off for which roles receive each new capability.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Payment Orders create/update/submit/approve/schedule/mark-paid/cancel have explicit capability gates.
- [ ] Bank/Treasury/shareholder write routes listed in the audit have explicit capability gates.
- [ ] New capabilities exist in TS catalog and DB/grants with coverage tests.
- [ ] Missing capability returns 403 and does not execute the command.
- [ ] Existing command invariants/outbox/audit remain unchanged and tests still pass.
- [ ] Staging smoke proves intended operators still work and non-granted user is denied.

## Verification

- `pnpm test -- src/lib/entitlements/capability-grant-coverage.test.ts`
- Focal route tests for Payment Orders and Treasury/shareholder gates.
- `pnpm tsc --noEmit`
- `pnpm lint`
- `pnpm staging:request` smoke for one allowed and one forbidden case per family.

## Closing Protocol

- [ ] `Lifecycle: complete` + mover a `complete/`
- [ ] `docs/tasks/README.md` + `docs/tasks/TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] `docs/audits/finance/FINANCE_ROUTE_CAPABILITY_AUDIT_2026-06-20.md` actualizado con status de Wave 1
- [ ] `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` / Payment Orders arch delta si el capability family cambia el contrato permanente

## Follow-ups

- TASK-1193 para DTE/Income/Expense/HES/Purchase Orders.
- TASK-1194 para sync/materializer HTTP boundary.

## Open Questions

- ¿`FINANCE_ANALYST` debe poder registrar movimientos de tesorería o solo leer? Default recomendado: lectura, no write.
- ¿Payment Orders `approve` y `mark_paid` deben requerir segregación maker-checker adicional en V2? Esta task solo agrega capability gates; maker-checker puede quedar follow-up si no existe.
