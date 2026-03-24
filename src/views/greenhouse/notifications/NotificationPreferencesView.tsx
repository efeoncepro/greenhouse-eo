'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import { NOTIFICATION_CATEGORIES } from '@/config/notification-categories'
import { AUDIENCE_LABELS } from '@/config/notification-ui'

// ── Types ──

interface PreferenceItem {
  category: string
  label: string
  description: string
  inAppEnabled: boolean
  emailEnabled: boolean
}

// ── Component ──

const AUDIENCE_ORDER = ['client', 'collaborator', 'internal', 'admin'] as const

const NotificationPreferencesView = () => {
  const [preferences, setPreferences] = useState<PreferenceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [savedFeedback, setSavedFeedback] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchPreferences = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/notifications/preferences')

      if (res.ok) {
        const data = await res.json()

        setPreferences(data.preferences ?? [])
      }
    } catch {
      // Silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchPreferences() }, [fetchPreferences])

  const handleToggle = (category: string, field: 'inAppEnabled' | 'emailEnabled') => {
    setPreferences(prev => prev.map(p =>
      p.category === category ? { ...p, [field]: !p[field] } : p
    ))

    setSaving(category)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      const pref = preferences.find(p => p.category === category)

      if (!pref) return

      const updated = { ...pref, [field]: !pref[field] }

      try {
        await fetch('/api/notifications/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            preferences: [{
              category,
              inAppEnabled: updated.inAppEnabled,
              emailEnabled: updated.emailEnabled
            }]
          })
        })

        setSavedFeedback(true)
        setTimeout(() => setSavedFeedback(false), 3000)
      } catch {
        void fetchPreferences()
      } finally {
        setSaving(null)
      }
    }, 500)
  }

  // Group preferences by audience
  const grouped = AUDIENCE_ORDER.map(audience => {
    const cats = Object.values(NOTIFICATION_CATEGORIES).filter(c => c.audience === audience)
    const items = cats.map(cat => preferences.find(p => p.category === cat.code)).filter(Boolean) as PreferenceItem[]

    return { audience, label: AUDIENCE_LABELS[audience] || audience, items }
  }).filter(g => g.items.length > 0)

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      {/* Header */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, mb: 6 }}>
        <CardHeader
          title='Preferencias de notificación'
          subheader='Controla qué notificaciones recibes y por qué canal.'
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'secondary.lightOpacity' }}>
              <i className='tabler-settings' style={{ fontSize: 22, color: 'var(--mui-palette-secondary-main)' }} />
            </Avatar>
          }
          action={
            savedFeedback ? (
              <CustomChip
                label='Preferencias actualizadas'
                color='success'
                variant='tonal'
                size='small'
              />
            ) : null
          }
        />
      </Card>

      {/* Preference groups */}
      {grouped.map(group => (
        <Box key={group.audience} sx={{ mb: 6 }}>
          <Typography
            variant='caption'
            sx={{
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'text.secondary',
              fontWeight: 600,
              mb: 2,
              display: 'block'
            }}
          >
            {group.label}
          </Typography>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Categoría</TableCell>
                    <TableCell align='center' sx={{ width: 100 }}>In-app</TableCell>
                    <TableCell align='center' sx={{ width: 100 }}>Email</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {group.items.map(pref => (
                    <TableRow key={pref.category} hover>
                      <TableCell>
                        <Typography variant='body2' fontWeight={600}>{pref.label}</Typography>
                        <Typography variant='caption' color='text.secondary'>{pref.description}</Typography>
                      </TableCell>
                      <TableCell align='center'>
                        <Switch
                          size='small'
                          checked={pref.inAppEnabled}
                          onChange={() => handleToggle(pref.category, 'inAppEnabled')}
                          disabled={saving === pref.category}
                          inputProps={{ 'aria-label': `${pref.label} por in-app` }}
                        />
                      </TableCell>
                      <TableCell align='center'>
                        <Switch
                          size='small'
                          checked={pref.emailEnabled}
                          onChange={() => handleToggle(pref.category, 'emailEnabled')}
                          disabled={saving === pref.category}
                          inputProps={{ 'aria-label': `${pref.label} por email` }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      ))}
    </Box>
  )
}

export default NotificationPreferencesView
