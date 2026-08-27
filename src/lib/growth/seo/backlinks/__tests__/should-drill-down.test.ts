import { describe, expect, it } from 'vitest'

/**
 * TASK-1777 — Condición de disparo (Slice 1, PRIMERO: la pieza que controla el gasto se
 * testea antes de que exista código capaz de gastar). Tests de tabla sobre los cinco casos
 * de la spec: sin movimiento, bajo umbral, sobre umbral, primera vez, snapshot partial.
 */

import { resolveDrillDownConfig, shouldDrillDownBacklinks, type DrillDownConfig } from '../should-drill-down'

const config: DrillDownConfig = { minBacklinkMovement: 10, minReferringDomainMovement: 3 }

const snapshot = (overrides: Partial<{ referringDomains: number | null; newLostDelta: Record<string, unknown> }> = {}) => ({
  referringDomains: 100,
  newLostDelta: { newBacklinks: 0, lostBacklinks: 0, windowDays: 30 },
  ...overrides
})

describe('shouldDrillDownBacklinks', () => {
  it('snapshot partial (delta vacío) NO dispara — ni siquiera en primera vez', () => {
    expect(
      shouldDrillDownBacklinks({ snapshot: snapshot({ newLostDelta: {} }), previous: null, hasPriorDetail: false }, config)
    ).toEqual({ drill: false, reason: 'partial_snapshot' })
  })

  it('primera vez dispara una vez para fundar la línea base', () => {
    expect(
      shouldDrillDownBacklinks({ snapshot: snapshot(), previous: null, hasPriorDetail: false }, config)
    ).toEqual({ drill: true, reason: 'first_time' })
  })

  it('sin movimiento con línea base → no dispara (skipped es información, no hueco)', () => {
    expect(
      shouldDrillDownBacklinks(
        { snapshot: snapshot(), previous: { referringDomains: 100 }, hasPriorDetail: true },
        config
      )
    ).toEqual({ drill: false, reason: 'no_movement' })
  })

  it('movimiento de backlinks bajo el umbral → no dispara; sobre el umbral → dispara', () => {
    const under = shouldDrillDownBacklinks(
      {
        snapshot: snapshot({ newLostDelta: { newBacklinks: 4, lostBacklinks: 5 } }),
        previous: { referringDomains: 100 },
        hasPriorDetail: true
      },
      config
    )

    expect(under).toEqual({ drill: false, reason: 'no_movement' })

    const over = shouldDrillDownBacklinks(
      {
        snapshot: snapshot({ newLostDelta: { newBacklinks: 4, lostBacklinks: 6 } }),
        previous: { referringDomains: 100 },
        hasPriorDetail: true
      },
      config
    )

    expect(over).toEqual({ drill: true, reason: 'backlink_movement' })
  })

  it('movimiento de dominios referentes contra el snapshot anterior dispara (en ambas direcciones)', () => {
    for (const referringDomains of [103, 97]) {
      expect(
        shouldDrillDownBacklinks(
          { snapshot: snapshot({ referringDomains }), previous: { referringDomains: 100 }, hasPriorDetail: true },
          config
        )
      ).toEqual({ drill: true, reason: 'referring_domain_movement' })
    }
  })

  it('sin snapshot previo (pero con detalle previo) el delta de dominios no opina', () => {
    expect(
      shouldDrillDownBacklinks({ snapshot: snapshot(), previous: null, hasPriorDetail: true }, config)
    ).toEqual({ drill: false, reason: 'no_movement' })
  })
})

describe('resolveDrillDownConfig', () => {
  it('defaults conservadores; knobs respetados; basura ignorada', () => {
    expect(resolveDrillDownConfig({} as NodeJS.ProcessEnv)).toEqual({
      minBacklinkMovement: 10,
      minReferringDomainMovement: 3
    })

    expect(
      resolveDrillDownConfig({
        GROWTH_SEO_BACKLINK_DRILLDOWN_MIN_BACKLINK_MOVEMENT: '25',
        GROWTH_SEO_BACKLINK_DRILLDOWN_MIN_REFDOMAIN_MOVEMENT: 'nope'
      } as unknown as NodeJS.ProcessEnv)
    ).toEqual({ minBacklinkMovement: 25, minReferringDomainMovement: 3 })
  })
})
