'use client'

import Box from '@mui/material/Box'
import Collapse from '@mui/material/Collapse'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme, type Theme } from '@mui/material/styles'
import { visuallyHidden } from '@mui/utils'

import GreenhouseThinkingBeat from '../GreenhouseThinkingBeat'
import NexaEvidencePanel from '../NexaEvidencePanel'
import NexaExpressiveText from '../nexa-expressive-text/NexaExpressiveText'
import { resolveNexaProvenanceTraceVariant } from './nexa-provenance-trace-controller'
import type {
  NexaProvenanceStep,
  NexaProvenanceTone,
  NexaProvenanceTraceProps,
  NexaProvenanceTrustCue
} from './nexa-provenance-trace-types'

const toneIconClass: Record<NexaProvenanceTone, string> = {
  success: 'tabler-circle-check-filled',
  warning: 'tabler-alert-triangle',
  info: 'tabler-sparkles'
}

const toneInk = (theme: Theme, tone: NexaProvenanceTone): string =>
  tone === 'success'
    ? theme.greenhouseSemantic.success.tonalText
    : tone === 'warning'
      ? theme.greenhouseSemantic.warning.tonalText
      : theme.palette.info.main

// ── inline ───────────────────────────────────────────────────────────────────
// Trust cue compacto: el grounding asienta la confianza en una línea, sin robar protagonismo a la
// respuesta (modern-ui: restraint). Ícono tonal + label (énfasis) + detail (secundario).
const InlineTrustCue = ({ trustCue }: { trustCue: NexaProvenanceTrustCue }) => {
  const theme = useTheme()
  const ink = toneInk(theme, trustCue.tone)

  return (
    <Stack
      direction='row'
      spacing={1.25}
      alignItems='center'
      flexWrap='wrap'
      useFlexGap
      data-capture='nexa-provenance-trace-inline'
      role='status'
    >
      <Box component='i' className={toneIconClass[trustCue.tone]} aria-hidden sx={{ color: ink, fontSize: 18, flex: '0 0 auto' }} />
      <NexaExpressiveText value={trustCue.label} variant='caption' sx={{ color: ink, fontWeight: 600 }} />
      {trustCue.detail ? (
        <NexaExpressiveText value={trustCue.detail} variant='caption' color='text.secondary' />
      ) : null}
    </Stack>
  )
}

// ── expandable ─────────────────────────────────────────────────────────────────
// Footprint shimmer: ocupa el lugar donde aterrizará la respuesta mientras Nexa razona. Decorativo →
// reduced-motion lo deja estático. (Fiel al render del canvas para migración byte-idéntica.)
const FootprintShimmer = () => {
  const theme = useTheme()

  const sweep = `linear-gradient(100deg, ${alpha(theme.palette.primary.main, 0.05)} 30%, ${alpha(
    theme.palette.primary.main,
    0.13
  )} 50%, ${alpha(theme.palette.primary.main, 0.05)} 70%)`

  const bar = (inlineSize: string, blockSize = 12) => ({
    inlineSize,
    blockSize,
    borderRadius: `${theme.shape.customBorderRadius.xs}px`,
    background: sweep,
    backgroundSize: '220% 100%',
    '@keyframes nexa-provenance-shimmer': {
      '0%': { backgroundPosition: '180% 0' },
      '100%': { backgroundPosition: '-80% 0' }
    },
    animation: 'nexa-provenance-shimmer 1.5s linear infinite',
    '@media (prefers-reduced-motion: reduce)': { animation: 'none', backgroundPosition: '50% 0' }
  })

  return (
    <Box
      aria-hidden='true'
      data-capture='nexa-provenance-trace-footprint'
      sx={{
        ml: { xs: 1.5, md: 2 },
        border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
        borderRadius: `${theme.shape.customBorderRadius.lg}px ${theme.shape.customBorderRadius.lg}px ${theme.shape.customBorderRadius.lg}px ${theme.shape.customBorderRadius.xs}px`,
        backgroundColor: theme.palette.background.paper,
        px: { xs: 4, md: 5 },
        py: { xs: 4, md: 4.5 }
      }}
    >
      <Stack spacing={2.25}>
        <Box sx={bar('38%', 14)} />
        <Box sx={bar('92%')} />
        <Box sx={bar('80%')} />
        <Box sx={{ ...bar('100%', 120), mt: 1 }} />
      </Stack>
    </Box>
  )
}

// Razonamiento progresivo (estilo AI Overview): pasos que avanzan — done ✓ / active (beat) / pending.
// El paso activo se anuncia por un único live region.
const ReasoningSteps = ({ steps, showFootprint }: { steps: NexaProvenanceStep[]; showFootprint: boolean }) => {
  const theme = useTheme()
  const activeStep = steps.find(step => step.status === 'active') ?? steps[steps.length - 1]

  return (
    <Stack spacing={3} data-capture='nexa-provenance-trace-expandable'>
      <Stack spacing={1.5} role='status' aria-live='polite'>
        {steps.map(step => {
          const done = step.status === 'done'
          const active = step.status === 'active'

          return (
            <Stack key={step.id} direction='row' spacing={1.5} alignItems='center' sx={{ minInlineSize: 0 }}>
              <Box sx={{ inlineSize: 20, display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
                {done ? (
                  <Box component='i' className='tabler-circle-check-filled' sx={{ color: theme.greenhouseSemantic.success.tonalText, fontSize: 18 }} />
                ) : active ? (
                  <GreenhouseThinkingBeat kind='nexa' variant='inline' motion='wave' dotCount={3} dotSize={5} />
                ) : (
                  <Box sx={{ inlineSize: 8, blockSize: 8, borderRadius: '50%', border: `1.5px solid ${alpha(theme.palette.text.disabled, 0.5)}` }} />
                )}
              </Box>
              <Typography
                variant='body2'
                sx={{
                  color: active ? 'text.primary' : 'text.secondary',
                  fontWeight: active ? 600 : 400,
                  opacity: step.status === 'pending' ? 0.6 : 1,
                  transition: theme.transitions.create(['opacity', 'color'], { duration: theme.transitions.duration.shorter })
                }}
              >
                {step.label}
              </Typography>
            </Stack>
          )
        })}
        <Box component='span' data-gvc-ignore-layout='true' sx={visuallyHidden}>
          {activeStep?.label}
        </Box>
      </Stack>
      {showFootprint ? <FootprintShimmer /> : null}
    </Stack>
  )
}

/**
 * Grounding canónico de Nexa. 3 variants: `inline` (trust cue) · `expandable` (razonamiento) ·
 * `panel` (evidencia bajo demanda, compone NexaEvidencePanel). El `kind` resuelve a un variant.
 * Transversal — domain-agnóstico (Knowledge = primer consumer).
 */
const NexaProvenanceTrace = ({
  variant,
  kind,
  trustCue,
  steps,
  showFootprint = false,
  evidence,
  panelId,
  open = true
}: NexaProvenanceTraceProps) => {
  const resolvedVariant = resolveNexaProvenanceTraceVariant({ kind, variant })

  if (resolvedVariant === 'expandable') {
    return steps && steps.length > 0 ? (
      <Box data-capture='nexa-provenance-trace' data-variant='expandable'>
        <ReasoningSteps steps={steps} showFootprint={showFootprint} />
      </Box>
    ) : null
  }

  if (resolvedVariant === 'panel') {
    return (
      <Collapse in={open} timeout={300} mountOnEnter unmountOnExit>
        <Box id={panelId} data-capture='nexa-provenance-trace' data-variant='panel'>
          {evidence ? <NexaEvidencePanel evidence={evidence} variant='proofPanel' feedbackEnabled={false} /> : null}
        </Box>
      </Collapse>
    )
  }

  // inline
  return trustCue ? (
    <Box data-capture='nexa-provenance-trace' data-variant='inline'>
      <InlineTrustCue trustCue={trustCue} />
    </Box>
  ) : null
}

export default NexaProvenanceTrace
