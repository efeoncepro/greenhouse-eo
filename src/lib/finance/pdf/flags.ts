import 'server-only'

import type { RenderQuotationPdfInput } from './contracts'

/**
 * TASK-629 — Decide which conditional sections of the PDF render.
 *
 * Decision 17 (RESEARCH-005 v1.4): single template with conditional sections,
 * NOT multi-template explicit. Sections activate based on data presence +
 * size thresholds. Threshold is configurable via env var without redeploy.
 */
export interface QuotationPdfFlags {
  showExecutiveSummary: boolean
  showAboutEfeonce: boolean
  showInvestmentTimeline: boolean
}

const DEFAULT_ENTERPRISE_THRESHOLD_CLP = 50_000_000

const getEnterpriseThresholdClp = (): number => {
  const raw = process.env.GREENHOUSE_PDF_ENTERPRISE_THRESHOLD_CLP

  if (!raw) return DEFAULT_ENTERPRISE_THRESHOLD_CLP

  const parsed = Number(raw)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ENTERPRISE_THRESHOLD_CLP
}

export const computePdfFlags = (input: RenderQuotationPdfInput): QuotationPdfFlags => {
  const totalInClp = input.totalInClp
    ?? (input.currency.toUpperCase() === 'CLP' ? input.totals.total : 0)

  const isEnterprise = input.forceEnterpriseTemplate === true
    || totalInClp > getEnterpriseThresholdClp()

  const hasLongDescription = (input.description?.length ?? 0) >= 200
  const hasMilestones = (input.milestones?.length ?? 0) > 0

  return {
    showExecutiveSummary: hasLongDescription || isEnterprise,
    showAboutEfeonce: isEnterprise,
    showInvestmentTimeline: hasMilestones
  }
}

/**
 * Computes the total page count given the active flags. Used by the page
 * footer to render "Page N of M" with a correct M.
 */
export const computeTotalPages = (flags: QuotationPdfFlags): number => {
  // Always: Cover (1) + Scope of Work (2) + Commercial Proposal (3) +
  // Terms (4) + Signatures (5) = 5 base pages
  let total = 5

  if (flags.showExecutiveSummary) total++
  if (flags.showAboutEfeonce) total++
  if (flags.showInvestmentTimeline) total++

  return total
}

/**
 * Resolves the page number for each section dynamically based on which
 * conditional sections are active. Returned object maps section key →
 * page number for the footer.
 */
export interface SectionPageMap {
  cover: number
  executiveSummary: number | null
  aboutEfeonce: number | null
  scopeOfWork: number
  commercialProposal: number
  investmentTimeline: number | null
  terms: number
  signatures: number
}

export const computeSectionPageMap = (flags: QuotationPdfFlags): SectionPageMap => {
  let page = 1

  const map: SectionPageMap = {
    cover: page++,
    executiveSummary: null,
    aboutEfeonce: null,
    scopeOfWork: 0,
    commercialProposal: 0,
    investmentTimeline: null,
    terms: 0,
    signatures: 0
  }

  if (flags.showExecutiveSummary) map.executiveSummary = page++
  if (flags.showAboutEfeonce) map.aboutEfeonce = page++

  map.scopeOfWork = page++
  map.commercialProposal = page++

  if (flags.showInvestmentTimeline) map.investmentTimeline = page++

  map.terms = page++
  map.signatures = page++

  return map
}
