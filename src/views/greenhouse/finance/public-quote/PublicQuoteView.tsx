import {
  formatCurrency,
  formatDateDMY,
  formatQuantity,
  formatRate
} from '@/lib/finance/pdf/formatters'
import { SUB_BRAND_ASSETS } from '@/lib/finance/pdf/tokens'

import { PublicQuoteAcceptForm } from './PublicQuoteAcceptForm'
import { PublicQuoteInteractions } from './PublicQuoteInteractions'
import styles from './styles.module.css'

import type { PublicQuoteViewModel } from '@/lib/finance/quote-share/load-quote-for-public-view'

/**
 * TASK-631 — Public Quote Web View.
 *
 * Server component that renders the full quote in a sharable web format.
 * Mirrors the PDF structure but with:
 * - Responsive layout (mobile-first)
 * - Collapsible bundles + terms (interactive client island)
 * - Sticky header with progressive shadow
 * - Print stylesheet (degrades to printable doc on Ctrl+P)
 * - Dark mode via prefers-color-scheme
 * - Reduced motion respected
 *
 * Visual contract: docs/research/mockups/quote-shareable-web-mockup.html
 */
interface Props {
  view: PublicQuoteViewModel
  pdfDownloadUrl: string
  acceptUrl: string
  shortCode: string | null
}

const renderHtmlAsString = (html: string | null): string => {
  if (!html) return ''

  // Same whitelist as the PDF renderer — caller already sanitized via
  // sanitizeProductDescriptionHtml when writing to product_catalog.
  return html
}

export const PublicQuoteView = ({ view, pdfDownloadUrl, acceptUrl, shortCode }: Props) => {
  const subBrandAssets = SUB_BRAND_ASSETS[view.subBrand]
  const heroSubtitle = view.description?.slice(0, 320) ?? null

  // Inversión total + duración estimada (aproximación: número de meses
  // recurrentes via line items con unit "Mes" o duración del valid_until)
  const lineCountSummary = view.lineItems.length

  const monthsApprox = view.validUntil
    ? Math.max(1, Math.round(
        (new Date(view.validUntil).getTime() - new Date(view.quoteDate).getTime())
          / (1000 * 60 * 60 * 24 * 30)
      ))
    : 0

  return (
    <div className={styles.quoteRoot} data-sub-brand={view.subBrand}>
      <PublicQuoteInteractions />

      <article className={styles.quotePage}>
        {/* ── Sticky Header ── */}
        <header className={styles.header} data-quote-header data-scrolled='false'>
          <div className={styles.brand}>
            <img
              className={styles.brandLogo}
              src='/branding/logo-full.svg'
              alt='Efeonce Group'
            />
            {view.subBrand !== 'efeonce' ? (
              <>
                <div className={styles.headerDivider} />
                <div className={styles.subBrand}>
                  <img
                    className={styles.subIsotipo}
                    src={`/${subBrandAssets.isotipoPath}`}
                    alt={subBrandAssets.label}
                  />
                  <span className={styles.subLabel}>{subBrandAssets.label}</span>
                </div>
              </>
            ) : null}
          </div>
          <div className={styles.headerActions}>
            <span className={styles.quoteId}>
              Propuesta <strong>{view.quotationNumber} v{view.versionNumber}</strong>
            </span>
            <span
              className={`${styles.statusBadge} ${
                view.acceptedAt
                  ? styles.statusBadgeAccepted
                  : view.isExpired
                    ? styles.statusBadgeExpired
                    : styles.statusBadgeActive
              }`}
            >
              {view.acceptedAt ? '✓ Aceptada' : view.isExpired ? '⚠ Vencida' : '✓ Vigente'}
            </span>
          </div>
        </header>

        {/* ── Hero ── */}
        <section className={styles.hero}>
          <p className={styles.heroEyebrow}>Propuesta Comercial</p>
          <h1 className={styles.heroTitle}>
            {view.description?.split(/[.!?]\s/)[0]?.slice(0, 100)?.trim() || 'Propuesta Comercial'}
          </h1>
          {heroSubtitle ? (
            <p className={styles.heroSubtitle}>{heroSubtitle}</p>
          ) : null}
          <div className={styles.heroParties}>
            <div className={styles.party}>
              <p className={styles.partyLabel}>Preparada para</p>
              <p className={styles.partyName}>
                {view.clientName ?? 'Sin cliente registrado'}
              </p>
              {view.organizationName && view.organizationName !== view.clientName ? (
                <p className={styles.partyDetail}>{view.organizationName}</p>
              ) : null}
            </div>
            <div className={styles.party}>
              <p className={styles.partyLabel}>Preparada por</p>
              <p className={styles.partyName}>{view.legalEntity.legalName}</p>
              <p className={styles.partyDetail}>RUT {view.legalEntity.taxId}</p>
              {view.legalEntity.website ? (
                <p className={styles.partyContact}>{view.legalEntity.website}</p>
              ) : null}
            </div>
          </div>
        </section>

        {/* ── Version warning ── */}
        {!view.isLatestVersion ? (
          <div className={styles.versionWarning}>
            <span aria-hidden='true' style={{ fontSize: 18 }}>ℹ</span>
            <span>
              Estás viendo la <strong>versión v{view.versionNumber}</strong> de esta cotización.
              Hay una versión más reciente (<strong>v{view.currentVersion}</strong>) — solicita el link actualizado a tu account lead.
            </span>
          </div>
        ) : null}

        {/* ── Validity callout ── */}
        {view.validUntil ? (
          <div className={styles.validityCallout}>
            <span aria-hidden='true' style={{ fontSize: 18 }}>⏱</span>
            <span>
              {view.isExpired
                ? <>Esta propuesta venció el <strong>{formatDateDMY(view.validUntil)}</strong>. Solicita una versión actualizada.</>
                : <>Esta propuesta es válida hasta el <strong>{formatDateDMY(view.validUntil)}</strong>. Después de esa fecha requiere re-validación.</>
              }
            </span>
          </div>
        ) : null}

        {/* ── Summary ── */}
        <section className={styles.section} id='summary'>
          <p className={styles.sectionEyebrow}>01 · Resumen</p>
          <h2 className={styles.sectionTitle}>Lo importante de un vistazo</h2>
          <p className={styles.sectionSubtitle}>
            Inversión total y composición del programa.
          </p>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <p className={styles.summaryCardLabel}>Inversión total</p>
              <p className={styles.summaryCardValue}>
                {formatCurrency(view.totals.total, view.currency)}
              </p>
              {view.totals.tax ? (
                <p className={styles.summaryCardHint}>
                  {view.totals.tax.label} {view.totals.tax.isExempt ? 'exento' : 'incluido'}
                </p>
              ) : null}
            </div>
            {monthsApprox > 0 ? (
              <div className={styles.summaryCard}>
                <p className={styles.summaryCardLabel}>Vigencia</p>
                <p className={styles.summaryCardValue}>{monthsApprox} {monthsApprox === 1 ? 'mes' : 'meses'}</p>
                <p className={styles.summaryCardHint}>Hasta {formatDateDMY(view.validUntil)}</p>
              </div>
            ) : null}
            <div className={styles.summaryCard}>
              <p className={styles.summaryCardLabel}>Líneas</p>
              <p className={styles.summaryCardValue}>{lineCountSummary}</p>
              <p className={styles.summaryCardHint}>
                {lineCountSummary === 1 ? 'servicio incluido' : 'servicios incluidos'}
              </p>
            </div>
            <div className={styles.summaryCard}>
              <p className={styles.summaryCardLabel}>Moneda</p>
              <p className={styles.summaryCardValue}>{view.currency}</p>
              <p className={styles.summaryCardHint}>Precios fijados al emitir</p>
            </div>
          </div>
        </section>

        {/* ── Scope of Work ── */}
        {view.lineItems.some(li => li.descriptionRichHtml || li.description) ? (
          <section className={styles.section} id='scope'>
            <p className={styles.sectionEyebrow}>02 · Alcance del trabajo</p>
            <h2 className={styles.sectionTitle}>Servicios incluidos</h2>
            <p className={styles.sectionSubtitle}>
              Click cada servicio para ver el detalle completo.
            </p>
            {view.lineItems.map((line, idx) => {
              const hasRichHtml = Boolean(line.descriptionRichHtml)
              const hasDescription = Boolean(line.description)

              if (!hasRichHtml && !hasDescription) return null

              const isFirst = idx === 0

              return (
                <article
                  key={`${line.label}-${idx}`}
                  className={styles.bundle}
                  data-bundle
                  data-open={isFirst ? 'true' : 'false'}
                >
                  <button
                    type='button'
                    className={styles.bundleHeader}
                    data-bundle-toggle
                    aria-expanded={isFirst}
                  >
                    <div>
                      <h3 className={styles.bundleTitle}>{line.label}</h3>
                      {line.productCode ? (
                        <p className={styles.bundleSku}>SKU {line.productCode}</p>
                      ) : null}
                    </div>
                    <span className={styles.bundleChip}>
                      {formatQuantity(line.quantity)} {line.unit}
                    </span>
                    <svg className={styles.chevron} viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
                      <path d='M5 8l5 5 5-5' />
                    </svg>
                  </button>
                  <div className={styles.bundleBody}>
                    <div className={styles.bundleBodyInner}>
                      {hasRichHtml ? (
                        <div
                          className={styles.bundleDescription}
                          dangerouslySetInnerHTML={{ __html: renderHtmlAsString(line.descriptionRichHtml) }}
                        />
                      ) : line.description ? (
                        <p className={styles.bundleDescription}>{line.description}</p>
                      ) : null}
                    </div>
                  </div>
                </article>
              )
            })}
          </section>
        ) : null}

        {/* ── Commercial Proposal (pricing table) ── */}
        <section className={styles.section} id='proposal'>
          <p className={styles.sectionEyebrow}>03 · Detalle comercial</p>
          <h2 className={styles.sectionTitle}>Pricing por línea</h2>
          <p className={styles.sectionSubtitle}>
            Precios en {view.currency}. {view.totals.tax ? `${view.totals.tax.label} aplicable.` : 'IVA según país de facturación.'}
          </p>
          <div className={styles.pricingWrapper}>
            <table className={styles.pricingTable}>
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th className={styles.numCol}>Cant.</th>
                  <th className={styles.centerCol}>Unidad</th>
                  <th className={styles.numCol}>Precio unit.</th>
                  <th className={styles.numCol}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {view.lineItems.map((line, idx) => (
                  <tr key={`row-${idx}`}>
                    <td>
                      <div className={styles.pricingRowLabel}>{line.label}</div>
                      {line.productCode || line.description ? (
                        <div className={styles.pricingRowHint}>
                          {line.productCode ?? ''}
                          {line.productCode && line.description ? ' · ' : ''}
                          {line.description ?? ''}
                        </div>
                      ) : null}
                    </td>
                    <td className={styles.numCol}>{formatQuantity(line.quantity)}</td>
                    <td className={styles.centerCol}>{line.unit || 'unit'}</td>
                    <td className={styles.numCol}>{formatCurrency(line.unitPrice, view.currency)}</td>
                    <td className={styles.numCol}>{formatCurrency(line.subtotalAfterDiscount, view.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.summaryBlock}>
            <div className={styles.summaryBlockRow}>
              <span className={styles.summaryBlockLabel}>Subtotal neto</span>
              <span className={styles.summaryBlockValue}>
                {formatCurrency(view.totals.subtotal, view.currency)}
              </span>
            </div>
            {view.totals.totalDiscount > 0 ? (
              <div className={styles.summaryBlockRow}>
                <span className={styles.summaryBlockLabel}>Descuento aplicado</span>
                <span className={styles.summaryBlockValue}>
                  — {formatCurrency(view.totals.totalDiscount, view.currency)}
                </span>
              </div>
            ) : null}
            {view.totals.tax ? (
              <div className={styles.summaryBlockRow}>
                <span className={styles.summaryBlockLabel}>{view.totals.tax.label}</span>
                <span className={styles.summaryBlockValue}>
                  {view.totals.tax.isExempt ? '—' : formatCurrency(view.totals.tax.amount, view.currency)}
                </span>
              </div>
            ) : null}
            <div className={`${styles.summaryBlockRow} ${styles.summaryBlockTotal}`}>
              <span className={styles.summaryBlockLabel}>Total</span>
              <span className={styles.summaryBlockValue}>
                {formatCurrency(view.totals.total, view.currency)}
              </span>
            </div>
          </div>
          {view.fxFooter ? (
            <div className={styles.fxNote}>
              <strong>Tipo de cambio aplicado: </strong>
              {view.fxFooter.baseCurrency} 1 = {view.fxFooter.outputCurrency} {formatRate(view.fxFooter.rate)}
              {view.fxFooter.rateDateResolved ? ` · fecha ${formatDateDMY(view.fxFooter.rateDateResolved)}` : ''}
              {view.fxFooter.source ? ` · fuente ${view.fxFooter.source}` : ''}
              {view.fxFooter.composedViaUsd ? ' · derivada vía USD' : ''}
            </div>
          ) : null}
        </section>

        {/* ── Terms acordeón ── */}
        {view.terms.length > 0 ? (
          <section className={styles.section} id='terms'>
            <p className={styles.sectionEyebrow}>04 · Términos y condiciones</p>
            <h2 className={styles.sectionTitle}>Marco contractual</h2>
            <p className={styles.sectionSubtitle}>
              Click cada término para expandir. El contrato formal se firma por separado.
            </p>
            <div className={styles.termsList}>
              {view.terms.map((term, idx) => {
                const slug = term.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

                return (
                  <article
                    key={`${term.title}-${idx}`}
                    className={styles.term}
                    data-term
                    data-open={false}
                    id={slug}
                  >
                    <button
                      type='button'
                      className={styles.termHeader}
                      data-term-toggle
                      aria-expanded='false'
                    >
                      <h3 className={styles.termTitle}>
                        {idx + 1}. {term.title}
                      </h3>
                      <svg className={styles.termChevron} viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth='2' aria-hidden='true'>
                        <path d='M5 8l5 5 5-5' />
                      </svg>
                    </button>
                    <div className={styles.termBody}>
                      <div className={styles.termBodyInner}>{term.bodyResolved}</div>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ) : null}

        {/* ── Actions ── */}
        <section className={styles.actions}>
          <a className={`${styles.btn} ${styles.btnOutlined}`} href={pdfDownloadUrl} download>
            📥 Descargar PDF
          </a>
          {view.isLatestVersion && !view.isExpired ? (
            <PublicQuoteAcceptForm
              acceptUrl={acceptUrl}
              shortCode={shortCode}
              initialAcceptedAt={view.acceptedAt}
              initialAcceptedByName={view.acceptedByName}
            />
          ) : view.acceptedAt && view.acceptedByName ? (
            <PublicQuoteAcceptForm
              acceptUrl={acceptUrl}
              shortCode={shortCode}
              initialAcceptedAt={view.acceptedAt}
              initialAcceptedByName={view.acceptedByName}
            />
          ) : null}
        </section>

        {/* ── Footer ── */}
        <footer className={styles.footer}>
          <p className={styles.footerLegal}>
            <strong>{view.legalEntity.legalName}</strong> · RUT {view.legalEntity.taxId}
            <br />
            {view.legalEntity.address}
            {view.legalEntity.website ? <> · {view.legalEntity.website}</> : null}
          </p>
          <p className={styles.footerLegal} style={{ marginTop: 12, opacity: 0.7 }}>
            Confidencial · No distribuir sin autorización
          </p>
          <span className={styles.footerVerify}>
            🔒 Documento auténtico · Verificado en línea
          </span>
        </footer>
      </article>
    </div>
  )
}
