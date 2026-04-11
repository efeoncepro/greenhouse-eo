'use client'

import { useCallback, useEffect, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

import ClientSafeTalentCard, { type ClientSafeTalentProfile } from '@/components/greenhouse/ClientSafeTalentCard'
import { GH_CLIENT_TALENT } from '@/config/greenhouse-nomenclature'

// ── Types ──

interface TeamMember {
  memberId: string
  displayName: string
  roleTitle: string | null
  avatarUrl: string | null
  fteAllocation: number
  hoursMonth: number
  contactChannel: string | null
  contactHandle: string | null
  projectBreakdown: Array<{
    clientName: string
    projectName: string | null
    ftePercent: number
  }>
}

interface TeamData {
  summary: {
    totalMembers: number
    assignedHoursMonth: number
    activeAssets: number
  }
  members: TeamMember[]
}

// ── Helpers ──

const getInitials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

// ── Component ──

const GreenhouseClientTeam = () => {
  const [data, setData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<Map<string, ClientSafeTalentProfile>>(new Map())
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)

    try {
      const [teamRes, profilesRes] = await Promise.all([
        fetch('/api/team/capacity'),
        fetch('/api/team/profiles')
      ])

      if (teamRes.ok) setData(await teamRes.json())

      if (profilesRes.ok) {
        const profilesData = await profilesRes.json()
        const profilesList: ClientSafeTalentProfile[] = profilesData.profiles || profilesData || []
        const profilesMap = new Map<string, ClientSafeTalentProfile>()

        for (const profile of profilesList) {
          profilesMap.set(profile.memberId, profile)
        }

        setProfiles(profilesMap)
      }
    } catch {
      // Silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchData() }, [fetchData])

  if (loading || !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  const totalFte = data.members.reduce((s, m) => s + m.fteAllocation, 0)
  const projectsSet = new Set(data.members.flatMap(m => m.projectBreakdown.map(p => p.projectName || p.clientName)))

  const selectedProfile = selectedMemberId ? profiles.get(selectedMemberId) ?? null : null

  return (
    <>
      <Grid container spacing={6}>
        {/* Header */}
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader
              title='Mi Equipo'
              subheader='Tu equipo asignado de Efeonce'
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
                  <i className='tabler-users' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} />
                </Avatar>
              }
            />
          </Card>
        </Grid>

        {/* KPIs */}
        <Grid size={{ xs: 12, sm: 4 }}>
          <HorizontalWithSubtitle title='Personas' stats={String(data.summary.totalMembers)} avatarIcon='tabler-user' avatarColor='info' subtitle='Asignadas a tu cuenta' />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <HorizontalWithSubtitle title='FTE total' stats={totalFte.toFixed(1)} avatarIcon='tabler-clock' avatarColor='primary' subtitle={`${data.summary.assignedHoursMonth}h/mes`} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <HorizontalWithSubtitle title='Proyectos' stats={String(projectsSet.size)} avatarIcon='tabler-folders' avatarColor='success' subtitle='Cubiertos por el equipo' />
        </Grid>

        {/* Team member cards */}
        {data.members.map(member => {
          const hasProfile = profiles.has(member.memberId)

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={member.memberId}>
              <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, height: '100%' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Identity */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {member.avatarUrl ? (
                      <Avatar src={member.avatarUrl} sx={{ width: 48, height: 48 }} />
                    ) : (
                      <CustomAvatar color='primary' skin='light-static' sx={{ width: 48, height: 48 }}>
                        {getInitials(member.displayName)}
                      </CustomAvatar>
                    )}
                    <Box>
                      <Typography variant='subtitle1' fontWeight={600}>{member.displayName}</Typography>
                      {member.roleTitle && (
                        <CustomChip round='true' size='small' variant='tonal' color='info' label={member.roleTitle} />
                      )}
                    </Box>
                  </Box>

                  <Divider />

                  {/* FTE */}
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant='caption' color='text.secondary'>Dedicacion</Typography>
                      <Typography variant='caption' fontWeight={600}>
                        {Math.round(member.fteAllocation * 100)}% · {member.hoursMonth}h/mes
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant='determinate'
                      value={Math.min(100, member.fteAllocation * 100)}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>

                  {/* Contact */}
                  {member.contactChannel && (
                    <Typography variant='caption' color='text.secondary' sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <i className='tabler-message' style={{ fontSize: 14 }} />
                      {member.contactChannel}: {member.contactHandle || '\u2014'}
                    </Typography>
                  )}

                  {/* Working on */}
                  {member.projectBreakdown.length > 0 && (
                    <Box>
                      <Typography variant='caption' color='text.secondary' sx={{ mb: 0.5, display: 'block' }}>
                        Trabajando en:
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {member.projectBreakdown.slice(0, 3).map((p, i) => (
                          <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant='caption'>{p.projectName || p.clientName}</Typography>
                            <Typography variant='caption' color='text.disabled'>{Math.round(p.ftePercent)}%</Typography>
                          </Box>
                        ))}
                        {member.projectBreakdown.length > 3 && (
                          <Typography variant='caption' color='text.disabled'>
                            +{member.projectBreakdown.length - 3} mas
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}

                  {/* Profile button */}
                  {hasProfile && (
                    <Button
                      variant='outlined'
                      size='small'
                      startIcon={<i className='tabler-id' style={{ fontSize: 16 }} />}
                      onClick={() => setSelectedMemberId(member.memberId)}
                      sx={{
                        mt: 'auto',
                        textTransform: 'none',
                        borderColor: theme => theme.palette.divider,
                        color: 'text.secondary',
                        '&:hover': {
                          borderColor: 'primary.main',
                          color: 'primary.main'
                        }
                      }}
                    >
                      {GH_CLIENT_TALENT.btn_view_profile}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      {/* Profile Dialog */}
      <Dialog
        open={selectedMemberId !== null}
        onClose={() => setSelectedMemberId(null)}
        maxWidth='sm'
        fullWidth
        aria-labelledby='talent-profile-dialog-title'
        closeAfterTransition={false}
      >
        <DialogTitle id='talent-profile-dialog-title' sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography variant='h6' component='span' fontWeight={600}>
            {GH_CLIENT_TALENT.dialog_title}
          </Typography>
          <IconButton
            onClick={() => setSelectedMemberId(null)}
            size='small'
            aria-label='Cerrar'
          >
            <i className='tabler-x' style={{ fontSize: 20 }} />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          {selectedProfile ? (
            <ClientSafeTalentCard profile={selectedProfile} expanded />
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant='body2' color='text.secondary'>
                {GH_CLIENT_TALENT.empty_no_profile}
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default GreenhouseClientTeam
