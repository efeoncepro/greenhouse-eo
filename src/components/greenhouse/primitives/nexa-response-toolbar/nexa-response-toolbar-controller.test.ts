/**
 * NexaResponseToolbar — contrato del resolver (TASK-1104). kind→variant neutro + variant explícito gana.
 */
import { describe, expect, it } from 'vitest'

import { NEXA_RESPONSE_TOOLBAR_KIND_CONFIG, resolveNexaResponseToolbarVariant } from './nexa-response-toolbar-controller'
import type { NexaResponseToolbarVariant } from './nexa-response-toolbar-types'

const VARIANTS: NexaResponseToolbarVariant[] = ['embedded', 'floating', 'docked']

describe('resolveNexaResponseToolbarVariant', () => {
  it('cada kind resuelve a un variant existente', () => {
    for (const kind of Object.keys(NEXA_RESPONSE_TOOLBAR_KIND_CONFIG) as Array<keyof typeof NEXA_RESPONSE_TOOLBAR_KIND_CONFIG>) {
      expect(VARIANTS).toContain(resolveNexaResponseToolbarVariant({ kind }))
    }
  })

  it('mapea los kinds canónicos (responseSettle→embedded, chatMessage→floating, surfaceBar→docked)', () => {
    expect(resolveNexaResponseToolbarVariant({ kind: 'responseSettle' })).toBe('embedded')
    expect(resolveNexaResponseToolbarVariant({ kind: 'chatMessage' })).toBe('floating')
    expect(resolveNexaResponseToolbarVariant({ kind: 'surfaceBar' })).toBe('docked')
  })

  it('el variant explícito gana sobre el del kind', () => {
    expect(resolveNexaResponseToolbarVariant({ kind: 'chatMessage', variant: 'embedded' })).toBe('embedded')
  })

  it('sin kind ni variant → custom→embedded', () => {
    expect(resolveNexaResponseToolbarVariant({})).toBe('embedded')
  })
})
