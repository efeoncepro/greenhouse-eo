# TASK-1202 — Finance Quotes Reconciliation Capability Extension

## Delta 2026-06-21

- **La autoría/emisión de cotización NO necesita una capability nueva de este catálogo** — cerrado por TASK-1212. El write vertical del cotizador consume la capability **existente `commercial.quotation`** (actions `create` para autorar, `approve` para emitir), ya granteada a los roles internos comerciales en `runtime.ts`. TASK-1212 NO acuñó `commercial.quotation.author`/`.issue`; si 1202 reorganiza el catálogo de quotes, mantener `commercial.quotation` create/approve como el contrato de write del cotizador (consumido por el command `submitQuoteFromBuilder` + la Nexa governed action `author_quote`). La huérfana `commercial.quote_to_cash.execute` sigue siendo del cierre (TASK-1206), no de la autoría.

## Delta 2026-06-21 (#2) — discovery pre-ejecución + decisión del operador: TASK EN PAUSA por bloqueo

Claude hizo discovery (read-only) e intentó tomar la task vía `/implement-task 1202`. **Decisión del operador: DETENER y respetar el bloqueo** (`Blocked by: TASK-1192, TASK-1193`, ambas aún `to-do`). La task **NO se movió a in-progress**; queda en `to-do` con este estado para que quien la retome (después de que 1192/1193 fijen el patrón) arranque informado y no repita el discovery.

**Inventario real del gap (verificado por scan de handlers, 2026-06-21) — más chico que el "20 quotes + 15 reconciliation" del summary:**

- **Reconciliation: 14/15 write routes YA tienen `can()` fino** (TASK-722/723). Único coarse: `src/app/api/finance/reconciliation/auto-match/route.ts` (el top-level). Gap reconciliation real ≈ **1 ruta**.
- **Quotes: 21/21 handlers usan `requireCommercialTenantContext()` (route-group coarse)**, pero parte ya está gobernada aguas abajo:
  - `author/route.ts` → gobernada a nivel command (`submitQuoteFromBuilder` enforza `commercial.quotation` create/approve, TASK-1212). NO re-gatear en la ruta.
  - `pricing/simulate/route.ts` → capability `commercial.quote.simulate` (TASK-1211) — confirmar dónde se enforza (route vs lane/command) en Slice 1.
  - Quedan ~17 rutas de lifecycle/pricing sin gate fino visible: `[id]` PUT, `[id]/approve`, `[id]/issue`, `[id]/send`, `[id]/convert-to-invoice`, `[id]/recalculate`, `[id]/lines`, `[id]/lines/[lineItemId]/cost-override`, `pricing/config` PUT, `[id]/terms`, `[id]/versions`, `[id]/save-as-template`, `[id]/share` (+ `[shortCode]` DELETE / send-email / resend-email), `from-service`, `hubspot`. Mapear a `commercial.quotation` (update/approve/export) + `commercial.quote_to_cash.execute` (convert-to-invoice, coordinando con TASK-1206); el `cost-override` + `pricing/config` (price-affecting) podrían ameritar una acción fina propia — decidir en Slice 1/2.

**Decisión de grants del operador (resuelve la Open Question "¿qué roles retienen quote lifecycle?"):** quote lifecycle/pricing → **`efeonce_admin` + `finance_admin`** (más restrictivo). Cuando se implemente, validar contra acceso actual + staging smoke (riesgo de lockout) antes de enforzar; granteear ANTES o junto al gate.

**Convención de nombres:** ya existe de facto (`finance.reconciliation.*`, `finance.payment_*.*`, `commercial.quotation`, `commercial.quote.simulate`). 1192/1193 deberían formalizarla; 1202 la consume como SSOT de quote-write/reconciliation.

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
- Rank: `Finance P1.4`
- Domain: `finance|commercial|access|api|controls`
- Blocked by: `TASK-1192, TASK-1193`
- Branch: `task/TASK-1202-finance-quotes-reconciliation-capability-extension`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Extiende el hardening de capabilities Finance hacia las dos familias mas grandes que quedaron fuera de las olas iniciales: `quotes` y `reconciliation`. El audit encontro 20 write routes de quotes y 15 de reconciliation sin capability fina visible por scan estatico.

## Why This Task Exists

`TASK-1192`, `TASK-1193` y `TASK-1194` cubren pagos, tesoreria, documentos fiscales y sync/materializers. El audit amplio subio el alcance: Finance tiene 123 write routes y 116 sin marker visible, con quotes/reconciliation como mayores superficies restantes. Quote-to-cash y conciliacion bancaria no deben quedar autorizadas solo por route-group amplio.

## Goal

- Mapear write routes de `/api/finance/quotes/**` y `/api/finance/reconciliation/**` a capabilities/action scopes.
- Agregar gates finos donde el command no los tenga ya.
- Mantener read integrity y pricing existing behavior sin romper ECG-004 ni quote line integrity.
- Probar 403 sin capability y happy path con grant para lifecycle, price-affecting y reconciliation actions.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/audits/finance/FINANCE_DEEP_OPERABILITY_AUDIT_2026-06-20.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/documentation/finance/cotizador.md`
- `docs/documentation/finance/conciliacion-bancaria.md`

Reglas obligatorias:

- No cambiar pricing math ni quote lifecycle semantics.
- No meter gates que rompan UI actual sin seed/grant de roles reales.
- No duplicar business logic en route handlers; gates envuelven commands/readers existentes.
- Reconciliation actions must preserve audit/outbox/evidence semantics.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `src/lib/entitlements/capability-grant-coverage.test.ts`

## Dependencies & Impact

### Depends on

- `TASK-1192` and `TASK-1193` should establish naming patterns for finance action capabilities.
- Existing route families:
  - `src/app/api/finance/quotes/**`
  - `src/app/api/finance/reconciliation/**`
  - `src/lib/finance/reconciliation/**`
  - `src/lib/finance/quote-to-cash/**`

### Blocks / Impacts

- Completes the next high-value wave of Finance control hardening.
- Feeds `TASK-1178` broad session-coarse route remediation with a finance-specific slice.
- Prepares future Nexa `propose -> confirm -> execute` for quotes/reconciliation.
- **Capability catalog consumido por `TASK-1211`** (Quote Builder API Parity & Multi-Consumer Foundation): TASK-1211 extrae el command de autoria/emision y registra la Nexa governed action + MCP + API Platform lane consumiendo las capabilities que ESTA task acuña. TASK-1202 es **SSOT del catalogo de capabilities de quote-write**; TASK-1211 NO re-acuña — sigue la convencion de nombres de aqui. La capability de **simulacion** (read/compute, dimension de perfil `internal`/`client`/`public`) la agrega TASK-1211 siguiendo esta misma convencion (ver Open Questions).
- **No invade `TASK-1206`** (close command Q2C): TASK-1202 gatea las rutas; TASK-1206 compone el cierre. El naming de la capability fina de cierre (`commercial.quote_to_cash.execute` u otra) lo fija ESTA task como steward del catalogo.

### Files owned

- `src/app/api/finance/quotes/**/route.ts`
- `src/app/api/finance/reconciliation/**/route.ts`
- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- tests for quotes/reconciliation route gates
- `docs/documentation/finance/cotizador.md`
- `docs/documentation/finance/conciliacion-bancaria.md`

## Current Repo State

### Already exists

- Quote read/pricing integrity is healthy; ECG-004 pricing works after `ISSUE-055`.
- Reconciliation has several capabilities already, but the audit still found many write routes without visible markers.
- Commercial quotation architecture documents the canonical quote actions.

### Gap

- Static scan shows major write capability gaps: 20 quotes routes, 15 reconciliation routes.
- Price-affecting actions (`cost-override`, pricing config) and lifecycle actions need explicit access proof.
- Reconciliation match/unmatch/archive/exclude/auto-match/intelligence actions need complete route/command capability posture.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `api`
- Source of truth afectado: API route authorization and capability registry
- Consumidores afectados: Finance UI, Commercial quote flows, Reconciliation workbench, future Nexa/API Platform actions
- Runtime target: `app`, `staging`, `production`

### Contract surface

- Contrato existente a respetar: quote/reconciliation Product API routes and commands.
- Contrato nuevo o modificado: fine-grained capabilities for quote lifecycle/pricing and reconciliation actions.
- Backward compatibility: `gated`; grants must preserve intended operator access.
- Full API parity: every business action remains programmatic and governed at capability level.

### Data model and invariants

- Entidades/tablas/views afectadas: entitlement registry/grants; quote/reconciliation business tables unchanged unless Plan Mode finds command gaps.
- Invariantes que no se pueden romper:
  - Quote pricing/cost basis math remains unchanged.
  - Quote line orphan count stays 0.
  - Reconciliation anchors and evidence remain auditable.
  - Denied requests do not execute side-effect commands.
- Tenant/space boundary: internal finance/commercial tenant; org/client scope through existing route validation.
- Idempotency/concurrency: existing command semantics preserved.
- Audit/outbox/history: existing quote/reconciliation audit/outbox stays owner of side effects.

### Migration, backfill and rollout

- Migration posture: `seed` capabilities/grants.
- Default state: grant current intended roles, fail closed for roles without action need.
- Backfill plan: N/A for finance data.
- Rollback path: revert PR + reverse grants if access regression.
- External coordination: access owner review for role grants.

### Security and access

- Auth/access gate: existing tenant context + fine-grained `can()`.
- Sensitive data posture: quote pricing/margins, bank reconciliation evidence.
- Error contract: 403 forbidden canonical; no raw margin/evidence leaks.
- Abuse/rate-limit posture: unchanged; sensitive write routes remain bounded by commands.

### Runtime evidence

- Local checks: route tests for missing capability and allowed role for each action class.
- DB/runtime checks: capability registry/grant parity.
- Integration checks: staging smoke for quote create/update/send/approve safe paths and reconciliation candidate/match non-destructive fixture if available.
- Reliability signals/logs: quote/reconciliation existing signals unchanged.
- Production verification sequence: deploy -> smoke allowed operator -> smoke denied operator -> monitor errors.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Quote/reconciliation actions are governed capabilities, not UI-only buttons.
- [ ] Capability + grant land in the same PR.
- [ ] Missing capability blocks before command side effects.
- [ ] UI/Nexa/API consumers can use the same governed route/command.

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

### Slice 1 — Route/action matrix

- Inventory every write route in quotes and reconciliation.
- Mark already governed routes vs command-internal gates vs real gaps.

### Slice 2 — Capability catalog/grants

- Add missing capabilities and role grants with naming aligned to `TASK-1192/1193`.
- Add coverage tests.

### Slice 3 — Route gates and tests

- Add route/command boundary checks.
- Test denied/happy path for lifecycle, pricing config/cost override and reconciliation actions.

### Slice 4 — Staging smoke and audit update

- Run safe staging smokes.
- Update audit with reduced gap counts.

## Out of Scope

- No quote UI redesign.
- No pricing algorithm change.
- No reconciliation algorithm rewrite.
- No HubSpot handler recovery; that belongs to a separate integration issue/task if still degraded.
- No command extraction ni Nexa governed action / MCP / API Platform lane para quotes — eso es `TASK-1211`. Esta task solo acuña capabilities + gates de ruta.
- No close command Q2C (convert-to-cash/invoice) — eso es `TASK-1206`.

## Detailed Spec

Start with a static + code-aware scan; do not assume every route without a visible marker is ungoverned if the command already checks capability. The acceptance target is proof, not regex aesthetics.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4.
- Grants land before or with enforced gates to avoid unintended operator lockout.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Legit finance/commercial user locked out | access | medium | role grant parity and staging smoke | 403 spike on quote/reconciliation |
| Sensitive pricing action remains broad | controls | medium | route/action matrix and tests | capability gap scan |
| Reconciliation side effect executes on denied request | finance ledger | low | gate before command test | audit/outbox unexpected event |

### Feature flags / cutover

- No feature flag expected; access grants provide cutover safety.
- If a risky route cannot be safely gated immediately, document temporary exception with owner and follow-up.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Read-only inventory; rollback not required beyond reverting generated docs/artifacts | inmediato | si |
| Slice 2 | Reverse seed/grants | <15 min | si |
| Slice 3 | Revert PR | <10 min | si |
| Slice 4 | Revert docs/audit | <10 min | si |

### Production verification sequence

1. Deploy to staging with grants.
2. Smoke quote/reconciliation routes as allowed role.
3. Smoke representative denied role returns 403.
4. Promote and monitor access errors.

### Out-of-band coordination required

Access owner/Finance owner review for role grants.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Quotes write routes are mapped and either gated or proven command-governed.
- [ ] Reconciliation write routes are mapped and either gated or proven command-governed.
- [ ] Capability + grants + coverage tests land together.
- [ ] Route tests prove 403 before side effects for missing capability.
- [ ] Audit gap count for quotes/reconciliation is updated.

## Verification

- `pnpm exec vitest run src/app/api/finance/quotes src/app/api/finance/reconciliation src/lib/entitlements`
- `pnpm task:lint --task TASK-1202`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed --finance --runtime --auth --docs`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] Finance audit and route capability audit updated.

## Follow-ups

- HubSpot outbound handler recovery if degraded quotation sync remains after access hardening.

## Open Questions

- Which commercial roles beyond `FINANCE_ADMIN` should retain quote lifecycle actions?
- ¿La capability de **simulacion de precio** (read/compute con perfil de output) se acuña aqui o en `TASK-1211`? Decision: la **convencion de nombres** la fija esta task (catalogo SSOT); `TASK-1211` agrega la fila de simulate siguiendola. Confirmar al mapear el route/action matrix (Slice 1).
