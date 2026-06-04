'use client'

// TASK-1001 — Panel interactivo de invitación de personas al portal cliente, embebido
// en el ítem provision_client_users_access del checklist de onboarding. Siembra los
// candidatos desde los contactos HubSpot ya capturados (rol sugerido por cargo), el
// operador confirma/ajusta el rol e invita por persona. Idempotente (re-invitar no
// duplica). Mirror del patrón NotionConnectPanel (TASK-998).
//
// Diseño: greenhouse-ux (layout + tokens) + state-design (loading/empty/degraded/ready
// honestos) + forms-ux (label arriba, select) + ux-writing (es-CL) + a11y (24px, aria).

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomTextField from '@core/components/mui/TextField'

import { GH_CLIENT_ONBOARDING as T } from '@/lib/copy/client-onboarding'

type PortalRole = 'client_executive' | 'client_manager' | 'client_specialist'
type PanelStatus = 'loading' | 'ready' | 'empty' | 'degraded'
type DegradedReason = 'client_not_ready' | 'hubspot_unavailable'
type RowStatus = 'idle' | 'inviting' | 'invited' | 'already' | 'error'

interface CandidatePayload {
  hubspotContactId: string | null
  name: string
  email: string | null
  jobTitle: string | null
  suggestedRole: PortalRole
  alreadyInvited: boolean
}

interface CandidatesResponse {
  candidates?: CandidatePayload[]
  degraded?: boolean
  degradedReason?: DegradedReason
}

interface Row extends CandidatePayload {
  roleCode: PortalRole
  rowStatus: RowStatus
}

const ROLE_OPTIONS: { value: PortalRole; label: string }[] = [
  { value: 'client_executive', label: T.portalUsers.roleExecutive },
  { value: 'client_manager', label: T.portalUsers.roleManager },
  { value: 'client_specialist', label: T.portalUsers.roleSpecialist }
]

export const PortalUsersPanel = ({ organizationId }: { organizationId: string }) => {
  const theme = useTheme()

  const [status, setStatus] = useState<PanelStatus>('loading')
  const [degradedReason, setDegradedReason] = useState<DegradedReason | null>(null)
  const [rows, setRows] = useState<Row[]>([])

  const load = useCallback(async () => {
    setStatus('loading')
    setDegradedReason(null)

    try {
      const res = await fetch(`/api/admin/clients/${organizationId}/lifecycle/portal-user-candidates`)
      const payload = (await res.json().catch(() => ({}))) as CandidatesResponse

      if (!res.ok) {
        setStatus('degraded')
        setDegradedReason('hubspot_unavailable')

        return
      }

      if (payload.degraded) {
        setStatus('degraded')
        setDegradedReason(payload.degradedReason ?? 'hubspot_unavailable')

        return
      }

      const candidates = payload.candidates ?? []

      if (candidates.length === 0) {
        setRows([])
        setStatus('empty')

        return
      }

      setRows(
        candidates.map(c => ({
          ...c,
          roleCode: c.suggestedRole,
          rowStatus: c.alreadyInvited ? 'already' : 'idle'
        }))
      )
      setStatus('ready')
    } catch {
      setStatus('degraded')
      setDegradedReason('hubspot_unavailable')
    }
  }, [organizationId])

  useEffect(() => {
    load()
  }, [load])

  const handleRoleChange = useCallback((idx: number, roleCode: PortalRole) => {
    setRows(rs => rs.map((r, i) => (i === idx ? { ...r, roleCode } : r)))
  }, [])

  const handleInvite = useCallback(
    async (idx: number) => {
      const row = rows[idx]

      if (!row?.email) return

      setRows(rs => rs.map((r, i) => (i === idx ? { ...r, rowStatus: 'inviting' } : r)))

      try {
        const res = await fetch(`/api/admin/clients/${organizationId}/lifecycle/portal-users/invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invites: [{ email: row.email, fullName: row.name, roleCode: row.roleCode, hubspotContactId: row.hubspotContactId }]
          })
        })

        const payload = (await res.json().catch(() => ({}))) as { results?: { status?: string }[] }
        const outcome = payload.results?.[0]

        const next: RowStatus =
          res.ok && outcome?.status === 'invited'
            ? 'invited'
            : res.ok && outcome?.status === 'already'
              ? 'already'
              : 'error'

        setRows(rs => rs.map((r, i) => (i === idx ? { ...r, rowStatus: next } : r)))
      } catch {
        setRows(rs => rs.map((r, i) => (i === idx ? { ...r, rowStatus: 'error' } : r)))
      }
    },
    [rows, organizationId]
  )

  return (
    <Box
      data-capture='portal-users-panel'
      sx={{
        mt: 3,
        p: 4,
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.paper
      }}
    >
      <Stack direction='row' spacing={3} alignItems='center' sx={{ mb: 1 }}>
        <i className='tabler-users-group' style={{ fontSize: 28, color: theme.palette.primary.main }} aria-hidden />
        <Box>
          <Typography variant='body1' sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            {T.portalUsers.title}
          </Typography>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            {T.portalUsers.subtitle}
          </Typography>
        </Box>
      </Stack>

      {status === 'loading' ? (
        <Stack direction='row' spacing={2} alignItems='center' sx={{ mt: 4, color: 'text.secondary' }} role='status'>
          <CircularProgress size={18} />
          <Typography variant='body2'>{T.portalUsers.loading}</Typography>
        </Stack>
      ) : null}

      {status === 'degraded' && degradedReason === 'client_not_ready' ? (
        <Alert severity='info' variant='outlined' sx={{ mt: 3, borderRadius: `${theme.shape.customBorderRadius.sm}px` }} role='status'>
          <AlertTitle sx={{ fontWeight: 600 }}>{T.portalUsers.degradedClientTitle}</AlertTitle>
          {T.portalUsers.degradedClient}
        </Alert>
      ) : null}

      {status === 'degraded' && degradedReason === 'hubspot_unavailable' ? (
        <Alert
          severity='warning'
          variant='outlined'
          sx={{ mt: 3, borderRadius: `${theme.shape.customBorderRadius.sm}px` }}
          role='alert'
          action={
            <Button color='inherit' size='small' onClick={load} startIcon={<i className='tabler-refresh' />}>
              {T.portalUsers.retryCta}
            </Button>
          }
        >
          <AlertTitle sx={{ fontWeight: 600 }}>{T.portalUsers.degradedHubspotTitle}</AlertTitle>
          {T.portalUsers.degradedHubspot}
        </Alert>
      ) : null}

      {status === 'empty' ? (
        <Stack spacing={2} alignItems='flex-start' sx={{ mt: 4 }} role='status'>
          <Typography variant='body2' sx={{ fontWeight: 600 }}>
            {T.portalUsers.emptyTitle}
          </Typography>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            {T.portalUsers.empty}
          </Typography>
          <Button size='small' variant='tonal' onClick={load} startIcon={<i className='tabler-refresh' />}>
            {T.portalUsers.retryCta}
          </Button>
        </Stack>
      ) : null}

      {status === 'ready' ? (
        <Stack spacing={3} sx={{ mt: 3 }} data-capture='portal-users-list'>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            {T.portalUsers.pickHint}
          </Typography>

          {rows.map((row, idx) => {
            const settled = row.rowStatus === 'invited' || row.rowStatus === 'already'
            const noEmail = !row.email
            // El seed HubSpot cae a email como name cuando el contacto no tiene display_name;
            // evitar mostrar el email dos veces (línea primaria + secundaria).
            const hasRealName = !noEmail && row.name.trim().toLowerCase() !== (row.email ?? '').trim().toLowerCase()
            const primaryText = hasRealName ? row.name : row.email ?? row.name
            const secondaryText = [hasRealName ? row.email : null, row.jobTitle].filter(Boolean).join(' · ')

            return (
              <Stack
                key={row.hubspotContactId ?? row.email ?? row.name}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                sx={{
                  p: 2.5,
                  borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                  border: `1px solid ${settled ? alpha(theme.palette.success.main, 0.4) : theme.palette.divider}`,
                  bgcolor: settled ? alpha(theme.palette.success.main, 0.06) : 'transparent'
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant='body2' sx={{ fontWeight: 600 }} noWrap>
                    {primaryText}
                  </Typography>
                  {secondaryText ? (
                    <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }} noWrap>
                      {secondaryText}
                    </Typography>
                  ) : null}
                  {noEmail ? (
                    <Typography variant='caption' sx={{ color: 'warning.main', display: 'block' }} noWrap>
                      {T.portalUsers.noEmail}
                    </Typography>
                  ) : null}
                </Box>

                <CustomTextField
                  select
                  label={T.portalUsers.roleLabel}
                  value={row.roleCode}
                  onChange={e => handleRoleChange(idx, e.target.value as PortalRole)}
                  disabled={settled || noEmail || row.rowStatus === 'inviting'}
                  sx={{ minWidth: { xs: '100%', sm: 180 } }}
                >
                  {ROLE_OPTIONS.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </CustomTextField>

                <Box sx={{ minWidth: { xs: '100%', sm: 160 }, textAlign: { sm: 'right' } }}>
                  {row.rowStatus === 'already' ? (
                    <Chip icon={<i className='tabler-circle-check' />} label={T.portalUsers.statusAlreadyChip} color='success' variant='tonal' size='small' />
                  ) : row.rowStatus === 'invited' ? (
                    <Chip icon={<i className='tabler-mail-check' />} label={T.portalUsers.statusInvitedChip} color='success' variant='tonal' size='small' />
                  ) : row.rowStatus === 'error' ? (
                    <Button
                      size='small'
                      color='error'
                      variant='tonal'
                      onClick={() => handleInvite(idx)}
                      startIcon={<i className='tabler-refresh' />}
                    >
                      {T.portalUsers.retryInviteCta}
                    </Button>
                  ) : (
                    <Button
                      size='small'
                      variant='contained'
                      disabled={noEmail || row.rowStatus === 'inviting'}
                      onClick={() => handleInvite(idx)}
                      startIcon={
                        row.rowStatus === 'inviting' ? <CircularProgress size={14} color='inherit' /> : <i className='tabler-send' />
                      }
                    >
                      {row.rowStatus === 'inviting' ? T.portalUsers.invitingCta : T.portalUsers.inviteCta}
                    </Button>
                  )}
                </Box>
              </Stack>
            )
          })}
        </Stack>
      ) : null}

      <Stack direction='row' spacing={2} alignItems='flex-start' sx={{ mt: 4, color: 'text.secondary' }}>
        <i className='tabler-lock' style={{ fontSize: 15, marginTop: 2 }} aria-hidden />
        <Typography variant='caption'>{T.portalUsers.secretNote}</Typography>
      </Stack>
    </Box>
  )
}
