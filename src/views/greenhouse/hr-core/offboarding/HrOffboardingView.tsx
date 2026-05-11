'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useSearchParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
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
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'
import { GH_FINIQUITO } from '@/lib/copy/finiquito'

import CustomChip from '@core/components/mui/Chip'

import GreenhouseFileUploader, { type UploadedFileValue } from '@/components/greenhouse/GreenhouseFileUploader'

import type { HrMemberOption } from '@/types/hr-core'
import type { OffboardingCase, OffboardingCaseStatus, OffboardingSeparationType } from '@/lib/workforce/offboarding'
import type { FinalSettlement, FinalSettlementStatus } from '@/lib/payroll/final-settlement'
import type { FinalSettlementDocument } from '@/lib/payroll/final-settlement/document-types'
import { formatDate } from '@views/greenhouse/hr-core/helpers'
import { formatCurrency as formatGreenhouseCurrency } from '@/lib/format'

const GREENHOUSE_COPY = getMicrocopy()

type CasesResponse = {
  cases: OffboardingCase[]
}

type MembersResponse = {
  members: HrMemberOption[]
}

type ContractExpiryScanResponse = {
  opened: OffboardingCase[]
  scanned: number
  skipped: Array<{ memberId: string; reason: string }>
}

type FinalSettlementDocumentResponse = {
  document: FinalSettlementDocument | null
}

type FinalSettlementResponse = {
  settlement: FinalSettlement | null
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

const laneLabel: Record<string, string> = {
  internal_payroll: 'Payroll interno',
  external_payroll: 'Payroll externo',
  non_payroll: 'No payroll',
  identity_only: 'Solo identidad',
  relationship_transition: 'Transición',
  unknown: 'Por revisar'
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

const settlementStatusColor: Record<FinalSettlementStatus | 'none', 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = {
  none: 'default',
  draft: 'secondary',
  calculated: 'info',
  reviewed: 'warning',
  approved: 'success',
  issued: 'success',
  cancelled: 'default'
}

const settlementStatusLabel: Record<FinalSettlementStatus | 'none', string> = {
  none: 'Sin cálculo',
  draft: 'Borrador',
  calculated: 'Calculado',
  reviewed: 'Revisado',
  approved: 'Cálculo aprobado',
  issued: 'Emitido',
  cancelled: 'Cancelado'
}

type ClosureLane = {
  label: string
  settlementLabel: string
  documentLabel: string
  allowsFinalSettlement: boolean
  helpText: string | null
}

const chileDependentContracts = new Set(['indefinido', 'plazo_fijo'])

const isChileDependentInternalPayrollCase = (item: OffboardingCase) =>
  item.ruleLane === 'internal_payroll'
  && item.payrollViaSnapshot === 'internal'
  && item.payRegimeSnapshot === 'chile'
  && chileDependentContracts.has(item.contractTypeSnapshot)

const closureLaneFor = (item: OffboardingCase): ClosureLane => {
  if (isChileDependentInternalPayrollCase(item)) {
    return {
      label: 'Finiquito laboral',
      settlementLabel: 'Finiquito',
      documentLabel: 'Finiquito laboral',
      allowsFinalSettlement: true,
      helpText: null
    }
  }

  if (item.contractTypeSnapshot === 'honorarios' || item.ruleLane === 'non_payroll') {
    return {
      label: 'Cierre contractual',
      settlementLabel: 'Sin finiquito laboral',
      documentLabel: 'Cierre contractual',
      allowsFinalSettlement: false,
      helpText: 'Honorarios se cierra como relación contractual; no genera finiquito laboral ni descuentos previsionales.'
    }
  }

  if (item.payrollViaSnapshot === 'deel' || item.relationshipType === 'eor' || item.ruleLane === 'external_payroll') {
    return {
      label: 'Cierre proveedor',
      settlementLabel: 'Proveedor externo',
      documentLabel: 'Documento proveedor',
      allowsFinalSettlement: false,
      helpText: 'El cierre se coordina con el proveedor externo; Greenhouse no calcula finiquito laboral interno.'
    }
  }

  return {
    label: 'Revisión legal requerida',
    settlementLabel: 'Por revisar',
    documentLabel: 'Por revisar',
    allowsFinalSettlement: false,
    helpText: 'La combinación contractual requiere clasificación antes de habilitar documentos o pagos.'
  }
}

const activeStatuses = new Set<OffboardingCaseStatus>(['draft', 'needs_review', 'approved', 'scheduled', 'blocked'])

const nextStatusFor = (status: OffboardingCaseStatus): OffboardingCaseStatus | null => {
  if (status === 'draft' || status === 'needs_review') return 'approved'
  if (status === 'approved') return 'scheduled'
  if (status === 'scheduled') return 'executed'

  return null
}

const nextLabelFor = (status: OffboardingCaseStatus) => {
  if (status === 'draft' || status === 'needs_review') return 'Aprobar'
  if (status === 'approved') return 'Programar'
  if (status === 'scheduled') return 'Ejecutar'

  return null
}

const today = () => new Date().toISOString().slice(0, 10)

const HrOffboardingView = () => {
  const searchParams = useSearchParams()
  const initialMemberId = searchParams.get('memberId') ?? ''
  const [cases, setCases] = useState<OffboardingCase[]>([])
  const [members, setMembers] = useState<HrMemberOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [documentSavingCaseId, setDocumentSavingCaseId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [memberId, setMemberId] = useState(initialMemberId)
  const [separationType, setSeparationType] = useState<OffboardingSeparationType>('resignation')
  const [effectiveDate, setEffectiveDate] = useState(today())
  const [lastWorkingDay, setLastWorkingDay] = useState(today())
  const [notes, setNotes] = useState('')
  const [scanMessage, setScanMessage] = useState<string | null>(null)
  const [settlementsByCaseId, setSettlementsByCaseId] = useState<Record<string, FinalSettlement | null>>({})
  const [settlementSavingCaseId, setSettlementSavingCaseId] = useState<string | null>(null)
  const [documentsByCaseId, setDocumentsByCaseId] = useState<Record<string, FinalSettlementDocument | null>>({})
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

  const activeCases = useMemo(
    () => cases.filter(item => activeStatuses.has(item.status)),
    [cases]
  )

  const visibleCases = useMemo(
    () => cases.filter(item => item.status !== 'cancelled'),
    [cases]
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [casesRes, membersRes] = await Promise.all([
        fetch('/api/hr/offboarding/cases?limit=200'),
        fetch('/api/hr/core/members/options')
      ])

      if (!casesRes.ok) throw new Error('No se pudieron cargar los casos de offboarding.')
      if (!membersRes.ok) throw new Error('No se pudo cargar el listado de colaboradores.')

      const casesPayload = await casesRes.json() as CasesResponse
      const membersPayload = await membersRes.json() as MembersResponse

      const settlementPairs = await Promise.all(
        casesPayload.cases.map(async item => {
          const settlementRes = await fetch(`/api/hr/offboarding/cases/${item.offboardingCaseId}/final-settlement`)

          if (!settlementRes.ok) {
            return [item.offboardingCaseId, null] as const
          }

          const settlementPayload = await settlementRes.json() as FinalSettlementResponse

          return [item.offboardingCaseId, settlementPayload.settlement] as const
        })
      )

      const documentPairs = await Promise.all(
        casesPayload.cases.map(async item => {
          const documentRes = await fetch(`/api/hr/offboarding/cases/${item.offboardingCaseId}/final-settlement/document`)

          if (!documentRes.ok) {
            return [item.offboardingCaseId, null] as const
          }

          const documentPayload = await documentRes.json() as FinalSettlementDocumentResponse

          return [item.offboardingCaseId, documentPayload.document] as const
        })
      )

      setCases(casesPayload.cases)
      setSettlementsByCaseId(Object.fromEntries(settlementPairs))
      setDocumentsByCaseId(Object.fromEntries(documentPairs))
      setMembers(membersPayload.members)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando offboarding.')
    } finally {
      setLoading(false)
    }
  }, [])

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

  const settlementActionFor = (item: OffboardingCase, settlement: FinalSettlement | null) => {
    if (!closureLaneFor(item).allowsFinalSettlement) return null
    if (!settlement || settlement.calculationStatus === 'cancelled') return { action: 'calculate' as const, label: 'Calcular' }

    if (settlement.calculationStatus === 'calculated' || settlement.calculationStatus === 'reviewed') {
      return { action: 'approve' as const, label: 'Aprobar cálculo' }
    }

    return null
  }

  const documentBelongsToSettlement = (document: FinalSettlementDocument | null, settlement: FinalSettlement | null) =>
    Boolean(document && settlement && document.finalSettlementId === settlement.finalSettlementId)

  const documentActionFor = (document: FinalSettlementDocument | null, settlement: FinalSettlement | null) => {
    if (!document) return { action: 'render' as const, label: 'Renderizar doc.' }
    if (!documentBelongsToSettlement(document, settlement)) return { action: 'render' as const, label: 'Generar doc. vigente' }
    if (document.documentStatus === 'rendered') return { action: 'submit-review' as const, label: 'Enviar a revisión' }
    if (document.documentStatus === 'in_review') return { action: 'approve' as const, label: 'Aprobar doc.' }
    if (document.documentStatus === 'approved') return { action: 'issue' as const, label: 'Emitir' }
    if (document.documentStatus === 'issued') return { action: 'sign-or-ratify' as const, label: 'Registrar ratificación' }

    return null
  }

  const canReissueDocument = (document: FinalSettlementDocument | null, settlement: FinalSettlement | null) =>
    Boolean(
      documentBelongsToSettlement(document, settlement)
      && document
      && ['rendered', 'in_review', 'approved', 'issued'].includes(document.documentStatus)
    )

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
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={4}>
        <Box>
          <Typography variant='h4'>Offboarding</Typography>
          <Typography variant='body2' color='text.secondary'>
            Casos canónicos de salida laboral o contractual. SCIM y desactivación administrativa son señales, no cierre laboral.
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <Button variant='tonal' disabled={saving} onClick={scanContractExpiry}>
            Revisar contratos
          </Button>
          <CustomChip
            round='true'
            color={activeCases.length > 0 ? 'warning' : 'success'}
            label={`${activeCases.length} activo${activeCases.length === 1 ? '' : 's'}`}
          />
        </Stack>
      </Stack>

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

      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title='Abrir caso manual'
          subheader='Crea el agregado de salida. El finiquito y documentos quedan para sus lanes posteriores.'
        />
        <Divider />
        <CardContent>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 4 }}>
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
            <Grid size={{ xs: 12, md: 3 }}>
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
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                type='date'
                label='Salida efectiva'
                value={effectiveDate}
                onChange={event => setEffectiveDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                type='date'
                label='Último día'
                value={lastWorkingDay}
                onChange={event => setLastWorkingDay(event.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 1 }}>
              <Button fullWidth variant='contained' disabled={!memberId || saving} onClick={createCase} sx={{ height: 40 }}>{GREENHOUSE_COPY.actions.create}</Button>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                label='Notas'
                value={notes}
                onChange={event => setNotes(event.target.value)}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader title='Casos de salida' subheader='Incluye casos activos y ejecutados con finiquito pendiente o emitido' />
        <Divider />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Caso</TableCell>
                <TableCell>Colaborador</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Lane</TableCell>
                <TableCell>Salida efectiva</TableCell>
                <TableCell>Último día</TableCell>
                <TableCell>Finiquito</TableCell>
                <TableCell align='right'>Acción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleCases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Typography variant='body2' color='text.secondary' sx={{ py: 4, textAlign: 'center' }}>
                      No hay casos de offboarding para revisar.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : visibleCases.map(item => (
                (() => {
                  const settlement = settlementsByCaseId[item.offboardingCaseId] ?? null
                  const closureLane = closureLaneFor(item)
                  const settlementAction = settlementActionFor(item, settlement)
                  const settlementBusy = settlementSavingCaseId === item.offboardingCaseId
                  const settlementApproved = closureLane.allowsFinalSettlement && settlement ? ['approved', 'issued'].includes(settlement.calculationStatus) : false
                  const document = documentsByCaseId[item.offboardingCaseId] ?? null
                  const documentAction = closureLane.allowsFinalSettlement ? documentActionFor(document, settlement) : null
                  const documentIsHistorical = Boolean(document && settlement && document.finalSettlementId !== settlement.finalSettlementId)
                  const documentBusy = documentSavingCaseId === item.offboardingCaseId
                  const downloadUrl = document?.pdfAssetId ? `/api/assets/private/${encodeURIComponent(document.pdfAssetId)}` : null

                  // TASK-863 Slice A — pre-requisitos del finiquito (renuncia voluntaria).
                  // Solo aplica cuando el caso es resignation Y lane permite finiquito laboral
                  // (chile_dependent / honorarios no aplican porque honorarios cierra contractualmente).
                  const prerequisitesRequired = closureLane.allowsFinalSettlement && item.separationType === 'resignation'
                  const hasResignationLetter = Boolean(item.resignationLetterAssetId)
                  const hasMaintenanceObligation = Boolean(item.maintenanceObligationJson)
                  const prerequisitesReady = hasResignationLetter && hasMaintenanceObligation
                  const prerequisitesBlocking = prerequisitesRequired && !prerequisitesReady
                  const calculateBlocked = prerequisitesBlocking && settlementAction?.action === 'calculate'
                  const maintenanceVariant = item.maintenanceObligationJson?.variant ?? null
                  const maintenanceAmount = item.maintenanceObligationJson?.amount ?? null

                  return (
                    <TableRow key={item.offboardingCaseId} hover>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant='body2' fontWeight={600}>{item.publicId}</Typography>
                          <Typography variant='caption' color='text.secondary'>{item.separationType}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{members.find(member => member.memberId === item.memberId)?.displayName ?? item.memberId}</TableCell>
                      <TableCell>
                        <CustomChip round='true' size='small' color={statusColor[item.status] ?? 'default'} label={statusLabel[item.status] ?? item.status} />
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant='body2'>{laneLabel[item.ruleLane] ?? item.ruleLane}</Typography>
                          <Typography variant='caption' color='text.secondary'>{closureLane.label}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{formatDate(item.effectiveDate)}</TableCell>
                      <TableCell>{formatDate(item.lastWorkingDay)}</TableCell>
                      <TableCell>
                        <Stack spacing={1.5} alignItems='flex-start'>
                          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap alignItems='center'>
                            <CustomChip
                              round='true'
                              size='small'
                              color={settlementStatusColor[settlement?.calculationStatus ?? 'none'] ?? 'default'}
                              label={closureLane.allowsFinalSettlement
                                ? settlementStatusLabel[settlement?.calculationStatus ?? 'none'] ?? settlement?.calculationStatus ?? 'Sin cálculo'
                                : closureLane.settlementLabel}
                            />
                            {settlement && (
                              <Typography variant='caption' color='text.secondary'>
                                Neto {formatGreenhouseCurrency(settlement.netPayable, 'CLP', {
  maximumFractionDigits: 0
}, 'es-CL')}
                              </Typography>
                            )}
                          </Stack>
                          {settlement?.readinessHasBlockers && (
                            <Typography variant='caption' color='error.main'>
                              Hay blockers de cálculo. Revisa vacaciones, compensación y régimen.
                            </Typography>
                          )}
                          {closureLane.helpText && (
                            <Typography variant='caption' color='text.secondary'>
                              {closureLane.helpText}
                            </Typography>
                          )}
                          {prerequisitesRequired && (
                            <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap alignItems='center'>
                              <CustomChip
                                round='true'
                                size='small'
                                color={hasResignationLetter ? 'success' : 'error'}
                                label={hasResignationLetter
                                  ? GH_FINIQUITO.resignation.prerequisites.chips.resignationLetterAttached
                                  : GH_FINIQUITO.resignation.prerequisites.chips.resignationLetterMissing}
                              />
                              <CustomChip
                                round='true'
                                size='small'
                                color={!hasMaintenanceObligation
                                  ? 'error'
                                  : maintenanceVariant === 'not_subject'
                                    ? 'success'
                                    : 'warning'}
                                label={!hasMaintenanceObligation
                                  ? GH_FINIQUITO.resignation.prerequisites.chips.maintenanceMissing
                                  : maintenanceVariant === 'not_subject'
                                    ? GH_FINIQUITO.resignation.prerequisites.chips.maintenanceNotSubject
                                    : `${GH_FINIQUITO.resignation.prerequisites.chips.maintenanceSubject}${
                                        typeof maintenanceAmount === 'number'
                                          ? ` (${formatGreenhouseCurrency(maintenanceAmount, 'CLP', { maximumFractionDigits: 0 }, 'es-CL')})`
                                          : ''
                                      }`}
                              />
                            </Stack>
                          )}
                          {prerequisitesRequired && (
                            <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                              <Button
                                size='small'
                                variant={hasResignationLetter ? 'text' : 'outlined'}
                                disabled={saving}
                                onClick={() => {
                                  setError(null)
                                  setResignationLetterFile(null)
                                  setResignationLetterTarget(item)
                                }}
                              >
                                {hasResignationLetter
                                  ? GH_FINIQUITO.resignation.prerequisites.buttons.replaceResignationLetter
                                  : GH_FINIQUITO.resignation.prerequisites.buttons.uploadResignationLetter}
                              </Button>
                              <Button
                                size='small'
                                variant={hasMaintenanceObligation ? 'text' : 'outlined'}
                                disabled={saving}
                                onClick={() => {
                                  setError(null)
                                  setMaintenanceFormError(null)
                                  setMaintenanceForm({
                                    variant: item.maintenanceObligationJson?.variant ?? 'not_subject',
                                    amount: item.maintenanceObligationJson?.amount != null
                                      ? String(item.maintenanceObligationJson.amount)
                                      : '',
                                    beneficiary: item.maintenanceObligationJson?.beneficiary ?? '',
                                    evidence: null
                                  })
                                  setMaintenanceTarget(item)
                                }}
                              >
                                {hasMaintenanceObligation
                                  ? GH_FINIQUITO.resignation.prerequisites.buttons.editMaintenance
                                  : GH_FINIQUITO.resignation.prerequisites.buttons.declareMaintenance}
                              </Button>
                            </Stack>
                          )}
                          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                            {settlementAction && (
                              <Tooltip
                                title={calculateBlocked ? GH_FINIQUITO.resignation.prerequisites.calculateBlockedTooltip : ''}
                                disableHoverListener={!calculateBlocked}
                                disableFocusListener={!calculateBlocked}
                              >
                                <span>
                                  <Button
                                    size='small'
                                    variant='tonal'
                                    disabled={settlementBusy || saving || calculateBlocked}
                                    onClick={() => runSettlementAction(item, settlementAction.action)}
                                  >
                                    {settlementBusy ? 'Procesando' : settlementAction.label}
                                  </Button>
                                </span>
                              </Tooltip>
                            )}
                            {!closureLane.allowsFinalSettlement && item.ruleLane === 'non_payroll' && (
                              <Button size='small' variant='tonal' href='/hr/payroll'>
                                Revisar pago pendiente
                              </Button>
                            )}
                            {!closureLane.allowsFinalSettlement && item.ruleLane === 'external_payroll' && (
                              <Button size='small' variant='tonal' href='/hr/payroll'>
                                Cierre proveedor
                              </Button>
                            )}
                          </Stack>
                          <CustomChip
                            round='true'
                            size='small'
                            color={documentStatusColor[document?.documentStatus ?? 'draft'] ?? 'default'}
                            label={closureLane.allowsFinalSettlement
                              ? document ? documentStatusLabel[document.documentStatus] ?? document.documentStatus : 'Sin documento'
                              : closureLane.documentLabel}
                          />
                          {document?.readiness.status === 'needs_review' && (
                            <Typography variant='caption' color='warning.main'>
                              Revisar entidad legal antes de emitir.
                            </Typography>
                          )}
                          {documentIsHistorical && (
                            <Typography variant='caption' color='warning.main'>
                              PDF histórico de un cálculo anterior. Genera el documento vigente antes de enviarlo a revisión o reemitir.
                            </Typography>
                          )}
                          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                            {documentAction && (
                              <Button
                                size='small'
                                variant='tonal'
                                disabled={documentBusy || saving || !settlementApproved}
                                onClick={() => runDocumentAction(item, documentAction.action)}
                              >
                                {documentBusy ? 'Procesando' : documentAction.label}
                              </Button>
                            )}
                            {canReissueDocument(document, settlement) && (
                              <Button
                                size='small'
                                variant='outlined'
                                disabled={documentBusy || saving || !settlementApproved}
                                onClick={() => {
                                  setError(null)
                                  setReissueReason('')
                                  setReissueTarget(item)
                                }}
                              >
                                Reemitir
                              </Button>
                            )}
                            {downloadUrl && (
                              <Button size='small' variant='text' href={downloadUrl} target='_blank' rel='noreferrer'>
                                PDF
                              </Button>
                            )}
                          </Stack>
                          {closureLane.allowsFinalSettlement && !settlementApproved && (
                            <Typography variant='caption' color='text.secondary'>
                              El documento se habilita cuando el cálculo queda aprobado.
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align='right'>
                        {nextStatusFor(item.status) ? (
                          <Button size='small' variant='tonal' disabled={saving} onClick={() => transitionCase(item)}>
                            {nextLabelFor(item.status)}
                          </Button>
                        ) : (
                          <Typography variant='caption' color='text.secondary'>Sin acción</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })()
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  )
}

export default HrOffboardingView
