/**
 * TASK-1247 — Admin Review UI del AEO Grader · presentación compartida.
 *
 * Primitives de presentación severity-driven (usan el enum REAL `GraderReportSeverity`,
 * honrando `null ≠ 0` / `sin_dato`) compartidos por el MOCKUP (design harness, data sintética)
 * y la VIEW RUNTIME (data real). Una sola fuente de rendering → sin drift entre ambos.
 *
 * No hay IO ni 'use client' aquí: son componentes puros de presentación; el directive
 * lo aporta la view que los consume.
 */

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, type Theme } from '@mui/material/styles'

import { GreenhouseButton } from '@/components/greenhouse/primitives'
import { type GraderReportSeverity } from '@/lib/growth/ai-visibility/report/contracts'

// ─── Vocabulario de severidad (el enum real del dominio) ────────────────────────────

export type Severity = GraderReportSeverity

/** Paleta MUI para una severidad; `sin_dato` NO tiene color de feedback (es neutro honesto). */
type SeverityPalette = 'error' | 'warning' | 'success' | 'neutral'

const SEVERITY_PALETTE: Record<Severity, SeverityPalette> = {
  critico: 'error',
  atencion: 'warning',
  optimo: 'success',
  sin_dato: 'neutral'
}

/** Etiqueta de riesgo nombrada (NUNCA un color) para la severidad. */
export const severityRiskLabel: Record<Severity, string> = {
  critico: 'Alto',
  atencion: 'Medio',
  optimo: 'Bajo',
  sin_dato: 'Sin dato'
}

/** Tone válido para `GreenhouseChip`/`GreenhouseButton` (neutro → `default`). */
export const severityChipTone = (s: Severity): 'error' | 'warning' | 'success' | 'default' => {
  const p = SEVERITY_PALETTE[s]

  return p === 'neutral' ? 'default' : p
}

/** Color CSS de la severidad; `sin_dato` usa `text.disabled` (neutro). Para `sx` (acepta función-tema). */
export const severityColor = (t: Theme, s: Severity): string => {
  const p = SEVERITY_PALETTE[s]

  return p === 'neutral' ? t.palette.text.disabled : t.palette[p].main
}

/** Token de color (palette-path) para props `color` de Typography; `sin_dato` → `text.disabled`. */
export const severityColorToken = (s: Severity): string => {
  const p = SEVERITY_PALETTE[s]

  return p === 'neutral' ? 'text.disabled' : `${p}.main`
}

/** Color válido para `LinearProgress`; `sin_dato` → `inherit` (barra neutra). */
export const severityBarColor = (s: Severity): 'error' | 'warning' | 'success' | 'inherit' => {
  const p = SEVERITY_PALETTE[s]

  return p === 'neutral' ? 'inherit' : p
}

export const cardSx = (t: Theme) => ({
  border: `1px solid ${t.palette.divider}`,
  borderRadius: `${t.shape.customBorderRadius.md}px`
})

// ─── Score ring / badge (null-safe: sin dato → "—") ─────────────────────────────────

const scoreText = (score: number | null): string => (score === null ? '—' : String(Math.round(score)))

export const ScoreBadge = ({ score, severity }: { score: number | null; severity: Severity }) => (
  <Box
    sx={{
      width: 40,
      height: 40,
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
      border: (t: Theme) => `2px solid ${severityColor(t, severity)}`,
      color: (t: Theme) => severityColor(t, severity)
    }}
  >
    <Typography variant='monoId' sx={{ fontWeight: 700 }}>
      {scoreText(score)}
    </Typography>
  </Box>
)

export const ScoreRing = ({ score, severity }: { score: number | null; severity: Severity }) => (
  <Box
    sx={{
      width: 64,
      height: 64,
      flexShrink: 0,
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
      border: (t: Theme) => `3px solid ${severityColor(t, severity)}`,
      color: (t: Theme) => severityColor(t, severity)
    }}
  >
    <Typography variant='kpiValue' sx={{ lineHeight: 1 }}>
      {scoreText(score)}
    </Typography>
  </Box>
)

// ─── Sección con overline consistente ───────────────────────────────────────────────

export const Section = ({
  title,
  hint,
  action,
  children
}: {
  title: string
  hint?: string
  action?: ReactNode
  children: ReactNode
}) => (
  <Box>
    <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mb: 2 }}>
      <Box>
        <Typography variant='overline' color='text.secondary'>
          {title}
        </Typography>
        {hint && (
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
            {hint}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
    {children}
  </Box>
)

// ─── KPI resumen ────────────────────────────────────────────────────────────────────

export const SummaryStat = ({ label, value, severity }: { label: string; value: string; severity?: Severity }) => (
  <Card
    elevation={0}
    sx={{
      flex: 1,
      minWidth: 0,
      p: 3,
      border: (t: Theme) => `1px solid ${t.palette.divider}`,
      borderRadius: (t: Theme) => `${t.shape.customBorderRadius.md}px`
    }}
  >
    <Typography variant='overline' color='text.secondary'>
      {label}
    </Typography>
    <Typography
      variant='kpiValue'
      color={severity ? severityColorToken(severity) : 'text.primary'}
      sx={{ display: 'block', mt: 1 }}
    >
      {value}
    </Typography>
  </Card>
)

// ─── Bloques de estado (empty / denied / error) ─────────────────────────────────────

export const StateBlock = ({
  icon,
  tone,
  title,
  body,
  capture,
  action
}: {
  icon: string
  tone: 'error' | 'warning' | 'success' | 'info'
  title: string
  body: string
  capture: string
  action?: ReactNode
}) => (
  <Box data-capture={capture} role='status' sx={{ textAlign: 'center', py: 12, px: 4 }}>
    <Box
      sx={{
        width: 56,
        height: 56,
        mx: 'auto',
        mb: 3,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        bgcolor: (t: Theme) => alpha(t.palette[tone].main, 0.1),
        color: `${tone}.main`
      }}
    >
      <i className={icon} aria-hidden='true' />
    </Box>
    <Typography variant='h5'>{title}</Typography>
    <Typography variant='body2' color='text.secondary' sx={{ mt: 1, maxWidth: 420, mx: 'auto' }}>
      {body}
    </Typography>
    {action && <Box sx={{ mt: 4 }}>{action}</Box>}
  </Box>
)

// ─── Skeleton de la cola ────────────────────────────────────────────────────────────

export const QueueSkeleton = ({ label }: { label: string }) => (
  <Box data-capture='admin-review-loading' role='status' aria-busy='true' aria-label={label} sx={{ minWidth: 0 }}>
    <Skeleton variant='text' width={180} height={28} sx={{ mb: 3 }} />
    {Array.from({ length: 6 }).map((_, i) => (
      <Stack
        key={i}
        direction='row'
        alignItems='center'
        spacing={4}
        sx={{ py: 2, borderBottom: (t: Theme) => `1px solid ${t.palette.divider}` }}
      >
        <Box sx={{ flex: 1 }}>
          <Skeleton variant='text' width='30%' height={20} />
          <Skeleton variant='text' width='45%' height={14} />
        </Box>
        <Skeleton variant='rounded' width={110} height={24} />
        <Skeleton variant='circular' width={40} height={40} />
        <Skeleton variant='text' width={120} height={16} />
      </Stack>
    ))}
  </Box>
)

/** Botón "Reintentar" reutilizable para estados de error. */
export const RetryButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <GreenhouseButton
    variant='outlined'
    kind='custom'
    onClick={onClick}
    leadingIcon={<i className='tabler-refresh' aria-hidden='true' />}
  >
    {label}
  </GreenhouseButton>
)
