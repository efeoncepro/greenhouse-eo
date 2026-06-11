'use client'

import type { ReactElement } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'
import { typographyScale } from '@/components/theme/typography-tokens'
import NexaInsightsBlock, { type NexaInsightItem } from '@/components/greenhouse/NexaInsightsBlock'
import type { NexaTimelineItem } from '@/components/greenhouse/NexaInsightsTimeline'

import { DESIGN_SYSTEM_LAB_TOKENS } from './design-system-lab-tokens'

const InlineCode = ({ children }: { children: string }) => (
  <Box
    component='span'
    sx={theme => ({
      px: DESIGN_SYSTEM_LAB_TOKENS.spacing.tight,
      py: DESIGN_SYSTEM_LAB_TOKENS.spacing.hairline,
      borderRadius: `${theme.shape.customBorderRadius.sm}px`,
      color: theme.palette.text.primary,
      backgroundColor: alpha(theme.palette.text.primary, DESIGN_SYSTEM_LAB_TOKENS.opacity.codeBackground),
      ...typographyScale.labelSm,
      whiteSpace: 'nowrap'
    })}
  >
    {children}
  </Box>
)

// Mock data — vive solo en el lab; no es contrato. Cubre los tipos de señal + severidades.
const SPECIMEN_INSIGHTS: NexaInsightItem[] = [
  {
    id: 'EO-AIE-ds-ftr',
    signalId: 'EO-AIS-ds-ftr',
    signalType: 'anomaly',
    metricId: 'ftr_pct',
    severity: 'critical',
    explanation: 'Tu FTR% cayó a 44.6% en mayo (−50.6 pts vs abril): más piezas volvieron con cambios del cliente.',
    rootCauseNarrative:
      'El retrabajo se concentró en piezas que pasaron a revisión del cliente sin revisión interna previa.',
    recommendedAction: 'Suma una revisión interna antes de enviar al cliente.',
    lifecycle: [
      { generatedAt: '2026-05-04T09:00:00-04:00', severity: 'warning', currentValue: 78 },
      { generatedAt: '2026-05-18T09:00:00-04:00', severity: 'critical', currentValue: 44.6 }
    ]
  },
  {
    id: 'EO-AIE-ds-cycle',
    signalId: 'EO-AIS-ds-cycle',
    signalType: 'recommendation',
    metricId: 'cycle_time',
    severity: 'warning',
    explanation: 'Cada ronda de cambios alarga el cierre: el cycle time se mantuvo en 12.0 días pese a bajar el volumen.',
    rootCauseNarrative: null,
    recommendedAction: 'Cierra el brief con el cliente antes de producir para cortar las rondas de cambio.'
  },
  {
    id: 'EO-AIE-ds-throughput',
    signalId: 'EO-AIS-ds-throughput',
    signalType: 'prediction',
    metricId: 'throughput',
    severity: 'info',
    explanation: 'Tu ritmo de cierres se recuperó a 74 piezas (+12 vs abril). La tendencia vuelve a subir.',
    rootCauseNarrative: null,
    recommendedAction: null,
    lifecycleStatus: 'resolved'
  }
]

const SPECIMEN_TIMELINE: NexaTimelineItem[] = [
  {
    id: 'ds-t1',
    signalType: 'anomaly',
    metricId: 'ftr_pct',
    severity: 'critical',
    explanation: 'FTR% cayó a 44.6%.',
    rootCauseNarrative: null,
    recommendedAction: null,
    processedAt: '2026-06-10T09:00:00-04:00'
  },
  {
    id: 'ds-t2',
    signalType: 'recommendation',
    metricId: 'cycle_time',
    severity: 'warning',
    explanation: 'Cycle time estable en 12d.',
    rootCauseNarrative: null,
    recommendedAction: null,
    processedAt: '2026-06-09T09:00:00-04:00'
  }
]

type CompositionPiece = {
  title: string
  owner: string
  description: string
}

const COMPOSITION_PIECES: CompositionPiece[] = [
  {
    title: 'Disclosure (Nexa Mark morph)',
    owner: "GreenhouseDisclosureTrigger variant='nexaMark'",
    description:
      'El toggle que colapsa el panel: cerrado muestra el mark completo, abierto deja solo el spark. Idle gris → hover azul (contrato del primitive).'
  },
  {
    title: 'Rotating headline + Thinking beat',
    owner: 'RotatingNexaHeadline · GreenhouseThinkingBeat',
    description:
      'Nexa "narra en vivo": escribe la frase (typewriter + caret), la deja leer y al terminar aparece el thinking beat de 3 colores antes de pensar la próxima. 30 paráfrasis; algunas usan el nombre del usuario en sesión.'
  },
  {
    title: 'Segmented control (Recientes / Historial)',
    owner: 'ToggleButtonGroup + thumb deslizante',
    description:
      'Track neutro + thumb blanco (elevation raised) que desliza entre segmentos. Solo aparece cuando hay timeline. Texto/icono activo en primary.'
  },
  {
    title: 'Insight rows + drill',
    owner: 'InsightRow · NexaMentionText',
    description:
      'Filas conversacionales severity-led con causa raíz colapsable, acción sugerida y drill a /nexa/insights/[id]. Cap a 4 + "Ver más" + gateway al full list.'
  }
]

type StateSpecimen = {
  title: string
  description: string
  render: () => ReactElement
}

const STATE_SPECIMENS: StateSpecimen[] = [
  {
    title: 'Ready · empty-pending',
    description: 'Aún sin observaciones para el período (corrida ok, sin señales todavía).',
    render: () => (
      <NexaInsightsBlock
        insights={[]}
        totalAnalyzed={0}
        lastAnalysis={null}
        runStatus='succeeded'
        dataStatus='empty-pending'
      />
    )
  },
  {
    title: 'Empty-positive',
    description: 'El período cerró sin anomalías — buena señal, no un vacío.',
    render: () => (
      <NexaInsightsBlock
        insights={[]}
        totalAnalyzed={12}
        lastAnalysis='2026-06-10T09:45:00-04:00'
        runStatus='succeeded'
        dataStatus='empty-positive'
      />
    )
  },
  {
    title: 'Stale-degraded',
    description: 'El pipeline respondió lento o tuvo un fallo transitorio — degradación honesta.',
    render: () => (
      <NexaInsightsBlock
        insights={[]}
        totalAnalyzed={0}
        lastAnalysis='2026-06-08T09:45:00-04:00'
        runStatus='failed'
        dataStatus='stale-degraded'
      />
    )
  },
  {
    title: 'Loading',
    description: 'Fetch en curso — estado de carga canónico con aria-label.',
    render: () => (
      <NexaInsightsBlock insights={[]} totalAnalyzed={0} lastAnalysis={null} runStatus={null} dataStatus='loading' />
    )
  }
]

const NexaInsightsLabView = () => (
  <Box
    data-capture='nexa-insights-lab'
    sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: DESIGN_SYSTEM_LAB_TOKENS.layout.sectionGap,
      maxWidth: DESIGN_SYSTEM_LAB_TOKENS.layout.pageMaxInlineSize,
      mx: 'auto'
    }}
  >
    <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.layout.headerGap}>
      <AxisWordmark
        variant='auto'
        height={DESIGN_SYSTEM_LAB_TOKENS.layout.logoBlockSize}
        sx={{ mb: DESIGN_SYSTEM_LAB_TOKENS.spacing.hairline }}
      />
      <Typography variant='overline' color='primary'>
        Nexa Insights Pattern
      </Typography>
      <Typography variant='h4'>Nexa Insights</Typography>
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ maxWidth: DESIGN_SYSTEM_LAB_TOKENS.layout.introMaxInlineSize }}
      >
        El panel canónico donde Nexa lee un período y resalta lo que más mueve los resultados. Es un{' '}
        <strong>patrón compuesto</strong> (disclosure + rotating headline + thinking beat + segmented control + insight
        rows), hoy con una superficie canónica. Los <InlineCode>variant</InlineCode> /{' '}
        <InlineCode>kind</InlineCode> de dominio (member performance, space overview, finance…) se mapearán sobre esta
        base sin forkear superficies paralelas.
      </Typography>
    </Stack>

    {/* Live specimen — la superficie real, con rotación + nombre + timeline. */}
    <Box
      data-capture='nexa-insights-live-specimen'
      sx={theme => ({
        p: DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(
          theme.palette.primary.main,
          0.035
        )} 100%)`
      })}
    >
      <NexaInsightsBlock
        insights={SPECIMEN_INSIGHTS}
        totalAnalyzed={6}
        lastAnalysis='2026-06-10T09:45:00-04:00'
        runStatus='succeeded'
        dataStatus='ready'
        defaultExpanded
        mentionSafeMode
        viewerName='Daniela Ferreira'
        timelineInsights={SPECIMEN_TIMELINE}
      />
    </Box>

    {/* Composition — de qué primitives está hecho. */}
    <Box
      data-capture='nexa-insights-composition'
      sx={theme => ({
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        bgcolor: 'background.paper',
        overflow: 'hidden'
      })}
    >
      <Box
        sx={theme => ({
          px: DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup,
          py: DESIGN_SYSTEM_LAB_TOKENS.spacing.related,
          borderBlockEnd: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.text.primary, DESIGN_SYSTEM_LAB_TOKENS.opacity.subtleFill)
        })}
      >
        <Typography variant='h6'>Composición</Typography>
        <Typography variant='body2' color='text.secondary'>
          El patrón compone primitives gobernados; no reinventa motion, color ni tipografía.
        </Typography>
      </Box>
      {COMPOSITION_PIECES.map(piece => (
        <Box
          key={piece.title}
          sx={theme => ({
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(220px, 0.5fr) minmax(280px, 1fr)' },
            gap: { xs: DESIGN_SYSTEM_LAB_TOKENS.spacing.tight, md: DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup },
            px: DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup,
            py: DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup,
            borderBlockEnd: `1px solid ${theme.palette.divider}`,
            '&:last-of-type': { borderBlockEnd: 0 }
          })}
        >
          <Stack spacing={0.5}>
            <Typography variant='h6'>{piece.title}</Typography>
            <InlineCode>{piece.owner}</InlineCode>
          </Stack>
          <Typography variant='body2' color='text.secondary'>
            {piece.description}
          </Typography>
        </Box>
      ))}
    </Box>

    {/* States — honest degradation. */}
    <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.related}>
      <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
        <Typography variant='h6'>Estados</Typography>
        <Typography variant='body2' color='text.secondary'>
          El panel deriva su estado server-side (<InlineCode>dataStatus</InlineCode>) y degrada honesto: nunca pinta cero
          cuando la verdad es “no sé todavía”.
        </Typography>
      </Stack>
      <Box
        data-capture='nexa-insights-states'
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: DESIGN_SYSTEM_LAB_TOKENS.layout.gridGap
        }}
      >
        {STATE_SPECIMENS.map(specimen => (
          <Stack key={specimen.title} spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
            <Stack spacing={0.25}>
              <Typography variant='subtitle2'>{specimen.title}</Typography>
              <Typography variant='caption' color='text.secondary'>
                {specimen.description}
              </Typography>
            </Stack>
            {specimen.render()}
          </Stack>
        ))}
      </Box>
    </Stack>

    {/* Forward-compat — variants/kinds. */}
    <Box
      data-capture='nexa-insights-variants-note'
      sx={theme => ({
        p: DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset,
        border: `1px dashed ${theme.palette.divider}`,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        bgcolor: alpha(theme.palette.primary.main, 0.03)
      })}
    >
      <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
        <Typography variant='h6'>Variants &amp; kinds (próximo)</Typography>
        <Typography variant='body2' color='text.secondary'>
          Hoy hay una superficie canónica. El protocolo Primitive + Variants + Kinds se aplicará acá: los{' '}
          <InlineCode>kind</InlineCode> semánticos de dominio (member performance, space overview, finance dashboard,
          client portal) se mapearán a <InlineCode>variant</InlineCode> de comportamiento sobre esta misma base —
          NUNCA superficies paralelas. El <InlineCode>mentionSafeMode</InlineCode> (self vs observer) y{' '}
          <InlineCode>viewerName</InlineCode> ya son los primeros ejes de adaptación.
        </Typography>
      </Stack>
    </Box>
  </Box>
)

export default NexaInsightsLabView
