'use client'

// TASK-745 — Dialog para crear ajustes de pago (exclude / porcentaje / descuento).
// Implementa los 3 modos canonicos del modelo event-sourced.

import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomTextField from '@core/components/mui/TextField'

import {
  ADJUSTMENT_REASON_CODES,
  ADJUSTMENT_REASON_LABELS,
  type AdjustmentReasonCode
} from '@/lib/payroll/adjustments/reason-codes'
import {
  computePayrollEntryNet,
  type PayrollEntryComputeSnapshot
} from '@/lib/payroll/adjustments/compute-net'
import { checkChileDependentCompliance } from '@/lib/payroll/adjustments/compliance'
import type { PayrollAdjustment, AdjustmentKind } from '@/types/payroll-adjustments'
import type { PayrollEntry } from '@/types/payroll'

import { formatCurrency } from './helpers'

const TASK407_COPY_0 = "0%"
const TASK407_COPY_50 = "50%"
const TASK407_COPY_100 = "100%"


const GREENHOUSE_COPY = getMicrocopy()

type Mode = 'normal' | 'percentage' | 'exclude'

interface Props {
  open: boolean
  onClose: () => void
  entry: PayrollEntry | null
  onSubmitted: () => void
}

const buildAdjustmentForPreview = (kind: AdjustmentKind, payload: Record<string, unknown>) =>
  ({
    adjustmentId: 'preview',
    payrollEntryId: 'preview',
    memberId: 'preview',
    periodId: 'preview',
    kind,
    payload,
    sourceKind: 'manual',
    sourceRef: null,
    reasonCode: 'other',
    reasonNote: 'preview',
    status: 'active',
    requestedBy: 'preview',
    requestedAt: new Date().toISOString(),
    approvedBy: null,
    approvedAt: null,
    revertedBy: null,
    revertedAt: null,
    revertedReason: null,
    supersededBy: null,
    effectiveAt: new Date().toISOString(),
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }) satisfies PayrollAdjustment

const PayrollEntryAdjustDialog = ({ open, onClose, entry, onSubmitted }: Props) => {
  const [mode, setMode] = useState<Mode>('normal')
  const [percentage, setPercentage] = useState<number>(100)
  const [extraDeduction, setExtraDeduction] = useState<string>('')
  const [reasonCode, setReasonCode] = useState<AdjustmentReasonCode | ''>('')
  const [reasonNote, setReasonNote] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset al abrir/cerrar
  useEffect(() => {
    if (open) {
      setMode('normal')
      setPercentage(100)
      setExtraDeduction('')
      setReasonCode('')
      setReasonNote('')
      setError(null)
      setSubmitting(false)
    }
  }, [open])

  const previewSnapshot: PayrollEntryComputeSnapshot | null = useMemo(() => {
    if (!entry) return null

    return {
      payRegime: entry.payRegime as 'chile' | 'international',
      contractTypeSnapshot: entry.contractTypeSnapshot ?? null,
      currency: entry.currency,
      naturalGrossClp: entry.grossTotal,
      components: {
        base: entry.adjustedBaseSalary ?? entry.baseSalary,
        remoteAllowance: entry.adjustedRemoteAllowance ?? entry.remoteAllowance,
        bonusOtd: entry.bonusOtdAmount,
        bonusRpa: entry.bonusRpaAmount,
        fixedBonus: entry.adjustedFixedBonusAmount ?? entry.fixedBonusAmount
      },
      siiRetentionRate: entry.siiRetentionRate ?? null,
      recomputeChileDeductionsClp: gross => {
        const naturalDeductions = entry.chileTotalDeductions ?? 0

        if (entry.grossTotal <= 0) return 0

        return naturalDeductions * (gross / entry.grossTotal)
      }
    }
  }, [entry])

  const previewAdjustments = useMemo<PayrollAdjustment[]>(() => {
    const adjs: PayrollAdjustment[] = []

    if (mode === 'exclude') {
      adjs.push(buildAdjustmentForPreview('exclude', {}))
    } else if (mode === 'percentage' && percentage < 100) {
      adjs.push(buildAdjustmentForPreview('gross_factor', { factor: percentage / 100 }))
    }

    const extra = Number(extraDeduction)

    if (Number.isFinite(extra) && extra > 0 && mode !== 'exclude' && entry) {
      adjs.push(
        buildAdjustmentForPreview('fixed_deduction', {
          amount: extra,
          currency: entry.currency
        })
      )
    }

    return adjs
  }, [mode, percentage, extraDeduction, entry])

  const computation = useMemo(() => {
    if (!previewSnapshot) return null

    return computePayrollEntryNet(previewSnapshot, previewAdjustments)
  }, [previewSnapshot, previewAdjustments])

  const willChange = previewAdjustments.length > 0

  // Compliance preview en TS (mirror del trigger)
  const compliancePreview: string | null = useMemo(() => {
    if (!entry || !reasonCode) return null

    if (mode === 'exclude') {
      return checkChileDependentCompliance({
        payRegime: entry.payRegime as 'chile' | 'international',
        contractTypeSnapshot: entry.contractTypeSnapshot ?? null,
        kind: 'exclude',
        payload: {},
        reasonCode
      })
    }

    if (mode === 'percentage' && percentage === 0) {
      return checkChileDependentCompliance({
        payRegime: entry.payRegime as 'chile' | 'international',
        contractTypeSnapshot: entry.contractTypeSnapshot ?? null,
        kind: 'gross_factor',
        payload: { factor: 0 },
        reasonCode
      })
    }

    return null
  }, [entry, mode, percentage, reasonCode])

  const canSubmit =
    !!entry &&
    willChange &&
    !!reasonCode &&
    reasonNote.trim().length >= 5 &&
    !compliancePreview &&
    !submitting

  const handleSubmit = async () => {
    if (!entry || !canSubmit || !reasonCode) return
    setSubmitting(true)
    setError(null)

    try {
      // Aplicamos los ajustes en orden. Una transaccion HTTP por uno (el helper crea
      // 1 row + 1 outbox event por call). En V1 esto es aceptable; si emerge
      // necesidad de atomicidad cross-kind, se evolucina a un endpoint batch.
      const submitOne = async (kind: AdjustmentKind, payload: Record<string, unknown>) => {
        const res = await fetch(`/api/hr/payroll/entries/${entry.entryId}/adjustments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind,
            payload,
            reasonCode,
            reasonNote: reasonNote.trim()
          })
        })

        if (!res.ok) {
          const j = await res.json().catch(() => null)

          throw new Error(j?.error || `Error ${res.status}`)
        }
      }

      if (mode === 'exclude') {
        await submitOne('exclude', {})
      } else if (mode === 'percentage' && percentage < 100) {
        await submitOne('gross_factor', { factor: percentage / 100 })
      }

      const extra = Number(extraDeduction)

      if (Number.isFinite(extra) && extra > 0 && mode !== 'exclude') {
        await submitOne('fixed_deduction', { amount: extra, currency: entry.currency })
      }

      onSubmitted()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible aplicar el ajuste.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!entry) return null

  const naturalGross = entry.grossTotal
  const isExpandedMode = mode === 'percentage' || mode === 'exclude' || Number(extraDeduction) > 0

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>Ajustar pago — {entry.memberName}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <RadioGroup value={mode} onChange={e => setMode(e.target.value as Mode)}>
            <FormControlLabel
              value='normal'
              control={<Radio />}
              label='Pagar normal (sin ajuste)'
            />
            <FormControlLabel
              value='percentage'
              control={<Radio />}
              label='Pagar un porcentaje del calculo'
            />
            <FormControlLabel value='exclude' control={<Radio />} label='Excluir de esta nomina' />
          </RadioGroup>

          {mode === 'percentage' && (
            <Box sx={{ pl: 4 }}>
              <Typography variant='caption' color='text.secondary'>
                {percentage}% del bruto natural
              </Typography>
              <Slider
                value={percentage}
                min={0}
                max={100}
                step={5}
                onChange={(_, v) => setPercentage(v as number)}
                valueLabelDisplay='auto'
                valueLabelFormat={v => `${v}%`}
                marks={[
                  { value: 0, label: TASK407_COPY_0 },
                  { value: 50, label: TASK407_COPY_50 },
                  { value: 100, label: TASK407_COPY_100 }
                ]}
              />
            </Box>
          )}

          <CustomTextField
            label={`Descuento adicional (${entry.currency})`}
            type='number'
            value={extraDeduction}
            disabled={mode === 'exclude'}
            onChange={e => setExtraDeduction(e.target.value)}
            helperText={`Ej: anticipo a recuperar, prestamo en cuotas. Se descuenta del neto en ${entry.currency} (la moneda del colaborador).`}
            inputProps={{ min: 0, step: entry.currency === 'CLP' ? 1000 : 10 }}
            fullWidth
          />

          <CustomTextField
            select
            label='Motivo'
            value={reasonCode}
            onChange={e => setReasonCode(e.target.value as AdjustmentReasonCode | '')}
            fullWidth
          >
            <MenuItem value=''>
              <em>Selecciona motivo...</em>
            </MenuItem>
            {ADJUSTMENT_REASON_CODES.map(code => (
              <MenuItem key={code} value={code}>
                {ADJUSTMENT_REASON_LABELS[code]}
              </MenuItem>
            ))}
          </CustomTextField>

          <CustomTextField
            label='Nota explicativa'
            value={reasonNote}
            onChange={e => setReasonNote(e.target.value)}
            multiline
            minRows={2}
            helperText='Minimo 5 caracteres. Queda en el audit trail.'
            fullWidth
          />

          {compliancePreview && (
            <Alert severity='warning'>{compliancePreview}</Alert>
          )}

          {isExpandedMode && computation && (
            <>
              <Divider />
              <Stack spacing={1} sx={{ fontSize: '0.8rem' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Bruto natural:</span>
                  <span>{formatCurrency(naturalGross, entry.currency)}</span>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    Bruto efectivo {computation.factorApplied !== 1
                      ? `(${(computation.factorApplied * 100).toFixed(0)}%)`
                      : ''}:
                  </span>
                  <span>{formatCurrency(computation.effectiveGrossClp, entry.currency)}</span>
                </Box>
                {computation.siiRetentionClp > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Retencion SII:</span>
                    <span>− {formatCurrency(computation.siiRetentionClp, 'CLP')}</span>
                  </Box>
                )}
                {computation.chileDeductionsClp > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Deducciones legales Chile:</span>
                    <span>− {formatCurrency(computation.chileDeductionsClp, 'CLP')}</span>
                  </Box>
                )}
                {computation.fixedDeductionClp > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Descuento adicional:</span>
                    <span>− {formatCurrency(computation.fixedDeductionClp, entry.currency)}</span>
                  </Box>
                )}
                <Divider />
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 700,
                    fontSize: '0.95rem'
                  }}
                >
                  <span>Neto a pagar:</span>
                  <span>{formatCurrency(computation.netClp, entry.currency)}</span>
                </Box>
              </Stack>
            </>
          )}

          {error && <Alert severity='error'>{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>{GREENHOUSE_COPY.actions.cancel}</Button>
        <Button
          variant='contained'
          color='primary'
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? 'Guardando...' : 'Guardar ajuste'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default PayrollEntryAdjustDialog
