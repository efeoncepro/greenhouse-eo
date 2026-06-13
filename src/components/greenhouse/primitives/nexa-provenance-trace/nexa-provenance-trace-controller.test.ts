/**
 * NexaProvenanceTrace — contrato del resolver (TASK-1103).
 * Lockea kind→variant: cada kind semántico (knowledgeGrounded/signalPromoted/computed/custom) resuelve
 * a un variant funcional EXISTENTE (inline/expandable/panel) y el variant explícito gana. Pura.
 */
import { describe, expect, it } from 'vitest'

import { NEXA_PROVENANCE_TRACE_KIND_CONFIG, resolveNexaProvenanceTraceVariant } from './nexa-provenance-trace-controller'
import type { NexaProvenanceTraceVariant } from './nexa-provenance-trace-types'

const VARIANTS: NexaProvenanceTraceVariant[] = ['inline', 'expandable', 'panel']

describe('resolveNexaProvenanceTraceVariant', () => {
  it('cada kind resuelve a un variant existente del catálogo', () => {
    for (const kind of Object.keys(NEXA_PROVENANCE_TRACE_KIND_CONFIG) as Array<keyof typeof NEXA_PROVENANCE_TRACE_KIND_CONFIG>) {
      expect(VARIANTS).toContain(resolveNexaProvenanceTraceVariant({ kind }))
    }
  })

  it('mapea los kinds canónicos (knowledgeGrounded→panel, signalPromoted/computed→inline)', () => {
    expect(resolveNexaProvenanceTraceVariant({ kind: 'knowledgeGrounded' })).toBe('panel')
    expect(resolveNexaProvenanceTraceVariant({ kind: 'signalPromoted' })).toBe('inline')
    expect(resolveNexaProvenanceTraceVariant({ kind: 'computed' })).toBe('inline')
  })

  it('el variant explícito gana sobre el del kind', () => {
    expect(resolveNexaProvenanceTraceVariant({ kind: 'knowledgeGrounded', variant: 'inline' })).toBe('inline')
  })

  it('sin kind ni variant → custom→inline (default restraint)', () => {
    expect(resolveNexaProvenanceTraceVariant({})).toBe('inline')
  })
})
