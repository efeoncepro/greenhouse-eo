// @vitest-environment jsdom

// TASK-1740 — Guardrail MECÁNICO del invariante central del dominio de vacantes públicas:
//
//   "El HTML visible y el JSON-LD nacen del mismo reader/proyección.
//    No existe un segundo texto SEO que pueda prometer hechos distintos."
//
// Hasta ahora ese invariante lo sostenían dos cosas frágiles: el interlock booleano de
// `isHiringPublicJobPostingSchemaEnabled` (schema sólo con el renderer editorial ON) y la
// disciplina de quien editara el builder. `job-posting.test.ts` valida el schema aislado y
// `CareersDetailView.test.tsx` valida la página aislada — nadie cruzaba ambos, así que
// agregar un párrafo al JSON-LD que la pantalla no muestra pasaba con TODO en verde.
//
// Este test cruza los dos lados: cada frase que el `JobPosting` le declara a Google debe
// aparecer en el DOM que ve el candidato. La dirección importa y es asimétrica: la página
// PUEDE mostrar más que el schema (p. ej. la banda de compensación en texto libre, que
// deliberadamente nunca se convierte en `baseSalary`); el schema NUNCA puede declarar de más.

import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { getMicrocopy } from '@/lib/copy'
import { editorialOpeningFixture, legacyOpeningFixture } from '@/lib/hiring/public-careers/editorial-opening.fixture'
import { buildJobPostingJsonLd } from '@/lib/hiring/public-careers/job-posting'
import { buildCareersOpeningViewModel } from '@/lib/hiring/public-careers/view-model'
import type { PublicOpeningPayload } from '@/types/hiring'

import { CareersDetailView } from './CareersDetailView'

const copy = getMicrocopy('es-CL').careers
const BASE_URL = 'https://greenhouse.efeoncepro.com'

/** Longitud mínima para considerar una frase "una promesa"; descarta rótulos sueltos. */
const MIN_CLAIM_LENGTH = 25

/** Palabras comparadas por frase: suficiente para identificarla, tolerante a re-wrapping. */
const PROBE_WORDS = 8

/**
 * Normaliza para comparar SIGNIFICADO, no marcado: quita etiquetas, viñetas, emojis y
 * puntuación. Sin esto el test daría falsos positivos (el builder emite `- item` y el
 * renderer pinta el mismo item sin el guion).
 */
const normalize = (value: string): string =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\p{Extended_Pictographic}]/gu, ' ')
    .replace(/[\s\-*•·–—]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

/**
 * Frases (claims) que el schema le declara a Google, desde su descripción HTML.
 *
 * Se corta por LÍNEA LÓGICA (`</p>`, `</li>`, `<br/>`), no por bloque: el renderer
 * reorganiza legítimamente una lista cruda en ítems con su propio rótulo, así que comparar
 * bloques multi-línea produciría falsos positivos por estructura, no por hechos. Lo que este
 * guardrail persigue es una PROMESA presente en el schema y ausente en pantalla.
 */
const schemaClaims = (jsonLd: Record<string, unknown>): string[] =>
  String(jsonLd.description ?? '')
    .split(/<\/(?:p|li|h[1-6])>|<br\s*\/?>/i)
    .map(fragment => normalize(fragment))
    .filter(fragment => fragment.length >= MIN_CLAIM_LENGTH)

const renderVisibleText = (opening: PublicOpeningPayload): string => {
  const viewModel = buildCareersOpeningViewModel(opening, copy)
  const { container } = render(<CareersDetailView copy={copy} opening={viewModel} editorialEnabled />)

  return normalize(container.textContent ?? '')
}

const expectSchemaFullyVisible = (opening: PublicOpeningPayload): void => {
  const jsonLd = buildJobPostingJsonLd(opening, BASE_URL)

  expect(jsonLd, 'la fixture debe producir schema para que este guardrail tenga sentido').not.toBeNull()

  const visible = renderVisibleText(opening)
  const claims = schemaClaims(jsonLd!)

  expect(claims.length, 'el schema debe declarar al menos algunas frases').toBeGreaterThan(3)

  const notVisible = claims.filter(claim => !visible.includes(claim.split(' ').slice(0, PROBE_WORDS).join(' ')))

  expect(
    notVisible,
    `El JSON-LD declara a Google contenido que la página NO muestra:\n${notVisible.map(c => `  · ${c.slice(0, 120)}`).join('\n')}`,
  ).toEqual([])
}

afterEach(cleanup)

describe('TASK-1740 — paridad JSON-LD ↔ HTML visible (invariante central)', () => {
  it('una vacante con contenido estructurado no declara a Google nada que la pantalla oculte', () => {
    expectSchemaFullyVisible(editorialOpeningFixture)
  })

  it('una vacante legacy (sin bloque estructurado) también mantiene la paridad', () => {
    // El camino legacy es el más expuesto: el builder emite la prosa cruda mientras el
    // view-model la recorta por headings. Si alguien publica una vacante v1 con una sección
    // "Beneficios"/"Compensación" inline, el schema la emitiría y la página la escondería.
    expectSchemaFullyVisible({ ...legacyOpeningFixture, remoteEligibleCountries: ['CL'] })
  })

  it('detecta la fuga cuando la prosa legacy trae secciones que el renderer recorta', () => {
    // Reproduce el escenario de riesgo real, no uno inventado: `extractDescriptionBody` corta
    // la descripción en el heading de responsabilidades/beneficios, así que ese texto queda
    // fuera de la pantalla. Este caso documenta el límite conocido del camino legacy.
    const risky: PublicOpeningPayload = {
      ...legacyOpeningFixture,
      remoteEligibleCountries: ['CL'],
      description:
        'Sobre el rol\n\nProducir piezas con evidencia.\n\nBeneficios\n- Bono anual garantizado de fin de año para toda la dotación',
    }

    const jsonLd = buildJobPostingJsonLd(risky, BASE_URL)
    const visible = renderVisibleText(risky)
    const leak = 'bono anual garantizado de fin de año'

    const schemaDeclares = normalize(String(jsonLd?.description ?? '')).includes(normalize(leak))
    const pageShows = visible.includes(normalize(leak))

    // El invariante exige que NO exista contenido sólo-schema. Si este assert falla porque
    // `schemaDeclares && !pageShows`, la fuga volvió: arreglar el builder, no este test.
    expect(
      schemaDeclares && !pageShows,
      'Fuga sólo-schema: el JSON-LD declara una promesa que la página no muestra.',
    ).toBe(false)
  })
})
