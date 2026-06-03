'use client'

// TASK-998 — Panel de vínculo de canal de Teams (bot Graph, read-only). El bot lista
// teams + canales con los permisos actuales (sin permisos Azure nuevos). Flujo: elegir
// equipo → cargar sus canales → elegir canal. El canal se registra en
// teams_notification_channels cuando exista el Space.
//
// Diseño: greenhouse-ux + forms-ux (label arriba, estados) + state-design (loading/empty/
// error honestos) + ux-writing (es-CL). Mirror del NotionConnectPanel.

import { useCallback, useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import MenuItem from '@mui/material/MenuItem'
import Chip from '@mui/material/Chip'
import InputAdornment from '@mui/material/InputAdornment'
import { useTheme } from '@mui/material/styles'

import CustomTextField from '@core/components/mui/TextField'

import { GH_CLIENT_ONBOARDING as T } from '@/lib/copy/client-onboarding'
import { TeamsIsotype } from '@/components/greenhouse/brand/BrandIsotypes'

export interface TeamsConnectSelection {
  teamId: string
  teamName: string
  channelId: string
  channelName: string
}

interface TeamOption {
  teamId: string
  displayName: string
}
interface ChannelOption {
  channelId: string
  displayName: string
}

interface TeamsConnectPanelProps {
  onChange: (selection: TeamsConnectSelection | null) => void
}

export const TeamsConnectPanel = ({ onChange }: TeamsConnectPanelProps) => {
  const theme = useTheme()

  const [teams, setTeams] = useState<TeamOption[]>([])
  const [teamsLoading, setTeamsLoading] = useState(true)
  const [teamsError, setTeamsError] = useState<string | null>(null)
  const [teamId, setTeamId] = useState('')

  const [channels, setChannels] = useState<ChannelOption[]>([])
  const [channelsLoading, setChannelsLoading] = useState(false)
  const [channelId, setChannelId] = useState('')

  // Cargar equipos al montar.
  useEffect(() => {
    let active = true

    ;(async () => {
      setTeamsLoading(true)
      setTeamsError(null)

      try {
        const res = await fetch('/api/admin/clients/lifecycle/teams')
        const payload = (await res.json().catch(() => ({}))) as { ok?: boolean; teams?: TeamOption[]; error?: string }

        if (!active) return

        if (!res.ok || !payload.ok) {
          setTeamsError(payload.error ?? T.space.teamsError)
          setTeams([])
        } else {
          setTeams(payload.teams ?? [])
        }
      } catch {
        if (active) setTeamsError(T.space.teamsError)
      } finally {
        if (active) setTeamsLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [])

  const emit = useCallback(
    (tId: string, cId: string, chans: ChannelOption[]) => {
      const team = teams.find(t => t.teamId === tId)
      const channel = chans.find(c => c.channelId === cId)

      if (team && channel) {
        onChange({ teamId: team.teamId, teamName: team.displayName, channelId: channel.channelId, channelName: channel.displayName })
      } else {
        onChange(null)
      }
    },
    [teams, onChange]
  )

  const handleTeamChange = useCallback(
    async (nextTeamId: string) => {
      setTeamId(nextTeamId)
      setChannelId('')
      setChannels([])
      onChange(null)

      if (!nextTeamId) return

      setChannelsLoading(true)

      try {
        const res = await fetch(`/api/admin/clients/lifecycle/teams?teamId=${encodeURIComponent(nextTeamId)}`)
        const payload = (await res.json().catch(() => ({}))) as { ok?: boolean; channels?: ChannelOption[] }

        setChannels(res.ok && payload.ok ? payload.channels ?? [] : [])
      } catch {
        setChannels([])
      } finally {
        setChannelsLoading(false)
      }
    },
    [onChange]
  )

  const handleChannelChange = useCallback(
    (nextChannelId: string) => {
      setChannelId(nextChannelId)
      emit(teamId, nextChannelId, channels)
    },
    [teamId, channels, emit]
  )

  const selectedTeam = teams.find(t => t.teamId === teamId)
  const selectedChannel = channels.find(c => c.channelId === channelId)

  return (
    <Box
      sx={{
        p: 4,
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.paper
      }}
    >
      <Stack direction='row' spacing={3} alignItems='center' sx={{ mb: 1 }}>
        <TeamsIsotype size={32} />
        <Box>
          <Typography variant='body1' sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            {T.space.teamsTitle}
          </Typography>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            {T.space.teamsSubtitle}
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={3} sx={{ mt: 3 }} data-capture='teams-connect'>
        {teamsError ? (
          <Alert severity='error' variant='outlined' sx={{ borderRadius: `${theme.shape.customBorderRadius.sm}px` }}>
            {teamsError}
          </Alert>
        ) : teamsLoading ? (
          <Stack direction='row' spacing={2} alignItems='center' sx={{ color: 'text.secondary' }}>
            <CircularProgress size={16} />
            <Typography variant='caption'>{T.space.teamsLoadingTeams}</Typography>
          </Stack>
        ) : teams.length === 0 ? (
          <Alert severity='info' variant='outlined' sx={{ borderRadius: `${theme.shape.customBorderRadius.sm}px` }}>
            {T.space.teamsEmpty}
          </Alert>
        ) : (
          <>
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              {T.space.teamsPickHint}
            </Typography>

            <CustomTextField
              select
              fullWidth
              label={T.space.teamsTeamLabel}
              value={teamId}
              onChange={e => handleTeamChange(e.target.value)}
              slotProps={{ select: { displayEmpty: true } }}
            >
              <MenuItem value='' disabled>
                {T.space.teamsTeamPlaceholder}
              </MenuItem>
              {teams.map(t => (
                <MenuItem key={t.teamId} value={t.teamId}>
                  {t.displayName}
                </MenuItem>
              ))}
            </CustomTextField>

            {teamId ? (
              <CustomTextField
                select
                fullWidth
                label={T.space.teamsChannelLabel}
                value={channelId}
                onChange={e => handleChannelChange(e.target.value)}
                disabled={channelsLoading}
                slotProps={{
                  select: { displayEmpty: true },
                  input: channelsLoading
                    ? { endAdornment: <InputAdornment position='end'><CircularProgress size={14} /></InputAdornment> }
                    : undefined
                }}
                helperText={channelsLoading ? T.space.teamsLoadingChannels : undefined}
              >
                <MenuItem value='' disabled>
                  {T.space.teamsChannelPlaceholder}
                </MenuItem>
                {channels.map(c => (
                  <MenuItem key={c.channelId} value={c.channelId}>
                    {c.displayName}
                  </MenuItem>
                ))}
              </CustomTextField>
            ) : null}

            {selectedTeam && selectedChannel ? (
              <Chip
                icon={<i className='tabler-circle-check' />}
                label={T.space.teamsSelected.replace('{team}', selectedTeam.displayName).replace('{channel}', selectedChannel.displayName)}
                color='success'
                variant='tonal'
                size='small'
                sx={{ alignSelf: 'flex-start', fontWeight: 600 }}
              />
            ) : null}
          </>
        )}
      </Stack>
    </Box>
  )
}
