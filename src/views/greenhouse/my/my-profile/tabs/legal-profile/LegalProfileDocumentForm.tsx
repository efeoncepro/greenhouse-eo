'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import CustomTextField from '@core/components/mui/TextField'

import { COUNTRY_OPTIONS, DOC_TYPES_BY_COUNTRY, LEGAL_PROFILE_COPY } from './copy'

interface LegalProfileDocumentFormProps {
  initialCountry?: string
  initialType?: string
  submitting: boolean
  serverError: string | null
  onSubmit: (input: {
    countryCode: string
    documentType: string
    rawValue: string
  }) => Promise<void>
  onCancel: () => void
}

const formatRutLive = (input: string): string => {
  const cleaned = input.replace(/[.\s-]/g, '').toUpperCase()

  if (cleaned.length <= 1) return cleaned

  const dv = cleaned.slice(-1)
  const numeric = cleaned.slice(0, -1)

  // Group thousands from right
  const reversed = numeric.split('').reverse()
  const groups: string[] = []

  for (let i = 0; i < reversed.length; i += 3) {
    groups.push(reversed.slice(i, i + 3).reverse().join(''))
  }

  return `${groups.reverse().join('.')}-${dv}`
}

const LegalProfileDocumentForm = ({
  initialCountry = 'CL',
  initialType = 'CL_RUT',
  submitting,
  serverError,
  onSubmit,
  onCancel
}: LegalProfileDocumentFormProps) => {
  const theme = useTheme()
  const [country, setCountry] = useState(initialCountry)
  const [docType, setDocType] = useState(initialType)
  const [value, setValue] = useState('')
  const [touched, setTouched] = useState(false)

  const docOptions = DOC_TYPES_BY_COUNTRY[country] ?? DOC_TYPES_BY_COUNTRY.__default!

  useEffect(() => {
    if (!docOptions.includes(docType)) {
      setDocType(docOptions[0]!)
    }
  }, [country, docType, docOptions])

  const isClRut = docType === 'CL_RUT'
  const valueLabel = isClRut ? LEGAL_PROFILE_COPY.fields.rutLabel : LEGAL_PROFILE_COPY.fields.documentValueLabel
  const valuePlaceholder = isClRut ? LEGAL_PROFILE_COPY.fields.rutPlaceholder : ''

  const trimmedValue = value.trim()
  const isInvalid = touched && trimmedValue.length === 0

  const handleValueChange = (raw: string) => {
    setValue(isClRut ? formatRutLive(raw) : raw)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)

    if (trimmedValue.length === 0) return

    await onSubmit({ countryCode: country, documentType: docType, rawValue: trimmedValue })
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
          label={LEGAL_PROFILE_COPY.fields.countryLabel}
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
          select
          label={LEGAL_PROFILE_COPY.fields.documentTypeLabel}
          value={docType}
          onChange={e => setDocType(String(e.target.value))}
          disabled={submitting}
          fullWidth
        >
          {docOptions.map(t => (
            <MenuItem key={t} value={t}>
              {LEGAL_PROFILE_COPY.documentTypeLabels[t] ?? t}
            </MenuItem>
          ))}
        </CustomTextField>

        <CustomTextField
          label={valueLabel}
          placeholder={valuePlaceholder}
          value={value}
          onChange={e => handleValueChange(e.target.value)}
          onBlur={() => setTouched(true)}
          disabled={submitting}
          fullWidth
          inputProps={{
            style: {
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.04em'
            }
          }}
          error={isInvalid}
          sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}
          helperText={
            isClRut ? LEGAL_PROFILE_COPY.fields.rutHint : ' '
          }
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
          disabled={submitting || trimmedValue.length === 0}
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

export default LegalProfileDocumentForm
