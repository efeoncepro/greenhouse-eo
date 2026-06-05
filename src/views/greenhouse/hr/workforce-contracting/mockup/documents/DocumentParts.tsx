import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import { DOC_MOCKUP_COPY, MOCK_EMPLOYER, MOCK_WORKER } from './document-mock-data'
import type { MockDocSection } from './document-mock-data'

const BODY_FONT = 'var(--font-geist), Geist, system-ui, sans-serif'
const DISPLAY_FONT = 'Poppins, var(--font-poppins), sans-serif'
// Decorative handwriting font for the mockup pre-stamped signature only. The real
// PDF embeds the legal-representative signature PNG (@/lib/legal-signatures), not a font.
const SIGNATURE_FONT = '"Brush Script MT", "Segoe Script", cursive'

// ── Prevalence banner ─────────────────────────────────────────────────────────
export const PrevalenceBanner = ({ variant }: { variant: 'es' | 'en' }) => {
  const isEs = variant === 'es'

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 0.5,
        mb: 3,
        borderRadius: 0.75,
        borderLeft: theme => `3px solid ${isEs ? '#2E7D32' : theme.palette.divider}`,
        bgcolor: theme => (isEs ? 'rgba(46,125,50,0.06)' : theme.palette.action.hover)
      }}
    >
      <i
        className={isEs ? 'tabler-shield-check' : 'tabler-language'}
        style={{ fontSize: 14, color: isEs ? '#2E7D32' : 'var(--mui-palette-text-secondary)' }}
      />
      <Typography
        sx={{
          fontFamily: BODY_FONT,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: isEs ? '#2E7D32' : 'text.secondary'
        }}
      >
        {isEs ? DOC_MOCKUP_COPY.prevalentBannerEs : DOC_MOCKUP_COPY.referenceBannerEn}
      </Typography>
    </Box>
  )
}

// ── Document title ────────────────────────────────────────────────────────────
export const DocumentTitle = ({ children, place }: { children: string; place?: string }) => (
  <Box sx={{ mb: 3.5 }}>
    <Typography
      component='h1'
      sx={{
        fontFamily: DISPLAY_FONT,
        fontWeight: 700,
        fontSize: 21,
        lineHeight: 1.2,
        color: 'text.primary',
        textTransform: 'uppercase',
        letterSpacing: 0.3
      }}
    >
      {children}
    </Typography>
    {place ? (
      <Typography sx={{ fontFamily: BODY_FONT, fontSize: 11, color: 'text.secondary', mt: 0.75 }}>{place}</Typography>
    ) : null}
  </Box>
)

// ── Clause / section renderer ─────────────────────────────────────────────────
export const ClauseSection = ({ section }: { section: MockDocSection }) => (
  <Box sx={{ mb: 2.75, breakInside: 'avoid' }}>
    {(section.ordinal || section.heading) && (
      <Typography
        sx={{
          fontFamily: DISPLAY_FONT,
          fontWeight: 600,
          fontSize: 12.5,
          color: 'text.primary',
          mb: 0.75
        }}
      >
        {section.ordinal ? (
          <Box component='span' sx={{ color: '#2E7D32', letterSpacing: 0.5 }}>
            {section.ordinal}
            {section.heading ? '. ' : ''}
          </Box>
        ) : null}
        {section.heading}
      </Typography>
    )}
    {section.paragraphs.map((p, idx) => (
      <Typography
        key={idx}
        sx={{
          fontFamily: BODY_FONT,
          fontSize: 11,
          lineHeight: 1.65,
          color: 'text.primary',
          textAlign: 'justify',
          mb: idx < section.paragraphs.length - 1 ? 1 : 0
        }}
      >
        {p}
      </Typography>
    ))}
  </Box>
)

// ── Signature block (3 columns: empleador pre-estampado · trabajador · ministro) ─
const SignatureColumn = ({
  label,
  name,
  role,
  preStamped,
  signLabel
}: {
  label: string
  name?: string
  role?: string
  preStamped?: boolean
  signLabel?: string
}) => (
  <Box sx={{ flex: 1, textAlign: 'center', px: 1 }}>
    {/* signature area (reserved height for vertical symmetry across columns) */}
    <Box
      sx={{
        height: 46,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        pb: 0.5
      }}
    >
      {preStamped ? (
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            sx={{
              fontFamily: SIGNATURE_FONT,
              fontSize: 24,
              lineHeight: 1,
              color: 'text.primary',
              transform: 'rotate(-3deg)'
            }}
          >
            {name}
          </Typography>
          <Typography sx={{ fontFamily: BODY_FONT, fontSize: 8, color: '#2E7D32', mt: 0.25 }}>
            <i className='tabler-circle-check-filled' style={{ fontSize: 9, verticalAlign: 'middle' }} />{' '}
            {DOC_MOCKUP_COPY.preStamped}
          </Typography>
        </Box>
      ) : (
        <Typography sx={{ fontFamily: BODY_FONT, fontSize: 8.5, color: 'text.disabled' }}>{signLabel}</Typography>
      )}
    </Box>
    <Box sx={{ borderTop: theme => `1px solid ${theme.palette.text.primary}`, pt: 0.75 }}>
      <Typography sx={{ fontFamily: BODY_FONT, fontSize: 10.5, fontWeight: 600, color: 'text.primary' }}>
        {name || ' '}
      </Typography>
      <Typography sx={{ fontFamily: BODY_FONT, fontSize: 9.5, color: 'text.secondary' }}>{label}</Typography>
      {role ? (
        <Typography sx={{ fontFamily: BODY_FONT, fontSize: 9, color: 'text.disabled' }}>{role}</Typography>
      ) : null}
    </Box>
  </Box>
)

export const SignatureBlock = ({ withWitness = true }: { withWitness?: boolean }) => (
  <Box sx={{ display: 'flex', gap: 2, mt: 6, pt: 1 }}>
    <SignatureColumn
      label={DOC_MOCKUP_COPY.signatureEmployer}
      name={MOCK_EMPLOYER.representativeName}
      role={DOC_MOCKUP_COPY.representativeRole}
      preStamped
    />
    <SignatureColumn
      label={DOC_MOCKUP_COPY.signatureWorker}
      name={MOCK_WORKER.fullName}
      signLabel={DOC_MOCKUP_COPY.signHerePlaceholder}
    />
    {withWitness ? (
      <SignatureColumn label={DOC_MOCKUP_COPY.signatureWitness} signLabel='—' />
    ) : null}
  </Box>
)
