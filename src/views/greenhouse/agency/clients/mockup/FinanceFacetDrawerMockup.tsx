'use client'

// TASK-992 mockup — Redefined finance facet drawer. The old CreateClientDrawer
// CREATED clients (anti-pattern); this redefines it to "complete the financial
// facet of an EXISTING client". Mockup host page renders a dimmed Account-360-ish
// backdrop with the drawer open for capture. Local state only; no API/DB.

import { useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
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

import { CURRENCY_OPTIONS, MOCK_FINANCE_DRAWER_CLIENT as CLIENT } from './client-onboarding-data'

const aria = getMicrocopy('es-CL').aria

const FinanceFacetDrawer = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const theme = useTheme()

  const [currency, setCurrency] = useState('MXN')
  const [paymentTerms, setPaymentTerms] = useState('30')
  const [requiresPo, setRequiresPo] = useState(true)
  const [requiresHes, setRequiresHes] = useState(false)
  const [billingAddress, setBillingAddress] = useState('')
  const [specialConditions, setSpecialConditions] = useState('')

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
                  {CLIENT.organizationName}
                </Typography>
                <Typography variant='caption' sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                  {CLIENT.taxIdLabel} {CLIENT.taxId}
                </Typography>
              </Box>
              <CustomChip round='true' size='small' variant='tonal' color='secondary' label={CLIENT.publicId} />
            </Stack>
          </Box>
        </Box>

        {/* Body */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 5 }}>
          <Stack spacing={4}>
            <CustomTextField select fullWidth label={T.finanzas.currencyLabel} value={currency} onChange={e => setCurrency(e.target.value)} helperText={T.finanzas.currencyMxNote}>
              {CURRENCY_OPTIONS.map(c => (
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
              slotProps={{ input: { endAdornment: <InputAdornment position='end'>días</InputAdornment> } }}
            />

            <Stack spacing={1}>
              <FormControlLabel control={<Switch checked={requiresPo} onChange={() => setRequiresPo(!requiresPo)} />} label={T.finanzas.requiresPoLabel} />
              <FormControlLabel control={<Switch checked={requiresHes} onChange={() => setRequiresHes(!requiresHes)} />} label={T.finanzas.requiresHesLabel} />
            </Stack>

            <CustomTextField fullWidth label={T.finanzas.billingAddressLabel} value={billingAddress} onChange={e => setBillingAddress(e.target.value)} helperText={T.finanzas.billingAddressHelper} autoComplete='off' />

            <CustomTextField fullWidth multiline minRows={2} label={T.finanzas.specialConditionsLabel} value={specialConditions} onChange={e => setSpecialConditions(e.target.value)} helperText={T.finanzas.specialConditionsHelper} />

            <Stack direction='row' spacing={2} alignItems='flex-start' sx={{ color: 'text.secondary' }}>
              <i className='tabler-info-circle' style={{ fontSize: 16, marginTop: 2 }} aria-hidden />
              <Typography variant='caption'>{T.financeDrawer.notACreateNote}</Typography>
            </Stack>
          </Stack>
        </Box>

        {/* Footer */}
        <Box sx={{ p: 5, pt: 4, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Stack direction='row' spacing={2} justifyContent='flex-end'>
            <Button color='secondary' onClick={onClose}>
              {T.financeDrawer.cancelCta}
            </Button>
            <Button variant='contained' startIcon={<i className='tabler-device-floppy' />} onClick={onClose}>
              {T.financeDrawer.saveCta}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Drawer>
  )
}

const FinanceFacetDrawerMockup = () => {
  const [open, setOpen] = useState(true)

  return (
    <Box sx={{ p: { xs: 4, md: 6 }, maxWidth: 1000, mx: 'auto' }}>
      <Stack spacing={1} sx={{ mb: 5 }}>
        <Typography variant='h4' sx={{ fontWeight: 700 }}>
          {CLIENT.organizationName}
        </Typography>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          Ficha del cliente · Finanzas
        </Typography>
      </Stack>

      <Button variant='tonal' color='primary' startIcon={<i className='tabler-cash' />} onClick={() => setOpen(true)}>
        {T.financeDrawer.title}
      </Button>

      <FinanceFacetDrawer open={open} onClose={() => setOpen(false)} />
    </Box>
  )
}

export default FinanceFacetDrawerMockup
