import 'server-only'

import { createElement } from 'react'

import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer'

import { GH_WORKFORCE_CONTRACTING } from '@/lib/copy/workforce-contracting'
import EfeoncePdfFooter from '@/lib/finance/pdf/efeonce-pdf-footer'
import EfeonceSloganPdf from '@/lib/finance/pdf/efeonce-slogan-pdf'
import { ensurePdfFontsRegistered } from '@/lib/finance/pdf/register-fonts'
import { resolveLegalRepresentativeSignaturePath } from '@/lib/legal-signatures'

import { axisSemanticSubValues } from '@/lib/design-tokens/semantic-sub-values'

import type {
  ContractingDocumentLanguage,
  ContractingPdfSnapshot,
  ContractingWatermark
} from './contracting-document-types'

const C = GH_WORKFORCE_CONTRACTING.document

// Approved standard tokens (TASK-1023 — Efeonce institutional document system).
// Success ink (AA on white): canonical token SoT (TASK-1048 → Fase B success.ink).
const ACCENT = axisSemanticSubValues.success.ink // single contrast-safe green accent
const INK = '#1A1A2E'
const MUTED = '#6B7280'
const FAINT = '#9AA0AC'
const RULE = '#E2E4E9'
const PANEL = '#F4F5F7'

const logoPath = `${process.cwd()}/public/branding/logo-full.png`

/** TASK-1023 — document template version. Bump on any layout change (drift + cache key). */
export const CONTRACTING_DOCUMENT_TEMPLATE_VERSION = 'contracting_document_pdf.v1'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Geist',
    fontSize: 9,
    lineHeight: 1.45,
    color: INK,
    backgroundColor: '#FFFFFF',
    paddingTop: 46,
    paddingBottom: 58,
    paddingHorizontal: 52
  },
  // Masthead — Efeonce brand-zone
  masthead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderBottomWidth: 1.5,
    borderBottomColor: INK,
    paddingBottom: 8,
    marginBottom: 16
  },
  logo: { height: 22, objectFit: 'contain' },
  // Prevalence banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 3,
    marginBottom: 12
  },
  bannerEs: { backgroundColor: 'rgba(46,125,50,0.07)', borderLeftWidth: 2.5, borderLeftColor: ACCENT },
  bannerEn: { backgroundColor: PANEL, borderLeftWidth: 2.5, borderLeftColor: RULE },
  bannerTextEs: { fontFamily: 'Geist Bold', fontSize: 7, color: ACCENT, letterSpacing: 0.4, textTransform: 'uppercase' },
  bannerTextEn: { fontFamily: 'Geist Bold', fontSize: 7, color: MUTED, letterSpacing: 0.4, textTransform: 'uppercase' },
  placeDate: { fontSize: 8.5, color: MUTED, marginBottom: 10 },
  title: {
    fontFamily: 'Poppins Bold',
    fontSize: 15,
    color: INK,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 14,
    lineHeight: 1.2
  },
  // Termscard (offer)
  termscard: { backgroundColor: PANEL, borderWidth: 1, borderColor: RULE, borderRadius: 5, padding: 11, marginVertical: 12 },
  termscardTitle: { fontFamily: 'Poppins', fontSize: 8.5, color: ACCENT, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  termsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  termCell: { width: '50%', marginBottom: 7, paddingRight: 8 },
  termLabel: { fontFamily: 'Geist Bold', fontSize: 6.5, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.3 },
  termValue: { fontFamily: 'Geist Medium', fontSize: 9, color: INK },
  // Clause / section
  section: { marginBottom: 9 },
  sectionHeading: { fontFamily: 'Poppins', fontSize: 9.5, color: INK, marginBottom: 4 },
  ordinal: { color: ACCENT, letterSpacing: 0.4 },
  paragraph: { fontSize: 9, lineHeight: 1.5, color: INK, textAlign: 'justify', marginBottom: 5 },
  // Signatures
  signatureRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30, gap: 14 },
  signatureColumn: { flex: 1, alignItems: 'center', paddingHorizontal: 6, position: 'relative' },
  signatureSpace: { height: 34, justifyContent: 'flex-end', alignItems: 'center' },
  signatureImage: { position: 'absolute', top: 0, left: '50%', marginLeft: -38, width: 76, height: 30, objectFit: 'contain' },
  signatureLine: { borderTopWidth: 1, borderTopColor: INK, paddingTop: 4, width: '100%', alignItems: 'center' },
  signatureName: { fontFamily: 'Geist Bold', fontSize: 8.5, color: INK, textAlign: 'center' },
  signatureLabel: { fontSize: 7.5, color: MUTED, textAlign: 'center' },
  signatureRole: { fontSize: 7, color: FAINT, textAlign: 'center' },
  preStamped: { fontSize: 6, color: ACCENT, textAlign: 'center', marginTop: 1 },
  signHint: { fontSize: 6.5, color: FAINT, textAlign: 'center' },
  offerSignatureWrap: { marginTop: 26, flexDirection: 'row' },
  offerSignatureColumn: { width: 200, alignItems: 'center' },
  // Watermark
  watermarkLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center'
  },
  watermarkText: {
    fontFamily: 'Poppins Black Italic',
    fontSize: 92,
    letterSpacing: 10,
    transform: 'rotate(-30deg)'
  },
  watermarkWarning: { color: 'rgba(247,144,9,0.10)' },
  watermarkError: { color: 'rgba(187,25,84,0.10)' },
  watermarkNeutral: { color: 'rgba(102,112,133,0.08)' }
})

// ── Watermark matrix per case status ──────────────────────────────────────────
const CLEAN_STATUSES = new Set(['fully_signed', 'registered_external', 'active', 'accepted', 'converted_to_contract'])
const VOIDED_STATUSES = new Set(['voided', 'withdrawn'])
const REJECTED_STATUSES = new Set(['rejected', 'signature_failed'])

export const resolveContractingWatermark = (documentStatus: string | null | undefined): ContractingWatermark | null => {
  if (!documentStatus || CLEAN_STATUSES.has(documentStatus)) return null
  if (VOIDED_STATUSES.has(documentStatus)) return { text: C.watermarkVoided, severity: 'error' }
  if (REJECTED_STATUSES.has(documentStatus)) return { text: C.watermarkRejected, severity: 'error' }
  if (documentStatus === 'expired') return { text: C.watermarkExpired, severity: 'error' }
  if (documentStatus === 'superseded') return { text: C.watermarkSuperseded, severity: 'neutral' }
  
return { text: C.watermarkProyecto, severity: 'warning' }
}

// ── Sub-components ────────────────────────────────────────────────────────────
const Watermark = ({ watermark }: { watermark: ContractingWatermark | null }) => {
  if (!watermark) return null

  const severityStyle =
    watermark.severity === 'error'
      ? styles.watermarkError
      : watermark.severity === 'neutral'
        ? styles.watermarkNeutral
        : styles.watermarkWarning

  return (
    <View style={styles.watermarkLayer} fixed>
      <Text style={[styles.watermarkText, severityStyle]}>{watermark.text}</Text>
    </View>
  )
}

const Masthead = () => (
  <View style={styles.masthead}>
    <Image src={logoPath} style={styles.logo} />
    <EfeonceSloganPdf fontSize={8} />
  </View>
)

const PrevalenceBanner = ({ lang }: { lang: ContractingDocumentLanguage }) => {
  const isEs = lang === 'es-CL'

  return (
    <View style={[styles.banner, isEs ? styles.bannerEs : styles.bannerEn]}>
      <Text style={isEs ? styles.bannerTextEs : styles.bannerTextEn}>
        {isEs ? C.prevalentBannerEs : C.referenceBannerEn}
      </Text>
    </View>
  )
}

const Footer = ({ snapshot }: { snapshot: ContractingPdfSnapshot }) => (
  <EfeoncePdfFooter
    operatingEntity={{
      legalName: snapshot.employer.legalName,
      taxId: snapshot.employer.taxId,
      legalAddress: snapshot.employer.legalAddress
    }}
    generatedAt={snapshot.generatedAt}
    fixed
  />
)

const TermsCard = ({ snapshot, lang }: { snapshot: ContractingPdfSnapshot; lang: ContractingDocumentLanguage }) => {
  if (snapshot.terms.length === 0) return null

  return (
    <View style={styles.termscard} wrap={false}>
      <Text style={styles.termscardTitle}>{lang === 'es-CL' ? C.termsTitleEs : C.termsTitleEn}</Text>
      <View style={styles.termsGrid}>
        {snapshot.terms.map(term => (
          <View key={term.code} style={styles.termCell}>
            <Text style={styles.termLabel}>{lang === 'es-CL' ? term.labelEs : term.labelEn}</Text>
            <Text style={styles.termValue}>{term.value}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const ClauseSection = ({ section }: { section: ContractingPdfSnapshot['localized']['es-CL']['sections'][number] }) => (
  <View style={styles.section} wrap={false}>
    {(section.ordinal || section.heading) && (
      <Text style={styles.sectionHeading}>
        {section.ordinal ? <Text style={styles.ordinal}>{section.ordinal}{section.heading ? '. ' : ''}</Text> : null}
        {section.heading}
      </Text>
    )}
    {section.paragraphs.map((p, idx) => (
      <Text key={idx} style={styles.paragraph}>
        {p}
      </Text>
    ))}
  </View>
)

const SignatureColumn = ({
  label,
  name,
  role,
  signaturePath,
  signHint
}: {
  label: string
  name?: string | null
  role?: string | null
  signaturePath?: string | null
  signHint?: string
}) => (
  <View style={styles.signatureColumn}>
    {signaturePath ? <Image src={signaturePath} style={styles.signatureImage} /> : null}
    <View style={styles.signatureSpace}>
      {signaturePath ? <Text style={styles.preStamped}>{C.preStamped}</Text> : <Text style={styles.signHint}>{signHint}</Text>}
    </View>
    <View style={styles.signatureLine}>
      <Text style={styles.signatureName}>{name || ' '}</Text>
      <Text style={styles.signatureLabel}>{label}</Text>
      {role ? <Text style={styles.signatureRole}>{role}</Text> : null}
    </View>
  </View>
)

const ContractSignatureBlock = ({
  snapshot,
  lang
}: {
  snapshot: ContractingPdfSnapshot
  lang: ContractingDocumentLanguage
}) => {
  const employerSignature = resolveLegalRepresentativeSignaturePath(snapshot.employer.legalRepresentativeSignaturePath)
  const signHint = lang === 'es-CL' ? C.signViaZapsignEs : C.signViaZapsignEn

  return (
    <View style={styles.signatureRow} wrap={false}>
      <SignatureColumn
        label={C.signatureEmployer}
        name={snapshot.employer.representativeName}
        role={C.representativeRole}
        signaturePath={employerSignature}
      />
      <SignatureColumn label={C.signatureWorker} name={snapshot.worker.fullName} signHint={signHint} />
      <SignatureColumn label={C.signatureWitness} signHint='—' />
    </View>
  )
}

const OfferAcceptanceSignature = ({
  snapshot,
  lang
}: {
  snapshot: ContractingPdfSnapshot
  lang: ContractingDocumentLanguage
}) => (
  <View style={styles.offerSignatureWrap} wrap={false}>
    <View style={styles.offerSignatureColumn}>
      <View style={styles.signatureSpace}>
        <Text style={styles.signHint}> </Text>
      </View>
      <View style={styles.signatureLine}>
        <Text style={styles.signatureName}>{snapshot.worker.fullName}</Text>
        <Text style={styles.signatureLabel}>{lang === 'es-CL' ? C.offerAcceptEs : C.offerAcceptEn}</Text>
      </View>
    </View>
  </View>
)

// ── Per-language instrument ───────────────────────────────────────────────────
const InstrumentPage = ({
  snapshot,
  lang,
  watermark
}: {
  snapshot: ContractingPdfSnapshot
  lang: ContractingDocumentLanguage
  watermark: ContractingWatermark | null
}) => {
  const doc = snapshot.localized[lang]
  const placeDate = lang === 'es-CL' ? snapshot.placeDateEs : snapshot.placeDateEn
  const isOffer = snapshot.caseKind === 'offer_letter'

  return (
    <Page size='LETTER' style={styles.page}>
      <Watermark watermark={watermark} />
      <Masthead />
      <PrevalenceBanner lang={lang} />
      {isOffer ? <Text style={styles.placeDate}>{placeDate}</Text> : null}
      <Text style={styles.title}>{doc.title}</Text>
      {!isOffer ? <Text style={styles.placeDate}>{placeDate}</Text> : null}

      {isOffer ? (
        <>
          {/* O1 — salutation, termscard, remaining sections, acceptance */}
          {doc.sections[0] ? <ClauseSection section={doc.sections[0]} /> : null}
          <TermsCard snapshot={snapshot} lang={lang} />
          {doc.sections.slice(1).map(section => (
            <ClauseSection key={section.sectionCode} section={section} />
          ))}
          <OfferAcceptanceSignature snapshot={snapshot} lang={lang} />
        </>
      ) : (
        <>
          {/* C2 — comparecencia + clauses + 3-col signature block */}
          {doc.sections.map(section => (
            <ClauseSection key={section.sectionCode} section={section} />
          ))}
          <ContractSignatureBlock snapshot={snapshot} lang={lang} />
        </>
      )}

      <Footer snapshot={snapshot} />
    </Page>
  )
}

const ContractingPdfDocument = ({
  snapshot,
  documentStatus
}: {
  snapshot: ContractingPdfSnapshot
  documentStatus: string | null
}) => {
  const watermark = resolveContractingWatermark(documentStatus)

  // Sequential bilingual: es-CL instrument (prevalent) first, then en-US mirror. One signed PDF.
  return (
    <Document>
      <InstrumentPage snapshot={snapshot} lang='es-CL' watermark={watermark} />
      <InstrumentPage snapshot={snapshot} lang='en-US' watermark={watermark} />
    </Document>
  )
}

/**
 * TASK-1023 — render the bilingual signable PDF (offer letter O1 / employment contract C2)
 * from an immutable snapshot. `documentStatus` drives the watermark (PROYECTO in draft →
 * clean when signed → ANULADO/RECHAZADO/etc on terminal). Mirror of the finiquito renderer.
 */
export const renderContractingDocumentPdf = async (
  snapshot: ContractingPdfSnapshot,
  options: { documentStatus?: string | null } = {}
): Promise<Buffer> => {
  await ensurePdfFontsRegistered()

  const element = createElement(ContractingPdfDocument, {
    snapshot,
    documentStatus: options.documentStatus ?? null
  })

  return renderToBuffer(element as unknown as Parameters<typeof renderToBuffer>[0])
}
