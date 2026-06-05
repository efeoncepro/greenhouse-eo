'use client'

import { useCallback, useMemo, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import CustomAutocomplete from '@core/components/mui/Autocomplete'
import CustomTextField from '@core/components/mui/TextField'

import { GreenhouseDatePicker } from '@/components/greenhouse'
import { OperationalPanel } from '@/components/greenhouse/primitives'
import { GH_WORKFORCE_CONTRACTING as C } from '@/lib/copy/workforce-contracting'
import { JURISDICTION_PACKS } from '@/lib/workforce/contracting'
import type { WorkforceContractingCaseKind } from '@/lib/workforce/contracting/types'

interface PersonOption {
  profileId: string
  fullName: string | null
}

interface Props {
  operatingEntityOrganizationId: string | null
  onCreated: (caseId: string) => void
}

const toLocalDateKey = (date: Date | null): string | null => {
  if (!date) return null
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')

  return `${y}-${m}-${d}`
}

const CreateContractingCaseForm = ({ operatingEntityOrganizationId, onCreated }: Props) => {
  const [caseKind, setCaseKind] = useState<WorkforceContractingCaseKind>('employment_contract')
  const [subject, setSubject] = useState<PersonOption | null>(null)
  const [packCode, setPackCode] = useState('')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [legalRef, setLegalRef] = useState('')
  const [options, setOptions] = useState<PersonOption[]>([])
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const packOptions = useMemo(
    () => Object.values(JURISDICTION_PACKS).filter(pack => pack.documentKinds.includes(caseKind)),
    [caseKind]
  )

  const selectedPack = useMemo(() => packOptions.find(pack => pack.code === packCode), [packOptions, packCode])
  const requiresLegalRef = selectedPack?.requiresLegalReviewReference ?? false

  const runSearch = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length < 2) {
      setOptions([])

      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)

      try {
        const res = await fetch(`/api/organizations/people-search?q=${encodeURIComponent(query.trim())}`)
        const data = (await res.json()) as { items?: PersonOption[] }

        setOptions(Array.isArray(data.items) ? data.items : [])
      } catch {
        setOptions([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [])

  const canSubmit =
    Boolean(subject) &&
    Boolean(packCode) &&
    Boolean(operatingEntityOrganizationId) &&
    (!requiresLegalRef || legalRef.trim().length >= 10) &&
    !submitting

  const handleSubmit = useCallback(async () => {
    if (!subject || !packCode || !operatingEntityOrganizationId) return

    setSubmitting(true)

    try {
      const res = await fetch('/api/hr/workforce/contracting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseKind,
          subjectIdentityProfileId: subject.profileId,
          operatingEntityOrganizationId,
          jurisdictionPackCode: packCode,
          authoritativeLanguage: selectedPack?.authoritativeLanguage ?? 'es-CL',
          targetStartDate: toLocalDateKey(startDate),
          legalReviewReference: requiresLegalRef ? legalRef.trim() : null
        })
      })

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string }

        throw new Error(payload.error || C.create.error)
      }

      const data = (await res.json()) as { caseId: string }

      toast.success(C.create.success)
      onCreated(data.caseId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : C.create.error)
    } finally {
      setSubmitting(false)
    }
  }, [subject, packCode, operatingEntityOrganizationId, caseKind, selectedPack, startDate, requiresLegalRef, legalRef, onCreated])

  return (
    <OperationalPanel title={C.create.title} icon='tabler-file-plus' iconColor='primary'>
      <Stack spacing={3} sx={{ maxWidth: 620 }}>
        <Typography variant='body2' sx={{ color: 'text.primary' }}>
          {C.create.subtitle}
        </Typography>
        {!operatingEntityOrganizationId ? <Alert severity='error'>{C.create.entityMissing}</Alert> : null}

        <Box>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
            {C.create.kind}
          </Typography>
          <ToggleButtonGroup
            exclusive
            value={caseKind}
            onChange={(_e, next: WorkforceContractingCaseKind | null) => {
              if (next) {
                setCaseKind(next)
                setPackCode('')
              }
            }}
            sx={{ '& .MuiToggleButton-root': { borderRadius: 1, textTransform: 'none' } }}
          >
            <ToggleButton value='employment_contract'>{C.kindLabels.employment_contract}</ToggleButton>
            <ToggleButton value='offer_letter'>{C.kindLabels.offer_letter}</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <CustomAutocomplete<PersonOption>
          options={options}
          loading={searching}
          value={subject}
          onChange={(_e, value) => setSubject(value)}
          onInputChange={(_e, value) => runSearch(value)}
          getOptionLabel={option => option.fullName ?? option.profileId}
          isOptionEqualToValue={(a, b) => a.profileId === b.profileId}
          noOptionsText={C.create.subjectHint}
          renderInput={params => (
            <CustomTextField
              {...params}
              label={C.create.subject}
              placeholder={C.create.subjectPlaceholder}
              slotProps={{
                input: {
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {searching ? <CircularProgress size={16} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  )
                }
              }}
            />
          )}
        />

        <CustomTextField
          select
          fullWidth
          label={C.create.pack}
          value={packCode}
          onChange={e => setPackCode(e.target.value)}
        >
          {packOptions.map(pack => (
            <MenuItem key={pack.code} value={pack.code}>
              {pack.label}
            </MenuItem>
          ))}
        </CustomTextField>

        <GreenhouseDatePicker label={C.create.startDate} value={startDate} onChange={setStartDate} />

        {requiresLegalRef ? (
          <CustomTextField
            fullWidth
            label={C.create.legalRef}
            helperText={C.create.legalRefHint}
            value={legalRef}
            onChange={e => setLegalRef(e.target.value)}
            error={legalRef.length > 0 && legalRef.trim().length < 10}
          />
        ) : null}

        <Box>
          <Button
            variant='contained'
            disabled={!canSubmit}
            onClick={handleSubmit}
            startIcon={submitting ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-file-plus' aria-hidden='true' />}
          >
            {submitting ? C.create.submitting : C.create.submit}
          </Button>
        </Box>
      </Stack>
    </OperationalPanel>
  )
}

export default CreateContractingCaseForm
