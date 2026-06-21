'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import LinearProgress from '@mui/material/LinearProgress'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import { GH_PRICING } from '@/lib/copy/pricing'

import DebouncedInput from '@/components/DebouncedInput'
import EmptyState from '@/components/greenhouse/EmptyState'
import CustomChip from '@core/components/mui/Chip'
import useReducedMotion from '@/hooks/useReducedMotion'
import { motion } from '@/libs/FramerMotion'

import SellableItemRow, { type SellableItemVariant } from './SellableItemRow'

export type SellableItemPickerTab = 'roles' | 'people' | 'tools' | 'overhead' | 'services'

export interface SellableSelection {
  tab: SellableItemPickerTab
  sku: string
  label: string
  metadata?: Record<string, unknown>
}

export interface SellableItemPickerDrawerProps {
  open: boolean
  onClose: () => void
  onSelect: (items: SellableSelection[]) => void
  initialTab?: SellableItemPickerTab

  /** SKUs ya agregados en el quote — se renderizan disabled */
  excludeSkus?: string[]

  /** Filtro por línea de negocio (solo aplica a tools y overhead) */
  businessLineCode?: string | null

  /** Endpoint override para testing */
  lookupEndpoint?: string
}

interface LookupResponseItem {
  sku: string
  label: string
  description?: string | null
  category?: string | null
  metadata?: Record<string, unknown>
}

const TAB_TO_LOOKUP_TYPE: Record<SellableItemPickerTab, string> = {
  roles: 'role',
  people: 'person',
  tools: 'tool',
  overhead: 'addon',
  services: 'service'
}

const TAB_TO_ROW_VARIANT: Record<SellableItemPickerTab, SellableItemVariant> = {
  roles: 'role',
  people: 'role',
  tools: 'tool',
  overhead: 'overhead',
  services: 'service'
}

const TABS: Array<{ value: SellableItemPickerTab; label: string }> = [
  { value: 'roles', label: GH_PRICING.pickerTabs.roles },
  { value: 'people', label: GH_PRICING.pickerTabs.people ?? 'Personas' },
  { value: 'tools', label: GH_PRICING.pickerTabs.tools },
  { value: 'overhead', label: GH_PRICING.pickerTabs.overhead },
  { value: 'services', label: GH_PRICING.pickerTabs.services }
]

const SellableItemPickerDrawer = ({
  open,
  onClose,
  onSelect,
  initialTab = 'roles',
  excludeSkus = [],
  businessLineCode = null,
  lookupEndpoint = '/api/finance/quotes/pricing/lookup'
}: SellableItemPickerDrawerProps) => {
  const [activeTab, setActiveTab] = useState<SellableItemPickerTab>(initialTab)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<LookupResponseItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set())
  const prefersReducedMotion = useReducedMotion()

  // Reset state when drawer opens
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab)
      setQuery('')
      setSelectedSkus(new Set())
      setError(null)
    }
  }, [open, initialTab])

  // Fetch items on tab / query / BL change
  useEffect(() => {
    if (!open) return

    const controller = new AbortController()

    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          type: TAB_TO_LOOKUP_TYPE[activeTab],
          query,
          limit: '30'
        })

        if (businessLineCode) params.set('businessLineCode', businessLineCode)

        const response = await fetch(`${lookupEndpoint}?${params}`, { signal: controller.signal })

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string }

          throw new Error(body.error ?? `Lookup failed: HTTP ${response.status}`)
        }

        const payload = (await response.json()) as { items: LookupResponseItem[] }

        if (!controller.signal.aborted) setItems(payload.items)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Lookup failed.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 250)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [open, activeTab, query, businessLineCode, lookupEndpoint])

  const excludedSet = useMemo(() => new Set(excludeSkus), [excludeSkus])

  const handleToggleSelect = useCallback((sku: string) => {
    setSelectedSkus(prev => {
      const next = new Set(prev)

      if (next.has(sku)) next.delete(sku)
      else next.add(sku)

      return next
    })
  }, [])

  const handleSubmit = () => {
    const selections: SellableSelection[] = items
      .filter(item => selectedSkus.has(item.sku))
      .map(item => ({
        tab: activeTab,
        sku: item.sku,
        label: item.label,
        metadata: item.metadata
      }))

    onSelect(selections)
    onClose()
  }

  const selectedCount = selectedSkus.size
  const activeTabLabel = TABS.find(tab => tab.value === activeTab)?.label ?? GH_PRICING.pickerTabs.roles
  const activeTabDescription = GH_PRICING.pickerTabDescriptions[activeTab]

  const selectionHelper =
    selectedCount === 0
      ? GH_PRICING.pickerSelectionHelperNone
      : selectedCount === 1
        ? GH_PRICING.pickerSelectionHelperOne
        : GH_PRICING.pickerSelectionHelperMany(selectedCount)

  const submitLabel = selectedCount > 0 ? GH_PRICING.pickerSubmitCount(selectedCount) : GH_PRICING.pickerSubmit

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: theme => ({
          width: { xs: '100%', sm: 560 },
          maxWidth: '100%',
          backgroundColor: theme.palette.background.default,
          borderLeft: `1px solid ${theme.palette.divider}`
        })
      }}
    >
      <Box
        role='dialog'
        aria-label={GH_PRICING.pickerTitle}
        data-capture='sellable-picker-drawer'
        sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}
      >
        <Box
          sx={theme => ({
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
            p: { xs: 2, sm: 2.5 },
            pb: 1.75,
            backgroundColor: theme.palette.background.paper,
            borderBottom: `1px solid ${theme.palette.divider}`
          })}
        >
          <Stack direction='row' spacing={1.5} alignItems='flex-start' sx={{ minWidth: 0 }}>
            <Box
              aria-hidden='true'
              sx={theme => ({
	                width: 38,
	                height: 38,
                borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: 'primary.main',
                backgroundColor: alpha(theme.palette.primary.main, 0.11),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.24)}`,
                boxShadow: `0 12px 22px -18px ${alpha(theme.palette.primary.main, 0.76)}`
              })}
            >
              <i className='tabler-package-import' aria-hidden='true' style={{ fontSize: 20 }} />
            </Box>
	            <Stack spacing={0.35} sx={{ minWidth: 0 }}>
              <Typography variant='overline' color='text.secondary'>
                {GH_PRICING.pickerEyebrow}
              </Typography>
              <Typography variant='h5'>{GH_PRICING.pickerTitle}</Typography>
              <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 440 }}>
                {GH_PRICING.pickerDescription}
              </Typography>
              {selectedCount > 0 ? (
                <CustomChip
                  round='true'
                  size='small'
                  variant='tonal'
                  color='primary'
                  label={
                    selectedCount === 1
                      ? GH_PRICING.pickerSelectionCountOne(selectedCount)
                      : GH_PRICING.pickerSelectionCountMany(selectedCount)
                  }
                  sx={{ alignSelf: 'flex-start' }}
                />
              ) : null}
            </Stack>
          </Stack>
          <IconButton onClick={onClose} aria-label={GH_PRICING.pickerClose}>
            <i className='tabler-x' aria-hidden='true' />
          </IconButton>
        </Box>

        <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1.25, backgroundColor: 'background.paper' }}>
	          <Stack spacing={1}>
            <DebouncedInput
              value={query}
              onChange={value => setQuery(String(value))}
              placeholder={GH_PRICING.pickerSearchPlaceholder}
              fullWidth
              size='small'
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start' sx={{ mr: 0.75 }}>
                    <i className='tabler-search' aria-hidden='true' style={{ fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position='end' sx={{ display: { xs: 'none', sm: 'flex' } }}>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                      sx={theme => ({
                        px: 0.75,
                        py: 0.35,
                        borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                        border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                        backgroundColor: alpha(theme.palette.background.default, 0.74),
                        lineHeight: 1.1
                      })}
                    >
                      {GH_PRICING.pickerSearchShortcut}
                    </Typography>
                  </InputAdornment>
                )
              }}
              inputProps={{ 'data-capture': 'sellable-picker-search' }}
              sx={theme => ({
                '& .MuiInputBase-root': {
	                  minHeight: 42,
	                  backgroundColor: alpha(theme.palette.background.default, 0.58),
	                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
	                  boxShadow: 'none',
	                  transition: theme.transitions.create(['border-color', 'box-shadow'], {
                    duration: theme.transitions.duration.shortest
                  })
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: alpha(theme.palette.divider, 0.95)
                },
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: alpha(theme.palette.primary.main, 0.38)
                },
                '& .MuiInputBase-root.Mui-focused': {
	                  boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.055)}`
                },
                '@media (prefers-reduced-motion: reduce)': {
                  '& .MuiInputBase-root': { transition: 'none' },
                  '& .MuiInputBase-root.Mui-focused': { transform: 'none' }
                }
              })}
            />
            <Stack direction='row' spacing={1} alignItems='center' useFlexGap flexWrap='wrap'>
              <Typography variant='body2' color='text.secondary'>
                {activeTabDescription}
              </Typography>
              <Divider flexItem orientation='vertical' sx={{ display: { xs: 'none', sm: 'block' } }} />
              <Typography variant='caption' color='text.secondary'>
                {GH_PRICING.pickerSearchHint}
              </Typography>
            </Stack>
          </Stack>
        </Box>

	        <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 1.25, backgroundColor: 'background.paper' }}>
          <Tabs
            value={activeTab}
            onChange={(_, value: SellableItemPickerTab) => setActiveTab(value)}
            variant='scrollable'
            scrollButtons='auto'
            allowScrollButtonsMobile
            aria-label={GH_PRICING.pickerTabsAriaLabel}
            sx={theme => ({
	              minHeight: 38,
	              p: 0.3,
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              backgroundColor: theme.palette.background.default,
              border: `1px solid ${alpha(theme.palette.divider, 0.72)}`,
              '& .MuiTabs-indicator': { display: 'none' },
              '& .MuiTabs-flexContainer': { gap: 0.5 },
              '& .MuiTab-root': {
	                minHeight: 30,
	                px: 1.15,
                borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                border: '1px solid transparent',
                textTransform: 'none',
                color: theme.palette.text.secondary,
                transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow', 'color'], {
                  duration: theme.transitions.duration.shortest
                }),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.045),
                  color: theme.palette.primary.main
                }
              },
              '& .MuiTab-root.Mui-selected': {
                color: theme.palette.primary.main,
                backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.055),
                borderColor: alpha(theme.palette.primary.main, 0.22),
                boxShadow: `0 10px 22px -22px ${alpha(theme.palette.primary.main, 0.8)}`
              }
            })}
          >
            {TABS.map(tab => (
              <Tab key={tab.value} label={tab.label} value={tab.value} />
            ))}
          </Tabs>
        </Box>

        <Box
          sx={theme => ({
            flex: 1,
            overflowY: 'auto',
	            px: { xs: 2, sm: 2.5 },
	            py: 1.25,
            borderTop: `1px solid ${theme.palette.divider}`,
            minWidth: 0
          })}
        >
          {loading ? (
            <Box
              role='status'
              aria-label={GH_PRICING.pickerLoadingAria}
              sx={theme => ({
                overflow: 'hidden',
                borderRadius: `${theme.shape.customBorderRadius.md}px`,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.background.paper
              })}
            >
              <LinearProgress aria-hidden='true' />
              <Stack spacing={2} sx={{ p: 2 }}>
                <Stack direction='row' spacing={1.5} alignItems='center'>
                  <CircularProgress size={22} />
                  <Stack spacing={0.25}>
                    <Typography variant='body1' sx={{ fontWeight: 600 }}>
                      {GH_PRICING.pickerLoadingTitle}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {GH_PRICING.pickerLoadingDescription}
                    </Typography>
                  </Stack>
                </Stack>
                <Stack spacing={1}>
                  {[0, 1, 2].map(item => (
                    <Box
                      key={item}
                      sx={theme => ({
                        display: 'grid',
                        gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1.5,
                        minHeight: 76,
                        borderRadius: `${theme.shape.customBorderRadius.md}px`,
                        border: `1px solid ${theme.palette.divider}`
                      })}
                    >
                      <Skeleton variant='rounded' width={38} height={38} />
                      <Stack spacing={0.75} sx={{ minWidth: 0 }}>
                        <Skeleton variant='text' width='34%' height={16} />
                        <Skeleton variant='text' width='72%' height={22} />
                        <Skeleton variant='text' width='48%' height={16} />
                      </Stack>
                      <Skeleton variant='circular' width={26} height={26} />
                    </Box>
                  ))}
                </Stack>
              </Stack>
            </Box>
          ) : error ? (
            <Box sx={{ py: 4 }} role='alert'>
              <Typography variant='body2' color='error'>
                {error}
              </Typography>
            </Box>
          ) : items.length === 0 ? (
            <EmptyState
              icon='tabler-database-off'
              title={GH_PRICING.pickerEmpty}
              description={activeTab === 'services' ? GH_PRICING.pickerServicesPlaceholder : GH_PRICING.pickerEmptyCta}
            />
          ) : (
            <Stack spacing={1.25}>
              <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={2}>
                <Typography variant='body2' color='text.secondary' role='status'>
                  {GH_PRICING.pickerResultSummary(activeTabLabel, items.length)}
                </Typography>
                {businessLineCode ? (
                  <CustomChip round='true' size='small' variant='tonal' color='primary' label={businessLineCode} />
                ) : null}
              </Stack>
              <Stack
                component={motion.div}
                role='listbox'
                aria-multiselectable='true'
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={prefersReducedMotion ? undefined : { opacity: 1 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                sx={theme => ({
                  overflow: 'hidden',
	                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
	                  border: `1px solid ${alpha(theme.palette.divider, 0.92)}`,
	                  backgroundColor: theme.palette.background.paper,
	                  boxShadow: `0 10px 28px -30px ${alpha(theme.palette.common.black, 0.42)}`
                })}
              >
                {items.map((item, index) => (
                  <Box
                    key={item.sku}
                    component={motion.div}
                    role='presentation'
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                    animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut', delay: Math.min(index, 6) * 0.025 }}
                    sx={theme => ({
                      borderBlockEnd: index === items.length - 1 ? 0 : `1px solid ${alpha(theme.palette.divider, 0.72)}`
                    })}
                  >
                    <SellableItemRow
                      variant={TAB_TO_ROW_VARIANT[activeTab]}
                      sku={item.sku}
                      label={item.label}
                      description={item.description ?? null}
                      category={item.category ?? null}
                      selected={selectedSkus.has(item.sku)}
                      disabled={excludedSet.has(item.sku)}
                      onSelect={handleToggleSelect}
                    />
                  </Box>
                ))}
              </Stack>
            </Stack>
          )}
        </Box>

        <Box
          sx={theme => ({
	            p: { xs: 2, sm: 2.5 },
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) auto' },
            alignItems: 'center',
            gap: 2,
            backgroundColor: theme.palette.background.paper,
            borderTop: `1px solid ${theme.palette.divider}`,
            boxShadow: `0 -18px 34px -34px ${theme.palette.common.black}`
          })}
        >
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Typography variant='body1' sx={{ fontWeight: 600 }}>
              {selectedCount === 0
                ? GH_PRICING.pickerSelectionNone
                : selectedCount === 1
                  ? GH_PRICING.pickerSelectionCountOne(selectedCount)
                  : GH_PRICING.pickerSelectionCountMany(selectedCount)}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {selectionHelper}
            </Typography>
          </Stack>
          <Stack
            direction='row'
            spacing={1}
            justifyContent={{ xs: 'stretch', sm: 'flex-end' }}
            sx={{ minWidth: 0, flexWrap: 'wrap' }}
          >
            <Button variant='outlined' onClick={onClose} sx={{ flex: { xs: '1 1 120px', sm: '0 0 auto' } }}>
              {GH_PRICING.pickerCancel}
            </Button>
            <Button
              variant='contained'
              onClick={handleSubmit}
              disabled={selectedCount === 0}
              startIcon={<i className='tabler-plus' aria-hidden='true' />}
              sx={theme => ({
                flex: { xs: '1 1 150px', sm: '0 1 auto' },
                minWidth: 0,
                '&.Mui-disabled': {
                  color: theme.palette.text.disabled,
                  backgroundColor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.12 : 0.08),
                  boxShadow: 'none'
                }
              })}
            >
              <Box component='span' sx={{ display: { xs: 'none', xl: 'inline' } }}>
                {submitLabel}
              </Box>
              <Box component='span' sx={{ display: { xs: 'inline', xl: 'none' } }}>
                {selectedCount > 0 ? GH_PRICING.pickerSubmitCount(selectedCount) : GH_PRICING.pickerSubmitCompact}
              </Box>
            </Button>
          </Stack>
        </Box>
      </Box>
    </Drawer>
  )
}

export default SellableItemPickerDrawer
