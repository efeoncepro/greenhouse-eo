'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
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

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import CustomChip from '@core/components/mui/Chip'

import QuoteDocumentChain from './workspace/QuoteDocumentChain'

type ContractTab = 'overview' | 'quotes' | 'chain' | 'profitability'

interface ContractDetail {
  contractId: string
  contractNumber: string
  clientName: string | null
  status: string
  commercialModel: string | null
  staffingModel: string | null
  startDate: string | null
  endDate: string | null
  autoRenewal: boolean
  renewalFrequencyMonths: number | null
  mrrClp: number | null
  arrClp: number | null
  tcvClp: number | null
  acvClp: number | null
  currency: string | null
  originatorQuoteId: string | null
  originatorQuoteNumber: string | null
  signedAt: string | null
  terminatedAt: string | null
  renewedAt: string | null
  quotes: ContractQuote[]
}

interface ContractQuote {
  quotationId: string
  quotationNumber: string | null
  relationshipType: string
  quoteStatus: string | null
  effectiveFrom: string | null
  effectiveTo: string | null
  totalAmountClp: number | null
}

interface ProfitabilityRow {
  periodYear: number
  periodMonth: number
  realizedRevenueClp: number | null
  attributedCostClp: number | null
  effectiveMarginPct: number | null
  marginDriftPct: number | null
  driftSeverity: string | null
}

interface ChainState {
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
}

const STATUS_META: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'secondary' | 'info' | 'primary' }> = {
  draft: { label: 'Borrador', color: 'secondary' },
  active: { label: 'Activo', color: 'success' },
  paused: { label: 'Pausado', color: 'warning' },
  terminated: { label: 'Terminado', color: 'error' },
  completed: { label: 'Completado', color: 'info' },
  renewed: { label: 'Renovado', color: 'primary' }
}

const DRIFT_META: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'secondary' }> = {
  aligned: { label: 'Alineado', color: 'success' },
  warning: { label: 'Atención', color: 'warning' },
  critical: { label: 'Crítico', color: 'error' }
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

const formatCLP = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined) return '—'

  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount)
}

const formatDate = (value: string | null) => {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const normalizeContract = (value: unknown): ContractDetail => {
  const row = toRecord(value)

  return {
    contractId: String(row.contractId ?? row.contract_id ?? ''),
    contractNumber: String(row.contractNumber ?? row.contract_number ?? row.contract_id ?? '—'),
    clientName: toStringOrNull(row.clientName ?? row.client_name),
    status: String(row.status ?? 'draft'),
    commercialModel: toStringOrNull(row.commercialModel ?? row.commercial_model),
    staffingModel: toStringOrNull(row.staffingModel ?? row.staffing_model),
    startDate: toStringOrNull(row.startDate ?? row.start_date),
    endDate: toStringOrNull(row.endDate ?? row.end_date),
    autoRenewal: Boolean(row.autoRenewal ?? row.auto_renewal),
    renewalFrequencyMonths: toNumberOrNull(row.renewalFrequencyMonths ?? row.renewal_frequency_months),
    mrrClp: toNumberOrNull(row.mrrClp ?? row.mrr_clp),
    arrClp: toNumberOrNull(row.arrClp ?? row.arr_clp),
    tcvClp: toNumberOrNull(row.tcvClp ?? row.tcv_clp),
    acvClp: toNumberOrNull(row.acvClp ?? row.acv_clp),
    currency: toStringOrNull(row.currency),
    originatorQuoteId: toStringOrNull(row.originatorQuoteId ?? row.originator_quote_id),
    originatorQuoteNumber: toStringOrNull(row.originatorQuoteNumber ?? row.originator_quote_number),
    signedAt: toStringOrNull(row.signedAt ?? row.signed_at),
    terminatedAt: toStringOrNull(row.terminatedAt ?? row.terminated_at),
    renewedAt: toStringOrNull(row.renewedAt ?? row.renewed_at),
    quotes: Array.isArray(row.quotes)
      ? row.quotes.map(item => {
          const quote = toRecord(item)

          return {
            quotationId: String(quote.quotationId ?? quote.quotation_id ?? ''),
            quotationNumber: toStringOrNull(quote.quotationNumber ?? quote.quotation_number),
            relationshipType: String(quote.relationshipType ?? quote.relationship_type ?? 'originator'),
            quoteStatus: toStringOrNull(quote.quoteStatus ?? quote.quote_status ?? quote.status),
            effectiveFrom: toStringOrNull(quote.effectiveFrom ?? quote.effective_from),
            effectiveTo: toStringOrNull(quote.effectiveTo ?? quote.effective_to),
            totalAmountClp: toNumberOrNull(quote.totalAmountClp ?? quote.total_amount_clp)
          }
        })
      : []
  }
}

const ContractDetailView = () => {
  const params = useParams()
  const contractId = params.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<ContractTab>('overview')
  const [contract, setContract] = useState<ContractDetail | null>(null)
  const [chain, setChain] = useState<ChainState | null>(null)
  const [profitability, setProfitability] = useState<ProfitabilityRow[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [contractRes, chainRes, profitabilityRes] = await Promise.all([
        fetch(`/api/finance/contracts/${contractId}`),
        fetch(`/api/finance/contracts/${contractId}/document-chain`),
        fetch(`/api/finance/contracts/${contractId}/profitability`)
      ])

      if (!contractRes.ok) {
        const body = await contractRes.json().catch(() => ({}))

        setError(typeof body.error === 'string' ? body.error : 'No pudimos cargar este contrato.')
        setContract(null)
        setChain(null)
        setProfitability([])

        return
      }

      const contractBody = await contractRes.json()

      setContract(normalizeContract(contractBody.contract ?? contractBody))

      if (chainRes.ok) {
        const chainBody = await chainRes.json()
        const totals = toRecord(chainBody.totals)

        setChain({
          purchaseOrders: Array.isArray(chainBody.purchaseOrders) ? chainBody.purchaseOrders : [],
          serviceEntries: Array.isArray(chainBody.serviceEntries) ? chainBody.serviceEntries : [],
          incomes: Array.isArray(chainBody.incomes) ? chainBody.incomes : [],
          totals: {
            quoted: toNumberOrNull(totals.quoted),
            authorized: toNumberOrNull(totals.authorized),
            invoiced: toNumberOrNull(totals.invoiced),
            authorizedVsQuotedDelta: toNumberOrNull(totals.authorizedVsQuotedDelta ?? totals.authorized_vs_quoted_delta),
            invoicedVsQuotedDelta: toNumberOrNull(totals.invoicedVsQuotedDelta ?? totals.invoiced_vs_quoted_delta)
          }
        })
      }

      if (profitabilityRes.ok) {
        const body = await profitabilityRes.json()

        setProfitability(
          Array.isArray(body.items)
            ? body.items.map((item: unknown) => {
                const row = toRecord(item)

                return {
                  periodYear: Number(row.periodYear ?? row.period_year ?? 0),
                  periodMonth: Number(row.periodMonth ?? row.period_month ?? 0),
                  realizedRevenueClp: toNumberOrNull(row.realizedRevenueClp ?? row.realized_revenue_clp),
                  attributedCostClp: toNumberOrNull(row.attributedCostClp ?? row.attributed_cost_clp),
                  effectiveMarginPct: toNumberOrNull(row.effectiveMarginPct ?? row.effective_margin_pct),
                  marginDriftPct: toNumberOrNull(row.marginDriftPct ?? row.margin_drift_pct),
                  driftSeverity: toStringOrNull(row.driftSeverity ?? row.drift_severity)
                }
              })
            : []
        )
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
      setContract(null)
      setChain(null)
      setProfitability([])
    } finally {
      setLoading(false)
    }
  }, [contractId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const renewalLabel = useMemo(() => {
    if (!contract?.endDate) return 'Sin término definido'

    return contract.autoRenewal ? 'Auto-renovable' : `Hasta ${formatDate(contract.endDate)}`
  }, [contract])

  if (loading) {
    return (
      <Stack spacing={4}>
        <Skeleton variant='rounded' height={88} />
        <Skeleton variant='rounded' height={380} />
      </Stack>
    )
  }

  if (error || !contract) {
    return <Alert severity='error'>{error ?? 'No pudimos cargar este contrato.'}</Alert>
  }

  const statusMeta = STATUS_META[contract.status] ?? { label: contract.status, color: 'secondary' as const }

  return (
    <Stack spacing={6}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent='space-between'>
        <Box>
          <Stack direction='row' spacing={2} alignItems='center'>
            <Typography variant='h4'>{contract.contractNumber}</Typography>
            <CustomChip label={statusMeta.label} color={statusMeta.color} variant='tonal' />
          </Stack>
          <Typography color='text.secondary'>
            {contract.clientName ?? 'Sin cliente'} · {contract.commercialModel ?? 'Sin commercial model'}
          </Typography>
        </Box>

        <Link href='/finance/contracts' style={{ textDecoration: 'none' }}>
          <Typography color='primary'>Volver a contratos</Typography>
        </Link>
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
          title='MRR'
          stats={formatCLP(contract.mrrClp)}
          subtitle='Ingreso recurrente mensual'
          avatarIcon='tabler-cash'
          avatarColor='primary'
        />
        <HorizontalWithSubtitle
          title='ARR'
          stats={formatCLP(contract.arrClp)}
          subtitle='Run-rate anual'
          avatarIcon='tabler-chart-line'
          avatarColor='info'
        />
        <HorizontalWithSubtitle
          title='Inicio'
          stats={formatDate(contract.startDate)}
          subtitle='Fecha de inicio contractual'
          avatarIcon='tabler-calendar-event'
          avatarColor='success'
        />
        <HorizontalWithSubtitle
          title='Vigencia'
          stats={renewalLabel}
          subtitle='Estado de renovación'
          avatarIcon='tabler-repeat'
          avatarColor='warning'
        />
      </Box>

      <Card>
        <Tabs value={tab} onChange={(_event, value) => setTab(value)} sx={{ px: 4, pt: 2 }}>
          <Tab label='Resumen' value='overview' />
          <Tab label='Quotes' value='quotes' />
          <Tab label='Cadena documental' value='chain' />
          <Tab label='Rentabilidad' value='profitability' />
        </Tabs>
        <CardContent>
          {tab === 'overview' ? (
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
              <Box>
                <Card variant='outlined'>
                  <CardHeader title='Contexto contractual' />
                  <CardContent>
                    <Stack spacing={2}>
                      <Typography><strong>Cliente:</strong> {contract.clientName ?? 'Sin cliente'}</Typography>
                      <Typography><strong>Modelo comercial:</strong> {contract.commercialModel ?? '—'}</Typography>
                      <Typography><strong>Staffing model:</strong> {contract.staffingModel ?? '—'}</Typography>
                      <Typography><strong>Quote originadora:</strong> {contract.originatorQuoteNumber ?? '—'}</Typography>
                      <Typography><strong>Firmado:</strong> {formatDate(contract.signedAt)}</Typography>
                      <Typography><strong>Renovado:</strong> {formatDate(contract.renewedAt)}</Typography>
                      <Typography><strong>Terminado:</strong> {formatDate(contract.terminatedAt)}</Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Box>
              <Box>
                <Card variant='outlined'>
                  <CardHeader title='Valor económico' />
                  <CardContent>
                    <Stack spacing={2}>
                      <Typography><strong>TCV:</strong> {formatCLP(contract.tcvClp)}</Typography>
                      <Typography><strong>ACV:</strong> {formatCLP(contract.acvClp)}</Typography>
                      <Typography><strong>Moneda:</strong> {contract.currency ?? 'CLP'}</Typography>
                      <Typography><strong>Frecuencia nominal:</strong> {contract.renewalFrequencyMonths ? `${contract.renewalFrequencyMonths} meses` : 'No definida'}</Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          ) : null}

          {tab === 'quotes' ? (
            contract.quotes.length === 0 ? (
              <Alert severity='info'>Este contrato todavía no tiene quotes relacionadas visibles.</Alert>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Quote</TableCell>
                    <TableCell>Relación</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Vigencia</TableCell>
                    <TableCell>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contract.quotes.map(quote => (
                    <TableRow key={quote.quotationId}>
                      <TableCell>{quote.quotationNumber ?? quote.quotationId}</TableCell>
                      <TableCell>{quote.relationshipType}</TableCell>
                      <TableCell>{quote.quoteStatus ?? '—'}</TableCell>
                      <TableCell>
                        {formatDate(quote.effectiveFrom)}
                        {' · '}
                        {quote.effectiveTo ? formatDate(quote.effectiveTo) : 'Abierta'}
                      </TableCell>
                      <TableCell>{formatCLP(quote.totalAmountClp)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : null}

          {tab === 'chain' ? (
            <QuoteDocumentChain
              loading={false}
              error={null}
              quotationStatus={contract.status}
              purchaseOrders={(chain?.purchaseOrders ?? []) as never[]}
              serviceEntries={(chain?.serviceEntries ?? []) as never[]}
              incomes={(chain?.incomes ?? []) as never[]}
              totals={chain?.totals ?? {
                quoted: null,
                authorized: null,
                invoiced: null,
                authorizedVsQuotedDelta: null,
                invoicedVsQuotedDelta: null
              }}
              currency={contract.currency ?? 'CLP'}
              canConvertSimple={false}
              canLinkExisting={false}
              converting={false}
              onConvertSimple={() => undefined}
            />
          ) : null}

          {tab === 'profitability' ? (
            profitability.length === 0 ? (
              <Alert severity='info'>Todavía no hay snapshots de rentabilidad materializados para este contrato.</Alert>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Período</TableCell>
                    <TableCell>Revenue</TableCell>
                    <TableCell>Costo</TableCell>
                    <TableCell>Margen</TableCell>
                    <TableCell>Drift</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {profitability.map(row => {
                    const driftMeta = row.driftSeverity
                      ? (DRIFT_META[row.driftSeverity] ?? { label: row.driftSeverity, color: 'secondary' as const })
                      : null

                    return (
                      <TableRow key={`${row.periodYear}-${row.periodMonth}`}>
                        <TableCell>{`${String(row.periodMonth).padStart(2, '0')}/${row.periodYear}`}</TableCell>
                        <TableCell>{formatCLP(row.realizedRevenueClp)}</TableCell>
                        <TableCell>{formatCLP(row.attributedCostClp)}</TableCell>
                        <TableCell>{row.effectiveMarginPct === null ? '—' : `${row.effectiveMarginPct.toFixed(1)}%`}</TableCell>
                        <TableCell>
                          <Stack direction='row' spacing={2} alignItems='center'>
                            <Typography>
                              {row.marginDriftPct === null ? '—' : `${row.marginDriftPct.toFixed(1)} pts`}
                            </Typography>
                            {driftMeta ? (
                              <CustomChip size='small' label={driftMeta.label} color={driftMeta.color} variant='tonal' />
                            ) : null}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )
          ) : null}
        </CardContent>
      </Card>
    </Stack>
  )
}

export default ContractDetailView
