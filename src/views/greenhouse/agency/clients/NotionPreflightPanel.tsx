'use client'

// TASK-1009 — Panel del preflight de onboarding Notion, embebido en el ítem
// verify_notion_flowing del checklist. Corre el preflight end-to-end server-side
// (POST .../cases/[caseId]/notion-preflight) y muestra los 9 eslabones con su
// estado real; el ítem se auto-completa SOLO si readyToOnboard (anti-fake-green).
// Mirror del patrón PortalUsersPanel (TASK-1001) / NotionConnectPanel (TASK-998).
//
// Diseño: greenhouse-ux (layout + tokens) + state-design (idle/running/result/
// degraded/error honestos, nunca color-only) + ux-writing (es-CL tuteo) + a11y
// (role=status aria-live, aria-busy, icono+texto, targets 24px).

import { useCallback, useState } from 'react'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'

import { GH_CLIENT_ONBOARDING as T } from '@/lib/copy/client-onboarding'

type CheckStatus = 'ok' | 'fail' | 'degraded'
type PanelStatus = 'idle' | 'running' | 'result' | 'error' | 'no_space'

export interface PreflightCheck {
  id: string
  label: string
  status: CheckStatus
  detail: string
  critical: boolean
}

export interface PreflightResult {
  readyToOnboard: boolean
  checks: PreflightCheck[]
  summary: string
}

interface PreflightResponse {
  preflight?: PreflightResult | null
  advanced?: boolean
  code?: string
}

const CHECK_VISUAL: Record<CheckStatus, { icon: string; color: 'success' | 'error' | 'warning' }> = {
  ok: { icon: 'tabler-circle-check-filled', color: 'success' },
  fail: { icon: 'tabler-circle-x-filled', color: 'error' },
  degraded: { icon: 'tabler-alert-triangle-filled', color: 'warning' }
}

// Vista presentacional del resultado — verdict banner + los 9 eslabones con su
// estado real (icono + texto, nunca color-only). Reusada por el panel real (tras
// el fetch) y por el mockup (con data ficticia) → sin duplicar JSX.
export const NotionPreflightResultView = ({ result, advanced }: { result: PreflightResult; advanced: boolean }) => {
  const theme = useTheme()
  const ready = result.readyToOnboard

  return (
    <Box sx={{ mt: 3 }} role='status' aria-live='polite' data-capture='notion-preflight-result'>
      <Alert
        severity={ready ? 'success' : 'warning'}
        variant='outlined'
        icon={<i className={ready ? 'tabler-circle-check' : 'tabler-progress-alert'} />}
        sx={{ borderRadius: `${theme.shape.customBorderRadius.sm}px`, mb: 3 }}
      >
        <AlertTitle sx={{ fontWeight: 600 }}>
          {ready ? T.notionPreflight.readyTitle : T.notionPreflight.notReadyTitle}
        </AlertTitle>
        {ready ? T.notionPreflight.readyBody : T.notionPreflight.notReadyBody}
        {ready && advanced ? (
          <Typography variant='caption' sx={{ display: 'block', mt: 1, fontWeight: 600, color: 'success.main' }}>
            {T.notionPreflight.advancedNote}
          </Typography>
        ) : null}
      </Alert>

      <Stack spacing={1.5}>
        {result.checks.map(check => {
          const visual = CHECK_VISUAL[check.status]

          return (
            <Stack
              key={check.id}
              direction='row'
              spacing={2}
              alignItems='flex-start'
              sx={{
                p: 2,
                borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                border: `1px solid ${check.status === 'fail' ? alpha(theme.palette.error.main, 0.4) : theme.palette.divider}`,
                bgcolor: check.status === 'fail' ? alpha(theme.palette.error.main, 0.04) : 'transparent'
              }}
            >
              <i
                className={visual.icon}
                style={{ fontSize: 18, color: theme.palette[visual.color].main, flexShrink: 0, marginTop: 1 }}
                aria-hidden
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction='row' spacing={1} alignItems='center' sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                  <Typography variant='body2' sx={{ fontWeight: 600 }}>
                    {check.label}
                  </Typography>
                  {!check.critical ? (
                    <CustomChip round='true' size='small' variant='tonal' color='secondary' label={T.notionPreflight.advisoryTag} />
                  ) : null}
                </Stack>
                <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
                  {check.detail}
                </Typography>
              </Box>
            </Stack>
          )
        })}
      </Stack>

      <Typography variant='caption' sx={{ color: 'text.disabled', display: 'block', mt: 2 }}>
        {T.notionPreflight.resultHint}
      </Typography>
    </Box>
  )
}

export const NotionPreflightPanel = ({ caseId }: { caseId: string }) => {
  const theme = useTheme()

  const [status, setStatus] = useState<PanelStatus>('idle')
  const [result, setResult] = useState<PreflightResult | null>(null)
  const [advanced, setAdvanced] = useState(false)

  const run = useCallback(async () => {
    setStatus('running')

    try {
      const res = await fetch(`/api/admin/clients/lifecycle/cases/${caseId}/notion-preflight`, { method: 'POST' })
      const payload = (await res.json().catch(() => ({}))) as PreflightResponse

      if (res.status === 422 && payload.code === 'no_notion_space') {
        setStatus('no_space')

        return
      }

      if (!res.ok || !payload.preflight) {
        setStatus('error')

        return
      }

      setResult(payload.preflight)
      setAdvanced(Boolean(payload.advanced))
      setStatus('result')
    } catch {
      setStatus('error')
    }
  }, [caseId])

  const running = status === 'running'

  return (
    <Box
      data-capture='notion-preflight-panel'
      sx={{
        mt: 3,
        p: 4,
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.paper
      }}
    >
      <Stack direction='row' spacing={3} alignItems='center' sx={{ mb: 1 }}>
        <i className='tabler-route-2' style={{ fontSize: 28, color: theme.palette.primary.main }} aria-hidden />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant='body1' sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            {T.notionPreflight.title}
          </Typography>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            {T.notionPreflight.subtitle}
          </Typography>
        </Box>
        <Button
          variant={status === 'result' ? 'tonal' : 'contained'}
          size='small'
          onClick={run}
          disabled={running}
          startIcon={
            running ? (
              <CircularProgress size={14} color='inherit' />
            ) : (
              <i className={status === 'result' ? 'tabler-refresh' : 'tabler-player-play'} />
            )
          }
          aria-label={running ? T.notionPreflight.runningCta : status === 'result' ? T.notionPreflight.rerunCta : T.notionPreflight.runCta}
        >
          {running ? T.notionPreflight.runningCta : status === 'result' ? T.notionPreflight.rerunCta : T.notionPreflight.runCta}
        </Button>
      </Stack>

      {status === 'idle' ? (
        <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mt: 2 }}>
          {T.notionPreflight.idleHint}
        </Typography>
      ) : null}

      {running ? (
        <Stack direction='row' spacing={2} alignItems='center' sx={{ mt: 3, color: 'text.secondary' }} role='status' aria-busy='true'>
          <CircularProgress size={18} />
          <Typography variant='body2'>{T.notionPreflight.runningCta}</Typography>
        </Stack>
      ) : null}

      {status === 'no_space' ? (
        <Alert
          severity='info'
          variant='outlined'
          sx={{ mt: 3, borderRadius: `${theme.shape.customBorderRadius.sm}px` }}
          role='status'
        >
          <AlertTitle sx={{ fontWeight: 600 }}>{T.notionPreflight.noSpaceTitle}</AlertTitle>
          {T.notionPreflight.noSpaceBody}
        </Alert>
      ) : null}

      {status === 'error' ? (
        <Alert
          severity='warning'
          variant='outlined'
          sx={{ mt: 3, borderRadius: `${theme.shape.customBorderRadius.sm}px` }}
          role='alert'
          action={
            <Button color='inherit' size='small' onClick={run} startIcon={<i className='tabler-refresh' />}>
              {T.notionPreflight.retryCta}
            </Button>
          }
        >
          <AlertTitle sx={{ fontWeight: 600 }}>{T.notionPreflight.errorTitle}</AlertTitle>
          {T.notionPreflight.errorBody}
        </Alert>
      ) : null}

      {status === 'result' && result ? <NotionPreflightResultView result={result} advanced={advanced} /> : null}
    </Box>
  )
}
