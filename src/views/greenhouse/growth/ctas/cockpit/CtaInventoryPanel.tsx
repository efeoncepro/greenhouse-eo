'use client'

/**
 * TASK-1430 — inventario master del cockpit: búsqueda + filtros + lista tipo
 * listbox con navegación ↑↓ y cards de selección con rail de acento (mock
 * Claude Design). Cada fila muestra los ejes de la última versión y su señal.
 */
import { useMemo, useRef } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import CustomTextField from '@core/components/mui/TextField'
import EmptyState from '@/components/greenhouse/EmptyState'
import { GreenhouseChip } from '@/components/greenhouse/primitives'
import { GH_GROWTH_CTA_OPERATOR } from '@/lib/copy/growth'
import { surfaceAllowsCtaSlug } from '@/lib/growth/ctas/contracts'
import type { CtaSummaryVm, CtaSurfaceVm } from '@/lib/growth/ctas/readers'

import { ACTION_ICON, CTA_PLACEMENTS, PLACEMENT_ICON, STATUS_TONE, type CtaActionKind, type CtaPlacement } from './cta-cockpit-meta'

const O = GH_GROWTH_CTA_OPERATOR
const I = O.cockpit.inventory

export interface CtaInventoryFilters {
  query: string
  status: string
  placement: string
}

export interface CtaInventoryPanelProps {
  ctas: CtaSummaryVm[]
  surfaces: CtaSurfaceVm[]
  selectedId: string | null
  onSelect: (ctaId: string) => void
  filters: CtaInventoryFilters
  onFiltersChange: (filters: CtaInventoryFilters) => void
  loading: boolean
  loadError: boolean
  onRetry: () => void
}

export const filterCtas = (ctas: CtaSummaryVm[], filters: CtaInventoryFilters): CtaSummaryVm[] => {
  const query = filters.query.trim().toLowerCase()

  return ctas.filter(cta => {
    if (filters.status !== 'all' && (cta.latestVersionStatus ?? 'draft') !== filters.status) return false
    if (filters.placement !== 'all' && cta.latestPlacement !== filters.placement) return false

    if (query) {
      const haystack = `${cta.name} ${cta.slug} ${cta.campaignSlug ?? ''}`.toLowerCase()

      if (!haystack.includes(query)) return false
    }

    return true
  })
}

const CtaInventoryPanel = ({
  ctas,
  surfaces,
  selectedId,
  onSelect,
  filters,
  onFiltersChange,
  loading,
  loadError,
  onRetry,
}: CtaInventoryPanelProps) => {
  const listRef = useRef<HTMLDivElement | null>(null)

  const rows = useMemo(() => filterCtas(ctas, filters), [ctas, filters])
  const filtered = filters.query.trim() !== '' || filters.status !== 'all' || filters.placement !== 'all'

  const moveSelection = (delta: number) => {
    if (rows.length === 0) return

    const currentIndex = rows.findIndex(row => row.ctaId === selectedId)
    const nextIndex = Math.min(rows.length - 1, Math.max(0, currentIndex < 0 ? 0 : currentIndex + delta))

    onSelect(rows[nextIndex].ctaId)
    const options = listRef.current?.querySelectorAll<HTMLElement>('[role="option"]')

    options?.[nextIndex]?.focus()
  }

  return (
    <Stack spacing={3.5} component='section' aria-label={I.listAria} data-capture='cta-inventory' sx={{ minWidth: 0 }}>
      {/* Búsqueda + filtros (wrap en compact: nada colapsa a 0 ni empuja scroll) */}
      <Stack direction='row' gap={2.5} alignItems='center' flexWrap='wrap'>
        <Box sx={{ flex: '2 1 240px', minWidth: 0 }}>
          <CustomTextField
            fullWidth
            placeholder={I.searchPlaceholder}
            value={filters.query}
            onChange={event => onFiltersChange({ ...filters, query: event.target.value })}
            slotProps={{
              input: {
                startAdornment: <i className='tabler-search' style={{ fontSize: 18, marginRight: 8 }} aria-hidden />,
                'aria-label': I.searchAria,
              },
            }}
          />
        </Box>
        <CustomTextField
          select
          value={filters.status}
          onChange={event => onFiltersChange({ ...filters, status: event.target.value })}
          slotProps={{ input: { 'aria-label': I.statusFilterAria } }}
          sx={{ flex: '1 0 150px', maxWidth: { sm: 176 } }}
        >
          <MenuItem value='all'>{I.allStatuses}</MenuItem>
          {Object.entries(O.inventory.statusLabels).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </CustomTextField>
        <CustomTextField
          select
          value={filters.placement}
          onChange={event => onFiltersChange({ ...filters, placement: event.target.value })}
          slotProps={{ input: { 'aria-label': I.placementFilterAria } }}
          sx={{ flex: '1 0 150px', maxWidth: { sm: 176 } }}
        >
          <MenuItem value='all'>{I.allPlacements}</MenuItem>
          {CTA_PLACEMENTS.map(placement => (
            <MenuItem key={placement} value={placement}>
              {O.cockpit.author.placement.kinds[placement]?.label ?? placement}
            </MenuItem>
          ))}
        </CustomTextField>
      </Stack>

      {/* Conteo + hint teclado */}
      <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ px: 0.5 }}>
        <Typography variant='caption' color='text.secondary'>
          {rows.length} {rows.length === 1 ? I.resultOne : I.resultMany} {filtered ? I.resultFiltered : I.resultTotal}
        </Typography>
        <Typography variant='caption' color='text.disabled' sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
          <i className='tabler-keyboard' style={{ fontSize: 14 }} aria-hidden />
          {I.keyboardHint}
        </Typography>
      </Stack>

      {loading ? (
        <Stack spacing={2.5}>
          {[0, 1, 2, 3].map(index => (
            <Skeleton key={index} variant='rounded' height={92} />
          ))}
        </Stack>
      ) : loadError ? (
        <Stack
          spacing={3}
          alignItems='center'
          sx={theme => ({ p: 8, textAlign: 'center', borderRadius: `${theme.shape.customBorderRadius.xl}px`, bgcolor: 'background.paper', boxShadow: theme.greenhouseElevation.raised.boxShadow })}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: theme => `${theme.shape.customBorderRadius.lg}px`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'error.dark',
              bgcolor: theme => alpha(theme.palette.error.main, 0.12),
            }}
          >
            <i className='tabler-cloud-off' style={{ fontSize: 22 }} aria-hidden />
          </Box>
          <Stack spacing={1}>
            <Typography variant='subtitle2'>{I.errorTitle}</Typography>
            <Typography variant='caption' color='text.secondary' sx={{ maxWidth: 340 }}>
              {I.errorBody}
            </Typography>
          </Stack>
          <Button variant='outlined' size='small' startIcon={<i className='tabler-refresh' style={{ fontSize: 16 }} />} onClick={onRetry}>
            {I.retry}
          </Button>
        </Stack>
      ) : rows.length === 0 ? (
        <Box sx={theme => ({ p: 6, borderRadius: `${theme.shape.customBorderRadius.xl}px`, bgcolor: 'background.paper', boxShadow: theme.greenhouseElevation.raised.boxShadow })}>
          <EmptyState icon='tabler-filter-off' title={I.emptyFilteredTitle} description={I.emptyFilteredBody} />
          <Stack alignItems='center' sx={{ mt: 3 }}>
            <Button size='small' variant='outlined' onClick={() => onFiltersChange({ query: '', status: 'all', placement: 'all' })}>
              {I.clearFilters}
            </Button>
          </Stack>
        </Box>
      ) : (
        <Stack
          ref={listRef}
          role='listbox'
          aria-label={I.listAria}
          spacing={2.5}
          onKeyDown={event => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              moveSelection(1)
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              moveSelection(-1)
            }
          }}
        >
          {rows.map(cta => {
            const selected = cta.ctaId === selectedId
            const statusLabel = O.inventory.statusLabels[cta.latestVersionStatus ?? 'draft'] ?? cta.latestVersionStatus ?? '—'
            const placement = (cta.latestPlacement ?? '') as CtaPlacement
            const actionKind = (cta.latestActionKind ?? '') as CtaActionKind
            const boundSurfaces = surfaces.filter(surface => surfaceAllowsCtaSlug(surface.allowedCtaSlugs, cta.slug))

            return (
              <Box
                key={cta.ctaId}
                component='button'
                type='button'
                role='option'
                aria-selected={selected}
                onClick={() => onSelect(cta.ctaId)}
                sx={theme => ({
                  position: 'relative',
                  textAlign: 'left',
                  cursor: 'pointer',
                  font: 'inherit',
                  borderRadius: `${theme.shape.customBorderRadius.xl}px`,
                  p: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  bgcolor: selected ? alpha(theme.palette.primary.main, 0.04) : theme.palette.background.paper,
                  // Elevation SoT (TASK-1049): reposo plano/outlined; `raised` SOLO como lift de hover.
                  border: selected ? `1.5px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
                  boxShadow: theme.greenhouseElevation.none.boxShadow,
                  transition: theme.transitions.create(['box-shadow', 'border-color', 'background-color'], { duration: 150 }),
                  '&:hover': { boxShadow: theme.greenhouseElevation.raised.boxShadow },
                  '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
                })}
              >
                {selected ? (
                  <Box
                    aria-hidden
                    sx={{
                      position: 'absolute',
                      left: 0,
                      top: 12,
                      bottom: 12,
                      width: 3,
                      borderRadius: '0 3px 3px 0',
                      bgcolor: 'primary.main',
                    }}
                  />
                ) : null}
                <Stack direction='row' alignItems='flex-start' justifyContent='space-between' gap={3}>
                  <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                    <Typography variant='subtitle2' noWrap>
                      {cta.name}
                    </Typography>
                    <Typography variant='monoId' color='text.disabled' noWrap>
                      {cta.slug} · v{cta.latestVersion ?? 1}
                    </Typography>
                  </Stack>
                  <GreenhouseChip
                    kind='status'
                    size='small'
                    tone={STATUS_TONE[cta.latestVersionStatus ?? 'draft'] ?? 'default'}
                    label={statusLabel}
                  />
                </Stack>
                <Stack direction='row' alignItems='center' gap={2} flexWrap='wrap'>
                  {cta.latestPlacement ? (
                    <Typography variant='caption' color='text.secondary' sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                      <i className={PLACEMENT_ICON[placement] ?? 'tabler-layout-grid'} style={{ fontSize: 14 }} aria-hidden />
                      {O.cockpit.author.placement.kinds[placement]?.label ?? cta.latestPlacement}
                    </Typography>
                  ) : null}
                  {cta.latestActionKind ? (
                    <>
                      <Box component='span' aria-hidden sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'divider' }} />
                      <Typography variant='caption' color='text.secondary' sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                        <i className={ACTION_ICON[actionKind] ?? 'tabler-click'} style={{ fontSize: 14 }} aria-hidden />
                        {O.cockpit.author.action.kinds[actionKind]?.label ?? cta.latestActionKind}
                      </Typography>
                    </>
                  ) : null}
                  <Box component='span' aria-hidden sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'divider' }} />
                  <Typography variant='caption' color='text.secondary' sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                    <i className='tabler-world' style={{ fontSize: 14 }} aria-hidden />
                    {boundSurfaces.length > 0 ? boundSurfaces.map(surface => surface.surfaceName).join(' · ') : I.noSurface}
                  </Typography>
                </Stack>
              </Box>
            )
          })}
        </Stack>
      )}
    </Stack>
  )
}

export default CtaInventoryPanel
