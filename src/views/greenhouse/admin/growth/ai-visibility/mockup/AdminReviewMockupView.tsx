'use client'

/**
 * TASK-1247 — Admin Review UI del AEO Grader · MOCKUP (ruta real, no runtime).
 *
 * Nodo S13 del master flow EPIC-020. Gate humano pre-publicación: cola `review_required`
 * + reconciler de evidencia + aprobar/rechazar. Mock data tipada; consume el patrón canónico
 * CompositionShell `single` + AdaptiveSidecarLayout `reconciler` (espeja GrowthFormsAdminCockpit).
 *
 * Dirección aprobada (2026-06-25) "Review Command Center" + ajustes multi-skill (2026-06-30):
 * evidence ledger = capa-2 anti-falso-0 con presencia POR-MOTOR + frescura + procedencia.
 */

import { useCallback, useState, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import Grow from '@mui/material/Grow'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Card from '@mui/material/Card'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import { alpha, type Theme } from '@mui/material/styles'

import {
  AdaptiveSidecarLayout,
  CompositionShell,
  GreenhouseBreadcrumbs,
  GreenhouseButton,
  GreenhouseChip
} from '@/components/greenhouse/primitives'
import { GH_GROWTH_AI_VISIBILITY_ADMIN_REVIEW as C } from '@/lib/copy/growth'

// ─── Tipos del mock (espejan el shape esperado de los readers de 1244/1267) ──────────

type RiskTone = 'error' | 'warning' | 'success'
type ReviewStatus = 'review_required' | 'in_review'
type EngineId = 'chatgpt' | 'perplexity' | 'gemini' | 'ai_overviews'

interface QueueRow {
  reportId: string
  brand: string
  domain: string
  status: ReviewStatus
  score: number
  riskTone: RiskTone
  riskReason: string
  ageLabel: string
  reviewer: string | null
  conflictCount: number
}

interface EnginePresence {
  engine: EngineId
  label: string
  present: boolean
  citations: number
  asOfLabel: string
  stale: boolean
}

interface InternalReason {
  id: string
  title: string
  tone: RiskTone
  severityLabel: string
  detail: string
  impact: number
  evidenceCount: number
}

interface DimensionBar {
  label: string
  value: number
  tone: RiskTone
}

interface ReportDetail {
  reportId: string
  brand: string
  domain: string
  generatedLabel: string
  score: number
  riskTone: RiskTone
  riskReason: string
  gateReason: string
  evidenceIncomplete: boolean
  abstained: boolean
  perEngine: EnginePresence[]
  internalReasons: InternalReason[]
  dimensions: DimensionBar[]
  summary: string
  primaryGap: string
}

// ─── Mock data ───────────────────────────────────────────────────────────────────────

const QUEUE: QueueRow[] = [
  { reportId: 'rep_01J6Z9K8Q7V2', brand: 'Globe', domain: 'globe.com', status: 'review_required', score: 42, riskTone: 'error', riskReason: 'Entidad colisionada', ageLabel: '1h 15m', reviewer: null, conflictCount: 1 },
  { reportId: 'rep_01J6Z9K8Q7V3', brand: 'RevOps Latam', domain: 'revopslatam.com', status: 'review_required', score: 58, riskTone: 'warning', riskReason: 'Categoría incorrecta', ageLabel: '2h 05m', reviewer: 'María G.', conflictCount: 0 },
  { reportId: 'rep_01J6Z9K8Q7V4', brand: 'F11', domain: 'f11.ai', status: 'review_required', score: 71, riskTone: 'warning', riskReason: 'Falta fuente clave', ageLabel: '2h 42m', reviewer: null, conflictCount: 0 },
  { reportId: 'rep_01J6Z9K8Q7V5', brand: 'Kranon', domain: 'kranon.com', status: 'review_required', score: 33, riskTone: 'error', riskReason: 'Afirmación no soportada', ageLabel: '3h 10m', reviewer: 'Luis R.', conflictCount: 2 },
  { reportId: 'rep_01J6Z9K8Q7V6', brand: 'Bemmbo', domain: 'bemmbo.com', status: 'review_required', score: 47, riskTone: 'warning', riskReason: 'Pocas menciones', ageLabel: '4h 05m', reviewer: null, conflictCount: 0 },
  { reportId: 'rep_01J6Z9K8Q7V7', brand: 'Clara', domain: 'clara.dev', status: 'in_review', score: 62, riskTone: 'warning', riskReason: 'Falta fuente clave', ageLabel: '45m', reviewer: 'Ana M.', conflictCount: 0 },
  { reportId: 'rep_01J6Z9K8Q7V8', brand: 'Xepelin', domain: 'xepelin.com', status: 'review_required', score: 28, riskTone: 'error', riskReason: 'Entidad colisionada', ageLabel: '5h 12m', reviewer: null, conflictCount: 0 }
]

const DETAIL_BY_ID: Record<string, ReportDetail> = {
  rep_01J6Z9K8Q7V2: {
    reportId: 'rep_01J6Z9K8Q7V2',
    brand: 'Globe',
    domain: 'globe.com',
    generatedLabel: 'Hoy, 09:12',
    score: 42,
    riskTone: 'error',
    riskReason: 'Exactitud baja',
    gateReason: 'Entidad colisionada',
    evidenceIncomplete: true,
    abstained: false,
    perEngine: [
      { engine: 'chatgpt', label: 'ChatGPT', present: true, citations: 2, asOfLabel: 'hace 2 días', stale: false },
      { engine: 'perplexity', label: 'Perplexity', present: false, citations: 0, asOfLabel: 'hace 12 días', stale: true },
      { engine: 'gemini', label: 'Gemini', present: true, citations: 1, asOfLabel: 'hace 3 días', stale: false },
      { engine: 'ai_overviews', label: 'AI Overviews', present: false, citations: 0, asOfLabel: 'hace 2 días', stale: false }
    ],
    internalReasons: [
      { id: 'accuracy', title: 'Exactitud — Hallazgo', tone: 'error', severityLabel: 'Alto', detail: 'La marca se confunde con «Globe Telecom», generando afirmaciones incorrectas en 3 de 5 respuestas.', impact: -28, evidenceCount: 3 },
      { id: 'entity', title: 'Entidad — Colisión', tone: 'error', severityLabel: 'Alto', detail: 'Colisión semántica con otra entidad del mismo nombre en fuentes públicas.', impact: -18, evidenceCount: 2 },
      { id: 'category', title: 'Categoría — Desajuste', tone: 'warning', severityLabel: 'Medio', detail: 'La categoría inferida no coincide con la configurada en el sistema.', impact: -7, evidenceCount: 1 },
      { id: 'completeness', title: 'Evidencia — Completitud', tone: 'warning', severityLabel: 'Medio', detail: 'Faltan fuentes clave en 2 de 5 dimensiones (cobertura y profundidad).', impact: -5, evidenceCount: 2 }
    ],
    dimensions: [
      { label: 'Exactitud', value: 35, tone: 'error' },
      { label: 'Cobertura', value: 48, tone: 'warning' },
      { label: 'Profundidad', value: 40, tone: 'error' },
      { label: 'Sentimiento', value: 60, tone: 'warning' },
      { label: 'Consistencia', value: 55, tone: 'warning' }
    ],
    summary: 'La visibilidad de Globe en IA generativa es limitada. Existen menciones, pero con problemas de exactitud y cobertura en motores clave.',
    primaryGap: 'La entidad de la marca se confunde con otra de nombre similar, afectando la exactitud de las respuestas.'
  }
}

const toneColor = (t: RiskTone) => (t === 'error' ? 'error' : t === 'warning' ? 'warning' : 'success') as const
const riskLabel = (t: RiskTone) => (t === 'error' ? 'Alto' : t === 'warning' ? 'Medio' : 'Bajo')

// ─── Subcomponentes ────────────────────────────────────────────────────────────────

const SummaryStat = ({ label, value, tone }: { label: string; value: string; tone?: RiskTone }) => (
  <Card
    elevation={0}
    sx={{ flex: 1, minWidth: 0, p: 3, border: (t: Theme) => `1px solid ${t.palette.divider}`, borderRadius: (t: Theme) => `${t.shape.customBorderRadius.md}px` }}
  >
    <Typography variant='overline' color='text.secondary'>{label}</Typography>
    <Typography variant='kpiValue' color={tone ? `${toneColor(tone)}.main` : 'text.primary'} sx={{ display: 'block', mt: 1 }}>
      {value}
    </Typography>
  </Card>
)

const ScoreBadge = ({ score, tone }: { score: number; tone: RiskTone }) => (
  <Box
    sx={{
      width: 40,
      height: 40,
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
      border: (t: Theme) => `2px solid ${t.palette[toneColor(tone)].main}`,
      color: (t: Theme) => t.palette[toneColor(tone)].main
    }}
  >
    <Typography variant='monoId' sx={{ fontWeight: 700 }}>{score}</Typography>
  </Box>
)

const ScoreRing = ({ score, tone }: { score: number; tone: RiskTone }) => (
  <Box
    sx={{
      width: 64,
      height: 64,
      flexShrink: 0,
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
      border: (t: Theme) => `3px solid ${t.palette[toneColor(tone)].main}`,
      color: (t: Theme) => t.palette[toneColor(tone)].main
    }}
  >
    <Typography variant='kpiValue' sx={{ lineHeight: 1 }}>{score}</Typography>
  </Box>
)

const QueueTable = ({ rows, selectedId, onSelect }: { rows: QueueRow[]; selectedId: string | null; onSelect: (id: string) => void }) => (
  <Box data-capture='admin-review-queue' sx={{ minWidth: 0 }}>
    <Typography variant='h5' sx={{ mb: 3 }}>{C.queue.title}</Typography>
    <Box sx={{ overflowX: 'auto' }}>
    <Table size='small' sx={{ minWidth: 760 }}>
      <TableHead>
        <TableRow>
          <TableCell>{C.queue.colBrand}</TableCell>
          <TableCell>{C.queue.colStatus}</TableCell>
          <TableCell align='center'>{C.queue.colScore}</TableCell>
          <TableCell>{C.queue.colRisk}</TableCell>
          <TableCell>{C.queue.colAge}</TableCell>
          <TableCell>{C.queue.colReviewer}</TableCell>
          <TableCell align='center'>{C.queue.colConflict}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map(row => {
          const selected = row.reportId === selectedId

          return (
            <TableRow
              key={row.reportId}
              hover
              selected={selected}
              onClick={() => onSelect(row.reportId)}
              sx={{
                cursor: 'pointer',
                ...(selected && { bgcolor: (t: Theme) => alpha(t.palette.primary.main, 0.06) })
              }}
            >
              <TableCell>
                <Typography variant='body2' sx={{ fontWeight: 600 }}>{row.brand}</Typography>
                <Typography variant='caption' color='text.secondary'>{row.domain}</Typography>
              </TableCell>
              <TableCell>
                <GreenhouseChip
                  kind='status'
                  size='small'
                  variant='label'
                  tone={row.status === 'review_required' ? 'warning' : 'info'}
                  label={row.status === 'review_required' ? 'review_required' : 'in_review'}
                />
              </TableCell>
              <TableCell align='center'>
                <Box sx={{ display: 'inline-flex' }}><ScoreBadge score={row.score} tone={row.riskTone} /></Box>
              </TableCell>
              <TableCell>
                <Typography variant='body2'>{riskLabel(row.riskTone)}</Typography>
                <Typography variant='caption' color='text.secondary'>{row.riskReason}</Typography>
              </TableCell>
              <TableCell><Typography variant='body2' color='text.secondary'>{row.ageLabel}</Typography></TableCell>
              <TableCell><Typography variant='body2' color='text.secondary'>{row.reviewer ?? C.queue.unassigned}</Typography></TableCell>
              <TableCell align='center'>
                {row.conflictCount > 0 ? (
                  <GreenhouseChip kind='metric' size='small' variant='label' tone='error' label={`${row.conflictCount}`} />
                ) : (
                  <Typography variant='caption' color='text.secondary'>{C.queue.unassigned}</Typography>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
    </Box>
  </Box>
)

/** Sección con título overline consistente + contenido. */
const Section = ({ title, hint, action, children }: { title: string; hint?: string; action?: ReactNode; children: ReactNode }) => (
  <Box>
    <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mb: 2 }}>
      <Box>
        <Typography variant='overline' color='text.secondary'>{title}</Typography>
        {hint && <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>{hint}</Typography>}
      </Box>
      {action}
    </Stack>
    {children}
  </Box>
)

const PerEngineRow = ({ e }: { e: EnginePresence }) => (
  <Stack direction='row' alignItems='center' spacing={3} sx={{ py: 1.5 }}>
    <Box
      sx={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        flexShrink: 0,
        bgcolor: (t: Theme) => (e.present ? t.palette.success.main : alpha(t.palette.text.disabled, 0.5))
      }}
    />
    <Box sx={{ minWidth: 116 }}>
      <Typography variant='body2' sx={{ fontWeight: 600 }}>{e.label}</Typography>
      <Typography variant='caption' color={e.present ? 'success.main' : 'text.secondary'}>
        {e.present ? C.detail.present : C.detail.absent}
      </Typography>
    </Box>
    <Typography variant='caption' color='text.secondary' sx={{ minWidth: 64 }}>
      {e.citations === 1 ? C.detail.citationOne : `${e.citations} ${C.detail.citations}`}
    </Typography>
    <Box sx={{ flex: 1 }} />
    {e.stale ? (
      <GreenhouseChip kind='status' size='small' variant='outlined' tone='error' label={`${C.detail.asOf} ${e.asOfLabel}`} />
    ) : (
      <Typography variant='caption' color='text.secondary'>{C.detail.asOf} {e.asOfLabel}</Typography>
    )}
  </Stack>
)

const cardSx = (t: Theme) => ({
  border: `1px solid ${t.palette.divider}`,
  borderRadius: `${t.shape.customBorderRadius.md}px`
})

const ReportDetailPanel = ({ detail, onClose }: { detail: ReportDetail; onClose: () => void }) => (
  <Box
    data-capture='admin-review-detail'
    sx={{ height: '100%', maxHeight: '100vh', display: 'flex', flexDirection: 'column', minWidth: 0, bgcolor: 'background.paper' }}
  >
    {/* Header fijo */}
    <Stack
      direction='row'
      alignItems='flex-start'
      justifyContent='space-between'
      sx={{ px: 4, pt: 4, pb: 3, borderBottom: (t: Theme) => `1px solid ${t.palette.divider}` }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant='h5'>
          {detail.brand} <Typography component='span' variant='body2' color='text.secondary'>{detail.domain}</Typography>
        </Typography>
        <Stack direction='row' spacing={4} sx={{ mt: 1 }} flexWrap='wrap'>
          <Typography variant='caption' color='text.secondary'>{C.detail.reportId} · {detail.reportId}</Typography>
          <Typography variant='caption' color='text.secondary'>{C.detail.generated} · {detail.generatedLabel}</Typography>
        </Stack>
      </Box>
      <IconButton size='small' onClick={onClose} aria-label={C.detail.close}>
        <i className='tabler-x' aria-hidden='true' />
      </IconButton>
    </Stack>

    {/* Contenido scrollable */}
    <Box sx={{ flex: '1 1 auto', overflowY: 'auto', minHeight: 0, px: 4, py: 4 }}>
      <Stack spacing={4}>
        {/* HERO: score + riesgo + razón del gate */}
        <Card
          elevation={0}
          sx={(t: Theme) => ({
            ...cardSx(t),
            borderLeft: `3px solid ${t.palette[toneColor(detail.riskTone)].main}`,
            bgcolor: alpha(t.palette[toneColor(detail.riskTone)].main, 0.04),
            p: 3
          })}
        >
          <Stack direction='row' alignItems='center' spacing={4}>
            <ScoreRing score={detail.score} tone={detail.riskTone} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction='row' alignItems='center' spacing={2}>
                <GreenhouseChip kind='status' size='small' variant='label' tone={toneColor(detail.riskTone)} label={`${C.detail.riskLabel} ${riskLabel(detail.riskTone).toLowerCase()}`} />
                <Typography variant='body2' sx={{ fontWeight: 600 }}>{detail.gateReason}</Typography>
              </Stack>
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
                {C.detail.consequenceBody}
              </Typography>
            </Box>
          </Stack>
        </Card>

        {/* Estado de evidencia (incompleta / abstención) */}
        {detail.abstained ? (
          <Box sx={{ p: 3, borderRadius: (t: Theme) => `${t.shape.customBorderRadius.md}px`, bgcolor: (t: Theme) => alpha(t.palette.error.main, 0.06), display: 'flex', gap: 2 }}>
            <i className='tabler-alert-octagon' aria-hidden='true' style={{ color: 'var(--mui-palette-error-main)' }} />
            <Box>
              <Typography variant='body2' sx={{ fontWeight: 600 }} color='error.main'>{C.evidence.abstainedTitle}</Typography>
              <Typography variant='caption' color='text.secondary'>{C.evidence.abstainedBody}</Typography>
            </Box>
          </Box>
        ) : detail.evidenceIncomplete ? (
          <Box sx={{ p: 3, borderRadius: (t: Theme) => `${t.shape.customBorderRadius.md}px`, bgcolor: (t: Theme) => alpha(t.palette.warning.main, 0.08), display: 'flex', gap: 2 }}>
            <i className='tabler-alert-triangle' aria-hidden='true' style={{ color: 'var(--mui-palette-warning-main)' }} />
            <Box>
              <Typography variant='body2' sx={{ fontWeight: 600 }} color='warning.main'>{C.evidence.incompleteTitle}</Typography>
              <Typography variant='caption' color='text.secondary'>{C.evidence.incompleteBody}</Typography>
            </Box>
          </Box>
        ) : null}

        {/* Presencia por motor (capa-2 anti-falso-0) */}
        <Section title={C.detail.perEngineTitle} hint={C.detail.perEngineHint}>
          <Card elevation={0} sx={t => ({ ...cardSx(t), px: 3, py: 1 })}>
            {detail.perEngine.map((e, i) => (
              <Box key={e.engine} sx={i > 0 ? { borderTop: (t: Theme) => `1px solid ${t.palette.divider}` } : undefined}>
                <PerEngineRow e={e} />
              </Box>
            ))}
          </Card>
        </Section>

        {/* Vista pública exacta (WYSIWYG) */}
        <Section
          title={C.detail.publicViewTitle}
          action={<GreenhouseChip kind='metric' size='small' variant='label' tone='info' label={C.detail.publicViewHint} />}
        >
          <Card elevation={0} sx={t => ({ ...cardSx(t), p: 3 })}>
            <Stack direction='row' justifyContent='space-between' alignItems='baseline'>
              <Typography variant='h4'>{detail.brand}</Typography>
              <Typography variant='kpiValue' color={`${toneColor(detail.riskTone)}.main`}>
                {detail.score}<Typography component='span' variant='body2' color='text.secondary'>/100</Typography>
              </Typography>
            </Stack>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>{detail.summary}</Typography>
            <Divider sx={{ my: 3 }} />
            <Stack spacing={2}>
              {detail.dimensions.map(d => (
                <Box key={d.label}>
                  <Stack direction='row' justifyContent='space-between' sx={{ mb: 0.5 }}>
                    <Typography variant='caption'>{d.label}</Typography>
                    <Typography variant='caption' color='text.secondary'>{d.value}/100</Typography>
                  </Stack>
                  <LinearProgress variant='determinate' value={d.value} color={toneColor(d.tone)} sx={{ height: 6, borderRadius: 3 }} />
                </Box>
              ))}
            </Stack>
          </Card>
        </Section>

        {/* Razones internas (no públicas) — stagger sutil */}
        <Section title={C.detail.internalReasonsTitle}>
          <Stack spacing={2}>
            {detail.internalReasons.map((r, i) => (
              <Grow in key={r.id} timeout={320} style={{ transitionDelay: `${i * 55}ms` }}>
                <Card elevation={0} sx={t => ({ ...cardSx(t), borderLeft: `3px solid ${t.palette[toneColor(r.tone)].main}`, p: 3 })}>
                  <Stack direction='row' justifyContent='space-between' alignItems='center' spacing={2}>
                    <Typography variant='body2' sx={{ fontWeight: 600 }}>{r.title}</Typography>
                    <GreenhouseChip kind='status' size='small' variant='label' tone={toneColor(r.tone)} label={r.severityLabel} />
                  </Stack>
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>{r.detail}</Typography>
                  <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mt: 2 }}>
                    <Typography variant='caption' color={`${toneColor(r.tone)}.main`} sx={{ fontWeight: 600 }}>{C.detail.impact} {r.impact} pts</Typography>
                    <GreenhouseButton size='small' variant='text' kind='custom'>{C.detail.seeEvidence} ({r.evidenceCount})</GreenhouseButton>
                  </Stack>
                </Card>
              </Grow>
            ))}
          </Stack>
        </Section>
      </Stack>
    </Box>

    {/* Footer de decisión fijo (acción de consecuencia siempre visible) */}
    <Box
      data-capture='admin-review-actions'
      sx={{ flexShrink: 0, px: 4, py: 3, borderTop: (t: Theme) => `1px solid ${t.palette.divider}`, bgcolor: 'background.paper' }}
    >
      <Typography variant='caption' color='text.secondary'>{C.decision.rejectReasonLabel}</Typography>
      <Box sx={{ mt: 1, mb: 3, p: 2, minHeight: 44, border: (t: Theme) => `1px solid ${t.palette.divider}`, borderRadius: (t: Theme) => `${t.shape.customBorderRadius.sm}px` }}>
        <Typography variant='body2' color='text.disabled'>{C.decision.rejectReasonPlaceholder}</Typography>
      </Box>
      <Stack direction='row' spacing={2}>
        <GreenhouseButton variant='outlined' kind='custom' tone='error' leadingIcon={<i className='tabler-x' aria-hidden='true' />}>{C.decision.reject}</GreenhouseButton>
        <Box sx={{ flex: 1 }} />
        <GreenhouseButton variant='outlined' kind='custom' tone='success' leadingIcon={<i className='tabler-check' aria-hidden='true' />}>{C.decision.approve}</GreenhouseButton>
      </Stack>
    </Box>
  </Box>
)

// ─── View principal ─────────────────────────────────────────────────────────────────

/** Detalle de cualquier fila: real para Globe, sintetizado desde la fila para el resto (mockup). */
const detailFor = (id: string): ReportDetail => {
  const known = DETAIL_BY_ID[id]

  if (known) return known

  const row = QUEUE.find(r => r.reportId === id) ?? QUEUE[0]!
  const base = DETAIL_BY_ID.rep_01J6Z9K8Q7V2!

  return { ...base, reportId: row.reportId, brand: row.brand, domain: row.domain, score: row.score, riskTone: row.riskTone, gateReason: row.riskReason }
}

const AdminReviewMockupView = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const close = useCallback(() => setSelectedId(null), [])
  const detail = selectedId ? detailFor(selectedId) : null

  return (
    <Box sx={{ p: { xs: 4, md: 6 } }}>
      <GreenhouseBreadcrumbs
        items={[
          { label: C.breadcrumb.admin },
          { label: C.breadcrumb.growth },
          { label: C.breadcrumb.grader },
          { label: C.breadcrumb.review }
        ]}
      />
      <Stack direction='row' justifyContent='space-between' alignItems='flex-start' sx={{ mt: 2, mb: 4 }}>
        <Box>
          <Typography variant='h4'>{C.pageTitle}</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>{C.pageSubtitle}</Typography>
        </Box>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 4 }}>
        <SummaryStat label={C.summary.pending} value='12' tone='warning' />
        <SummaryStat label={C.summary.inReview} value='3' />
        <SummaryStat label={C.summary.highRisk} value='4' tone='error' />
        <SummaryStat label={C.summary.sla} value='2h' />
      </Stack>

      <CompositionShell
        composition='single'
        fluidity='rich'
        instanceId='growth-ai-visibility-admin-review-mockup'
        regions={{
          primary: (
            <AdaptiveSidecarLayout
              open={detail !== null}
              onOpenChange={open => { if (!open) close() }}
              kind='reconciler'
              preferredMode='temporary'
              sidecar={detail ? <ReportDetailPanel detail={detail} onClose={close} /> : null}
              sidecarWidth={680}
              sidecarMinWidth={520}
              sidecarMaxWidth={820}
              mainMinWidth={320}
              panelEntrance='slide'
              dataCapture='growth-ai-visibility-admin-review-sidecar'
              source='task-1247-admin-review-mockup'
            >
              <QueueTable rows={QUEUE} selectedId={selectedId} onSelect={setSelectedId} />
            </AdaptiveSidecarLayout>
          )
        }}
      />
    </Box>
  )
}

export default AdminReviewMockupView
