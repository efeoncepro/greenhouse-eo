import 'server-only'

export const APPROVAL_CONDITION_TYPES = [
  'margin_below_floor',
  'margin_below_target',
  'amount_above_threshold',
  'discount_above_threshold',
  'always'
] as const
export type ApprovalConditionType = (typeof APPROVAL_CONDITION_TYPES)[number]

export const APPROVAL_STEP_STATUSES = ['pending', 'approved', 'rejected', 'skipped'] as const
export type ApprovalStepStatus = (typeof APPROVAL_STEP_STATUSES)[number]

export const APPROVAL_REQUIRED_ROLES = ['finance', 'efeonce_admin'] as const
export type ApprovalRequiredRole = (typeof APPROVAL_REQUIRED_ROLES)[number]

export const TERM_CATEGORIES = ['payment', 'delivery', 'legal', 'staffing', 'sla', 'general'] as const
export type TermCategory = (typeof TERM_CATEGORIES)[number]

export const QUOTATION_PRICING_MODELS = ['staff_aug', 'retainer', 'project'] as const
export type QuotationPricingModel = (typeof QUOTATION_PRICING_MODELS)[number]

export const COMMERCIAL_MODELS = ['retainer', 'project', 'one_off'] as const
export type CommercialModel = (typeof COMMERCIAL_MODELS)[number]

export const STAFFING_MODELS = ['named_resources', 'outcome_based', 'hybrid'] as const
export type StaffingModel = (typeof STAFFING_MODELS)[number]

export const AUDIT_ACTIONS = [
  'created',
  'updated',
  'status_changed',
  'line_item_added',
  'line_item_updated',
  'line_item_removed',
  'discount_changed',
  'terms_changed',
  'version_created',
  'pdf_generated',
  'issue_requested',
  'issued',
  'sent',
  'approval_requested',
  'approval_decided',
  'approval_rejected',
  'po_received',
  'hes_received',
  'invoice_triggered',
  'renewal_generated',
  'expired',
  'template_used',
  'template_saved'
] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export interface ApprovalPolicy {
  policyId: string
  policyName: string
  businessLineCode: string | null
  pricingModel: QuotationPricingModel | null
  conditionType: ApprovalConditionType
  thresholdValue: number | null
  requiredRole: string
  stepOrder: number
  active: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface ApprovalStep {
  stepId: string
  quotationId: string
  versionNumber: number
  policyId: string | null
  stepOrder: number
  requiredRole: string
  assignedTo: string | null
  conditionLabel: string
  status: ApprovalStepStatus
  decidedBy: string | null
  decidedAt: string | null
  notes: string | null
  createdAt: string
}

export interface QuotationAuditEntry {
  logId: string
  quotationId: string
  versionNumber: number | null
  action: AuditAction
  actorUserId: string
  actorName: string
  details: Record<string, unknown>
  createdAt: string
}

export interface Term {
  termId: string
  termCode: string
  category: TermCategory
  title: string
  bodyTemplate: string
  appliesToModel: QuotationPricingModel | null
  defaultForBl: string[]
  required: boolean
  sortOrder: number
  active: boolean
  version: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface QuotationTerm {
  quotationTermId: string
  quotationId: string
  termId: string
  termCode: string | null
  title: string | null
  category: TermCategory | null
  bodyResolved: string
  sortOrder: number
  included: boolean
  required: boolean
  createdAt: string
  updatedAt: string
}

export interface QuoteTemplate {
  templateId: string
  templateName: string
  templateCode: string
  businessLineCode: string | null
  pricingModel: QuotationPricingModel
  defaultCurrency: string
  defaultBillingFrequency: string
  defaultPaymentTermsDays: number
  defaultContractDurationMonths: number | null
  defaultConditionsText: string | null
  defaultTermIds: string[]
  description: string | null
  active: boolean
  usageCount: number
  lastUsedAt: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface QuoteTemplateItem {
  templateItemId: string
  templateId: string
  productId: string | null
  lineType: 'person' | 'role' | 'deliverable' | 'direct_cost'
  label: string
  description: string | null
  roleCode: string | null
  suggestedHours: number | null
  unit: 'hour' | 'month' | 'unit' | 'project'
  quantity: number
  defaultMarginPct: number | null
  defaultUnitPrice: number | null
  sortOrder: number
}

export interface VersionDiffLineItem {
  label: string
  unitPrice: number | null
  quantity: number | null
  subtotalPrice: number | null
}

export interface VersionDiffChange {
  label: string
  field: string
  oldValue: string | number | null
  newValue: string | number | null
  deltaPct: number | null
}

export interface VersionDiff {
  added: VersionDiffLineItem[]
  removed: VersionDiffLineItem[]
  changed: VersionDiffChange[]
  impact: {
    previousTotal: number | null
    currentTotal: number | null
    totalDeltaPct: number | null
    previousMargin: number | null
    currentMargin: number | null
    marginDelta: number | null
  }
}

export interface VersionHistoryEntry {
  versionId: string
  versionNumber: number
  totalPrice: number | null
  totalCost: number | null
  totalDiscount: number | null
  effectiveMarginPct: number | null
  createdBy: string
  createdAt: string
  notes: string | null
  diffFromPrevious: VersionDiff | null
}
