import { describe, expect, it } from 'vitest'

import {
  SURFACE_RECIPE_COMPOSITIONS,
  resolveContextCommandBarVariant,
  resolveDetailHeroVariant,
  resolveOperationalSectionVariant,
  resolvePreviewStageVariant,
  resolveSelectionRowVariant,
  resolveSignalStripVariant,
  resolveWorkbenchHeaderVariant
} from '../surface-system-controller'

describe('surface-system controller', () => {
  it('maps the six recipes to canonical CompositionShell compositions', () => {
    expect(SURFACE_RECIPE_COMPOSITIONS).toEqual({
      operationalWorkbench: 'masterDetail',
      listDetail: 'masterDetail',
      commandCenter: 'leadPlusContext',
      reviewStudio: 'split',
      analyticsReport: 'single',
      settingsFlow: 'focused'
    })
  })

  it('resolves semantic kinds to stable variants', () => {
    expect(resolveWorkbenchHeaderVariant('report')).toBe('report')
    expect(resolveSignalStripVariant('risk')).toBe('exception')
    expect(resolveSelectionRowVariant('evidence')).toBe('review')
    expect(resolveDetailHeroVariant('evidence')).toBe('evidence')
    expect(resolveContextCommandBarVariant('settings')).toBe('settings')
    expect(resolveOperationalSectionVariant('decision')).toBe('emphasized')
    expect(resolvePreviewStageVariant('live')).toBe('live')
  })

  it('allows an explicit variant without changing the kind contract', () => {
    expect(resolveWorkbenchHeaderVariant('settings', 'operational')).toBe('operational')
    expect(resolveSelectionRowVariant('entity', 'comfortable')).toBe('comfortable')
  })
})
