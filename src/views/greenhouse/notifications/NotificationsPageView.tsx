'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import { NOTIFICATION_CATEGORIES } from '@/config/notification-categories'
import { CATEGORY_ICONS, timeAgo, getTimeGroup } from '@/config/notification-ui'

const GREENHOUSE_COPY = getMicrocopy()

// ── Types ──

interface ApiNotification {
  notification_id: string
  category: string
  title: string
  body: string | null
  action_url: string | null
  icon: string | null
  read_at: string | null
  created_at: string
}

// ── Component ──

const NotificationsPageView = () => {
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [category, setCategory] = useState('')
  const pageSize = 20

  const fetchNotifications = useCallback(async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })

      if (unreadOnly) params.set('unread', 'true')
      if (category) params.set('category', category)

      const res = await fetch(`/api/notifications?${params}`)

      if (res.ok) {
        const data = await res.json()

        setNotifications(data.items ?? [])
        setTotal(data.total ?? 0)
      }
    } catch {
      // Silent
    } finally {
      setLoading(false)
    }
  }, [page, unreadOnly, category])

  useEffect(() => { void fetchNotifications() }, [fetchNotifications])

  const handleMarkAsRead = async (notificationId: string) => {
    setNotifications(prev => prev.map(n =>
      n.notification_id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
    ))

    try {
      await fetch(`/api/notifications/${notificationId}`, { method: 'PATCH' })
    } catch {
      void fetchNotifications()
    }
  }

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })))

    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' })
    } catch {
      void fetchNotifications()
    }
  }

  const handleNotificationClick = (n: ApiNotification) => {
    if (!n.read_at) void handleMarkAsRead(n.notification_id)
    if (n.action_url) window.location.href = n.action_url
  }

  const unreadCount = notifications.filter(n => !n.read_at).length
  const totalPages = Math.ceil(total / pageSize)

  // Group notifications by time
  const grouped = useMemo(() => {
    const groups: Record<string, ApiNotification[]> = {}
    const order = ['Hoy', 'Ayer', 'Esta semana', 'Anteriores']

    for (const n of notifications) {
      const group = getTimeGroup(n.created_at)

      if (!groups[group]) groups[group] = []
      groups[group].push(n)
    }

    return order.filter(g => groups[g]?.length).map(label => ({ label, items: groups[label] }))
  }, [notifications])

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      {/* Header */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, mb: 6 }}>
        <CardHeader
          title='Notificaciones'
          subheader='Historial de notificaciones y alertas'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
              <i className='tabler-bell' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
            </Avatar>
          }
          action={
            <Button
              variant='tonal'
              size='small'
              disabled={unreadCount === 0}
              onClick={handleMarkAllRead}
              startIcon={<i className='tabler-checks' />}
            >
              Marcar todas como leídas
            </Button>
          }
        />
      </Card>

      {/* Filters */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <CustomChip
            label='Todas'
            variant={!unreadOnly ? 'filled' : 'tonal'}
            color='primary'
            onClick={() => { setUnreadOnly(false); setPage(1) }}
            sx={{ cursor: 'pointer' }}
          />
          <CustomChip
            label='Sin leer'
            variant={unreadOnly ? 'filled' : 'tonal'}
            color='primary'
            onClick={() => { setUnreadOnly(true); setPage(1) }}
            sx={{ cursor: 'pointer' }}
          />
        </Box>
        <CustomTextField
          select
          size='small'
          label='Categoría'
          value={category}
          onChange={e => { setCategory(e.target.value); setPage(1) }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value=''>Todas</MenuItem>
          {Object.values(NOTIFICATION_CATEGORIES).map(cat => (
            <MenuItem key={cat.code} value={cat.code}>{cat.label}</MenuItem>
          ))}
        </CustomTextField>
      </Box>

      {/* Notification List */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        {loading ? (
          <Box sx={{ p: 2 }}>
            {[1, 2, 3].map(i => (
              <Skeleton key={i} variant='rectangular' height={72} sx={{ mb: 1, borderRadius: 1 }} />
            ))}
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }} role='status'>
            <i className='tabler-bell-off' style={{ fontSize: 48, color: 'var(--mui-palette-text-disabled)' }} />
            <Typography variant='h6' sx={{ mt: 2 }}>Estás al día</Typography>
            <Typography variant='body2' color='text.secondary'>
              Sin notificaciones pendientes.
            </Typography>
          </Box>
        ) : (
          grouped.map(group => (
            <Box key={group.label}>
              <Box sx={{ px: 4, py: 1.5, bgcolor: 'action.hover' }}>
                <Typography variant='caption' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary', fontWeight: 600 }}>
                  {group.label}
                </Typography>
              </Box>
              {group.items.map((n, idx) => {
                const catConfig = CATEGORY_ICONS[n.category] || { icon: 'tabler-bell', color: 'primary' as const }
                const isUnread = n.read_at === null

                return (
                  <Box
                    key={n.notification_id}
                    onClick={() => handleNotificationClick(n)}
                    sx={{
                      display: 'flex',
                      gap: 3,
                      px: 4,
                      py: 3,
                      cursor: 'pointer',
                      bgcolor: isUnread ? 'primary.lightOpacity' : 'transparent',
                      '&:hover': { bgcolor: 'action.hover' },
                      borderBottom: idx < group.items.length - 1 ? t => `1px solid ${t.palette.divider}` : 'none'
                    }}
                  >
                    <CustomAvatar color={catConfig.color} skin='light-static'>
                      <i className={n.icon || catConfig.icon} />
                    </CustomAvatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: isUnread ? 600 : 400, mb: 0.5 }}
                        color='text.primary'
                      >
                        {n.title}
                      </Typography>
                      {n.body && (
                        <Typography
                          variant='caption'
                          color='text.secondary'
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            mb: 0.5
                          }}
                        >
                          {n.body}
                        </Typography>
                      )}
                      <Typography variant='caption' color='text.disabled'>
                        {timeAgo(n.created_at)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'start', pt: 0.5 }}>
                      {isUnread && (
                        <Badge
                          variant='dot'
                          color='primary'
                          onClick={e => {
                            e.stopPropagation()
                            void handleMarkAsRead(n.notification_id)
                          }}
                          sx={{ cursor: 'pointer' }}
                        />
                      )}
                    </Box>
                  </Box>
                )
              })}
            </Box>
          ))
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 4 }}>
          <Button
            variant='tonal'
            size='small'
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            startIcon={<i className='tabler-chevron-left' />}
          >
            Anterior
          </Button>
          <Typography variant='caption' color='text.secondary'>
            Página {page} de {totalPages}
          </Typography>
          <Button
            variant='tonal'
            size='small'
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            endIcon={<i className='tabler-chevron-right' />}
          >{GREENHOUSE_COPY.actions.next}</Button>
        </Box>
      )}
    </Box>
  )
}

export default NotificationsPageView
