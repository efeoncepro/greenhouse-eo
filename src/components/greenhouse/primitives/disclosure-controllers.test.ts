import { describe, expect, it } from 'vitest'

import {
  DISCLOSURE_TRIGGER_VARIANT_CONFIG,
  getDisclosureTriggerVariantConfig,
  resolveDisclosureTriggerVariant
} from './disclosure-trigger-controller'
import {
  ANCHORED_DISCLOSURE_VARIANT_CONFIG,
  getAnchoredDisclosureVariantConfig,
  resolveAnchoredDisclosureVariant
} from './anchored-disclosure-controller'

describe('disclosure-trigger-controller', () => {
  it('explicit variant wins over kind', () => {
    expect(resolveDisclosureTriggerVariant({ variant: 'expand', kind: 'addEntry' })).toBe('expand')
  })

  it('maps kinds to variants, defaults to addToggle', () => {
    expect(resolveDisclosureTriggerVariant({ kind: 'linkResource' })).toBe('addToggle')
    expect(resolveDisclosureTriggerVariant({ kind: 'expandSection' })).toBe('expand')
    expect(resolveDisclosureTriggerVariant({ kind: 'moreActions' })).toBe('reveal')
    expect(resolveDisclosureTriggerVariant({})).toBe('addToggle')
  })

  it('addToggle rotates 45° (plus → ×) with a plus icon', () => {
    const c = getDisclosureTriggerVariantConfig('addToggle')

    expect(c.openRotationDeg).toBe(45)
    expect(c.defaultIconClassName).toBe('tabler-plus')
  })

  it('config is frozen', () => {
    expect(Object.isFrozen(DISCLOSURE_TRIGGER_VARIANT_CONFIG)).toBe(true)
  })
})

describe('anchored-disclosure-controller', () => {
  it('explicit variant wins over kind', () => {
    expect(resolveAnchoredDisclosureVariant({ variant: 'actionMenu', kind: 'figmaNodeLink' })).toBe('actionMenu')
  })

  it('maps kinds to variants, defaults to contextualEditor', () => {
    expect(resolveAnchoredDisclosureVariant({ kind: 'figmaNodeLink' })).toBe('contextualEditor')
    expect(resolveAnchoredDisclosureVariant({ kind: 'quickAdd' })).toBe('actionMenu')
    expect(resolveAnchoredDisclosureVariant({ kind: 'evidence' })).toBe('quickPeek')
    expect(resolveAnchoredDisclosureVariant({})).toBe('contextualEditor')
  })

  it('each variant resolves to a (surface + trigger) pair', () => {
    expect(getAnchoredDisclosureVariantConfig('contextualEditor')).toMatchObject({
      floatingSurfaceVariant: 'inlineEditor',
      triggerVariant: 'addToggle'
    })
    expect(getAnchoredDisclosureVariantConfig('quickPeek')).toMatchObject({
      floatingSurfaceVariant: 'evidencePeek',
      triggerVariant: 'reveal'
    })
  })

  it('config is frozen', () => {
    expect(Object.isFrozen(ANCHORED_DISCLOSURE_VARIANT_CONFIG)).toBe(true)
  })
})
