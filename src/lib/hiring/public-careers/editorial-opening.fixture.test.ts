// TASK-1740 — La fixture del contrato editorial se mantiene válida por construcción.

import { describe, expect, it } from 'vitest'

import { editorialOpeningFixture, legacyOpeningFixture } from './editorial-opening.fixture'
import { buildJobPostingJsonLd } from './job-posting'
import { parsePublicOpeningContent } from './public-content'

describe('editorial-opening fixture (contrato para TASK-1741)', () => {
  it('el bloque estructurado de la fixture pasa el validador canónico sin cambios', () => {
    const parsed = parsePublicOpeningContent(editorialOpeningFixture.content)

    expect(parsed).toEqual(editorialOpeningFixture.content)
  })

  it('la fixture editorial produce JobPosting válido; la legacy degrada sin schema remoto', () => {
    const editorial = buildJobPostingJsonLd(editorialOpeningFixture, 'https://greenhouse.efeoncepro.com')

    expect(editorial).not.toBeNull()
    expect(editorial!.jobLocationType).toBe('TELECOMMUTE')
    expect(editorial!.baseSalary).toBeDefined()

    // La legacy es remota sin países elegibles → fail-closed (ninguna propiedad falsa).
    expect(buildJobPostingJsonLd(legacyOpeningFixture, 'https://greenhouse.efeoncepro.com')).toBeNull()
  })
})
