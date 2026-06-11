'use client'

import { useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomTextField from '@core/components/mui/TextField'

import { GH_NEXA } from '@/lib/copy/nexa'
import type { NexaThreadGroup } from '@/lib/nexa/use-nexa-thread-history'
import type { NexaThreadListItem } from '@/lib/nexa/nexa-contract'

import { nexaThinScrollbarSx } from './nexa-scrollbar'

const COPY = GH_NEXA.floating

interface NexaHistoryRailProps {
  groups: NexaThreadGroup[]
  loading: boolean
  error: boolean
  activeThreadId: string | null
  onSelectThread: (threadId: string) => void
  onRefetch: () => void
  onRename: (threadId: string, title: string) => Promise<boolean>
  onRemove: (threadId: string) => Promise<boolean>
}

/* Fila de conversación: interactiva + accesible (teclado/focus/press); activa =
   píldora tintada (patrón de lista de chat, no nav-rail); kebab en hover/focus. */
const ThreadRow = ({
  thread,
  index,
  active,
  onSelect,
  onOpenMenu
}: {
  thread: NexaThreadListItem
  index: number
  active: boolean
  onSelect: () => void
  onOpenMenu: (anchor: HTMLElement, thread: NexaThreadListItem) => void
}) => {
  const theme = useTheme()

  return (
    <Box
      role='button'
      tabIndex={0}
      aria-current={active ? 'true' : undefined}
      onClick={onSelect}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        pl: 1.5,
        pr: 1.25,
        py: 1,
        borderRadius: `${theme.shape.customBorderRadius.sm}px`,
        cursor: 'pointer',
        bgcolor: active ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
        color: active ? 'primary.main' : 'text.primary',
        transition: theme.transitions.create(['background-color', 'transform'], { duration: theme.transitions.duration.shortest }),
        '@keyframes nexa-rail-in': {
          '0%': { opacity: 0, transform: 'translateX(-4px)' },
          '100%': { opacity: 1, transform: 'translateX(0)' }
        },
        animation: `nexa-rail-in 0.22s cubic-bezier(0.2, 0, 0, 1) ${0.03 * index}s both`,
        '&:hover': { bgcolor: active ? alpha(theme.palette.primary.main, 0.14) : 'action.hover' },
        '&:hover .nexa-thread-kebab, &:focus-within .nexa-thread-kebab': { opacity: 1 },
        '&:active': { transform: 'scale(0.99)' },
        '&:focus-visible': { outline: '2px solid var(--mui-palette-primary-main)', outlineOffset: -2 },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none', animation: 'none', '&:active': { transform: 'none' } }
      }}
    >
      <Typography variant='body2' noWrap sx={{ flex: 1, minWidth: 0, fontWeight: active ? 600 : 400 }}>
        {thread.title || 'Conversación'}
      </Typography>
      <IconButton
        className='nexa-thread-kebab'
        size='small'
        aria-label={COPY.rail_actions_aria(thread.title || 'conversación')}
        onClick={e => {
          e.stopPropagation()
          onOpenMenu(e.currentTarget, thread)
        }}
        sx={{
          flexShrink: 0,
          width: 24,
          height: 24,
          color: 'text.secondary',
          opacity: 0,
          transition: theme.transitions.create('opacity', { duration: theme.transitions.duration.shortest }),
          '&:hover': { color: 'text.primary', bgcolor: 'action.selected' },
          '&:focus-visible': { opacity: 1 },
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
        }}
      >
        <i className='tabler-dots' style={{ fontSize: '0.95rem' }} />
      </IconButton>
    </Box>
  )
}

const RailEmptyFirstUse = () => (
  <Stack alignItems='center' spacing={1} sx={{ px: 3, py: 5, textAlign: 'center' }}>
    <i className='tabler-message-circle' style={{ fontSize: '1.5rem', color: 'var(--mui-palette-text-disabled)' }} />
    <Typography variant='body2' sx={{ fontWeight: 600 }}>{COPY.rail_empty_title}</Typography>
    <Typography variant='caption' color='text.secondary' sx={{ lineHeight: 1.5 }}>
      {COPY.rail_empty_body}
    </Typography>
  </Stack>
)

const NexaHistoryRail = ({
  groups,
  loading,
  error,
  activeThreadId,
  onSelectThread,
  onRefetch,
  onRename,
  onRemove
}: NexaHistoryRailProps) => {
  const theme = useTheme()
  const [query, setQuery] = useState('')
  const [menu, setMenu] = useState<{ anchor: HTMLElement; thread: NexaThreadListItem } | null>(null)
  const [renameTarget, setRenameTarget] = useState<NexaThreadListItem | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<NexaThreadListItem | null>(null)

  const q = query.trim().toLowerCase()

  const filteredGroups = useMemo(
    () =>
      groups
        .map(group => ({ ...group, items: group.items.filter(t => !q || (t.title || '').toLowerCase().includes(q)) }))
        .filter(group => group.items.length > 0),
    [groups, q]
  )

  const hasAnyThreads = groups.some(group => group.items.length > 0)
  const hasResults = filteredGroups.length > 0

  const openRename = (thread: NexaThreadListItem) => {
    setRenameTarget(thread)
    setRenameValue(thread.title || '')
    setMenu(null)
  }

  const confirmRename = async () => {
    if (renameTarget) await onRename(renameTarget.threadId, renameValue)
    setRenameTarget(null)
  }

  const confirmDelete = async () => {
    if (deleteTarget) await onRemove(deleteTarget.threadId)
    setDeleteTarget(null)
  }

  return (
    <Stack
      aria-label={GH_NEXA.floating.search_aria}
      sx={{
        width: 272,
        flexShrink: 0,
        // El backdrop-filter rompe el clip redondeado del panel (overflow:hidden) → la
        // esquina inferior-izquierda queda recta. Le damos su propio radio para matchear.
        borderBottomLeftRadius: `${theme.shape.customBorderRadius.lg}px`,
        borderRight: '1px solid',
        borderColor: alpha(theme.palette.common.white, 0.4),
        // Glassmorfismo blanco: capa única translúcida + backdrop-filter (ve la página
        // detrás del panel). Fallback opaco si el navegador no soporta backdrop-filter.
        bgcolor: alpha(theme.palette.common.white, 0.92),
        '@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))': {
          bgcolor: alpha(theme.palette.common.white, 0.68),
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)'
        },
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        // Mismo scrollbar thin + auto-hide que la conversación → sin "doble scroll" chunky.
        ...nexaThinScrollbarSx(theme),
        '@media (prefers-reduced-motion: reduce)': {
          '&::-webkit-scrollbar-thumb': { transition: 'none' }
        }
      }}
    >
      {hasAnyThreads && (
        <Box sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
          <CustomTextField
            fullWidth
            size='small'
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={COPY.search_placeholder}
            aria-label={COPY.search_aria}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <i className='tabler-search' style={{ fontSize: '0.95rem', color: 'var(--mui-palette-text-disabled)' }} />
                  </InputAdornment>
                ),
                endAdornment: query ? (
                  <InputAdornment position='end'>
                    <IconButton size='small' aria-label={COPY.search_clear_aria} onClick={() => setQuery('')} sx={{ width: 22, height: 22 }}>
                      <i className='tabler-x' style={{ fontSize: '0.8rem' }} />
                    </IconButton>
                  </InputAdornment>
                ) : null
              }
            }}
          />
        </Box>
      )}

      {loading && !hasAnyThreads ? (
        <Stack spacing={1} sx={{ px: 2.5, pt: 2 }} aria-label={COPY.rail_loading_aria} aria-busy='true'>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant='rounded' height={36} sx={{ borderRadius: `${theme.shape.customBorderRadius.sm}px` }} />
          ))}
        </Stack>
      ) : error ? (
        <Stack alignItems='center' spacing={1} sx={{ px: 3, py: 5, textAlign: 'center' }}>
          <i className='tabler-cloud-off' style={{ fontSize: '1.5rem', color: 'var(--mui-palette-text-disabled)' }} />
          <Typography variant='body2' sx={{ fontWeight: 600 }}>{COPY.rail_load_error_title}</Typography>
          <Typography variant='caption' color='text.secondary' sx={{ lineHeight: 1.5 }}>{COPY.rail_load_error_body}</Typography>
          <Button size='small' variant='text' onClick={onRefetch}>{COPY.rail_load_error_cta}</Button>
        </Stack>
      ) : !hasAnyThreads ? (
        <RailEmptyFirstUse />
      ) : !hasResults ? (
        <Stack alignItems='center' spacing={0.75} sx={{ px: 3, py: 4, textAlign: 'center' }}>
          <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.5 }}>
            {COPY.rail_filtered_empty(query.trim())}
          </Typography>
          <Button size='small' variant='text' onClick={() => setQuery('')}>{COPY.search_clear}</Button>
        </Stack>
      ) : (
        filteredGroups.map(group => (
          <Box key={group.label} sx={{ px: 2.5, pt: 2, pb: 0.5 }}>
            <Typography
              variant='overline'
              component='div'
              sx={{ px: 1.5, mb: 0.75, color: 'text.disabled', letterSpacing: '0.09em', fontWeight: 600 }}
            >
              {group.label}
            </Typography>
            <Stack role='list' sx={{ gap: 0.25 }}>
              {group.items.map((thread, i) => (
                <ThreadRow
                  key={thread.threadId}
                  thread={thread}
                  index={i}
                  active={thread.threadId === activeThreadId}
                  onSelect={() => onSelectThread(thread.threadId)}
                  onOpenMenu={(anchor, t) => setMenu({ anchor, thread: t })}
                />
              ))}
            </Stack>
          </Box>
        ))
      )}

      <Menu
        anchorEl={menu?.anchor ?? null}
        open={Boolean(menu)}
        onClose={() => setMenu(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => menu && openRename(menu.thread)} sx={{ gap: 1.5 }}>
          <i className='tabler-pencil' style={{ fontSize: '1rem' }} />
          {COPY.rename}
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menu) setDeleteTarget(menu.thread)
            setMenu(null)
          }}
          sx={{ gap: 1.5, color: 'error.main' }}
        >
          <i className='tabler-trash' style={{ fontSize: '1rem' }} />
          {COPY.delete}
        </MenuItem>
      </Menu>

      {/* Rename dialog */}
      <Dialog open={Boolean(renameTarget)} onClose={() => setRenameTarget(null)} fullWidth maxWidth='xs'>
        <DialogTitle>{COPY.rename_dialog_title}</DialogTitle>
        <DialogContent>
          <CustomTextField
            fullWidth
            autoFocus
            label={COPY.rename_field_label}
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void confirmRename()
              }
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button color='secondary' onClick={() => setRenameTarget(null)}>{COPY.rename_cancel}</Button>
          <Button variant='contained' disabled={!renameValue.trim()} onClick={confirmRename}>{COPY.rename_save}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} fullWidth maxWidth='xs'>
        <DialogTitle>{COPY.delete_dialog_title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{COPY.delete_dialog_body(deleteTarget?.title || 'esta conversación')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color='secondary' onClick={() => setDeleteTarget(null)}>{COPY.delete_cancel}</Button>
          <Button variant='contained' color='error' onClick={confirmDelete}>{COPY.delete_confirm}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

export default NexaHistoryRail
