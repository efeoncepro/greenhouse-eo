import { describe, expect, it } from 'vitest'

import type { Competency, AssessmentTemplateWithModules } from '@/types/hiring-assessment'
import type { HiringOpening, TalentDemand } from '@/types/hiring'

import { VACANCY_COPY_SYSTEM_PROMPT, buildVacancyCopyPrompt, buildVacancyPromptInputFromRecords } from './prompt'

// TASK-1385 — el test de seguridad central del feature: la verdad interna del opening y de la
// demanda NUNCA llega al prompt del LLM. Se cargan sentinels en TODOS los campos internos y se
// asserta que ni la proyección serializada ni el prompt final los contienen.

const SENTINELS = {
  budgetBand: 'SECRET_BUDGET_9999_CLP',
  rateBand: 'SECRET_RATE_777_USD',
  riskNotes: 'SECRET_RISK_NOTES_LEAK',
  internalNotes: 'SECRET_INTERNAL_NOTES_LEAK',
  ownerUserId: 'SECRET_OWNER_USER_ID',
  organizationId: 'SECRET_ORGANIZATION_ID',
  spaceId: 'SECRET_SPACE_ID',
  clientId: 'SECRET_CLIENT_ID',
  demandBudgetBand: 'SECRET_DEMAND_BUDGET',
  demandRateBand: 'SECRET_DEMAND_RATE',
  demandNotes: 'SECRET_DEMAND_NOTES_LEAK',
  requestedCompanyName: 'SECRET_CONFIDENTIAL_CLIENT_SA',
  prospectRef: 'SECRET_PROSPECT_REF',
  dealRef: 'SECRET_DEAL_REF',
  externalAccountRef: 'SECRET_EXTERNAL_ACCOUNT',
} as const

const opening: HiringOpening = {
  openingId: 'opng-test-1385',
  publicId: 'EO-OPN-9385',
  demandId: 'tdem-test-1385',
  internalTitle: 'SEO Specialist Senior',
  seniority: 'senior',
  requestedSeats: 1,
  ownerUserId: SENTINELS.ownerUserId,
  spaceId: SENTINELS.spaceId,
  organizationId: SENTINELS.organizationId,
  budgetBand: SENTINELS.budgetBand,
  rateBand: SENTINELS.rateBand,
  riskNotes: SENTINELS.riskNotes,
  internalNotes: SENTINELS.internalNotes,
  visibility: 'internal_only',
  publicationStatus: 'draft',
  publicTitle: null,
  publicSummary: null,
  publicDescription: null,
  publicRequirements: null,
  publicNiceToHave: null,
  publicLocationMode: null,
  publicWorkMode: 'remote',
  publicHiringRegion: 'LATAM',
  publicCity: null,
  publicCountry: null,
  publicOfficeLocation: null,
  publicArea: 'Growth',
  publicSkillTags: [],
  publicCompensationBand: null,
  publicationSourceRef: null,
  publicEmploymentMode: null,
  publicSeniority: null,
  publicProcessNotes: null,
  applyUrl: null,
  status: 'draft',
  publishedAt: null,
  createdBy: null,
  createdAt: '2026-07-16T00:00:00.000Z',
  updatedAt: '2026-07-16T00:00:00.000Z',
}

const demand: TalentDemand = {
  demandId: 'tdem-test-1385',
  publicId: 'EO-DEM-9385',
  stakeholderType: 'internal',
  engagementType: 'on_going',
  fulfillmentMode: 'internal_hire',
  demandOrigin: 'manual_internal',
  organizationId: SENTINELS.organizationId,
  clientId: SENTINELS.clientId,
  spaceId: SENTINELS.spaceId,
  businessUnit: null,
  serviceId: null,
  prospectRef: SENTINELS.prospectRef,
  dealRef: SENTINELS.dealRef,
  externalAccountRef: SENTINELS.externalAccountRef,
  requestedCompanyName: SENTINELS.requestedCompanyName,
  requestedRole: 'SEO Specialist',
  requestedSeats: 1,
  requestedSkills: ['SEO técnico', 'GA4', 'Search Console'],
  targetStartDate: null,
  priority: 'high',
  duration: 'indefinida',
  timezone: 'America/Santiago',
  language: 'español',
  budgetBand: SENTINELS.demandBudgetBand,
  rateBand: SENTINELS.demandRateBand,
  status: 'open',
  ownerUserId: SENTINELS.ownerUserId,
  notes: SENTINELS.demandNotes,
  createdBy: null,
  createdAt: '2026-07-16T00:00:00.000Z',
  updatedAt: '2026-07-16T00:00:00.000Z',
}

const template: AssessmentTemplateWithModules = {
  templateId: 'tmpl-test-1385',
  name: 'SEO Specialist — proceso estándar',
  roleHint: 'seo',
  status: 'active',
  createdBy: null,
  createdAt: '2026-07-16T00:00:00.000Z',
  updatedAt: '2026-07-16T00:00:00.000Z',
  modules: [
    { moduleId: 'mod-1', templateId: 'tmpl-test-1385', competencyId: 'comp-seo', targetLevel: 'avanzado', weight: 40 },
    { moduleId: 'mod-2', templateId: 'tmpl-test-1385', competencyId: 'comp-desconocida', targetLevel: null, weight: 10 },
  ],
}

const competencies: Competency[] = [
  {
    competencyId: 'comp-seo',
    key: 'seo',
    name: 'SEO',
    category: 'skill',
    description: null,
    status: 'active',
    createdAt: '2026-07-16T00:00:00.000Z',
    updatedAt: '2026-07-16T00:00:00.000Z',
  },
]

describe('buildVacancyPromptInputFromRecords (allowlist-safe, TASK-1385)', () => {
  it('NUNCA filtra verdad interna del opening ni de la demanda al input del prompt', () => {
    const input = buildVacancyPromptInputFromRecords(opening, demand, template, competencies)
    const serialized = JSON.stringify(input)
    const fullPrompt = `${VACANCY_COPY_SYSTEM_PROMPT}\n${buildVacancyCopyPrompt(input)}`

    for (const [field, sentinel] of Object.entries(SENTINELS)) {
      expect(serialized, `la proyección filtra ${field}`).not.toContain(sentinel)
      expect(fullPrompt, `el prompt filtra ${field}`).not.toContain(sentinel)
    }
  })

  it('proyecta los inputs allowlist-safe reales (rol, skills, hechos públicos, competencias)', () => {
    const input = buildVacancyPromptInputFromRecords(opening, demand, template, competencies)

    expect(input.role).toBe('SEO Specialist Senior')
    expect(input.skills).toEqual(['SEO técnico', 'GA4', 'Search Console'])
    expect(input.workMode).toBe('remote')
    expect(input.hiringRegion).toBe('LATAM')
    expect(input.area).toBe('Growth')

    // Competencia mapeada por id; módulo con competencyId desconocido se descarta silencioso.
    expect(input.competencies).toEqual([
      { key: 'seo', name: 'SEO', category: 'skill', targetLevel: 'avanzado', weight: 40 },
    ])
  })

  it('sin template no hay competencias y el prompt sigue siendo válido', () => {
    const input = buildVacancyPromptInputFromRecords(opening, demand, null, [])

    expect(input.competencies).toEqual([])

    const prompt = buildVacancyCopyPrompt(input)

    expect(prompt).toContain('Rol: SEO Specialist Senior')
    expect(prompt).not.toContain('Competencias que evalúa el proceso')
  })

  it('el copy público existente entra como contexto de re-draft cuando existe', () => {
    const withCopy: HiringOpening = { ...opening, publicTitle: 'Título previo', publicSummary: 'Resumen previo' }
    const input = buildVacancyPromptInputFromRecords(withCopy, demand, null, [])
    const prompt = buildVacancyCopyPrompt(input)

    expect(prompt).toContain('Copy público actual')
    expect(prompt).toContain('Título previo')
  })
})
