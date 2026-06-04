'use client'

// TASK-1010 Slice 2 — Finance facet drawer (runtime). Redefines the old
// CreateClientDrawer (which CREATED clients in parallel — anti-pattern that
// violated the single-front-door rule TASK-992). This drawer COMPLETES the
// financial facet of an EXISTING client. The wizard (provisionClientFromWizard)
// is the ONLY birth door; this drawer only edits client_profiles via PUT.
//
// Visual reference (binding, approved): mockup/FinanceFacetDrawerMockup.tsx —
// wired 1:1 by copy-and-patch (same JSX shell, real data + PUT save + states).

import { useEffect, useState } from 'react'

import { toast } from 'sonner'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Drawer from '@mui/material/Drawer'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import { getMicrocopy } from '@/lib/copy'
import { GH_CLIENT_ONBOARDING as T } from '@/lib/copy/client-onboarding'
import { VALID_CURRENCIES } from '@/lib/finance/contracts'

const aria = getMicrocopy('es-CL').aria

export interface FinanceFacetClientContext {
  /** Canonical client_profiles id — the PUT target. */
  clientProfileId: string
  /** Display name (legal name / company name) for the read-only context block. */
  organizationName: string
  /** Tax id label (RUT / RFC / NIT…) + value for the read-only context block. */
  taxIdLabel: string
  taxId: string | null
  /** Optional canonical public id chip (EO-ORG-…). */
  publicId: string | null
}

export interface FinanceFacetInitialValues {
  paymentCurrency: string
  paymentTermsDays: number
  requiresPo: boolean
  requiresHes: boolean
  billingAddress: string | null
  specialConditions: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  /** Called after a successful save so the host can reload the profile. */
  onSaved: () => void
  context: FinanceFacetClientContext | null
  initial: FinanceFacetInitialValues | null
}

const FinanceFacetDrawer = ({ open, onClose, onSaved, context, initial }: Props) => {
  const theme = useTheme()

  const [currency, setCurrency] = useState('CLP')
  const [paymentTerms, setPaymentTerms] = useState('30')
  const [requiresPo, setRequiresPo] = useState(false)
  const [requiresHes, setRequiresHes] = useState(false)
  const [billingAddress, setBillingAddress] = useState('')
  const [specialConditions, setSpecialConditions] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Hydrate from the existing client's current finance facet whenever the drawer
  // opens for a (new) client. Re-runs on context change so reopening on a
  // different row never shows stale values.
  useEffect(() => {
    if (!open || !initial) return

    setCurrency(initial.paymentCurrency || 'CLP')
    setPaymentTerms(String(initial.paymentTermsDays ?? 30))
    setRequiresPo(initial.requiresPo)
    setRequiresHes(initial.requiresHes)
    setBillingAddress(initial.billingAddress ?? '')
    setSpecialConditions(initial.specialConditions ?? '')
    setError(null)
  }, [open, initial, context?.clientProfileId])

  const handleSave = async () => {
    if (!context) return

    setSaving(true)
    setError(null)

    const parsedTerms = Number(paymentTerms)

    try {
      const res = await fetch(`/api/finance/clients/${encodeURIComponent(context.clientProfileId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentCurrency: currency,
          paymentTermsDays: Number.isFinite(parsedTerms) && parsedTerms > 0 ? parsedTerms : 30,
          requiresPo,
          requiresHes,
          billingAddress: billingAddress.trim() || null,
          specialConditions: specialConditions.trim() || null
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || T.financeDrawer.saveError)
        setSaving(false)

        return
      }

      toast.success(T.financeDrawer.savedToast)
      onSaved()
      onClose()
    } catch {
      setError(T.financeDrawer.saveError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 460 } } }}
      aria-labelledby='finance-facet-title'
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box sx={{ p: 5, pb: 4, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
            <Box>
              <Typography id='finance-facet-title' variant='h6' sx={{ fontWeight: 600 }}>
                {T.financeDrawer.title}
              </Typography>
              <Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.5 }}>
                {T.financeDrawer.subtitle}
              </Typography>
            </Box>
            <IconButton size='small' onClick={onClose} aria-label={aria.closeDrawer}>
              <i className='tabler-x' style={{ fontSize: 18 }} />
            </IconButton>
          </Stack>

          {/* Client context (read-only) */}
          {context && (
            <Box
              sx={{
                mt: 4,
                p: 3,
                borderRadius: `${theme.shape.customBorderRadius.md}px`,
                bgcolor: alpha(theme.palette.secondary.main, 0.04),
                border: `1px solid ${theme.palette.divider}`
              }}
            >
              <Stack direction='row' justifyContent='space-between' alignItems='center'>
                <Box>
                  <Typography variant='caption' sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {T.financeDrawer.clientContextLabel}
                  </Typography>
                  <Typography variant='body2' sx={{ fontWeight: 600 }}>
                    {context.organizationName}
                  </Typography>
                  {context.taxId && (
                    <Typography variant='caption' sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                      {context.taxIdLabel} {context.taxId}
                    </Typography>
                  )}
                </Box>
                {context.publicId && (
                  <CustomChip round='true' size='small' variant='tonal' color='secondary' label={context.publicId} />
                )}
              </Stack>
            </Box>
          )}
        </Box>

        {/* Body */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 5 }}>
          <Stack spacing={4}>
            {error && (
              <Alert severity='error' onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <CustomTextField
              select
              fullWidth
              label={T.finanzas.currencyLabel}
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              helperText={T.finanzas.currencyHelper}
            >
              {VALID_CURRENCIES.map(c => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </CustomTextField>

            <CustomTextField
              fullWidth
              type='number'
              label={T.finanzas.paymentTermsLabel}
              value={paymentTerms}
              onChange={e => setPaymentTerms(e.target.value)}
              helperText={T.finanzas.paymentTermsHelper}
              slotProps={{ input: { endAdornment: <InputAdornment position='end'>{T.financeDrawer.daysAdornment}</InputAdornment> } }}
            />

            <Stack spacing={1}>
              <FormControlLabel control={<Switch checked={requiresPo} onChange={() => setRequiresPo(!requiresPo)} />} label={T.finanzas.requiresPoLabel} />
              <FormControlLabel control={<Switch checked={requiresHes} onChange={() => setRequiresHes(!requiresHes)} />} label={T.finanzas.requiresHesLabel} />
            </Stack>

            <CustomTextField
              fullWidth
              label={T.finanzas.billingAddressLabel}
              value={billingAddress}
              onChange={e => setBillingAddress(e.target.value)}
              helperText={T.finanzas.billingAddressHelper}
              autoComplete='off'
            />

            <CustomTextField
              fullWidth
              multiline
              minRows={2}
              label={T.finanzas.specialConditionsLabel}
              value={specialConditions}
              onChange={e => setSpecialConditions(e.target.value)}
              helperText={T.finanzas.specialConditionsHelper}
            />

            <Stack direction='row' spacing={2} alignItems='flex-start' sx={{ color: 'text.secondary' }}>
              <i className='tabler-info-circle' style={{ fontSize: 16, marginTop: 2 }} aria-hidden />
              <Typography variant='caption'>{T.financeDrawer.notACreateNote}</Typography>
            </Stack>
          </Stack>
        </Box>

        {/* Footer */}
        <Box sx={{ p: 5, pt: 4, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Stack direction='row' spacing={2} justifyContent='flex-end'>
            <Button color='secondary' onClick={onClose} disabled={saving}>
              {T.financeDrawer.cancelCta}
            </Button>
            <Button
              variant='contained'
              startIcon={saving ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-device-floppy' />}
              onClick={handleSave}
              disabled={saving || !context}
            >
              {T.financeDrawer.saveCta}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Drawer>
  )
}

export default FinanceFacetDrawer
