'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'

import { GH_PRICING } from '@/config/greenhouse-nomenclature'

import DebouncedInput from '@/components/DebouncedInput'
import EmptyState from '@/components/greenhouse/EmptyState'

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

    // "services" tab no tiene lookup todavía (TASK-465 lo agrega). Placeholder UX.
    if (activeTab === 'services') {
      setItems([])
      setLoading(false)
      setError(null)

      return
    }

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

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}
    >
      <Box
        role='dialog'
        aria-label={GH_PRICING.pickerTitle}
        sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
          <Typography variant='h6'>{GH_PRICING.pickerTitle}</Typography>
          <IconButton onClick={onClose} aria-label={GH_PRICING.pickerClose}>
            <i className='tabler-x' aria-hidden='true' />
          </IconButton>
        </Box>

        <Tabs
          value={activeTab}
          onChange={(_, value: SellableItemPickerTab) => setActiveTab(value)}
          variant='fullWidth'
          aria-label={GH_PRICING.pickerTabsAriaLabel}
        >
          {TABS.map(tab => (
            <Tab key={tab.value} label={tab.label} value={tab.value} />
          ))}
        </Tabs>

        <Divider />

        {/* Search */}
        <Box sx={{ p: 3 }}>
          <DebouncedInput
            value={query}
            onChange={value => setQuery(String(value))}
            placeholder={GH_PRICING.pickerSearchPlaceholder}
            fullWidth
            size='small'
          />
        </Box>

        {/* Body */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, pb: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }} role='status' aria-label={GH_PRICING.pickerLoadingAria}>
              <CircularProgress size={32} />
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
            <Stack spacing={1}>
              {items.map(item => (
                <SellableItemRow
                  key={item.sku}
                  variant={TAB_TO_ROW_VARIANT[activeTab]}
                  sku={item.sku}
                  label={item.label}
                  description={item.description ?? null}
                  category={item.category ?? null}
                  selected={selectedSkus.has(item.sku)}
                  disabled={excludedSet.has(item.sku)}
                  onSelect={handleToggleSelect}
                />
              ))}
            </Stack>
          )}
        </Box>

        <Divider />

        {/* Footer */}
        <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant='body2' color='text.secondary'>
            {selectedCount === 0
              ? GH_PRICING.pickerSelectionNone
              : selectedCount === 1
                ? GH_PRICING.pickerSelectionCountOne(selectedCount)
                : GH_PRICING.pickerSelectionCountMany(selectedCount)}
          </Typography>
          <Stack direction='row' spacing={1}>
            <Button variant='outlined' onClick={onClose}>
              {GH_PRICING.pickerCancel}
            </Button>
            <Button variant='contained' onClick={handleSubmit} disabled={selectedCount === 0}>
              {GH_PRICING.pickerSubmit}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Drawer>
  )
}

export default SellableItemPickerDrawer
