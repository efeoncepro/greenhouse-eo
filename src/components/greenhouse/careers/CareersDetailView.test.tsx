// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { getMicrocopy } from '@/lib/copy'
import { editorialOpeningFixture, legacyOpeningFixture } from '@/lib/hiring/public-careers/editorial-opening.fixture'
import { buildCareersOpeningViewModel } from '@/lib/hiring/public-careers/view-model'

import { CareersDetailView } from './CareersDetailView'

const copy = getMicrocopy('es-CL').careers

afterEach(cleanup)

describe('CareersDetailView — editorial rollout without vacancy-sheet regression', () => {
  it('preserves the candidate-facing seniority literally without translating Senior to Intermedio', () => {
    const opening = buildCareersOpeningViewModel(
      { ...editorialOpeningFixture, title: 'Senior Visual Designer', seniority: 'Senior' },
      copy
    )

    render(<CareersDetailView copy={copy} opening={opening} editorialEnabled />)

    expect(screen.getAllByText('Senior')).toHaveLength(2)
    expect(screen.queryByText('Intermedio')).toBeNull()
  })

  it('renders exactly the two existing application CTAs and every structured claim', () => {
    const opening = buildCareersOpeningViewModel(editorialOpeningFixture, copy)
    const { container } = render(<CareersDetailView copy={copy} opening={opening} editorialEnabled />)

    expect(container.querySelectorAll(`a[href="${opening.applyHref}"]`)).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: /postular/i })).toHaveLength(2)

    for (const text of [
      editorialOpeningFixture.content!.promise!,
      editorialOpeningFixture.content!.intro!,
      ...editorialOpeningFixture.content!.outcomes,
      ...editorialOpeningFixture.content!.workItems,
      ...editorialOpeningFixture.content!.essentials,
      ...editorialOpeningFixture.content!.learnables,
      editorialOpeningFixture.content!.evidenceAsk!,
      editorialOpeningFixture.content!.workModel!,
      ...editorialOpeningFixture.content!.benefits,
      ...editorialOpeningFixture.content!.process!.steps.flatMap(step => [step.title, step.body!]),
      ...editorialOpeningFixture.content!.additionalSections.flatMap(section => [
        section.title,
        ...(section.intro ? [section.intro] : []),
        ...section.items
      ])
    ]) {
      expect(screen.getByText(text)).toBeTruthy()
    }

    expect(screen.getByText('USD 1,100–1,300 · por mes')).toBeTruthy()

    for (const country of editorialOpeningFixture.remoteEligibleCountries) {
      expect(screen.getByText(country)).toBeTruthy()
    }
  })

  it('preserves the complete legacy vacancy sheet when the editorial flag is off', () => {
    const opening = buildCareersOpeningViewModel(legacyOpeningFixture, copy)
    const { container } = render(<CareersDetailView copy={copy} opening={opening} editorialEnabled={false} />)

    expect(container.querySelectorAll(`a[href="${opening.applyHref}"]`)).toHaveLength(2)
    expect(screen.getByRole('heading', { name: copy.detail.descriptionTitle })).toBeTruthy()
    expect(screen.getByRole('heading', { name: copy.detail.responsibilitiesTitle })).toBeTruthy()
    expect(screen.getByRole('heading', { name: copy.detail.requirementsTitle })).toBeTruthy()
    expect(screen.getByRole('heading', { name: copy.detail.processTitle })).toBeTruthy()
    expect(container.querySelector('[data-capture="careers-detail-outcomes"]')).toBeNull()
  })

  it('keeps partial structured content and legacy requirements visible together', () => {
    const partial = {
      ...legacyOpeningFixture,
      content: {
        ...editorialOpeningFixture.content!,
        version: 1 as const,
        intro: null,
        outcomes: [],
        workItems: [],
        essentials: ['Criterio editorial'],
        preferred: [],
        learnables: []
      }
    }

    const opening = buildCareersOpeningViewModel(partial, copy)

    render(<CareersDetailView copy={copy} opening={opening} editorialEnabled />)

    expect(screen.getByText('Criterio editorial')).toBeTruthy()
    expect(screen.getByText('Redacción nativa en español')).toBeTruthy()
    expect(screen.getByText('SEO on-page')).toBeTruthy()
    expect(screen.getByText('Producir piezas pillar con QA editorial.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: copy.detail.preferredTitle })).toBeTruthy()
    expect(screen.getByText('AEO/GEO')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: copy.detail.learnablesTitle })).toBeNull()
  })
})
