import { describe, expect, it } from 'vitest'

import { getMicrocopy } from '@/lib/copy'
import type { PublicOpeningPayload } from '@/types/hiring'

import {
  buildCareersOpeningViewModel,
  filterCareersOpenings,
  formatCareersTemplate,
} from './view-model'

const copy = getMicrocopy('es-CL').careers

const opening: PublicOpeningPayload = {
  publicId: 'EO-OPN-9001',
  title: 'Ingeniero/a full-stack',
  summary: 'Construye plataformas con TypeScript, React y PostgreSQL.',
  description: 'Desarrollar features full-stack.\nCuidar calidad y observabilidad.',
  requirements: 'TypeScript\nReact\nPostgreSQL',
  niceToHave: 'Node.js\nTesting',
  locationMode: 'Remoto',
  employmentMode: 'Jornada completa',
  seniority: 'Semi-senior',
  processNotes: 'Postulas y luego conversamos.',
  applyUrl: null,
  publishedAt: '2026-07-08T00:00:00.000Z',
}

describe('careers public view model', () => {
  it('maps PublicOpeningPayload into a careers view model without internal ids', () => {
    const vm = buildCareersOpeningViewModel(opening, copy)

    expect(vm.publicId).toBe('EO-OPN-9001')
    expect(vm.detailHref).toBe('/public/careers/EO-OPN-9001')
    expect(vm.applyHref).toBe('/public/careers/EO-OPN-9001/apply')
    expect(vm.area).toBe('Tecnología')
    expect(vm.modalityKind).toBe('remote')
    expect(vm.skillChips).toContain('TypeScript')
    expect(JSON.stringify(vm)).not.toContain('openingId')
    expect(JSON.stringify(vm)).not.toContain('ownerUserId')
  })

  it('filters by query, area, and modality using public view fields', () => {
    const vm = buildCareersOpeningViewModel(opening, copy)

    expect(filterCareersOpenings([vm], { query: 'react' })).toHaveLength(1)
    expect(filterCareersOpenings([vm], { area: 'Diseño' })).toHaveLength(0)
    expect(filterCareersOpenings([vm], { modality: 'Remoto' })).toHaveLength(1)
  })

  it('weights primary role signals over incidental nice-to-have terms when inferring area', () => {
    const vm = buildCareersOpeningViewModel(
      {
        ...opening,
        publicId: 'EO-OPN-0009',
        title: 'Account Manager / Especialista en Marketing',
        summary: 'Lidera cuentas, planes de marketing, SEO y coordinación de proveedores.',
        description:
          'Acompañar cuentas en crecimiento.\n\nResponsabilidades principales:\n\n- Coordinar campañas, contenidos, SEO, growth tasks y próximos pasos comerciales.\n- Gestionar la relación diaria con clientes.\n- Preparar actualizaciones ejecutivas.',
        requirements: 'Marketing generalista\nNociones de SEO\nVendor management\nLiderazgo operativo',
        niceToHave: 'Coordinación de SEO, contenido, paid media, diseño, web o automatización.',
      },
      copy,
    )

    expect(vm.area).toBe('Marketing')
    expect(vm.responsibilityItems).toEqual([
      'Coordinar campañas, contenidos, SEO, growth tasks y próximos pasos comerciales.',
      'Gestionar la relación diaria con clientes.',
      'Preparar actualizaciones ejecutivas.',
    ])
  })

  it('formats copy templates without requiring functions in serialized copy', () => {
    expect(formatCareersTemplate(copy.apply.titleTemplate, { role: 'Diseño' })).toBe('Postúlate a Diseño')
  })
})
