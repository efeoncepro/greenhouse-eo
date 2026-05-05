'use client'

import { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import { HR_LEGAL_COPY } from './copy'
import type { AuditEventDto } from './types'

interface HrAuditLogProps {
  memberId: string
}

const ACTION_ICON: Record<string, { icon: string; color: 'success' | 'warning' | 'error' | 'neutral' }> = {
  declared: { icon: 'tabler-pencil-plus', color: 'neutral' },
  updated: { icon: 'tabler-edit', color: 'neutral' },
  verified: { icon: 'tabler-check', color: 'success' },
  rejected: { icon: 'tabler-x', color: 'error' },
  archived: { icon: 'tabler-archive', color: 'neutral' },
  revealed_sensitive: { icon: 'tabler-eye', color: 'warning' },
  export_snapshot: { icon: 'tabler-file-export', color: 'neutral' }
}

const ACTION_LABEL: Record<string, string> = {
  declared: 'declarado',
  updated: 'actualizado',
  verified: 'verificado',
  rejected: 'rechazado',
  archived: 'archivado',
  revealed_sensitive: 'visto completo',
  export_snapshot: 'usado en documento formal'
}

const formatRelative = (iso: string): string => {
  try {
    const diffMs = Date.now() - new Date(iso).getTime()
    const minutes = Math.floor(diffMs / 60_000)

    if (minutes < 1) return 'recien'
    if (minutes < 60) return `hace ${minutes} min`

    const hours = Math.floor(minutes / 60)

    if (hours < 24) return `hace ${hours}h`

    const days = Math.floor(hours / 24)

    if (days < 30) return `hace ${days}d`

    return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

const HrAuditLog = ({ memberId }: HrAuditLogProps) => {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [events, setEvents] = useState<AuditEventDto[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || events.length > 0) return
    const ac = new AbortController()

    setLoading(true)
    setError(null)
    fetch(`/api/hr/people/${encodeURIComponent(memberId)}/legal-profile/audit-log`, {
      signal: ac.signal,
      cache: 'no-store'
    })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: { events: AuditEventDto[] }) => setEvents(d.events ?? []))
      .catch(e => {
        if (e.name === 'AbortError') return
        setError(e instanceof Error ? e.message : 'Error')
      })
      .finally(() => setLoading(false))

    return () => ac.abort()
  }, [open, memberId, events.length])

  return (
    <Box sx={{ mt: 5 }}>
      <Box
        component='button'
        type='button'
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 3,
          background: theme.palette.background.default,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: theme.shape.customBorderRadius.md,
          color: 'inherit',
          font: 'inherit',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background 150ms cubic-bezier(0.2,0,0,1)',
          '&:hover': { background: alpha(theme.palette.primary.main, 0.04) },
          '&:focus-visible': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 2
          }
        }}
      >
        <Stack direction='row' alignItems='center' spacing={2}>
          <i className='tabler-history' style={{ fontSize: 16 }} aria-hidden='true' />
          <span>
            {HR_LEGAL_COPY.sections.auditLog}
            {events.length > 0 ? ` (${events.length} eventos)` : ''}
          </span>
        </Stack>
        <i
          className='tabler-chevron-down'
          style={{
            fontSize: 16,
            transition: 'transform 200ms cubic-bezier(0.2,0,0,1)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
          aria-hidden='true'
        />
      </Box>

      {open ? (
        <Box sx={{ mt: 3 }}>
          {loading ? (
            <Typography variant='body2' color='text.secondary' sx={{ p: 3 }}>
              Cargando…
            </Typography>
          ) : error ? (
            <Typography variant='body2' color='error' sx={{ p: 3 }}>
              {error}
            </Typography>
          ) : events.length === 0 ? (
            <Typography variant='body2' color='text.secondary' sx={{ p: 3 }}>
              Sin eventos registrados.
            </Typography>
          ) : (
            <Box component='ul' sx={{ listStyle: 'none', m: 0, p: 0 }}>
              {events.map(ev => {
                const meta = ACTION_ICON[ev.action] ?? { icon: 'tabler-point', color: 'neutral' as const }

                const accentColor =
                  meta.color === 'neutral'
                    ? theme.palette.text.secondary
                    : theme.palette[meta.color].main

                const accentBg =
                  meta.color === 'neutral'
                    ? alpha(theme.palette.text.primary, 0.04)
                    : alpha(theme.palette[meta.color].main, 0.12)

                return (
                  <Box
                    key={ev.auditId}
                    component='li'
                    sx={{
                      display: 'flex',
                      gap: 3,
                      py: 2,
                      borderBottom: `1px dashed ${theme.palette.divider}`,
                      '&:last-child': { borderBottom: 'none' }
                    }}
                  >
                    <Box
                      aria-hidden='true'
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: accentBg,
                        color: accentColor,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0
                      }}
                    >
                      <i className={meta.icon} style={{ fontSize: 14 }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant='body2'>
                        <strong>{ev.actorEmail ?? ev.actorUserId ?? 'Sistema'}</strong> ·{' '}
                        {ACTION_LABEL[ev.action] ?? ev.action} (
                        {ev.targetKind === 'document' ? 'documento' : 'direccion'})
                      </Typography>
                      {ev.reason ? (
                        <Typography variant='caption' color='text.secondary' display='block'>
                          {ev.reason}
                        </Typography>
                      ) : null}
                    </Box>
                    <Typography variant='caption' color='text.secondary' sx={{ flexShrink: 0 }}>
                      {formatRelative(ev.createdAt)}
                    </Typography>
                  </Box>
                )
              })}
            </Box>
          )}
        </Box>
      ) : null}
    </Box>
  )
}

export default HrAuditLog
