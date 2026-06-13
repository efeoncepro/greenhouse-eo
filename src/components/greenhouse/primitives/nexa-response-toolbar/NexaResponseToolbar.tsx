'use client'

import { useEffect, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { SxProps, Theme } from '@mui/material/styles'

import GreenhouseButton from '../GreenhouseButton'
import { resolveNexaResponseToolbarVariant } from './nexa-response-toolbar-controller'
import type {
  NexaResponseToolbarLabels,
  NexaResponseToolbarProps,
  NexaResponseToolbarVariant
} from './nexa-response-toolbar-types'

const DEFAULT_LABELS: NexaResponseToolbarLabels = {
  helpfulPrompt: '¿Te sirvió esta respuesta?',
  helpfulYesLabel: 'Sí, me sirvió',
  helpfulNoLabel: 'No me sirvió',
  helpfulThanksLabel: '¡Gracias por tu feedback!',
  copyLabel: 'Copiar',
  copiedLabel: 'Copiado',
  shareLabel: 'Compartir',
  regenerateLabel: 'Regenerar'
}

interface VariantConfig {
  /** Muestra el prompt "¿Te sirvió?" (embedded/docked) vs solo los íconos (floating). */
  showPrompt: boolean
  /** Botones solo-ícono (floating) vs ícono + texto (embedded/docked). */
  iconOnly: boolean
  containerSx: SxProps<Theme>
}

const VARIANT_CONFIG: Record<NexaResponseToolbarVariant, VariantConfig> = {
  embedded: {
    showPrompt: true,
    iconOnly: false,
    containerSx: theme => ({
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing(1.5),
      pt: 2,
      borderTop: `1px solid ${theme.palette.divider}`
    })
  },
  floating: {
    showPrompt: false,
    iconOnly: true,
    containerSx: theme => ({
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: theme.spacing(0.5)
    })
  },
  docked: {
    showPrompt: true,
    iconOnly: false,
    containerSx: theme => ({
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing(1.5),
      px: { xs: 3, md: 4 },
      py: 2,
      borderTop: `1px solid ${theme.palette.divider}`,
      backgroundColor: theme.palette.background.paper
    })
  }
}

const ToolbarButton = ({
  iconClassName,
  label,
  iconOnly,
  dataCapture,
  onClick
}: {
  iconClassName: string
  label: string
  iconOnly: boolean
  dataCapture: string
  onClick: () => void
}) => (
  <GreenhouseButton
    variant='text'
    tone='secondary'
    size='small'
    leadingIconClassName={iconClassName}
    aria-label={label}
    dataCapture={dataCapture}
    onClick={onClick}
  >
    {iconOnly ? null : label}
  </GreenhouseButton>
)

/**
 * Response toolbar canónica de Nexa. 3 variants: `embedded` (en-flow del answer) / `floating` (anclada
 * a un mensaje, solo-ícono) / `docked` (barra fija de surface). El feedback colapsa a un acuse tras votar
 * (como AI Overview); `copy` resuelve el portapapeles self-contained (estado optimista). reduced-motion
 * horneado en GreenhouseButton.
 */
const NexaResponseToolbar = ({ variant, kind, plainText, onControl, labels: labelOverrides }: NexaResponseToolbarProps) => {
  const resolvedVariant = resolveNexaResponseToolbarVariant({ kind, variant })
  const config = VARIANT_CONFIG[resolvedVariant]
  // Ignora overrides `undefined` (el consumer puede pasar copy opcional) → no pisa los defaults.
  const definedOverrides = Object.fromEntries(Object.entries(labelOverrides ?? {}).filter(([, value]) => value != null))
  const labels: NexaResponseToolbarLabels = { ...DEFAULT_LABELS, ...definedOverrides }

  const [feedback, setFeedback] = useState<'helpful' | 'unhelpful' | null>(null)
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
    },
    []
  )

  const handleCopy = () => {
    // Optimista (state-design): en headless/GVC el clipboard puede estar restringido; mostramos
    // "Copiado" igual y emitimos el control. El write real va best-effort.
    void navigator.clipboard?.writeText?.(plainText).catch(() => undefined)
    setCopied(true)
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(false), 1800)
    onControl('copy')
  }

  const handleFeedback = (value: 'helpful' | 'unhelpful') => {
    setFeedback(value)
    onControl(value)
  }

  return (
    <Stack
      direction='row'
      data-capture='nexa-response-toolbar'
      data-variant={resolvedVariant}
      flexWrap='wrap'
      useFlexGap
      sx={config.containerSx}
    >
      {feedback ? (
        <Stack direction='row' spacing={0.75} alignItems='center' data-capture='nexa-response-toolbar-feedback-ack'>
          <Box
            component='i'
            className='tabler-circle-check'
            aria-hidden
            sx={theme => ({ fontSize: 18, color: theme.greenhouseSemantic.success.tonalText })}
          />
          <Typography variant='caption' sx={theme => ({ color: theme.greenhouseSemantic.success.tonalText, fontWeight: 600 })}>
            {labels.helpfulThanksLabel}
          </Typography>
        </Stack>
      ) : (
        <Stack direction='row' spacing={config.iconOnly ? 0.25 : 0.5} alignItems='center' flexWrap='wrap' useFlexGap data-capture='nexa-response-toolbar-feedback'>
          {config.showPrompt ? (
            <Typography variant='caption' color='text.secondary' sx={{ mr: 0.5 }}>
              {labels.helpfulPrompt}
            </Typography>
          ) : null}
          <ToolbarButton
            iconClassName='tabler-thumb-up'
            label={labels.helpfulYesLabel}
            iconOnly={config.iconOnly}
            dataCapture='nexa-response-toolbar-helpful'
            onClick={() => handleFeedback('helpful')}
          />
          <ToolbarButton
            iconClassName='tabler-thumb-down'
            label={labels.helpfulNoLabel}
            iconOnly={config.iconOnly}
            dataCapture='nexa-response-toolbar-unhelpful'
            onClick={() => handleFeedback('unhelpful')}
          />
        </Stack>
      )}

      <Stack direction='row' spacing={0.25} alignItems='center' flexWrap='wrap' useFlexGap>
        <ToolbarButton
          iconClassName={copied ? 'tabler-check' : 'tabler-copy'}
          label={copied ? labels.copiedLabel : labels.copyLabel}
          iconOnly={config.iconOnly}
          dataCapture='nexa-response-toolbar-copy'
          onClick={handleCopy}
        />
        <ToolbarButton
          iconClassName='tabler-share-3'
          label={labels.shareLabel}
          iconOnly={config.iconOnly}
          dataCapture='nexa-response-toolbar-share'
          onClick={() => onControl('share')}
        />
        <ToolbarButton
          iconClassName='tabler-refresh'
          label={labels.regenerateLabel}
          iconOnly={config.iconOnly}
          dataCapture='nexa-response-toolbar-regenerate'
          onClick={() => onControl('regenerate')}
        />
      </Stack>
    </Stack>
  )
}

export default NexaResponseToolbar
