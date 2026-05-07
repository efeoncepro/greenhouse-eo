'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { toast } from 'sonner'

import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Radio from '@mui/material/Radio'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Tab from '@mui/material/Tab'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { TabContext, TabList, TabPanel } from '@mui/lab'

import { getMicrocopy } from '@/lib/copy'

import ImpactPreviewPanel from '@/components/greenhouse/pricing/ImpactPreviewPanel'
import { GH_PRICING_GOVERNANCE } from '@/lib/copy/pricing'
import { formatCurrency, formatNumber } from '@/lib/format'

import CustomTextField from '@core/components/mui/TextField'

import {
  PRICING_TIER_CODES,
  PRICING_TIER_LABELS,
  type PricingTierCode
} from '@/lib/commercial/pricing-governance-types'

const TASK407_ARIA_SECCIONES_DEL_ROL = "Secciones del rol"


const GREENHOUSE_COPY = getMicrocopy()

// Inline para evitar importar `sellable-roles-seed.ts` que depende de node:fs/promises.
// Las 6 monedas están alineadas con `PricingOutputCurrency` del engine v2 (TASK-464d).
const SELLABLE_ROLE_PRICING_CURRENCIES = ['USD', 'CLP', 'CLF', 'COP', 'MXN', 'PEN'] as const

type SellableRolePricingCurrency = (typeof SELLABLE_ROLE_PRICING_CURRENCIES)[number]

// ── Types ──────────────────────────────────────────────────────────────

type Category = 'creativo' | 'pr' | 'performance' | 'consultoria' | 'tech'

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'creativo', label: 'Creativo' },
  { value: 'pr', label: 'PR' },
  { value: 'performance', label: 'Performance' },
  { value: 'consultoria', label: 'Consultoría' },
  { value: 'tech', label: 'Tech' }
]

interface SellableRoleItem {
  roleId: string
  roleSku: string
  roleCode: string
  roleLabelEs: string
  roleLabelEn: string | null
  category: string
  tier: string
  tierLabel: string
  canSellAsStaff: boolean
  canSellAsServiceComponent: boolean
  active: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface CostComponentItem {
  roleId: string
  employmentTypeCode: string
  effectiveFrom: string
  baseSalaryUsd: number
  bonusJitUsd: number
  bonusRpaUsd: number
  bonusArUsd: number
  bonusSobrecumplimientoUsd: number
  gastosPrevisionalesUsd: number
  feeDeelUsd: number
  feeEorUsd: number
  hoursPerFteMonth: number
  directOverheadPct?: number | null
  sharedOverheadPct?: number | null
  directOverheadAmountUsd?: number | null
  sharedOverheadAmountUsd?: number | null
  totalMonthlyCostUsd: number | null
  hourlyCostUsd: number | null
  loadedMonthlyCostUsd?: number | null
  loadedHourlyCostUsd?: number | null
  sourceKind?: string | null
  sourceRef?: string | null
  confidenceScore?: number | null
  confidenceLabel?: string | null
  notes: string | null
  createdAt: string
}

interface PricingItem {
  roleId: string
  currencyCode: string
  effectiveFrom: string
  marginPct: number
  hourlyPrice: number
  fteMonthlyPrice: number
  notes: string | null
  createdAt: string
}

interface EmploymentTypeOption {
  code: string
  label: string
  country: string | null
}

interface CompatibilityApiItem {
  roleId: string
  employmentTypeCode: string
  isDefault: boolean
  allowed: boolean
  notes: string | null
  createdAt: string
  employmentType: {
    employmentTypeCode: string
    labelEs: string
    labelEn: string | null
    paymentCurrency: string
    countryCode: string
  } | null
}

interface CompatibilityRow {
  employmentTypeCode: string
  labelEs: string
  countryCode: string
  paymentCurrency: string
  allowed: boolean
  isDefault: boolean
  notes: string
}

interface PricingRowInput {
  currencyCode: SellableRolePricingCurrency
  marginPct: string
  hourlyPrice: string
  fteMonthlyPrice: string
}

interface EditSellableRoleDrawerProps {
  open: boolean
  roleId: string | null
  onClose: () => void
  onSuccess?: () => void
}

type TabValue = 'info' | 'employment' | 'cost' | 'pricing'

// ── Helpers ────────────────────────────────────────────────────────────

const todayIso = (): string => new Date().toISOString().slice(0, 10)

const fmtUsd = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'

  return formatCurrency(value, 'USD', {}, 'en-US')
}

const fmtPct = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'

  return `${(value * 100).toFixed(1)}%`
}

const fmtPrice = (value: number | null | undefined, currency: string): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  const digits = currency === 'CLP' || currency === 'COP' ? 0 : 2

  return `${currency} ${formatNumber(value, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }, 'en-US')}`
}

const fmtDate = (value: string): string => {
  if (!value) return '—'

  return value.slice(0, 10)
}

const formatSourceKindLabel = (value: string | null | undefined): string | null => {
  if (!value) return null

  const explicitLabels: Record<string, string> = {
    catalog_seed: 'Semilla de catalogo',
    admin_manual: 'Carga manual',
    payroll_bridge: 'Bridge payroll',
    modeled_formula: 'Modelo derivado',
    backfill: 'Backfill',
    role_modeled: 'Modelo por rol',
    hybrid_modeled: 'Modelo híbrido',
    people_blended: 'Blend de personas',
    member_actual: 'Costo real',
    member_capacity_economics: 'Capacidad real'
  }

  if (explicitLabels[value]) return explicitLabels[value]

  return value
    .split('_')
    .filter(Boolean)
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')
}

const getConfidenceMeta = (value: string | null | undefined) => {
  switch (value) {
    case 'high':
      return { label: 'Alta', color: 'success' as const }
    case 'medium':
      return { label: 'Media', color: 'warning' as const }
    case 'low':
      return { label: 'Baja', color: 'default' as const }
    default:
      return null
  }
}

const hasLoadedCosts = (item: CostComponentItem) =>
  Number.isFinite(item.loadedMonthlyCostUsd) || Number.isFinite(item.loadedHourlyCostUsd)

const getOverheadSummary = (item: CostComponentItem) => {
  const parts: string[] = []

  if (item.directOverheadPct != null || item.directOverheadAmountUsd != null) {
    parts.push(
      `Directo ${fmtPct(item.directOverheadPct)}${item.directOverheadAmountUsd != null ? ` (${fmtUsd(item.directOverheadAmountUsd)})` : ''}`
    )
  }

  if (item.sharedOverheadPct != null || item.sharedOverheadAmountUsd != null) {
    parts.push(
      `Compartido ${fmtPct(item.sharedOverheadPct)}${item.sharedOverheadAmountUsd != null ? ` (${fmtUsd(item.sharedOverheadAmountUsd)})` : ''}`
    )
  }

  return parts.length > 0 ? parts.join(' · ') : null
}

// ── Component ──────────────────────────────────────────────────────────

const EditSellableRoleDrawer = ({ open, roleId, onClose, onSuccess }: EditSellableRoleDrawerProps) => {
  const [tab, setTab] = useState<TabValue>('info')

  // Loaders
  const [loadingRole, setLoadingRole] = useState(false)
  const [role, setRole] = useState<SellableRoleItem | null>(null)
  const [roleError, setRoleError] = useState<string | null>(null)

  // Info tab form state
  const [roleLabelEs, setRoleLabelEs] = useState('')
  const [roleLabelEn, setRoleLabelEn] = useState('')
  const [category, setCategory] = useState<Category>('creativo')
  const [tier, setTier] = useState<PricingTierCode>('2')
  const [canSellAsStaff, setCanSellAsStaff] = useState(false)
  const [canSellAsServiceComponent, setCanSellAsServiceComponent] = useState(true)
  const [active, setActive] = useState(true)
  const [notes, setNotes] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)
  const [infoError, setInfoError] = useState<string | null>(null)
  const [impactBlocking, setImpactBlocking] = useState(false)

  // Employment tab
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentTypeOption[]>([])
  const [loadingEmploymentTypes, setLoadingEmploymentTypes] = useState(false)

  // Compatibility tab — editable state
  const [compatibility, setCompatibility] = useState<CompatibilityRow[]>([])
  const [compatibilityLoaded, setCompatibilityLoaded] = useState(false)
  const [loadingCompatibility, setLoadingCompatibility] = useState(false)
  const [compatibilityError, setCompatibilityError] = useState<string | null>(null)
  const [savingCompatibility, setSavingCompatibility] = useState(false)
  const [addCompatOpen, setAddCompatOpen] = useState(false)
  const [addCompatValue, setAddCompatValue] = useState<EmploymentTypeOption | null>(null)

  // Cost components tab
  const [costItems, setCostItems] = useState<CostComponentItem[]>([])
  const [loadingCost, setLoadingCost] = useState(false)
  const [costError, setCostError] = useState<string | null>(null)
  const [costFormOpen, setCostFormOpen] = useState(false)

  const [costForm, setCostForm] = useState({
    employmentTypeCode: '',
    effectiveFrom: todayIso(),
    baseSalaryUsd: '',
    bonusJitUsd: '',
    bonusRpaUsd: '',
    bonusArUsd: '',
    bonusSobrecumplimientoUsd: '',
    gastosPrevisionalesUsd: '',
    feeDeelUsd: '',
    feeEorUsd: '',
    hoursPerFteMonth: '180',
    directOverheadPct: '',
    sharedOverheadPct: '',
    notes: ''
  })

  const [savingCost, setSavingCost] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Pricing tab
  const [pricingItems, setPricingItems] = useState<PricingItem[]>([])
  const [loadingPricing, setLoadingPricing] = useState(false)
  const [pricingError, setPricingError] = useState<string | null>(null)
  const [pricingFormOpen, setPricingFormOpen] = useState(false)
  const [pricingEffectiveFrom, setPricingEffectiveFrom] = useState(todayIso())

  const [pricingRows, setPricingRows] = useState<PricingRowInput[]>([
    { currencyCode: 'USD', marginPct: '', hourlyPrice: '', fteMonthlyPrice: '' }
  ])

  const [savingPricing, setSavingPricing] = useState(false)

  // ── Reset when drawer closes ────────────────────────────────────────

  const resetAll = useCallback(() => {
    setTab('info')
    setRole(null)
    setRoleError(null)
    setInfoError(null)
    setCostError(null)
    setPricingError(null)
    setCostFormOpen(false)
    setPricingFormOpen(false)
    setCostItems([])
    setPricingItems([])
    setExpandedGroups(new Set())
    setCompatibility([])
    setCompatibilityLoaded(false)
    setCompatibilityError(null)
    setAddCompatOpen(false)
    setAddCompatValue(null)
  }, [])

  const handleClose = useCallback(() => {
    resetAll()
    onClose()
  }, [onClose, resetAll])

  // ── Load role + hydrate info form ────────────────────────────────────

  useEffect(() => {
    if (!open || !roleId) return

    let cancelled = false

    const loadRole = async () => {
      setLoadingRole(true)
      setRoleError(null)

      try {
        const res = await fetch('/api/admin/pricing-catalog/roles')

        if (!res.ok) {
          if (!cancelled) setRoleError(`No pudimos cargar el rol (HTTP ${res.status}).`)

          return
        }

        const payload = (await res.json()) as { items: SellableRoleItem[] }
        const found = payload.items.find(r => r.roleId === roleId)

        if (!found) {
          if (!cancelled) setRoleError('No encontramos este rol en el catálogo.')

          return
        }

        if (cancelled) return

        setRole(found)
        setRoleLabelEs(found.roleLabelEs)
        setRoleLabelEn(found.roleLabelEn ?? '')
        setCategory((found.category as Category) ?? 'creativo')
        setTier(((found.tier as PricingTierCode) ?? '2'))
        setCanSellAsStaff(found.canSellAsStaff)
        setCanSellAsServiceComponent(found.canSellAsServiceComponent)
        setActive(found.active)
        setNotes(found.notes ?? '')
      } catch {
        if (!cancelled) setRoleError('No se pudo conectar al servidor. Verifica tu conexión.')
      } finally {
        if (!cancelled) setLoadingRole(false)
      }
    }

    void loadRole()

    return () => {
      cancelled = true
    }
  }, [open, roleId])

  // ── Load employment types (once per open) ────────────────────────────

  useEffect(() => {
    if (!open) return

    let cancelled = false

    const loadTypes = async () => {
      setLoadingEmploymentTypes(true)

      try {
        const res = await fetch('/api/finance/quotes/pricing/lookup?type=employment_type&limit=50')

        if (!res.ok) return

        const payload = (await res.json()) as {
          items: { sku: string; label: string; category: string | null }[]
        }

        if (cancelled) return

        setEmploymentTypes(
          payload.items.map(item => ({
            code: item.sku,
            label: item.label,
            country: item.category
          }))
        )
      } catch {
        // silent — UI shows empty list
      } finally {
        if (!cancelled) setLoadingEmploymentTypes(false)
      }
    }

    void loadTypes()

    return () => {
      cancelled = true
    }
  }, [open])

  // ── Load cost components when tab is activated ───────────────────────

  const loadCostComponents = useCallback(async () => {
    if (!roleId) return

    setLoadingCost(true)
    setCostError(null)

    try {
      const res = await fetch(`/api/admin/pricing-catalog/roles/${roleId}/cost-components`)

      if (!res.ok) {
        setCostError(`No pudimos cargar los componentes de costo (HTTP ${res.status}).`)

        return
      }

      const payload = (await res.json()) as { items: CostComponentItem[] }

      setCostItems(payload.items)
    } catch {
      setCostError('No se pudo conectar al servidor. Verifica tu conexión.')
    } finally {
      setLoadingCost(false)
    }
  }, [roleId])

  useEffect(() => {
    if (open && roleId && tab === 'cost') void loadCostComponents()
  }, [open, roleId, tab, loadCostComponents])

  // ── Load pricing when tab is activated ───────────────────────────────

  const loadPricing = useCallback(async () => {
    if (!roleId) return

    setLoadingPricing(true)
    setPricingError(null)

    try {
      const res = await fetch(`/api/admin/pricing-catalog/roles/${roleId}/pricing`)

      if (!res.ok) {
        setPricingError(`No pudimos cargar el pricing por moneda (HTTP ${res.status}).`)

        return
      }

      const payload = (await res.json()) as { items: PricingItem[] }

      setPricingItems(payload.items)
    } catch {
      setPricingError('No se pudo conectar al servidor. Verifica tu conexión.')
    } finally {
      setLoadingPricing(false)
    }
  }, [roleId])

  useEffect(() => {
    if (open && roleId && tab === 'pricing') void loadPricing()
  }, [open, roleId, tab, loadPricing])

  const guardImpactBlocking = () => {
    if (!impactBlocking) return false

    toast.error(GH_PRICING_GOVERNANCE.impactPreview.blockingSaveToast)

    return true
  }

  // ── Info tab submit ──────────────────────────────────────────────────

  const handleSaveInfo = async () => {
    if (!roleId || !role) return
    if (guardImpactBlocking()) return

    if (!roleLabelEs.trim()) {
      setInfoError('Ingresa un nombre para el rol en español.')

      return
    }

    if (!canSellAsStaff && !canSellAsServiceComponent) {
      setInfoError('Selecciona al menos una forma de venta (staff o componente de servicio).')

      return
    }

    setSavingInfo(true)
    setInfoError(null)

    try {
      const res = await fetch(`/api/admin/pricing-catalog/roles/${roleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleLabelEs: roleLabelEs.trim(),
          roleLabelEn: roleLabelEn.trim() || null,
          category,
          tier,
          tierLabel: PRICING_TIER_LABELS[tier],
          active,
          notes: notes.trim() || null
        })
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))

        setInfoError(payload.error || 'No pudimos guardar los cambios. Revisa los valores.')

        return
      }

      const updated = (await res.json()) as SellableRoleItem

      setRole(updated)
      toast.success('Cambios guardados')
      onSuccess?.()
    } catch {
      setInfoError('No se pudo conectar al servidor. Verifica tu conexión.')
    } finally {
      setSavingInfo(false)
    }
  }

  // ── Cost form submit ─────────────────────────────────────────────────

  const resetCostForm = () => {
    setCostForm({
      employmentTypeCode: '',
      effectiveFrom: todayIso(),
      baseSalaryUsd: '',
      bonusJitUsd: '',
      bonusRpaUsd: '',
      bonusArUsd: '',
      bonusSobrecumplimientoUsd: '',
      gastosPrevisionalesUsd: '',
      feeDeelUsd: '',
      feeEorUsd: '',
      hoursPerFteMonth: '180',
      directOverheadPct: '',
      sharedOverheadPct: '',
      notes: ''
    })
  }

  const handleSubmitCost = async () => {
    if (!roleId) return
    if (guardImpactBlocking()) return

    if (!costForm.employmentTypeCode) {
      toast.error('Selecciona una modalidad de contrato.')

      return
    }

    if (!costForm.baseSalaryUsd || Number(costForm.baseSalaryUsd) < 0) {
      toast.error('Ingresa un salario base en USD válido.')

      return
    }

    if (costForm.directOverheadPct !== '') {
      const directOverheadPct = Number(costForm.directOverheadPct)

      if (!Number.isFinite(directOverheadPct) || directOverheadPct < 0 || directOverheadPct > 1) {
        toast.error('El overhead directo debe expresarse en decimal entre 0 y 1. Ejemplo: 0.08 = 8%.')

        return
      }
    }

    if (costForm.sharedOverheadPct !== '') {
      const sharedOverheadPct = Number(costForm.sharedOverheadPct)

      if (!Number.isFinite(sharedOverheadPct) || sharedOverheadPct < 0 || sharedOverheadPct > 1) {
        toast.error('El overhead compartido debe expresarse en decimal entre 0 y 1. Ejemplo: 0.12 = 12%.')

        return
      }
    }

    setSavingCost(true)

    try {
      const res = await fetch(`/api/admin/pricing-catalog/roles/${roleId}/cost-components`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employmentTypeCode: costForm.employmentTypeCode,
          effectiveFrom: costForm.effectiveFrom,
          baseSalaryUsd: Number(costForm.baseSalaryUsd),
          bonusJitUsd: costForm.bonusJitUsd ? Number(costForm.bonusJitUsd) : 0,
          bonusRpaUsd: costForm.bonusRpaUsd ? Number(costForm.bonusRpaUsd) : 0,
          bonusArUsd: costForm.bonusArUsd ? Number(costForm.bonusArUsd) : 0,
          bonusSobrecumplimientoUsd: costForm.bonusSobrecumplimientoUsd
            ? Number(costForm.bonusSobrecumplimientoUsd)
            : 0,
          gastosPrevisionalesUsd: costForm.gastosPrevisionalesUsd
            ? Number(costForm.gastosPrevisionalesUsd)
            : 0,
          feeDeelUsd: costForm.feeDeelUsd ? Number(costForm.feeDeelUsd) : 0,
          feeEorUsd: costForm.feeEorUsd ? Number(costForm.feeEorUsd) : 0,
          hoursPerFteMonth: Number(costForm.hoursPerFteMonth) || 180,
          directOverheadPct: costForm.directOverheadPct === '' ? null : Number(costForm.directOverheadPct),
          sharedOverheadPct: costForm.sharedOverheadPct === '' ? null : Number(costForm.sharedOverheadPct),
          notes: costForm.notes.trim() || null
        })
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))

        toast.error(payload.error || 'No pudimos guardar los cambios. Revisa los valores.')

        return
      }

      toast.success('Componentes de costo actualizados')
      setCostFormOpen(false)
      resetCostForm()
      await loadCostComponents()
      onSuccess?.()
    } catch {
      toast.error('No se pudo conectar al servidor.')
    } finally {
      setSavingCost(false)
    }
  }

  // ── Pricing form submit ──────────────────────────────────────────────

  const resetPricingForm = () => {
    setPricingEffectiveFrom(todayIso())
    setPricingRows([{ currencyCode: 'USD', marginPct: '', hourlyPrice: '', fteMonthlyPrice: '' }])
  }

  const handleSubmitPricing = async () => {
    if (!roleId) return
    if (guardImpactBlocking()) return

    const completedRows = pricingRows.filter(
      row => row.marginPct !== '' && row.hourlyPrice !== '' && row.fteMonthlyPrice !== ''
    )

    if (completedRows.length === 0) {
      toast.error('Agrega al menos una fila completa con margen, precio hora y precio mensual.')

      return
    }

    const seen = new Set<string>()

    for (const row of completedRows) {
      if (seen.has(row.currencyCode)) {
        toast.error(`No repitas la misma moneda (${row.currencyCode}) en la misma versión.`)

        return
      }

      seen.add(row.currencyCode)
    }

    setSavingPricing(true)

    try {
      const res = await fetch(`/api/admin/pricing-catalog/roles/${roleId}/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          effectiveFrom: pricingEffectiveFrom,
          pricing: completedRows.map(row => ({
            currencyCode: row.currencyCode,
            marginPct: Number(row.marginPct),
            hourlyPrice: Number(row.hourlyPrice),
            fteMonthlyPrice: Number(row.fteMonthlyPrice)
          }))
        })
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))

        toast.error(payload.error || 'No pudimos guardar los cambios. Revisa los valores.')

        return
      }

      toast.success('Pricing actualizado')
      setPricingFormOpen(false)
      resetPricingForm()
      await loadPricing()
      onSuccess?.()
    } catch {
      toast.error('No se pudo conectar al servidor.')
    } finally {
      setSavingPricing(false)
    }
  }

  // ── Compatibility tab: load + submit ─────────────────────────────────

  const loadCompatibility = useCallback(async () => {
    if (!roleId) return

    setLoadingCompatibility(true)
    setCompatibilityError(null)

    try {
      const res = await fetch(`/api/admin/pricing-catalog/roles/${roleId}/compatibility`)

      if (!res.ok) {
        setCompatibilityError(`No pudimos cargar las modalidades (HTTP ${res.status}).`)

        return
      }

      const payload = (await res.json()) as { items: CompatibilityApiItem[] }

      setCompatibility(
        payload.items.map(item => ({
          employmentTypeCode: item.employmentTypeCode,
          labelEs: item.employmentType?.labelEs ?? item.employmentTypeCode,
          countryCode: item.employmentType?.countryCode ?? '',
          paymentCurrency: item.employmentType?.paymentCurrency ?? '',
          allowed: item.allowed,
          isDefault: item.isDefault,
          notes: item.notes ?? ''
        }))
      )
      setCompatibilityLoaded(true)
    } catch {
      setCompatibilityError('No se pudo conectar al servidor. Verifica tu conexión.')
    } finally {
      setLoadingCompatibility(false)
    }
  }, [roleId])

  useEffect(() => {
    if (open && roleId && tab === 'employment' && !compatibilityLoaded) {
      void loadCompatibility()
    }
  }, [open, roleId, tab, compatibilityLoaded, loadCompatibility])

  const handleToggleAllowed = (code: string, allowed: boolean) => {
    setCompatibility(prev =>
      prev.map(row => {
        if (row.employmentTypeCode !== code) return row

        // If turning off allowed on the default row, also clear isDefault
        if (!allowed && row.isDefault) {
          return { ...row, allowed, isDefault: false }
        }

        return { ...row, allowed }
      })
    )
  }

  const handleSetDefault = (code: string) => {
    // Default must also be allowed — force allowed=true on the selected row
    setCompatibility(prev =>
      prev.map(row => ({
        ...row,
        isDefault: row.employmentTypeCode === code,
        allowed: row.employmentTypeCode === code ? true : row.allowed
      }))
    )
  }

  const handleUpdateNotes = (code: string, notes: string) => {
    setCompatibility(prev =>
      prev.map(row => (row.employmentTypeCode === code ? { ...row, notes } : row))
    )
  }

  const handleRemoveCompat = (code: string) => {
    if (!window.confirm('¿Quitar esta modalidad? Cotizaciones existentes que la usen no se ven afectadas.')) {
      return
    }

    setCompatibility(prev => prev.filter(row => row.employmentTypeCode !== code))
  }

  const handleAddCompat = () => {
    if (!addCompatValue) return

    if (compatibility.some(row => row.employmentTypeCode === addCompatValue.code)) {
      toast.error('Esta modalidad ya está agregada.')

      return
    }

    // Find full details from employmentTypes
    const et = employmentTypes.find(e => e.code === addCompatValue.code)

    setCompatibility(prev => [
      ...prev,
      {
        employmentTypeCode: addCompatValue.code,
        labelEs: et?.label ?? addCompatValue.code,
        countryCode: et?.country ?? '',
        paymentCurrency: '',
        allowed: true,
        isDefault: false,
        notes: ''
      }
    ])

    setAddCompatValue(null)
    setAddCompatOpen(false)
  }

  const handleSaveCompatibility = async () => {
    if (!roleId) return
    if (guardImpactBlocking()) return

    // Client-side validation: at least 1 default if list is non-empty
    if (compatibility.length > 0) {
      const defaults = compatibility.filter(row => row.isDefault)

      if (defaults.length !== 1) {
        toast.error('No pudimos guardar las modalidades. Revisa que haya exactamente una marcada como default.')

        return
      }

      if (!defaults[0].allowed) {
        toast.error('La modalidad default debe estar marcada como permitida.')

        return
      }
    }

    setSavingCompatibility(true)

    try {
      const res = await fetch(`/api/admin/pricing-catalog/roles/${roleId}/compatibility`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compatibility: compatibility.map(row => ({
            employmentTypeCode: row.employmentTypeCode,
            allowed: row.allowed,
            isDefault: row.isDefault,
            notes: row.notes.trim() || null
          }))
        })
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))

        toast.error(
          payload.error || 'No pudimos guardar las modalidades. Revisa que haya exactamente una marcada como default.'
        )

        return
      }

      const payload = (await res.json()) as { items: CompatibilityApiItem[] }

      setCompatibility(
        payload.items.map(item => ({
          employmentTypeCode: item.employmentTypeCode,
          labelEs: item.employmentType?.labelEs ?? item.employmentTypeCode,
          countryCode: item.employmentType?.countryCode ?? '',
          paymentCurrency: item.employmentType?.paymentCurrency ?? '',
          allowed: item.allowed,
          isDefault: item.isDefault,
          notes: item.notes ?? ''
        }))
      )

      toast.success('Modalidades actualizadas')
      onSuccess?.()
    } catch {
      toast.error('No se pudo conectar al servidor.')
    } finally {
      setSavingCompatibility(false)
    }
  }

  // ── Derived: group cost items by employment type ─────────────────────

  const costGroups = useMemo(() => {
    const groups = new Map<string, CostComponentItem[]>()

    for (const item of costItems) {
      const arr = groups.get(item.employmentTypeCode) ?? []

      arr.push(item)
      groups.set(item.employmentTypeCode, arr)
    }

    // Already ordered by employment_type ASC + effective_from DESC (endpoint).
    return Array.from(groups.entries()).map(([code, items]) => ({ code, items }))
  }, [costItems])

  // ── Derived: group pricing items by currency ─────────────────────────

  const pricingGroups = useMemo(() => {
    const groups = new Map<string, PricingItem[]>()

    for (const item of pricingItems) {
      const arr = groups.get(item.currencyCode) ?? []

      arr.push(item)
      groups.set(item.currencyCode, arr)
    }

    return Array.from(groups.entries()).map(([code, items]) => ({ code, items }))
  }, [pricingItems])

  const toggleGroupExpanded = (code: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)

      if (next.has(code)) next.delete(code)
      else next.add(code)

      return next
    })
  }

  const addPricingRow = () => {
    const used = new Set(pricingRows.map(r => r.currencyCode))
    const available = SELLABLE_ROLE_PRICING_CURRENCIES.find(c => !used.has(c))

    if (!available) return

    setPricingRows(prev => [
      ...prev,
      { currencyCode: available, marginPct: '', hourlyPrice: '', fteMonthlyPrice: '' }
    ])
  }

  const removePricingRow = (idx: number) => {
    setPricingRows(prev => prev.filter((_, i) => i !== idx))
  }

  const updatePricingRow = (idx: number, patch: Partial<PricingRowInput>) => {
    setPricingRows(prev => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
  }

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={handleClose}
      PaperProps={{ sx: { width: { xs: '100%', md: 720 } } }}
    >
      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}
      >
        <Box>
          <Typography variant='h6'>Editar rol vendible</Typography>
          {role && (
            <Typography variant='caption' color='text.secondary'>
              {role.roleSku} · {role.roleLabelEs}
            </Typography>
          )}
        </Box>
        <IconButton onClick={handleClose} size='small' aria-label={GREENHOUSE_COPY.actions.close}>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      {loadingRole && !role ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : roleError ? (
        <Box sx={{ p: 4 }}>
          <Alert severity='error'>{roleError}</Alert>
        </Box>
      ) : role ? (
        <TabContext value={tab}>
          <Box sx={{ px: 4, pt: 2, borderBottom: t => `1px solid ${t.palette.divider}` }}>
            <TabList
              onChange={(_, v: TabValue) => setTab(v)}
              variant='scrollable'
              scrollButtons='auto'
              aria-label={TASK407_ARIA_SECCIONES_DEL_ROL}
            >
              <Tab
                value='info'
                label='Info general'
                icon={<i className='tabler-info-circle' />}
                iconPosition='start'
              />
              <Tab
                value='employment'
                label='Modalidades de contrato'
                icon={<i className='tabler-id-badge' />}
                iconPosition='start'
              />
              <Tab
                value='cost'
                label='Componentes de costo'
                icon={<i className='tabler-currency-dollar' />}
                iconPosition='start'
              />
              <Tab
                value='pricing'
                label='Pricing por moneda'
                icon={<i className='tabler-coin' />}
                iconPosition='start'
              />
            </TabList>
          </Box>

          {/* ── Info tab ─────────────────────────────────────────── */}
          <TabPanel value='info' sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
            <Stack spacing={3}>
              {infoError && (
                <Alert severity='error' onClose={() => setInfoError(null)}>
                  {infoError}
                </Alert>
              )}

              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <CustomTextField
                    fullWidth
                    size='small'
                    label='Nombre del rol (español)'
                    value={roleLabelEs}
                    onChange={e => setRoleLabelEs(e.target.value)}
                    required
                    helperText='Como aparece en cotizaciones y catálogos'
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <CustomTextField
                    fullWidth
                    size='small'
                    label='Nombre del rol (inglés, opcional)'
                    value={roleLabelEn}
                    onChange={e => setRoleLabelEn(e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <CustomTextField
                    select
                    fullWidth
                    size='small'
                    label='Categoría'
                    value={category}
                    onChange={e => setCategory(e.target.value as Category)}
                    required
                  >
                    {CATEGORY_OPTIONS.map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <CustomTextField
                    select
                    fullWidth
                    size='small'
                    label='Tier'
                    value={tier}
                    onChange={e => setTier(e.target.value as PricingTierCode)}
                    required
                    helperText='Define rango de margen'
                  >
                    {PRICING_TIER_CODES.map(t => (
                      <MenuItem key={t} value={t}>
                        T{t} · {PRICING_TIER_LABELS[t]}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Typography variant='caption' color='text.secondary' sx={{ mb: 1, display: 'block' }}>
                    Formas de venta
                  </Typography>
                  <Stack spacing={0}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={canSellAsStaff}
                          onChange={e => setCanSellAsStaff(e.target.checked)}
                          size='small'
                        />
                      }
                      label='Vendible como staff (dedicación mensual)'
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={canSellAsServiceComponent}
                          onChange={e => setCanSellAsServiceComponent(e.target.checked)}
                          size='small'
                        />
                      }
                      label='Vendible como componente de servicio'
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={active}
                          onChange={e => setActive(e.target.checked)}
                          size='small'
                          color='success'
                        />
                      }
                      label={active ? 'Activo en catálogo' : 'Inactivo (oculto en cotizaciones nuevas)'}
                    />
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <CustomTextField
                    fullWidth
                    size='small'
                    label='Notas (opcional)'
                    multiline
                    rows={3}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder='Contexto o restricciones de uso'
                  />
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant='contained'
                  color='primary'
                  onClick={handleSaveInfo}
                  disabled={savingInfo || impactBlocking}
                  startIcon={savingInfo ? <CircularProgress size={16} color='inherit' /> : undefined}
                >
                  {savingInfo
                    ? 'Guardando...'
                    : impactBlocking
                      ? GH_PRICING_GOVERNANCE.impactPreview.blockingSaveCta
                      : 'Guardar cambios'}
                </Button>
              </Box>
            </Stack>
          </TabPanel>

          {/* ── Employment types tab (editable compatibility) ────── */}
          <TabPanel value='employment' sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
            <Stack spacing={3}>
              {compatibilityError && (
                <Alert severity='error' onClose={() => setCompatibilityError(null)}>
                  {compatibilityError}
                </Alert>
              )}

              <Typography variant='body2' color='text.secondary'>
                Las modalidades marcadas como <strong>permitidas</strong> aparecen en el cotizador al
                agregar este rol. La marcada como <strong>default</strong> se pre-selecciona.
              </Typography>

              <Box
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
              >
                <Typography variant='caption' color='text.secondary'>
                  {compatibility.length === 0
                    ? 'Sin modalidades asignadas'
                    : `${compatibility.length} modalidad${compatibility.length === 1 ? '' : 'es'} · ${compatibility.filter(r => r.allowed).length} permitida${compatibility.filter(r => r.allowed).length === 1 ? '' : 's'}`}
                </Typography>
                <Button
                  variant='outlined'
                  size='small'
                  startIcon={<i className='tabler-plus' />}
                  onClick={() => setAddCompatOpen(prev => !prev)}
                  disabled={loadingCompatibility || loadingEmploymentTypes}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Agregar modalidad
                </Button>
              </Box>

              {addCompatOpen && (
                <Paper
                  variant='outlined'
                  sx={{ p: 3, borderLeft: t => `4px solid ${t.palette.primary.main}` }}
                >
                  <Stack spacing={2}>
                    <Typography variant='subtitle2'>Agregar modalidad</Typography>
                    <Autocomplete
                      size='small'
                      options={employmentTypes.filter(
                        et => !compatibility.some(row => row.employmentTypeCode === et.code)
                      )}
                      getOptionLabel={opt => `${opt.label} (${opt.code})`}
                      value={addCompatValue}
                      onChange={(_, value) => setAddCompatValue(value)}
                      renderInput={params => (
                        <CustomTextField
                          {...params}
                          label='Modalidad'
                          placeholder='Busca por nombre o código'
                        />
                      )}
                      noOptionsText='No quedan modalidades disponibles'
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                      <Button
                        variant='outlined'
                        color='secondary'
                        size='small'
                        onClick={() => {
                          setAddCompatOpen(false)
                          setAddCompatValue(null)
                        }}
                      >{GREENHOUSE_COPY.actions.cancel}</Button>
                      <Button
                        variant='contained'
                        size='small'
                        onClick={handleAddCompat}
                        disabled={!addCompatValue}
                      >{GREENHOUSE_COPY.actions.add}</Button>
                    </Box>
                  </Stack>
                </Paper>
              )}

              {loadingCompatibility ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : compatibility.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }} role='status'>
                  <Typography variant='body2' color='text.secondary'>
                    Este rol aún no tiene modalidades asignadas. Agrega al menos una para que aparezca
                    en el cotizador.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Box
                    component='table'
                    sx={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      '& th, & td': {
                        p: 1.5,
                        fontSize: '0.8rem',
                        borderBottom: t => `1px solid ${t.palette.divider}`,
                        verticalAlign: 'middle'
                      },
                      '& th': {
                        fontWeight: 600,
                        color: 'text.secondary',
                        bgcolor: 'action.hover',
                        textAlign: 'left',
                        whiteSpace: 'nowrap'
                      }
                    }}
                  >
                    <thead>
                      <tr>
                        <th>Modalidad</th>
                        <th style={{ textAlign: 'center' }}>Permitida</th>
                        <th style={{ textAlign: 'center' }}>Default</th>
                        <th>Notas</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {compatibility.map(row => (
                        <tr key={row.employmentTypeCode}>
                          <td>
                            <Typography variant='body2' sx={{ fontWeight: 500 }}>
                              {row.labelEs}
                            </Typography>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {row.employmentTypeCode}
                              {row.countryCode ? ` · ${row.countryCode}` : ''}
                              {row.paymentCurrency ? ` · ${row.paymentCurrency}` : ''}
                            </Typography>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <Switch
                              size='small'
                              checked={row.allowed}
                              onChange={e =>
                                handleToggleAllowed(row.employmentTypeCode, e.target.checked)
                              }
                              inputProps={{
                                'aria-label': `Permitir ${row.labelEs}`
                              }}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <Tooltip
                              title={
                                row.allowed
                                  ? 'Marcar como default'
                                  : 'Solo modalidades permitidas pueden ser default'
                              }
                            >
                              <span>
                                <Radio
                                  size='small'
                                  checked={row.isDefault}
                                  onChange={() => handleSetDefault(row.employmentTypeCode)}
                                  disabled={!row.allowed}
                                  inputProps={{
                                    'aria-label': `Default: ${row.labelEs}`
                                  }}
                                />
                              </span>
                            </Tooltip>
                          </td>
                          <td style={{ minWidth: 200 }}>
                            <CustomTextField
                              fullWidth
                              size='small'
                              value={row.notes}
                              onChange={e =>
                                handleUpdateNotes(row.employmentTypeCode, e.target.value)
                              }
                              placeholder='Notas (opcional)'
                            />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <IconButton
                              size='small'
                              onClick={() => handleRemoveCompat(row.employmentTypeCode)}
                              aria-label={`Quitar ${row.labelEs}`}
                            >
                              <i className='tabler-trash' style={{ fontSize: 18 }} />
                            </IconButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Box>
                </Box>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant='contained'
                  color='primary'
                  onClick={handleSaveCompatibility}
                  disabled={savingCompatibility || loadingCompatibility || impactBlocking}
                  startIcon={
                    savingCompatibility ? <CircularProgress size={16} color='inherit' /> : undefined
                  }
                >
                  {savingCompatibility
                    ? 'Guardando...'
                    : impactBlocking
                      ? GH_PRICING_GOVERNANCE.impactPreview.blockingSaveCta
                      : 'Guardar modalidades'}
                </Button>
              </Box>
            </Stack>
          </TabPanel>

          {/* ── Cost components tab ──────────────────────────────── */}
          <TabPanel value='cost' sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
            <Stack spacing={3}>
              {costError && (
                <Alert severity='error' onClose={() => setCostError(null)}>
                  {costError}
                </Alert>
              )}

              <Box
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
              >
                <Typography variant='body2' color='text.secondary'>
                  Las nuevas versiones se aplican desde la fecha efectiva. Cotizaciones existentes no se
                  recalculan.
                </Typography>
                <Button
                  variant='contained'
                  size='small'
                  startIcon={<i className='tabler-plus' />}
                  onClick={() => {
                    setCostFormOpen(prev => !prev)
                  }}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Nueva versión
                </Button>
              </Box>

              {costFormOpen && (
                <Paper
                  variant='outlined'
                  sx={{ p: 3, borderLeft: t => `4px solid ${t.palette.primary.main}` }}
                >
                  <Stack spacing={2}>
                    <Typography variant='subtitle2'>Nueva versión de costo</Typography>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <CustomTextField
                          select
                          fullWidth
                          size='small'
                          label='Modalidad de contrato'
                          value={costForm.employmentTypeCode}
                          onChange={e =>
                            setCostForm(prev => ({ ...prev, employmentTypeCode: e.target.value }))
                          }
                          required
                        >
                          {employmentTypes.length === 0 ? (
                            <MenuItem value='' disabled>
                              Sin modalidades cargadas
                            </MenuItem>
                          ) : (
                            employmentTypes.map(et => (
                              <MenuItem key={et.code} value={et.code}>
                                {et.label} ({et.code})
                              </MenuItem>
                            ))
                          )}
                        </CustomTextField>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <CustomTextField
                          fullWidth
                          size='small'
                          type='date'
                          label='Vigente desde'
                          value={costForm.effectiveFrom}
                          onChange={e =>
                            setCostForm(prev => ({ ...prev, effectiveFrom: e.target.value }))
                          }
                          required
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <CustomTextField
                          fullWidth
                          size='small'
                          type='number'
                          label='Salario base (USD)'
                          value={costForm.baseSalaryUsd}
                          onChange={e =>
                            setCostForm(prev => ({ ...prev, baseSalaryUsd: e.target.value }))
                          }
                          required
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <CustomTextField
                          fullWidth
                          size='small'
                          type='number'
                          label='Horas por FTE/mes'
                          value={costForm.hoursPerFteMonth}
                          onChange={e =>
                            setCostForm(prev => ({ ...prev, hoursPerFteMonth: e.target.value }))
                          }
                          helperText='Horas billable por FTE. Default 180. El pricing engine usa este valor cuando la fracción FTE no está en fte_hours_guide y como divisor del hourly cost. No confundir con capacity operacional (160h)'
                        />
                      </Grid>

                      <Grid size={{ xs: 6, sm: 3 }}>
                        <CustomTextField
                          fullWidth
                          size='small'
                          type='number'
                          label='Bono JIT (USD)'
                          value={costForm.bonusJitUsd}
                          onChange={e => setCostForm(prev => ({ ...prev, bonusJitUsd: e.target.value }))}
                        />
                      </Grid>

                      <Grid size={{ xs: 6, sm: 3 }}>
                        <CustomTextField
                          fullWidth
                          size='small'
                          type='number'
                          label='Bono RPA (USD)'
                          value={costForm.bonusRpaUsd}
                          onChange={e => setCostForm(prev => ({ ...prev, bonusRpaUsd: e.target.value }))}
                        />
                      </Grid>

                      <Grid size={{ xs: 6, sm: 3 }}>
                        <CustomTextField
                          fullWidth
                          size='small'
                          type='number'
                          label='Bono AR (USD)'
                          value={costForm.bonusArUsd}
                          onChange={e => setCostForm(prev => ({ ...prev, bonusArUsd: e.target.value }))}
                        />
                      </Grid>

                      <Grid size={{ xs: 6, sm: 3 }}>
                        <CustomTextField
                          fullWidth
                          size='small'
                          type='number'
                          label='Bono sobrecumpl. (USD)'
                          value={costForm.bonusSobrecumplimientoUsd}
                          onChange={e =>
                            setCostForm(prev => ({
                              ...prev,
                              bonusSobrecumplimientoUsd: e.target.value
                            }))
                          }
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 4 }}>
                        <CustomTextField
                          fullWidth
                          size='small'
                          type='number'
                          label='Gastos previsionales (USD)'
                          value={costForm.gastosPrevisionalesUsd}
                          onChange={e =>
                            setCostForm(prev => ({ ...prev, gastosPrevisionalesUsd: e.target.value }))
                          }
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 4 }}>
                        <CustomTextField
                          fullWidth
                          size='small'
                          type='number'
                          label='Fee Deel (USD)'
                          value={costForm.feeDeelUsd}
                          onChange={e => setCostForm(prev => ({ ...prev, feeDeelUsd: e.target.value }))}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 4 }}>
                        <CustomTextField
                          fullWidth
                          size='small'
                          type='number'
                          label='Fee EOR (USD)'
                          value={costForm.feeEorUsd}
                          onChange={e => setCostForm(prev => ({ ...prev, feeEorUsd: e.target.value }))}
                          helperText='Fee de Employer of Record en USD. 0 si no aplica'
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <CustomTextField
                          fullWidth
                          size='small'
                          type='number'
                          label='Overhead directo (decimal)'
                          value={costForm.directOverheadPct}
                          onChange={e =>
                            setCostForm(prev => ({ ...prev, directOverheadPct: e.target.value }))
                          }
                          placeholder='0.08'
                          helperText='Opcional. Usa decimal: 0.08 = 8%.'
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <CustomTextField
                          fullWidth
                          size='small'
                          type='number'
                          label='Overhead compartido (decimal)'
                          value={costForm.sharedOverheadPct}
                          onChange={e =>
                            setCostForm(prev => ({ ...prev, sharedOverheadPct: e.target.value }))
                          }
                          placeholder='0.12'
                          helperText='Opcional. Se suma al loaded cost como overhead compartido.'
                        />
                      </Grid>

                      <Grid size={{ xs: 12 }}>
                        <CustomTextField
                          fullWidth
                          size='small'
                          label='Notas (opcional)'
                          value={costForm.notes}
                          onChange={e => setCostForm(prev => ({ ...prev, notes: e.target.value }))}
                        />
                      </Grid>
                    </Grid>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                      <Button
                        variant='outlined'
                        color='secondary'
                        size='small'
                        onClick={() => {
                          setCostFormOpen(false)
                          resetCostForm()
                        }}
                        disabled={savingCost}
                      >{GREENHOUSE_COPY.actions.cancel}</Button>
                      <Button
                        variant='contained'
                        size='small'
                        onClick={handleSubmitCost}
                        disabled={savingCost || impactBlocking}
                        startIcon={
                          savingCost ? <CircularProgress size={16} color='inherit' /> : undefined
                        }
                      >
                        {savingCost
                          ? 'Guardando...'
                          : impactBlocking
                            ? GH_PRICING_GOVERNANCE.impactPreview.blockingSaveCta
                            : 'Guardar versión'}
                      </Button>
                    </Box>
                  </Stack>
                </Paper>
              )}

              {loadingCost ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : costGroups.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }} role='status'>
                  <Typography variant='body2' color='text.secondary'>
                    Aún no hay componentes de costo cargados para este rol.
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {costGroups.map(group => {
                    const latest = group.items[0]
                    const history = group.items.slice(1)
                    const isExpanded = expandedGroups.has(group.code)
                    const latestSourceKindLabel = formatSourceKindLabel(latest.sourceKind)
                    const latestConfidenceMeta = getConfidenceMeta(latest.confidenceLabel)
                    const latestOverheadSummary = getOverheadSummary(latest)

                    const totalBonos =
                      latest.bonusJitUsd +
                      latest.bonusRpaUsd +
                      latest.bonusArUsd +
                      latest.bonusSobrecumplimientoUsd

                    return (
                      <Paper
                        key={group.code}
                        variant='outlined'
                        sx={{
                          borderLeft: t => `4px solid ${t.palette.primary.main}`,
                          overflow: 'hidden'
                        }}
                      >
                        <Box
                          sx={{
                            p: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 2,
                            flexWrap: 'wrap'
                          }}
                        >
                          <Box>
                            <Typography variant='subtitle2'>{group.code}</Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {group.items.length} versión{group.items.length === 1 ? '' : 'es'} · última
                              vigente desde {fmtDate(latest.effectiveFrom)}
                            </Typography>
                          </Box>
                          <Stack direction='row' spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                            <Chip
                              size='small'
                              label={`Base ${fmtUsd(latest.totalMonthlyCostUsd)}/mes · ${fmtUsd(latest.hourlyCostUsd)}/hora`}
                              color='primary'
                              variant='outlined'
                            />
                            {hasLoadedCosts(latest) && (
                              <Chip
                                size='small'
                                label={`Loaded ${fmtUsd(latest.loadedMonthlyCostUsd)}/mes · ${fmtUsd(latest.loadedHourlyCostUsd)}/hora`}
                                color='warning'
                                variant='outlined'
                              />
                            )}
                            {latestSourceKindLabel && (
                              <Chip size='small' label={latestSourceKindLabel} variant='outlined' />
                            )}
                            {latestConfidenceMeta && (
                              <Chip
                                size='small'
                                label={`Confianza ${latestConfidenceMeta.label}${
                                  latest.confidenceScore != null
                                    ? ` · ${Math.round(latest.confidenceScore * 100)}%`
                                    : ''
                                }`}
                                color={latestConfidenceMeta.color}
                                variant='outlined'
                              />
                            )}
                          </Stack>
                        </Box>
                        <Divider />
                        <Box sx={{ overflowX: 'auto' }}>
                          <Box
                            component='table'
                            sx={{
                              width: '100%',
                              borderCollapse: 'collapse',
                              '& th, & td': {
                                p: 1.5,
                                textAlign: 'right',
                                fontSize: '0.8rem',
                                borderBottom: t => `1px solid ${t.palette.divider}`
                              },
                              '& th:first-of-type, & td:first-of-type': { textAlign: 'left' },
                              '& th': {
                                fontWeight: 600,
                                color: 'text.secondary',
                                bgcolor: 'action.hover'
                              }
                            }}
                          >
                            <thead>
                              <tr>
                                <th>Vigente desde</th>
                                <th>Salario base</th>
                                <th>Bonos</th>
                                <th>Previsional</th>
                                <th>Fee Deel</th>
                                <th>Fee EOR</th>
                                <th>Hrs/mes</th>
                                <th>Total mensual</th>
                                <th>Hora</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>
                                  <Stack spacing={0.75}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                      <Typography variant='body2' sx={{ fontWeight: 500 }}>
                                        {fmtDate(latest.effectiveFrom)}
                                      </Typography>
                                      <Chip
                                        size='small'
                                        label='Vigente'
                                        color='success'
                                        variant='outlined'
                                        sx={{ height: 18, fontSize: '0.65rem' }}
                                      />
                                    </Box>

                                    {(latestSourceKindLabel || latestConfidenceMeta || latest.sourceRef) && (
                                      <Stack direction='row' spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
                                        {latestSourceKindLabel && (
                                          <Chip
                                            size='small'
                                            label={`Origen: ${latestSourceKindLabel}`}
                                            variant='outlined'
                                            sx={{ maxWidth: '100%' }}
                                          />
                                        )}
                                        {latestConfidenceMeta && (
                                          <Chip
                                            size='small'
                                            label={`Confianza ${latestConfidenceMeta.label}`}
                                            color={latestConfidenceMeta.color}
                                            variant='outlined'
                                          />
                                        )}
                                        {latest.sourceRef && (
                                          <Tooltip title={latest.sourceRef}>
                                            <Chip
                                              size='small'
                                              label={`Ref: ${latest.sourceRef}`}
                                              variant='outlined'
                                              sx={{
                                                maxWidth: 220,
                                                '& .MuiChip-label': {
                                                  display: 'block',
                                                  overflow: 'hidden',
                                                  textOverflow: 'ellipsis',
                                                  whiteSpace: 'nowrap'
                                                }
                                              }}
                                            />
                                          </Tooltip>
                                        )}
                                      </Stack>
                                    )}

                                    {latestOverheadSummary && (
                                      <Typography variant='caption' color='text.secondary'>
                                        Overhead: {latestOverheadSummary}
                                      </Typography>
                                    )}
                                  </Stack>
                                </td>
                                <td>{fmtUsd(latest.baseSalaryUsd)}</td>
                                <td>{fmtUsd(totalBonos)}</td>
                                <td>{fmtUsd(latest.gastosPrevisionalesUsd)}</td>
                                <td>{fmtUsd(latest.feeDeelUsd)}</td>
                                <td>{fmtUsd(latest.feeEorUsd)}</td>
                                <td>{latest.hoursPerFteMonth}</td>
                                <td>
                                  <Stack spacing={0.5} sx={{ alignItems: 'flex-end' }}>
                                    <Typography variant='body2'>{fmtUsd(latest.totalMonthlyCostUsd)}</Typography>
                                    {hasLoadedCosts(latest) && (
                                      <Typography variant='caption' color='text.secondary'>
                                        Loaded {fmtUsd(latest.loadedMonthlyCostUsd)}
                                      </Typography>
                                    )}
                                  </Stack>
                                </td>
                                <td>
                                  <Stack spacing={0.5} sx={{ alignItems: 'flex-end' }}>
                                    <Typography variant='body2'>{fmtUsd(latest.hourlyCostUsd)}</Typography>
                                    {hasLoadedCosts(latest) && (
                                      <Typography variant='caption' color='text.secondary'>
                                        Loaded {fmtUsd(latest.loadedHourlyCostUsd)}
                                      </Typography>
                                    )}
                                  </Stack>
                                </td>
                              </tr>
                              {isExpanded &&
                                history.map(h => {
                                  const hBonos =
                                    h.bonusJitUsd +
                                    h.bonusRpaUsd +
                                    h.bonusArUsd +
                                    h.bonusSobrecumplimientoUsd

                                  const historySourceKindLabel = formatSourceKindLabel(h.sourceKind)
                                  const historyConfidenceMeta = getConfidenceMeta(h.confidenceLabel)
                                  const historyOverheadSummary = getOverheadSummary(h)

                                  return (
                                    <tr
                                      key={`${h.employmentTypeCode}-${h.effectiveFrom}-${h.createdAt}`}
                                    >
                                      <td>
                                        <Stack spacing={0.5}>
                                          <Typography variant='body2' color='text.secondary'>
                                            {fmtDate(h.effectiveFrom)}
                                          </Typography>
                                          {(historySourceKindLabel || historyConfidenceMeta || h.sourceRef) && (
                                            <Typography variant='caption' color='text.secondary'>
                                              {[historySourceKindLabel, historyConfidenceMeta?.label && `Confianza ${historyConfidenceMeta.label}`, h.sourceRef && `Ref ${h.sourceRef}`]
                                                .filter(Boolean)
                                                .join(' · ')}
                                            </Typography>
                                          )}
                                          {historyOverheadSummary && (
                                            <Typography variant='caption' color='text.secondary'>
                                              Overhead: {historyOverheadSummary}
                                            </Typography>
                                          )}
                                        </Stack>
                                      </td>
                                      <td>{fmtUsd(h.baseSalaryUsd)}</td>
                                      <td>{fmtUsd(hBonos)}</td>
                                      <td>{fmtUsd(h.gastosPrevisionalesUsd)}</td>
                                      <td>{fmtUsd(h.feeDeelUsd)}</td>
                                      <td>{fmtUsd(h.feeEorUsd)}</td>
                                      <td>{h.hoursPerFteMonth}</td>
                                      <td>
                                        <Stack spacing={0.5} sx={{ alignItems: 'flex-end' }}>
                                          <Typography variant='body2'>{fmtUsd(h.totalMonthlyCostUsd)}</Typography>
                                          {hasLoadedCosts(h) && (
                                            <Typography variant='caption' color='text.secondary'>
                                              Loaded {fmtUsd(h.loadedMonthlyCostUsd)}
                                            </Typography>
                                          )}
                                        </Stack>
                                      </td>
                                      <td>
                                        <Stack spacing={0.5} sx={{ alignItems: 'flex-end' }}>
                                          <Typography variant='body2'>{fmtUsd(h.hourlyCostUsd)}</Typography>
                                          {hasLoadedCosts(h) && (
                                            <Typography variant='caption' color='text.secondary'>
                                              Loaded {fmtUsd(h.loadedHourlyCostUsd)}
                                            </Typography>
                                          )}
                                        </Stack>
                                      </td>
                                    </tr>
                                  )
                                })}
                            </tbody>
                          </Box>
                        </Box>
                        {history.length > 0 && (
                          <Box sx={{ p: 1, textAlign: 'center', borderTop: t => `1px solid ${t.palette.divider}` }}>
                            <Button
                              size='small'
                              variant='text'
                              onClick={() => toggleGroupExpanded(group.code)}
                              startIcon={
                                <i className={isExpanded ? 'tabler-chevron-up' : 'tabler-chevron-down'} />
                              }
                            >
                              {isExpanded
                                ? 'Ocultar historial'
                                : `Ver historial (${history.length} versión${history.length === 1 ? '' : 'es'})`}
                            </Button>
                          </Box>
                        )}
                      </Paper>
                    )
                  })}
                </Stack>
              )}
            </Stack>
          </TabPanel>

          {/* ── Pricing tab ──────────────────────────────────────── */}
          <TabPanel value='pricing' sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
            <Stack spacing={3}>
              {pricingError && (
                <Alert severity='error' onClose={() => setPricingError(null)}>
                  {pricingError}
                </Alert>
              )}

              <Box
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
              >
                <Typography variant='body2' color='text.secondary'>
                  Precios por moneda con versionado. Cotizaciones existentes no se recalculan al crear
                  una nueva versión.
                </Typography>
                <Button
                  variant='contained'
                  size='small'
                  startIcon={<i className='tabler-plus' />}
                  onClick={() => setPricingFormOpen(prev => !prev)}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Nueva versión
                </Button>
              </Box>

              {pricingFormOpen && (
                <Paper
                  variant='outlined'
                  sx={{ p: 3, borderLeft: t => `4px solid ${t.palette.primary.main}` }}
                >
                  <Stack spacing={2}>
                    <Typography variant='subtitle2'>Nueva versión de pricing</Typography>

                    <CustomTextField
                      fullWidth
                      size='small'
                      type='date'
                      label='Vigente desde'
                      value={pricingEffectiveFrom}
                      onChange={e => setPricingEffectiveFrom(e.target.value)}
                      required
                      slotProps={{ inputLabel: { shrink: true } }}
                      sx={{ maxWidth: 260 }}
                    />

                    <Typography variant='caption' color='text.secondary'>
                      Agrega al menos una fila completa. Cada moneda puede tener una sola fila por
                      versión.
                    </Typography>

                    <Stack spacing={1.5}>
                      {pricingRows.map((row, idx) => (
                        <Grid key={idx} container spacing={1} alignItems='center'>
                          <Grid size={{ xs: 12, sm: 2 }}>
                            <CustomTextField
                              select
                              fullWidth
                              size='small'
                              label='Moneda'
                              value={row.currencyCode}
                              onChange={e =>
                                updatePricingRow(idx, {
                                  currencyCode: e.target.value as SellableRolePricingCurrency
                                })
                              }
                            >
                              {SELLABLE_ROLE_PRICING_CURRENCIES.map(c => (
                                <MenuItem key={c} value={c}>
                                  {c}
                                </MenuItem>
                              ))}
                            </CustomTextField>
                          </Grid>
                          <Grid size={{ xs: 12, sm: 3 }}>
                            <CustomTextField
                              fullWidth
                              size='small'
                              type='number'
                              label='Margen (decimal)'
                              value={row.marginPct}
                              onChange={e => updatePricingRow(idx, { marginPct: e.target.value })}
                              placeholder='0.35'
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 3 }}>
                            <CustomTextField
                              fullWidth
                              size='small'
                              type='number'
                              label='Precio hora'
                              value={row.hourlyPrice}
                              onChange={e => updatePricingRow(idx, { hourlyPrice: e.target.value })}
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 3 }}>
                            <CustomTextField
                              fullWidth
                              size='small'
                              type='number'
                              label='Precio FTE mensual'
                              value={row.fteMonthlyPrice}
                              onChange={e =>
                                updatePricingRow(idx, { fteMonthlyPrice: e.target.value })
                              }
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 1 }}>
                            <IconButton
                              size='small'
                              onClick={() => removePricingRow(idx)}
                              disabled={pricingRows.length <= 1}
                              aria-label={`Quitar fila ${row.currencyCode}`}
                            >
                              <i className='tabler-trash' style={{ fontSize: 18 }} />
                            </IconButton>
                          </Grid>
                        </Grid>
                      ))}
                    </Stack>

                    <Box>
                      <Button
                        size='small'
                        variant='outlined'
                        startIcon={<i className='tabler-plus' />}
                        onClick={addPricingRow}
                        disabled={pricingRows.length >= SELLABLE_ROLE_PRICING_CURRENCIES.length}
                      >
                        Agregar moneda
                      </Button>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                      <Button
                        variant='outlined'
                        color='secondary'
                        size='small'
                        onClick={() => {
                          setPricingFormOpen(false)
                          resetPricingForm()
                        }}
                        disabled={savingPricing}
                      >{GREENHOUSE_COPY.actions.cancel}</Button>
                      <Button
                        variant='contained'
                        size='small'
                        onClick={handleSubmitPricing}
                        disabled={savingPricing || impactBlocking}
                        startIcon={
                          savingPricing ? <CircularProgress size={16} color='inherit' /> : undefined
                        }
                      >
                        {savingPricing
                          ? 'Guardando...'
                          : impactBlocking
                            ? GH_PRICING_GOVERNANCE.impactPreview.blockingSaveCta
                            : 'Guardar versión'}
                      </Button>
                    </Box>
                  </Stack>
                </Paper>
              )}

              {loadingPricing ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : pricingGroups.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }} role='status'>
                  <Typography variant='body2' color='text.secondary'>
                    Aún no hay precios cargados para este rol.
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {pricingGroups.map(group => {
                    const latest = group.items[0]

                    return (
                      <Paper
                        key={group.code}
                        variant='outlined'
                        sx={{ borderLeft: t => `4px solid ${t.palette.info.main}`, overflow: 'hidden' }}
                      >
                        <Box
                          sx={{
                            p: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 2,
                            flexWrap: 'wrap'
                          }}
                        >
                          <Box>
                            <Typography variant='subtitle2'>{group.code}</Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {group.items.length} versión{group.items.length === 1 ? '' : 'es'} ·
                              margen vigente {fmtPct(latest.marginPct)}
                            </Typography>
                          </Box>
                          <Chip
                            size='small'
                            label={`${fmtPrice(latest.hourlyPrice, group.code)}/hora · ${fmtPrice(latest.fteMonthlyPrice, group.code)}/mes`}
                            color='info'
                            variant='outlined'
                          />
                        </Box>
                        <Divider />
                        <Box sx={{ overflowX: 'auto' }}>
                          <Box
                            component='table'
                            sx={{
                              width: '100%',
                              borderCollapse: 'collapse',
                              '& th, & td': {
                                p: 1.5,
                                textAlign: 'right',
                                fontSize: '0.8rem',
                                borderBottom: t => `1px solid ${t.palette.divider}`
                              },
                              '& th:first-of-type, & td:first-of-type': { textAlign: 'left' },
                              '& th': {
                                fontWeight: 600,
                                color: 'text.secondary',
                                bgcolor: 'action.hover'
                              }
                            }}
                          >
                            <thead>
                              <tr>
                                <th>Vigente desde</th>
                                <th>Margen</th>
                                <th>Precio hora</th>
                                <th>Precio FTE mensual</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.items.map((p, idx) => (
                                <tr key={`${p.currencyCode}-${p.effectiveFrom}-${p.createdAt}`}>
                                  <td>
                                    <Typography
                                      variant='body2'
                                      sx={{ fontWeight: idx === 0 ? 500 : 400 }}
                                      color={idx === 0 ? 'text.primary' : 'text.secondary'}
                                    >
                                      {fmtDate(p.effectiveFrom)}
                                    </Typography>
                                    {idx === 0 && (
                                      <Chip
                                        size='small'
                                        label='Vigente'
                                        color='success'
                                        variant='outlined'
                                        sx={{ ml: 1, height: 18, fontSize: '0.65rem' }}
                                      />
                                    )}
                                  </td>
                                  <td>{fmtPct(p.marginPct)}</td>
                                  <td>{fmtPrice(p.hourlyPrice, p.currencyCode)}</td>
                                  <td>{fmtPrice(p.fteMonthlyPrice, p.currencyCode)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </Box>
                        </Box>
                      </Paper>
                    )
                  })}
                </Stack>
              )}
            </Stack>
          </TabPanel>
        </TabContext>
      ) : null}

      <Divider />
      {roleId ? (
        <Box sx={{ px: 4, py: 2 }}>
          <ImpactPreviewPanel
            entityType='sellable_role'
            entityId={roleId}
            onBlockingStateChange={setImpactBlocking}
          />
        </Box>
      ) : null}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 4 }}>
        <Button variant='outlined' color='secondary' onClick={handleClose}>{GREENHOUSE_COPY.actions.close}</Button>
      </Box>
    </Drawer>
  )
}

export default EditSellableRoleDrawer
