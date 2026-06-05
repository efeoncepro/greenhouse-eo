import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import EfeonceSlogan from '@/components/greenhouse/brand/EfeonceSlogan'
import { EFEONCE_LEGAL_ADDRESS_FALLBACK, EFEONCE_LEGAL_NAME_FALLBACK, EFEONCE_URL } from '@/config/efeonce-brand'
import { DOC_MOCKUP_COPY, MOCK_EMPLOYER } from './document-mock-data'

interface DocumentPaperProps {
  children: ReactNode
  /** Show the diagonal "PROYECTO" watermark (draft state). */
  draft?: boolean
  /** 1-based page index shown in the footer. */
  pageNumber?: number
  pageCount?: number
}

const PAPER_BODY_FONT = 'var(--font-geist), Geist, system-ui, sans-serif'
const DISPLAY_FONT = 'Poppins, var(--font-poppins), sans-serif'

/**
 * A4-proportioned "paper" shell for the signable document mockup. Institutional
 * Efeonce branding: logo + subordinated slogan masthead, optional draft watermark,
 * and the canonical institutional footer (entity · RUT + address · URL · page).
 */
const DocumentPaper = ({ children, draft = true, pageNumber = 1, pageCount = 1 }: DocumentPaperProps) => (
  <Box
    sx={{
      position: 'relative',
      width: '100%',
      maxWidth: 820,
      minHeight: 1060,
      mx: 'auto',
      bgcolor: 'background.paper',
      color: 'text.primary',
      border: theme => `1px solid ${theme.palette.divider}`,
      borderRadius: 1,
      boxShadow: theme => theme.shadows[2],
      px: { xs: 4, md: 9 },
      py: { xs: 5, md: 8 },
      fontFamily: PAPER_BODY_FONT,
      overflow: 'hidden'
    }}
  >
    {/* Draft watermark */}
    {draft && (
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 0
        }}
      >
        <Typography
          sx={{
            fontFamily: DISPLAY_FONT,
            fontWeight: 800,
            fontSize: 120,
            letterSpacing: 12,
            color: theme => theme.palette.warning.main,
            opacity: 0.1,
            transform: 'rotate(-32deg)',
            userSelect: 'none',
            whiteSpace: 'nowrap'
          }}
        >
          {DOC_MOCKUP_COPY.watermarkDraft}
        </Typography>
      </Box>
    )}

    {/* Content above the watermark */}
    <Box sx={{ position: 'relative', zIndex: 1 }}>
      {/* Masthead — Efeonce institutional brand-zone */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 2,
          pb: 2.5,
          mb: 4,
          borderBottom: theme => `2px solid ${theme.palette.text.primary}`
        }}
      >
        <Box
          component='img'
          src='/branding/logo-full.svg'
          alt={EFEONCE_LEGAL_NAME_FALLBACK}
          sx={{ height: 30, width: 'auto' }}
        />
        <EfeonceSlogan fontSize='0.78rem' />
      </Box>

      {children}

      {/* Institutional footer */}
      <Box
        sx={{
          mt: 6,
          pt: 2,
          borderTop: theme => `1px solid ${theme.palette.divider}`,
          textAlign: 'center'
        }}
      >
        <Typography
          sx={{ fontFamily: PAPER_BODY_FONT, fontSize: 9.5, color: 'text.secondary', lineHeight: 1.5 }}
        >
          {MOCK_EMPLOYER.legalName} · RUT {MOCK_EMPLOYER.taxId} · {EFEONCE_LEGAL_ADDRESS_FALLBACK}
        </Typography>
        <Typography
          sx={{ fontFamily: PAPER_BODY_FONT, fontSize: 9.5, color: 'text.disabled', lineHeight: 1.5, mt: 0.25 }}
        >
          {EFEONCE_URL} · Página {pageNumber} de {pageCount}
        </Typography>
      </Box>
    </Box>
  </Box>
)

export default DocumentPaper
