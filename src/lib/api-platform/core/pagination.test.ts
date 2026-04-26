import { describe, expect, it } from 'vitest'

import {
  buildApiPlatformPaginationLinkHeader,
  buildApiPlatformPaginationMeta,
  parseApiPlatformPaginationParams
} from './pagination'

describe('api platform pagination', () => {
  it('parses bounded page pagination params', () => {
    const params = parseApiPlatformPaginationParams(
      new Request('https://example.com/api/platform/ecosystem/organizations?page=3&pageSize=500')
    )

    expect(params).toEqual({
      page: 3,
      pageSize: 100,
      offset: 200
    })
  })

  it('builds page navigation metadata and link headers', () => {
    const pagination = buildApiPlatformPaginationMeta({
      page: 2,
      pageSize: 25,
      total: 80,
      count: 25
    })

    expect(pagination).toEqual({
      page: 2,
      pageSize: 25,
      total: 80,
      count: 25,
      hasNextPage: true,
      hasPreviousPage: true,
      nextPage: 3,
      previousPage: 1
    })

    const link = buildApiPlatformPaginationLinkHeader({
      request: new Request('https://example.com/api/platform/ecosystem/capabilities?page=2&pageSize=25'),
      nextPage: pagination.nextPage,
      previousPage: pagination.previousPage
    })

    expect(link).toContain('page=3')
    expect(link).toContain('rel="next"')
    expect(link).toContain('page=1')
    expect(link).toContain('rel="prev"')
  })
})
