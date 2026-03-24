'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import IconButton from '@mui/material/IconButton'
import Badge from '@mui/material/Badge'
import Popper from '@mui/material/Popper'
import Fade from '@mui/material/Fade'
import Paper from '@mui/material/Paper'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Divider from '@mui/material/Divider'
import useMediaQuery from '@mui/material/useMediaQuery'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import type { Theme } from '@mui/material/styles'

import classnames from 'classnames'
import PerfectScrollbar from 'react-perfect-scrollbar'

import CustomAvatar from '@core/components/mui/Avatar'
import themeConfig from '@configs/themeConfig'
import { useSettings } from '@core/hooks/useSettings'
import { CATEGORY_ICONS, timeAgo } from '@/config/notification-ui'

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

const ScrollWrapper = ({ children, hidden }: { children: ReactNode; hidden: boolean }) => {
  if (hidden) {
    return <div className='overflow-x-hidden bs-full'>{children}</div>
  }

  return (
    <PerfectScrollbar className='bs-full' options={{ wheelPropagation: false, suppressScrollX: true }}>
      {children}
    </PerfectScrollbar>
  )
}

// ── Component ──

const NotificationDropdown = () => {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const anchorRef = useRef<HTMLButtonElement>(null)
  const ref = useRef<HTMLDivElement | null>(null)

  const hidden = useMediaQuery((theme: Theme) => theme.breakpoints.down('lg'))
  const isSmallScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'))
  const { settings } = useSettings()

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/unread-count')

      if (res.ok) {
        const data = await res.json()

        setUnreadCount(data.unreadCount ?? 0)
      }
    } catch {
      // Silent fail — badge just won't update
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/notifications?pageSize=10')

      if (res.ok) {
        const data = await res.json()

        setNotifications(data.items ?? [])
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }, [])

  // Poll unread count every 30s
  useEffect(() => {
    void fetchUnreadCount()
    const interval = setInterval(() => void fetchUnreadCount(), 30_000)

    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  // Fetch full list when dropdown opens
  useEffect(() => {
    if (open) void fetchNotifications()
  }, [open, fetchNotifications])

  const handleToggle = () => setOpen(prev => !prev)
  const handleClose = () => setOpen(false)

  const handleMarkAsRead = async (notificationId: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n =>
      n.notification_id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
    ))
    setUnreadCount(prev => Math.max(0, prev - 1))

    try {
      await fetch(`/api/notifications/${notificationId}`, { method: 'PATCH' })
    } catch {
      // Revert on failure
      void fetchNotifications()
      void fetchUnreadCount()
    }
  }

  const handleMarkAllRead = async () => {
    // Optimistic
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })))
    setUnreadCount(0)

    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' })
    } catch {
      void fetchNotifications()
      void fetchUnreadCount()
    }
  }

  const readAll = notifications.length > 0 && notifications.every(n => n.read_at !== null)

  useEffect(() => {
    const adjustPopoverHeight = () => {
      if (ref.current) {
        const availableHeight = window.innerHeight - 100

        ref.current.style.height = `${Math.min(availableHeight, 550)}px`
      }
    }

    window.addEventListener('resize', adjustPopoverHeight)

    return () => window.removeEventListener('resize', adjustPopoverHeight)
  }, [])

  return (
    <>
      <IconButton ref={anchorRef} onClick={handleToggle} className='text-textPrimary'>
        <Badge
          color='error'
          className='cursor-pointer'
          variant='dot'
          overlap='circular'
          invisible={unreadCount === 0}
          sx={{
            '& .MuiBadge-dot': { top: 6, right: 5, boxShadow: 'var(--mui-palette-background-paper) 0px 0px 0px 2px' }
          }}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <i className='tabler-bell' />
        </Badge>
      </IconButton>
      <Popper
        open={open}
        transition
        disablePortal
        placement='bottom-end'
        ref={ref}
        anchorEl={anchorRef.current}
        {...(isSmallScreen
          ? {
              className: 'is-full !mbs-3 z-[1] max-bs-[550px] bs-[550px]',
              modifiers: [
                {
                  name: 'preventOverflow',
                  options: { padding: themeConfig.layoutPadding }
                }
              ]
            }
          : { className: 'is-96 !mbs-3 z-[1] max-bs-[550px] bs-[550px]' })}
      >
        {({ TransitionProps, placement }) => (
          <Fade {...TransitionProps} style={{ transformOrigin: placement === 'bottom-end' ? 'right top' : 'left top' }}>
            <Paper className={classnames('bs-full', settings.skin === 'bordered' ? 'border shadow-none' : 'shadow-lg')}>
              <ClickAwayListener onClickAway={handleClose}>
                <div className='bs-full flex flex-col'>
                  <div className='flex items-center justify-between plb-3.5 pli-4 is-full gap-2'>
                    <Typography variant='h6' className='flex-auto'>
                      Notificaciones
                    </Typography>
                    {unreadCount > 0 && (
                      <Chip size='small' variant='tonal' color='primary' label={`${unreadCount > 9 ? '9+' : unreadCount} Nuevas`} />
                    )}
                    <Tooltip
                      title={readAll ? 'Marcar como no leídas' : 'Marcar todas como leídas'}
                      placement={placement === 'bottom-end' ? 'left' : 'right'}
                      slotProps={{
                        popper: {
                          sx: {
                            '& .MuiTooltip-tooltip': {
                              transformOrigin:
                                placement === 'bottom-end' ? 'right center !important' : 'right center !important'
                            }
                          }
                        }
                      }}
                    >
                      {notifications.length > 0 ? (
                        <IconButton size='small' onClick={handleMarkAllRead} className='text-textPrimary'>
                          <i className={readAll ? 'tabler-mail' : 'tabler-mail-opened'} />
                        </IconButton>
                      ) : (
                        <></>
                      )}
                    </Tooltip>
                  </div>
                  <Divider />
                  <ScrollWrapper hidden={hidden}>
                    {loading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : notifications.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant='body2' color='text.secondary'>
                          No hay notificaciones nuevas
                        </Typography>
                      </Box>
                    ) : (
                      notifications.map((notification, index) => {
                        const catConfig = CATEGORY_ICONS[notification.category] || { icon: 'tabler-bell', color: 'primary' as const }
                        const isRead = notification.read_at !== null

                        return (
                          <div
                            key={notification.notification_id}
                            className={classnames('flex plb-3 pli-4 gap-3 cursor-pointer hover:bg-actionHover group', {
                              'border-be': index !== notifications.length - 1
                            })}
                            onClick={() => {
                              if (!isRead) void handleMarkAsRead(notification.notification_id)
                              if (notification.action_url) window.location.href = notification.action_url
                            }}
                          >
                            <CustomAvatar color={catConfig.color} skin='light-static'>
                              <i className={notification.icon || catConfig.icon} />
                            </CustomAvatar>
                            <div className='flex flex-col flex-auto'>
                              <Typography variant='body2' className='font-medium mbe-1' color='text.primary'>
                                {notification.title}
                              </Typography>
                              {notification.body && (
                                <Typography variant='caption' color='text.secondary' className='mbe-2'>
                                  {notification.body}
                                </Typography>
                              )}
                              <Typography variant='caption' color='text.disabled'>
                                {timeAgo(notification.created_at)}
                              </Typography>
                            </div>
                            <div className='flex flex-col items-end gap-2'>
                              <Badge
                                variant='dot'
                                color={isRead ? 'secondary' : 'primary'}
                                onClick={e => {
                                  e.stopPropagation()
                                  if (!isRead) void handleMarkAsRead(notification.notification_id)
                                }}
                                className={classnames('mbs-1 mie-1', {
                                  'invisible group-hover:visible': isRead
                                })}
                              />
                            </div>
                          </div>
                        )
                      })
                    )}
                  </ScrollWrapper>
                  <Divider />
                  <div className='p-4'>
                    <Button fullWidth variant='contained' size='small' href='/notifications'>
                      Ver todas las notificaciones
                    </Button>
                  </div>
                </div>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  )
}

export default NotificationDropdown
