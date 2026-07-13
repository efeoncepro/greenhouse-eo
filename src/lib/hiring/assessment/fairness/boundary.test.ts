import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { ROLE_CODES } from '@/config/role-codes'
import { can } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

const subject = (
  roleCode: (typeof ROLE_CODES)[keyof typeof ROLE_CODES],
  tenantType: TenantEntitlementSubject['tenantType'] = 'efeonce_internal',
): TenantEntitlementSubject => ({
  userId: `fairness-${roleCode}`,
  tenantType,
  roleCodes: [roleCode],
  primaryRoleCode: roleCode,
  routeGroups: tenantType === 'efeonce_internal' ? ['internal'] : ['client'],
  authorizedViews: [],
  projectScopes: [],
  campaignScopes: [],
  businessLines: [],
  serviceModules: [],
  portalHomePath: '/home',
})

describe('fairness privacy boundary (TASK-1365)', () => {
  it('el reader consume solo la proyección agregada y su DTO no expone IDs individuales', () => {
    const reader = readFileSync(`${process.cwd()}/src/lib/hiring/assessment/fairness/get-selection-fairness.ts`, 'utf8')
    const contracts = readFileSync(`${process.cwd()}/src/lib/hiring/assessment/fairness/contracts.ts`, 'utf8')
    const reportBlock = contracts.slice(contracts.indexOf('export interface SelectionFairnessGroup'))

    expect(reader).toContain('FROM greenhouse_hiring.assessment_fairness')
    expect(reader).not.toContain('hiring_demographic_selfid')
    expect(reader).not.toMatch(/identity_profile_id|application_id|candidate_facet_id/)
    expect(reportBlock).not.toMatch(/identityProfileId|applicationId|candidateFacetId|assessmentId|email|fullName/)
  })

  it('ningún command de decisión/scoring importa o consulta self-ID', () => {
    for (const file of [
      'src/lib/hiring/decide.ts',
      'src/lib/hiring/store.ts',
      'src/lib/hiring/assessment/scoring.ts',
      'src/lib/hiring/assessment/review.ts',
    ]) {
      expect(readFileSync(`${process.cwd()}/${file}`, 'utf8'), file).not.toMatch(
        /hiring_demographic_selfid|assessment_fairness/,
      )
    }
  })

  it('el endpoint público no acepta IDs y la captura sensible no publica al outbox', () => {
    const route = readFileSync(`${process.cwd()}/src/app/api/public/assessment/[token]/route.ts`, 'utf8')
    const capture = readFileSync(`${process.cwd()}/src/lib/hiring/assessment/fairness/capture-self-id.ts`, 'utf8')

    expect(route).not.toContain('identityProfileId')
    expect(route).not.toContain('applicationId')
    expect(capture).not.toContain('publishOutboxEvent')
    expect(capture).not.toContain('EVENT_TYPES')
  })

  it('fairness_read es role-only y no se hereda por internal/client', () => {
    expect(can(subject(ROLE_CODES.EFEONCE_ADMIN), 'hiring.assessment.fairness_read', 'read', 'tenant')).toBe(true)
    expect(can(subject(ROLE_CODES.HR_MANAGER), 'hiring.assessment.fairness_read', 'read', 'tenant')).toBe(true)
    expect(can(subject(ROLE_CODES.COLLABORATOR), 'hiring.assessment.fairness_read', 'read', 'tenant')).toBe(false)
    expect(
      can(
        subject(ROLE_CODES.CLIENT_MANAGER, 'client'),
        'hiring.assessment.fairness_read',
        'read',
        'tenant',
      ),
    ).toBe(false)
  })
})
