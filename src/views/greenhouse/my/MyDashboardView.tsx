'use client'

import { useCallback, useEffect, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

import { CATEGORY_ICONS, timeAgo } from '@/config/notification-ui'

interface DashboardData {
  runtime: {
    displayName: string
    avatarUrl: string | null
    jobTitle: string | null
    departmentName: string | null
    operational: { tasksCompleted: number; tasksActive: number; rpaAvg: number | null; otdPct: number | null } | null
  } | null
  hr: {
    leave: { vacationAvailable: number } | null
    assignments: Array<{ clientId: string }>
  } | null
}

interface NotifItem {
  notification_id: string
  category: string
  title: string
  body: string | null
  created_at: string
}

const pct = (v: number | null) => v != null ? `${Math.round(v)}%` : '—'

const MyDashboardView = () => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [notifs, setNotifs] = useState<NotifItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const [dashRes, notifRes] = await Promise.allSettled([
        fetch('/api/my/dashboard'),
        fetch('/api/notifications?pageSize=5')
      ])

      if (dashRes.status === 'fulfilled' && dashRes.value.ok) setData(await dashRes.value.json())
      if (notifRes.status === 'fulfilled' && notifRes.value.ok) {
        const nd = await notifRes.value.json()

        setNotifs(nd.items ?? [])
      }
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
  }

  const r = data?.runtime
  const hr = data?.hr
  const assignmentCount = hr?.assignments?.length ?? 0
  const vacDays = hr?.leave?.vacationAvailable ?? 0

  return (
    <Grid container spacing={6}>
      {/* Hero */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {r?.avatarUrl ? (
              <Avatar src={r.avatarUrl} sx={{ width: 64, height: 64 }} />
            ) : (
              <CustomAvatar color='primary' skin='light-static' sx={{ width: 64, height: 64, fontSize: 24 }}>
                {(r?.displayName || 'G')[0]}
              </CustomAvatar>
            )}
            <Box>
              <Typography variant='h5'>{r?.displayName || 'Colaborador'}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {[r?.jobTitle, r?.departmentName].filter(Boolean).join(' · ') || 'Efeonce Team'}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* KPIs */}
      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <HorizontalWithSubtitle title='Clientes' stats={String(assignmentCount)} avatarIcon='tabler-building' avatarColor='primary' subtitle='Asignaciones activas' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <HorizontalWithSubtitle title='Tasks activas' stats={String(r?.operational?.tasksActive ?? 0)} avatarIcon='tabler-list-check' avatarColor='info' subtitle='En progreso' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <HorizontalWithSubtitle title='OTD' stats={pct(r?.operational?.otdPct ?? null)} avatarIcon='tabler-clock-check' avatarColor={(r?.operational?.otdPct ?? 0) >= 80 ? 'success' : 'warning'} subtitle='A tiempo' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <HorizontalWithSubtitle title='RPA' stats={r?.operational?.rpaAvg != null ? r.operational.rpaAvg.toFixed(1) : '—'} avatarIcon='tabler-chart-line' avatarColor={(r?.operational?.rpaAvg ?? 99) <= 1.5 ? 'success' : 'warning'} subtitle='Rendimiento' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <HorizontalWithSubtitle title='Vacaciones' stats={String(vacDays)} avatarIcon='tabler-beach' avatarColor='info' subtitle='Días disponibles' />
      </Grid>

      {/* Notifications */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader title='Últimas notificaciones' avatar={<Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}><i className='tabler-bell' style={{ fontSize: 20, color: 'var(--mui-palette-info-main)' }} /></Avatar>} />
          <Divider />
          <CardContent>
            {notifs.length === 0 ? (
              <Typography variant='body2' color='text.secondary' textAlign='center' py={2}>Sin notificaciones recientes</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {notifs.map(n => {
                  const cat = CATEGORY_ICONS[n.category] || { icon: 'tabler-bell', color: 'primary' as const }

                  return (
                    <Box key={n.notification_id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <CustomAvatar color={cat.color} skin='light-static' size={28}>
                        <i className={cat.icon} style={{ fontSize: 14 }} />
                      </CustomAvatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant='body2' noWrap>{n.title}</Typography>
                      </Box>
                      <Typography variant='caption' color='text.disabled' sx={{ whiteSpace: 'nowrap' }}>
                        {timeAgo(n.created_at)}
                      </Typography>
                    </Box>
                  )
                })}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default MyDashboardView
