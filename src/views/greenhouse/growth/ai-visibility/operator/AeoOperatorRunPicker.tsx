'use client'

import { useMemo, useState } from 'react'

import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import ListItemButton from '@mui/material/ListItemButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'
import { CanonicalApiError, throwIfNotOk } from '@/lib/api/parse-error-response'
import { GH_GROWTH_AEO_OPERATOR } from '@/lib/copy/growth'
import OrgLogoAvatar from './OrgLogoAvatar'

/**
 * TASK-1276 Slice 5 — Subject picker + run operador (nodo S10, cross-sell).
 *
 * Diseño aprobado: mockup Claude Design "AEO Operator View" (panel lateral derecho con targets
 * agrupados por MOTION COMERCIAL — Con AEO / Expansión (cliente sin AEO) / Prospecto (HubSpot
 * sincronizado) — + búsqueda + footer con la máquina de estados del run).
 *
 * El run pasa SOLO por la puerta operador gobernada (`POST /api/admin/growth/ai-visibility/operator-run`
 * → `requestGraderRunAsOperator`, TASK-1277): sin tope, costo atribuido a ventas, capability
 * `growth.ai_visibility.run.operator` gateada en la route. Estados honestos: el motor tarda minutos —
 * tras el 202 el estado es "encolado" con CTA "Ver informe" (el detalle muestra preparando/report real).
 */

const P = GH_GROWTH_AEO_OPERATOR.picker
const R = GH_GROWTH_AEO_OPERATOR.run

export type AeoRunTargetMotion = 'aeo' | 'expansion' | 'new_business'

export interface AeoRunTargetVM {
  organizationId: string
  organizationName: string
  motion: AeoRunTargetMotion
  /** Sub-línea del ítem (publicId, dominio o hint del grupo). */
  subtitle: string | null
  /** Logo real de la org (URL ya resuelta server-side); null = iniciales. */
  logoUrl: string | null
}

export interface AeoOperatorRunPickerProps {
  open: boolean
  onClose: () => void
  targets: AeoRunTargetVM[]
  /** Target preseleccionado (fila "Correr AEO" del cockpit). */
  preselectedId?: string | null
}

type RunPhase = { kind: 'idle' } | { kind: 'submitting' } | { kind: 'queued' } | { kind: 'error'; message: string }

const codeToMessage: Record<string, string> = {
  aeo_profile_required: R.errorProfile,
  aeo_category_unresolved: R.errorCategory,
  aeo_business_model_unconfirmed: R.errorBusinessModel,
  aeo_run_disabled: R.errorDisabled,
  aeo_cost_blocked: R.errorBusy
}

const GROUPS: Array<{ motion: AeoRunTargetMotion; label: string; hint: string; icon: string }> = [
  { motion: 'aeo', label: P.groupAeo, hint: P.groupAeoHint, icon: 'tabler-radar-2' },
  { motion: 'expansion', label: P.groupExpansion, hint: P.groupExpansionHint, icon: 'tabler-trending-up' },
  { motion: 'new_business', label: P.groupProspects, hint: P.groupProspectsHint, icon: 'tabler-user-plus' }
]

const AeoOperatorRunPicker = ({ open, onClose, targets, preselectedId }: AeoOperatorRunPickerProps) => {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [phase, setPhase] = useState<RunPhase>({ kind: 'idle' })

  // La preselección (fila del cockpit) manda al abrir; la selección manual la reemplaza.
  const effectiveSelectedId = selectedId ?? preselectedId ?? null
  const selected = targets.find(t => t.organizationId === effectiveSelectedId) ?? null

  // Search-first para prospectos (feedback del operador: el picker NO es un dump del CRM):
  // clientes (con AEO + expansión) se listan siempre; los prospectos SOLO aparecen buscándolos.
  const q = query.trim().toLowerCase()
  const prospectsTotal = useMemo(() => targets.filter(t => t.motion === 'new_business').length, [targets])

  const filtered = useMemo(() => {
    const base = q.length >= 2 ? targets : targets.filter(t => t.motion !== 'new_business')

    if (!q) return base

    return base.filter(t => t.organizationName.toLowerCase().includes(q))
  }, [targets, q])

  const handleClose = () => {
    setPhase({ kind: 'idle' })
    setSelectedId(null)
    setQuery('')
    onClose()
  }

  const handleRun = async () => {
    if (!selected) return

    setPhase({ kind: 'submitting' })

    try {
      const res = await fetch('/api/admin/growth/ai-visibility/operator-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectOrganizationId: selected.organizationId })
      })

      await throwIfNotOk(res, R.errorGeneric)

      setPhase({ kind: 'queued' })
    } catch (error) {
      const message =
        error instanceof CanonicalApiError
          ? (error.code && codeToMessage[error.code]) || error.message || R.errorGeneric
          : R.errorGeneric

      setPhase({ kind: 'error', message })
    }
  }

  return (
    <Drawer anchor='right' open={open} onClose={handleClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 444 } } } }}>
      <Stack sx={{ height: '100%' }} role='dialog' aria-label={P.title}>
        <Stack
          direction='row'
          spacing={3}
          alignItems='flex-start'
          justifyContent='space-between'
          sx={theme => ({ p: 5, borderBottom: `1px solid ${theme.palette.divider}` })}
        >
          <Stack spacing={0.5}>
            <Typography variant='h5' component='h2'>
              {P.title}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {P.subtitle}
            </Typography>
          </Stack>
          <IconButton size='small' onClick={handleClose} aria-label={P.closeAria}>
            <i className='tabler-x' />
          </IconButton>
        </Stack>

        <Box sx={theme => ({ p: 4, borderBottom: `1px solid ${theme.palette.divider}` })}>
          <CustomTextField
            fullWidth
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={P.searchPlaceholder}
            slotProps={{ input: { startAdornment: <i className='tabler-search' style={{ marginInlineEnd: 8 }} /> } }}
          />
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2 }}>
          {GROUPS.map(group => {
            const items = filtered.filter(t => t.motion === group.motion)

            if (items.length === 0) return null

            return (
              <Stack key={group.motion} spacing={1} sx={{ mb: 3 }}>
                <Stack direction='row' spacing={2} alignItems='center' sx={{ px: 2, pt: 2 }}>
                  <Chip
                    size='small'
                    variant='tonal'
                    color={group.motion === 'aeo' ? 'primary' : group.motion === 'expansion' ? 'info' : 'warning'}
                    icon={<i className={group.icon} />}
                    label={group.label}
                  />
                  <Typography variant='caption' color='text.secondary'>
                    {group.hint}
                  </Typography>
                </Stack>
                <Stack component='ul' role='listbox' aria-label={group.label} spacing={1} sx={{ listStyle: 'none', p: 0, m: 0 }}>
                  {items.map(item => {
                    const isSelected = item.organizationId === effectiveSelectedId

                    return (
                      <ListItemButton
                        key={item.organizationId}
                        component='li'
                        role='option'
                        selected={isSelected}
                        aria-selected={isSelected}
                        onClick={() => {
                          setSelectedId(item.organizationId)
                          setPhase({ kind: 'idle' })
                        }}
                        sx={theme => ({
                          borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                          gap: 3,
                          border: '1px solid',
                          borderColor: isSelected ? 'primary.main' : 'divider'
                        })}
                      >
                        <OrgLogoAvatar name={item.organizationName} logoUrl={item.logoUrl} size={32} />
                        <Stack sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant='body2' sx={{ fontWeight: 600 }} noWrap>
                            {item.organizationName}
                          </Typography>
                          {item.subtitle ? (
                            <Typography variant='caption' color='text.secondary' noWrap>
                              {item.subtitle}
                            </Typography>
                          ) : null}
                        </Stack>
                        {isSelected ? <i className='tabler-circle-check-filled' aria-hidden='true' /> : null}
                      </ListItemButton>
                    )
                  })}
                </Stack>
              </Stack>
            )
          })}
          {filtered.length === 0 ? (
            <Typography variant='body2' color='text.secondary' sx={{ p: 4, textAlign: 'center' }}>
              {P.searchEmpty(query)}
            </Typography>
          ) : null}
          {q.length < 2 && prospectsTotal > 0 ? (
            <Stack direction='row' spacing={1.5} alignItems='center' sx={{ px: 3, py: 2, color: 'text.disabled' }}>
              <i className='tabler-search' aria-hidden='true' style={{ fontSize: 14 }} />
              <Typography variant='caption' color='text.disabled'>
                {P.prospectsSearchHint(prospectsTotal)}
              </Typography>
            </Stack>
          ) : null}
        </Box>

        <Stack spacing={3} sx={theme => ({ p: 4, borderTop: `1px solid ${theme.palette.divider}` })}>
          {phase.kind === 'queued' && selected ? (
            <Stack spacing={2} aria-live='polite'>
              <Stack direction='row' spacing={2} alignItems='center'>
                <i className='tabler-circle-check-filled' aria-hidden='true' style={{ color: 'var(--mui-palette-success-main)' }} />
                <Typography variant='body2' sx={{ fontWeight: 600 }}>
                  {P.queued(selected.organizationName)}
                </Typography>
              </Stack>
              <Button
                fullWidth
                variant='contained'
                endIcon={<i className='tabler-arrow-right' />}
                onClick={() => {
                  handleClose()
                  router.push(`/growth/aeo/${selected.organizationId}`)
                }}
              >
                {P.viewReport}
              </Button>
            </Stack>
          ) : (
            <>
              {phase.kind === 'error' ? (
                <Typography variant='caption' color='error.main' role='alert'>
                  {phase.message}
                </Typography>
              ) : null}
              <Button
                fullWidth
                variant='contained'
                disabled={!selected || phase.kind === 'submitting'}
                startIcon={
                  phase.kind === 'submitting' ? (
                    <CircularProgress size={16} color='inherit' />
                  ) : (
                    <i className='tabler-player-play-filled' />
                  )
                }
                onClick={handleRun}
                aria-label={selected ? P.ctaFor(selected.organizationName) : P.cta}
              >
                {phase.kind === 'submitting' && selected ? P.running(selected.organizationName) : P.cta}
              </Button>
            </>
          )}
          <Stack direction='row' spacing={1.5} alignItems='center' sx={{ color: 'text.disabled' }}>
            <i className='tabler-infinity' aria-hidden='true' style={{ fontSize: 14 }} />
            <Typography variant='caption' color='text.disabled'>
              {P.footerNote}
            </Typography>
          </Stack>
        </Stack>
      </Stack>
    </Drawer>
  )
}

export default AeoOperatorRunPicker
