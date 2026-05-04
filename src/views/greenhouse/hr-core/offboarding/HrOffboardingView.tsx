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
import FormControl from '@mui/material/FormControl'
import Grid from '@mui/material/Grid'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import type { HrMemberOption } from '@/types/hr-core'
import type { OffboardingCase, OffboardingCaseStatus, OffboardingSeparationType } from '@/lib/workforce/offboarding'
import type { FinalSettlement, FinalSettlementStatus } from '@/lib/payroll/final-settlement'
import type { FinalSettlementDocument } from '@/lib/payroll/final-settlement/document-types'
import { formatDate } from '@views/greenhouse/hr-core/helpers'

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
    action: 'render' | 'submit-review' | 'approve' | 'issue' | 'sign-or-ratify'
  ) => {
    setDocumentSavingCaseId(item.offboardingCaseId)
    setError(null)
    setScanMessage(null)

    try {
      const endpoint = action === 'render'
        ? `/api/hr/offboarding/cases/${item.offboardingCaseId}/final-settlement/document`
        : `/api/hr/offboarding/cases/${item.offboardingCaseId}/final-settlement/document/${action}`

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'sign-or-ratify'
          ? {
            signatureEvidenceRef: {
              source: 'external_process_placeholder',
              recordedFrom: 'offboarding_surface',
              recordedAt: new Date().toISOString()
            }
          }
          : {})
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

  const settlementActionFor = (settlement: FinalSettlement | null) => {
    if (!settlement || settlement.calculationStatus === 'cancelled') return { action: 'calculate' as const, label: 'Calcular' }

    if (settlement.calculationStatus === 'calculated' || settlement.calculationStatus === 'reviewed') {
      return { action: 'approve' as const, label: 'Aprobar cálculo' }
    }

    return null
  }

  const documentActionFor = (document: FinalSettlementDocument | null) => {
    if (!document) return { action: 'render' as const, label: 'Renderizar doc.' }
    if (document.documentStatus === 'rendered') return { action: 'submit-review' as const, label: 'Enviar a revisión' }
    if (document.documentStatus === 'in_review') return { action: 'approve' as const, label: 'Aprobar doc.' }
    if (document.documentStatus === 'approved') return { action: 'issue' as const, label: 'Emitir' }
    if (document.documentStatus === 'issued') return { action: 'sign-or-ratify' as const, label: 'Registrar ratificación' }

    return null
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
              <Button fullWidth variant='contained' disabled={!memberId || saving} onClick={createCase} sx={{ height: 40 }}>
                Crear
              </Button>
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
                  const settlementAction = settlementActionFor(settlement)
                  const settlementBusy = settlementSavingCaseId === item.offboardingCaseId
                  const settlementApproved = settlement ? ['approved', 'issued'].includes(settlement.calculationStatus) : false
                  const document = documentsByCaseId[item.offboardingCaseId] ?? null
                  const documentAction = documentActionFor(document)
                  const documentBusy = documentSavingCaseId === item.offboardingCaseId
                  const downloadUrl = document?.pdfAssetId ? `/api/assets/private/${encodeURIComponent(document.pdfAssetId)}` : null

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
                      <TableCell>{laneLabel[item.ruleLane] ?? item.ruleLane}</TableCell>
                      <TableCell>{formatDate(item.effectiveDate)}</TableCell>
                      <TableCell>{formatDate(item.lastWorkingDay)}</TableCell>
                      <TableCell>
                        <Stack spacing={1.5} alignItems='flex-start'>
                          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap alignItems='center'>
                            <CustomChip
                              round='true'
                              size='small'
                              color={settlementStatusColor[settlement?.calculationStatus ?? 'none'] ?? 'default'}
                              label={settlementStatusLabel[settlement?.calculationStatus ?? 'none'] ?? settlement?.calculationStatus ?? 'Sin cálculo'}
                            />
                            {settlement && (
                              <Typography variant='caption' color='text.secondary'>
                                Neto {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(settlement.netPayable)}
                              </Typography>
                            )}
                          </Stack>
                          {settlement?.readinessHasBlockers && (
                            <Typography variant='caption' color='error.main'>
                              Hay blockers de cálculo. Revisa vacaciones, compensación y régimen.
                            </Typography>
                          )}
                          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                            {settlementAction && (
                              <Button
                                size='small'
                                variant='tonal'
                                disabled={settlementBusy || saving}
                                onClick={() => runSettlementAction(item, settlementAction.action)}
                              >
                                {settlementBusy ? 'Procesando' : settlementAction.label}
                              </Button>
                            )}
                          </Stack>
                          <CustomChip
                            round='true'
                            size='small'
                            color={documentStatusColor[document?.documentStatus ?? 'draft'] ?? 'default'}
                            label={document ? documentStatusLabel[document.documentStatus] ?? document.documentStatus : 'Sin documento'}
                          />
                          {document?.readiness.status === 'needs_review' && (
                            <Typography variant='caption' color='warning.main'>
                              Revisar entidad legal antes de emitir.
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
                            {downloadUrl && (
                              <Button size='small' variant='text' href={downloadUrl} target='_blank' rel='noreferrer'>
                                PDF
                              </Button>
                            )}
                          </Stack>
                          {!settlementApproved && (
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
