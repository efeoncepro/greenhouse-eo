import { describe, expect, it } from 'vitest'

import { getSharedMessages } from './messages'

describe('Greenhouse i18n messages', () => {
  it('returns serializable shared messages for the default locale', () => {
    const messages = getSharedMessages('es-CL')

    expect(messages.shared.actions.save).toBe('Guardar')
    expect(() => JSON.stringify(messages)).not.toThrow()
    expect(JSON.parse(JSON.stringify(messages)).shared.time.justNow).toBe('Recién')
  })

  it('returns translated shared messages for en-US without leaking email functions', () => {
    const messages = getSharedMessages('en-US')

    expect(messages.shared.actions.save).toBe('Save')
    expect(messages.shared.states.pending).toBe('Pending')
    expect(messages.shared.empty.noResults).toBe('No results')
    expect(messages).not.toHaveProperty('shared.emails')
  })
})
