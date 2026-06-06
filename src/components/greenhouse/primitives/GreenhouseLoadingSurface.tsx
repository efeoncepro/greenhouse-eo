'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import { visuallyHidden } from '@mui/utils'

import useReducedMotion from '@/hooks/useReducedMotion'
import { motion } from '@/libs/FramerMotion'

export type GreenhouseLoadingSurfaceVariant =
  | 'pageSkeleton'
  | 'panelSkeleton'
  | 'tableSkeleton'
  | 'inlineAction'
  | 'brandSplash'
  | 'aiThinking'
  | 'progressRail'
  | 'documentPipeline'
  | 'externalHandoff'
  | 'secureAction'
  | 'uploadVerification'
  | 'reconciliationMatching'

export type GreenhouseLoadingSurfaceKind =
  | 'adminWorkbench'
  | 'sidecarPanel'
  | 'financeTable'
  | 'inlineSave'
  | 'workspaceBoot'
  | 'nexaReasoning'
  | 'runbookExecution'
  | 'documentGeneration'
  | 'providerHandoff'
  | 'auditAction'
  | 'assetVerification'
  | 'financeReconciliation'
  | (string & {})

export type GreenhouseLoadingStep = {
  label: string
  status?: 'done' | 'active' | 'pending'
}

export type GreenhouseLoadingSurfaceProps = {
  variant: GreenhouseLoadingSurfaceVariant
  kind?: GreenhouseLoadingSurfaceKind
  title?: string
  description?: string
  progress?: number
  steps?: GreenhouseLoadingStep[]
  rows?: number
  compact?: boolean
  minHeight?: number | string
  dataCapture?: string
}

export type GreenhouseNamedLoadingSurfaceProps = Omit<GreenhouseLoadingSurfaceProps, 'variant'>

const DEFAULT_TITLE: Record<GreenhouseLoadingSurfaceVariant, string> = {
  pageSkeleton: 'Cargando vista',
  panelSkeleton: 'Cargando panel',
  tableSkeleton: 'Cargando registros',
  inlineAction: 'Procesando',
  brandSplash: 'Preparando workspace',
  aiThinking: 'Nexa esta pensando',
  progressRail: 'Ejecutando pasos',
  documentPipeline: 'Preparando documento',
  externalHandoff: 'Coordinando proveedor',
  secureAction: 'Validando accion segura',
  uploadVerification: 'Verificando archivo',
  reconciliationMatching: 'Comparando movimientos'
}

const DEFAULT_DESCRIPTION: Record<GreenhouseLoadingSurfaceVariant, string> = {
  pageSkeleton: 'Reservando la estructura para que el contenido aparezca sin saltos.',
  panelSkeleton: 'Hidratando contexto y acciones del panel.',
  tableSkeleton: 'Organizando filas, filtros y estados de comparacion.',
  inlineAction: 'La accion sigue en curso.',
  brandSplash: 'Estamos conectando tu sesion con el portal.',
  aiThinking: 'Analizando senales, evidencia y contexto disponible.',
  progressRail: 'Avanzando por checkpoints verificables.',
  documentPipeline: 'Renderizando, validando y preparando el artefacto final.',
  externalHandoff: 'Preparando payload, enviando la solicitud y esperando confirmacion externa.',
  secureAction: 'Confirmando permisos, audit trail e idempotencia antes de continuar.',
  uploadVerification: 'Subiendo, inspeccionando y asociando evidencia al caso correcto.',
  reconciliationMatching: 'Evaluando candidatos, confianza y trazabilidad antes de conciliar.'
}

const MotionShell = ({ reduced, children }: { reduced: boolean; children: ReactNode }) => {
  if (reduced) return <>{children}</>

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

const Rail = ({ width = '100%', height = 10, delay = 0 }: { width?: number | string; height?: number; delay?: number }) => (
  <Box
    aria-hidden='true'
    sx={theme => ({
      position: 'relative',
      overflow: 'hidden',
      width,
      height,
      borderRadius: 999,
      backgroundColor: alpha(theme.palette.text.primary, 0.07),
      '&::after': {
        content: '""',
        position: 'absolute',
        inset: 0,
        transform: 'translateX(-100%)',
        background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.primary.main, 0.22)}, transparent)`,
        animation: `gh-loading-scan 1550ms ease-in-out ${delay}ms infinite`
      },
      '@media (prefers-reduced-motion: reduce)': {
        '&::after': { animation: 'none', transform: 'translateX(0)', opacity: 0.35 }
      },
      '@keyframes gh-loading-scan': {
        '0%': { transform: 'translateX(-100%)' },
        '55%': { transform: 'translateX(100%)' },
        '100%': { transform: 'translateX(100%)' }
      }
    })}
  />
)

const WeaveBlock = ({ height = 120, emphasis = false }: { height?: number; emphasis?: boolean }) => (
  <Box
    aria-hidden='true'
    sx={theme => ({
      position: 'relative',
      overflow: 'hidden',
      height,
      borderRadius: 2,
      border: `1px solid ${alpha(theme.palette.primary.main, emphasis ? 0.24 : 0.14)}`,
      backgroundColor: alpha(theme.palette.background.paper, 0.78),
      backgroundImage: `
        linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.11)} 1px, transparent 1px),
        linear-gradient(0deg, ${alpha(theme.palette.text.primary, 0.055)} 1px, transparent 1px),
        linear-gradient(135deg, ${alpha(theme.palette.primary.main, emphasis ? 0.16 : 0.08)}, transparent 48%)
      `,
      backgroundSize: '34px 34px, 34px 34px, 100% 100%',
      '&::before': {
        content: '""',
        position: 'absolute',
        insetBlock: 0,
        inlineSize: '42%',
        transform: 'translateX(-70%) skewX(-12deg)',
        background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.common.white, 0.42)}, transparent)`,
        animation: 'gh-loading-weave 2200ms ease-in-out infinite'
      },
      '&::after': {
        content: '""',
        position: 'absolute',
        insetInline: 18,
        insetBlockEnd: 18,
        blockSize: 3,
        borderRadius: 999,
        background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.info.main}, ${theme.palette.success.main})`,
        opacity: emphasis ? 0.95 : 0.55,
        animation: 'gh-loading-meter 1800ms ease-in-out infinite'
      },
      '@media (prefers-reduced-motion: reduce)': {
        '&::before, &::after': { animation: 'none' }
      },
      '@keyframes gh-loading-weave': {
        '0%': { transform: 'translateX(-70%) skewX(-12deg)' },
        '45%': { transform: 'translateX(190%) skewX(-12deg)' },
        '100%': { transform: 'translateX(190%) skewX(-12deg)' }
      },
      '@keyframes gh-loading-meter': {
        '0%, 100%': { transform: 'scaleX(0.36)', transformOrigin: 'left center' },
        '55%': { transform: 'scaleX(0.82)', transformOrigin: 'left center' }
      }
    })}
  />
)

const StatusRoot = ({
  title,
  description,
  minHeight,
  dataCapture,
  children
}: {
  title: string
  description: string
  minHeight?: number | string
  dataCapture?: string
  children: ReactNode
}) => (
  <Box
    role='status'
    aria-busy='true'
    aria-live='polite'
    aria-label={`${title}. ${description}`}
    data-capture={dataCapture}
    sx={{ minHeight }}
  >
    {children}
  </Box>
)

const PageSkeleton = ({ compact }: { compact?: boolean }) => (
  <Stack spacing={compact ? 2 : 3}>
    <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={2.5}>
          <Rail width={120} height={24} />
          <Rail width='42%' height={30} delay={80} />
          <Rail width='74%' height={12} delay={160} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
            <Rail width={132} height={36} delay={220} />
            <Rail width={172} height={36} delay={280} />
          </Stack>
          <WeaveBlock height={compact ? 112 : 158} emphasis />
        </Stack>
      </CardContent>
    </Card>
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' } }}>
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
          <CardContent>
            <Stack spacing={1.5}>
              <Rail width='48%' height={12} delay={index * 90} />
              <Rail width='72%' height={28} delay={index * 110} />
              <Rail width='88%' height={10} delay={index * 130} />
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Box>
  </Stack>
)

const PanelSkeleton = () => (
  <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
    <CardContent>
      <Stack spacing={2.5}>
        <Stack direction='row' spacing={2} alignItems='center'>
          <WeaveBlock height={44} />
          <Stack spacing={1} sx={{ flex: 1 }}>
            <Rail width='38%' height={18} />
            <Rail width='64%' height={10} delay={80} />
          </Stack>
        </Stack>
        <WeaveBlock height={140} emphasis />
        <Stack spacing={1.25}>
          <Rail width='92%' delay={120} />
          <Rail width='76%' delay={180} />
          <Rail width='84%' delay={240} />
        </Stack>
      </Stack>
    </CardContent>
  </Card>
)

const TableSkeleton = ({ rows = 6 }: { rows?: number }) => (
  <Card elevation={0} sx={{ border: 1, borderColor: 'divider', overflow: 'hidden' }}>
    <CardContent sx={{ pb: 1.5 }}>
      <Stack spacing={2.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' spacing={2}>
          <Stack spacing={1} sx={{ flex: 1 }}>
            <Rail width='34%' height={20} />
            <Rail width='54%' height={10} delay={80} />
          </Stack>
          <Stack direction='row' spacing={1}>
            <Rail width={92} height={32} delay={120} />
            <Rail width={124} height={32} delay={180} />
          </Stack>
        </Stack>
        <Stack spacing={0}>
          {Array.from({ length: rows }).map((_, index) => (
            <Box
              key={index}
              sx={theme => ({
                display: 'grid',
                gridTemplateColumns: { xs: '1.4fr 0.8fr', md: '1.6fr 1fr 0.8fr 0.6fr' },
                gap: 2,
                alignItems: 'center',
                py: 1.35,
                borderBlockStart: `1px solid ${alpha(theme.palette.divider, index === 0 ? 0 : 1)}`
              })}
            >
              <Rail width='88%' height={14} delay={index * 60} />
              <Rail width='72%' height={14} delay={index * 70} />
              <Rail width='64%' height={24} delay={index * 80} />
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <Rail width='80%' height={14} delay={index * 90} />
              </Box>
            </Box>
          ))}
        </Stack>
      </Stack>
    </CardContent>
  </Card>
)

const InlineAction = ({ title }: { title: string }) => (
  <Box
    sx={theme => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: 1,
      px: 1.5,
      py: 0.875,
      minHeight: 36,
      borderRadius: 1.5,
      border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
      backgroundColor: alpha(theme.palette.primary.main, 0.08),
      color: 'primary.main'
    })}
  >
    <Box
      aria-hidden='true'
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 4px)',
        gap: 0.5,
        '& span': {
          width: 4,
          height: 14,
          borderRadius: 999,
          bgcolor: 'currentColor',
          animation: 'gh-inline-bars 900ms ease-in-out infinite'
        },
        '& span:nth-of-type(2)': { animationDelay: '120ms' },
        '& span:nth-of-type(3)': { animationDelay: '240ms' },
        '@media (prefers-reduced-motion: reduce)': {
          '& span': { animation: 'none', opacity: 0.7 }
        },
        '@keyframes gh-inline-bars': {
          '0%, 100%': { transform: 'scaleY(0.45)', opacity: 0.45 },
          '50%': { transform: 'scaleY(1)', opacity: 1 }
        }
      }}
    >
      <span />
      <span />
      <span />
    </Box>
    <Typography variant='body2' sx={{ fontWeight: 700 }}>
      {title}
    </Typography>
  </Box>
)

const BrandSplash = ({ title, description }: { title: string; description: string }) => (
  <Card
    elevation={0}
    sx={theme => ({
      position: 'relative',
      overflow: 'hidden',
      border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.14)}, ${alpha(theme.palette.background.paper, 0.96)} 42%, ${alpha(theme.palette.secondary.main, 0.12)})`
    })}
  >
    <CardContent sx={{ minHeight: 260, display: 'grid', placeItems: 'center', p: 4 }}>
      <Stack spacing={2.5} alignItems='center' sx={{ textAlign: 'center', maxWidth: 420 }}>
        <Box
          sx={theme => ({
            position: 'relative',
            display: 'grid',
            placeItems: 'center',
            width: 86,
            height: 86,
            borderRadius: 3,
            backgroundColor: theme.palette.primary.main,
            boxShadow: `0 18px 46px ${alpha(theme.palette.primary.main, 0.28)}`,
            '&::before, &::after': {
              content: '""',
              position: 'absolute',
              inset: -10,
              borderRadius: 4,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.28)}`,
              animation: 'gh-brand-frame 2100ms ease-in-out infinite'
            },
            '&::after': { inset: -18, animationDelay: '260ms', opacity: 0.5 },
            '@media (prefers-reduced-motion: reduce)': {
              '&::before, &::after': { animation: 'none' }
            },
            '@keyframes gh-brand-frame': {
              '0%, 100%': { transform: 'scale(0.94)', opacity: 0.42 },
              '50%': { transform: 'scale(1)', opacity: 0.9 }
            }
          })}
        >
          <Box component='img' src='/images/greenhouse/SVG/negative-isotipo.svg' alt='' aria-hidden='true' sx={{ width: 46, height: 46 }} />
        </Box>
        <Stack spacing={0.75} alignItems='center'>
          <Typography variant='h5' sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {description}
          </Typography>
        </Stack>
        <Rail width={220} height={4} />
      </Stack>
    </CardContent>
  </Card>
)

const AiThinking = ({ title, description }: { title: string; description: string }) => (
  <Card
    elevation={0}
    sx={theme => ({
      overflow: 'hidden',
      border: `1px solid ${alpha(theme.palette.info.main, 0.26)}`,
      backgroundColor: alpha(theme.palette.info.main, 0.055)
    })}
  >
    <CardContent sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        <Stack direction='row' spacing={1.5} alignItems='center'>
          <Box
            aria-hidden='true'
            className='tabler-sparkles'
            component='i'
            sx={theme => ({
              display: 'grid',
              placeItems: 'center',
              width: 40,
              height: 40,
              borderRadius: 2,
              color: theme.palette.info.main,
              backgroundColor: alpha(theme.palette.info.main, 0.12),
              fontSize: 22,
              animation: 'gh-ai-spark 1700ms ease-in-out infinite',
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
              '@keyframes gh-ai-spark': {
                '0%, 100%': { transform: 'translateY(0)', opacity: 0.78 },
                '50%': { transform: 'translateY(-2px)', opacity: 1 }
              }
            })}
          />
          <Stack spacing={0.25}>
            <Typography variant='h6' sx={{ fontWeight: 800 }}>
              {title}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {description}
            </Typography>
          </Stack>
        </Stack>
        <Stack spacing={1.25}>
          {['Lectura de hechos', 'Borrador bilingue', 'Chequeo de paridad'].map((label, index) => (
            <Box
              key={label}
              sx={theme => ({
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: 1.25,
                alignItems: 'center',
                p: 1.25,
                borderRadius: 1.5,
                backgroundColor: alpha(theme.palette.background.paper, 0.74),
                border: `1px solid ${alpha(theme.palette.info.main, index === 1 ? 0.28 : 0.12)}`
              })}
            >
              <Box
                aria-hidden='true'
                component='i'
                className={index === 0 ? 'tabler-circle-check' : index === 1 ? 'tabler-sparkles' : 'tabler-language'}
                sx={theme => ({
                  color: index === 0 ? theme.palette.success.main : theme.palette.info.main,
                  fontSize: 18,
                  animation: index === 1 ? 'gh-ai-token 1500ms ease-in-out infinite' : 'none',
                  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                  '@keyframes gh-ai-token': {
                    '0%, 100%': { transform: 'scale(0.94)', opacity: 0.72 },
                    '50%': { transform: 'scale(1)', opacity: 1 }
                  }
                })}
              />
              <Stack spacing={0.5}>
                <Typography variant='caption' sx={{ fontWeight: 800 }}>
                  {label}
                </Typography>
                <Rail width={index === 0 ? '88%' : index === 1 ? '72%' : '52%'} height={4} delay={index * 140} />
              </Stack>
            </Box>
          ))}
        </Stack>
        <Box
          aria-hidden='true'
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 0.72fr 0.92fr',
            gap: 1,
            alignItems: 'end',
            height: 90
          }}
        >
          {[58, 82, 68].map((height, index) => (
            <Box
              key={height}
              sx={theme => ({
                height,
                borderRadius: 2,
                background: `linear-gradient(180deg, ${alpha(theme.palette.info.main, 0.28)}, ${alpha(theme.palette.primary.main, 0.1)})`,
                border: `1px solid ${alpha(theme.palette.info.main, 0.18)}`,
                transformOrigin: 'bottom',
                animation: `gh-ai-column 1600ms ease-in-out ${index * 140}ms infinite`,
                '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                '@keyframes gh-ai-column': {
                  '0%, 100%': { transform: 'scaleY(0.72)' },
                  '48%': { transform: 'scaleY(1)' }
                }
              })}
            />
          ))}
        </Box>
      </Stack>
    </CardContent>
  </Card>
)

const DocumentPipeline = ({ title, description, steps }: { title: string; description: string; steps?: GreenhouseLoadingStep[] }) => {
  const resolvedSteps =
    steps?.length
      ? steps
      : [
          { label: 'Componer estructura', status: 'done' as const },
          { label: 'Renderizar PDF', status: 'active' as const },
          { label: 'Adjuntar artefacto', status: 'pending' as const }
        ]

  return (
    <Card
      elevation={0}
      sx={theme => ({
        overflow: 'hidden',
        border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
        backgroundColor: alpha(theme.palette.background.paper, 0.96)
      })}
    >
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Stack direction='row' spacing={1.5} alignItems='center'>
            <Box
              aria-hidden='true'
              component='i'
              className='tabler-file-type-pdf'
              sx={theme => ({
                display: 'grid',
                placeItems: 'center',
                width: 42,
                height: 42,
                borderRadius: 2,
                color: theme.palette.primary.main,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                fontSize: 22
              })}
            />
            <Stack spacing={0.25}>
              <Typography variant='h6' sx={{ fontWeight: 800 }}>
                {title}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {description}
              </Typography>
            </Stack>
          </Stack>
          <Box
            aria-hidden='true'
            sx={theme => ({
              position: 'relative',
              overflow: 'hidden',
              minHeight: 132,
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)}, ${theme.palette.background.paper})`
            })}
          >
            <Box sx={{ position: 'absolute', inset: 16, display: 'grid', gridTemplateColumns: '0.58fr 1fr', gap: 2 }}>
              <Stack spacing={1.25}>
                <Rail width='76%' height={10} />
                <Rail width='52%' height={10} delay={80} />
                <Rail width='88%' height={42} delay={160} />
              </Stack>
              <Stack spacing={1.15}>
                <Rail width='92%' height={8} delay={120} />
                <Rail width='84%' height={8} delay={180} />
                <Rail width='70%' height={8} delay={240} />
                <Rail width='96%' height={8} delay={300} />
                <Rail width='62%' height={8} delay={360} />
              </Stack>
            </Box>
            <Box
              sx={theme => ({
                position: 'absolute',
                insetBlock: 0,
                inlineSize: '36%',
                transform: 'translateX(-80%) skewX(-10deg)',
                background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.primary.main, 0.12)}, transparent)`,
                animation: 'gh-doc-scan 2100ms ease-in-out infinite',
                '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0.35 },
                '@keyframes gh-doc-scan': {
                  '0%': { transform: 'translateX(-80%) skewX(-10deg)' },
                  '55%': { transform: 'translateX(260%) skewX(-10deg)' },
                  '100%': { transform: 'translateX(260%) skewX(-10deg)' }
                }
              })}
            />
          </Box>
          <ProgressRail steps={resolvedSteps} />
        </Stack>
      </CardContent>
    </Card>
  )
}

const ExternalHandoff = ({ title, description, steps }: { title: string; description: string; steps?: GreenhouseLoadingStep[] }) => {
  const resolvedSteps =
    steps?.length
      ? steps
      : [
          { label: 'Preparar payload', status: 'done' as const },
          { label: 'Enviar a proveedor', status: 'active' as const },
          { label: 'Esperar confirmacion', status: 'pending' as const }
        ]

  return (
    <Card
      elevation={0}
      sx={theme => ({
        overflow: 'hidden',
        border: `1px solid ${alpha(theme.palette.info.main, 0.24)}`,
        background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.08)}, ${alpha(theme.palette.background.paper, 0.98)})`
      })}
    >
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Stack direction='row' spacing={1.5} alignItems='center'>
            <Box component='i' className='tabler-route' aria-hidden='true' sx={{ color: 'info.main', fontSize: 22 }} />
            <Stack spacing={0.25}>
              <Typography variant='h6' sx={{ fontWeight: 800 }}>
                {title}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {description}
              </Typography>
            </Stack>
          </Stack>
          <Box
            aria-hidden='true'
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr auto 1fr',
              alignItems: 'center',
              gap: 1.25
            }}
          >
            {['Greenhouse', 'Provider', 'Callback'].map((label, index) => (
              <Box
                key={label}
                sx={theme => ({
                  minHeight: 74,
                  borderRadius: 2,
                  border: `1px solid ${alpha(index === 1 ? theme.palette.info.main : theme.palette.primary.main, 0.2)}`,
                  backgroundColor: alpha(index === 1 ? theme.palette.info.main : theme.palette.primary.main, 0.07),
                  display: 'grid',
                  placeItems: 'center',
                  px: 1
                })}
              >
                <Stack spacing={1} alignItems='center'>
                  <Box
                    component='i'
                    className={index === 0 ? 'tabler-home-2' : index === 1 ? 'tabler-cloud-upload' : 'tabler-webhook'}
                    sx={{ fontSize: 20, color: index === 1 ? 'info.main' : 'primary.main' }}
                  />
                  <Typography variant='caption' sx={{ fontWeight: 800 }}>
                    {label}
                  </Typography>
                </Stack>
              </Box>
            )).flatMap((node, index, array) =>
              index < array.length - 1
                ? [
                    node,
                    <Rail key={`handoff-rail-${index}`} width={34} height={4} delay={index * 160} />
                  ]
                : [node]
            )}
          </Box>
          <ProgressRail steps={resolvedSteps} />
        </Stack>
      </CardContent>
    </Card>
  )
}

const SecureAction = ({ title, description, steps }: { title: string; description: string; steps?: GreenhouseLoadingStep[] }) => {
  const resolvedSteps =
    steps?.length
      ? steps
      : [
          { label: 'Verificar permisos', status: 'done' as const },
          { label: 'Registrar audit trail', status: 'active' as const },
          { label: 'Confirmar idempotencia', status: 'pending' as const }
        ]

  return (
    <Card
      elevation={0}
      sx={theme => ({
        border: `1px solid ${alpha(theme.palette.warning.main, 0.28)}`,
        backgroundColor: alpha(theme.palette.warning.main, 0.055)
      })}
    >
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Stack direction='row' spacing={1.5} alignItems='center'>
            <Box
              component='i'
              className='tabler-shield-lock'
              aria-hidden='true'
              sx={theme => ({
                width: 42,
                height: 42,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                color: theme.palette.warning.dark,
                backgroundColor: alpha(theme.palette.warning.main, 0.14),
                fontSize: 22
              })}
            />
            <Stack spacing={0.25}>
              <Typography variant='h6' sx={{ fontWeight: 800 }}>
                {title}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {description}
              </Typography>
            </Stack>
          </Stack>
          <Box
            aria-hidden='true'
            sx={theme => ({
              p: 2,
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.warning.main, 0.22)}`,
              backgroundColor: alpha(theme.palette.background.paper, 0.72)
            })}
          >
            <Stack spacing={1.35}>
              <Stack direction='row' spacing={1} alignItems='center'>
                <Box component='i' className='tabler-key' sx={{ fontSize: 18, color: 'warning.dark' }} />
                <Rail width='72%' height={8} />
              </Stack>
              <Stack direction='row' spacing={1} alignItems='center'>
                <Box component='i' className='tabler-file-text' sx={{ fontSize: 18, color: 'warning.dark' }} />
                <Rail width='88%' height={8} delay={120} />
              </Stack>
              <Stack direction='row' spacing={1} alignItems='center'>
                <Box component='i' className='tabler-fingerprint' sx={{ fontSize: 18, color: 'warning.dark' }} />
                <Rail width='58%' height={8} delay={240} />
              </Stack>
            </Stack>
          </Box>
          <ProgressRail steps={resolvedSteps} />
        </Stack>
      </CardContent>
    </Card>
  )
}

const UploadVerification = ({ title, description, steps }: { title: string; description: string; steps?: GreenhouseLoadingStep[] }) => {
  const resolvedSteps =
    steps?.length
      ? steps
      : [
          { label: 'Subir archivo', status: 'done' as const },
          { label: 'Validar policy', status: 'active' as const },
          { label: 'Asociar evidencia', status: 'pending' as const }
        ]

  return (
    <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Stack direction='row' spacing={1.5} alignItems='center'>
            <Box component='i' className='tabler-cloud-check' aria-hidden='true' sx={{ color: 'success.main', fontSize: 22 }} />
            <Stack spacing={0.25}>
              <Typography variant='h6' sx={{ fontWeight: 800 }}>
                {title}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {description}
              </Typography>
            </Stack>
          </Stack>
          <Box
            aria-hidden='true'
            sx={theme => ({
              display: 'grid',
              gridTemplateColumns: '72px 1fr',
              gap: 2,
              alignItems: 'center',
              p: 2,
              borderRadius: 2,
              border: `1px dashed ${alpha(theme.palette.success.main, 0.32)}`,
              backgroundColor: alpha(theme.palette.success.main, 0.055)
            })}
          >
            <Box
              sx={theme => ({
                width: 72,
                height: 72,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                backgroundColor: alpha(theme.palette.success.main, 0.12),
                color: theme.palette.success.main
              })}
            >
              <Box component='i' className='tabler-file-upload' sx={{ fontSize: 22 }} />
            </Box>
            <Stack spacing={1.1}>
              <Rail width='78%' height={10} />
              <Rail width='92%' height={10} delay={120} />
              <Rail width='48%' height={10} delay={220} />
            </Stack>
          </Box>
          <ProgressRail steps={resolvedSteps} />
        </Stack>
      </CardContent>
    </Card>
  )
}

const ReconciliationMatching = ({ title, description }: { title: string; description: string }) => (
  <Card
    elevation={0}
    sx={theme => ({
      overflow: 'hidden',
      border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
      backgroundColor: alpha(theme.palette.background.paper, 0.96)
    })}
  >
    <CardContent sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        <Stack direction='row' spacing={1.5} alignItems='center'>
          <Box component='i' className='tabler-arrows-exchange' aria-hidden='true' sx={{ color: 'success.main', fontSize: 22 }} />
          <Stack spacing={0.25}>
            <Typography variant='h6' sx={{ fontWeight: 800 }}>
              {title}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {description}
            </Typography>
          </Stack>
        </Stack>
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr auto 1fr' }, alignItems: 'center' }}>
          {['Movimiento banco', 'Documento canonico'].map((label, index) => (
            <Card key={label} elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
              <CardContent sx={{ p: 2 }}>
                <Stack spacing={1.25}>
                  <Typography variant='caption' sx={{ fontWeight: 800 }}>
                    {label}
                  </Typography>
                  <Rail width='82%' height={12} delay={index * 120} />
                  <Rail width='58%' height={12} delay={index * 180} />
                  <Rail width='72%' height={22} delay={index * 240} />
                </Stack>
              </CardContent>
            </Card>
          )).flatMap((node, index) =>
            index === 0
              ? [
                  node,
                  <Box
                    key='match-indicator'
                    aria-hidden='true'
                    sx={theme => ({
                      width: { xs: '100%', sm: 42 },
                      height: { xs: 22, sm: 42 },
                      borderRadius: 999,
                      display: 'grid',
                      placeItems: 'center',
                      color: theme.palette.success.main,
                      backgroundColor: alpha(theme.palette.success.main, 0.1),
                      border: `1px solid ${alpha(theme.palette.success.main, 0.22)}`,
                      animation: 'gh-match-pulse 1400ms ease-in-out infinite',
                      '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                      '@keyframes gh-match-pulse': {
                        '0%, 100%': { transform: 'scale(0.96)', opacity: 0.78 },
                        '50%': { transform: 'scale(1)', opacity: 1 }
                      }
                    })}
                  >
                    <Box component='i' className='tabler-link' sx={{ fontSize: 18 }} />
                  </Box>
                ]
              : [node]
          )}
        </Box>
        <Stack spacing={1}>
          <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 800 }}>
            Confianza y trazabilidad
          </Typography>
          <Rail width='100%' height={8} />
          <Rail width='66%' height={8} delay={180} />
        </Stack>
      </Stack>
    </CardContent>
  </Card>
)

const ProgressRail = ({ steps }: { steps?: GreenhouseLoadingStep[] }) => {
  const resolvedSteps =
    steps?.length
      ? steps
      : [
          { label: 'Resolver contexto', status: 'done' as const },
          { label: 'Verificar permisos', status: 'active' as const },
          { label: 'Preparar salida', status: 'pending' as const }
        ]

  return (
    <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
      <CardContent>
        <Stack spacing={2}>
          {resolvedSteps.map((step, index) => {
            const status = step.status ?? (index === 0 ? 'active' : 'pending')

            return (
              <Stack key={`${step.label}-${index}`} direction='row' spacing={1.5} alignItems='center'>
                <Box
                  aria-hidden='true'
                  sx={theme => ({
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    color: status === 'done' ? theme.palette.success.contrastText : theme.palette.primary.main,
                    backgroundColor:
                      status === 'done'
                        ? theme.palette.success.main
                        : status === 'active'
                          ? alpha(theme.palette.primary.main, 0.14)
                          : alpha(theme.palette.text.primary, 0.08),
                    border: status === 'active' ? `1px solid ${alpha(theme.palette.primary.main, 0.35)}` : '1px solid transparent',
                    animation: status === 'active' ? 'gh-step-active 1300ms ease-in-out infinite' : 'none',
                    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                    '@keyframes gh-step-active': {
                      '0%, 100%': { boxShadow: `0 0 0 0 ${alpha(theme.palette.primary.main, 0.22)}` },
                      '50%': { boxShadow: `0 0 0 5px ${alpha(theme.palette.primary.main, 0)}` }
                    }
                  })}
                >
                  {status === 'done' ? <Box component='i' className='tabler-check' sx={{ fontSize: 14 }} /> : null}
                </Box>
                <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant='body2' sx={{ fontWeight: status === 'active' ? 700 : 500 }}>
                    {step.label}
                  </Typography>
                  <Rail width={status === 'pending' ? '48%' : '82%'} height={4} delay={index * 120} />
                </Stack>
              </Stack>
            )
          })}
        </Stack>
      </CardContent>
    </Card>
  )
}

const renderVariant = ({
  variant,
  title,
  description,
  progress,
  steps,
  rows,
  compact
}: Required<Pick<GreenhouseLoadingSurfaceProps, 'variant'>> &
  Pick<GreenhouseLoadingSurfaceProps, 'title' | 'description' | 'progress' | 'steps' | 'rows' | 'compact'>) => {
  switch (variant) {
    case 'pageSkeleton':
      return <PageSkeleton compact={compact} />
    case 'panelSkeleton':
      return <PanelSkeleton />
    case 'tableSkeleton':
      return <TableSkeleton rows={rows} />
    case 'inlineAction':
      return <InlineAction title={title ?? DEFAULT_TITLE.inlineAction} />
    case 'brandSplash':
      return <BrandSplash title={title ?? DEFAULT_TITLE.brandSplash} description={description ?? DEFAULT_DESCRIPTION.brandSplash} />
    case 'aiThinking':
      return <AiThinking title={title ?? DEFAULT_TITLE.aiThinking} description={description ?? DEFAULT_DESCRIPTION.aiThinking} />
    case 'progressRail':
      return <ProgressRail steps={steps ?? (typeof progress === 'number' ? [{ label: `Avance ${Math.round(progress)}%`, status: 'active' }] : undefined)} />
    case 'documentPipeline':
      return <DocumentPipeline title={title ?? DEFAULT_TITLE.documentPipeline} description={description ?? DEFAULT_DESCRIPTION.documentPipeline} steps={steps} />
    case 'externalHandoff':
      return <ExternalHandoff title={title ?? DEFAULT_TITLE.externalHandoff} description={description ?? DEFAULT_DESCRIPTION.externalHandoff} steps={steps} />
    case 'secureAction':
      return <SecureAction title={title ?? DEFAULT_TITLE.secureAction} description={description ?? DEFAULT_DESCRIPTION.secureAction} steps={steps} />
    case 'uploadVerification':
      return <UploadVerification title={title ?? DEFAULT_TITLE.uploadVerification} description={description ?? DEFAULT_DESCRIPTION.uploadVerification} steps={steps} />
    case 'reconciliationMatching':
      return <ReconciliationMatching title={title ?? DEFAULT_TITLE.reconciliationMatching} description={description ?? DEFAULT_DESCRIPTION.reconciliationMatching} />
    default:
      return null
  }
}

const GreenhouseLoadingSurface = ({
  variant,
  kind,
  title = DEFAULT_TITLE[variant],
  description = DEFAULT_DESCRIPTION[variant],
  progress,
  steps,
  rows,
  compact,
  minHeight,
  dataCapture
}: GreenhouseLoadingSurfaceProps) => {
  const reduced = useReducedMotion()
  const theme = useTheme()

  return (
    <StatusRoot title={title} description={description} minHeight={minHeight} dataCapture={dataCapture}>
      <MotionShell reduced={reduced}>
        <Box
          sx={{
            '--gh-loading-accent': theme.palette.primary.main,
            position: 'relative'
          }}
        >
          {renderVariant({ variant, title, description, progress, steps, rows, compact })}
        </Box>
      </MotionShell>
      <Box component='span' sx={visuallyHidden}>
        {kind ? `${kind}. ` : null}
        {title}. {description}
      </Box>
    </StatusRoot>
  )
}

const createGreenhouseLoadingSurfaceComponent = (
  variant: GreenhouseLoadingSurfaceVariant,
  defaultKind: GreenhouseLoadingSurfaceKind,
  displayName: string
) => {
  const Component = ({ kind, ...props }: GreenhouseNamedLoadingSurfaceProps) => (
    <GreenhouseLoadingSurface {...props} variant={variant} kind={kind ?? defaultKind} />
  )

  Component.displayName = displayName

  return Component
}

export const GreenhousePageSkeletonLoader = createGreenhouseLoadingSurfaceComponent(
  'pageSkeleton',
  'adminWorkbench',
  'GreenhousePageSkeletonLoader'
)

export const GreenhousePanelSkeletonLoader = createGreenhouseLoadingSurfaceComponent(
  'panelSkeleton',
  'sidecarPanel',
  'GreenhousePanelSkeletonLoader'
)

export const GreenhouseTableSkeletonLoader = createGreenhouseLoadingSurfaceComponent(
  'tableSkeleton',
  'financeTable',
  'GreenhouseTableSkeletonLoader'
)

export const GreenhouseInlineActionLoader = createGreenhouseLoadingSurfaceComponent(
  'inlineAction',
  'inlineSave',
  'GreenhouseInlineActionLoader'
)

export const GreenhouseWorkspaceBootLoader = createGreenhouseLoadingSurfaceComponent(
  'brandSplash',
  'workspaceBoot',
  'GreenhouseWorkspaceBootLoader'
)

export const GreenhouseNexaReasoningLoader = createGreenhouseLoadingSurfaceComponent(
  'aiThinking',
  'nexaReasoning',
  'GreenhouseNexaReasoningLoader'
)

export const GreenhouseCheckpointRailLoader = createGreenhouseLoadingSurfaceComponent(
  'progressRail',
  'runbookExecution',
  'GreenhouseCheckpointRailLoader'
)

export const GreenhouseDocumentPipelineLoader = createGreenhouseLoadingSurfaceComponent(
  'documentPipeline',
  'documentGeneration',
  'GreenhouseDocumentPipelineLoader'
)

export const GreenhouseExternalHandoffLoader = createGreenhouseLoadingSurfaceComponent(
  'externalHandoff',
  'providerHandoff',
  'GreenhouseExternalHandoffLoader'
)

export const GreenhouseSecureActionLoader = createGreenhouseLoadingSurfaceComponent(
  'secureAction',
  'auditAction',
  'GreenhouseSecureActionLoader'
)

export const GreenhouseUploadVerificationLoader = createGreenhouseLoadingSurfaceComponent(
  'uploadVerification',
  'assetVerification',
  'GreenhouseUploadVerificationLoader'
)

export const GreenhouseReconciliationMatchingLoader = createGreenhouseLoadingSurfaceComponent(
  'reconciliationMatching',
  'financeReconciliation',
  'GreenhouseReconciliationMatchingLoader'
)

export default GreenhouseLoadingSurface
