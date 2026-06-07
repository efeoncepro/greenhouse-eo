import { describe, expect, it } from 'vitest'

import { validateScenario, type CaptureScenario } from './scenario'

const baseScenario = (steps: CaptureScenario['steps']): CaptureScenario => ({
  name: 'capture-dsl-test',
  route: '/test',
  viewport: { width: 1440, height: 900 },
  steps
})

describe('frontend capture scenario DSL', () => {
  it('accepts selector-based scroll and clipped section marks', () => {
    expect(() => validateScenario(baseScenario([
      { kind: 'wait', selector: 'h1' },
      { kind: 'scroll', selector: '[data-capture="timeline"]', scrollBlock: 'center' },
      { kind: 'mark', label: 'timeline', clipSelector: '[data-capture="timeline"]' }
    ]))).not.toThrow()
  })

  it('accepts full-page marks for long screens', () => {
    expect(() => validateScenario(baseScenario([
      { kind: 'mark', label: 'full-page', fullPage: true }
    ]))).not.toThrow()
  })

  it('rejects ambiguous mark capture modes', () => {
    expect(() => validateScenario(baseScenario([
      { kind: 'mark', label: 'bad', fullPage: true, clipSelector: '[data-capture="panel"]' }
    ]))).toThrow('mark no puede combinar fullPage con clipSelector')
  })

  it('rejects capture-only options on non-mark steps', () => {
    expect(() => validateScenario(baseScenario([
      { kind: 'scroll', selector: '[data-capture="panel"]', clipSelector: '[data-capture="panel"]' }
    ]))).toThrow('fullPage/clipSelector solo aplican a mark')
  })

  it('rejects scroll-only options on non-scroll steps', () => {
    expect(() => validateScenario(baseScenario([
      { kind: 'mark', label: 'bad-scroll-option', scrollTo: 'bottom' }
    ]))).toThrow('scrollBlock/scrollInline/scrollTo solo aplican a scroll')
  })

  it('accepts readiness, assertions and multi-viewport variants', () => {
    expect(() => validateScenario({
      ...baseScenario([
        { kind: 'assert', assertion: { kind: 'noLoginRedirect', reason: 'authenticated route expected' } },
        { kind: 'mark', label: 'ready' }
      ]),
      readiness: {
        selector: '[data-gvc-ready="test"]',
        absentSelectors: ['[role="progressbar"]'],
        waitForFonts: true
      },
      assertions: [
        { kind: 'notVisible', selector: '[data-testid="login-card"]', reason: 'no login wall' }
      ],
      viewports: [
        { name: 'desktop', width: 1440, height: 900 },
        { name: 'mobile', device: 'iPhone 13' }
      ]
    })).not.toThrow()
  })

  it('accepts V2 interaction evidence steps', () => {
    expect(() => validateScenario(baseScenario([
      {
        kind: 'interaction',
        interaction: {
          name: 'filter-hover',
          action: { kind: 'hover', selector: '[role="tab"]' },
          intent: 'Confirma affordance del filtro antes de activar',
          frames: [
            { label: 'before', atMs: 0 },
            { label: 'feedback', atMs: 150 }
          ],
          keyboardEquivalent: {
            action: { kind: 'press', key: 'Tab' },
            expected: 'focus visible'
          },
          reducedMotion: 'capture'
        }
      }
    ]))).not.toThrow()
  })

  it('rejects interaction steps without intent', () => {
    expect(() => validateScenario(baseScenario([
      {
        kind: 'interaction',
        interaction: {
          name: 'bad-hover',
          action: { kind: 'hover', selector: '[role="tab"]' },
          intent: '',
          frames: [{ label: 'feedback', atMs: 150 }]
        }
      }
    ]))).toThrow('requiere intent descriptivo')
  })

  it('rejects duplicate viewport names', () => {
    expect(() => validateScenario({
      ...baseScenario([{ kind: 'mark', label: 'initial' }]),
      viewports: [
        { name: 'desktop', width: 1440, height: 900 },
        { name: 'desktop', width: 1280, height: 800 }
      ]
    })).toThrow('viewport "desktop" duplicado')
  })

  it('accepts a full baseline visual contract', () => {
    expect(() => validateScenario({
      ...baseScenario([{ kind: 'mark', label: 'first-fold' }]),
      baseline: {
        surfaceId: 'agency.organizations.list',
        baselineName: 'organization-list-enterprise-approved',
        requiredFrameLabels: ['first-fold'],
        maskSelectors: ['[data-dynamic-count]'],
        maxDiffRatio: 0.08,
        requiredRegions: ['[data-capture="organization-list"]']
      }
    })).not.toThrow()
  })

  it('rejects baseline.maxDiffRatio outside [0,1]', () => {
    expect(() => validateScenario({
      ...baseScenario([{ kind: 'mark', label: 'a' }]),
      baseline: { surfaceId: 's', maxDiffRatio: 1.5 }
    })).toThrow('baseline.maxDiffRatio')
  })

  it('requires surfaceId when baseline declares maskSelectors/requiredFrameLabels/requiredRegions', () => {
    expect(() => validateScenario({
      ...baseScenario([{ kind: 'mark', label: 'a' }]),
      baseline: { maskSelectors: ['[data-dynamic]'] }
    })).toThrow('requiere baseline.surfaceId')
  })

  it('rejects an invalid baseline.surfaceId', () => {
    expect(() => validateScenario({
      ...baseScenario([{ kind: 'mark', label: 'a' }]),
      baseline: { surfaceId: 'bad surface/id!' }
    })).toThrow('baseline.surfaceId inválido')
  })

  it('accepts a keyboard quality gate with probes', () => {
    expect(() => validateScenario({
      ...baseScenario([{ kind: 'mark', label: 'a' }]),
      quality: {
        keyboard: {
          enabled: true,
          reducedMotionCheck: true,
          probes: [{ name: 'open-menu', keys: ['Tab', 'Enter'], expectedVisibleSelector: '[role="menu"]' }]
        }
      }
    })).not.toThrow()
  })

  it('rejects an enabled keyboard gate without probes', () => {
    expect(() => validateScenario({
      ...baseScenario([{ kind: 'mark', label: 'a' }]),
      quality: { keyboard: { enabled: true, probes: [] } }
    })).toThrow('al menos un probe')
  })

  it('rejects a keyboard probe without keys', () => {
    expect(() => validateScenario({
      ...baseScenario([{ kind: 'mark', label: 'a' }]),
      quality: { keyboard: { enabled: true, probes: [{ name: 'bad', keys: [] }] } }
    })).toThrow('requiere keys')
  })
})
