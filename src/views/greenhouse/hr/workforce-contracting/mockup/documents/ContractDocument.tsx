import Box from '@mui/material/Box'

import DocumentPaper from './DocumentPaper'
import { ClauseSection, DocumentTitle, PrevalenceBanner, SignatureBlock } from './DocumentParts'
import { MOCK_CONTRACT, MOCK_PLACE_DATE_ES, MOCK_PLACE_DATE_EN } from './document-mock-data'
import type { DocLanguage } from './document-mock-data'

const ContractInstrument = ({
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
  const doc = MOCK_CONTRACT.localized[lang]
  const placeDate = lang === 'es-CL' ? MOCK_PLACE_DATE_ES : MOCK_PLACE_DATE_EN

  return (
    <DocumentPaper pageNumber={page} pageCount={pageCount} draft={draft}>
      <PrevalenceBanner variant={lang === 'es-CL' ? 'es' : 'en'} />
      <DocumentTitle place={placeDate}>{doc.title}</DocumentTitle>

      {doc.sections.map(section => (
        <ClauseSection key={section.sectionCode} section={section} />
      ))}

      <SignatureBlock withWitness />
    </DocumentPaper>
  )
}

/** C2 — Secuencial: instrumento es-CL prevalente + espejo en-US (un solo PDF firmado). */
const ContractDocument = ({ draft = true }: { draft?: boolean }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <ContractInstrument lang='es-CL' page={1} pageCount={2} draft={draft} />
    <ContractInstrument lang='en-US' page={2} pageCount={2} draft={draft} />
  </Box>
)

export default ContractDocument
