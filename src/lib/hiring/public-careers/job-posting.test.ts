// TASK-1740 — JobPosting JSON-LD: casos Google + lifecycle + no-leak + HTML seguro.

import { describe, expect, it } from 'vitest'

import type { PublicOpeningPayload } from '@/types/hiring'

import { buildJobPostingJsonLd, serializeJsonLd } from './job-posting'

const BASE_URL = 'https://greenhouse.efeoncepro.com'

const baseOpening: PublicOpeningPayload = {
  publicId: 'EO-OPN-0061',
  title: 'Content Creator — Editorial, SEO/AEO & Social',
  summary: 'Crea contenido editorial con evidencia.',
  description: 'Sobre el rol\n\nProducir piezas pillar con QA.\n\nResponsabilidades\n- Redactar\n- Editar',
  requirements: 'Redacción nativa\nSEO on-page',
  niceToHave: 'AEO/GEO',
  locationMode: 'LATAM',
  workMode: 'remote',
  hiringRegion: 'LATAM',
  city: null,
  country: null,
  officeLocation: null,
  area: 'Marketing',
  skillTags: ['SEO', 'Contenido'],
  compensationBand: 'USD 1.100–1.300 mensuales, según experiencia y país de contratación',
  employmentMode: 'Jornada completa',
  seniority: 'Intermedio',
  processNotes: null,
  applyUrl: null,
  publishedAt: '2026-07-30T04:00:00.000Z',
  content: null,
  remoteEligibleCountries: [],
}

const structuredContent: NonNullable<PublicOpeningPayload['content']> = {
  version: 1,
  promise: 'Vas a operar el motor editorial con autonomía.',
  intro: 'El problema: producir con evidencia, no volumen.',
  outcomes: ['8 piezas/mes con QA'],
  workItems: ['Redactar piezas pillar'],
  essentials: ['Redacción nativa'],
  learnables: ['AEO/GEO'],
  evidenceAsk: 'Portafolio con 3 piezas publicadas.',
  remoteModel: '100% remoto con overlap GMT-4.',
  processSteps: ['Screening', 'Muestra de trabajo pagada'],
  benefits: ['15 días hábiles de vacaciones'],
  compensation: { currency: 'USD', minValue: 1100, maxValue: 1300, unitText: 'MONTH' },
}

describe('buildJobPostingJsonLd — elegibilidad remota', () => {
  it('remota SIN países elegibles NO emite schema (caso real LATAM: fail-closed)', () => {
    expect(buildJobPostingJsonLd(baseOpening, BASE_URL)).toBeNull()
  })

  it('remota con países elegibles emite TELECOMMUTE + applicantLocationRequirements', () => {
    const jsonLd = buildJobPostingJsonLd({ ...baseOpening, remoteEligibleCountries: ['CL', 'CO'] }, BASE_URL)

    expect(jsonLd).not.toBeNull()
    expect(jsonLd!.jobLocationType).toBe('TELECOMMUTE')
    expect(jsonLd!.applicantLocationRequirements).toEqual([
      { '@type': 'Country', name: 'CL' },
      { '@type': 'Country', name: 'CO' },
    ])
    expect(jsonLd!.jobLocation).toBeUndefined()
  })
})

describe('buildJobPostingJsonLd — híbrida/presencial (vacantes de país específico)', () => {
  it('híbrida con city+country emite jobLocation estructurado, sin TELECOMMUTE', () => {
    const jsonLd = buildJobPostingJsonLd(
      { ...baseOpening, workMode: 'hybrid', city: 'Santiago', country: 'Chile', remoteEligibleCountries: [] },
      BASE_URL,
    )

    expect(jsonLd).not.toBeNull()
    expect(jsonLd!.jobLocation).toEqual({
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: 'Santiago', addressCountry: 'Chile' },
    })
    expect(jsonLd!.jobLocationType).toBeUndefined()
    expect(jsonLd!.applicantLocationRequirements).toBeUndefined()
  })

  it('presencial sin city+country NO emite schema (officeLocation libre no estructura dirección)', () => {
    const jsonLd = buildJobPostingJsonLd(
      { ...baseOpening, workMode: 'onsite', officeLocation: 'Oficina Providencia', city: null, country: null },
      BASE_URL,
    )

    expect(jsonLd).toBeNull()
  })

  it('sin workMode estructurado (legacy) NO emite schema', () => {
    expect(buildJobPostingJsonLd({ ...baseOpening, workMode: null }, BASE_URL)).toBeNull()
  })
})

describe('buildJobPostingJsonLd — salario, directApply y lifecycle', () => {
  it('baseSalary SOLO desde compensación estructurada; el texto libre nunca se convierte', () => {
    const withoutStructured = buildJobPostingJsonLd(
      { ...baseOpening, remoteEligibleCountries: ['CL'] },
      BASE_URL,
    )

    expect(withoutStructured!.baseSalary).toBeUndefined()
    expect(JSON.stringify(withoutStructured)).not.toContain('según experiencia')

    const withStructured = buildJobPostingJsonLd(
      { ...baseOpening, remoteEligibleCountries: ['CL'], content: structuredContent },
      BASE_URL,
    )

    expect(withStructured!.baseSalary).toEqual({
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: { '@type': 'QuantitativeValue', minValue: 1100, maxValue: 1300, unitText: 'MONTH' },
    })
  })

  it('nunca emite directApply ni validThrough (sin expiración real, flujo con paso intermedio)', () => {
    const jsonLd = buildJobPostingJsonLd({ ...baseOpening, remoteEligibleCountries: ['CL'] }, BASE_URL)

    expect(jsonLd!.directApply).toBeUndefined()
    expect(jsonLd!.validThrough).toBeUndefined()
  })

  it('sin publishedAt no hay schema (el retiro de una vacante es el 404 del reader)', () => {
    expect(
      buildJobPostingJsonLd({ ...baseOpening, remoteEligibleCountries: ['CL'], publishedAt: null }, BASE_URL),
    ).toBeNull()
  })

  it('employmentType sólo por mapeo exacto conservador', () => {
    const full = buildJobPostingJsonLd({ ...baseOpening, remoteEligibleCountries: ['CL'] }, BASE_URL)

    expect(full!.employmentType).toBe('FULL_TIME')

    const ambiguous = buildJobPostingJsonLd(
      { ...baseOpening, remoteEligibleCountries: ['CL'], employmentMode: 'Contrato indefinido' },
      BASE_URL,
    )

    expect(ambiguous!.employmentType).toBeUndefined()
  })
})

describe('buildJobPostingJsonLd — descripción HTML segura desde el contenido visible', () => {
  it('con bloque estructurado la descripción refleja sus secciones, escapadas', () => {
    const jsonLd = buildJobPostingJsonLd(
      { ...baseOpening, remoteEligibleCountries: ['CL'], content: structuredContent },
      BASE_URL,
    )

    const description = String(jsonLd!.description)

    expect(description).toContain('<p>Vas a operar el motor editorial con autonomía.</p>')
    expect(description).toContain('<li>8 piezas/mes con QA</li>')
    expect(description).toContain('<li>15 días hábiles de vacaciones</li>')
    expect(description).toContain('<p>100% remoto con overlap GMT-4.</p>')
  })

  it('un bloque PARCIAL (solo remoteModel) COMPLEMENTA la prosa legacy en vez de reemplazarla', () => {
    // Caso real 2026-08-17: se declara el modelo remoto antes de autorar el contenido
    // editorial. Reemplazar la prosa dejaría la descripción del schema como un fragmento.
    const jsonLd = buildJobPostingJsonLd(
      {
        ...baseOpening,
        remoteEligibleCountries: ['CL'],
        content: {
          version: 1,
          promise: null,
          intro: null,
          outcomes: [],
          workItems: [],
          essentials: [],
          learnables: [],
          evidenceAsk: null,
          remoteModel: 'Trabajo 100% remoto con pago directo de Efeonce fuera de Chile.',
          processSteps: [],
          benefits: [],
          compensation: null,
        },
      },
      BASE_URL,
    )

    const description = String(jsonLd!.description)

    expect(description).toContain('Producir piezas pillar con QA.')
    expect(description).toContain('Redacción nativa')
    expect(description).toContain('<p>Trabajo 100% remoto con pago directo de Efeonce fuera de Chile.</p>')
  })

  it('un bloque con narrativa núcleo SÍ reemplaza la prosa legacy (sin duplicar el rol)', () => {
    const jsonLd = buildJobPostingJsonLd(
      { ...baseOpening, remoteEligibleCountries: ['CL'], content: structuredContent },
      BASE_URL,
    )

    const description = String(jsonLd!.description)

    expect(description).toContain('Vas a operar el motor editorial')
    expect(description).not.toContain('Producir piezas pillar con QA.')
  })

  it('sin bloque estructurado cae a la prosa legacy visible (summary/description/requirements)', () => {
    const jsonLd = buildJobPostingJsonLd({ ...baseOpening, remoteEligibleCountries: ['CL'] }, BASE_URL)
    const description = String(jsonLd!.description)

    expect(description).toContain('Producir piezas pillar con QA.')
    expect(description).toContain('Redacción nativa')
  })

  it('escapa HTML hostil dentro del contenido y la serialización no puede cerrar el script', () => {
    const jsonLd = buildJobPostingJsonLd(
      {
        ...baseOpening,
        remoteEligibleCountries: ['CL'],
        content: { ...structuredContent, promise: 'Rol <script>alert(1)</script> & más' },
      },
      BASE_URL,
    )

    const description = String(jsonLd!.description)

    expect(description).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; más')
    expect(description).not.toContain('<script>')

    const serialized = serializeJsonLd(jsonLd!)

    expect(serialized).not.toContain('</script')
    expect(serialized).not.toContain('<p>')
    expect(serialized).toContain('\\u003cp>')
  })

  it('url y canonical usan el publicId codificado sobre la base pública', () => {
    const jsonLd = buildJobPostingJsonLd({ ...baseOpening, remoteEligibleCountries: ['CL'] }, `${BASE_URL}/`)

    expect(jsonLd!.url).toBe('https://greenhouse.efeoncepro.com/public/careers/EO-OPN-0061')
  })

  it('nunca filtra sentinels internos: el payload público es la única fuente', () => {
    const jsonLd = buildJobPostingJsonLd(
      { ...baseOpening, remoteEligibleCountries: ['CL'], content: structuredContent },
      BASE_URL,
    )

    const serialized = JSON.stringify(jsonLd)

    for (const sentinel of ['budget', 'risk', 'owner_user', 'internal_notes', 'rate_band']) {
      expect(serialized.toLowerCase()).not.toContain(sentinel)
    }
  })
})
