'use client'

// React Imports
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

// Next Imports
import Link from 'next/link'

// Auth
import { useSession } from 'next-auth/react'

// MUI Imports
import IconButton from '@mui/material/IconButton'
import Popper from '@mui/material/Popper'
import Fade from '@mui/material/Fade'
import Paper from '@mui/material/Paper'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Button from '@mui/material/Button'
import useMediaQuery from '@mui/material/useMediaQuery'
import type { Theme } from '@mui/material/styles'

// Third Party Components
import classnames from 'classnames'
import PerfectScrollbar from 'react-perfect-scrollbar'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'

// Config Imports
import themeConfig from '@configs/themeConfig'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'

// TASK-553 — copy validated by skill greenhouse-ux-writing (es-CL tuteo).
// Lives inline in this single component; promote to src/lib/copy/ if reused.
const COPY = {
  title: 'Accesos rápidos',
  addTitle: 'Agrega un acceso',
  back: 'Volver',
  toggleAria: 'Abrir accesos rápidos',
  addAria: 'Agregar un acceso rápido',
  addTooltip: 'Agregar acceso',
  addTooltipDisabled: 'No quedan accesos para agregar',
  unpinAria: 'Quitar de mis accesos',
  loading: 'Cargando accesos...',
  loadError: 'No pudimos cargar tus accesos. Intenta de nuevo.',
  emptyPinnedHint: 'Agrega accesos con +',
  emptyAvailable: 'Ya agregaste todos los accesos disponibles',
  retry: 'Intentar de nuevo'
} as const

interface ShortcutItem {
  key: string
  label: string
  subtitle: string
  route: string
  icon: string
  module: string
}

interface PinnedItem extends ShortcutItem {
  pinId: string
  displayOrder: number
}

interface ShortcutsResponse {
  recommended: ShortcutItem[]
  available: ShortcutItem[]
  pinned: PinnedItem[]
}

type ViewMode = 'view' | 'add'

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

const ShortcutTile = ({
  shortcut,
  onClick,
  onUnpin,
  isBusy,
  showUnpin
}: {
  shortcut: ShortcutItem
  onClick?: () => void
  onUnpin?: () => void
  isBusy?: boolean
  showUnpin?: boolean
}) => (
  <Box
    sx={{
      position: 'relative',
      bs: '100%',
      '&:hover .gh-shortcut-unpin': { opacity: 1, pointerEvents: 'auto' }
    }}
  >
    <Link
      href={shortcut.route}
      onClick={onClick}
      className='flex items-center flex-col p-6 gap-3 bs-full hover:bg-actionHover'
      style={{ textDecoration: 'none' }}
    >
      <CustomAvatar size={50} className='bg-actionSelected text-textPrimary'>
        <i className={classnames('text-[1.625rem]', shortcut.icon)} />
      </CustomAvatar>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: 0 }}>
        <Typography sx={{ fontWeight: 500, color: 'text.primary' }}>{shortcut.label}</Typography>
        <Typography variant='body2' color='text.secondary'>
          {shortcut.subtitle}
        </Typography>
      </Box>
    </Link>
    {showUnpin && onUnpin ? (
      <Tooltip title={COPY.unpinAria} placement='top'>
        <IconButton
          size='small'
          aria-label={COPY.unpinAria}
          onClick={event => {
            event.preventDefault()
            event.stopPropagation()
            onUnpin()
          }}
          disabled={isBusy}
          className='gh-shortcut-unpin'
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            opacity: 0,
            pointerEvents: 'none',
            transition: theme => theme.transitions.create('opacity'),
            backgroundColor: 'background.paper',
            '&:hover': { backgroundColor: 'action.hover' }
          }}
        >
          <i className='tabler-x text-[1rem]' />
        </IconButton>
      </Tooltip>
    ) : null}
  </Box>
)

const AvailableRow = ({
  shortcut,
  onPick,
  isBusy
}: {
  shortcut: ShortcutItem
  onPick: () => void
  isBusy: boolean
}) => (
  <Button
    onClick={onPick}
    disabled={isBusy}
    fullWidth
    sx={{
      justifyContent: 'flex-start',
      gap: 2,
      px: 2,
      py: 1.5,
      textAlign: 'left',
      color: 'text.primary',
      borderRadius: 0,
      '&:hover': { backgroundColor: 'action.hover' }
    }}
  >
    <CustomAvatar size={32} className='bg-actionSelected text-textPrimary'>
      <i className={classnames('text-[1rem]', shortcut.icon)} />
    </CustomAvatar>
    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
      <Typography variant='body2' sx={{ fontWeight: 500 }}>
        {shortcut.label}
      </Typography>
      <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
        {shortcut.subtitle}
      </Typography>
    </Box>
    <i className='tabler-plus text-[1rem]' style={{ opacity: 0.6 }} />
  </Button>
)

const ShortcutsDropdown = () => {
  // States
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<ViewMode>('view')
  const [data, setData] = useState<ShortcutsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  // Refs
  const anchorRef = useRef<HTMLButtonElement>(null)
  const ref = useRef<HTMLDivElement | null>(null)

  // Hooks
  const { status } = useSession()
  const hidden = useMediaQuery((theme: Theme) => theme.breakpoints.down('lg'))
  const isSmallScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'))
  const { settings } = useSettings()

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(false)

    try {
      const response = await fetch('/api/me/shortcuts', { signal, credentials: 'same-origin' })

      if (!response.ok) {
        throw new Error(`Status ${response.status}`)
      }

      const body = (await response.json()) as ShortcutsResponse

      setData(body)
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        setError(true)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Lazy-load on first open. Avoids fetching for users who never expand.
  useEffect(() => {
    if (!open || data || loading || status !== 'authenticated') {
      return
    }

    const controller = new AbortController()

    refresh(controller.signal)

    return () => controller.abort()
  }, [open, data, loading, status, refresh])

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

  const handleClose = useCallback(() => {
    setOpen(false)

    // Reset mode after closing animation so subsequent opens start clean.
    window.setTimeout(() => setMode('view'), 200)
  }, [])

  const handleToggle = useCallback(() => {
    setOpen(prev => !prev)
  }, [])

  const viewItems: ShortcutItem[] = useMemo(() => {
    if (!data) return []

    return data.pinned.length > 0 ? data.pinned : data.recommended
  }, [data])

  const showingFallback = useMemo(() => Boolean(data && data.pinned.length === 0), [data])

  const addCandidates: ShortcutItem[] = useMemo(() => {
    if (!data) return []

    const pinnedKeys = new Set(data.pinned.map(p => p.key))

    return data.available.filter(s => !pinnedKeys.has(s.key))
  }, [data])

  const canAdd = addCandidates.length > 0

  const handlePin = useCallback(
    async (shortcutKey: string) => {
      setBusyKey(shortcutKey)

      try {
        const response = await fetch('/api/me/shortcuts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shortcutKey }),
          credentials: 'same-origin'
        })

        if (!response.ok) {
          throw new Error(`Status ${response.status}`)
        }

        await refresh()
        setMode('view')
      } catch {
        setError(true)
      } finally {
        setBusyKey(null)
      }
    },
    [refresh]
  )

  const handleUnpin = useCallback(
    async (shortcutKey: string) => {
      setBusyKey(shortcutKey)

      try {
        const response = await fetch(`/api/me/shortcuts/${encodeURIComponent(shortcutKey)}`, {
          method: 'DELETE',
          credentials: 'same-origin'
        })

        if (!response.ok && response.status !== 204) {
          throw new Error(`Status ${response.status}`)
        }

        await refresh()
      } catch {
        setError(true)
      } finally {
        setBusyKey(null)
      }
    },
    [refresh]
  )

  const renderViewMode = () => {
    if (loading && !data) {
      return (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1.5 }}>
          <CircularProgress size={24} />
          <Typography variant='body2' color='text.secondary'>
            {COPY.loading}
          </Typography>
        </Box>
      )
    }

    if (error && !data) {
      return (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1.5, px: 4, textAlign: 'center' }}>
          <Typography variant='body2' color='text.secondary'>
            {COPY.loadError}
          </Typography>
          <Button size='small' onClick={() => refresh()}>
            {COPY.retry}
          </Button>
        </Box>
      )
    }

    if (viewItems.length === 0) {
      return (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: 4 }}>
          <Typography variant='body2' color='text.secondary'>
            {COPY.emptyPinnedHint}
          </Typography>
        </Box>
      )
    }

    return (
      <ScrollWrapper hidden={hidden}>
        {showingFallback ? (
          <Box sx={{ px: 4, pt: 2 }}>
            <Typography variant='caption' color='text.secondary'>
              {COPY.emptyPinnedHint}
            </Typography>
          </Box>
        ) : null}
        <Grid container>
          {viewItems.map(shortcut => (
            <Grid
              size={{ xs: 6 }}
              key={shortcut.key}
              className='[&:not(:last-of-type):not(:nth-last-of-type(2))]:border-be odd:border-ie'
            >
              <ShortcutTile
                shortcut={shortcut}
                onClick={handleClose}
                onUnpin={!showingFallback ? () => handleUnpin(shortcut.key) : undefined}
                isBusy={busyKey === shortcut.key}
                showUnpin={!showingFallback}
              />
            </Grid>
          ))}
        </Grid>
      </ScrollWrapper>
    )
  }

  const renderAddMode = () => {
    if (loading && !data) {
      return (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1.5 }}>
          <CircularProgress size={24} />
        </Box>
      )
    }

    if (addCandidates.length === 0) {
      return (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: 4 }}>
          <Typography variant='body2' color='text.secondary'>
            {COPY.emptyAvailable}
          </Typography>
        </Box>
      )
    }

    return (
      <ScrollWrapper hidden={hidden}>
        <Stack divider={<Divider />}>
          {addCandidates.map(shortcut => (
            <AvailableRow
              key={shortcut.key}
              shortcut={shortcut}
              onPick={() => handlePin(shortcut.key)}
              isBusy={busyKey === shortcut.key}
            />
          ))}
        </Stack>
      </ScrollWrapper>
    )
  }

  return (
    <>
      <IconButton
        ref={anchorRef}
        onClick={handleToggle}
        className='text-textPrimary'
        aria-label={COPY.toggleAria}
      >
        <i className='tabler-layout-grid-add' />
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
              className: 'is-full  !mbs-3 z-[1] max-bs-[517px]',
              modifiers: [
                {
                  name: 'preventOverflow',
                  options: {
                    padding: themeConfig.layoutPadding
                  }
                }
              ]
            }
          : { className: 'is-96  !mbs-3 z-[1] max-bs-[517px]' })}
      >
        {({ TransitionProps, placement }) => (
          <Fade {...TransitionProps} style={{ transformOrigin: placement === 'bottom-end' ? 'right top' : 'left top' }}>
            <Paper className={classnames('bs-full', settings.skin === 'bordered' ? 'border shadow-none' : 'shadow-lg')}>
              <ClickAwayListener onClickAway={handleClose}>
                <div className='bs-full flex flex-col'>
                  <div className='flex items-center justify-between plb-3.5 pli-4 is-full gap-2'>
                    {mode === 'add' ? (
                      <Tooltip title={COPY.back} placement='right'>
                        <IconButton
                          size='small'
                          onClick={() => setMode('view')}
                          aria-label={COPY.back}
                          className='text-textPrimary'
                        >
                          <i className='tabler-arrow-left' />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    <Typography variant='h6' className='flex-auto'>
                      {mode === 'add' ? COPY.addTitle : COPY.title}
                    </Typography>
                    {mode === 'view' ? (
                      <Tooltip
                        title={canAdd ? COPY.addTooltip : COPY.addTooltipDisabled}
                        placement={placement === 'bottom-end' ? 'left' : 'right'}
                      >
                        {/* span wrapper so Tooltip works on disabled IconButton */}
                        <span>
                          <IconButton
                            size='small'
                            className='text-textPrimary'
                            onClick={() => setMode('add')}
                            disabled={!canAdd || loading}
                            aria-label={COPY.addAria}
                          >
                            <i className='tabler-plus' />
                          </IconButton>
                        </span>
                      </Tooltip>
                    ) : null}
                  </div>
                  <Divider />
                  {mode === 'view' ? renderViewMode() : renderAddMode()}
                </div>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  )
}

export default ShortcutsDropdown
