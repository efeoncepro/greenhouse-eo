'use client'

import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomTextField from '@core/components/mui/TextField'
import GreenhouseFileUploader, { type UploadedFileValue } from '@/components/greenhouse/GreenhouseFileUploader'
import { formatCurrency as formatGreenhouseCurrency } from '@/lib/format'

const GREENHOUSE_COPY = getMicrocopy()

interface AccountOption {
  accountId: string
  accountName: string
  currency: string
  instrumentCategory: string | null
  closingBalance: number
  creditLimit: number | null
}

interface DeclareReconciliationDrawerProps {
  open: boolean
  onClose: () => void
  accounts: AccountOption[]
  preselectedAccountId?: string | null
  onDeclared?: () => void
}

const SOURCE_OPTIONS = [
  { value: 'officebanking_screenshot', label: 'Screenshot OfficeBanking' },
  { value: 'cartola_xlsx', label: 'Cartola XLSX' },
  { value: 'statement_pdf', label: 'Statement PDF' },
  { value: 'manual_declaration', label: 'Declaración manual' },
  { value: 'api_webhook', label: 'Webhook bank' }
]

const formatNumber = (n: number, currency: string) =>
  formatGreenhouseCurrency(n, currency, {
  maximumFractionDigits: currency === 'CLP' ? 0 : 2
}, 'es-CL')

const nowLocalIso = () => {
  const d = new Date()
  const tzOffset = d.getTimezoneOffset() * 60000

  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16)
}

const DeclareReconciliationDrawer = ({
  open,
  onClose,
  accounts,
  preselectedAccountId,
  onDeclared
}: DeclareReconciliationDrawerProps) => {
  const [accountId, setAccountId] = useState<string>(preselectedAccountId || accounts[0]?.accountId || '')
  const [snapshotAt, setSnapshotAt] = useState(nowLocalIso())
  const [bankClosingBalance, setBankClosingBalance] = useState('')
  const [bankAvailableBalance, setBankAvailableBalance] = useState('')
  const [bankCreditLimit, setBankCreditLimit] = useState('')
  const [sourceKind, setSourceKind] = useState('officebanking_screenshot')
  const [evidenceFile, setEvidenceFile] = useState<UploadedFileValue | null>(null)
  const [driftExplanation, setDriftExplanation] = useState('')
  const [driftStatus, setDriftStatus] = useState<'open' | 'accepted'>('accepted')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setAccountId(preselectedAccountId || accounts[0]?.accountId || '')
      setSnapshotAt(nowLocalIso())
      setBankClosingBalance('')
      setBankAvailableBalance('')
      setBankCreditLimit('')
      setSourceKind('officebanking_screenshot')
      setEvidenceFile(null)
      setDriftExplanation('')
      setDriftStatus('accepted')
      setError(null)
      setSuccess(null)
    }
  }, [open, preselectedAccountId, accounts])

  const selectedAccount = useMemo(
    () => accounts.find(a => a.accountId === accountId) || null,
    [accountId, accounts]
  )

  const isCreditCard = selectedAccount?.instrumentCategory === 'credit_card'

  const computedHolds = useMemo(() => {
    if (!isCreditCard) return null

    const limit = Number(bankCreditLimit) || selectedAccount?.creditLimit || 0
    const closing = Number(bankClosingBalance) || 0
    const available = Number(bankAvailableBalance) || 0

    if (limit <= 0) return null

    const holds = limit - closing - available

    return Math.round(holds * 100) / 100
  }, [isCreditCard, bankCreditLimit, bankClosingBalance, bankAvailableBalance, selectedAccount])

  const driftPreview = useMemo(() => {
    if (!selectedAccount || !bankClosingBalance) return null

    const drift = selectedAccount.closingBalance - Number(bankClosingBalance)

    return Math.round(drift * 100) / 100
  }, [selectedAccount, bankClosingBalance])

  const handleSubmit = async () => {
    if (!accountId || !bankClosingBalance) {
      setError('Cuenta y saldo banco son obligatorios.')

      return
    }

    if (driftStatus === 'accepted' && driftExplanation.trim().length < 10) {
      setError('Para aceptar drift como pendiente legítimo, explica la causa (mínimo 10 caracteres).')

      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/finance/reconciliation/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          snapshotAt: new Date(snapshotAt).toISOString(),
          bankClosingBalance: Number(bankClosingBalance),
          bankAvailableBalance: bankAvailableBalance ? Number(bankAvailableBalance) : undefined,
          bankCreditLimit: bankCreditLimit ? Number(bankCreditLimit) : undefined,
          bankHoldsAmount: computedHolds,
          sourceKind,
          evidenceAssetId: evidenceFile?.assetId,
          driftExplanation: driftExplanation.trim() || undefined,
          driftStatus
        })
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))

        throw new Error(errBody.error || `HTTP ${res.status}`)
      }

      setSuccess('Conciliación declarada exitosamente.')
      onDeclared?.()
      setTimeout(() => onClose(), 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al declarar conciliación')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer anchor='right' open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 500 } } }}>
      <Box sx={{ p: 4 }}>
        <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 3 }}>
          <Typography variant='h5'>Declarar conciliación banco ↔ Greenhouse</Typography>
          <IconButton onClick={onClose} size='small'>
            <i className='ri-close-line' />
          </IconButton>
        </Stack>

        {error && (
          <Alert severity='error' sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity='success' sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Stack spacing={3}>
          <CustomTextField
            select
            fullWidth
            label='Cuenta'
            value={accountId}
            onChange={e => setAccountId(e.target.value)}
          >
            {accounts.map(a => (
              <MenuItem key={a.accountId} value={a.accountId}>
                {a.accountName} ({a.currency})
              </MenuItem>
            ))}
          </CustomTextField>

          <CustomTextField
            fullWidth
            type='datetime-local'
            label='Momento del snapshot bank'
            value={snapshotAt}
            onChange={e => setSnapshotAt(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <CustomTextField
            fullWidth
            type='number'
            label={isCreditCard ? 'Deuda según banco' : 'Saldo según banco'}
            value={bankClosingBalance}
            onChange={e => setBankClosingBalance(e.target.value)}
            placeholder='Ej: 1063381'
            helperText={
              selectedAccount
                ? `Greenhouse hoy: ${formatNumber(selectedAccount.closingBalance, selectedAccount.currency)}`
                : null
            }
          />

          {isCreditCard && (
            <>
              <CustomTextField
                fullWidth
                type='number'
                label='Disponible según banco'
                value={bankAvailableBalance}
                onChange={e => setBankAvailableBalance(e.target.value)}
                placeholder='Ej: 540373'
              />
              <CustomTextField
                fullWidth
                type='number'
                label='Cupo total'
                value={bankCreditLimit}
                onChange={e => setBankCreditLimit(e.target.value)}
                placeholder={selectedAccount?.creditLimit?.toString() || 'Ej: 1700000'}
                helperText={`Holds calculados: ${computedHolds != null ? formatNumber(computedHolds, selectedAccount?.currency || 'CLP') : '—'}`}
              />
            </>
          )}

          <CustomTextField
            select
            fullWidth
            label='Fuente'
            value={sourceKind}
            onChange={e => setSourceKind(e.target.value)}
          >
            {SOURCE_OPTIONS.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </CustomTextField>

          <GreenhouseFileUploader
            contextType='finance_reconciliation_evidence_draft'
            value={evidenceFile}
            onChange={setEvidenceFile}
            title='Evidencia (cartola, screenshot o PDF)'
            helperText='Sube el respaldo bancario que valida el saldo declarado. El archivo queda en el storage privado de Greenhouse con hash, audit y URL accesible para auditoría futura.'
            emptyTitle='Arrastra la cartola aquí'
            emptyDescription='PDF, JPG, PNG o WEBP — máximo 10 MB.'
            browseCta='Subir cartola'
            replaceCta='Reemplazar archivo'
            uploadingCta='Subiendo cartola…'
            removeCta='Quitar cartola'
            disabled={submitting}
            metadataLabel={`recon-${accountId}-${snapshotAt.slice(0, 10)}`}
          />

          {driftPreview != null && Math.abs(driftPreview) >= 1 && (
            <Alert severity={Math.abs(driftPreview) > 100000 ? 'warning' : 'info'}>
              <Typography variant='body2'>
                Drift PG − Banco: <strong>{formatNumber(driftPreview, selectedAccount?.currency || 'CLP')}</strong>
              </Typography>
              <Typography variant='caption' display='block' sx={{ mt: 0.5 }}>
                {driftPreview > 0
                  ? 'Greenhouse cuenta más que el banco (cargos en hold reconocidos antes de tiempo, o pagos no posted).'
                  : 'Banco cuenta más que Greenhouse (transacciones bank no capturadas todavía).'}
              </Typography>
            </Alert>
          )}

          <CustomTextField
            select
            fullWidth
            label='Estado del drift'
            value={driftStatus}
            onChange={e => setDriftStatus(e.target.value as 'open' | 'accepted')}
          >
            <MenuItem value='accepted'>Aceptar como pendiente legítimo</MenuItem>
            <MenuItem value='open'>Dejar abierto (requiere investigación)</MenuItem>
          </CustomTextField>

          <CustomTextField
            fullWidth
            multiline
            minRows={3}
            label='Explicación del drift'
            value={driftExplanation}
            onChange={e => setDriftExplanation(e.target.value)}
            placeholder='Ej: Cargos Envato 27/04 + GitHub 26/04 reconocidos en PG aún en hold en banco.'
            helperText='Mínimo 10 caracteres si aceptas el drift'
          />

          <Stack direction='row' spacing={2} justifyContent='flex-end'>
            <Button variant='tonal' color='secondary' onClick={onClose} disabled={submitting}>{GREENHOUSE_COPY.actions.cancel}</Button>
            <Button variant='contained' onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Declarando…' : 'Declarar conciliación'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  )
}

export default DeclareReconciliationDrawer
