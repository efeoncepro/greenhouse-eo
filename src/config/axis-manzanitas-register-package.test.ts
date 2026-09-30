import { describe, expect, it } from 'vitest'

import { AXIS_BRAND_ASSETS, AXIS_GLITCH_ASSETS, AXIS_MANZANITAS_ACCENT_SELECTOR, AXIS_MANZANITAS_ASSETS } from '@efeoncepro/axis-brand-assets'
import { manzanitasChartSvg, runManzanitasChartChecks } from '@efeoncepro/axis-graphic-line/charts'
import { efeonceGraphicLine, glitchLine, manzanitasRegister } from '@efeoncepro/axis-tokens'
import { AXIS_MANZANITAS_REGISTER_CONTRACT, resolveManzanitasRegisterIntent } from '@efeoncepro/axis-ui-contracts'

// TASK-1936: Greenhouse fija la versión de AXIS que publica el registro Marketing con Manzanitas (sólo MCM; complementa
// La órbita). Esta prueba confirma que las exportaciones existen en los paquetes instalados; el primer consumidor real es
// el catálogo `manzanitas` del Artifact Composer. Contrato 0.3.0 (AXIS v0.3.29, 2026-09-29): ninguna decisión abierta.
describe('AXIS Marketing con Manzanitas packages', () => {
  it('exports the register token, complementing La órbita by reference and isolated from Glitch', () => {
    expect(manzanitasRegister.complements).toBe('efeonceGraphicLine')
    expect(manzanitasRegister.lines).toBe(efeonceGraphicLine.lines)
    expect(JSON.stringify(manzanitasRegister)).not.toContain(glitchLine.color.accent)
    expect(manzanitasRegister.pendingDecisions).toEqual([])
    expect(manzanitasRegister.resolvedDecisions).toHaveLength(10)
    expect(manzanitasRegister.closeCopy.fixed).toBe(false)
    expect(manzanitasRegister.teamPeople.rosterSource).toBe('greenhouse-team-roster')
  })

  it('exports the stable contract (sub-línea de La órbita desde axis 0.3.37) and resolves a carousel that opens with its cover and closes with its back cover', () => {
    expect(AXIS_MANZANITAS_REGISTER_CONTRACT).toMatchObject({ id: 'efeonce.manzanitas-register', version: '0.3.0', lifecycle: 'stable' })

    const intent = {
      register: 'marketing-con-manzanitas' as const,
      channel: 'carousel' as const,
      topicLine: 'revenue-salesforce',
      slides: [
        { piece: 'cover-pizarra', voice: { question: '¿Qué revisa una IA antes de recomendarte?', answer: '5 cosas' }, swipe: true },
        { piece: 'chart-per-hundred', voice: { question: '¿Cuántos llegan informados?', answer: '58 de 100' }, chart: { value: 58, source: '[FUENTE, AÑO]', illustrative: true }, swipe: true },
        { piece: 'back-cover-a', voice: { question: '¿Te nombra la IA?', answer: 'Pregúntale' }, slogan: true, conversions: 1 }
      ]
    }

    const resolved = resolveManzanitasRegisterIntent(intent)

    expect(resolved.status).toBe('resolved')
    expect(resolved.status === 'resolved' && resolved.slides[1].chart?.answer.text).toBe('58 de 100')
    expect(resolveManzanitasRegisterIntent({ ...intent, slides: intent.slides.slice(1) }).status).toBe('invalid')
  })

  it('paints a chart from its data with the topic accent, and ships the logo apart from the family and Glitch', () => {
    const chart = manzanitasChartSvg('per-hundred', { value: 58, source: '[FUENTE, AÑO]', illustrative: true }, { line: 'engine' })

    expect(runManzanitasChartChecks(chart).filter(c => !c.ok)).toEqual([])
    expect(chart.manifest.accent).toBe(efeonceGraphicLine.lines.find(l => l.key === 'engine')!.accentOnDark)
    expect(AXIS_MANZANITAS_ASSETS.map(a => a.id)).toContain('manzanitas-logo-positive')
    expect(AXIS_MANZANITAS_ACCENT_SELECTOR).toBe('[data-axis-accent="topic-line"]')

    const others = new Set<string>([...AXIS_BRAND_ASSETS, ...AXIS_GLITCH_ASSETS].map(a => a.id))

    for (const asset of AXIS_MANZANITAS_ASSETS) expect(others.has(asset.id)).toBe(false)
  })
})
