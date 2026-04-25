import 'server-only'

import { Document } from '@react-pdf/renderer'

import { computePdfFlags, computeSectionPageMap, computeTotalPages } from './flags'
import { formatCurrency } from './formatters'
import { AboutEfeoncePage } from './sections/about-efeonce'
import { CommercialProposalPage } from './sections/commercial-proposal'
import { CoverPage } from './sections/cover'
import { ExecutiveSummaryPage } from './sections/executive-summary'
import { InvestmentTimelinePage } from './sections/investment-timeline'
import { ScopeOfWorkPage } from './sections/scope-of-work'
import { resolveLegalEntity } from './sections/shared'
import { SignaturesPage } from './sections/signatures'
import { TermsPage } from './sections/terms'

import type { RenderQuotationPdfInput } from './contracts'

interface QuotationPdfDocumentProps {
  input: RenderQuotationPdfInput
}

/**
 * TASK-629 — Enterprise PDF orchestrator.
 *
 * Composes the quotation PDF from 8 section components with conditional
 * rendering driven by `computePdfFlags()`. The contract of which sections
 * render when is documented in RESEARCH-005 v1.4 Delta.
 *
 * Always renders: Cover, Scope of Work, Commercial Proposal, Terms, Signatures.
 * Conditionally renders: Executive Summary, About Efeonce, Investment Timeline.
 *
 * Visual source of truth: `docs/research/mockups/quote-pdf-full-mockup.html`.
 */
export const QuotationPdfDocument = ({ input }: QuotationPdfDocumentProps) => {
  const flags = computePdfFlags(input)
  const totalPages = computeTotalPages(flags)
  const pageMap = computeSectionPageMap(flags)
  const legalEntity = resolveLegalEntity(input.legalEntity)
  const subBrand = input.subBrand ?? 'efeonce'

  // Hero title + subtitle derivation
  const heroTitle = input.description
    ? input.description.split(/[.!?]\s/)[0].slice(0, 90).trim() || 'Propuesta Comercial'
    : 'Propuesta Comercial'

  const heroSubtitle = input.heroSubtitle
    ?? (input.description ? input.description.slice(0, 280) : null)

  // Cover highlights — default to total + duration placeholder
  const defaultHighlights = [
    {
      label: 'Inversión total',
      value: formatCurrency(input.totals.total, input.currency),
      hint: input.totals.tax ? `${input.totals.tax.label} ${input.totals.tax.isExempt ? 'exento' : 'incluido'}` : null
    },
    ...(input.validUntil
      ? [{ label: 'Válida hasta', value: input.validUntil.slice(0, 10), hint: null as string | null }]
      : []),
    {
      label: 'Líneas',
      value: String(input.lineItems.length),
      hint: input.lineItems.length === 1 ? 'servicio' : 'servicios incluidos'
    }
  ]

  const coverHighlights = input.coverHighlights ?? defaultHighlights

  return (
    <Document
      title={`${input.quotationNumber} v${input.versionNumber}`}
      author={legalEntity.legalName}
      subject='Cotización'
      creator='Greenhouse EO'
      producer='Greenhouse EO'
    >
      <CoverPage
        quotationNumber={input.quotationNumber}
        versionNumber={input.versionNumber}
        quoteDate={input.quoteDate}
        validUntil={input.validUntil}
        clientName={input.clientName}
        organizationName={input.organizationName}
        heroTitle={heroTitle}
        heroSubtitle={heroSubtitle}
        subBrand={subBrand}
        salesRep={input.salesRep ?? null}
        legalEntity={legalEntity}
        highlights={coverHighlights}
        totalPages={totalPages}
      />

      {flags.showExecutiveSummary && pageMap.executiveSummary ? (
        <ExecutiveSummaryPage
          quotationNumber={input.quotationNumber}
          versionNumber={input.versionNumber}
          description={input.description ?? ''}
          kpis={[
            {
              label: 'Inversión',
              value: formatCurrency(input.totals.total, input.currency),
              sub: input.totals.tax?.label ?? null
            },
            {
              label: 'Ítems',
              value: String(input.lineItems.length),
              sub: null
            }
          ]}
          pageNumber={pageMap.executiveSummary}
          totalPages={totalPages}
          legalEntity={legalEntity}
        />
      ) : null}

      {flags.showAboutEfeonce && pageMap.aboutEfeonce ? (
        <AboutEfeoncePage
          quotationNumber={input.quotationNumber}
          versionNumber={input.versionNumber}
          activeSubBrand={subBrand}
          pageNumber={pageMap.aboutEfeonce}
          totalPages={totalPages}
          legalEntity={legalEntity}
        />
      ) : null}

      <ScopeOfWorkPage
        quotationNumber={input.quotationNumber}
        versionNumber={input.versionNumber}
        lineItems={input.lineItems}
        pageNumber={pageMap.scopeOfWork}
        totalPages={totalPages}
        legalEntity={legalEntity}
      />

      <CommercialProposalPage
        quotationNumber={input.quotationNumber}
        versionNumber={input.versionNumber}
        currency={input.currency}
        lineItems={input.lineItems}
        totals={input.totals}
        fxFooter={input.fxFooter ?? null}
        pageNumber={pageMap.commercialProposal}
        totalPages={totalPages}
        legalEntity={legalEntity}
      />

      {flags.showInvestmentTimeline && pageMap.investmentTimeline && input.milestones ? (
        <InvestmentTimelinePage
          quotationNumber={input.quotationNumber}
          versionNumber={input.versionNumber}
          milestones={input.milestones}
          paymentMethods={input.paymentMethods ?? null}
          intro={null}
          pageNumber={pageMap.investmentTimeline}
          totalPages={totalPages}
          legalEntity={legalEntity}
        />
      ) : null}

      <TermsPage
        quotationNumber={input.quotationNumber}
        versionNumber={input.versionNumber}
        terms={input.terms}
        pageNumber={pageMap.terms}
        totalPages={totalPages}
        legalEntity={legalEntity}
      />

      <SignaturesPage
        quotationNumber={input.quotationNumber}
        versionNumber={input.versionNumber}
        salesRepName={input.salesRep?.name ?? null}
        salesRepRole={input.salesRep?.role ?? null}
        verification={input.verification ?? null}
        pageNumber={pageMap.signatures}
        totalPages={totalPages}
        legalEntity={legalEntity}
      />
    </Document>
  )
}
