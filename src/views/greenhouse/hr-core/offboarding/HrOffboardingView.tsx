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
import Tab from '@mui/material/Tab'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'
import { GH_FINIQUITO } from '@/lib/copy/finiquito'

import CustomChip from '@core/components/mui/Chip'

import GreenhouseFileUploader, { type UploadedFileValue } from '@/components/greenhouse/GreenhouseFileUploader'
import DataTableShell from '@/components/greenhouse/data-table/DataTableShell'
import EmptyState from '@/components/greenhouse/EmptyState'
import FieldsProgressChip from '@/components/greenhouse/primitives/FieldsProgressChip'
import MetricSummaryCard from '@/components/greenhouse/primitives/MetricSummaryCard'
import OperationalPanel from '@/components/greenhouse/primitives/OperationalPanel'

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

const queueTabs: Array<{ value: OffboardingWorkQueueFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'attention', label: 'Atención' },
  { value: 'ready_to_calculate', label: 'Listos para cálculo' },
  { value: 'documents', label: 'Documentos' },
  { value: 'no_labor_settlement', label: 'Sin finiquito' }
]

const nextStatusFor = (status: OffboardingCaseStatus): OffboardingCaseStatus | null => {
  if (status === 'draft' || status === 'needs_review') return 'approved'
  if (status === 'approved') return 'scheduled'
  if (status === 'scheduled') return 'executed'

  return null
}

const today = () => new Date().toISOString().slice(0, 10)

const HrOffboardingView = () => {
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

  const selectedItem = queueItems.find(item => item.case.offboardingCaseId === selectedItemId) ?? null

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

      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' alignItems={{ xs: 'flex-start', md: 'center' }} spacing={3}>
        <Stack spacing={1}>
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

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }, gap: 4 }}>
        <MetricSummaryCard title={GH_FINIQUITO.resignation.workQueue.summary.attention} value={workQueue?.summary.attention ?? 0} subtitle='Cartas, declaración o ratificación pendiente' icon='tabler-alert-triangle' iconColor='warning' statusLabel='Atención HR' statusTone='warning' />
        <MetricSummaryCard title={GH_FINIQUITO.resignation.workQueue.summary.readyToCalculate} value={workQueue?.summary.readyToCalculate ?? 0} subtitle='Prerequisitos legales completos' icon='tabler-calculator' iconColor='success' statusLabel='Siguiente paso claro' statusTone='success' />
        <MetricSummaryCard title={GH_FINIQUITO.resignation.workQueue.summary.documents} value={workQueue?.summary.documents ?? 0} subtitle='Emitir, reemitir o ratificar' icon='tabler-file-text' iconColor='primary' statusLabel='Legal en curso' statusTone='primary' />
        <MetricSummaryCard title={GH_FINIQUITO.resignation.workQueue.summary.noLaborSettlement} value={workQueue?.summary.noLaborSettlement ?? 0} subtitle='Honorarios o proveedor externo' icon='tabler-briefcase' iconColor='secondary' statusLabel='Cierre separado' statusTone='secondary' />
      </Box>

      <OperationalPanel
        title='Casos de salida'
        subheader='Cada fila muestra el bloqueo real y la acción más próxima.'
        icon='tabler-list-check'
        action={<CustomChip round='true' color={(workQueue?.summary.active ?? 0) > 0 ? 'warning' : 'success'} label={`${workQueue?.summary.active ?? 0} activo${(workQueue?.summary.active ?? 0) === 1 ? '' : 's'}`} />}
      >
        <Stack spacing={4}>
          {workQueue?.degradedReasons.length ? (
            <Alert severity='warning' variant='outlined'>La cola cargó con datos parciales: {workQueue.degradedReasons.join(', ')}.</Alert>
          ) : (
            <Alert severity='info' variant='outlined'>Datos parciales se muestran como bloqueo o advertencia; la cola no infiere completitud cuando faltan respaldos.</Alert>
          )}

          <Tabs value={filter} onChange={(_, value: OffboardingWorkQueueFilter) => setFilter(value)} variant='scrollable' allowScrollButtonsMobile aria-label={GREENHOUSE_COPY.aria.filterInput} sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40 } }}>
            {queueTabs.map(tab => (
              <Tab key={tab.value} value={tab.value} label={`${tab.label} (${queueItems.filter(item => item.case.status !== 'cancelled' && item.filters.includes(tab.value)).length})`} />
            ))}
          </Tabs>

          {filteredItems.length ? (
            <DataTableShell identifier='offboarding-work-queue' ariaLabel='Cola operacional de offboarding' density='compact' stickyFirstColumn>
              <Table size='small' sx={{ minWidth: 1040 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Caso</TableCell>
                    <TableCell>Colaborador</TableCell>
                    <TableCell>Salida</TableCell>
                    <TableCell>Estado operativo</TableCell>
                    <TableCell>Próximo paso</TableCell>
                    <TableCell align='right'>Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredItems.map(item => {
                    const itemCase = item.case
                    const primaryAction = item.primaryAction
                    const busy = saving || settlementSavingCaseId === itemCase.offboardingCaseId || documentSavingCaseId === itemCase.offboardingCaseId
                    const primaryHref = primaryAction?.href ?? (primaryAction?.code === 'review_payment' || primaryAction?.code === 'external_provider_close' ? '/hr/payroll' : null)

                    return (
                      <TableRow key={itemCase.offboardingCaseId} hover selected={selectedItemId === itemCase.offboardingCaseId} onClick={() => setSelectedItemId(itemCase.offboardingCaseId)} sx={{ cursor: 'pointer' }}>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography variant='body2' fontWeight={600}>{itemCase.publicId}</Typography>
                            <Typography variant='caption' color='text.secondary'>{itemCase.separationType}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography variant='body2' fontWeight={600}>{item.collaborator.displayName ?? itemCase.memberId ?? 'Sin colaborador'}</Typography>
                            <Typography variant='caption' color='text.secondary'>{item.collaborator.roleTitle ?? item.collaborator.primaryEmail ?? 'Sin detalle'}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography variant='body2'>{formatDate(itemCase.effectiveDate)}</Typography>
                            <Typography variant='caption' color='text.secondary'>Último día {formatDate(itemCase.lastWorkingDay)}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={1} alignItems='flex-start'>
                            <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap alignItems='center'>
                              <CustomChip round='true' size='small' color={statusColor[itemCase.status] ?? 'default'} label={statusLabel[itemCase.status] ?? itemCase.status} />
                              <CustomChip round='true' size='small' color={item.closureLane.allowsFinalSettlement ? 'primary' : 'secondary'} label={item.closureLane.label} />
                            </Stack>
                            <FieldsProgressChip filled={item.progress.completed} total={item.progress.total} srLabel={(filled, total) => `${itemCase.publicId}: ${filled} de ${total} pasos listos.`} suffix={total => `de ${total} pasos`} readyLabel={item.progress.completed >= item.progress.total ? 'Listo' : undefined} nextStepHint={item.progress.nextStepHint ?? undefined} />
                            {item.attentionReasons[0] ? <Typography variant='caption' color='warning.main'>{item.attentionReasons[0]}</Typography> : null}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={1} alignItems='flex-start'>
                            <CustomChip round='true' size='small' color={item.nextStep.severity === 'warning' ? 'warning' : item.nextStep.severity === 'success' ? 'success' : 'info'} label={item.nextStep.label} />
                            {item.latestSettlement ? (
                              <Typography variant='caption' color='text.secondary'>
                                {settlementStatusLabel[item.latestSettlement.calculationStatus] ?? item.latestSettlement.calculationStatus}
                                {' · Neto '}
                                {formatGreenhouseCurrency(item.latestSettlement.netPayable, 'CLP', { maximumFractionDigits: 0 }, 'es-CL')}
                              </Typography>
                            ) : (
                              <Typography variant='caption' color='text.secondary'>{item.closureLane.documentLabel}</Typography>
                            )}
                            {item.latestDocument ? <CustomChip round='true' size='small' color={documentStatusColor[item.latestDocument.documentStatus] ?? 'default'} label={documentStatusLabel[item.latestDocument.documentStatus] ?? item.latestDocument.documentStatus} /> : null}
                          </Stack>
                        </TableCell>
                        <TableCell align='right'>
                          {primaryAction ? (
                            primaryHref ? (
                              <Button
                                size='small'
                                variant='contained'
                                disabled={busy || primaryAction.disabled}
                                href={primaryHref}
                                onClick={event => event.stopPropagation()}
                              >
                                {busy ? 'Procesando' : primaryAction.label}
                              </Button>
                            ) : (
                              <Button
                                size='small'
                                variant='contained'
                                disabled={busy || primaryAction.disabled}
                                onClick={event => {
                                  event.stopPropagation()
                                  void runQueueAction(item, primaryAction)
                                }}
                              >
                                {busy ? 'Procesando' : primaryAction.label}
                              </Button>
                            )
                          ) : (
                            <Button size='small' variant='text' onClick={event => { event.stopPropagation(); setSelectedItemId(itemCase.offboardingCaseId) }}>Ver detalle</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </DataTableShell>
          ) : (
            <EmptyState icon='tabler-list-search' title='No hay casos para este filtro' description='Cambia el filtro o crea un nuevo caso de salida cuando corresponda.' action={<Button variant='contained' onClick={() => setCreateDrawerOpen(true)}>Nuevo caso</Button>} />
          )}
        </Stack>
      </OperationalPanel>

      <Drawer anchor='right' open={Boolean(selectedItem)} onClose={() => setSelectedItemId(null)} PaperProps={{ sx: { width: { xs: '100%', sm: 560 }, p: 0 } }}>
        {selectedItem ? (
          <Stack spacing={5} sx={{ p: 6 }}>
            <Stack direction='row' justifyContent='space-between' alignItems='flex-start' spacing={3}>
              <Stack spacing={1}>
                <Typography variant='h5'>{selectedItem.case.publicId}</Typography>
                <Typography variant='body2' color='text.secondary'>{selectedItem.collaborator.displayName ?? selectedItem.case.memberId ?? 'Sin colaborador'} · {selectedItem.closureLane.label}</Typography>
              </Stack>
              <IconButton aria-label={GREENHOUSE_COPY.aria.closeDrawer} onClick={() => setSelectedItemId(null)}>
                <i className='tabler-x' aria-hidden='true' />
              </IconButton>
            </Stack>

            <Stack spacing={2}>
              <Typography variant='subtitle2'>Progreso</Typography>
              <FieldsProgressChip filled={selectedItem.progress.completed} total={selectedItem.progress.total} srLabel={(filled, total) => `${filled} de ${total} pasos listos para ${selectedItem.case.publicId}.`} suffix={total => `de ${total} pasos`} readyLabel={selectedItem.progress.completed >= selectedItem.progress.total ? 'Listo' : undefined} nextStepHint={selectedItem.progress.nextStepHint ?? undefined} />
              {selectedItem.attentionReasons.map(reason => <Alert key={reason} severity='warning' variant='outlined'>{reason}</Alert>)}
            </Stack>

            <Stack spacing={2}>
              <Typography variant='subtitle2'>Prerequisitos</Typography>
              <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                {selectedItem.prerequisites.required ? (
                  <>
                    <CustomChip round='true' size='small' color={selectedItem.prerequisites.resignationLetter === 'missing' ? 'error' : 'success'} label={selectedItem.prerequisites.resignationLetter === 'missing' ? GH_FINIQUITO.resignation.prerequisites.chips.resignationLetterMissing : GH_FINIQUITO.resignation.prerequisites.chips.resignationLetterAttached} />
                    <CustomChip round='true' size='small' color={selectedItem.prerequisites.maintenanceObligation === 'missing' ? 'error' : 'success'} label={selectedItem.prerequisites.maintenanceObligation === 'missing' ? GH_FINIQUITO.resignation.prerequisites.chips.maintenanceMissing : selectedItem.prerequisites.maintenanceObligation === 'subject' ? GH_FINIQUITO.resignation.prerequisites.chips.maintenanceSubject : GH_FINIQUITO.resignation.prerequisites.chips.maintenanceNotSubject} />
                  </>
                ) : (
                  <CustomChip round='true' size='small' color='secondary' label='No requiere finiquito laboral' />
                )}
              </Stack>
            </Stack>

            <Stack spacing={2}>
              <Typography variant='subtitle2'>Acciones</Typography>
              {selectedItem.primaryAction ? (
                <Button variant='contained' disabled={selectedItem.primaryAction.disabled || saving || settlementSavingCaseId === selectedItem.case.offboardingCaseId || documentSavingCaseId === selectedItem.case.offboardingCaseId} onClick={() => void runQueueAction(selectedItem, selectedItem.primaryAction!)}>
                  {selectedItem.primaryAction.label}
                </Button>
              ) : null}
              <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                {selectedItem.secondaryActions.map(actionDescriptor => (
                  actionDescriptor.href ? (
                    <Button key={actionDescriptor.code} size='small' variant='text' href={actionDescriptor.href} target='_blank' rel='noreferrer' disabled={actionDescriptor.disabled || saving}>
                      {actionDescriptor.label}
                    </Button>
                  ) : (
                    <Button key={actionDescriptor.code} size='small' variant='outlined' disabled={actionDescriptor.disabled || saving} onClick={() => void runQueueAction(selectedItem, actionDescriptor)}>
                      {actionDescriptor.label}
                    </Button>
                  )
                ))}
              </Stack>
            </Stack>
          </Stack>
        ) : null}
      </Drawer>
    </Stack>
  )
}

export default HrOffboardingView
