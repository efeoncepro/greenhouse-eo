'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
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

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import CustomChip from '@core/components/mui/Chip'
import { formatDate as formatGreenhouseDate } from '@/lib/format'

const GREENHOUSE_COPY = getMicrocopy()

type MasterAgreementStatus = 'draft' | 'active' | 'expired' | 'terminated' | 'superseded'
type DetailTab = 'overview' | 'clauses' | 'linked-contracts'

interface LinkedContract {
  contractId: string
  contractNumber: string
  status: string
  startDate: string | null
  endDate: string | null
}

interface Clause {
  msaClauseId: string
  clauseId: string
  clauseCode: string
  clauseVersion: number
  clauseLanguage: string
  category: string
  title: string
  summary: string | null
  bodyTemplate: string
  bodyOverride: string | null
  resolvedBody: string
  defaultVariables: Record<string, unknown>
  variables: Record<string, unknown>
  included: boolean
  sortOrder: number
  effectiveFrom: string | null
  effectiveTo: string | null
  notes: string | null
  updatedAt: string
}

interface MasterAgreementDetail {
  msaId: string
  msaNumber: string
  title: string
  counterpartyName: string | null
  organizationId: string
  organizationName: string | null
  clientId: string | null
  clientName: string | null
  status: MasterAgreementStatus | string
  effectiveDate: string
  expirationDate: string | null
  autoRenewal: boolean
  renewalFrequencyMonths: number | null
  renewalNoticeDays: number
  governingLaw: string | null
  jurisdiction: string | null
  paymentTermsDays: number | null
  currency: string | null
  signedDocumentAssetId: string | null
  contractCount: number
  activeClauseCount: number
  updatedAt: string
  internalNotes: string | null
  signedDocumentDownloadUrl: string | null
  clauses?: Clause[]
  linkedContracts?: LinkedContract[]
}

const STATUS_META: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'secondary' | 'info' | 'primary' }> = {
  draft: { label: GREENHOUSE_COPY.states.draft, color: 'secondary' },
  active: { label: GREENHOUSE_COPY.states.active, color: 'success' },
  expired: { label: GREENHOUSE_COPY.states.expired, color: 'warning' },
  terminated: { label: 'Terminado', color: 'error' },
  superseded: { label: 'Sustituido', color: 'info' }
}

const CLAUSE_META: Record<string, { label: string; color: 'primary' | 'info' | 'secondary' | 'success' | 'warning' | 'error' }> = {
  legal: { label: 'Legal', color: 'primary' },
  payment: { label: 'Pago', color: 'success' },
  privacy: { label: 'Privacidad', color: 'info' },
  security: { label: 'Seguridad', color: 'warning' },
  ip: { label: 'Propiedad intelectual', color: 'secondary' },
  sla: { label: 'SLA', color: 'error' },
  general: { label: 'General', color: 'primary' }
}

const LINKED_STATUS_META: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'secondary' | 'info' | 'primary' }> = {
  draft: { label: GREENHOUSE_COPY.states.draft, color: 'secondary' },
  active: { label: GREENHOUSE_COPY.states.active, color: 'success' },
  paused: { label: GREENHOUSE_COPY.states.paused, color: 'warning' },
  terminated: { label: 'Terminado', color: 'error' },
  completed: { label: GREENHOUSE_COPY.states.completed, color: 'info' },
  renewed: { label: 'Renovado', color: 'primary' }
}

const formatDate = (value: string | null) => {
  if (!value) return '—'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return '—'

  return formatGreenhouseDate(date, {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
}, 'es-CL')
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? value as Record<string, unknown> : {}

const toStringOrNull = (value: unknown) => {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()

  return normalized.length > 0 ? normalized : null
}

const toNumberOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const normalizeClause = (value: unknown): Clause => {
  const row = toRecord(value)

  return {
    msaClauseId: String(row.msaClauseId ?? row.msa_clause_id ?? ''),
    clauseId: String(row.clauseId ?? row.clause_id ?? ''),
    clauseCode: String(row.clauseCode ?? row.clause_code ?? ''),
    clauseVersion: Number(row.clauseVersion ?? row.clause_version ?? 0),
    clauseLanguage: String(row.clauseLanguage ?? row.clause_language ?? 'es'),
    category: String(row.category ?? 'general'),
    title: String(row.title ?? ''),
    summary: toStringOrNull(row.summary),
    bodyTemplate: String(row.bodyTemplate ?? row.body_template ?? ''),
    bodyOverride: toStringOrNull(row.bodyOverride ?? row.body_override),
    resolvedBody: String(row.resolvedBody ?? row.resolved_body ?? ''),
    defaultVariables: toRecord(row.defaultVariables ?? row.default_variables),
    variables: toRecord(row.variables ?? row.variables_json),
    included: Boolean(row.included),
    sortOrder: Number(row.sortOrder ?? row.sort_order ?? 0),
    effectiveFrom: toStringOrNull(row.effectiveFrom ?? row.effective_from),
    effectiveTo: toStringOrNull(row.effectiveTo ?? row.effective_to),
    notes: toStringOrNull(row.notes),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? '')
  }
}

const normalizeContract = (value: unknown): LinkedContract => {
  const row = toRecord(value)

  return {
    contractId: String(row.contractId ?? row.contract_id ?? ''),
    contractNumber: String(row.contractNumber ?? row.contract_number ?? '—'),
    status: String(row.status ?? 'draft'),
    startDate: toStringOrNull(row.startDate ?? row.start_date),
    endDate: toStringOrNull(row.endDate ?? row.end_date)
  }
}

const normalizeDetail = (value: unknown): MasterAgreementDetail => {
  const row = toRecord(value)

  return {
    msaId: String(row.msaId ?? row.msa_id ?? ''),
    msaNumber: String(row.msaNumber ?? row.msa_number ?? '—'),
    title: String(row.title ?? 'Acuerdo marco'),
    counterpartyName: toStringOrNull(row.counterpartyName ?? row.counterparty_name),
    organizationId: String(row.organizationId ?? row.organization_id ?? ''),
    organizationName: toStringOrNull(row.organizationName ?? row.organization_name),
    clientId: toStringOrNull(row.clientId ?? row.client_id),
    clientName: toStringOrNull(row.clientName ?? row.client_name),
    status: String(row.status ?? 'draft'),
    effectiveDate: String(row.effectiveDate ?? row.effective_date ?? ''),
    expirationDate: toStringOrNull(row.expirationDate ?? row.expiration_date),
    autoRenewal: Boolean(row.autoRenewal ?? row.auto_renewal),
    renewalFrequencyMonths: toNumberOrNull(row.renewalFrequencyMonths ?? row.renewal_frequency_months),
    renewalNoticeDays: Number(row.renewalNoticeDays ?? row.renewal_notice_days ?? 0),
    governingLaw: toStringOrNull(row.governingLaw ?? row.governing_law),
    jurisdiction: toStringOrNull(row.jurisdiction),
    paymentTermsDays: toNumberOrNull(row.paymentTermsDays ?? row.payment_terms_days),
    currency: toStringOrNull(row.currency),
    signedDocumentAssetId: toStringOrNull(row.signedDocumentAssetId ?? row.signed_document_asset_id),
    contractCount: Number(row.contractCount ?? row.contract_count ?? 0),
    activeClauseCount: Number(row.activeClauseCount ?? row.active_clause_count ?? 0),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? ''),
    internalNotes: toStringOrNull(row.internalNotes ?? row.internal_notes),
    signedDocumentDownloadUrl: toStringOrNull(row.signedDocumentDownloadUrl ?? row.signed_document_download_url),
    clauses: Array.isArray(row.clauses) ? row.clauses.map(normalizeClause) : [],
    linkedContracts: Array.isArray(row.linkedContracts)
      ? row.linkedContracts.map(normalizeContract)
      : Array.isArray(row.linked_contracts)
        ? row.linked_contracts.map(normalizeContract)
        : []
  }
}

const MasterAgreementDetailView = () => {
  const params = useParams()
  const router = useRouter()
  const msaId = params.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<DetailTab>('overview')
  const [agreement, setAgreement] = useState<MasterAgreementDetail | null>(null)
  const [clauses, setClauses] = useState<Clause[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [detailRes, clausesRes] = await Promise.all([
        fetch(`/api/finance/master-agreements/${msaId}`),
        fetch(`/api/finance/master-agreements/${msaId}/clauses`)
      ])

      if (!detailRes.ok) {
        const body = await detailRes.json().catch(() => ({}))

        setAgreement(null)
        setClauses([])
        setError(typeof body.error === 'string' ? body.error : 'No pudimos cargar este acuerdo marco.')

        return
      }

      const detailBody = await detailRes.json()
      const normalizedDetail = normalizeDetail(detailBody.masterAgreement ?? detailBody.msa ?? detailBody)

      setAgreement(normalizedDetail)

      if (Array.isArray(detailBody.clauses) && detailBody.clauses.length > 0) {
        setClauses(detailBody.clauses.map(normalizeClause))
      } else if (clausesRes.ok) {
        const clausesBody = await clausesRes.json()

        setClauses(Array.isArray(clausesBody.items) ? clausesBody.items.map(normalizeClause) : [])
      } else {
        setClauses([])
      }
    } catch {
      setAgreement(null)
      setClauses([])
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [msaId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const visibleClauses = useMemo(() => {
    if (clauses.length > 0) return clauses

    return agreement?.clauses ?? []
  }, [agreement, clauses])

  const linkedContracts = agreement?.linkedContracts ?? []

  if (loading) {
    return (
      <Stack spacing={4}>
        <Skeleton variant='rounded' height={92} />
        <Skeleton variant='rounded' height={400} />
      </Stack>
    )
  }

  if (error || !agreement) {
    return (
      <Stack spacing={3}>
        <Alert severity='error'>{error ?? 'No pudimos cargar este acuerdo marco.'}</Alert>
        <Button component={Link} href='/finance/master-agreements' variant='outlined' startIcon={<i className='tabler-arrow-left' />}>
          Volver a acuerdos marco
        </Button>
      </Stack>
    )
  }

  const statusMeta = STATUS_META[agreement.status] ?? { label: agreement.status, color: 'secondary' as const }
  const clauseCount = visibleClauses.length || agreement.activeClauseCount

  const renewalLabel = agreement.autoRenewal
    ? agreement.renewalFrequencyMonths
      ? `Cada ${agreement.renewalFrequencyMonths} meses`
      : 'Auto-renovable'
    : 'Sin renovación automática'


  return (
    <Stack spacing={6}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent='space-between' alignItems={{ xs: 'flex-start', md: 'center' }}>
        <Box>
          <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap'>
            <Typography variant='h4'>{agreement.msaNumber}</Typography>
            <CustomChip label={statusMeta.label} color={statusMeta.color} variant='tonal' />
          </Stack>
          <Typography color='text.secondary'>
            {agreement.title}
          </Typography>
          <Stack direction='row' spacing={1} mt={1} flexWrap='wrap' alignItems='center'>
            <Typography variant='body2' color='text.secondary'>
              {agreement.organizationName ?? 'Sin organización'}{agreement.clientName ? ` · ${agreement.clientName}` : ''}
            </Typography>
            {agreement.signedDocumentDownloadUrl ? (
              <Button
                component='a'
                href={agreement.signedDocumentDownloadUrl}
                target='_blank'
                rel='noreferrer'
                size='small'
                variant='outlined'
                startIcon={<i className='tabler-download' />}
              >
                Descargar documento firmado
              </Button>
            ) : null}
          </Stack>
        </Box>

        <Button component={Link} href='/finance/master-agreements' variant='text' startIcon={<i className='tabler-arrow-left' />}>
          Volver a acuerdos marco
        </Button>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 4,
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(4, minmax(0, 1fr))'
          }
        }}
      >
        <HorizontalWithSubtitle
          title='Contratos comerciales'
          stats={String(agreement.contractCount)}
          subtitle='Contratos vinculados al acuerdo marco'
          avatarIcon='tabler-link'
          avatarColor='primary'
        />
        <HorizontalWithSubtitle
          title='Cláusulas'
          stats={String(clauseCount)}
          subtitle='Cláusulas activas visibles'
          avatarIcon='tabler-list-check'
          avatarColor='info'
        />
        <HorizontalWithSubtitle
          title='Renovación'
          stats={renewalLabel}
          subtitle={`Aviso con ${agreement.renewalNoticeDays} días`}
          avatarIcon='tabler-repeat'
          avatarColor='warning'
        />
        <HorizontalWithSubtitle
          title='Plazo'
          stats={agreement.paymentTermsDays ? `${agreement.paymentTermsDays} días` : 'Sin definir'}
          subtitle={agreement.currency ?? 'CLP'}
          avatarIcon='tabler-calendar-time'
          avatarColor='success'
        />
      </Box>

      <Card>
        <Tabs value={tab} onChange={(_event, value) => setTab(value)} sx={{ px: 4, pt: 2 }}>
          <Tab label='Resumen' value='overview' />
          <Tab label={`Cláusulas (${clauseCount})`} value='clauses' />
          <Tab label={`Contratos vinculados (${linkedContracts.length})`} value='linked-contracts' />
        </Tabs>
        <CardContent>
          {tab === 'overview' ? (
            <Stack spacing={4}>
              <Box
                sx={{
                  display: 'grid',
                  gap: 4,
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'repeat(2, minmax(0, 1fr))'
                  }
                }}
              >
                <Card variant='outlined'>
                  <CardHeader title='Identidad y vigencia' />
                  <CardContent>
                    <Stack spacing={2}>
                      <Typography><strong>Organización:</strong> {agreement.organizationName ?? 'Sin organización'}</Typography>
                      <Typography><strong>Cliente:</strong> {agreement.clientName ?? '—'}</Typography>
                      <Typography><strong>Contraparte:</strong> {agreement.counterpartyName ?? '—'}</Typography>
                      <Typography><strong>Inicio:</strong> {formatDate(agreement.effectiveDate)}</Typography>
                      <Typography><strong>Vencimiento:</strong> {formatDate(agreement.expirationDate)}</Typography>
                      <Typography><strong>Renovación:</strong> {renewalLabel}</Typography>
                    </Stack>
                  </CardContent>
                </Card>

                <Card variant='outlined'>
                  <CardHeader title='Condiciones comerciales' />
                  <CardContent>
                    <Stack spacing={2}>
                      <Typography><strong>Ley aplicable:</strong> {agreement.governingLaw ?? '—'}</Typography>
                      <Typography><strong>Jurisdicción:</strong> {agreement.jurisdiction ?? '—'}</Typography>
                      <Typography><strong>Plazo de pago:</strong> {agreement.paymentTermsDays ? `${agreement.paymentTermsDays} días` : '—'}</Typography>
                      <Typography><strong>Moneda:</strong> {agreement.currency ?? 'CLP'}</Typography>
                      <Typography><strong>Documento firmado:</strong> {agreement.signedDocumentAssetId ? 'Sí' : 'No'}</Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Box>

              {agreement.internalNotes ? (
                <Card variant='outlined'>
                  <CardHeader title='Notas internas' />
                  <CardContent>
                    <Typography sx={{ whiteSpace: 'pre-wrap' }}>{agreement.internalNotes}</Typography>
                  </CardContent>
                </Card>
              ) : null}
            </Stack>
          ) : null}

          {tab === 'clauses' ? (
            visibleClauses.length === 0 ? (
              <Alert severity='info'>Este acuerdo todavía no tiene cláusulas visibles.</Alert>
            ) : (
              <Stack spacing={3}>
                {visibleClauses.map(clause => {
                  const clauseMeta = CLAUSE_META[clause.category] ?? { label: clause.category, color: 'secondary' as const }

                  return (
                    <Card key={clause.msaClauseId} variant='outlined'>
                      <CardContent>
                        <Stack spacing={2}>
                          <Stack direction='row' spacing={1.5} justifyContent='space-between' alignItems='flex-start' flexWrap='wrap'>
                            <Box>
                              <Typography variant='h6'>{clause.title}</Typography>
                              <Typography variant='body2' color='text.secondary'>
                                {clause.clauseCode} · v{clause.clauseVersion} · {clause.clauseLanguage.toUpperCase()}
                              </Typography>
                            </Box>
                            <Stack direction='row' spacing={1} flexWrap='wrap'>
                              <CustomChip label={clauseMeta.label} color={clauseMeta.color} size='small' variant='tonal' />
                              <CustomChip
                                label={clause.included ? 'Incluida' : 'No incluida'}
                                color={clause.included ? 'success' : 'secondary'}
                                size='small'
                                variant='tonal'
                              />
                            </Stack>
                          </Stack>
                          {clause.summary ? (
                            <Typography color='text.secondary'>{clause.summary}</Typography>
                          ) : null}
                          <Box
                            sx={{
                              p: 3,
                              borderRadius: 1,
                              bgcolor: 'action.hover',
                              whiteSpace: 'pre-wrap'
                            }}
                          >
                            <Typography variant='body2'>{clause.resolvedBody}</Typography>
                          </Box>
                          <Stack direction='row' spacing={2} flexWrap='wrap'>
                            <Typography variant='body2' color='text.secondary'>
                              <strong>Vigencia:</strong> {formatDate(clause.effectiveFrom)} {clause.effectiveTo ? `- ${formatDate(clause.effectiveTo)}` : ''}
                            </Typography>
                            {clause.notes ? (
                              <Typography variant='body2' color='text.secondary'>
                                <strong>Notas:</strong> {clause.notes}
                              </Typography>
                            ) : null}
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  )
                })}
              </Stack>
            )
          ) : null}

          {tab === 'linked-contracts' ? (
            linkedContracts.length === 0 ? (
              <Alert severity='info'>Todavía no hay contratos vinculados a este acuerdo marco.</Alert>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Contrato</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Inicio</TableCell>
                      <TableCell>Fin</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {linkedContracts.map(contract => {
                      const statusMeta = LINKED_STATUS_META[contract.status] ?? { label: contract.status, color: 'secondary' as const }

                      return (
                        <TableRow
                          key={contract.contractId}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => router.push(`/finance/contracts/${contract.contractId}`)}
                        >
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Typography fontWeight={600}>{contract.contractNumber}</Typography>
                              <Typography variant='body2' color='text.secondary'>
                                Abrir contrato vinculado
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <CustomChip label={statusMeta.label} color={statusMeta.color} size='small' variant='tonal' />
                          </TableCell>
                          <TableCell>{formatDate(contract.startDate)}</TableCell>
                          <TableCell>{formatDate(contract.endDate)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </Box>
            )
          ) : null}
        </CardContent>
      </Card>
    </Stack>
  )
}

export default MasterAgreementDetailView
