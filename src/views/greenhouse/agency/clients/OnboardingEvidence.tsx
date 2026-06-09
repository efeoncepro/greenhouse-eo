'use client'

// TASK-1017 — Capa de evidencia del checklist de onboarding (UI honesta, on-demand).
// El operador corre "Verificar evidencia" UNA vez (batched server-side) y cada paso
// auto-derivable se decora con su evidencia real (detectado / sin detectar / no
// verificable), sin pisar lo manual. Mirror del patrón NotionPreflightPanel (TASK-1009).
//
// Diseño: greenhouse-ux (tokens + chip tonal) + state-design (idle/running/result/
// error + 3-estado honesto, nunca color-only) + ux-writing (es-CL tuteo) + a11y
// (icono+texto, role=status, aria-label, targets 24px).

import { useCallback, useMemo, useState } from 'react'

import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import type { ItemEvidence, ItemEvidenceStatus } from '@/lib/client-lifecycle/evidence/evidence-types'
import { GH_CLIENT_ONBOARDING as T } from '@/lib/copy/client-onboarding'

type FetchStatus = 'idle' | 'running' | 'result' | 'error'

interface VerifyEvidenceResponse {
  items?: ItemEvidence[]
  autoCompleted?: string[]
}

export interface OnboardingEvidenceState {
  status: FetchStatus
  evidenceByCode: Map<string, ItemEvidence>
  autoCompleted: Set<string>
  run: () => Promise<void>
}

/** Estado compartido entre el botón (header) y los chips (filas del checklist). */
export const useOnboardingEvidence = (caseId: string | null | undefined): OnboardingEvidenceState => {
  const [status, setStatus] = useState<FetchStatus>('idle')
  const [evidenceByCode, setEvidenceByCode] = useState<Map<string, ItemEvidence>>(new Map())
  const [autoCompleted, setAutoCompleted] = useState<Set<string>>(new Set())

  const run = useCallback(async () => {
    if (!caseId) return
    setStatus('running')

    try {
      const res = await fetch(`/api/admin/clients/lifecycle/cases/${caseId}/verify-evidence`, { method: 'POST' })
      const payload = (await res.json().catch(() => ({}))) as VerifyEvidenceResponse

      if (!res.ok || !payload.items) {
        setStatus('error')

        return
      }

      setEvidenceByCode(new Map(payload.items.map(item => [item.itemCode, item])))
      setAutoCompleted(new Set(payload.autoCompleted ?? []))
      setStatus('result')
    } catch {
      setStatus('error')
    }
  }, [caseId])

  return useMemo(() => ({ status, evidenceByCode, autoCompleted, run }), [status, evidenceByCode, autoCompleted, run])
}

const STATUS_VISUAL: Record<ItemEvidenceStatus, { label: string; color: 'success' | 'secondary' | 'warning'; icon: string }> = {
  detected: { label: T.evidence.statusDetected, color: 'success', icon: 'tabler-circle-check-filled' },
  pending: { label: T.evidence.statusPending, color: 'secondary', icon: 'tabler-clock' },
  unverifiable: { label: T.evidence.statusUnverifiable, color: 'warning', icon: 'tabler-alert-triangle-filled' }
}

/** Fila de evidencia bajo un ítem auto-derivable: chip de estado + detalle es-CL. */
export const EvidenceRow = ({ evidence, autoCompleted }: { evidence: ItemEvidence; autoCompleted: boolean }) => {
  const visual = STATUS_VISUAL[evidence.status]

  return (
    <Stack
      direction='row'
      spacing={1}
      alignItems='center'
      sx={{ mt: 1, flexWrap: 'wrap', rowGap: 0.5 }}
      role='status'
      aria-live='polite'
    >
      <CustomChip
        round='true'
        size='small'
        variant='tonal'
        color={visual.color}
        icon={<i className={visual.icon} />}
        label={visual.label}
      />
      {autoCompleted ? (
        <CustomChip round='true' size='small' variant='tonal' color='success' icon={<i className='tabler-robot' />} label={T.evidence.autoCompletedTag} />
      ) : null}
      <Typography variant='caption' sx={{ color: 'text.secondary' }}>
        {evidence.detail}
      </Typography>
    </Stack>
  )
}

/** Botón "Verificar evidencia" para el header del panel del checklist. */
export const EvidenceVerifyButton = ({ status, onRun }: { status: FetchStatus; onRun: () => void }) => {
  const running = status === 'running'

  const label = running
    ? T.evidence.runningCta
    : status === 'result'
      ? T.evidence.rerunCta
      : status === 'error'
        ? T.evidence.retryCta
        : T.evidence.runCta

  return (
    <Button
      variant={status === 'result' ? 'tonal' : 'contained'}
      size='small'
      onClick={onRun}
      disabled={running}
      aria-label={label}
      startIcon={
        running ? (
          <CircularProgress size={14} color='inherit' />
        ) : (
          <i className={status === 'result' ? 'tabler-refresh' : 'tabler-shield-check'} />
        )
      }
    >
      {label}
    </Button>
  )
}
