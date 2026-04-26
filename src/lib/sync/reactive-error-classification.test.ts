import { describe, expect, it } from 'vitest'

import {
  classifyReactiveError,
  extractReactiveErrorCategory,
  stripReactiveErrorCategory
} from './reactive-error-classification'

describe('reactive-error-classification', () => {
  it('classifies postgres permission errors as infra.db_privilege', () => {
    const result = classifyReactiveError(new Error('permission denied for table service_attribution_facts'))

    expect(result.category).toBe('infra.db_privilege')
    expect(result.family).toBe('infrastructure')
    expect(result.isInfrastructure).toBe(true)
    expect(result.formattedMessage).toBe(
      '[infra.db_privilege] permission denied for table service_attribution_facts'
    )
  })

  it('keeps application errors unprefixed', () => {
    const result = classifyReactiveError(new Error('catalog_binding_missing:line-1'))

    expect(result.category).toBe('application')
    expect(result.family).toBe('application')
    expect(result.isInfrastructure).toBe(false)
    expect(result.formattedMessage).toBe('catalog_binding_missing:line-1')
  })

  it('extracts and strips category prefixes from persisted error messages', () => {
    const message = '[infra.db_privilege] permission denied for table service_attribution_facts'

    expect(extractReactiveErrorCategory(message)).toBe('infra.db_privilege')
    expect(stripReactiveErrorCategory(message)).toBe('permission denied for table service_attribution_facts')
  })

  it.each([
    'Missing GREENHOUSE_INTEGRATION_API_TOKEN for HubSpot integration service write request.',
    'Missing HUBSPOT_PRIVATE_APP_TOKEN',
    'missing api_key for vendor x',
    'missing API key for service x',
    'Missing credentials for client',
    'secret hubspot-token not found',
    'invalid token from auth service'
  ])('routes credential / missing-secret errors to infra.credential: %s', message => {
    const result = classifyReactiveError(new Error(message))

    expect(result.category).toBe('infra.credential')
    expect(result.isInfrastructure).toBe(true)
    expect(result.formattedMessage.startsWith('[infra.credential]')).toBe(true)
  })
})
