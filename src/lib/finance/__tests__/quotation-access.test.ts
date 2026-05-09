import { describe, expect, it } from 'vitest'

import { ROLE_CODES } from '@/config/role-codes'

import {
  canAccessFinanceQuotes,
  canDecideFinanceQuotationApproval,
  canManageFinanceQuotes,
  isEditableFinanceQuotationStatus,
  isIssueableFinanceQuotationStatus,
  isIssuedFinanceQuotationStatus
} from '../quotation-access'

describe('quotation-access', () => {
  it('lets superadmin access, manage and decide approvals', () => {
    const subject = {
      roleCodes: [ROLE_CODES.EFEONCE_ADMIN, ROLE_CODES.COLLABORATOR],
      routeGroups: ['admin', 'finance', 'my'],
      authorizedViews: []
    }

    expect(canAccessFinanceQuotes(subject)).toBe(true)
    expect(canManageFinanceQuotes(subject)).toBe(true)
    expect(canDecideFinanceQuotationApproval(subject)).toBe(true)
  })

  it('lets an authorized quotes view access and manage without relying on route groups', () => {
    const subject = {
      roleCodes: [ROLE_CODES.COLLABORATOR],
      routeGroups: ['my'],
      authorizedViews: ['finanzas.cotizaciones']
    }

    expect(canAccessFinanceQuotes(subject)).toBe(true)
    expect(canManageFinanceQuotes(subject)).toBe(true)
    expect(canDecideFinanceQuotationApproval(subject)).toBe(false)
  })

  it('accepts the commercial quotes view during the finance path transition', () => {
    const subject = {
      roleCodes: [ROLE_CODES.COLLABORATOR],
      routeGroups: ['my'],
      authorizedViews: ['comercial.cotizaciones']
    }

    expect(canAccessFinanceQuotes(subject)).toBe(true)
    expect(canManageFinanceQuotes(subject)).toBe(true)
    expect(canDecideFinanceQuotationApproval(subject)).toBe(false)
  })

  it('lets finance route-group members access and manage quotes', () => {
    const subject = {
      roleCodes: [ROLE_CODES.FINANCE_ANALYST],
      routeGroups: ['finance'],
      authorizedViews: []
    }

    expect(canAccessFinanceQuotes(subject)).toBe(true)
    expect(canManageFinanceQuotes(subject)).toBe(true)
    expect(canDecideFinanceQuotationApproval(subject)).toBe(false)
  })

  it('lets commercial route-group members access and manage quotes on legacy finance paths', () => {
    const subject = {
      roleCodes: [ROLE_CODES.EFEONCE_ACCOUNT],
      routeGroups: ['commercial'],
      authorizedViews: []
    }

    expect(canAccessFinanceQuotes(subject)).toBe(true)
    expect(canManageFinanceQuotes(subject)).toBe(true)
    expect(canDecideFinanceQuotationApproval(subject)).toBe(false)
  })

  it('treats only draft and approval_rejected as editable/issueable', () => {
    expect(isEditableFinanceQuotationStatus('draft')).toBe(true)
    expect(isEditableFinanceQuotationStatus('approval_rejected')).toBe(true)
    expect(isEditableFinanceQuotationStatus('issued')).toBe(false)

    expect(isIssueableFinanceQuotationStatus('draft')).toBe(true)
    expect(isIssueableFinanceQuotationStatus('approval_rejected')).toBe(true)
    expect(isIssueableFinanceQuotationStatus('pending_approval')).toBe(false)
  })

  it('treats issued aliases as emitted states', () => {
    expect(isIssuedFinanceQuotationStatus('issued')).toBe(true)
    expect(isIssuedFinanceQuotationStatus('sent')).toBe(true)
    expect(isIssuedFinanceQuotationStatus('approved')).toBe(true)
    expect(isIssuedFinanceQuotationStatus('draft')).toBe(false)
  })
})
