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

import { COUNTRY_OPTIONS, DOC_TYPES_BY_COUNTRY, HR_LEGAL_COPY } from './copy'

interface HrDocumentEditFormProps {
  initialCountry?: string
  initialType?: string
  submitting: boolean
  serverError: string | null
  onSubmit: (input: {
    countryCode: string
    documentType: string
    rawValue: string
    reason: string
  }) => Promise<void>
  onCancel: () => void
}

const formatRutLive = (input: string): string => {
  const cleaned = input.replace(/[.\s-]/g, '').toUpperCase()

  if (cleaned.length <= 1) return cleaned

  const dv = cleaned.slice(-1)
  const numeric = cleaned.slice(0, -1)
  const reversed = numeric.split('').reverse()
  const groups: string[] = []

  for (let i = 0; i < reversed.length; i += 3) {
    groups.push(reversed.slice(i, i + 3).reverse().join(''))
  }

  return `${groups.reverse().join('.')}-${dv}`
}

const HrDocumentEditForm = ({
  initialCountry = 'CL',
  initialType = 'CL_RUT',
  submitting,
  serverError,
  onSubmit,
  onCancel
}: HrDocumentEditFormProps) => {
  const theme = useTheme()
  const [country, setCountry] = useState(initialCountry)
  const [docType, setDocType] = useState(initialType)
  const [value, setValue] = useState('')
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)

  const docOptions = DOC_TYPES_BY_COUNTRY[country] ?? DOC_TYPES_BY_COUNTRY.__default!

  useEffect(() => {
    if (!docOptions.includes(docType)) {
      setDocType(docOptions[0]!)
    }
  }, [country, docType, docOptions])

  const isClRut = docType === 'CL_RUT'
  const valueLabel = isClRut ? HR_LEGAL_COPY.fields.rutLabel : HR_LEGAL_COPY.fields.documentValueLabel
  const valuePlaceholder = isClRut ? HR_LEGAL_COPY.fields.rutPlaceholder : ''

  const handleValueChange = (raw: string) => {
    setValue(isClRut ? formatRutLive(raw) : raw)
  }

  const valueInvalid = touched && value.trim().length === 0
  const reasonInvalid = touched && reason.trim().length < 10
  const canSubmit = value.trim().length > 0 && reason.trim().length >= 10

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)

    if (!canSubmit) return

    await onSubmit({
      countryCode: country,
      documentType: docType,
      rawValue: value.trim(),
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
          label={HR_LEGAL_COPY.fields.countryLabel}
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
          label={HR_LEGAL_COPY.fields.documentTypeLabel}
          value={docType}
          onChange={e => setDocType(String(e.target.value))}
          disabled={submitting}
          fullWidth
        >
          {docOptions.map(t => (
            <MenuItem key={t} value={t}>
              {HR_LEGAL_COPY.documentTypeLabels[t] ?? t}
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
            style: { fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }
          }}
          error={valueInvalid}
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
        sx={{
          pt: 3,
          borderTop: `1px solid ${theme.palette.divider}`
        }}
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
            {submitting ? 'Guardando…' : HR_LEGAL_COPY.actions.saveHrEdit}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}

export default HrDocumentEditForm
