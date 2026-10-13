import { describe, expect, it, vi } from 'vitest'

import { createAxisGrowthInputFactory } from '../input-behavior-adapter'

describe('AXIS behavior adoption port', () => {
  it('routes explicit field kinds without inventing document or currency policies', () => {
    const behavior = { resolve: (text: string) => ({ display: text, value: text, state: 'ready' as const }) }

    const api = {
      email: vi.fn(() => behavior),
      url: vi.fn(() => behavior),
      rut: vi.fn(() => behavior),
      phone: vi.fn(() => behavior)
    }

    const factory = createAxisGrowthInputFactory(api)

    expect(factory({ key: 'e', type: 'email', label: 'Correo' })).toBe(behavior)
    expect(factory({ key: 'p', type: 'tel', label: 'Teléfono', validatorParams: { country: 'BR' } })).toBe(behavior)
    expect(api.phone).toHaveBeenLastCalledWith('BR')
    factory({ key: 'p', type: 'tel', label: 'Teléfono' }, 'us')
    expect(api.phone).toHaveBeenLastCalledWith('US')
    expect(factory({ key: 'id', type: 'national_id', label: 'RUT', validatorParams: { country: 'CL' } })).toBe(behavior)
    for (const field of [
      { key: 'rut', type: 'text', label: 'Documento' },
      { key: 'n', type: 'number', label: 'Cantidad' },
      { key: 'id', type: 'national_id', label: 'Documento', validatorParams: { country: 'PE' } }
    ] as const)
      expect(factory(field)).toBeUndefined()
  })
})
