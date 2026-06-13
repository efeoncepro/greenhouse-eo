'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { alpha, useTheme, type Theme } from '@mui/material/styles'
import { visuallyHidden } from '@mui/utils'

import GreenhouseThinkingBeat from '../GreenhouseThinkingBeat'
import NexaEvidencePanel from '../NexaEvidencePanel'
import NexaExpressiveText from '../nexa-expressive-text/NexaExpressiveText'
import { resolveNexaProvenanceTraceVariant } from './nexa-provenance-trace-controller'
import type {
  NexaProvenanceProofTab,
  NexaProvenanceProofTabBuiltin,
  NexaProvenanceStep,
  NexaProvenanceTone,
  NexaProvenanceTraceProps,
  NexaProvenanceTrustCue
} from './nexa-provenance-trace-types'
import type { ConversationalEvidencePacket } from '@/lib/nexa/conversational-evidence'

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

/** Empty honesto de un tab cuando aún no hay packet de evidencia (state-design). */
const ProofTabEmpty = () => (
  <Stack spacing={1} alignItems='center' sx={{ py: 6 }} data-capture='nexa-provenance-proof-empty'>
    <Box component='i' className='tabler-file-search' aria-hidden sx={{ fontSize: 28, color: 'text.disabled' }} />
    <Typography variant='body2' color='text.secondary'>
      Sin evidencia disponible todavía.
    </Typography>
  </Stack>
)

/**
 * Built-in `packet`: los campos crudos del `nexa-evidence.v1` (transparencia/debug). Packet-driven,
 * cero acoplamiento a dominio. Reproduce la vista "packet" del answer-trace.
 */
const ProofPacketView = ({ evidence }: { evidence: ConversationalEvidencePacket }) => {
  const theme = useTheme()

  const rows: { label: string; value: string }[] = [
    { label: 'contractVersion', value: evidence.sourceContractVersion },
    { label: 'confidence', value: evidence.confidence },
    { label: 'freshness', value: evidence.freshness },
    { label: 'sources', value: String(evidence.citedDocumentCount) },
    { label: 'filtered', value: String(evidence.deniedOrFilteredCount) },
    { label: 'maxScore', value: evidence.maxScore == null ? 'null' : evidence.maxScore.toFixed(2) }
  ]

  return (
    <Stack spacing={2} data-capture='nexa-provenance-proof-packet'>
      {rows.map(row => (
        <Stack
          key={row.label}
          direction='row'
          spacing={3}
          justifyContent='space-between'
          sx={{ py: 2, borderBlockEnd: `1px solid ${theme.palette.divider}` }}
        >
          <Typography variant='caption' color='text.secondary'>
            {row.label}
          </Typography>
          <Typography variant='body2' sx={{ overflowWrap: 'anywhere', textAlign: 'end' }}>
            {row.value}
          </Typography>
        </Stack>
      ))}
    </Stack>
  )
}

/** Renderiza un built-in transversal (packet-driven). NUNCA lee data fuera del packet. */
const renderBuiltinProofTab = (
  builtin: NexaProvenanceProofTabBuiltin,
  evidence: ConversationalEvidencePacket | undefined,
  feedbackEnabled: boolean
) => {
  if (!evidence) return <ProofTabEmpty />

  if (builtin === 'packet') return <ProofPacketView evidence={evidence} />

  // `sources` y `trace` componen el panel de evidencia compartido; `sources` habilita el feedback.
  return <NexaEvidencePanel evidence={evidence} variant='proofPanel' feedbackEnabled={builtin === 'sources' && feedbackEnabled} />
}

/**
 * `panel` TABBED: Box bordeado + título + TabList + content del tab activo. La primitive es dueña del
 * chrome (a11y/teclado/ARIA) y de los renderers built-in (packet-driven, transversales); el dominio
 * entra por el `content` slot de un tab. El estado del tab activo es interno (default primer tab).
 */
const ProofTabbedPanel = ({
  tabs,
  evidence,
  panelTitle,
  tabsAriaLabel,
  feedbackEnabled
}: {
  tabs: NexaProvenanceProofTab[]
  evidence?: ConversationalEvidencePacket
  panelTitle?: string
  tabsAriaLabel?: string
  feedbackEnabled: boolean
}) => {
  const theme = useTheme()
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id)
  const activeTab = tabs.find(tab => tab.id === activeTabId) ?? tabs[0]

  return (
    <Box
      data-capture='nexa-provenance-proof-tabbed'
      sx={{
        minInlineSize: 0,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        backgroundColor: theme.palette.background.paper,
        boxShadow: theme.greenhouseElevation.floating.boxShadow,
        overflow: 'hidden'
      }}
    >
      <Box
        sx={{
          px: { xs: 4, md: 5 },
          py: 3,
          minBlockSize: 56,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          gap: 3
        }}
      >
        {panelTitle ? <Typography variant='h5'>{panelTitle}</Typography> : null}
        <Tabs
          value={activeTab?.id}
          onChange={(_, value: string) => setActiveTabId(value)}
          aria-label={tabsAriaLabel}
          variant='scrollable'
          allowScrollButtonsMobile
          sx={{ minBlockSize: 36, '& .MuiTab-root': { minBlockSize: 36, minInlineSize: 72 } }}
        >
          {tabs.map(tab => (
            <Tab key={tab.id} value={tab.id} label={tab.label} />
          ))}
        </Tabs>
      </Box>
      <Divider />
      <Box sx={{ px: { xs: 4, md: 5 }, py: 2 }}>
        {activeTab?.builtin ? renderBuiltinProofTab(activeTab.builtin, evidence, feedbackEnabled) : (activeTab?.content ?? null)}
      </Box>
    </Box>
  )
}

/**
 * Grounding canónico de Nexa. 3 variants: `inline` (trust cue) · `expandable` (razonamiento) ·
 * `panel` (evidencia bajo demanda, compone NexaEvidencePanel; `tabs` lo vuelve tabbed). El `kind`
 * resuelve a un variant. Transversal — domain-agnóstico (Knowledge = primer consumer).
 */
const NexaProvenanceTrace = ({
  variant,
  kind,
  trustCue,
  steps,
  showFootprint = false,
  evidence,
  panelId,
  open = true,
  tabs,
  panelTitle,
  tabsAriaLabel,
  feedbackEnabled = false
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
          {tabs && tabs.length > 0 ? (
            <ProofTabbedPanel
              tabs={tabs}
              evidence={evidence}
              panelTitle={panelTitle}
              tabsAriaLabel={tabsAriaLabel}
              feedbackEnabled={feedbackEnabled}
            />
          ) : evidence ? (
            <NexaEvidencePanel evidence={evidence} variant='proofPanel' feedbackEnabled={feedbackEnabled} />
          ) : null}
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
