import { describe, expect, it } from 'vitest'

import {
  CANDIDATE_NAME_NORMALIZATION_VERSION,
  classifyCandidateNameCasing,
  normalizeNameStructural,
  proposeDisplayName
} from './normalize-name'

// TASK-1736 Slice 1 — corpus multicultural ejecutable de la policy (ADR D2). CI-safe (puro).
// Regla dura del ADR: los tests NO imponen "primera letra mayúscula" como criterio universal.

describe('normalizeNameStructural (v1 — estructural, siempre segura)', () => {
  it('colapsa whitespace Unicode interno y hace trim exterior', () => {
    expect(normalizeNameStructural('  valentina   villa  ')).toBe('valentina villa')
    expect(normalizeNameStructural('maría  josé pérez')).toBe('maría josé pérez')
    expect(normalizeNameStructural('ana\tsoto\n')).toBe('ana soto')
  })

  it('normaliza NFC (diacríticos descompuestos → compuestos)', () => {
    // "Peña" con la ñ descompuesta (n + combining tilde U+0303) → compone a U+00F1.
    const decomposed = 'Valentina Pen\u0303a'

    expect(normalizeNameStructural(decomposed)).toBe('Valentina Peña')
    expect(normalizeNameStructural('José')).toBe('José')
  })

  it('remueve controles, bidi overrides y zero-width; preserva diacríticos, apóstrofes y guiones', () => {
    expect(normalizeNameStructural('Ana\u200b-Mar\u200día')).toBe('Ana-María')
    expect(normalizeNameStructural('\u202eAna Soto\u202c')).toBe('Ana Soto')
    expect(normalizeNameStructural("O'Neill ")).toBe("O'Neill")
    expect(normalizeNameStructural('María Ñandú-Pérez')).toBe('María Ñandú-Pérez')
  })

  it('preserva el casing tal cual (la estructural NO toca casing)', () => {
    expect(normalizeNameStructural('vAlEnTiNa VILLA')).toBe('vAlEnTiNa VILLA')
  })
})

describe('classifyCandidateNameCasing (conservadora, fail-closed a humano)', () => {
  it('degenerado evidente: todo minúsculas / todo mayúsculas', () => {
    expect(classifyCandidateNameCasing('valentina villa')).toBe('degenerate_lower')
    expect(classifyCandidateNameCasing('MARÍA DE LOS ÁNGELES')).toBe('degenerate_upper')
  })

  it('bien formado conservador: mixto plausible con partículas, guiones y prefijos', () => {
    expect(classifyCandidateNameCasing('Valentina Villa')).toBe('well_formed')
    expect(classifyCandidateNameCasing('Jean-Pierre van der Berg')).toBe('well_formed')
    expect(classifyCandidateNameCasing('María de los Ángeles Pérez')).toBe('well_formed')
    expect(classifyCandidateNameCasing('Ronald McDonald')).toBe('well_formed')
    expect(classifyCandidateNameCasing("Conan O'Brien")).toBe('well_formed')
    expect(classifyCandidateNameCasing('Conan O’Brien')).toBe('well_formed')
  })

  it('mixto no clasificable = mixed_ambiguous (la policy no adivina)', () => {
    expect(classifyCandidateNameCasing('dEsiree smith')).toBe('mixed_ambiguous')
    expect(classifyCandidateNameCasing('LaTonya Jones')).toBe('mixed_ambiguous')
    expect(classifyCandidateNameCasing('vAlEnTiNa Villa')).toBe('mixed_ambiguous')
  })

  it('escrituras no latinas = non_latin (nunca se translitera ni se aplica casing)', () => {
    expect(classifyCandidateNameCasing('李小龙')).toBe('non_latin')
    expect(classifyCandidateNameCasing('محمد علي')).toBe('non_latin')
    expect(classifyCandidateNameCasing('Иван Петров')).toBe('non_latin')
  })

  it('mononym = un solo token (decide un humano)', () => {
    expect(classifyCandidateNameCasing('cher')).toBe('mononym')
    expect(classifyCandidateNameCasing('Prince')).toBe('mononym')
  })
})

describe('proposeDisplayName (propuesta SOLO para degenerados evidentes)', () => {
  it('"valentina villa" → propuesta "Valentina Villa" (caso fuente de la auditoría)', () => {
    const out = proposeDisplayName('valentina villa')

    expect(out.classification).toBe('degenerate_lower')
    expect(out.confidence).toBe('high_confidence')
    expect(out.proposedDisplayName).toBe('Valentina Villa')
  })

  it('"MARÍA DE LOS ÁNGELES" → partículas interiores en minúscula, diacríticos intactos', () => {
    const out = proposeDisplayName('MARÍA DE LOS ÁNGELES')

    expect(out.classification).toBe('degenerate_upper')
    expect(out.proposedDisplayName).toBe('María de los Ángeles')
  })

  it('partículas van/der/von/da/di/del/la interiores permanecen en minúscula', () => {
    expect(proposeDisplayName('vincent van der meer').proposedDisplayName).toBe('Vincent van der Meer')
    expect(proposeDisplayName('JUAN DEL VALLE').proposedDisplayName).toBe('Juan del Valle')
    expect(proposeDisplayName('leonardo da vinci').proposedDisplayName).toBe('Leonardo da Vinci')
  })

  it('el primer token SIEMPRE se capitaliza aunque sea partícula', () => {
    expect(proposeDisplayName('de la fuente carla').proposedDisplayName).toBe('De la Fuente Carla')
  })

  it("prefijos Mc/O'/apóstrofes: re-capitalizan la letra siguiente", () => {
    expect(proposeDisplayName('hamish mcdonald').proposedDisplayName).toBe('Hamish McDonald')
    expect(proposeDisplayName("conan o'brien").proposedDisplayName).toBe("Conan O'Brien")
    expect(proposeDisplayName('conan o’brien').proposedDisplayName).toBe('Conan O’Brien')
    expect(proposeDisplayName("gianni d'angelo").proposedDisplayName).toBe("Gianni D'Angelo")
  })

  it('heurística Mac conservadora: consonante re-capitaliza, vocal NO (protege nombres hispanos)', () => {
    expect(proposeDisplayName('alistair macdonald').proposedDisplayName).toBe('Alistair MacDonald')
    expect(proposeDisplayName('macarena soto').proposedDisplayName).toBe('Macarena Soto')
  })

  it('nombres compuestos con guion capitalizan cada segmento', () => {
    expect(proposeDisplayName('ana-maría lópez-ortiz').proposedDisplayName).toBe('Ana-María López-Ortiz')
  })

  it('well_formed: high_confidence pero SIN propuesta (nada que cambiar)', () => {
    const out = proposeDisplayName('Jean-Pierre van der Berg')

    expect(out.classification).toBe('well_formed')
    expect(out.confidence).toBe('high_confidence')
    expect(out.proposedDisplayName).toBeNull()
  })

  it('mixto ambiguo, no latino y mononym → needs_review SIN propuesta', () => {
    for (const name of ['dEsiree smith', 'LaTonya Jones', '李小龙', 'cher']) {
      const out = proposeDisplayName(name)

      expect(out.confidence).toBe('needs_review')
      expect(out.proposedDisplayName).toBeNull()
    }
  })

  it('es determinista e idempotente (misma entrada ⇒ misma salida; la propuesta re-clasifica well_formed)', () => {
    const first = proposeDisplayName('valentina villa')
    const second = proposeDisplayName('valentina villa')

    expect(first).toEqual(second)

    // Aplicar la propuesta y re-evaluar: queda well_formed sin nueva propuesta (convergencia).
    const reassessed = proposeDisplayName(first.proposedDisplayName as string)

    expect(reassessed.classification).toBe('well_formed')
    expect(reassessed.proposedDisplayName).toBeNull()
  })

  it('expone la versión v1 de la policy', () => {
    expect(CANDIDATE_NAME_NORMALIZATION_VERSION).toBe('v1')
  })
})
