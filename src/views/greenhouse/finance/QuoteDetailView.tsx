'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

import useViewTransitionRouter from '@/hooks/useViewTransitionRouter'

import { QuoteShareDrawer } from './QuoteShareDrawer'
import QuoteApprovalsPanel, { type ApprovalStep } from './governance/QuoteApprovalsPanel'
import QuoteAuditTrail, { type AuditEntry } from './governance/QuoteAuditTrail'
import QuoteTermsSection, { type QuotationTerm } from './governance/QuoteTermsSection'
import QuoteVersionsTimeline, { type VersionHistoryEntry } from './governance/QuoteVersionsTimeline'
import QuoteCurrencyView from './workspace/QuoteCurrencyView'
import QuoteDocumentChain from './workspace/QuoteDocumentChain'
import QuoteHealthCard from './workspace/QuoteHealthCard'
import QuoteSaveAsTemplateDialog from './workspace/QuoteSaveAsTemplateDialog'
import QuoteSendDialog from './workspace/QuoteSendDialog'
import type { FxReadiness } from '@/lib/finance/currency-domain'
import {
  canDecideFinanceQuotationApproval,
  canManageFinanceQuotes,
  isEditableFinanceQuotationStatus
} from '@/lib/finance/quotation-access'

const GREENHOUSE_COPY = getMicrocopy()
// ── Types ──

interface QuoteDetail {
  quoteId: string
  clientId: string | null
  clientName: string | null
  quoteNumber: string | null
  quoteDate: string | null
  dueDate: string | null
  expiryDate: string | null
  description: string | null
  currency: string
  subtotal: number | null
  taxRate: number | null
  taxAmount: number | null
  totalAmount: number
  totalAmountClp: number
  status: string
  convertedToIncomeId: string | null
  nuboxDocumentId: string | null
  dteTypeCode: string | null
  dteFolio: string | null
  source: string
  hubspotQuoteId: string | null
  hubspotDealId: string | null
  notes: string | null
  currentVersion?: number | null
  businessLineCode?: string | null
  effectiveMarginPct?: number | null
  targetMarginPct?: number | null
  marginFloorPct?: number | null
  totalDiscount?: number | null
  totalPrice?: number | null
}

interface HealthState {
  quotationMarginPct: number | null
  marginTargetPct: number | null
  marginFloorPct: number | null
  alerts: Array<{
    level: 'error' | 'warning' | 'info'
    code: string
    message: string
    requiredApproval?: 'finance' | null
  }>
  blocking: boolean
  requiresApproval: boolean
}

interface LineItem {
  lineItemId: string
  lineNumber: number | null
  name: string
  description: string | null
  quantity: number
  unitPrice: number
  discountPercent: number | null
  discountAmount: number | null
  taxAmount: number | null
  totalAmount: number | null
  source: string
  product: { name: string; sku: string | null } | null
}

interface QuoteViewerContext {
  userId: string | null
  roleCodes: string[]
  canEdit: boolean
  canDecideApproval: boolean
}

// ── Config ──

const STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'info' | 'error' | 'primary' | 'secondary' | 'warning' }> = {
  draft: { label: GREENHOUSE_COPY.states.draft, color: 'secondary' },
  pending_approval: { label: 'En aprobación', color: 'warning' },
  approval_rejected: { label: 'Revisión requerida', color: 'error' },
  issued: { label: 'Emitida', color: 'info' },
  sent: { label: 'Emitida', color: 'info' },
  approved: { label: 'Emitida', color: 'info' },
  accepted: { label: 'Aceptada', color: 'success' },
  rejected: { label: 'Revisión requerida', color: 'error' },
  expired: { label: 'Vencida', color: 'secondary' },
  converted: { label: 'Facturada', color: 'primary' }
}

const SOURCE_CHIP_CONFIG: Record<string, { label: string; color: 'info' | 'warning' | 'secondary' }> = {
  nubox: { label: 'Nubox', color: 'info' },
  hubspot: { label: 'HubSpot', color: 'warning' },
  manual: { label: 'Manual', color: 'secondary' }
}

// ── Helpers ──

const formatCLP = (amount: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)

const formatDate = (date: string | null) => {
  if (!date) return '—'

  const [y, m, d] = date.split('-')

  return `${d}/${m}/${y}`
}

const daysUntil = (date: string | null): number | null => {
  if (!date) return null

  const target = new Date(date)
  const now = new Date()

  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

// ── Viewer context ──
const fetchViewerContext = async (): Promise<QuoteViewerContext> => {
  try {
    const res = await fetch('/api/auth/session')

    if (!res.ok) {
      return { userId: null, roleCodes: [], canEdit: false, canDecideApproval: false }
    }

    const session = (await res.json()) as {
      user?: {
        id?: string
        roleCodes?: string[]
        routeGroups?: string[]
        authorizedViews?: string[]
      }
    }

    const roleCodes = Array.isArray(session.user?.roleCodes) ? session.user.roleCodes : []
    const routeGroups = Array.isArray(session.user?.routeGroups) ? session.user.routeGroups : []
    const authorizedViews = Array.isArray(session.user?.authorizedViews) ? session.user.authorizedViews : []
    const accessSubject = { roleCodes, routeGroups, authorizedViews }

    return {
      userId: session.user?.id ?? null,
      roleCodes,
      canEdit: canManageFinanceQuotes(accessSubject),
      canDecideApproval: canDecideFinanceQuotationApproval(accessSubject)
    }
  } catch {
    return { userId: null, roleCodes: [], canEdit: false, canDecideApproval: false }
  }
}

// ── Component ──

const QuoteDetailView = () => {
  const params = useParams()
  const morphRouter = useViewTransitionRouter()
  const quoteId = params.id as string

  const [loading, setLoading] = useState(true)
  const [quote, setQuote] = useState<QuoteDetail | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'overview' | 'chain' | 'versions' | 'approvals' | 'terms' | 'audit'>('overview')

  const [viewer, setViewer] = useState<QuoteViewerContext>({
    userId: null,
    roleCodes: [],
    canEdit: false,
    canDecideApproval: false
  })

  const [versions, setVersions] = useState<VersionHistoryEntry[]>([])
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [versionsError, setVersionsError] = useState<string | null>(null)
  const [creatingVersion, setCreatingVersion] = useState(false)

  const [approvals, setApprovals] = useState<ApprovalStep[]>([])
  const [approvalsLoading, setApprovalsLoading] = useState(false)
  const [approvalsError, setApprovalsError] = useState<string | null>(null)
  const [requestingApproval, setRequestingApproval] = useState(false)

  const [terms, setTerms] = useState<QuotationTerm[]>([])
  const [termsLoading, setTermsLoading] = useState(false)
  const [termsError, setTermsError] = useState<string | null>(null)
  const [savingTerms, setSavingTerms] = useState(false)

  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState<string | null>(null)

  const [health, setHealth] = useState<HealthState | null>(null)
  const [sendOpen, setSendOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const [fxReadiness, setFxReadiness] = useState<FxReadiness | null>(null)

  const [chain, setChain] = useState<{
    purchaseOrders: Array<Record<string, unknown>>
    serviceEntries: Array<Record<string, unknown>>
    incomes: Array<Record<string, unknown>>
    totals: {
      quoted: number | null
      authorized: number | null
      invoiced: number | null
      authorizedVsQuotedDelta: number | null
      invoicedVsQuotedDelta: number | null
    }
  } | null>(null)

  const [chainLoading, setChainLoading] = useState(false)
  const [chainError, setChainError] = useState<string | null>(null)
  const [convertingInvoice, setConvertingInvoice] = useState(false)
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [saveTemplateError, setSaveTemplateError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [quoteRes, linesRes] = await Promise.all([
        fetch(`/api/finance/quotes/${quoteId}`),
        fetch(`/api/finance/quotes/${quoteId}/lines`)
      ])

      if (!quoteRes.ok) {
        setError('No pudimos cargar esta cotizacion. Verifica que existe o intenta de nuevo.')

        return
      }

      const quoteData = (await quoteRes.json()) as QuoteDetail

      setQuote(quoteData)

      if (linesRes.ok) {
        const linesData = (await linesRes.json()) as { items?: LineItem[] }

        setLineItems(linesData.items ?? [])
      }
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [quoteId])

  const fetchVersions = useCallback(async () => {
    setVersionsLoading(true)
    setVersionsError(null)

    try {
      const res = await fetch(`/api/finance/quotes/${quoteId}/versions`)

      if (!res.ok) {
        setVersionsError('No pudimos cargar el historial de versiones.')

        return
      }

      const data = (await res.json()) as { items?: VersionHistoryEntry[] }

      setVersions(data.items ?? [])
    } catch {
      setVersionsError('Error al cargar versiones.')
    } finally {
      setVersionsLoading(false)
    }
  }, [quoteId])

  const fetchApprovals = useCallback(async () => {
    setApprovalsLoading(true)
    setApprovalsError(null)

    try {
      const res = await fetch(`/api/finance/quotes/${quoteId}/approve`)

      if (!res.ok) {
        setApprovalsError('No pudimos cargar los pasos de aprobación.')

        return
      }

      const data = (await res.json()) as { items?: ApprovalStep[] }

      setApprovals(data.items ?? [])
    } catch {
      setApprovalsError('Error al cargar aprobaciones.')
    } finally {
      setApprovalsLoading(false)
    }
  }, [quoteId])

  const fetchTerms = useCallback(async () => {
    setTermsLoading(true)
    setTermsError(null)

    try {
      const res = await fetch(`/api/finance/quotes/${quoteId}/terms`)

      if (!res.ok) {
        setTermsError('No pudimos cargar los términos.')

        return
      }

      const data = (await res.json()) as { items?: QuotationTerm[] }

      setTerms(data.items ?? [])
    } catch {
      setTermsError('Error al cargar términos.')
    } finally {
      setTermsLoading(false)
    }
  }, [quoteId])

  const fetchAudit = useCallback(async () => {
    setAuditLoading(true)
    setAuditError(null)

    try {
      const res = await fetch(`/api/finance/quotes/${quoteId}/audit`)

      if (!res.ok) {
        setAuditError('No pudimos cargar la auditoría.')

        return
      }

      const data = (await res.json()) as { items?: AuditEntry[] }

      setAuditEntries(data.items ?? [])
    } catch {
      setAuditError('Error al cargar auditoría.')
    } finally {
      setAuditLoading(false)
    }
  }, [quoteId])

  const fetchChain = useCallback(async () => {
    setChainLoading(true)
    setChainError(null)

    try {
      const res = await fetch(`/api/finance/quotes/${quoteId}/document-chain`)

      if (!res.ok) {
        setChainError('No pudimos cargar la cadena documental.')

        return
      }

      const data = (await res.json()) as {
        purchaseOrders?: Array<Record<string, unknown>>
        serviceEntries?: Array<Record<string, unknown>>
        incomes?: Array<Record<string, unknown>>
        totals?: {
          quoted: number
          authorized: number
          invoiced: number
          authorizedVsQuotedDelta: number
          invoicedVsQuotedDelta: number
        }
      }

      setChain({
        purchaseOrders: data.purchaseOrders ?? [],
        serviceEntries: data.serviceEntries ?? [],
        incomes: data.incomes ?? [],
        totals: data.totals
          ? {
              quoted: data.totals.quoted,
              authorized: data.totals.authorized,
              invoiced: data.totals.invoiced,
              authorizedVsQuotedDelta: data.totals.authorizedVsQuotedDelta,
              invoicedVsQuotedDelta: data.totals.invoicedVsQuotedDelta
            }
          : {
              quoted: null,
              authorized: null,
              invoiced: null,
              authorizedVsQuotedDelta: null,
              invoicedVsQuotedDelta: null
            }
      })
    } catch {
      setChainError('Error de conexión. Intenta de nuevo.')
    } finally {
      setChainLoading(false)
    }
  }, [quoteId])

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`/api/finance/quotes/${quoteId}/health`)

      if (!res.ok) return

      const data = (await res.json()) as {
        health?: {
          quotationMarginPct: number | null
          marginTargetPct: number | null
          marginFloorPct: number | null
          alerts: Array<{
            level: 'error' | 'warning' | 'info'
            code: string
            message: string
            requiredApproval?: 'finance' | null
          }>
          blocking: boolean
          requiresApproval: boolean
        }
      }

      if (data.health) setHealth(data.health)
    } catch {
      // health is non-critical; silently ignore
    }
  }, [quoteId])

  const handleOpenSendDialog = useCallback(async () => {
    setSendError(null)
    setSendOpen(true)

    // TASK-466 — Prefetch FX readiness so the dialog shows the client-facing
    // gate decision before the user clicks "Emitir". The endpoint already
    // applies tenant scope; a failure here just degrades the alert — the
    // backend command still enforces the gate at submit time.
    if (quote?.currency) {
      try {
        const outputCurrency = quote.currency.toUpperCase()
        const from = 'USD'

        const res = await fetch(
          `/api/finance/exchange-rates/readiness?from=${encodeURIComponent(from)}&to=${encodeURIComponent(outputCurrency)}&domain=pricing_output`
        )

        if (res.ok) {
          const payload = (await res.json()) as FxReadiness

          setFxReadiness(payload)
        } else {
          setFxReadiness(null)
        }
      } catch {
        setFxReadiness(null)
      }
    } else {
      setFxReadiness(null)
    }
  }, [quote?.currency])

  const handleConfirmSend = useCallback(async () => {
    setSending(true)
    setSendError(null)

    try {
      const res = await fetch(`/api/finance/quotes/${quoteId}/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const body = (await res.json().catch(() => ({}))) as {
        sent?: boolean
        approvalRequired?: boolean
        error?: string
      }

      if (!res.ok) {
        setSendError(body.error || 'No pudimos emitir la cotización.')

        return
      }

      setSendOpen(false)
      setActionMessage(
        body.approvalRequired
          ? 'La cotización quedó en aprobación. Notificamos a los aprobadores correspondientes.'
          : 'Cotización emitida.'
      )
      await Promise.all([fetchData(), fetchApprovals(), fetchHealth()])
    } catch {
      setSendError('Error de conexión. Intenta de nuevo.')
    } finally {
      setSending(false)
    }
  }, [quoteId, fetchData, fetchApprovals, fetchHealth])

  const handleDownloadPdf = useCallback(() => {
    window.open(`/api/finance/quotes/${quoteId}/pdf`, '_blank', 'noopener,noreferrer')
  }, [quoteId])

  const handleConvertToInvoice = useCallback(async () => {
    setConvertingInvoice(true)
    setChainError(null)

    try {
      const res = await fetch(`/api/finance/quotes/${quoteId}/convert-to-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const body = (await res.json().catch(() => ({}))) as { error?: string; incomeId?: string }

      if (!res.ok) {
        setChainError(body.error || 'No pudimos convertir la cotización a factura.')

        return
      }

      setActionMessage(`Factura ${body.incomeId ?? ''} creada desde la cotización.`)
      await Promise.all([fetchChain(), fetchData()])
    } catch {
      setChainError('Error de conexión. Intenta de nuevo.')
    } finally {
      setConvertingInvoice(false)
    }
  }, [quoteId, fetchChain, fetchData])

  const handleGoToPurchaseOrder = useCallback((poId: string) => {
    window.open(`/finance/purchase-orders/${poId}`, '_blank', 'noopener,noreferrer')
  }, [])

  const handleGoToHes = useCallback((hesId: string) => {
    window.open(`/finance/hes/${hesId}`, '_blank', 'noopener,noreferrer')
  }, [])

  const handleGoToIncome = useCallback((incomeId: string) => {
    window.open(`/finance/income/${incomeId}`, '_blank', 'noopener,noreferrer')
  }, [])

  const handleSaveAsTemplate = useCallback(
    async (payload: { templateName: string; templateCode: string; description: string | null }) => {
      setSavingTemplate(true)
      setSaveTemplateError(null)

      try {
        const res = await fetch(`/api/finance/quotes/${quoteId}/save-as-template`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        const body = (await res.json().catch(() => ({}))) as { templateCode?: string; error?: string }

        if (!res.ok) {
          setSaveTemplateError(body.error || 'No pudimos guardar el template.')

          return
        }

        setSaveTemplateOpen(false)
        setActionMessage(`Template ${body.templateCode ?? payload.templateCode} creado. Ya está disponible para reutilizarlo.`)
      } catch {
        setSaveTemplateError('Error de conexión. Intenta de nuevo.')
      } finally {
        setSavingTemplate(false)
      }
    },
    [quoteId]
  )

  useEffect(() => {
    fetchData()
    fetchHealth()
  }, [fetchData, fetchHealth])

  useEffect(() => {
    let cancelled = false

    fetchViewerContext().then(ctx => {
      if (!cancelled) setViewer(ctx)
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (tab === 'chain') fetchChain()
    if (tab === 'versions') fetchVersions()
    if (tab === 'approvals') fetchApprovals()
    if (tab === 'terms') fetchTerms()
    if (tab === 'audit') fetchAudit()
  }, [tab, fetchChain, fetchVersions, fetchApprovals, fetchTerms, fetchAudit])

  const handleCreateVersion = useCallback(async () => {
    setCreatingVersion(true)

    try {
      const res = await fetch(`/api/finance/quotes/${quoteId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }

        setVersionsError(body.error || 'No se pudo crear la versión.')

        return
      }

      await Promise.all([fetchVersions(), fetchData()])
    } finally {
      setCreatingVersion(false)
    }
  }, [quoteId, fetchVersions, fetchData])

  const handleRequestApproval = useCallback(async () => {
    setRequestingApproval(true)

    try {
      const res = await fetch(`/api/finance/quotes/${quoteId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request' })
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }

        setApprovalsError(body.error || 'No se pudo evaluar la aprobación.')

        return
      }

      await Promise.all([fetchApprovals(), fetchData()])
    } finally {
      setRequestingApproval(false)
    }
  }, [quoteId, fetchApprovals, fetchData])

  const handleDecideApproval = useCallback(
    async (stepId: string, decision: 'approved' | 'rejected', notes: string | null) => {
      const res = await fetch(`/api/finance/quotes/${quoteId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decide', stepId, decision, notes })
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }

        throw new Error(body.error || 'No se pudo registrar la decisión.')
      }

      await Promise.all([fetchApprovals(), fetchData()])
    },
    [quoteId, fetchApprovals, fetchData]
  )

  const handleSaveTerms = useCallback(
    async (payload: Array<{ termId: string; included: boolean; sortOrder: number }>) => {
      setSavingTerms(true)

      try {
        const res = await fetch(`/api/finance/quotes/${quoteId}/terms`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ terms: payload })
        })

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string }

          setTermsError(body.error || 'No se pudieron guardar los términos.')

          return
        }

        await fetchTerms()
      } finally {
        setSavingTerms(false)
      }
    },
    [quoteId, fetchTerms]
  )

  const totalDiscount = useMemo(
    () => lineItems.reduce((sum, li) => sum + (li.discountAmount ?? 0), 0),
    [lineItems]
  )

  if (loading) {
    return (
      <Stack spacing={4}>
        <Skeleton variant='rounded' height={40} width={200} />
        <Skeleton variant='rounded' height={80} />
        <Skeleton variant='rounded' height={120} />
        <Skeleton variant='rounded' height={300} />
      </Stack>
    )
  }

  if (error || !quote) {
    return (
      <Stack spacing={4}>
        <Button component={Link} href='/finance/quotes' variant='text' startIcon={<i className='tabler-arrow-left' />}>
          Cotizaciones
        </Button>
        <Alert severity='error'>{error || 'Cotizacion no encontrada'}</Alert>
      </Stack>
    )
  }

  const statusConf = STATUS_CONFIG[quote.status] ?? STATUS_CONFIG.draft
  const sourceConf = SOURCE_CHIP_CONFIG[quote.source] ?? SOURCE_CHIP_CONFIG.manual
  const expiryDays = daysUntil(quote.dueDate || quote.expiryDate)

  const expiryColor = (() => {
    if (quote.status === 'expired' || (expiryDays !== null && expiryDays < 0)) return 'error' as const
    if (expiryDays !== null && expiryDays <= 7) return 'warning' as const

    return 'success' as const
  })()

  const expiryLabel = (() => {
    if (expiryDays === null) return 'Sin fecha'
    if (expiryDays < 0) return `Vencida hace ${Math.abs(expiryDays)} dias`

    return `Vence en ${expiryDays} dias`
  })()

  const currentVersion = quote.currentVersion ?? (versions[0]?.versionNumber ?? null)
  const canManageCurrentQuote = viewer.canEdit && isEditableFinanceQuotationStatus(quote.status)

  return (
    <Stack spacing={4}>
      {/* ── Back + Header ── */}
      <Box>
        <Button component={Link} href='/finance/quotes' variant='text' startIcon={<i className='tabler-arrow-left' />} sx={{ mb: 1 }}>
          Cotizaciones
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity', width: 48, height: 48 }}>
              <i className='tabler-file-description' style={{ fontSize: 26, color: 'var(--mui-palette-info-main)' }} />
            </Avatar>
            <Box>
              {/*
                TASK-525: this number receives the same `view-transition-name`
                used by QuotesListView. The browser then morphs the quote
                number from row position to header position on navigation.
              */}
              <Typography
                variant='h5'
                sx={{
                  fontWeight: 500,
                  viewTransitionName: `quote-identity-${quoteId}`
                }}
              >
                {quote.description || quote.quoteNumber || quote.quoteId}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ viewTransitionName: `quote-client-${quoteId}` }}
              >
                {quote.clientName}
                {quote.quoteNumber ? ` · ${quote.quoteNumber}` : ''}
                {currentVersion ? ` · v${currentVersion}` : ''}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <CustomChip round='true' size='small' variant='tonal' color={statusConf.color} label={statusConf.label} />
            <CustomChip round='true' size='small' variant='tonal' color={sourceConf.color} label={sourceConf.label} />
            <Button
              variant='outlined'
              size='small'
              startIcon={<i className='tabler-file-download' />}
              onClick={handleDownloadPdf}
            >
              PDF
            </Button>
            <Button
              variant='outlined'
              size='small'
              color='primary'
              startIcon={<i className='tabler-share' />}
              onClick={() => setShareOpen(true)}
            >
              Compartir
            </Button>
            {canManageCurrentQuote && (
              <Button
                variant='outlined'
                size='small'
                color='primary'
                startIcon={<i className='tabler-edit' />}

                /*
                  TASK-525: enter edit mode through a view transition. The
                  detail header morphs into the QuoteBuilderShell header at
                  /edit instead of cutting.
                */
                onClick={() => morphRouter.push(`/finance/quotes/${quoteId}/edit`)}
              >{GREENHOUSE_COPY.actions.edit}</Button>
            )}
            {canManageCurrentQuote && (
              <Button
                variant='outlined'
                size='small'
                startIcon={<i className='tabler-device-floppy' />}
                onClick={() => {
                  setSaveTemplateError(null)
                  setSaveTemplateOpen(true)
                }}
              >
                Guardar como template
              </Button>
            )}
            {canManageCurrentQuote && (
              <Button
                variant='contained'
                size='small'
                startIcon={<i className='tabler-file-check' />}
                onClick={handleOpenSendDialog}
                disabled={sending}
              >
                Emitir
              </Button>
            )}
            {quote.hubspotQuoteId && (
              <Button
                variant='outlined'
                size='small'
                startIcon={<i className='tabler-external-link' />}
                href={`https://app.hubspot.com/contacts/48713323/record/0-14/${quote.hubspotQuoteId}`}
                target='_blank'
                rel='noopener noreferrer'
                aria-label={`Abrir cotizacion ${quote.quoteNumber || quote.quoteId} en HubSpot`}
              >
                Ver en HubSpot
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      {actionMessage && (
        <Alert severity='success' onClose={() => setActionMessage(null)}>
          {actionMessage}
        </Alert>
      )}

      {/* ── Tabs ── */}
      <Tabs
        value={tab}
        onChange={(_event, value) => setTab(value)}
        variant='scrollable'
        scrollButtons='auto'
      >
        <Tab label='General' value='overview' />
        <Tab label='Cadena documental' value='chain' />
        <Tab label='Versiones' value='versions' />
        <Tab label='Aprobaciones' value='approvals' />
        <Tab label='Términos' value='terms' />
        <Tab label='Auditoría' value='audit' />
      </Tabs>

      {tab === 'overview' && (
        <Stack spacing={4}>
          {/* ── Health ── */}
          {health && (
            <QuoteHealthCard
              quotationId={quote.quoteId}
              businessLineCode={quote.businessLineCode ?? null}
              currency={quote.currency}
              totalPrice={quote.totalPrice ?? quote.totalAmount ?? null}
              totalDiscount={quote.totalDiscount ?? null}
              effectiveMarginPct={health.quotationMarginPct}
              targetMarginPct={health.marginTargetPct}
              floorMarginPct={health.marginFloorPct}
              alerts={health.alerts}
              canRequestApproval={canManageCurrentQuote}
              onRequestApproval={handleOpenSendDialog}
            />
          )}

          {/* ── Currency + FX snapshot (TASK-466) ── */}
          <QuoteCurrencyView
            quotationId={quote.quoteId}
            outputCurrency={quote.currency}
            totalAmountOutput={quote.totalPrice ?? quote.totalAmount ?? null}
          />

          {/* ── KPIs ── */}
          <Grid container spacing={6}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <HorizontalWithSubtitle
                title='Monto total'
                stats={formatCLP(quote.totalAmountClp)}
                subtitle={quote.currency !== 'CLP' ? `${quote.currency} → CLP` : 'CLP'}
                avatarIcon='tabler-currency-dollar'
                avatarColor='primary'
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <HorizontalWithSubtitle
                title='Items'
                stats={String(lineItems.length)}
                subtitle={lineItems.length === 1 ? '1 item en esta cotizacion' : `${lineItems.length} items en esta cotizacion`}
                avatarIcon='tabler-list-details'
                avatarColor='info'
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <HorizontalWithSubtitle
                title='Descuento'
                stats={totalDiscount > 0 ? formatCLP(totalDiscount) : '$0'}
                subtitle={totalDiscount > 0 ? 'Descuento aplicado' : 'Sin descuento'}
                avatarIcon='tabler-discount-2'
                avatarColor={totalDiscount > 0 ? 'warning' : 'secondary'}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <HorizontalWithSubtitle
                title='Vencimiento'
                stats={formatDate(quote.dueDate || quote.expiryDate)}
                subtitle={expiryLabel}
                avatarIcon='tabler-calendar-due'
                avatarColor={expiryColor}
              />
            </Grid>
          </Grid>

          {/* ── Detalle ── */}
          <Card variant='outlined'>
            <CardHeader
              title='Detalle de la cotizacion'
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'secondary.lightOpacity' }}>
                  <i className='tabler-info-circle' style={{ fontSize: 22, color: 'var(--mui-palette-secondary-main)' }} />
                </Avatar>
              }
            />
            <Divider />
            <CardContent>
              <Grid container spacing={4}>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Typography variant='caption' color='text.secondary'>Cliente</Typography>
                  <Typography variant='body2'>{quote.clientName ?? '—'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Typography variant='caption' color='text.secondary'>Fecha de emision</Typography>
                  <Typography variant='body2'>{formatDate(quote.quoteDate)}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Typography variant='caption' color='text.secondary'>Vencimiento</Typography>
                  <Typography variant='body2'>{formatDate(quote.dueDate || quote.expiryDate)}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Typography variant='caption' color='text.secondary'>Moneda</Typography>
                  <Typography variant='body2'>{quote.currency}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Typography variant='caption' color='text.secondary'>Fuente</Typography>
                  <Typography variant='body2'>{sourceConf.label}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Typography variant='caption' color='text.secondary'>Estado</Typography>
                  <Typography variant='body2'>{statusConf.label}</Typography>
                </Grid>
                {quote.dteFolio && (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Typography variant='caption' color='text.secondary'>Folio DTE</Typography>
                    <Typography variant='body2' sx={{ fontSize: '0.8rem' }}>{quote.dteFolio}</Typography>
                  </Grid>
                )}
                {quote.hubspotDealId && (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Typography variant='caption' color='text.secondary'>Deal HubSpot</Typography>
                    <Typography variant='body2' sx={{ fontSize: '0.8rem' }}>{quote.hubspotDealId}</Typography>
                  </Grid>
                )}
                {quote.notes && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant='caption' color='text.secondary'>Notas</Typography>
                    <Typography variant='body2'>{quote.notes}</Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* ── Line Items ── */}
          <Card variant='outlined'>
            <CardHeader
              title={`Items de la cotizacion (${lineItems.length})`}
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                  <i className='tabler-list-details' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
                </Avatar>
              }
            />
            <Divider />

            {lineItems.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }} role='status'>
                <Typography variant='body2' color='text.secondary'>
                  Esta cotizacion no tiene items detallados
                </Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: 40 }}>#</TableCell>
                        <TableCell>Producto</TableCell>
                        <TableCell>Descripcion</TableCell>
                        <TableCell align='right'>Cantidad</TableCell>
                        <TableCell align='right'>Precio unitario</TableCell>
                        <TableCell align='right'>Descuento</TableCell>
                        <TableCell align='right'>Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lineItems.map((li, idx) => (
                        <TableRow key={li.lineItemId} hover>
                          <TableCell>
                            <Typography variant='body2' color='text.secondary'>{li.lineNumber ?? idx + 1}</Typography>
                          </TableCell>
                          <TableCell>
                            {li.product ? (
                              <Box>
                                <Typography variant='body2' sx={{ fontWeight: 500 }}>{li.product.name}</Typography>
                                {li.product.sku && (
                                  <Typography variant='caption' color='text.secondary' sx={{ fontSize: '0.7rem' }}>
                                    {li.product.sku}
                                  </Typography>
                                )}
                              </Box>
                            ) : (
                              <Typography variant='body2' color='text.secondary'>—</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2'>{li.name}</Typography>
                            {li.description && (
                              <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                                {li.description}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align='right'>
                            <Typography variant='body2'>{li.quantity}</Typography>
                          </TableCell>
                          <TableCell align='right'>
                            <Typography variant='body2'>{formatCLP(li.unitPrice)}</Typography>
                          </TableCell>
                          <TableCell align='right'>
                            {(li.discountPercent && li.discountPercent > 0) ? (
                              <Typography variant='body2' color='warning.main'>{li.discountPercent}%</Typography>
                            ) : (
                              <Typography variant='body2' color='text.secondary'>—</Typography>
                            )}
                          </TableCell>
                          <TableCell align='right'>
                            <Typography variant='body2' sx={{ fontWeight: 500 }}>
                              {li.totalAmount !== null ? formatCLP(li.totalAmount) : formatCLP(li.quantity * li.unitPrice)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>

                {/* ── Totales ── */}
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 3 }}>
                  <Box sx={{ minWidth: 220 }}>
                    {quote.subtotal !== null && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant='body2' color='text.secondary'>Subtotal</Typography>
                        <Typography variant='body2'>{formatCLP(quote.subtotal)}</Typography>
                      </Box>
                    )}
                    {quote.taxAmount !== null && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant='body2' color='text.secondary'>
                          IVA{quote.taxRate ? ` (${Math.round(quote.taxRate * 100)}%)` : ''}
                        </Typography>
                        <Typography variant='body2'>{formatCLP(quote.taxAmount)}</Typography>
                      </Box>
                    )}
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant='subtitle2'>Total</Typography>
                      <Typography variant='subtitle2'>{formatCLP(quote.totalAmountClp)}</Typography>
                    </Box>
                  </Box>
                </Box>
              </>
            )}
          </Card>
        </Stack>
      )}

      {tab === 'chain' && (() => {
        const pos = chain?.purchaseOrders ?? []
        const ses = chain?.serviceEntries ?? []
        const incs = chain?.incomes ?? []

        const totals = chain?.totals ?? {
          quoted: null,
          authorized: null,
          invoiced: null,
          authorizedVsQuotedDelta: null,
          invoicedVsQuotedDelta: null
        }

        const toDeltaPct = (abs: number | null, base: number | null) => {
          if (abs === null || base === null || base === 0) return null

          return (abs / base) * 100
        }

        const canConvertSimple =
          viewer.canEdit &&
          (quote.status === 'issued' || quote.status === 'approved' || quote.status === 'sent') &&
          pos.length === 0 &&
          !ses.some(h => (h as { status?: string }).status === 'approved') &&
          incs.length === 0

        return (
          <QuoteDocumentChain
            loading={chainLoading}
            error={chainError}
            quotationStatus={quote.status}
            currency={quote.currency}
            purchaseOrders={pos.map(p => ({
              poId: String((p as { poId: string }).poId),
              poNumber: String((p as { poNumber: string | null }).poNumber ?? ''),
              status: String((p as { status: string }).status) as 'active' | 'consumed' | 'expired' | 'cancelled',
              authorizedAmountClp: (p as { authorizedAmountClp: number | null }).authorizedAmountClp ?? null,
              invoicedAmountClp: (p as { invoicedAmountClp: number | null }).invoicedAmountClp ?? null,
              remainingAmountClp: (p as { remainingAmountClp: number | null }).remainingAmountClp ?? null,
              issueDate: (p as { issueDate: string | null }).issueDate ?? null,
              expiryDate: (p as { expiryDate: string | null }).expiryDate ?? null,
              description: (p as { description: string | null }).description ?? null
            }))}
            serviceEntries={ses.map(h => ({
              hesId: String((h as { hesId: string }).hesId),
              hesNumber: String((h as { hesNumber: string | null }).hesNumber ?? ''),
              purchaseOrderId: (h as { purchaseOrderId: string | null }).purchaseOrderId ?? null,
              status: String((h as { status: string }).status) as 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled',
              servicePeriodStart: (h as { servicePeriodStart: string | null }).servicePeriodStart ?? null,
              servicePeriodEnd: (h as { servicePeriodEnd: string | null }).servicePeriodEnd ?? null,
              amountClp: (h as { amountClp: number | null }).amountClp ?? null,
              amountAuthorizedClp: (h as { amountAuthorizedClp: number | null }).amountAuthorizedClp ?? null,
              incomeId: (h as { incomeId: string | null }).incomeId ?? null,
              invoiced: Boolean((h as { invoiced?: boolean }).invoiced),
              submittedAt: (h as { submittedAt: string | null }).submittedAt ?? null,
              approvedAt: (h as { approvedAt: string | null }).approvedAt ?? null
            }))}
            incomes={incs.map(i => ({
              incomeId: String((i as { incomeId: string }).incomeId),
              invoiceNumber: (i as { invoiceNumber: string | null }).invoiceNumber ?? null,
              invoiceDate: (i as { invoiceDate: string | null }).invoiceDate ?? null,
              totalAmount: Number((i as { totalAmount: number }).totalAmount ?? 0),
              totalAmountClp: Number((i as { totalAmountClp: number }).totalAmountClp ?? 0),
              currency: String((i as { currency: string }).currency ?? 'CLP'),
              paymentStatus: String((i as { paymentStatus: string }).paymentStatus) as 'pending' | 'partial' | 'paid' | 'overdue' | 'written_off',
              sourceHesId: (i as { sourceHesId: string | null }).sourceHesId ?? null,
              nuboxDocumentId: (i as { nuboxDocumentId: string | null }).nuboxDocumentId ?? null,
              dteFolio: (i as { dteFolio: string | null }).dteFolio ?? null
            }))}
            totals={{
              quoted: totals.quoted,
              authorized: totals.authorized,
              invoiced: totals.invoiced,
              authorizedVsQuotedDelta: toDeltaPct(totals.authorizedVsQuotedDelta, totals.quoted),
              invoicedVsQuotedDelta: toDeltaPct(totals.invoicedVsQuotedDelta, totals.quoted)
            }}
            canConvertSimple={canConvertSimple}
            canLinkExisting={viewer.canEdit}
            converting={convertingInvoice}
            onConvertSimple={handleConvertToInvoice}
            onGoToPurchaseOrder={handleGoToPurchaseOrder}
            onGoToHes={handleGoToHes}
            onGoToIncome={handleGoToIncome}
          />
        )
      })()}

      {tab === 'versions' && (
        <QuoteVersionsTimeline
          loading={versionsLoading}
          error={versionsError}
          versions={versions}
          currentVersion={currentVersion}
          quotationStatus={quote.status}
          canCreateVersion={viewer.canEdit}
          creatingVersion={creatingVersion}
          onCreateVersion={handleCreateVersion}
        />
      )}

      {tab === 'approvals' && (
        <QuoteApprovalsPanel
          loading={approvalsLoading}
          error={approvalsError}
          steps={approvals}
          quotationStatus={quote.status}
          canRequestApproval={canManageCurrentQuote}
          canDecide={viewer.canDecideApproval}
          approverRoleCodes={viewer.roleCodes}
          requesting={requestingApproval}
          onRequestApproval={handleRequestApproval}
          onDecide={handleDecideApproval}
        />
      )}

      {tab === 'terms' && (
        <QuoteTermsSection
          loading={termsLoading}
          error={termsError}
          terms={terms}
          canEdit={canManageCurrentQuote}
          saving={savingTerms}
          onSave={handleSaveTerms}
        />
      )}

      {tab === 'audit' && (
        <QuoteAuditTrail loading={auditLoading} error={auditError} entries={auditEntries} />
      )}

      <QuoteSendDialog
        open={sendOpen}
        quotationStatus={quote.status}
        healthSummary={
          health
            ? {
                marginPct: health.quotationMarginPct,
                requiresApproval: health.requiresApproval,
                alerts: health.alerts.map(a => ({ level: a.level, message: a.message }))
              }
            : null
        }
        pendingApprovalSteps={approvals.filter(step => step.status === 'pending').length}
        submitting={sending}
        error={sendError}
        fxReadiness={fxReadiness}
        onClose={() => setSendOpen(false)}
        onConfirm={handleConfirmSend}
      />

      <QuoteSaveAsTemplateDialog
        open={saveTemplateOpen}
        quotationNumber={quote.quoteNumber || quote.quoteId}
        submitting={savingTemplate}
        error={saveTemplateError}
        onClose={() => setSaveTemplateOpen(false)}
        onConfirm={handleSaveAsTemplate}
      />
      <QuoteShareDrawer
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        quoteId={quoteId}
        quotationNumber={quote.quoteNumber || quote.quoteId}
      />
    </Stack>
  )
}

export default QuoteDetailView
