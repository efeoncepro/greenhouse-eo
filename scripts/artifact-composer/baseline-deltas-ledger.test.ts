import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { evaluatePromotion, parseLedgerSections, sealMarker, sealUnsealedSections } from './baseline-deltas-ledger'

const DIGEST = 'a'.repeat(64)

const ledger = (...sections: string[]) => ['# Artifact Composer — BASELINE_DELTAS', '', ...sections].join('\n')

const sealedOld = [
  '## 2026-09-27 (h) — TASK-1928: la familia método',
  '',
  sealMarker('legacy-2026-09-28'),
  '',
  '- `templates-graphic-line-deck/ProposalCinematic.png` — alta',
  '- `templates-graphic-line-deck/HeroLens.png` — alta',
  ''
].join('\n')

const fresh = [
  '## 2026-09-28 (p) — TASK-1999: la lámina nueva',
  '',
  '- `templates-graphic-line-deck/DeckNueva.png` — 🆕 alta',
  ''
].join('\n')

describe('parseLedgerSections', () => {
  it('parte por `## `, detecta el sello y extrae los frames declarados', () => {
    const sections = parseLedgerSections(ledger(fresh, sealedOld))

    expect(sections.map(section => section.sealed)).toEqual([false, true])
    expect([...sections[0].declaredFrames]).toEqual(['templates-graphic-line-deck/DeckNueva.png'])
    expect(sections[1].declaredFrames.has('templates-graphic-line-deck/HeroLens.png')).toBe(true)
  })

  it('no confunde un frame con otro que lo contiene como prefijo', () => {
    const [section] = parseLedgerSections(ledger('## x\n\n- `templates-graphic-line-deck/ProposalCinematicHero.png`'))

    expect(section.declaredFrames.has('templates-graphic-line-deck/ProposalCinematic.png')).toBe(false)
  })

  it('una mención del marcador en prosa no sella la sección', () => {
    const [section] = parseLedgerSections(ledger('## x\n\nsin el marcador `sealed-by-freeze` todavía'))

    expect(section.sealed).toBe(false)
  })
})

describe('evaluatePromotion', () => {
  it('acepta los frames declarados en la sección sin sellar', () => {
    const verdict = evaluatePromotion(ledger(fresh, sealedOld), ['templates-graphic-line-deck/DeckNueva.png'])

    expect(verdict.ok).toBe(true)
  })

  it('caso TASK-1928: un frame declarado SÓLO en una sección sellada no se re-promueve', () => {
    const verdict = evaluatePromotion(ledger(fresh, sealedOld), [
      'templates-graphic-line-deck/DeckNueva.png',
      'templates-graphic-line-deck/HeroLens.png',
      'templates-graphic-line-deck/ProposalCinematic.png'
    ])

    expect(verdict.ok).toBe(false)
    if (verdict.ok) return
    expect(verdict.reason).toBe('undeclared-frames')
    expect(verdict.undeclared).toEqual([
      'templates-graphic-line-deck/HeroLens.png',
      'templates-graphic-line-deck/ProposalCinematic.png'
    ])
    expect(verdict.message).toContain('sólo en secciones ya selladas')
  })

  it('falla cerrado si no hay sección sin sellar', () => {
    const verdict = evaluatePromotion(ledger(sealedOld), ['templates-graphic-line-deck/HeroLens.png'])

    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.reason).toBe('no-unsealed-section')
  })

  it('falla cerrado si hay más de una sección sin sellar', () => {
    const verdict = evaluatePromotion(ledger(fresh, fresh.replace('(p)', '(q)'), sealedOld), [
      'templates-graphic-line-deck/DeckNueva.png'
    ])

    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.reason).toBe('multiple-unsealed-sections')
  })

  it('avisa (sin fallar) de frames declarados en scope que no cambiaron', () => {
    const section = '## x\n\n- `templates-glitch/A.png`\n- `templates-glitch/B.png`\n- `sky/01.png`'

    const verdict = evaluatePromotion(ledger(section), ['templates-glitch/A.png'], frame =>
      frame.startsWith('templates-glitch')
    )

    expect(verdict.ok).toBe(true)
    if (verdict.ok) expect(verdict.declaredButUnchanged).toEqual(['templates-glitch/B.png'])
  })
})

describe('sealUnsealedSections', () => {
  it('sella la sección nueva y deja la próxima promoción sin autorización', () => {
    const sealed = sealUnsealedSections(ledger(fresh, sealedOld), DIGEST)

    expect(parseLedgerSections(sealed).every(section => section.sealed)).toBe(true)
    expect(sealed).toContain(`## 2026-09-28 (p) — TASK-1999: la lámina nueva\n\n${sealMarker(DIGEST)}\n`)
    expect(evaluatePromotion(sealed, ['templates-graphic-line-deck/DeckNueva.png']).ok).toBe(false)
  })

  it('es idempotente sobre un ledger ya sellado', () => {
    const once = sealUnsealedSections(ledger(fresh, sealedOld), DIGEST)

    expect(sealUnsealedSections(once, DIGEST)).toBe(once)
  })
})

describe('BASELINE_DELTAS.md committeado', () => {
  it('no deja secciones sin sellar (una sección abierta sólo existe entre la declaración y su --freeze)', () => {
    const raw = fs.readFileSync(
      path.resolve(__dirname, '../frontend/baselines/artifact-composer/BASELINE_DELTAS.md'),
      'utf8'
    )

    const open = parseLedgerSections(raw).filter(section => !section.sealed)

    expect(open.map(section => section.heading)).toEqual([])
  })
})
