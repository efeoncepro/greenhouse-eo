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

import { COUNTRY_OPTIONS, LEGAL_PROFILE_COPY } from './copy'

interface LegalProfileAddressFormProps {
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
  }) => Promise<void>
  onCancel: () => void
}

const LegalProfileAddressForm = ({
  fixedAddressType,
  initialCountry = 'CL',
  submitting,
  serverError,
  onSubmit,
  onCancel
}: LegalProfileAddressFormProps) => {
  const theme = useTheme()
  const [country, setCountry] = useState(initialCountry)
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [region, setRegion] = useState('')
  const [postal, setPostal] = useState('')
  const [touched, setTouched] = useState(false)

  const streetInvalid = touched && street.trim().length === 0
  const cityInvalid = touched && city.trim().length === 0

  const canSubmit = street.trim().length > 0 && city.trim().length > 0

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
      postalCode: postal.trim() || null
    })
  }

  return (
    <Box component='form' onSubmit={handleSubmit} sx={{ p: 5, pb: 6 }}>
      {serverError ? (
        <Alert severity='error' role='alert' sx={{ mb: 4 }}>
          {serverError}
        </Alert>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
          gap: 4,
          mb: 4
        }}
      >
        <CustomTextField
          select
          label={LEGAL_PROFILE_COPY.fields.addressCountryLabel}
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
          label={LEGAL_PROFILE_COPY.fields.streetLabel}
          placeholder={LEGAL_PROFILE_COPY.fields.streetPlaceholder}
          value={street}
          onChange={e => setStreet(e.target.value)}
          onBlur={() => setTouched(true)}
          disabled={submitting}
          fullWidth
          error={streetInvalid}
          sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
        />

        <CustomTextField
          label={LEGAL_PROFILE_COPY.fields.cityLabel}
          value={city}
          onChange={e => setCity(e.target.value)}
          onBlur={() => setTouched(true)}
          disabled={submitting}
          fullWidth
          error={cityInvalid}
        />

        <CustomTextField
          label={LEGAL_PROFILE_COPY.fields.regionLabel}
          value={region}
          onChange={e => setRegion(e.target.value)}
          disabled={submitting}
          fullWidth
        />

        <CustomTextField
          label={LEGAL_PROFILE_COPY.fields.postalLabel}
          value={postal}
          onChange={e => setPostal(e.target.value)}
          disabled={submitting}
          fullWidth
          sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
        />
      </Box>

      <Stack
        direction='row'
        spacing={2}
        justifyContent='flex-end'
        sx={{
          pt: 3,
          borderTop: `1px solid ${theme.palette.divider}`
        }}
      >
        <Button variant='text' color='secondary' onClick={onCancel} disabled={submitting}>
          {LEGAL_PROFILE_COPY.itemActions.cancel}
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
              <i className='tabler-send' style={{ fontSize: 16 }} aria-hidden='true' />
            )
          }
        >
          <Typography component='span' variant='body2' sx={{ fontWeight: 500, color: 'inherit' }}>
            {submitting ? LEGAL_PROFILE_COPY.itemActions.saving : LEGAL_PROFILE_COPY.itemActions.save}
          </Typography>
        </Button>
      </Stack>
    </Box>
  )
}

export default LegalProfileAddressForm
