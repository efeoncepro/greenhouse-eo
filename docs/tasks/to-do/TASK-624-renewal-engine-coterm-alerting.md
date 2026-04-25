# TASK-624 — Renewal Engine + Co-term + Alerting Cascade

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Muy Alto`
- Effort: `Alto` (~4 dias)
- Type: `implementation`
- Epic: `none` (RESEARCH-005 P2 Bloque E)
- Status real: `Diseno cerrado v1.9`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-619, TASK-620.3, TASK-620.7`
- Branch: `task/TASK-624-renewal-engine-coterm-alerting`

## Summary

Engine de renovacion automatica de quotes recurrentes (`commercial_model='on_going'`). Cron detecta expiracion a 90/30/7 dias antes (cascade configurable per tenant), emite eventos de renewal upcoming + auto-genera renewal quote (draft) con misma composition + opcion de co-term (agrupar multiples renewals del mismo cliente en un solo renewal date). Notification cascade a sales rep y account lead.

## Why This Task Exists

Sin renewal engine, sales rep tiene que recordar manualmente cuando expira cada retainer. Para Efeonce con 50+ clientes con retainers anuales mensuales/trimestrales, eso significa pierdas de revenue por olvidos. RESEARCH-005 Decision 2 ya confirmo: event-based + client-driven combinado.

## Goal

- Tabla `service_renewal_alerts` con cascade per tenant (default 90/30/7 dias)
- Cron daily detecta quotes vigentes con `valid_until` + `commercial_model='on_going'` que entran en ventana de alerta
- Emite eventos outbox `commercial.quote.renewal_upcoming_90` / `_30` / `_7`
- Auto-genera renewal quote draft (mismo composition snapshot, valid_until + duration_months)
- Co-term: si cliente tiene 3 quotes diferentes expiring en proximos 60 dias, ofrece agruparlos en un solo renewal quote con prorrateo
- UI bandeja "Renewals upcoming" en `/finance/renewals`

## Architecture Alignment

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md`
- `docs/research/RESEARCH-005...` Delta v1.9 (cascade decision)

## Dependencies & Impact

### Depends on

- TASK-619 (signed quote es trigger del renewal cycle)
- TASK-620.3 (composition snapshot existe)
- TASK-620.7 (lifecycle sunset bloquea renewal de items archived)

### Blocks / Impacts

- TASK-628 (amendment es alternative a renewal)
- TASK-621 (renewal rate metric)

### Files owned

- `migrations/YYYYMMDD_task-624-renewal-engine.sql` (nuevo)
- `services/ops-worker/src/jobs/renewal-detection.ts` (nuevo, en Cloud Run worker)
- `src/lib/commercial/renewal-engine.ts` (nuevo)
- `src/lib/commercial/co-term-grouping.ts` (nuevo)
- `src/views/greenhouse/finance/RenewalsInboxView.tsx` (nuevo)
- `src/app/api/commercial/renewals/route.ts` (nuevo)

## Scope

### Slice 1 — Schema + cascade (0.5 dia)

```sql
CREATE TABLE greenhouse_commercial.service_renewal_alerts (
  alert_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  alert_offset_days int NOT NULL,                 -- 90, 30, 7 default
  event_type text NOT NULL DEFAULT 'commercial.quote.renewal_upcoming',
  enabled boolean NOT NULL DEFAULT true,
  notification_channels text[] DEFAULT ARRAY['email', 'in-app'],
  UNIQUE (tenant_id, alert_offset_days)
);

CREATE TABLE greenhouse_commercial.renewal_drafts (
  renewal_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_quotation_id text NOT NULL,
  source_version_number int NOT NULL,
  draft_quotation_id text,                        -- creada cuando user accepts
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'co_term_grouped')),
  detected_at timestamptz NOT NULL DEFAULT now(),
  due_date date NOT NULL,                         -- valid_until original
  cohort_group_id uuid,                           -- for co-term grouping
  notes text
);

-- Default alerts cascade for all tenants
INSERT INTO service_renewal_alerts (tenant_id, alert_offset_days)
SELECT client_id, unnest(ARRAY[90, 30, 7]) FROM greenhouse.clients;
```

### Slice 2 — Cron renewal detection (1 dia)

`services/ops-worker/src/jobs/renewal-detection.ts`:

- Daily cron 7am Santiago time
- Query quotes con `signature_status='signed' AND commercial_model='on_going' AND valid_until BETWEEN now() AND now() + 95 days`
- Para cada quote: para cada offset (90/30/7), si `valid_until - now() = offset_days +/- 1d` y NOT EXISTS renewal_alert_emitted -> emit event + insert renewal_drafts row

### Slice 3 — Auto-generate renewal quote draft (1 dia)

```typescript
export const generateRenewalDraft = async (sourceQuoteId: string) => {
  // Snapshot composition del source
  const source = await getQuoteWithComposition(sourceQuoteId)

  // Crear nueva quotation con mismo cliente + composition + override valid_until
  const draft = await createQuotation({
    organizationId: source.organizationId,
    composition: source.composition,           // expand del catalogo actual (puede haber diff)
    validUntil: source.validUntil + source.defaultDurationMonths,
    sourceRenewalOf: sourceQuoteId,            // lineage tracking
    status: 'draft'
  })

  return draft
}
```

Detect drift: si la composition source usa items que ahora estan en `lifecycle_state='archived'` (TASK-620.7) -> warning al sales rep.

### Slice 4 — Co-term grouping (0.75 dia)

```typescript
export const detectCoTermOpportunity = async (clientId: string) => {
  // Quotes vigentes del mismo cliente expiring en proximos 60 dias
  const candidates = await runQuery(`
    SELECT * FROM quotations
    WHERE client_id = $1
      AND signature_status = 'signed'
      AND commercial_model = 'on_going'
      AND valid_until BETWEEN now() AND now() + 60 days
  `, [clientId])

  if (candidates.length >= 2) {
    // Suggest grouping en un solo renewal quote con prorrateo
    return { canGroup: true, candidates, suggestedRenewalDate: max(candidates.map(c => c.valid_until)) }
  }
  return { canGroup: false }
}
```

UI muestra suggestion: "3 quotes de Acme Corp expiran en proximos 60 dias, considera agrupar en 1 renewal quote".

### Slice 5 — UI inbox + endpoints + tests (0.75 dia)

`<RenewalsInboxView>`:

```
┌─ Renewals upcoming (12) ──────────────────┐
│ [90 days ▼] [30 days] [7 days vencidos]   │
│                                            │
│ 🟢 Acme Corp · QT-2026-0001 v3            │
│    Vence en 87 dias · $50K USD anual      │
│    [Generar renewal draft]                 │
│ 🟡 Globo Inc · QT-2026-0014 v1            │
│    Vence en 28 dias · $24K USD trimestral │
│    [Generar renewal draft]                 │
│ 🔴 Wave LLC · QT-2026-0033 v2             │
│    Vence en 5 dias · $12K USD             │
│    [Generar renewal draft] (urgente)       │
│ ...                                        │
│ ┌─ Co-term opportunity ───┐                │
│ │ 3 quotes Acme Corp      │                │
│ │ [Ver propuesta agrupada]│                │
│ └─────────────────────────┘                │
└────────────────────────────────────────────┘
```

Endpoints:
- `GET /api/commercial/renewals` - inbox listing
- `POST /api/commercial/renewals/[id]/generate-draft` - create draft quote
- `POST /api/commercial/renewals/co-term` - generate grouped renewal

Tests:
- Cron 90/30/7 cascade emits eventos correctamente
- Draft generation copia composition + adjusta dates
- Co-term suggestion deteccion correcta

## Out of Scope

- Auto-send renewal a cliente sin sales rep approval (sales rep siempre revisa primero)
- Renewal pricing auto-adjustment por inflation (Fase 2)
- Multi-tenant cascade configuration UI (manual via SQL en v1)

## Acceptance Criteria

- [ ] migracion + seed cascade default
- [ ] cron daily funcional en ops-worker
- [ ] eventos 90/30/7 emitidos correctamente
- [ ] draft generation con composition snapshot
- [ ] co-term grouping detection
- [ ] UI inbox funcional
- [ ] tests passing
- [ ] aplicado en prod

## Verification

- E2E: signed quote con valid_until=89 dias, cron run -> evento _90 emitido
- Draft generated copia composition + nueva valid_until correcta
- Co-term: 3 quotes mismo cliente en proximos 60d -> suggestion visible

## Closing Protocol

- [ ] Lifecycle sincronizado
- [ ] Handoff con metricas iniciales (cuantos renewals detectados primer mes)
- [ ] `docs/documentation/finance/renewals.md` (nuevo)
