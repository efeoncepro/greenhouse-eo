import { describe, expect, it } from 'vitest'

import { classifySourceType, isSameSiteDomain } from '../normalization/source-type-classifier'
import { normalizeObservation, type NormalizationContext } from '../normalization/normalizer'
import { FIXTURE_DISCOVERY_ABSENT } from '../evals/observation-fixtures'

/**
 * TASK-1390 (ISSUE-120 Gap A/B) — clasificador determinista de sourceType +
 * matching same-site. Casos con dominios REALES del run SKY `EO-GRUN-00045`
 * (donde citation_quality salió 0 estructural por sourceTypes sin clasificar).
 */

describe('growth/ai-visibility — isSameSiteDomain (Gap B)', () => {
  it('apex ≡ apex', () => {
    expect(isSameSiteDomain('skyairline.com', 'skyairline.com')).toBe(true)
  })

  it('subdominio ≡ apex (ambas direcciones)', () => {
    expect(isSameSiteDomain('blog.skyairline.com', 'skyairline.com')).toBe(true)
    expect(isSameSiteDomain('skyairline.com', 'blog.skyairline.com')).toBe(true)
    expect(isSameSiteDomain('denuncias.skyairline.com', 'skyairline.com')).toBe(true)
  })

  it('www y protocolo se normalizan', () => {
    expect(isSameSiteDomain('www.skyairline.com', 'skyairline.com')).toBe(true)
    expect(isSameSiteDomain('https://www.skyairline.com', 'blog.skyairline.com')).toBe(true)
  })

  it('dominios distintos NO matchean (ni sufijos engañosos)', () => {
    expect(isSameSiteDomain('skyairline.cl', 'skyairline.com')).toBe(false)
    expect(isSameSiteDomain('notskyairline.com', 'skyairline.com')).toBe(false)
    expect(isSameSiteDomain('jetsmart.com', 'skyairline.com')).toBe(false)
  })

  it('inputs inválidos/null → false', () => {
    expect(isSameSiteDomain(null, 'skyairline.com')).toBe(false)
    expect(isSameSiteDomain('skyairline.com', undefined)).toBe(false)
    expect(isSameSiteDomain('no es un dominio', 'skyairline.com')).toBe(false)
  })
})

describe('growth/ai-visibility — classifySourceType (Gap A)', () => {
  const SUBJECT = 'skyairline.com'

  it('dominio del sujeto (incl. subdominios) → owned', () => {
    expect(classifySourceType('skyairline.com', SUBJECT)).toBe('owned')
    expect(classifySourceType('denuncias.skyairline.com', SUBJECT)).toBe('owned')
    expect(classifySourceType('cda.skyairline.com', SUBJECT)).toBe('owned')
    // El perfil pudo declarar el blog como websiteUrl (caso real run EO-GRUN-00044).
    expect(classifySourceType('skyairline.com', 'blog.skyairline.com')).toBe('owned')
  })

  it('prensa → news', () => {
    expect(classifySourceType('biobiochile.cl', SUBJECT)).toBe('news')
    expect(classifySourceType('df.cl', SUBJECT)).toBe('news')
    expect(classifySourceType('latercera.com', SUBJECT)).toBe('news')
    // Subdominio de un medio curado (caso real: chile.ladevi.info).
    expect(classifySourceType('chile.ladevi.info', SUBJECT)).toBe('news')
    expect(classifySourceType('aviacionline.com', SUBJECT)).toBe('news')
  })

  it('redes sociales → social', () => {
    expect(classifySourceType('instagram.com', SUBJECT)).toBe('social')
    expect(classifySourceType('youtube.com', SUBJECT)).toBe('social')
    expect(classifySourceType('reddit.com', SUBJECT)).toBe('social')
    expect(classifySourceType('tiktok.com', SUBJECT)).toBe('social')
  })

  it('review/reputación/referencia → earned (lista curada, no catch-all)', () => {
    expect(classifySourceType('trustpilot.com', SUBJECT)).toBe('earned')
    // Subdominio real citado por los motores: es.trustpilot.com.
    expect(classifySourceType('es.trustpilot.com', SUBJECT)).toBe('earned')
    expect(classifySourceType('tripadvisor.es', SUBJECT)).toBe('earned')
    expect(classifySourceType('reclamos.cl', SUBJECT)).toBe('earned')
    expect(classifySourceType('es.wikipedia.org', SUBJECT)).toBe('earned')
  })

  it('directorios/guías → directory', () => {
    expect(classifySourceType('turismocity.cl', SUBJECT)).toBe('directory')
    expect(classifySourceType('datosmundial.com', SUBJECT)).toBe('directory')
  })

  it('OTAs/venta → marketplace', () => {
    expect(classifySourceType('despegar.cl', SUBJECT)).toBe('marketplace')
    expect(classifySourceType('esky.com', SUBJECT)).toBe('marketplace')
    expect(classifySourceType('booking.com', SUBJECT)).toBe('marketplace')
  })

  it('sin match (competidores, gobierno, desconocidos) → unknown (honesto)', () => {
    expect(classifySourceType('jetsmart.com', SUBJECT)).toBe('unknown')
    expect(classifySourceType('jac.gob.cl', SUBJECT)).toBe('unknown')
    expect(classifySourceType('dominio-cualquiera.io', SUBJECT)).toBe('unknown')
    expect(classifySourceType(null, SUBJECT)).toBe('unknown')
  })
})

describe('growth/ai-visibility — normalizer pobla sourceTypes clasificados (wiring)', () => {
  it('citations sin sourceType del provider → clasificadas por dominio (no todo unknown)', () => {
    // FIXTURE_DISCOVERY_ABSENT trae citations de terceros sin sourceType explícito.
    const context: NormalizationContext = {
      subjectBrand: 'Efeonce',
      subjectDomain: 'efeoncepro.com',
      competitorsDeclared: ['Cebra']
    }

    const observation = {
      ...FIXTURE_DISCOVERY_ABSENT,
      citations: FIXTURE_DISCOVERY_ABSENT.citations.map(citation => ({
        ...citation,
        sourceType: undefined,
        domain: 'biobiochile.cl'
      }))
    }

    const finding = normalizeObservation(observation, context)

    expect(finding.sourceTypes).toContain('news')
    expect(finding.sourceTypes).not.toContain('unknown')
  })
})
