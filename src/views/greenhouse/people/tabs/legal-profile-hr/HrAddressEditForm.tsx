'use client'

import { useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import CustomTextField from '@core/components/mui/TextField'

import { COUNTRY_OPTIONS, HR_LEGAL_COPY } from './copy'

interface HrAddressEditFormProps {
  fixedAddressType: 'legal' | 'residence' | 'mailing' | 'emergency'
  initialCountry?: string
  submitting: boolean
  serverError: string | null
  onSubmit: (input: {
    addressType: 'legal' | 'residence' | 'mailing' | 'emergency'
    countryCode: string
    streetLine1: string
    city: string
    region: string | null
    postalCode: string | null
    reason: string
  }) => Promise<void>
  onCancel: () => void
}

const HrAddressEditForm = ({
  fixedAddressType,
  initialCountry = 'CL',
  submitting,
  serverError,
  onSubmit,
  onCancel
}: HrAddressEditFormProps) => {
  const theme = useTheme()
  const [country, setCountry] = useState(initialCountry)
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [region, setRegion] = useState('')
  const [postal, setPostal] = useState('')
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)

  const streetInvalid = touched && street.trim().length === 0
  const cityInvalid = touched && city.trim().length === 0
  const reasonInvalid = touched && reason.trim().length < 10

  const canSubmit =
    street.trim().length > 0 && city.trim().length > 0 && reason.trim().length >= 10

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)

    if (!canSubmit) return

    await onSubmit({
      addressType: fixedAddressType,
      countryCode: country,
      streetLine1: street.trim(),
      city: city.trim(),
      region: region.trim() || null,
      postalCode: postal.trim() || null,
      reason: reason.trim()
    })
  }

  return (
    <Box component='form' onSubmit={handleSubmit} sx={{ p: 5 }}>
      {serverError ? (
        <Alert severity='error' role='alert' sx={{ mb: 4 }}>
          {serverError}
        </Alert>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
          gap: 3,
          mb: 3
        }}
      >
        <CustomTextField
          select
          label={HR_LEGAL_COPY.fields.addressCountryLabel}
          value={country}
          onChange={e => setCountry(String(e.target.value))}
          disabled={submitting}
          fullWidth
        >
          {COUNTRY_OPTIONS.map(c => (
            <MenuItem key={c.code} value={c.code}>
              {c.flag} {c.name}
            </MenuItem>
          ))}
        </CustomTextField>

        <CustomTextField
          label={HR_LEGAL_COPY.fields.addressTypeLabel}
          value={HR_LEGAL_COPY.addressTypeLabels[fixedAddressType]}
          disabled
          fullWidth
        />

        <CustomTextField
          label={HR_LEGAL_COPY.fields.streetLabel}
          placeholder={HR_LEGAL_COPY.fields.streetPlaceholder}
          value={street}
          onChange={e => setStreet(e.target.value)}
          onBlur={() => setTouched(true)}
          disabled={submitting}
          fullWidth
          error={streetInvalid}
          sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
        />

        <CustomTextField
          label={HR_LEGAL_COPY.fields.cityLabel}
          value={city}
          onChange={e => setCity(e.target.value)}
          onBlur={() => setTouched(true)}
          disabled={submitting}
          fullWidth
          error={cityInvalid}
        />

        <CustomTextField
          label={HR_LEGAL_COPY.fields.regionLabel}
          value={region}
          onChange={e => setRegion(e.target.value)}
          disabled={submitting}
          fullWidth
        />

        <CustomTextField
          label={HR_LEGAL_COPY.fields.postalLabel}
          value={postal}
          onChange={e => setPostal(e.target.value)}
          disabled={submitting}
          fullWidth
          sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
        />

        <CustomTextField
          label={HR_LEGAL_COPY.hrEdit.reasonLabel}
          placeholder={HR_LEGAL_COPY.hrEdit.reasonPlaceholder}
          value={reason}
          onChange={e => setReason(e.target.value)}
          onBlur={() => setTouched(true)}
          disabled={submitting}
          fullWidth
          multiline
          minRows={2}
          error={reasonInvalid}
          helperText={
            reasonInvalid
              ? `Faltan ${10 - reason.trim().length} caracteres`
              : HR_LEGAL_COPY.hrEdit.reasonHint
          }
          sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
        />
      </Box>

      <Stack
        direction={{ xs: 'column-reverse', sm: 'row' }}
        spacing={2}
        justifyContent='space-between'
        alignItems={{ sm: 'center' }}
        sx={{ pt: 3, borderTop: `1px solid ${theme.palette.divider}` }}
      >
        <Stack direction='row' spacing={1} alignItems='center'>
          <i className='tabler-shield-lock' style={{ fontSize: 14, color: theme.palette.text.secondary }} aria-hidden='true' />
          <Typography variant='caption' color='text.secondary'>
            {HR_LEGAL_COPY.hrEdit.signedFooter}
          </Typography>
        </Stack>
        <Stack direction='row' spacing={2}>
          <Button variant='text' color='secondary' onClick={onCancel} disabled={submitting}>
            {HR_LEGAL_COPY.actions.cancel}
          </Button>
          <Button
            type='submit'
            variant='contained'
            color='primary'
            disabled={submitting || !canSubmit}
            aria-busy={submitting}
            startIcon={
              submitting ? (
                <CircularProgress size={16} sx={{ color: 'inherit' }} />
              ) : (
                <i className='tabler-device-floppy' style={{ fontSize: 16 }} aria-hidden='true' />
              )
            }
          >
            {submitting ? 'Guardando…' : HR_LEGAL_COPY.actions.saveHrAddress}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}

export default HrAddressEditForm
