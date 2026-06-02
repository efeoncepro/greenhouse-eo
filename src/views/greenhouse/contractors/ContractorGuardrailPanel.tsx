'use client'

// TASK-968 Slice 3 / TASK-974 Slice 4 — Agreed-amount guardrail panel (HR surface, READ-ONLY).
//
// Surfaces payables blocked by `payment_exceeds_agreed_amount` for the selected
// engagement. SoD: HR fija el monto acordado, NO autoriza la excepción. La excepción
// (override gobernado, maker-checker) se opera desde el workbench de Finanzas
// (`/finance/contractor-payments`). Aquí es solo lectura + link.

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { OperationalPanel } from '@/components/greenhouse/primitives'
import { GH_CONTRACTOR_COMPENSATION as CC } from '@/lib/copy/contractor-compensation'
import { formatCurrency, type CurrencyCode } from '@/lib/format'
import type { ContractorWorkbenchQueueRow } from '@/lib/contractor-engagements/projection-types'

interface BlockedPayable {
  contractorPayableId: string
  grossAmount: number
  currency: string
  readiness: { blockers?: { code: string; message: string }[] }
}

const EXCEEDS_CODE = 'payment_exceeds_agreed_amount'

const ContractorGuardrailPanel = ({ row }: { row: ContractorWorkbenchQueueRow }) => {
  const [loading, setLoading] = useState(true)
  const [breached, setBreached] = useState<BlockedPayable[]>([])

  const money = (n: number, currency: string) =>
    formatCurrency(n, currency as CurrencyCode, { currencySymbolSpacing: ' ' }, 'es-CL')

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch(
        `/api/finance/contractor-payables?engagementId=${encodeURIComponent(row.contractorEngagementId)}&status=blocked`,
        { cache: 'no-store' }
      )

      if (!res.ok) {
        setBreached([])

        return
      }

      const body = (await res.json().catch(() => null)) as { items?: BlockedPayable[] } | null

      const items = (body?.items ?? []).filter(p =>
        (p.readiness?.blockers ?? []).some(b => b.code === EXCEEDS_CODE)
      )

      setBreached(items)
    } finally {
      setLoading(false)
    }
  }, [row.contractorEngagementId])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <OperationalPanel
        title={CC.guardrail.panelTitle}
        subheader={CC.guardrail.panelSubheader}
        icon='tabler-shield-dollar'
        iconColor={breached.length > 0 ? 'error' : 'success'}
      >
        {loading ? (
          <Stack direction='row' spacing={2} alignItems='center' sx={{ py: 1 }}>
            <CircularProgress size={18} />
          </Stack>
        ) : breached.length === 0 ? (
          <Alert severity='success' icon={<i className='tabler-circle-check' />}>
            {CC.guardrail.okDescription}
          </Alert>
        ) : (
          <Stack spacing={3}>
            {breached.map(p => {
              const agreed = row.agreedRate.rateAmount

              return (
                <Stack
                  key={p.contractorPayableId}
                  spacing={2}
                  sx={{
                    p: 4,
                    borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
                    border: theme => `1px solid ${theme.palette.error.main}66`,
                    bgcolor: theme => `${theme.palette.error.main}0a`
                  }}
                >
                  <Box>
                    <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                      {CC.guardrail.breachTitle}
                    </Typography>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                      {`Pago ${money(p.grossAmount, p.currency)}`}
                      {agreed !== null ? ` · Acordado ${money(agreed, row.agreedRate.currency)}` : ''}
                    </Typography>
                  </Box>
                </Stack>
              )
            })}
            <Alert severity='info' icon={<i className='tabler-info-circle' />}>
              {CC.guardrail.resolvedInFinanceNote}
            </Alert>
            <Box>
              <Button
                component={Link}
                href='/finance/contractor-payments'
                variant='tonal'
                color='primary'
                endIcon={<i className='tabler-arrow-up-right' />}
              >
                {CC.guardrail.reviewInFinanceCta}
              </Button>
            </Box>
          </Stack>
        )}
    </OperationalPanel>
  )
}

export default ContractorGuardrailPanel
