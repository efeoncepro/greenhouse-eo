import { describe, expect, it } from 'vitest'

import {
  DEFAULT_FLOATING_SURFACE_VARIANT,
  FLOATING_SURFACE_CHROME_TOKENS,
  FLOATING_SURFACE_MOTION_TOKENS,
  FLOATING_SURFACE_VARIANTS,
  FLOATING_SURFACE_VARIANT_CONFIG,
  getFloatingSurfaceMotionVector,
  getFloatingSurfaceTransformOrigin,
  getFloatingSurfaceVariantConfig,
  resolveFloatingSurfaceVariant,
  type GreenhouseFloatingSurfaceVariant
} from '../floating-surface-controller'

describe('floating-surface-controller', () => {
  describe('resolveFloatingSurfaceVariant', () => {
    it('prefers an explicit variant over kind', () => {
      expect(resolveFloatingSurfaceVariant({ variant: 'actionMenu', kind: 'costProvenance' })).toBe('actionMenu')
    })

    it('maps a known kind to its variant', () => {
      expect(resolveFloatingSurfaceVariant({ kind: 'costProvenance' })).toBe('evidencePeek')
      expect(resolveFloatingSurfaceVariant({ kind: 'totalsAddons' })).toBe('evidencePeek')
      expect(resolveFloatingSurfaceVariant({ kind: 'rowActions' })).toBe('actionMenu')
      expect(resolveFloatingSurfaceVariant({ kind: 'metricHelp' })).toBe('richTooltip')
      expect(resolveFloatingSurfaceVariant({ kind: 'inlineFieldEdit' })).toBe('inlineEditor')
      expect(resolveFloatingSurfaceVariant({ kind: 'fieldValidation' })).toBe('validationBubble')
      expect(resolveFloatingSurfaceVariant({ kind: 'commandResultPreview' })).toBe('commandPreview')
    })

    it('falls back to the conservative default with no input', () => {
      expect(resolveFloatingSurfaceVariant()).toBe(DEFAULT_FLOATING_SURFACE_VARIANT)
      expect(resolveFloatingSurfaceVariant({})).toBe(DEFAULT_FLOATING_SURFACE_VARIANT)
    })

    it('ignores an unknown variant and falls through to kind', () => {
      const result = resolveFloatingSurfaceVariant({
        variant: 'notAVariant' as GreenhouseFloatingSurfaceVariant,
        kind: 'rowActions'
      })

      expect(result).toBe('actionMenu')
    })

    it('is idempotent — feeding the result back as variant yields the same variant', () => {
      for (const variant of FLOATING_SURFACE_VARIANTS) {
        const once = resolveFloatingSurfaceVariant({ variant })
        const twice = resolveFloatingSurfaceVariant({ variant: once })

        expect(twice).toBe(once)
        expect(twice).toBe(variant)
      }
    })
  })

  describe('FLOATING_SURFACE_VARIANT_CONFIG', () => {
    it('declares a contract for every official variant', () => {
      for (const variant of FLOATING_SURFACE_VARIANTS) {
        expect(FLOATING_SURFACE_VARIANT_CONFIG[variant]).toBeDefined()
      }
    })

    it('keeps editors non-dismissable on outside press (dirty-state safety)', () => {
      expect(FLOATING_SURFACE_VARIANT_CONFIG.inlineEditor.dismissOnOutsidePress).toBe(false)
    })

    it('only focus-manages interactive variants (menu/dialog), never read-only tooltips', () => {
      for (const variant of FLOATING_SURFACE_VARIANTS) {
        const config = FLOATING_SURFACE_VARIANT_CONFIG[variant]

        if (config.role === 'tooltip') {
          expect(config.focusManaged).toBe(false)
        } else {
          expect(config.focusManaged).toBe(true)
        }
      }
    })

    it('never claims a modal role — every variant is non-modal by contract', () => {
      const allowed = new Set(['tooltip', 'menu', 'dialog'])

      for (const variant of FLOATING_SURFACE_VARIANTS) {
        expect(allowed.has(FLOATING_SURFACE_VARIANT_CONFIG[variant].role)).toBe(true)
      }
    })

    it('always supports Escape dismissal', () => {
      for (const variant of FLOATING_SURFACE_VARIANTS) {
        expect(FLOATING_SURFACE_VARIANT_CONFIG[variant].dismissOnEscape).toBe(true)
      }
    })

    it('keeps shared chrome and motion tokens centralized', () => {
      expect(FLOATING_SURFACE_CHROME_TOKENS.viewportMargin).toBe(16)
      expect(FLOATING_SURFACE_CHROME_TOKENS.densityPadding).toEqual({
        compact: 1.5,
        comfortable: 2
      })
      expect(FLOATING_SURFACE_MOTION_TOKENS).toEqual({
        enterDuration: 'standard',
        enterEase: 'emphasized',
        exitDuration: 'short',
        exitEase: 'emphasizedAccelerate',
        enterTravel: 6,
        startScale: 0.974,
        settleScale: 1.007,
        snapBackScale: 0.999,
        exitScale: 0.986
      })
    })

    it('uses anchored motion for every visible variant', () => {
      for (const variant of FLOATING_SURFACE_VARIANTS) {
        expect(FLOATING_SURFACE_VARIANT_CONFIG[variant].motion).toBe('anchored')
      }
    })
  })

  describe('getFloatingSurfaceVariantConfig', () => {
    it('returns the frozen config for a variant', () => {
      expect(getFloatingSurfaceVariantConfig('evidencePeek')).toBe(FLOATING_SURFACE_VARIANT_CONFIG.evidencePeek)
    })
  })

  describe('floating surface motion helpers', () => {
    it('moves surfaces from the anchor side by placement', () => {
      expect(getFloatingSurfaceMotionVector('bottom-start')).toEqual({ x: 0, y: -6 })
      expect(getFloatingSurfaceMotionVector('top')).toEqual({ x: 0, y: 6 })
      expect(getFloatingSurfaceMotionVector('right-start')).toEqual({ x: -6, y: 0 })
      expect(getFloatingSurfaceMotionVector('left-end')).toEqual({ x: 6, y: 0 })
    })

    it('sets transform origin to the edge closest to the anchor', () => {
      expect(getFloatingSurfaceTransformOrigin('bottom-start')).toBe('top left')
      expect(getFloatingSurfaceTransformOrigin('bottom-end')).toBe('top right')
      expect(getFloatingSurfaceTransformOrigin('top-start')).toBe('bottom left')
      expect(getFloatingSurfaceTransformOrigin('right-end')).toBe('left bottom')
    })
  })
})
