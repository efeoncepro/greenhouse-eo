'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useSearchParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Drawer from '@mui/material/Drawer'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Select from '@mui/material/Select'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'

import { getMicrocopy } from '@/lib/copy'
import { GH_FINIQUITO } from '@/lib/copy/finiquito'
import { GH_MY_NAV } from '@/config/greenhouse-nomenclature'

import CustomChip from '@core/components/mui/Chip'

import GreenhouseFileUploader, { type UploadedFileValue } from '@/components/greenhouse/GreenhouseFileUploader'
import DataTableShell from '@/components/greenhouse/data-table/DataTableShell'
import EmptyState from '@/components/greenhouse/EmptyState'
import Breadcrumb from '@/components/greenhouse/primitives/Breadcrumb'
import DismissibleBanner from '@/components/greenhouse/primitives/DismissibleBanner'
import FieldsProgressChip from '@/components/greenhouse/primitives/FieldsProgressChip'
import FilterTile from '@/components/greenhouse/primitives/FilterTile'
import OperationalPanel from '@/components/greenhouse/primitives/OperationalPanel'

import { AnimatePresence, motion } from '@/libs/FramerMotion'

import useReducedMotion from '@/hooks/useReducedMotion'

import type { HrMemberOption } from '@/types/hr-core'
import type {
  OffboardingCase,
  OffboardingCaseStatus,
  OffboardingSeparationType,
  OffboardingWorkQueue,
  OffboardingWorkQueueActionDescriptor,
  OffboardingWorkQueueFilter,
  OffboardingWorkQueueItem
} from '@/lib/workforce/offboarding'
import { formatDate } from '@views/greenhouse/hr-core/helpers'
import { formatCurrency as formatGreenhouseCurrency } from '@/lib/format'

const GREENHOUSE_COPY = getMicrocopy()

type MembersResponse = {
  members: HrMemberOption[]
}

type ContractExpiryScanResponse = {
  opened: OffboardingCase[]
  scanned: number
  skipped: Array<{ memberId: string; reason: string }>
}

const statusColor: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'secondary',
  needs_review: 'warning',
  approved: 'info',
  scheduled: 'primary',
  blocked: 'error',
  executed: 'success',
  cancelled: 'default'
}

const statusLabel: Record<string, string> = {
  draft: 'Borrador',
  needs_review: 'Requiere revisión',
  approved: 'Aprobado',
  scheduled: 'Programado',
  blocked: 'Bloqueado',
  executed: 'Ejecutado',
  cancelled: 'Cancelado'
}

const documentStatusColor: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'secondary',
  rendered: 'info',
  in_review: 'warning',
  approved: 'primary',
  issued: 'success',
  signed_or_ratified: 'success',
  rejected: 'error',
  voided: 'default',
  superseded: 'default',
  cancelled: 'default'
}

const documentStatusLabel: Record<string, string> = {
  draft: 'Borrador',
  rendered: 'Renderizado',
  in_review: 'En revisión',
  approved: 'Aprobado',
  issued: 'Emitido',
  signed_or_ratified: 'Firmado/ratificado',
  rejected: 'Rechazado',
  voided: 'Anulado',
  superseded: 'Reemitido',
  cancelled: 'Cancelado'
}

const settlementStatusLabel: Record<string, string> = {
  none: 'Sin cálculo',
  draft: 'Borrador',
  calculated: 'Calculado',
  reviewed: 'Revisado',
  approved: 'Cálculo aprobado',
  issued: 'Emitido',
  cancelled: 'Cancelado'
}

const summaryTiles: Array<{
  key: 'all' | 'attention' | 'readyToCalculate' | 'documents' | 'noLaborSettlement'
  filterValue: OffboardingWorkQueueFilter
  icon: string
  tone: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error'
  title: string
  description: string
  statusLabel: string
}> = [
  {
    key: 'all',
    filterValue: 'all',
    icon: 'tabler-list',
    tone: 'info',
    title: 'Todos los casos',
    description: 'Vista completa de la cola',
    statusLabel: 'Cola completa'
  },
  {
    key: 'attention',
    filterValue: 'attention',
    icon: 'tabler-alert-triangle',
    tone: 'warning',
    title: GH_FINIQUITO.resignation.workQueue.summary.attention,
    description: 'Bloqueos, respaldos o ratificación pendiente',
    statusLabel: 'Resolver primero'
  },
  {
    key: 'readyToCalculate',
    filterValue: 'ready_to_calculate',
    icon: 'tabler-calculator',
    tone: 'success',
    title: GH_FINIQUITO.resignation.workQueue.summary.readyToCalculate,
    description: 'Renuncias con prerequisitos completos',
    statusLabel: 'Puede avanzar'
  },
  {
    key: 'documents',
    filterValue: 'documents',
    icon: 'tabler-file-text',
    tone: 'primary',
    title: GH_FINIQUITO.resignation.workQueue.summary.documents,
    description: 'Documento legal por revisar o ratificar',
    statusLabel: 'Legal'
  },
  {
    key: 'noLaborSettlement',
    filterValue: 'no_labor_settlement',
    icon: 'tabler-briefcase',
    tone: 'secondary',
    title: GH_FINIQUITO.resignation.workQueue.summary.noLaborSettlement,
    description: 'Honorarios o proveedor externo',
    statusLabel: 'Fuera de finiquito'
  }
]

const tableColumnSx = {
  py: 2.5
}

const tableFirstColumnSx = {
  py: 2.5,
  pl: { xs: 3, md: 4 }
}

const caseIdSx = {
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',
  color: 'text.secondary'
}

const severityTone: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = {
  neutral: 'secondary',
  info: 'primary',
  warning: 'warning',
  error: 'error',
  success: 'success'
}

const nextStatusFor = (status: OffboardingCaseStatus): OffboardingCaseStatus | null => {
  if (status === 'draft' || status === 'needs_review') return 'approved'
  if (status === 'approved') return 'scheduled'
  if (status === 'scheduled') return 'executed'

  return null
}

const today = () => new Date().toISOString().slice(0, 10)

const HrOffboardingView = () => {
  const theme = useTheme()
  const isDesktopQueue = useMediaQuery(theme.breakpoints.up('md'), { defaultMatches: true })
  const prefersReducedMotion = useReducedMotion()
  const searchParams = useSearchParams()
  const initialMemberId = searchParams.get('memberId') ?? ''
  const [workQueue, setWorkQueue] = useState<OffboardingWorkQueue | null>(null)
  const [members, setMembers] = useState<HrMemberOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [documentSavingCaseId, setDocumentSavingCaseId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<OffboardingWorkQueueFilter>('all')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false)
  const [memberId, setMemberId] = useState(initialMemberId)
  const [separationType, setSeparationType] = useState<OffboardingSeparationType>('resignation')
  const [effectiveDate, setEffectiveDate] = useState(today())
  const [lastWorkingDay, setLastWorkingDay] = useState(today())
  const [notes, setNotes] = useState('')
  const [scanMessage, setScanMessage] = useState<string | null>(null)
  const [settlementSavingCaseId, setSettlementSavingCaseId] = useState<string | null>(null)
  const [reissueTarget, setReissueTarget] = useState<OffboardingCase | null>(null)
  const [reissueReason, setReissueReason] = useState('')
  // TASK-862 Slice E — sign-or-ratify dialog (captura ministro de fe + worker reservation).
  const [signRatifyTarget, setSignRatifyTarget] = useState<OffboardingCase | null>(null)

  const [signRatifyForm, setSignRatifyForm] = useState<{
    ministerKind: 'notary' | 'labor_inspector' | 'union_president' | 'civil_registry'
    ministerName: string
    ministerTaxId: string
    notaria: string
    ratifiedAt: string
    workerReservationOfRights: boolean
    workerReservationNotes: string
  }>({
    ministerKind: 'notary',
    ministerName: '',
    ministerTaxId: '',
    notaria: '',
    ratifiedAt: new Date().toISOString().slice(0, 10),
    workerReservationOfRights: false,
    workerReservationNotes: ''
  })

  // TASK-863 Slice B — Dialog "Subir carta de renuncia".
  const [resignationLetterTarget, setResignationLetterTarget] = useState<OffboardingCase | null>(null)
  const [resignationLetterFile, setResignationLetterFile] = useState<UploadedFileValue | null>(null)
  const [resignationLetterSaving, setResignationLetterSaving] = useState(false)

  // TASK-863 Slice C — Dialog "Declarar pension de alimentos (Ley 21.389)".
  const [maintenanceTarget, setMaintenanceTarget] = useState<OffboardingCase | null>(null)

  const [maintenanceForm, setMaintenanceForm] = useState<{
    variant: 'not_subject' | 'subject'
    amount: string
    beneficiary: string
    evidence: UploadedFileValue | null
  }>({
    variant: 'not_subject',
    amount: '',
    beneficiary: '',
    evidence: null
  })

  const [maintenanceSaving, setMaintenanceSaving] = useState(false)
  const [maintenanceFormError, setMaintenanceFormError] = useState<string | null>(null)

  const queueItems = useMemo(() => workQueue?.items ?? [], [workQueue])

  const filteredItems = useMemo(
    () => queueItems.filter(item => item.case.status !== 'cancelled' && item.filters.includes(filter)),
    [filter, queueItems]
  )

  const visibleCaseCount = filteredItems.length
  const totalCaseCount = queueItems.filter(item => item.case.status !== 'cancelled').length

  const priorityItem = useMemo(
    () =>
      queueItems.find(item => item.case.status !== 'cancelled' && item.filters.includes('attention')) ??
      queueItems.find(item => item.case.status !== 'cancelled' && item.primaryAction) ??
      queueItems.find(item => item.case.status !== 'cancelled') ??
      null,
    [queueItems]
  )

  const selectedItem = queueItems.find(item => item.case.offboardingCaseId === selectedItemId) ?? null
  const inspectedItem = selectedItem ?? priorityItem
  const drawerItem = isDesktopQueue ? null : selectedItem

  const toneFor = (item: OffboardingWorkQueueItem) => severityTone[item.nextStep.severity] ?? 'primary'

  const isItemBusy = (item: OffboardingWorkQueueItem) =>
    saving || settlementSavingCaseId === item.case.offboardingCaseId || documentSavingCaseId === item.case.offboardingCaseId

  const hrefForAction = (actionDescriptor: OffboardingWorkQueueActionDescriptor | null) =>
    actionDescriptor?.href ?? (actionDescriptor?.code === 'review_payment' || actionDescriptor?.code === 'external_provider_close' ? '/hr/payroll' : null)

  const prerequisiteRowsFor = (item: OffboardingWorkQueueItem) => {
    if (!item.prerequisites.required) {
      return [
        {
          key: 'not-required',
          label: 'Finiquito laboral',
          value: 'No requerido',
          complete: true
        }
      ]
    }

    return [
        {
          key: 'resignation-letter',
          label: 'Carta de renuncia',
        value:
          item.prerequisites.resignationLetter === 'missing'
            ? GH_FINIQUITO.resignation.prerequisites.chips.resignationLetterMissing
            : GH_FINIQUITO.resignation.prerequisites.chips.resignationLetterAttached,
          complete: item.prerequisites.resignationLetter !== 'missing'
        },
      {
        key: 'maintenance',
        label: 'Pensión de alimentos',
        value:
          item.prerequisites.maintenanceObligation === 'missing'
            ? GH_FINIQUITO.resignation.prerequisites.chips.maintenanceMissing
            : item.prerequisites.maintenanceObligation === 'subject'
              ? GH_FINIQUITO.resignation.prerequisites.chips.maintenanceSubject
              : GH_FINIQUITO.resignation.prerequisites.chips.maintenanceNotSubject,
        complete: item.prerequisites.maintenanceObligation !== 'missing'
      }
    ]
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const workQueuePath = initialMemberId
        ? `/api/hr/offboarding/work-queue?limit=200&memberId=${encodeURIComponent(initialMemberId)}`
        : '/api/hr/offboarding/work-queue?limit=200'

      const [workQueueRes, membersRes] = await Promise.all([
        fetch(workQueuePath),
        fetch('/api/hr/core/members/options')
      ])

      if (!workQueueRes.ok) throw new Error('No se pudo cargar la cola de offboarding.')
      if (!membersRes.ok) throw new Error('No se pudo cargar el listado de colaboradores.')

      const workQueuePayload = await workQueueRes.json() as OffboardingWorkQueue
      const membersPayload = await membersRes.json() as MembersResponse

      setWorkQueue(workQueuePayload)
      setSelectedItemId(current => {
        if (current && workQueuePayload.items.some(item => item.case.offboardingCaseId === current)) return current

        return null
      })
      setMembers(membersPayload.members)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando offboarding.')
    } finally {
      setLoading(false)
    }
  }, [initialMemberId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const createCase = async () => {
    setSaving(true)
    setError(null)
    setScanMessage(null)

    try {
      const res = await fetch('/api/hr/offboarding/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          separationType,
          effectiveDate,
          lastWorkingDay,
          notes: notes || null
        })
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))

        throw new Error(payload.error || 'No se pudo crear el caso.')
      }

      setNotes('')
      setCreateDrawerOpen(false)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando caso.')
    } finally {
      setSaving(false)
    }
  }

  const transitionCase = async (item: OffboardingCase) => {
    const nextStatus = nextStatusFor(item.status)

    if (!nextStatus) return

    setSaving(true)
    setError(null)
    setScanMessage(null)

    try {
      const res = await fetch(`/api/hr/offboarding/cases/${item.offboardingCaseId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          effectiveDate: item.effectiveDate ?? effectiveDate,
          lastWorkingDay: item.lastWorkingDay ?? lastWorkingDay,
          reason: `transition_from_${item.status}`
        })
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))

        throw new Error(payload.error || 'No se pudo transicionar el caso.')
      }

      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error operando caso.')
    } finally {
      setSaving(false)
    }
  }

  const scanContractExpiry = async () => {
    setSaving(true)
    setError(null)
    setScanMessage(null)

    try {
      const res = await fetch('/api/hr/offboarding/cases/contract-expiry/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysAhead: 30, limit: 100 })
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))

        throw new Error(payload.error || 'No se pudo revisar vencimientos de contrato.')
      }

      const payload = await res.json() as ContractExpiryScanResponse

      setScanMessage(
        `Revisión completada: ${payload.opened.length} caso${payload.opened.length === 1 ? '' : 's'} abierto${payload.opened.length === 1 ? '' : 's'}, ${payload.skipped.length} omitido${payload.skipped.length === 1 ? '' : 's'}.`
      )
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error revisando vencimientos.')
    } finally {
      setSaving(false)
    }
  }

  const runDocumentAction = async (
    item: OffboardingCase,
    action: 'render' | 'submit-review' | 'approve' | 'issue' | 'sign-or-ratify' | 'reissue',
    options?: { reason?: string; signRatifyPayload?: Record<string, unknown> }
  ) => {
    // TASK-862 Slice E — sign-or-ratify ya NO usa placeholder hardcodeado.
    // El handler del boton "Registrar ratificación" abre signRatifyTarget dialog;
    // el dialog submitter llama esta funcion con options.signRatifyPayload poblado.
    // Si action='sign-or-ratify' pero NO hay payload → abrir dialog en lugar de POST.
    if (action === 'sign-or-ratify' && !options?.signRatifyPayload) {
      setSignRatifyTarget(item)

      return
    }

    setDocumentSavingCaseId(item.offboardingCaseId)
    setError(null)
    setScanMessage(null)

    try {
      const endpoint = action === 'render'
        ? `/api/hr/offboarding/cases/${item.offboardingCaseId}/final-settlement/document`
        : action === 'reissue'
          ? `/api/hr/offboarding/cases/${item.offboardingCaseId}/final-settlement/document/reissue`
        : `/api/hr/offboarding/cases/${item.offboardingCaseId}/final-settlement/document/${action}`

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          action === 'sign-or-ratify'
            ? options?.signRatifyPayload ?? {}
            : action === 'reissue'
              ? { reason: options?.reason }
              : {}
        )
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))

        throw new Error(payload.error || 'No se pudo actualizar el documento de finiquito.')
      }

      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error operando documento de finiquito.')
    } finally {
      setDocumentSavingCaseId(null)
    }
  }

  const runSettlementAction = async (
    item: OffboardingCase,
    action: 'calculate' | 'approve'
  ) => {
    setSettlementSavingCaseId(item.offboardingCaseId)
    setError(null)
    setScanMessage(null)

    try {
      const endpoint = action === 'calculate'
        ? `/api/hr/offboarding/cases/${item.offboardingCaseId}/final-settlement`
        : `/api/hr/offboarding/cases/${item.offboardingCaseId}/final-settlement/approve`

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'calculate' ? { sourceRef: { source: 'offboarding_surface' } } : {})
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))

        throw new Error(payload.error || 'No se pudo actualizar el cálculo de finiquito.')
      }

      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error operando cálculo de finiquito.')
    } finally {
      setSettlementSavingCaseId(null)
    }
  }

  const openResignationLetterDialog = (item: OffboardingCase) => {
    setError(null)
    setResignationLetterFile(null)
    setResignationLetterTarget(item)
  }

  const openMaintenanceDialog = (item: OffboardingCase) => {
    setError(null)
    setMaintenanceFormError(null)
    setMaintenanceForm({
      variant: item.maintenanceObligationJson?.variant ?? 'not_subject',
      amount: item.maintenanceObligationJson?.amount != null ? String(item.maintenanceObligationJson.amount) : '',
      beneficiary: item.maintenanceObligationJson?.beneficiary ?? '',
      evidence: null
    })
    setMaintenanceTarget(item)
  }

  const runQueueAction = async (item: OffboardingWorkQueueItem, descriptor: OffboardingWorkQueueActionDescriptor) => {
    const offboardingCase = item.case

    setSelectedItemId(offboardingCase.offboardingCaseId)

    if (descriptor.disabled) return

    switch (descriptor.code) {
      case 'upload_resignation_letter':
      case 'replace_resignation_letter':
        openResignationLetterDialog(offboardingCase)
        break
      case 'declare_maintenance':
      case 'edit_maintenance':
        openMaintenanceDialog(offboardingCase)
        break
      case 'calculate':
        await runSettlementAction(offboardingCase, 'calculate')
        break
      case 'approve_calculation':
        await runSettlementAction(offboardingCase, 'approve')
        break
      case 'render_document':
        await runDocumentAction(offboardingCase, 'render')
        break
      case 'submit_document_review':
        await runDocumentAction(offboardingCase, 'submit-review')
        break
      case 'approve_document':
        await runDocumentAction(offboardingCase, 'approve')
        break
      case 'issue_document':
        await runDocumentAction(offboardingCase, 'issue')
        break
      case 'register_ratification':
        await runDocumentAction(offboardingCase, 'sign-or-ratify')
        break
      case 'reissue_document':
        setError(null)
        setReissueReason('')
        setReissueTarget(offboardingCase)
        break
      case 'transition_approve':
      case 'transition_schedule':
      case 'transition_execute':
        await transitionCase(offboardingCase)
        break
      default:
        break
    }
  }

  const submitReissue = async () => {
    if (!reissueTarget) return

    const reason = reissueReason.trim()

    if (reason.length < 10) {
      setError('Para reemitir el documento, indica una razón operacional de al menos 10 caracteres.')

      return
    }

    await runDocumentAction(reissueTarget, 'reissue', { reason })
    setReissueTarget(null)
    setReissueReason('')
  }

  // TASK-862 Slice E — sign-or-ratify dialog submit. Reemplaza el placeholder
  // `external_process_placeholder` por payload canonico con metadata real del
  // ministro de fe + worker reservation. Backend persiste signatureEvidenceRef
  // como JSONB y mantiene shape forward-compatible para futuros campos.
  const submitSignRatify = async () => {
    if (!signRatifyTarget) return

    const ministerName = signRatifyForm.ministerName.trim()
    const ministerTaxId = signRatifyForm.ministerTaxId.trim()
    const ratifiedAt = signRatifyForm.ratifiedAt
    const notaria = signRatifyForm.notaria.trim() || null
    const notes = signRatifyForm.workerReservationNotes.trim() || null

    if (!ministerName) {
      setError('Indica el nombre del ministro de fe que ratificó el documento.')

      return
    }

    if (!ministerTaxId) {
      setError('Indica el RUT/identificación del ministro de fe.')

      return
    }

    if (!ratifiedAt) {
      setError('Indica la fecha en que se ratificó el documento.')

      return
    }

    if (signRatifyForm.workerReservationOfRights && !notes) {
      setError('Cuando el trabajador consigna reserva, transcribe el texto manuscrito.')

      return
    }

    await runDocumentAction(signRatifyTarget, 'sign-or-ratify', {
      signRatifyPayload: {
        signatureEvidenceAssetId: null,
        signatureEvidenceRef: {
          ministerKind: signRatifyForm.ministerKind,
          ministerName,
          ministerTaxId,
          notaria,
          ratifiedAt,
          source: 'hr_dashboard',
          recordedAt: new Date().toISOString()
        },
        workerReservationOfRights: signRatifyForm.workerReservationOfRights,
        workerReservationNotes: notes
      }
    })

    setSignRatifyTarget(null)
    setSignRatifyForm({
      ministerKind: 'notary',
      ministerName: '',
      ministerTaxId: '',
      notaria: '',
      ratifiedAt: new Date().toISOString().slice(0, 10),
      workerReservationOfRights: false,
      workerReservationNotes: ''
    })
  }

  // TASK-863 Slice B — vincular asset subido al caso de offboarding (endpoint canonico TASK-862 Slice C).
  const submitResignationLetterLink = async () => {
    if (!resignationLetterTarget || !resignationLetterFile) return

    setResignationLetterSaving(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/hr/offboarding/cases/${resignationLetterTarget.offboardingCaseId}/resignation-letter`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assetId: resignationLetterFile.assetId })
        }
      )

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))

        throw new Error(payload.error || 'No se pudo vincular la carta de renuncia.')
      }

      await loadData()
      setResignationLetterTarget(null)
      setResignationLetterFile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al vincular la carta de renuncia.')
    } finally {
      setResignationLetterSaving(false)
    }
  }

  // TASK-863 Slice C — declarar pension de alimentos. Alt A (not_subject) o Alt B (subject + amount + beneficiary + evidence opcional).
  const submitMaintenanceDeclaration = async () => {
    if (!maintenanceTarget) return

    setMaintenanceFormError(null)

    if (maintenanceForm.variant === 'subject') {
      const amountValue = Number(maintenanceForm.amount)

      if (!Number.isFinite(amountValue) || amountValue <= 0) {
        setMaintenanceFormError(GH_FINIQUITO.resignation.prerequisites.maintenanceDialog.validationAmount)

        return
      }

      if (!maintenanceForm.beneficiary.trim()) {
        setMaintenanceFormError(GH_FINIQUITO.resignation.prerequisites.maintenanceDialog.validationBeneficiary)

        return
      }
    }

    setMaintenanceSaving(true)
    setError(null)

    try {
      const body = maintenanceForm.variant === 'not_subject'
        ? { variant: 'not_subject' as const }
        : {
            variant: 'subject' as const,
            amount: Number(maintenanceForm.amount),
            beneficiary: maintenanceForm.beneficiary.trim(),
            evidenceAssetId: maintenanceForm.evidence?.assetId ?? null
          }

      const res = await fetch(
        `/api/hr/offboarding/cases/${maintenanceTarget.offboardingCaseId}/maintenance-obligation`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      )

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))

        throw new Error(payload.error || 'No se pudo declarar la pensión de alimentos.')
      }

      await loadData()
      setMaintenanceTarget(null)
      setMaintenanceForm({ variant: 'not_subject', amount: '', beneficiary: '', evidence: null })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al declarar la pensión de alimentos.')
    } finally {
      setMaintenanceSaving(false)
    }
  }

  const renderCaseInspector = (item: OffboardingWorkQueueItem, mode: 'panel' | 'drawer') => {
    const tone = toneFor(item)
    const primaryAction = item.primaryAction
    const primaryHref = hrefForAction(primaryAction)
    const busy = isItemBusy(item)

    const primaryButton = primaryAction
      ? primaryHref
        ? (
            <Button fullWidth variant='contained' color='primary' disabled={busy || primaryAction.disabled} href={primaryHref}>
              {busy ? 'Procesando' : primaryAction.label}
            </Button>
          )
        : (
            <Button fullWidth variant='contained' color='primary' disabled={busy || primaryAction.disabled} onClick={() => void runQueueAction(item, primaryAction)}>
              {busy ? 'Procesando' : primaryAction.label}
            </Button>
          )
      : null

    return (
      <Stack spacing={4} sx={{ height: '100%' }}>
        <Stack direction='row' justifyContent='space-between' alignItems='flex-start' spacing={3}>
          <Stack spacing={1} sx={{ minWidth: 0 }}>
            <Typography variant='overline' color='text.secondary' sx={{ fontVariantNumeric: 'tabular-nums' }}>
              Caso · {item.case.publicId}
            </Typography>
            <Typography variant='h4' sx={{ lineHeight: 1.15 }}>
              {item.collaborator.displayName ?? item.case.memberId ?? 'Sin colaborador'}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {item.collaborator.roleTitle ?? 'Detalle operativo del caso'}
            </Typography>
          </Stack>
          {mode === 'drawer' ? (
            <IconButton aria-label={GREENHOUSE_COPY.aria.closeDrawer} onClick={() => setSelectedItemId(null)}>
              <i className='tabler-x' aria-hidden='true' />
            </IconButton>
          ) : null}
        </Stack>

        <Box
          sx={theme => ({
            p: 3,
            borderRadius: `${theme.shape.customBorderRadius.lg}px`,
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: alpha(theme.palette[tone].main, 0.05)
          })}
        >
          <Stack spacing={1.5}>
            <Stack direction='row' alignItems='center' spacing={1.5}>
              <Box
                aria-hidden
                sx={theme => ({
                  width: 34,
                  height: 34,
                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                  display: 'grid',
                  placeItems: 'center',
                  color: `${tone}.main`,
                  backgroundColor: alpha(theme.palette[tone].main, 0.12)
                })}
              >
                <i className={item.nextStep.severity === 'warning' ? 'tabler-alert-triangle' : item.nextStep.severity === 'success' ? 'tabler-circle-check' : 'tabler-arrow-right'} />
              </Box>
              <Stack spacing={0.25}>
                <Typography variant='subtitle2'>{item.nextStep.label}</Typography>
                <Typography variant='caption' color='text.secondary'>Próxima decisión operativa</Typography>
              </Stack>
            </Stack>
            {(() => {
              const hint = item.progress.nextStepHint
              const help = item.closureLane.helpText

              const detail = hint && hint !== item.nextStep.label
                ? hint
                : help && help !== item.nextStep.label
                  ? help
                  : 'Revisa el detalle del caso antes de continuar.'

              return (
                <Typography variant='body2' color='text.secondary'>{detail}</Typography>
              )
            })()}
          </Stack>
        </Box>

        <Stack spacing={2}>
          <Typography variant='subtitle2'>Estado del cierre</Typography>
          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
            <CustomChip round='true' size='small' color={statusColor[item.case.status] ?? 'default'} label={statusLabel[item.case.status] ?? item.case.status} />
            {item.latestDocument ? <CustomChip round='true' size='small' variant='tonal' color={documentStatusColor[item.latestDocument.documentStatus] ?? 'default'} label={documentStatusLabel[item.latestDocument.documentStatus] ?? item.latestDocument.documentStatus} /> : null}
          </Stack>
          <FieldsProgressChip filled={item.progress.completed} total={item.progress.total} srLabel={(filled, total) => `${item.case.publicId}: ${filled} de ${total} pasos listos.`} suffix={total => `de ${total} pasos`} readyLabel={item.progress.completed >= item.progress.total ? 'Listo' : undefined} />
        </Stack>

        <Stack spacing={2}>
          <Typography variant='subtitle2'>Prerequisitos</Typography>
          <Stack spacing={1.5}>
            {prerequisiteRowsFor(item).map(row => (
              <Stack
                key={row.key}
                direction='row'
                alignItems='center'
                justifyContent='space-between'
                spacing={2}
                sx={theme => ({
                  px: 2.5,
                  py: 2,
                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor: row.complete ? alpha(theme.palette.success.main, 0.04) : alpha(theme.palette.warning.main, 0.05)
                })}
              >
                <Stack direction='row' alignItems='center' spacing={1.5} sx={{ minWidth: 0 }}>
                  <Box aria-hidden sx={{ color: row.complete ? 'success.main' : 'warning.main', display: 'grid', placeItems: 'center' }}>
                    <i className={row.complete ? 'tabler-circle-check' : 'tabler-alert-circle'} />
                  </Box>
                  <Typography variant='body2' sx={{ fontWeight: 700 }}>{row.label}</Typography>
                </Stack>
                <Typography variant='caption' color='text.secondary' sx={{ textAlign: 'right' }}>{row.value}</Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>

        {item.attentionReasons.length ? (
          <Stack spacing={1.5}>
            <Typography variant='subtitle2'>Bloqueos visibles</Typography>
            {item.attentionReasons.map(reason => <Alert key={reason} severity='warning' variant='outlined'>{reason}</Alert>)}
          </Stack>
        ) : null}

        {item.latestSettlement ? (
          <Box sx={theme => ({ px: 3, py: 2.5, borderRadius: `${theme.shape.customBorderRadius.md}px`, border: `1px solid ${theme.palette.divider}`, backgroundColor: alpha(theme.palette.primary.main, 0.035) })}>
            <Stack direction='row' justifyContent='space-between' spacing={3}>
              <Typography variant='body2' color='text.secondary'>{settlementStatusLabel[item.latestSettlement.calculationStatus] ?? item.latestSettlement.calculationStatus}</Typography>
              <Typography variant='body2' sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                Neto {formatGreenhouseCurrency(item.latestSettlement.netPayable, 'CLP', { maximumFractionDigits: 0 }, 'es-CL')}
              </Typography>
            </Stack>
          </Box>
        ) : null}

        <Stack spacing={2} sx={{ mt: 'auto' }}>
          {primaryButton}
          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
            {item.secondaryActions.map(actionDescriptor => {
              const iconClass = actionDescriptor.code === 'download_pdf'
                ? 'tabler-file-type-pdf'
                : actionDescriptor.code === 'reissue_document'
                  ? 'tabler-refresh'
                  : actionDescriptor.code === 'replace_resignation_letter'
                    ? 'tabler-file-replace'
                    : actionDescriptor.code === 'edit_maintenance'
                      ? 'tabler-edit'
                      : 'tabler-arrow-right'

              const startIcon = <i className={iconClass} aria-hidden='true' />

              return actionDescriptor.href ? (
                <Button key={actionDescriptor.code} size='small' variant='outlined' color='secondary' startIcon={startIcon} href={actionDescriptor.href} target='_blank' rel='noreferrer' disabled={actionDescriptor.disabled || saving}>
                  {actionDescriptor.label}
                </Button>
              ) : (
                <Button key={actionDescriptor.code} size='small' variant='outlined' color='secondary' startIcon={startIcon} disabled={actionDescriptor.disabled || saving} onClick={() => void runQueueAction(item, actionDescriptor)}>
                  {actionDescriptor.label}
                </Button>
              )
            })}
          </Stack>
        </Stack>
      </Stack>
    )
  }

  if (loading) {
    return (
      <Stack spacing={6}>
        <Skeleton variant='rounded' height={64} />
        <Skeleton variant='rounded' height={180} />
        <Skeleton variant='rounded' height={360} />
      </Stack>
    )
  }

  return (
    <Stack spacing={6}>
      {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}
      {scanMessage && <Alert severity='info' onClose={() => setScanMessage(null)}>{scanMessage}</Alert>}

      <Dialog
        open={Boolean(reissueTarget)}
        onClose={() => {
          if (documentSavingCaseId) return

          setReissueTarget(null)
          setReissueReason('')
        }}
        fullWidth
        maxWidth='sm'
      >
        <DialogTitle>Reemitir documento de finiquito</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Alert severity='warning'>
              La versión actual quedará como reemitida y se generará un nuevo PDF versionado. El asset anterior se conserva para auditoría.
            </Alert>
            <TextField
              autoFocus
              label='Razón de reemisión'
              value={reissueReason}
              onChange={event => setReissueReason(event.target.value)}
              minRows={3}
              multiline
              fullWidth
              required
              helperText='Ejemplo: reemisión por actualización de plantilla aprobada o corrección documental auditada.'
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant='text'
            disabled={Boolean(documentSavingCaseId)}
            onClick={() => {
              setReissueTarget(null)
              setReissueReason('')
            }}
          >{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button
            variant='contained'
            disabled={Boolean(documentSavingCaseId) || reissueReason.trim().length < 10}
            onClick={submitReissue}
          >
            {documentSavingCaseId ? 'Reemitiendo' : 'Reemitir'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* TASK-862 Slice E — Sign-or-ratify dialog: captura datos del ministro de fe y reserva de derechos
          del trabajador post-ratificación física. Reemplaza el placeholder external_process_placeholder. */}
      <Dialog
        open={Boolean(signRatifyTarget)}
        onClose={() => {
          if (documentSavingCaseId) return

          setSignRatifyTarget(null)
        }}
        fullWidth
        maxWidth='sm'
      >
        <DialogTitle>Registrar ratificación del finiquito</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Alert severity='info'>
              Completa los datos del ministro de fe que ratificó el documento (notario, inspector del trabajo, presidente del
              sindicato u oficial del Registro Civil). Si el trabajador consignó reserva de derechos, transcríbela tal como la
              escribió.
            </Alert>
            <FormControl fullWidth required>
              <InputLabel id='minister-kind-label'>Ministro de fe</InputLabel>
              <Select
                labelId='minister-kind-label'
                label='Ministro de fe'
                value={signRatifyForm.ministerKind}
                onChange={event => setSignRatifyForm(prev => ({ ...prev, ministerKind: event.target.value as typeof prev.ministerKind }))}
              >
                <MenuItem value='notary'>{GH_FINIQUITO.resignation.ministro.kindLabel.notary}</MenuItem>
                <MenuItem value='labor_inspector'>{GH_FINIQUITO.resignation.ministro.kindLabel.labor_inspector}</MenuItem>
                <MenuItem value='union_president'>{GH_FINIQUITO.resignation.ministro.kindLabel.union_president}</MenuItem>
                <MenuItem value='civil_registry'>{GH_FINIQUITO.resignation.ministro.kindLabel.civil_registry}</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label='Nombre completo'
              value={signRatifyForm.ministerName}
              onChange={event => setSignRatifyForm(prev => ({ ...prev, ministerName: event.target.value }))}
              fullWidth
              required
            />
            <TextField
              label='RUT / Identificación'
              value={signRatifyForm.ministerTaxId}
              onChange={event => setSignRatifyForm(prev => ({ ...prev, ministerTaxId: event.target.value }))}
              fullWidth
              required
              helperText='Formato RUT chileno (ej. 12.345.678-9). Para inspectores del trabajo u oficiales del Registro Civil, indica su identificación oficial.'
            />
            <TextField
              label='Notaría / Oficina (opcional)'
              value={signRatifyForm.notaria}
              onChange={event => setSignRatifyForm(prev => ({ ...prev, notaria: event.target.value }))}
              fullWidth
              helperText='Ej.: 25° Notaría de Santiago, Inspección Provincial de Santiago Centro.'
            />
            <TextField
              label='Fecha de ratificación'
              type='date'
              value={signRatifyForm.ratifiedAt}
              onChange={event => setSignRatifyForm(prev => ({ ...prev, ratifiedAt: event.target.value }))}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={signRatifyForm.workerReservationOfRights}
                  onChange={event => setSignRatifyForm(prev => ({ ...prev, workerReservationOfRights: event.target.checked }))}
                />
              }
              label='El trabajador consignó reserva de derechos'
            />
            {signRatifyForm.workerReservationOfRights && (
              <TextField
                label='Texto de la reserva consignada'
                value={signRatifyForm.workerReservationNotes}
                onChange={event => setSignRatifyForm(prev => ({ ...prev, workerReservationNotes: event.target.value }))}
                multiline
                minRows={3}
                fullWidth
                required
                helperText='Transcribe literalmente lo que el trabajador escribió de su puño y letra en el espacio de reserva.'
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant='text'
            disabled={Boolean(documentSavingCaseId)}
            onClick={() => setSignRatifyTarget(null)}
          >
            {GREENHOUSE_COPY.actions.cancel}
          </Button>
          <Button
            variant='contained'
            disabled={Boolean(documentSavingCaseId) || !signRatifyForm.ministerName.trim() || !signRatifyForm.ministerTaxId.trim() || !signRatifyForm.ratifiedAt}
            onClick={submitSignRatify}
          >
            {documentSavingCaseId ? 'Registrando' : 'Registrar ratificación'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* TASK-863 Slice B — Subir carta de renuncia ratificada */}
      <Dialog
        open={Boolean(resignationLetterTarget)}
        onClose={() => {
          if (resignationLetterSaving) return

          setResignationLetterTarget(null)
          setResignationLetterFile(null)
        }}
        fullWidth
        maxWidth='sm'
      >
        <DialogTitle>{GH_FINIQUITO.resignation.prerequisites.resignationLetterDialog.title}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Typography variant='body2' color='text.secondary'>
              {GH_FINIQUITO.resignation.prerequisites.resignationLetterDialog.description}
            </Typography>
            <GreenhouseFileUploader
              contextType='resignation_letter_ratified_draft'
              value={resignationLetterFile}
              onChange={value => setResignationLetterFile(value)}
              title={GH_FINIQUITO.resignation.prerequisites.resignationLetterDialog.uploaderTitle}
              helperText={GH_FINIQUITO.resignation.prerequisites.resignationLetterDialog.uploaderHelper}
              ownerMemberId={resignationLetterTarget?.memberId ?? null}
              metadataLabel={resignationLetterTarget?.publicId ?? null}
              disabled={resignationLetterSaving}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            color='secondary'
            variant='tonal'
            disabled={resignationLetterSaving}
            onClick={() => {
              setResignationLetterTarget(null)
              setResignationLetterFile(null)
            }}
          >
            {GH_FINIQUITO.resignation.prerequisites.resignationLetterDialog.cancel}
          </Button>
          <Button
            variant='contained'
            disabled={resignationLetterSaving || !resignationLetterFile}
            onClick={submitResignationLetterLink}
          >
            {resignationLetterSaving
              ? GH_FINIQUITO.resignation.prerequisites.resignationLetterDialog.savingCta
              : GH_FINIQUITO.resignation.prerequisites.resignationLetterDialog.cta}
          </Button>
        </DialogActions>
      </Dialog>

      {/* TASK-863 Slice C — Declarar pension de alimentos (Ley 21.389) */}
      <Dialog
        open={Boolean(maintenanceTarget)}
        onClose={() => {
          if (maintenanceSaving) return

          setMaintenanceTarget(null)
          setMaintenanceForm({ variant: 'not_subject', amount: '', beneficiary: '', evidence: null })
          setMaintenanceFormError(null)
        }}
        fullWidth
        maxWidth='sm'
      >
        <DialogTitle>{GH_FINIQUITO.resignation.prerequisites.maintenanceDialog.title}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Typography variant='body2' color='text.secondary'>
              {GH_FINIQUITO.resignation.prerequisites.maintenanceDialog.description}
            </Typography>
            <FormControl>
              <Typography variant='caption' color='text.secondary' sx={{ mb: 1 }}>
                {GH_FINIQUITO.resignation.prerequisites.maintenanceDialog.variantLabel}
              </Typography>
              <RadioGroup
                value={maintenanceForm.variant}
                onChange={event =>
                  setMaintenanceForm(prev => ({
                    ...prev,
                    variant: event.target.value === 'subject' ? 'subject' : 'not_subject'
                  }))
                }
              >
                <FormControlLabel
                  value='not_subject'
                  control={<Radio />}
                  label={GH_FINIQUITO.resignation.prerequisites.maintenanceDialog.variantNotSubject}
                />
                <FormControlLabel
                  value='subject'
                  control={<Radio />}
                  label={GH_FINIQUITO.resignation.prerequisites.maintenanceDialog.variantSubject}
                />
              </RadioGroup>
            </FormControl>
            {maintenanceForm.variant === 'subject' && (
              <Stack spacing={3}>
                <TextField
                  label={GH_FINIQUITO.resignation.prerequisites.maintenanceDialog.amountLabel}
                  helperText={GH_FINIQUITO.resignation.prerequisites.maintenanceDialog.amountHelper}
                  type='number'
                  value={maintenanceForm.amount}
                  onChange={event => setMaintenanceForm(prev => ({ ...prev, amount: event.target.value }))}
                  inputProps={{ min: 1, step: 1 }}
                  disabled={maintenanceSaving}
                />
                <TextField
                  label={GH_FINIQUITO.resignation.prerequisites.maintenanceDialog.beneficiaryLabel}
                  helperText={GH_FINIQUITO.resignation.prerequisites.maintenanceDialog.beneficiaryHelper}
                  value={maintenanceForm.beneficiary}
                  onChange={event => setMaintenanceForm(prev => ({ ...prev, beneficiary: event.target.value }))}
                  disabled={maintenanceSaving}
                />
                <GreenhouseFileUploader
                  contextType='evidence_draft'
                  value={maintenanceForm.evidence}
                  onChange={value => setMaintenanceForm(prev => ({ ...prev, evidence: value }))}
                  title={GH_FINIQUITO.resignation.prerequisites.maintenanceDialog.evidenceTitle}
                  helperText={GH_FINIQUITO.resignation.prerequisites.maintenanceDialog.evidenceHelper}
                  ownerMemberId={maintenanceTarget?.memberId ?? null}
                  metadataLabel={`${maintenanceTarget?.publicId ?? ''} · pensión alimentos`}
                  disabled={maintenanceSaving}
                />
              </Stack>
            )}
            {maintenanceFormError && (
              <Alert severity='error' onClose={() => setMaintenanceFormError(null)}>
                {maintenanceFormError}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            color='secondary'
            variant='tonal'
            disabled={maintenanceSaving}
            onClick={() => {
              setMaintenanceTarget(null)
              setMaintenanceForm({ variant: 'not_subject', amount: '', beneficiary: '', evidence: null })
              setMaintenanceFormError(null)
            }}
          >
            {GH_FINIQUITO.resignation.prerequisites.maintenanceDialog.cancel}
          </Button>
          <Button
            variant='contained'
            disabled={maintenanceSaving}
            onClick={submitMaintenanceDeclaration}
          >
            {maintenanceSaving
              ? GH_FINIQUITO.resignation.prerequisites.maintenanceDialog.savingCta
              : GH_FINIQUITO.resignation.prerequisites.maintenanceDialog.cta}
          </Button>
        </DialogActions>
      </Dialog>

      <Drawer
        anchor='right'
        open={createDrawerOpen}
        onClose={() => {
          if (!saving) setCreateDrawerOpen(false)
        }}
        PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, p: 0 } }}
      >
        <Stack spacing={4} sx={{ p: 6 }}>
          <Stack direction='row' alignItems='flex-start' justifyContent='space-between' spacing={3}>
            <Stack spacing={1}>
              <Typography variant='h5'>Nuevo caso</Typography>
              <Typography variant='body2' color='text.secondary'>
                Crea el agregado de salida. El finiquito y documentos quedan para sus lanes posteriores.
              </Typography>
            </Stack>
            <IconButton aria-label={GREENHOUSE_COPY.aria.closeDrawer} onClick={() => setCreateDrawerOpen(false)} disabled={saving}>
              <i className='tabler-x' aria-hidden='true' />
            </IconButton>
          </Stack>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Colaborador</InputLabel>
                <Select label='Colaborador' value={memberId} onChange={event => setMemberId(event.target.value)}>
                  {members.map(member => (
                    <MenuItem key={member.memberId} value={member.memberId}>
                      {member.displayName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Causal</InputLabel>
                <Select
                  label='Causal'
                  value={separationType}
                  onChange={event => setSeparationType(event.target.value as OffboardingSeparationType)}
                >
                  <MenuItem value='resignation'>Renuncia</MenuItem>
                  <MenuItem value='termination'>Término</MenuItem>
                  <MenuItem value='fixed_term_expiry'>Fin plazo fijo</MenuItem>
                  <MenuItem value='mutual_agreement'>Mutuo acuerdo</MenuItem>
                  <MenuItem value='contract_end'>Fin contrato</MenuItem>
                  <MenuItem value='relationship_transition'>Transición</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth type='date' label='Salida efectiva' value={effectiveDate} onChange={event => setEffectiveDate(event.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth type='date' label='Último día' value={lastWorkingDay} onChange={event => setLastWorkingDay(event.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline minRows={3} label='Notas' value={notes} onChange={event => setNotes(event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button fullWidth variant='contained' disabled={!memberId || saving} onClick={createCase}>
                {saving ? GREENHOUSE_COPY.loading.saving : GREENHOUSE_COPY.actions.create}
              </Button>
            </Grid>
          </Grid>
        </Stack>
      </Drawer>

      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' alignItems={{ xs: 'flex-start', md: 'flex-end' }} spacing={3}>
        <Stack spacing={1}>
          <Breadcrumb
            items={[
              { label: GH_MY_NAV.dashboard.label, href: '/home' },
              { label: GH_FINIQUITO.resignation.workQueue.title }
            ]}
          />
          <Typography variant='h4'>{GH_FINIQUITO.resignation.workQueue.title}</Typography>
          <Typography variant='body1' color='text.secondary'>{GH_FINIQUITO.resignation.workQueue.subtitle}</Typography>
        </Stack>
        <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
          <Button variant='tonal' color='secondary' disabled={saving || loading} startIcon={<i className='tabler-refresh' aria-hidden='true' />} onClick={scanContractExpiry}>
            Revisar contratos
          </Button>
          <Button variant='contained' startIcon={<i className='tabler-plus' aria-hidden='true' />} onClick={() => setCreateDrawerOpen(true)}>
            Nuevo caso
          </Button>
        </Stack>
      </Stack>

      <Box
        role='tablist'
        aria-label={GH_FINIQUITO.resignation.workQueue.title}
        sx={theme => ({
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))', xl: 'repeat(5, minmax(0, 1fr))' },
          gap: 0,
          overflow: 'hidden',
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: `${theme.shape.customBorderRadius.lg}px`,
          backgroundColor: 'background.paper',
          boxShadow: theme.shadows[1]
        })}
      >
        {summaryTiles.map((tile, index) => {
          const value = tile.key === 'all' ? (workQueue?.summary.total ?? 0) : (workQueue?.summary[tile.key] ?? 0)
          const isActive = filter === tile.filterValue
          const divider = `1px solid ${theme.palette.divider}`

          return (
            <FilterTile
              key={tile.key}
              tone={tile.tone}
              icon={tile.icon}
              title={tile.title}
              description={tile.description}
              value={value}
              isActive={isActive}
              onSelect={() => setFilter(tile.filterValue)}
              ariaControls='offboarding-queue-list'
              activeBarLayoutId='offboarding-kpi-active-bar'
              borders={{
                top: index === 0 ? false : divider,
                left: index === 0 ? false : divider
              }}
            />
          )
        })}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(360px, 420px)' },
          gap: 4,
          alignItems: 'start'
        }}
      >
        <OperationalPanel
          title='Cola de casos'
          subheader='Escanea por bloqueo, selecciona un caso y ejecuta la acción desde el inspector.'
          icon='tabler-list-check'
          action={isDesktopQueue ? <CustomChip round='true' color='primary' label={`${visibleCaseCount} de ${totalCaseCount} visibles`} /> : null}
        >
          <Stack spacing={4}>
            {workQueue?.degradedReasons.length ? (
              <Alert severity='warning' variant='outlined'>La cola cargó con datos parciales: {workQueue.degradedReasons.join(', ')}.</Alert>
            ) : (
              <DismissibleBanner storageKey='gh.offboarding.evidenceBanner.dismissed.v1'>
                La cola marca bloqueos con evidencia disponible; si falta respaldo, queda explícito antes de calcular o emitir.
              </DismissibleBanner>
            )}

            {filteredItems.length ? (
              !isDesktopQueue ? (
                <Stack spacing={2.5}>
                  {filteredItems.map(item => {
                    const itemCase = item.case
                    const rowTone = toneFor(item)

                    return (
                      <Box
                        key={itemCase.offboardingCaseId}
                        role='button'
                        tabIndex={0}
                        aria-label={`${GREENHOUSE_COPY.actions.view} ${itemCase.publicId}`}
                        onClick={() => setSelectedItemId(itemCase.offboardingCaseId)}
                        onKeyDown={event => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setSelectedItemId(itemCase.offboardingCaseId)
                          }
                        }}
                        sx={theme => ({
                          p: 3,
                          border: `1px solid ${selectedItemId === itemCase.offboardingCaseId ? alpha(theme.palette[rowTone].main, 0.48) : theme.palette.divider}`,
                          borderLeft: `4px solid ${theme.palette[rowTone].main}`,
                          borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                          backgroundColor: selectedItemId === itemCase.offboardingCaseId ? alpha(theme.palette[rowTone].main, 0.045) : 'background.paper',
                          cursor: 'pointer',
                          transition: 'border-color 160ms ease, background-color 160ms ease, transform 160ms ease',
                          '&:hover': {
                            transform: 'translateY(-1px)',
                            backgroundColor: alpha(theme.palette[rowTone].main, 0.035)
                          },
                          '@media (prefers-reduced-motion: reduce)': {
                            transition: 'none',
                            '&:hover': { transform: 'none' }
                          },
                          '&:focus-visible': {
                            outline: `2px solid ${theme.palette.primary.main}`,
                            outlineOffset: 2
                          }
                        })}
                      >
                        <Stack spacing={2.5}>
                          <Stack spacing={2}>
                            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                              <Typography variant='body2' sx={{ fontWeight: 800 }}>
                                {item.collaborator.displayName ?? itemCase.memberId ?? 'Sin colaborador'}
                              </Typography>
                              <Typography variant='caption' sx={caseIdSx}>
                                {itemCase.publicId} · Último día {formatDate(itemCase.lastWorkingDay)}
                              </Typography>
                            </Stack>
                          </Stack>
                          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                            <CustomChip round='true' size='small' variant='tonal' color={statusColor[itemCase.status] ?? 'default'} label={statusLabel[itemCase.status] ?? itemCase.status} />
                            <CustomChip round='true' size='small' variant='tonal' color={item.closureLane.allowsFinalSettlement ? 'primary' : 'secondary'} label={item.closureLane.label} />
                          </Stack>
                          <Stack spacing={0.25}>
                            <Typography variant='caption' color='text.secondary'>Próximo paso</Typography>
                            <Typography variant='body2' sx={{ fontWeight: 800, color: `${rowTone}.main` }}>
                              {item.nextStep.label}
                            </Typography>
                          </Stack>
                          <FieldsProgressChip filled={item.progress.completed} total={item.progress.total} srLabel={(filled, total) => `${itemCase.publicId}: ${filled} de ${total} pasos listos.`} suffix={total => `de ${total} pasos`} readyLabel={item.progress.completed >= item.progress.total ? 'Listo' : undefined} nextStepHint={item.progress.nextStepHint ?? undefined} />
                        </Stack>
                      </Box>
                    )
                  })}
                </Stack>
              ) : (
                <DataTableShell identifier='offboarding-work-queue' ariaLabel='Cola operacional de offboarding' density='compact' stickyFirstColumn>
                  <Table size='small' sx={{ minWidth: 760 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Colaborador</TableCell>
                        <TableCell>Caso</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell>Próximo paso</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredItems.map(item => {
                        const itemCase = item.case
                        const rowTone = toneFor(item)
                        const openDetail = () => setSelectedItemId(itemCase.offboardingCaseId)

                        return (
                          <TableRow
                            key={itemCase.offboardingCaseId}
                            hover
                            selected={selectedItemId === itemCase.offboardingCaseId || (!selectedItemId && priorityItem?.case.offboardingCaseId === itemCase.offboardingCaseId)}
                            tabIndex={0}
                            aria-label={`${GREENHOUSE_COPY.actions.view} ${itemCase.publicId}`}
                            onClick={openDetail}
                            onKeyDown={event => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                openDetail()
                              }
                            }}
                            sx={theme => ({
                              cursor: 'pointer',
                              position: 'relative',
                              transition: 'background-color 200ms cubic-bezier(0.2, 0, 0, 1), box-shadow 200ms cubic-bezier(0.2, 0, 0, 1)',
                              '&:focus-visible': {
                                outline: `2px solid ${theme.palette.primary.main}`,
                                outlineOffset: -2
                              },
                              '& > td:first-of-type': {
                                borderLeft: `4px solid ${theme.palette[rowTone].main}`,
                                transition: 'border-left-color 200ms cubic-bezier(0.2, 0, 0, 1)'
                              },
                              '&.Mui-selected > td': {
                                backgroundColor: alpha(theme.palette[rowTone].main, 0.085),
                                fontWeight: 600
                              },
                              '&:hover > td': {
                                backgroundColor: alpha(theme.palette[rowTone].main, 0.055)
                              },
                              '&:hover': {
                                boxShadow: `inset 0 0 0 1px ${alpha(theme.palette[rowTone].main, 0.18)}`
                              }
                            })}
                          >
                            <TableCell sx={{ ...tableFirstColumnSx, minWidth: 230 }}>
                              <Stack spacing={0.5}>
                                <Typography variant='body2' sx={{ fontWeight: 600 }}>
                                  {item.collaborator.displayName ?? itemCase.memberId ?? 'Sin colaborador'}
                                </Typography>
                                <Typography variant='caption' color='text.secondary'>
                                  {item.collaborator.roleTitle ?? item.collaborator.primaryEmail ?? 'Sin detalle'}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ ...tableColumnSx, minWidth: 170 }}>
                              <Stack spacing={0.5}>
                                <Typography variant='caption' sx={caseIdSx}>{itemCase.publicId}</Typography>
                                <Typography variant='caption' color='text.secondary'>
                                  {itemCase.effectiveDate === itemCase.lastWorkingDay
                                    ? `Último día ${formatDate(itemCase.lastWorkingDay)}`
                                    : `Vigencia ${formatDate(itemCase.effectiveDate)} · Último día ${formatDate(itemCase.lastWorkingDay)}`}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell sx={tableColumnSx}>
                              <Stack spacing={1} alignItems='flex-start'>
                                <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap alignItems='center'>
                                  <CustomChip round='true' size='small' variant='tonal' color={statusColor[itemCase.status] ?? 'default'} label={statusLabel[itemCase.status] ?? itemCase.status} />
                                  <CustomChip round='true' size='small' variant='tonal' color={item.closureLane.allowsFinalSettlement ? 'primary' : 'secondary'} label={item.closureLane.label} />
                                </Stack>
                                <FieldsProgressChip filled={item.progress.completed} total={item.progress.total} srLabel={(filled, total) => `${itemCase.publicId}: ${filled} de ${total} pasos listos.`} suffix={total => `de ${total} pasos`} readyLabel={item.progress.completed >= item.progress.total ? 'Listo' : undefined} />
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ ...tableColumnSx, minWidth: 200 }}>
                              <Stack spacing={0.75} alignItems='flex-start'>
                                <Typography variant='body2' sx={{ fontWeight: 700, color: `${rowTone}.main` }}>{item.nextStep.label}</Typography>
                                {(() => {
                                  const hint = item.progress.nextStepHint
                                  const help = item.closureLane.helpText
                                  const docLabel = item.closureLane.documentLabel

                                  const detail = hint && hint !== item.nextStep.label
                                    ? hint
                                    : help && help !== item.nextStep.label
                                      ? help
                                      : docLabel && docLabel !== item.nextStep.label
                                        ? docLabel
                                        : null

                                  return detail ? (
                                    <Typography variant='caption' color='text.secondary'>{detail}</Typography>
                                  ) : null
                                })()}
                                {item.latestDocument ? <CustomChip round='true' size='small' variant='tonal' color={documentStatusColor[item.latestDocument.documentStatus] ?? 'default'} label={documentStatusLabel[item.latestDocument.documentStatus] ?? item.latestDocument.documentStatus} /> : null}
                              </Stack>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </DataTableShell>
              )
            ) : (
              <EmptyState icon='tabler-list-search' title='No hay casos para este filtro' description='Cambia el filtro o crea un nuevo caso de salida cuando corresponda.' action={<Button variant='contained' onClick={() => setCreateDrawerOpen(true)}>Nuevo caso</Button>} />
            )}
          </Stack>
        </OperationalPanel>

        {isDesktopQueue ? (
          <OperationalPanel
            title='Inspector operativo'
            subheader='Detalle, bloqueo y acción principal del caso seleccionado.'
            icon='tabler-layout-sidebar-right'
          >
            <AnimatePresence mode='wait' initial={false}>
              <Box
                key={inspectedItem?.case.offboardingCaseId ?? 'empty'}
                component={motion.div}
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: [0.2, 0, 0, 1] }}
              >
                {inspectedItem ? renderCaseInspector(inspectedItem, 'panel') : (
                  <EmptyState icon='tabler-click' title='Selecciona un caso' description='El inspector muestra prerequisitos, bloqueos y la acción segura del caso activo.' />
                )}
              </Box>
            </AnimatePresence>
          </OperationalPanel>
        ) : null}
      </Box>

      <Drawer anchor='right' open={Boolean(drawerItem)} onClose={() => setSelectedItemId(null)} PaperProps={{ sx: { width: { xs: '100%', sm: 560 }, p: 0 } }}>
        {drawerItem ? <Stack sx={{ p: 6 }}>{renderCaseInspector(drawerItem, 'drawer')}</Stack> : null}
      </Drawer>
    </Stack>
  )
}

export default HrOffboardingView
