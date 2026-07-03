import { afterEach, describe, expect, it, vi } from 'vitest'

// report-link.ts es `server-only` y lee el postgres client al importar; los mockeamos
// para poder ejercitar la función pura `buildPublicReportUrl` contra `process.env`.
vi.mock('server-only', () => ({}))
vi.mock('@/lib/postgres/client', () => ({ runGreenhousePostgresQuery: vi.fn() }))

import { buildPublicReportUrl } from '../report-link'

const ORIGINAL = process.env.PUBLIC_GRADER_HUB_URL

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.PUBLIC_GRADER_HUB_URL
  else process.env.PUBLIC_GRADER_HUB_URL = ORIGINAL
})

describe('buildPublicReportUrl (TASK-1324)', () => {
  it('default apunta al hub headless efeonce-think, no al portal', () => {
    delete process.env.PUBLIC_GRADER_HUB_URL
    expect(buildPublicReportUrl('grt-abc')).toBe('https://think.efeoncepro.com/brand-visibility/r/grt-abc')
  })

  it('resuelve el host por PUBLIC_GRADER_HUB_URL (para staging del hub)', () => {
    process.env.PUBLIC_GRADER_HUB_URL = 'https://think-staging.efeoncepro.com'
    expect(buildPublicReportUrl('grt-xyz')).toBe('https://think-staging.efeoncepro.com/brand-visibility/r/grt-xyz')
  })

  it('normaliza trailing slashes del env var', () => {
    process.env.PUBLIC_GRADER_HUB_URL = 'https://think.efeoncepro.com///'
    expect(buildPublicReportUrl('grt-1')).toBe('https://think.efeoncepro.com/brand-visibility/r/grt-1')
  })

  // Anti-regresión del bug class TASK-1324: NUNCA volver al host/path muerto del portal.
  it('NUNCA retorna el path muerto del portal (greenhouse.efeoncepro.com/grader/r)', () => {
    delete process.env.PUBLIC_GRADER_HUB_URL
    const url = buildPublicReportUrl('grt-abc')

    expect(url).not.toContain('greenhouse.efeoncepro.com')
    expect(url).not.toContain('/grader/r/')
  })
})
