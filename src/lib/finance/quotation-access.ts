import { ROLE_CODES } from '@/config/role-codes'

export interface FinanceQuotationAccessSubject {
  roleCodes?: readonly string[] | null
  routeGroups?: readonly string[] | null
  authorizedViews?: readonly string[] | null
}

export type FinanceQuotationStatus =
  | 'draft'
  | 'pending_approval'
  | 'approval_rejected'
  | 'issued'
  | 'sent'
  | 'approved'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'converted'
  | string

const QUOTES_VIEW_CODE = 'finanzas.cotizaciones'

const normalize = (values?: readonly string[] | null): string[] =>
  Array.isArray(values) ? values.filter(Boolean) : []

const hasRole = (subject: FinanceQuotationAccessSubject, roleCode: string) =>
  normalize(subject.roleCodes).includes(roleCode)

const hasRouteGroup = (subject: FinanceQuotationAccessSubject, routeGroup: string) =>
  normalize(subject.routeGroups).includes(routeGroup)

const hasAuthorizedView = (subject: FinanceQuotationAccessSubject, viewCode: string) => {
  const authorizedViews = normalize(subject.authorizedViews)

  if (authorizedViews.length === 0) {
    return null
  }

  return authorizedViews.includes(viewCode)
}

const financeSurfaceFallback = (subject: FinanceQuotationAccessSubject) =>
  hasRouteGroup(subject, 'finance') || hasRole(subject, ROLE_CODES.EFEONCE_ADMIN)

export const canAccessFinanceQuotes = (subject: FinanceQuotationAccessSubject) =>
  hasAuthorizedView(subject, QUOTES_VIEW_CODE) ?? financeSurfaceFallback(subject)

export const canManageFinanceQuotes = (subject: FinanceQuotationAccessSubject) =>
  canAccessFinanceQuotes(subject)

export const canDecideFinanceQuotationApproval = (subject: FinanceQuotationAccessSubject) =>
  hasRole(subject, ROLE_CODES.EFEONCE_ADMIN) || hasRole(subject, ROLE_CODES.FINANCE_ADMIN)

export const isEditableFinanceQuotationStatus = (status: FinanceQuotationStatus) =>
  status === 'draft' || status === 'approval_rejected'

export const isIssueableFinanceQuotationStatus = isEditableFinanceQuotationStatus

export const isIssuedFinanceQuotationStatus = (status: FinanceQuotationStatus) =>
  status === 'issued' || status === 'sent' || status === 'approved'
