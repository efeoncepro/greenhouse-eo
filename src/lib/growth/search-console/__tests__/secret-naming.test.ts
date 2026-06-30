import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { buildSearchConsoleSecretId } from '../secret-naming'

describe('buildSearchConsoleSecretId', () => {
  it('prefija con search-console-token y sanitiza el organization_id', () => {
    expect(buildSearchConsoleSecretId('grupo-berel')).toBe('search-console-token-grupo-berel')
  })

  it('normaliza acentos, mayúsculas y caracteres no válidos', () => {
    expect(buildSearchConsoleSecretId('Órg Acmé S.A.')).toBe('search-console-token-org-acme-s-a')
  })

  it('lanza si el organization_id queda vacío tras sanitizar', () => {
    expect(() => buildSearchConsoleSecretId('   ')).toThrow()
    expect(() => buildSearchConsoleSecretId('***')).toThrow()
  })
})
