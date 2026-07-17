'use client'

import { useRef, useState } from 'react'

import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import type { ReportArtifactModel } from '@/components/growth/ai-visibility/report-artifact/model'
import { throwIfNotOk } from '@/lib/api/parse-error-response'
import { GH_GROWTH_AEO_OPERATOR } from '@/lib/copy/growth'
import type { RecommendationStatusValue } from '@/lib/growth/ai-visibility/recommendation-status'
import AiVisibilityClientReportView from '../client/AiVisibilityClientReportView'
import type { PlanStatusVM } from '../plan/PlanStatusSection'
import AeoOperatorRunButton from './AeoOperatorRunButton'

/**
 * TASK-1276 — Detalle operador por-cliente (nodo S9 del EPIC-020, ruta /growth/aeo/[organizationId]).
 *
 * Diseño aprobado: mockup Claude Design "AEO Operator View" (banda de cliente + MISMO workbench
 * masterDetail de TASK-1248 + control de estado del Plan AEO). NO forkea el layout del reporte:
 * compone `AiVisibilityClientReportView` con las extensiones aditivas `chrome` + `plan`.
 *
 * El write de estado es el command gobernado de TASK-1275 vía su API route (la UI es cliente del
 * primitive; cero lógica de negocio acá). Tras el write, el foco editado conserva el foco del
 * operador (el control queda montado; solo cambia aria-pressed) y el cambio se anuncia por aria-live.
 */

const O = GH_GROWTH_AEO_OPERATOR

export interface AeoOperatorSubjectBand {
  organizationId: string
  organizationName: string
  publicId: string | null
  domain: string | null
  /** Label del tier resuelto server-side desde el entitlement (TASK-1277) — es-CL, listo para pintar. */
  tierLabel: string
  /** Chip contextual de allowance/cupo (p.ej. "Contratado · 6/20 runs este mes"); null = sin chip. */
  allowanceLabel: string | null
  /** Último run formateado ("Datos al 12 jul 2026"); null = sin runs. */
  lastRunLabel: string | null
  account360Href: string
}

export interface AeoOperatorDetailViewProps {
  band: AeoOperatorSubjectBand
  model: ReportArtifactModel
  asOfLabel: string | null
  /** Statuses iniciales del Plan AEO (reader TASK-1275), por gapKey. */
  initialStatuses: Readonly<Partial<Record<string, PlanStatusVM>>>
  /** El operador tiene la capability de write (`recommendation.set_status`); sin ella el plan es read-only. */
  canSetStatus: boolean
}

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

// Banda del cliente (mockup: avatar + nombre + tier + allowance + metadatos + Account 360).
const SubjectBand = ({ band }: { band: AeoOperatorSubjectBand }) => (
  <Card variant='outlined' sx={theme => ({ borderRadius: `${theme.shape.customBorderRadius.lg}px` })}>
    <CardContent>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={4}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent='space-between'
      >
        <Stack direction='row' spacing={4} alignItems='center' sx={{ minWidth: 0 }}>
          <CustomAvatar skin='light' color='primary' variant='rounded' size={52}>
            {initialsOf(band.organizationName)}
          </CustomAvatar>
          <Stack spacing={1} sx={{ minWidth: 0 }}>
            <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
              <Typography variant='h4' component='h2' noWrap>
                {band.organizationName}
              </Typography>
              <Chip size='small' variant='tonal' color='primary' label={band.tierLabel} />
              {band.allowanceLabel ? (
                <Chip
                  size='small'
                  variant='outlined'
                  icon={<i className='tabler-gauge' />}
                  label={band.allowanceLabel}
                />
              ) : null}
            </Stack>
            <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
              {band.publicId ? (
                <Typography variant='monoId' color='text.secondary' aria-label={O.band.orgIdAria}>
                  {band.publicId}
                </Typography>
              ) : null}
              {band.domain ? (
                <Typography variant='body2' color='text.secondary' aria-label={O.band.domainAria}>
                  {band.domain}
                </Typography>
              ) : null}
              <Typography variant='body2' color='text.secondary'>
                {O.band.lastRunLabel} {band.lastRunLabel ?? O.band.lastRunNever}
              </Typography>
            </Stack>
          </Stack>
        </Stack>
        <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap sx={{ flexShrink: 0 }}>
          <Button
            variant='outlined'
            color='secondary'
            endIcon={<i className='tabler-external-link' />}
            href={band.account360Href}
          >
            {O.band.viewInAccount360}
          </Button>
          <AeoOperatorRunButton organizationId={band.organizationId} />
        </Stack>
      </Stack>
    </CardContent>
  </Card>
)

const AeoOperatorDetailView = ({ band, model, asOfLabel, initialStatuses, canSetStatus }: AeoOperatorDetailViewProps) => {
  const router = useRouter()
  const [statuses, setStatuses] = useState<Partial<Record<string, PlanStatusVM>>>({ ...initialStatuses })
  const [busyGapKey, setBusyGapKey] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Anuncio aria-live del cambio de estado (flow contract: announcement polite, sin motion gratuito).
  const [liveMessage, setLiveMessage] = useState('')
  const liveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const announce = (message: string) => {
    if (liveTimeout.current) clearTimeout(liveTimeout.current)
    setLiveMessage(message)
    liveTimeout.current = setTimeout(() => setLiveMessage(''), 4000)
  }

  const handleSetStatus = async (gapKey: string, status: RecommendationStatusValue, reason: string | null) => {
    setBusyGapKey(gapKey)

    try {
      const res = await fetch('/api/admin/growth/ai-visibility/recommendation-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: band.organizationId,
          recommendationKey: gapKey,
          status,
          ...(reason ? { reason } : {})
        })
      })

      await throwIfNotOk(res, O.plan.saveError)

      const payload = (await res.json()) as {
        status: { recommendationKey: string; status: RecommendationStatusValue; reason: string | null }
      }

      setStatuses(prev => ({
        ...prev,
        [gapKey]: {
          status: payload.status.status,
          reason: payload.status.reason,
          updatedBy: null,
          updatedAt: null
        }
      }))

      setFeedback(O.plan.saved)
      announce(O.plan.statusAnnouncement(O.plan.status[payload.status.status]))
    } catch (error) {
      setFeedback(error instanceof Error && error.message ? error.message : O.plan.saveError)
    } finally {
      setBusyGapKey(null)
      // Refresca los datos server-side (statuses/report) sin perder el estado de selección local.
      router.refresh()
    }
  }

  return (
    <Stack spacing={5} data-capture='aeo-operator-detail' sx={{ minWidth: 0 }}>
      <Box aria-live='polite' sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {liveMessage}
      </Box>

      <Box sx={{ px: { xs: 4, md: 6 }, pt: { xs: 4, md: 6 } }}>
        <SubjectBand band={band} />
      </Box>

      <AiVisibilityClientReportView
        model={model}
        organizationName={band.organizationName}
        asOfLabel={asOfLabel}
        chrome={{
          hideSupport: true,
          breadcrumbItems: [
            { label: O.page.breadcrumbRoot, href: '/home' },
            { label: O.page.breadcrumbGrowth },
            { label: O.page.breadcrumbLeaf, href: '/growth/aeo' },
            { label: band.organizationName }
          ]
        }}
        plan={
          canSetStatus
            ? {
                statuses,
                busyGapKey,
                onSetStatus: (gapKey, status, reason) => {
                  void handleSetStatus(gapKey, status, reason)
                }
              }
            : undefined
        }
      />

      <Snackbar
        open={feedback !== null}
        autoHideDuration={5000}
        onClose={() => setFeedback(null)}
        message={feedback ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Stack>
  )
}

export default AeoOperatorDetailView
