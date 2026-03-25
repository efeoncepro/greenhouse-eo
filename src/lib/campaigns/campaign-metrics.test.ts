import { describe, expect, it } from 'vitest'

// Test the semaphore / health derivation logic used across multiple views
describe('semaphore health logic', () => {
  const semaphore = (v: number | null | undefined): { color: string; label: string } => {
    if (v == null) return { color: 'secondary', label: '—' }
    if (v >= 80) return { color: 'success', label: 'Óptimo' }
    if (v >= 60) return { color: 'warning', label: 'Atención' }

    return { color: 'error', label: 'Crítico' }
  }

  it('returns success for RPA >= 80', () => {
    expect(semaphore(80)).toEqual({ color: 'success', label: 'Óptimo' })
    expect(semaphore(95)).toEqual({ color: 'success', label: 'Óptimo' })
    expect(semaphore(100)).toEqual({ color: 'success', label: 'Óptimo' })
  })

  it('returns warning for 60 <= RPA < 80', () => {
    expect(semaphore(60)).toEqual({ color: 'warning', label: 'Atención' })
    expect(semaphore(79)).toEqual({ color: 'warning', label: 'Atención' })
  })

  it('returns error for RPA < 60', () => {
    expect(semaphore(0)).toEqual({ color: 'error', label: 'Crítico' })
    expect(semaphore(59)).toEqual({ color: 'error', label: 'Crítico' })
  })

  it('returns secondary for null/undefined', () => {
    expect(semaphore(null)).toEqual({ color: 'secondary', label: '—' })
    expect(semaphore(undefined)).toEqual({ color: 'secondary', label: '—' })
  })
})

describe('operations health derivation', () => {
  type HealthStatus = 'healthy' | 'degraded' | 'down' | 'not_configured'

  const deriveHealth = (processed: number, failed: number, lastRun: string | null, tblExists: boolean): HealthStatus => {
    if (!tblExists || (processed === 0 && failed === 0 && !lastRun)) return 'not_configured'
    if (!lastRun && failed === 0) return 'healthy'

    if (lastRun) {
      const hoursAgo = (Date.now() - new Date(lastRun).getTime()) / 3_600_000

      if (failed > 0 && hoursAgo > 48) return 'down'
      if (failed > 0 || hoursAgo > 24) return 'degraded'
    } else if (failed > 0) {
      return 'down'
    }

    return 'healthy'
  }

  it('returns not_configured when table does not exist', () => {
    expect(deriveHealth(0, 0, null, false)).toBe('not_configured')
  })

  it('returns not_configured when table exists but no data', () => {
    expect(deriveHealth(0, 0, null, true)).toBe('not_configured')
  })

  it('returns healthy when table exists, no lastRun, no failures', () => {
    expect(deriveHealth(10, 0, null, true)).toBe('healthy')
  })

  it('returns healthy when recent run, no failures', () => {
    const recentRun = new Date(Date.now() - 3_600_000).toISOString() // 1 hour ago

    expect(deriveHealth(10, 0, recentRun, true)).toBe('healthy')
  })

  it('returns degraded when failures exist', () => {
    const recentRun = new Date(Date.now() - 3_600_000).toISOString()

    expect(deriveHealth(10, 2, recentRun, true)).toBe('degraded')
  })

  it('returns degraded when lastRun > 24h', () => {
    const oldRun = new Date(Date.now() - 30 * 3_600_000).toISOString() // 30 hours ago

    expect(deriveHealth(10, 0, oldRun, true)).toBe('degraded')
  })

  it('returns down when failures + lastRun > 48h', () => {
    const veryOldRun = new Date(Date.now() - 72 * 3_600_000).toISOString() // 72 hours ago

    expect(deriveHealth(10, 5, veryOldRun, true)).toBe('down')
  })

  it('returns down when failures but no lastRun', () => {
    expect(deriveHealth(0, 3, null, true)).toBe('down')
  })
})

describe('timeAgo formatting', () => {
  const timeAgo = (iso: string | null): string => {
    if (!iso) return 'Nunca'

    const ms = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(ms / 60_000)

    if (mins < 1) return 'Ahora'
    if (mins < 60) return `hace ${mins}m`

    const hrs = Math.floor(mins / 60)

    if (hrs < 24) return `hace ${hrs}h`

    const days = Math.floor(hrs / 24)

    return `hace ${days}d`
  }

  it('returns Nunca for null', () => {
    expect(timeAgo(null)).toBe('Nunca')
  })

  it('returns Ahora for just now', () => {
    expect(timeAgo(new Date().toISOString())).toBe('Ahora')
  })

  it('returns minutes for recent', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString()

    expect(timeAgo(fiveMinAgo)).toBe('hace 5m')
  })

  it('returns hours for hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3_600_000).toISOString()

    expect(timeAgo(threeHoursAgo)).toBe('hace 3h')
  })

  it('returns days for days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3_600_000).toISOString()

    expect(timeAgo(twoDaysAgo)).toBe('hace 2d')
  })
})
