# TASK-628.1 — Audit Timeline UI (visibility en QuoteDetailView de audit_log + outbox events + diff viewer)

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Bajo` (~1.5 dias)
- Type: `implementation`
- Epic: `none` (RESEARCH-005 P2 Bloque E)
- Status real: `Diseno cerrado v1.9`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-619, TASK-628`
- Branch: `task/TASK-628.1-audit-timeline-ui`

## Summary

Componente `<QuoteAuditTimeline>` en QuoteDetailView que muestra historial completo del quote: created -> v2 generated -> approved -> sent -> signed by client -> countersigned -> amendment 1 -> ... + diff viewer entre versiones (compositional changes visualizados). Reune audit_log entries + outbox events emitidos en una vista temporal unificada.

## Why This Task Exists

Sin timeline visible, sales rep no puede explicar al cliente "que cambio entre v3 y v4". Audit trail existe en DB pero invisible al usuario. Tambien necesario para LATAM compliance audits (SII pide trail completo).

## Goal

- Componente Timeline en QuoteDetailView (tab "Historia" o panel lateral)
- Eventos rendered: quote created, version generated, status transitions, signature events, amendments, force_invoice override
- Cada evento: actor, timestamp (relative + absolute hover), action, optional details
- Diff viewer modal entre 2 versiones seleccionables: composition delta visualization
- Filter por tipo de evento + actor + fecha range
- Export PDF del timeline (audit-grade document)

## Architecture Alignment

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/research/RESEARCH-005...` Delta v1.9

## Dependencies & Impact

### Depends on

- TASK-619 (signature events emitidos)
- TASK-628 (amendment events)
- audit_log existente

### Files owned

- `src/components/greenhouse/timelines/QuoteAuditTimeline.tsx` (nuevo)
- `src/components/greenhouse/timelines/QuoteVersionDiffViewer.tsx` (nuevo)
- `src/lib/finance/audit-timeline-aggregator.ts` (nuevo)
- `src/app/api/finance/quotes/[id]/timeline/route.ts` (nuevo)
- `src/views/greenhouse/finance/QuoteDetailView.tsx` (modificado: agregar tab/panel)

## Scope

### Slice 1 — Timeline aggregator (0.5 dia)

```typescript
// src/lib/finance/audit-timeline-aggregator.ts
export const getQuoteTimeline = async (quotationId: string): Promise<TimelineEvent[]> => {
  const auditEvents = await runQuery(`
    SELECT * FROM greenhouse_commercial.quotation_audit_log
    WHERE quotation_id = $1
    ORDER BY created_at ASC
  `, [quotationId])

  const outboxEvents = await runQuery(`
    SELECT * FROM greenhouse_commercial.commercial_outbox
    WHERE payload->>'quotationId' = $1
    AND event_type LIKE 'commercial.quote.%'
    ORDER BY created_at ASC
  `, [quotationId])

  const amendments = await runQuery(`
    SELECT * FROM greenhouse_commercial.quotation_amendments
    WHERE source_quotation_id = $1
    ORDER BY created_at ASC
  `, [quotationId])

  const versions = await runQuery(`
    SELECT * FROM greenhouse_commercial.quotation_versions
    WHERE quotation_id = $1
    ORDER BY created_at ASC
  `, [quotationId])

  return mergeAndSortByTimestamp([auditEvents, outboxEvents, amendments, versions])
    .map(toTimelineEvent)
}

interface TimelineEvent {
  timestamp: Date
  actor: { userId: string; name: string }
  category: 'creation' | 'modification' | 'workflow' | 'signature' | 'amendment' | 'compliance'
  action: string                    // 'quote_created', 'version_generated', 'sent_to_signature', etc.
  description: string               // human-readable
  metadata?: Record<string, unknown>
  diffAvailable?: { fromVersion: number; toVersion: number }
}
```

### Slice 2 — UI Timeline component (0.5 dia)

```tsx
// QuoteAuditTimeline.tsx usando MUI Lab Timeline
<Timeline>
  {events.map(event => (
    <TimelineItem key={event.id}>
      <TimelineSeparator>
        <TimelineDot color={categoryColor(event.category)}>
          {iconForAction(event.action)}
        </TimelineDot>
        <TimelineConnector />
      </TimelineSeparator>
      <TimelineContent>
        <Typography variant="body2">{event.description}</Typography>
        <Typography variant="caption" color="text.secondary">
          {event.actor.name} · {formatRelativeTime(event.timestamp)}
        </Typography>
        {event.diffAvailable && (
          <Button size="small" onClick={() => openDiffViewer(event.diffAvailable)}>
            Ver cambios v{event.diffAvailable.fromVersion} -> v{event.diffAvailable.toVersion}
          </Button>
        )}
      </TimelineContent>
    </TimelineItem>
  ))}
</Timeline>
```

Filters above timeline: event category + actor + date range.

### Slice 3 — Diff viewer modal (0.5 dia)

`<QuoteVersionDiffViewer>`:

Compara 2 snapshots de `quotation_versions` y muestra:
- Roles added/removed/modified (con highlight color)
- Tools added/removed/modified
- Artifacts added/removed/modified
- Pricing changes per linea
- Total impact

Reusa `composition-diff.ts` (TASK-628 helper).

### Slice 4 — Endpoint + tests (~mezclado)

`GET /api/finance/quotes/[id]/timeline` retorna events array. Permission: same que ver el quote.

Tests:
- Aggregator merges correctamente las 4 sources
- Timeline UI renders todos los event types
- Diff viewer compara 2 versions correctamente

## Out of Scope

- Real-time updates (refresh manual)
- Comments per evento (sales rep agrega notas) — Fase 2
- Webhook subscribers para eventos (other systems quieren timeline events) — Fase 2

## Acceptance Criteria

- [ ] aggregator funcional
- [ ] timeline UI integrado en QuoteDetailView
- [ ] diff viewer funcional entre 2 versions
- [ ] filters funcionales
- [ ] tests passing

## Verification

- Quote con historia compleja (creada, v2, approved, sent, signed, amendment 1) -> timeline muestra todos los eventos en orden
- Diff v1 vs v2 muestra changes correctamente

## Closing Protocol

- [ ] Lifecycle sincronizado
- [ ] Handoff con timeline screenshot
- [ ] `docs/documentation/finance/cotizaciones-gobernanza.md` updated seccion "Audit timeline"
