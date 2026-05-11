import { describe, expect, it } from 'vitest'

import { AGGREGATE_TYPES, EVENT_TYPES, REACTIVE_EVENT_TYPES } from '@/lib/sync/event-catalog'

describe('event catalog', () => {
  it('exports aggregate types as non-empty object', () => {
    expect(Object.keys(AGGREGATE_TYPES).length).toBeGreaterThan(0)
  })

  it('exports event types as non-empty object', () => {
    expect(Object.keys(EVENT_TYPES).length).toBeGreaterThan(0)
  })

  it('all event types follow dot notation (aggregate.action)', () => {
    for (const [key, eventType] of Object.entries(EVENT_TYPES)) {
      expect(eventType, `${key} has invalid eventType`).toMatch(/^[a-z_]+\.[a-z_]+/)
    }
  })

  it('aggregate type values are unique strings', () => {
    const values = Object.values(AGGREGATE_TYPES)
    const unique = new Set(values)

    expect(unique.size).toBe(values.length)
  })

  it('REACTIVE_EVENT_TYPES is a non-empty array of strings', () => {
    expect(Array.isArray(REACTIVE_EVENT_TYPES)).toBe(true)
    expect(REACTIVE_EVENT_TYPES.length).toBeGreaterThan(0)

    for (const et of REACTIVE_EVENT_TYPES) {
      expect(typeof et).toBe('string')
      expect(et).toMatch(/^[a-z_]+\.[a-z_]+/)
    }
  })

  it('reactive events are a subset of all event types', () => {
    const allEventValues = new Set(Object.values(EVENT_TYPES))

    for (const re of REACTIVE_EVENT_TYPES) {
      expect(allEventValues.has(re), `${re} not in EVENT_TYPES`).toBe(true)
    }
  })

  it('includes payroll_period.exported in both event catalog and reactive triggers', () => {
    expect(EVENT_TYPES.payrollPeriodExported).toBe('payroll_period.exported')
    expect(REACTIVE_EVENT_TYPES).toContain('payroll_period.exported')
  })

  it('includes staff augmentation placement lifecycle events in the reactive catalog', () => {
    expect(EVENT_TYPES.staffAugPlacementCreated).toBe('staff_aug.placement.created')
    expect(EVENT_TYPES.staffAugPlacementSnapshotMaterialized).toBe('staff_aug.placement_snapshot.materialized')
    expect(REACTIVE_EVENT_TYPES).toContain('staff_aug.placement.created')
    expect(REACTIVE_EVENT_TYPES).toContain('staff_aug.placement.updated')
  })

  it('includes leave payroll impact events in both event catalog and reactive triggers', () => {
    expect(EVENT_TYPES.leaveRequestPayrollImpactDetected).toBe('leave_request.payroll_impact_detected')
    expect(REACTIVE_EVENT_TYPES).toContain('leave_request.payroll_impact_detected')
  })

  it('includes leave balance adjustment events in the catalog', () => {
    expect(EVENT_TYPES.leaveBalanceAdjusted).toBe('leave_balance.adjusted')
    expect(EVENT_TYPES.leaveBalanceAdjustmentReversed).toBe('leave_balance.adjustment_reversed')
  })

  it('includes CRM company lifecycle stage change as a non-reactive catalog event', () => {
    expect(AGGREGATE_TYPES.crmCompany).toBe('crm_company')
    expect(EVENT_TYPES.companyLifecycleStageChanged).toBe('crm.company.lifecyclestage_changed')
    expect(REACTIVE_EVENT_TYPES).not.toContain('crm.company.lifecyclestage_changed')
  })

  it('includes party lifecycle outbound result events as non-reactive catalog events', () => {
    expect(EVENT_TYPES.commercialPartyHubSpotSyncedOut).toBe('commercial.party.hubspot_synced_out')
    expect(EVENT_TYPES.commercialPartySyncConflict).toBe('commercial.party.sync_conflict')
    expect(REACTIVE_EVENT_TYPES).not.toContain('commercial.party.hubspot_synced_out')
    expect(REACTIVE_EVENT_TYPES).not.toContain('commercial.party.sync_conflict')
  })

  it('includes capability deprecation as a non-reactive governance event', () => {
    expect(EVENT_TYPES.capabilityDeprecated).toBe('access.capability.deprecated')
    expect(REACTIVE_EVENT_TYPES).not.toContain('access.capability.deprecated')
  })

  it('includes ICO AI LLM enrichment events in the catalog and reactive trigger list', () => {
    expect(EVENT_TYPES.icoAiLlmEnrichmentsMaterialized).toBe('ico.ai_llm_enrichments.materialized')
    expect(REACTIVE_EVENT_TYPES).toContain('ico.ai_llm_enrichments.materialized')
  })
})
