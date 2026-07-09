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
  workMode: null,
  hiringRegion: null,
  city: null,
  country: null,
  officeLocation: null,
  area: null,
  skillTags: [],
  compensationBand: null,
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
    expect(vm.location).toBe('LATAM')
    expect(vm.modality).toBe('Remoto')
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
    expect(vm.skillChips).toEqual(['Marketing generalista', 'SEO', 'Vendor management', 'Liderazgo operativo'])
    expect(vm.responsibilityItems).toEqual([
      'Coordinar campañas, contenidos, SEO, growth tasks y próximos pasos comerciales.',
      'Gestionar la relación diaria con clientes.',
      'Preparar actualizaciones ejecutivas.',
    ])
  })

  it('uses structured public fields before legacy inference', () => {
    const vm = buildCareersOpeningViewModel(
      {
        ...opening,
        title: 'Account Manager / Especialista en Marketing',
        locationMode: 'Remoto / híbrido según país y acuerdo',
        workMode: 'remote',
        hiringRegion: 'Global',
        area: 'Operations',
        skillTags: ['Account management', 'SEO técnico'],
      },
      copy,
    )

    expect(vm.area).toBe('Operations')
    expect(vm.location).toBe('Global')
    expect(vm.modality).toBe('Remoto')
    expect(vm.skillChips).toEqual(['Account management', 'SEO técnico'])
  })

  it('scopes responsibility fallbacks after the heading and before the next section', () => {
    const vm = buildCareersOpeningViewModel(
      {
        ...opening,
        description:
          'Sobre el rol\n\nResponsabilidades principales:\n\nGestionar la relación diaria con clientes.\nCoordinar proveedores externos.\n\nRequisitos:\nExperiencia en marketing.',
      },
      copy,
    )

    expect(vm.responsibilityItems).toEqual([
      'Gestionar la relación diaria con clientes.',
      'Coordinar proveedores externos.',
    ])
    expect(vm.responsibilityItems.join(' ')).not.toContain('Responsabilidades')
    expect(vm.responsibilityItems.join(' ')).not.toContain('Requisitos')
  })

  it('accepts numbered and en-dash responsibility lists', () => {
    const vm = buildCareersOpeningViewModel(
      {
        ...opening,
        description:
          'Responsabilidades:\n1. Preparar actualizaciones ejecutivas.\n– Detectar riesgos temprano.\n2) Liderar reuniones con claridad.',
      },
      copy,
    )

    expect(vm.responsibilityItems).toEqual([
      'Preparar actualizaciones ejecutivas.',
      'Detectar riesgos temprano.',
      'Liderar reuniones con claridad.',
    ])
  })

  it('normalizes ambiguous public modality copy into modality plus remote region', () => {
    const vm = buildCareersOpeningViewModel(
      {
        ...opening,
        locationMode: 'Remoto / híbrido según país y acuerdo',
      },
      copy,
    )

    expect(vm.modality).toBe('Remoto')
    expect(vm.location).toBe('LATAM')
    expect(vm.modalityKind).toBe('remote')
    expect(JSON.stringify(vm)).not.toContain('según acuerdo')
    expect(JSON.stringify(vm)).not.toContain('híbrido según')
  })

  it('keeps a real location for hybrid roles', () => {
    const vm = buildCareersOpeningViewModel(
      {
        ...opening,
        locationMode: 'Híbrido · Santiago, Chile',
      },
      copy,
    )

    expect(vm.modality).toBe('Híbrido')
    expect(vm.location).toBe('Santiago, Chile')
    expect(vm.modalityKind).toBe('hybrid')
  })

  it('does not expose internal assessment notes in the public process', () => {
    const vm = buildCareersOpeningViewModel(
      {
        ...opening,
        processNotes: 'Esta vacante está alineada internamente al assessment template Account Manager L2.',
      },
      copy,
    )

    expect(vm.processNotes).toEqual([])
  })

  it('formats copy templates without requiring functions in serialized copy', () => {
    expect(formatCareersTemplate(copy.apply.titleTemplate, { role: 'Diseño' })).toBe('Postúlate a Diseño')
  })
})
