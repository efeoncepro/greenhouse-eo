# TASK-622 — Multi-level Approval + Permission Hierarchy

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Alto`
- Effort: `Medio` (~3 dias)
- Type: `implementation`
- Epic: `none` (RESEARCH-005 P2 Bloque E)
- Status real: `Diseno cerrado v1.9`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `TASK-555`
- Branch: `task/TASK-622-multi-level-approval-permission-hierarchy`

## Summary

Hierarchy de roles comerciales con scopes diferenciados (`sales_rep` / `account_lead` / `sales_lead` / `finance_admin`) + workflow de approval multi-level con escalation cuando discount excede umbral. Reemplaza el modelo actual de "todo o nada" (Finance Admin / Efeonce Admin) con granularidad operacional.

## Why This Task Exists

Hoy un sales rep junior puede aplicar un 50% discount sin gate. O un sales rep no puede ver quotes de su equipo aunque sea Account Lead. Sin permission granularity:
- Riesgo financiero (discount runaway)
- Sales reps frustrados (ven todo o nada)
- Imposible delegar aprobaciones operativas

## Goal

- 4 roles comerciales con scopes claros
- Tabla `commercial_approval_thresholds` per business_line: max discount sin approval, max amount sin escalation
- Workflow approval: quote requires approval -> notification a approver -> SLA tracking 48h -> escalation automatica
- Permission matrix documentada en arquitectura
- UI: ver "tu quote requiere aprobacion de [X]" en QuoteDetailView + bandeja de approvers pendientes

## Architecture Alignment

- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/research/RESEARCH-005...` Delta v1.9

## Dependencies & Impact

### Depends on

- TASK-555 (commercial routeGroup foundation)
- TASK-619 (signature workflow ya tiene el concepto de gates)

### Blocks / Impacts

- TASK-619 (governance gates: enviar a firma requiere approve)
- TASK-624 (renewal quotes auto-generated tambien necesitan approval)

### Files owned

- `migrations/YYYYMMDD_task-622-commercial-roles-approval.sql` (nuevo)
- `src/lib/commercial/approval-workflow-store.ts` (nuevo)
- `src/lib/commercial/permission-matrix.ts` (nuevo)
- `src/app/api/commercial/quotes/[id]/approve/route.ts` (nuevo)
- `src/app/api/commercial/quotes/[id]/reject/route.ts` (nuevo)
- `src/views/greenhouse/finance/ApprovalsInboxView.tsx` (nuevo)
- `src/config/entitlements-catalog.ts` (modificado: 4 roles comerciales)

## Scope

### Slice 1 — Roles + thresholds schema (0.5 dia)

```sql
-- Roles agregados en seed entitlements: sales_rep, account_lead, sales_lead, commercial_admin
-- (Finance Admin y Efeonce Admin se mantienen)

CREATE TABLE greenhouse_commercial.approval_thresholds (
  threshold_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_line_code text NOT NULL,
  currency text NOT NULL,
  max_discount_pct_no_approval numeric(5,2) NOT NULL DEFAULT 10.00,
  max_amount_no_escalation numeric(14,2) NOT NULL DEFAULT 50000000,  -- ej. 50M CLP
  required_approver_role text NOT NULL DEFAULT 'sales_lead',
  escalation_role text NOT NULL DEFAULT 'commercial_admin',
  sla_hours int NOT NULL DEFAULT 48,
  UNIQUE (business_line_code, currency)
);

CREATE TABLE greenhouse_commercial.quote_approval_requests (
  approval_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id text NOT NULL,
  version_number int NOT NULL,
  required_role text NOT NULL,
  reason text NOT NULL,           -- "discount_exceeds_threshold", "amount_exceeds_threshold"
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'escalated', 'cancelled')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  requested_by_user_id text NOT NULL,
  reviewed_at timestamptz,
  reviewed_by_user_id text,
  review_notes text,
  escalated_at timestamptz,
  due_at timestamptz NOT NULL,
  notification_sent_at timestamptz
);
```

### Slice 2 — Permission matrix (0.5 dia)

`src/lib/commercial/permission-matrix.ts`:

| Action | sales_rep | account_lead | sales_lead | commercial_admin | finance_admin |
|---|---|---|---|---|---|
| Create quote | ✅ own | ✅ team | ✅ team | ✅ all | ✅ all |
| Edit quote draft | ✅ own | ✅ team | ✅ team | ✅ all | ✅ all |
| Apply discount up to threshold | ✅ | ✅ | ✅ | ✅ | ✅ |
| Apply discount exceeding threshold | ❌ requires approval | ❌ | ✅ | ✅ | ✅ |
| Approve discount request | ❌ | ❌ | ✅ team | ✅ all | ✅ all |
| Send to ZapSign | ✅ own | ✅ team | ✅ team | ✅ all | ✅ all |
| Cancel signature post-firma | ❌ | ❌ | ❌ | ✅ | ✅ |
| Override invoice without signature | ❌ | ❌ | ❌ | ❌ | ✅ |
| Edit catalog | ❌ | ❌ | ❌ | ✅ | ✅ |
| View partner reports | ❌ | ❌ | ❌ | ✅ | ✅ |

### Slice 3 — Approval workflow + endpoints (1 dia)

```typescript
export const requestQuoteApproval = async (input: {
  quotationId: string
  versionNumber: number
  reason: 'discount_exceeds' | 'amount_exceeds'
  actorUserId: string
}) => {
  const threshold = await getApprovalThreshold(quote.businessLineCode, quote.currency)
  await insertApprovalRequest({ ...input, requiredRole: threshold.requiredApproverRole, dueAt: now() + threshold.slaHours * 3600 })
  await notifyApprovers(threshold.requiredApproverRole, input.quotationId)
}

// Cron job hourly: si due_at < now() y status='pending' -> escalate
```

Endpoints:
- `POST /api/commercial/quotes/[id]/request-approval` - request
- `POST /api/commercial/quotes/[id]/approve` - approver action
- `POST /api/commercial/quotes/[id]/reject` - approver action

### Slice 4 — UI inbox + tests (1 dia)

`<ApprovalsInboxView>`:

```
┌─ Aprobaciones pendientes (3) ─────────────┐
│ Filter: [Todas ▼] [Vencidas] [Mis equipos]│
│                                            │
│ 🔴 QT-2026-0042 v3 · Acme Corp            │
│    Solicitado por Juan Perez · hace 6h    │
│    Razon: Discount 25% (max 10%)          │
│    SLA: vence en 42h                      │
│    [Aprobar] [Rechazar]                   │
│ ...                                        │
└────────────────────────────────────────────┘
```

Visible en `/finance/approvals`. Permission gate: solo roles `sales_lead | commercial_admin | finance_admin` ven esta surface.

Tests:
- Threshold check: discount > limit -> approval required
- Escalation: pasa SLA -> automatically escalated
- Permission matrix tests per action

## Out of Scope

- Multi-step approval (2+ approvers en serie) — Fase 2
- Custom approval rules per cliente — Fase 2
- Slack interactive approval (boton aprobar en mensaje Slack) — Fase 2

## Acceptance Criteria

- [ ] 4 roles seedeados
- [ ] thresholds table con seed por business_line
- [ ] approval workflow funcional
- [ ] inbox UI funcional
- [ ] escalation automatica via cron
- [ ] permission matrix enforced en endpoints
- [ ] tests passing

## Verification

- Crear quote con discount > 10% como sales_rep -> requiere approval
- Approve as sales_lead -> quote unblocked
- Si pasan 48h -> auto-escalate a commercial_admin

## Closing Protocol

- [ ] Lifecycle sincronizado
- [ ] Handoff con permission matrix screenshots
- [ ] `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` updated con 4 roles
