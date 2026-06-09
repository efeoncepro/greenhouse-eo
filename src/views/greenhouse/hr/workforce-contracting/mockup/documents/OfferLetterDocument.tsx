import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import DocumentPaper from './DocumentPaper'
import { ClauseSection, DocumentTitle, PrevalenceBanner } from './DocumentParts'
import { DOC_MOCKUP_COPY, MOCK_OFFER, MOCK_PLACE_DATE_ES, MOCK_PLACE_DATE_EN, MOCK_WORKER } from './document-mock-data'
import type { DocLanguage } from './document-mock-data'

const BODY_FONT = 'var(--font-geist), Geist, system-ui, sans-serif'
const DISPLAY_FONT = 'Poppins, var(--font-poppins), sans-serif'

// ── Terms summary card (offer termscard) ──────────────────────────────────────
const TermsCard = ({ lang }: { lang: DocLanguage }) => (
  <Box
    sx={{
      my: 3,
      p: 2.5,
      borderRadius: 1.5,
      border: theme => `1px solid ${theme.palette.divider}`,
      bgcolor: theme => theme.palette.action.hover
    }}
  >
    <Typography
      sx={{
        fontFamily: DISPLAY_FONT,
        fontWeight: 600,
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: '#2E7D32',
        mb: 1.5
      }}
    >
      {lang === 'es-CL' ? DOC_MOCKUP_COPY.termsTitle : 'Offer summary'}
    </Typography>
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 3, rowGap: 1.25 }}>
      {MOCK_OFFER.terms.map(term => (
        <Box key={term.code}>
          <Typography
            sx={{
              fontFamily: BODY_FONT,
              fontSize: 9,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.4,
              color: 'text.secondary'
            }}
          >
            {lang === 'es-CL' ? term.labelEs : term.labelEn}
          </Typography>
          <Typography
            sx={{ fontFamily: BODY_FONT, fontSize: 11.5, fontWeight: 500, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}
          >
            {term.value}
          </Typography>
        </Box>
      ))}
    </Box>
  </Box>
)

const AcceptanceSignature = ({ lang }: { lang: DocLanguage }) => (
  <Box sx={{ mt: 5, display: 'flex', justifyContent: 'flex-start' }}>
    <Box sx={{ width: 240, textAlign: 'center' }}>
      <Box sx={{ height: 38 }} />
      <Box sx={{ borderTop: theme => `1px solid ${theme.palette.text.primary}`, pt: 0.75 }}>
        <Typography sx={{ fontFamily: BODY_FONT, fontSize: 10.5, fontWeight: 600, color: 'text.primary' }}>
          {MOCK_WORKER.fullName}
        </Typography>
        <Typography sx={{ fontFamily: BODY_FONT, fontSize: 9.5, color: 'text.secondary' }}>
          {lang === 'es-CL' ? 'Acepto la oferta · firma vía ZapSign' : 'I accept the offer · signature via ZapSign'}
        </Typography>
      </Box>
    </Box>
  </Box>
)

const OfferBody = ({
  lang,
  page,
  pageCount,
  draft
}: {
  lang: DocLanguage
  page: number
  pageCount: number
  draft: boolean
}) => {
  const doc = MOCK_OFFER.localized[lang]
  const placeDate = lang === 'es-CL' ? MOCK_PLACE_DATE_ES : MOCK_PLACE_DATE_EN

  return (
    <DocumentPaper pageNumber={page} pageCount={pageCount} draft={draft}>
      <PrevalenceBanner variant={lang === 'es-CL' ? 'es' : 'en'} />
      <Typography sx={{ fontFamily: BODY_FONT, fontSize: 11, color: 'text.secondary', mb: 2 }}>{placeDate}</Typography>
      <DocumentTitle>{doc.title}</DocumentTitle>

      {/* salutation */}
      <ClauseSection section={doc.sections[0]} />
      {/* terms card */}
      <TermsCard lang={lang} />
      {/* remaining sections */}
      {doc.sections.slice(1).map(section => (
        <ClauseSection key={section.sectionCode} section={section} />
      ))}

      <AcceptanceSignature lang={lang} />
    </DocumentPaper>
  )
}

/** O1 — Carta ejecutiva, bilingüe secuencial (ES prevalente, luego espejo EN). */
const OfferLetterDocument = ({ draft = true }: { draft?: boolean }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <OfferBody lang='es-CL' page={1} pageCount={2} draft={draft} />
    <OfferBody lang='en-US' page={2} pageCount={2} draft={draft} />
  </Box>
)

export default OfferLetterDocument
