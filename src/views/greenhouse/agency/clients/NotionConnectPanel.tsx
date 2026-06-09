'use client'

// TASK-998 — Panel de vínculo de teamspace Notion por token scoped (el token ES el
// scope). Flujo: pegar token → "Validar" → Notion search devuelve SOLO las bases de
// ese cliente → auto-clasifica Tareas/Proyectos/Ciclos → operador confirma. La
// provisión real (Secret Manager + space_notion_sources) ocurre al submit del wizard.
//
// Diseño: greenhouse-ux (layout + tokens) + forms-ux (validate-on-click, label arriba,
// estados) + state-design (idle/validating/error/ok honestos) + ux-writing (es-CL).

import { useCallback, useState } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import MenuItem from '@mui/material/MenuItem'
import Collapse from '@mui/material/Collapse'
import Chip from '@mui/material/Chip'
import Link from '@mui/material/Link'
import { alpha, useTheme } from '@mui/material/styles'

import CustomTextField from '@core/components/mui/TextField'

import { GH_CLIENT_ONBOARDING as T } from '@/lib/copy/client-onboarding'
import { NotionIsotype } from '@/components/greenhouse/brand/BrandIsotypes'

export interface NotionConnectSelection {
  token: string
  tareasDbId: string
  proyectosDbId: string
  sprintsDbId: string
}

interface DiscoveredDb {
  databaseId: string
  title: string
  classification: 'tareas' | 'proyectos' | 'sprints' | 'revisiones' | 'otras'
}

type ValidationStatus = 'idle' | 'validating' | 'ok' | 'error'

const NOTION_HOWTO_URL = 'https://www.notion.so/help/create-integrations-with-the-notion-api'

const ROLE_ROWS = [
  { key: 'tareas', label: T.space.notionMapTareas, icon: 'tabler-checklist' },
  { key: 'proyectos', label: T.space.notionMapProyectos, icon: 'tabler-folder' },
  { key: 'sprints', label: T.space.notionMapSprints, icon: 'tabler-rotate-clockwise' }
] as const

type RoleKey = (typeof ROLE_ROWS)[number]['key']

interface NotionConnectPanelProps {
  onChange: (selection: NotionConnectSelection | null) => void
}

export const NotionConnectPanel = ({ onChange }: NotionConnectPanelProps) => {
  const theme = useTheme()

  const [token, setToken] = useState('')
  const [status, setStatus] = useState<ValidationStatus>('idle')
  const [reason, setReason] = useState<string | null>(null)
  const [databases, setDatabases] = useState<DiscoveredDb[]>([])
  const [map, setMap] = useState<Record<RoleKey, string>>({ tareas: '', proyectos: '', sprints: '' })
  const [showOthers, setShowOthers] = useState(false)

  const emit = useCallback(
    (nextMap: Record<RoleKey, string>, tkn: string) => {
      if (nextMap.tareas && nextMap.proyectos && nextMap.sprints) {
        onChange({ token: tkn, tareasDbId: nextMap.tareas, proyectosDbId: nextMap.proyectos, sprintsDbId: nextMap.sprints })
      } else {
        onChange(null)
      }
    },
    [onChange]
  )

  const handleValidate = useCallback(async () => {
    const trimmed = token.trim()

    if (!trimmed) return

    setStatus('validating')
    setReason(null)
    onChange(null)

    try {
      const res = await fetch('/api/admin/clients/lifecycle/notion/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: trimmed })
      })

      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        databases?: DiscoveredDb[]
        suggested?: Partial<Record<RoleKey, string | null>>
        error?: string
      }

      if (!res.ok || !payload.ok) {
        setStatus('error')
        setReason(payload.error ?? T.space.notionTokenRejected)
        setDatabases([])

        return
      }

      const dbs = payload.databases ?? []

      const nextMap: Record<RoleKey, string> = {
        tareas: payload.suggested?.tareas ?? '',
        proyectos: payload.suggested?.proyectos ?? '',
        sprints: payload.suggested?.sprints ?? ''
      }

      setDatabases(dbs)
      setMap(nextMap)
      setStatus('ok')
      emit(nextMap, trimmed)
    } catch {
      setStatus('error')
      setReason(T.space.notionTokenRejected)
      setDatabases([])
    }
  }, [token, onChange, emit])

  const handleMapChange = useCallback(
    (role: RoleKey, dbId: string) => {
      const nextMap = { ...map, [role]: dbId }

      setMap(nextMap)
      emit(nextMap, token.trim())
    },
    [map, token, emit]
  )

  const otherDbs = databases.filter(d => d.classification === 'otras')
  const mapComplete = Boolean(map.tareas && map.proyectos && map.sprints)

  return (
    <Box
      data-capture='notion-connect-panel'
      sx={{
        p: 4,
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.paper
      }}
    >
      <Stack direction='row' spacing={3} alignItems='center' sx={{ mb: 1 }}>
        <NotionIsotype size={32} />
        <Box>
          <Typography variant='body1' sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            {T.space.notionTitle}
          </Typography>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            {T.space.notionSubtitle}
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={3} sx={{ mt: 3 }}>
        <CustomTextField
          fullWidth
          type='password'
          label={T.space.notionTokenLabel}
          value={token}
          onChange={e => {
            setToken(e.target.value)
            if (status !== 'idle') setStatus('idle')
            onChange(null)
          }}
          placeholder={T.space.notionTokenPlaceholder}
          helperText={
            <>
              {T.space.notionTokenHelper}{' '}
              <Link href={NOTION_HOWTO_URL} target='_blank' rel='noopener' sx={{ fontWeight: 600 }}>
                {T.space.notionHowTo}
              </Link>
            </>
          }
          autoComplete='off'
          slotProps={{ htmlInput: { 'data-capture': 'notion-token', spellCheck: false } }}
        />

        <Box>
          <Button
            variant='contained'
            onClick={handleValidate}
            disabled={status === 'validating' || token.trim() === ''}
            startIcon={
              status === 'validating' ? (
                <CircularProgress size={16} color='inherit' />
              ) : (
                <i className='tabler-shield-check' />
              )
            }
          >
            {status === 'validating' ? T.space.notionValidating : T.space.notionValidateCta}
          </Button>
        </Box>

        {status === 'error' && reason ? (
          <Alert severity='error' variant='outlined' sx={{ borderRadius: `${theme.shape.customBorderRadius.sm}px` }}>
            {reason}
          </Alert>
        ) : null}

        {status === 'ok' ? (
          <Stack spacing={3} data-capture='notion-validated'>
            <Stack direction='row' spacing={2} alignItems='center'>
              <Chip
                icon={<i className='tabler-circle-check' />}
                label={T.space.notionValidOk.replace('{n}', String(databases.length))}
                color='success'
                variant='tonal'
                size='small'
                sx={{ fontWeight: 600 }}
              />
            </Stack>

            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              {T.space.notionPickHint}
            </Typography>

            <Stack spacing={2}>
              {ROLE_ROWS.map(row => {
                const selected = map[row.key]

                return (
                  <Stack
                    key={row.key}
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    sx={{
                      p: 2.5,
                      borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                      border: `1px solid ${selected ? alpha(theme.palette.success.main, 0.4) : theme.palette.divider}`,
                      bgcolor: selected ? alpha(theme.palette.success.main, 0.06) : 'transparent'
                    }}
                  >
                    <Stack direction='row' spacing={2} alignItems='center' sx={{ minWidth: 160 }}>
                      <i
                        className={selected ? 'tabler-circle-check-filled' : row.icon}
                        style={{ fontSize: 20, color: selected ? theme.greenhouseSemantic.success.tonalText : theme.palette.text.secondary }}
                        aria-hidden
                      />
                      <Typography variant='body2' sx={{ fontWeight: 600 }}>
                        {row.label}
                      </Typography>
                    </Stack>
                    <CustomTextField
                      select
                      fullWidth
                      value={selected}
                      onChange={e => handleMapChange(row.key, e.target.value)}
                      slotProps={{ select: { displayEmpty: true } }}
                    >
                      <MenuItem value='' disabled>
                        {T.space.notionMapPlaceholder}
                      </MenuItem>
                      {databases.map(db => (
                        <MenuItem key={db.databaseId} value={db.databaseId}>
                          {db.title || db.databaseId}
                        </MenuItem>
                      ))}
                    </CustomTextField>
                  </Stack>
                )
              })}
            </Stack>

            {otherDbs.length > 0 ? (
              <Box>
                <Link
                  component='button'
                  type='button'
                  variant='caption'
                  onClick={() => setShowOthers(v => !v)}
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontWeight: 600 }}
                >
                  <i className={showOthers ? 'tabler-chevron-down' : 'tabler-chevron-right'} style={{ fontSize: 14 }} aria-hidden />
                  {T.space.notionOtherDbs.replace('{n}', String(otherDbs.length))}
                </Link>
                <Collapse in={showOthers}>
                  <Stack direction='row' useFlexGap flexWrap='wrap' spacing={1} sx={{ mt: 2 }}>
                    {otherDbs.map(db => (
                      <Chip key={db.databaseId} label={db.title || db.databaseId} size='small' variant='outlined' />
                    ))}
                  </Stack>
                </Collapse>
              </Box>
            ) : null}

            {!mapComplete ? (
              <Typography variant='caption' sx={{ color: 'warning.main', fontWeight: 600 }}>
                {T.space.notionMapIncomplete}
              </Typography>
            ) : null}
          </Stack>
        ) : null}

        <Stack direction='row' spacing={2} alignItems='flex-start' sx={{ color: 'text.secondary' }}>
          <i className='tabler-lock' style={{ fontSize: 15, marginTop: 2 }} aria-hidden />
          <Typography variant='caption'>{T.space.notionSecretNote}</Typography>
        </Stack>
      </Stack>
    </Box>
  )
}
