'use client'

import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { toast } from 'sonner'

import CustomChip from '@core/components/mui/Chip'

import { GH_WORKFORCE_ACTIVATION } from '@/lib/copy/workforce'
import { CONTRACT_DERIVATIONS, CONTRACT_LABELS, SCHEDULE_DEFAULTS, type ContractType } from '@/types/hr-contracts'
import type { HrEmploymentType } from '@/types/hr-core'
import PaymentProfilesPanel from '@/views/greenhouse/finance/payment-profiles/PaymentProfilesPanel'

import type { PendingIntakeMemberRow } from '@/lib/workforce/intake-queue/list-pending-members'
import type { WorkforceActivationReadiness } from '@/lib/workforce/activation/types'

interface WorkforceIntakeRemediationDrawerProps {
  readonly open: boolean
  readonly member: PendingIntakeMemberRow | null
  readonly intakeApiBasePath: string
  readonly onClose: () => void
  readonly onSaved: (readiness: WorkforceActivationReadiness) => Promise<void> | void
  readonly onOpenCompensation: () => void
  readonly onOpenExternalIdentity: () => void
}

const employmentOptions: ReadonlyArray<{ value: HrEmploymentType; label: string }> = [
  { value: 'full_time', label: 'Full time' },
  { value: 'part_time', label: 'Part time' },
  { value: 'contractor', label: 'Contractor' }
]

const contractOptions = Object.entries(CONTRACT_LABELS) as Array<[ContractType, { label: string; description: string }]>

const WorkforceIntakeRemediationDrawer = ({
  open,
  member,
  intakeApiBasePath,
  onClose,
  onSaved,
  onOpenCompensation,
  onOpenExternalIdentity
}: WorkforceIntakeRemediationDrawerProps) => {
  const snapshot = member?.activationReadiness?.member ?? null
  const [hireDate, setHireDate] = useState('')
  const [employmentType, setEmploymentType] = useState<HrEmploymentType>('full_time')
  const [contractType, setContractType] = useState<ContractType>('indefinido')
  const [contractEndDate, setContractEndDate] = useState('')
  const [deelContractId, setDeelContractId] = useState('')
  const [dailyRequired, setDailyRequired] = useState(true)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !snapshot) return

    const nextContractType = (snapshot.contractType &&
      Object.prototype.hasOwnProperty.call(CONTRACT_LABELS, snapshot.contractType)
      ? snapshot.contractType
      : 'indefinido') as ContractType

    setHireDate(snapshot.hireDate ?? '')
    setEmploymentType((snapshot.employmentType === 'part_time' || snapshot.employmentType === 'contractor' ? snapshot.employmentType : 'full_time') as HrEmploymentType)
    setContractType(nextContractType)
    setContractEndDate(snapshot.contractEndDate ?? '')
    setDeelContractId(snapshot.deelContractId ?? '')
    setDailyRequired(snapshot.dailyRequired ?? SCHEDULE_DEFAULTS[nextContractType].defaultValue)
    setReason('')
    setError(null)
    setSaving(false)
  }, [open, snapshot])

  const isDeel = CONTRACT_DERIVATIONS[contractType].payrollVia === 'deel'
  const scheduleLocked = !SCHEDULE_DEFAULTS[contractType].overridable

  const laborBlockers = useMemo(
    () => member?.activationReadiness?.blockers.filter(blocker => blocker.lane === 'employment') ?? [],
    [member]
  )

  if (!member) return null

  const handleContractChange = (next: ContractType) => {
    setContractType(next)
    setDailyRequired(SCHEDULE_DEFAULTS[next].defaultValue)

    if (CONTRACT_DERIVATIONS[next].payrollVia !== 'deel') {
      setDeelContractId('')
    }
  }

  const handleSaveLabor = async () => {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`${intakeApiBasePath}/${member.memberId}/intake`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hireDate: hireDate || null,
          employmentType,
          contractType,
          contractEndDate: contractEndDate || null,
          dailyRequired,
          deelContractId: isDeel ? deelContractId || null : null,
          reason: reason.trim() || undefined
        })
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : GH_WORKFORCE_ACTIVATION.resolver_save_error)
      }

      toast.success(GH_WORKFORCE_ACTIVATION.resolver_saved)

      if (payload?.readiness) {
        await onSaved(payload.readiness as WorkforceActivationReadiness)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : GH_WORKFORCE_ACTIVATION.resolver_save_error

      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer anchor='right' open={open} onClose={saving ? undefined : onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 560 } } }}>
      <Stack sx={{ height: '100%' }}>
        <Stack direction='row' justifyContent='space-between' alignItems='flex-start' sx={{ p: 4, pb: 3 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant='h6'>{GH_WORKFORCE_ACTIVATION.resolver_title}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {GH_WORKFORCE_ACTIVATION.resolver_subtitle(member.displayName)}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size='small' disabled={saving}>
            <i className='tabler-x' />
          </IconButton>
        </Stack>
        <Divider />

        <Box sx={{ flex: 1, overflow: 'auto', p: 4 }}>
          <Stack spacing={4}>
            <Box>
              <Typography variant='subtitle2' sx={{ mb: 1 }}>
                {GH_WORKFORCE_ACTIVATION.resolver_current_blockers}
              </Typography>
              <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap'>
                {(member.activationReadiness?.blockers ?? []).length > 0 ? (
                  member.activationReadiness!.blockers.map((blocker, index) => (
                    <CustomChip key={`${blocker.lane}-${blocker.code}-${index}`} round='true' size='small' color='error' variant='tonal' label={blocker.label} />
                  ))
                ) : (
                  <CustomChip round='true' size='small' color='success' variant='tonal' label={GH_WORKFORCE_ACTIVATION.resolver_no_blockers} />
                )}
              </Stack>
            </Box>

            <Box>
              <Typography variant='subtitle1' sx={{ fontWeight: 700, mb: 2 }}>
                {GH_WORKFORCE_ACTIVATION.resolver_labor_section}
              </Typography>
              {laborBlockers.length > 0 ? (
                <Alert severity='warning' sx={{ mb: 3 }}>
                  {laborBlockers.map(blocker => blocker.label).join(', ')}
                </Alert>
              ) : null}
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  size='small'
                  type='date'
                  label={GH_WORKFORCE_ACTIVATION.resolver_hire_date}
                  value={hireDate}
                  onChange={event => setHireDate(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  select
                  fullWidth
                  size='small'
                  label={GH_WORKFORCE_ACTIVATION.resolver_employment_type}
                  value={employmentType}
                  onChange={event => setEmploymentType(event.target.value as HrEmploymentType)}
                >
                  {employmentOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  fullWidth
                  size='small'
                  label={GH_WORKFORCE_ACTIVATION.resolver_contract_type}
                  value={contractType}
                  onChange={event => handleContractChange(event.target.value as ContractType)}
                >
                  {contractOptions.map(([value, meta]) => (
                    <MenuItem key={value} value={value}>
                      {meta.label}
                    </MenuItem>
                  ))}
                </TextField>
                {contractType === 'plazo_fijo' ? (
                  <TextField
                    fullWidth
                    size='small'
                    type='date'
                    label={GH_WORKFORCE_ACTIVATION.resolver_contract_end_date}
                    value={contractEndDate}
                    onChange={event => setContractEndDate(event.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                ) : null}
                {isDeel ? (
                  <TextField
                    fullWidth
                    size='small'
                    label={GH_WORKFORCE_ACTIVATION.resolver_deel_contract_id}
                    value={deelContractId}
                    onChange={event => setDeelContractId(event.target.value)}
                  />
                ) : null}
                <FormControlLabel
                  control={<Switch checked={dailyRequired} disabled={scheduleLocked} onChange={event => setDailyRequired(event.target.checked)} />}
                  label={GH_WORKFORCE_ACTIVATION.resolver_daily_required}
                />
                <TextField
                  fullWidth
                  size='small'
                  label={GH_WORKFORCE_ACTIVATION.resolver_reason}
                  placeholder={GH_WORKFORCE_ACTIVATION.resolver_reason_placeholder}
                  value={reason}
                  onChange={event => setReason(event.target.value)}
                />
                {error ? <Alert severity='error'>{error}</Alert> : null}
                <Button variant='contained' onClick={handleSaveLabor} disabled={saving} startIcon={<i className='tabler-device-floppy' />}>
                  {saving ? GH_WORKFORCE_ACTIVATION.resolver_saving : GH_WORKFORCE_ACTIVATION.resolver_save}
                </Button>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={2} sx={{ mb: 2 }}>
                <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
                  {GH_WORKFORCE_ACTIVATION.resolver_compensation_section}
                </Typography>
                <Button size='small' variant='tonal' startIcon={<i className='tabler-cash' />} onClick={onOpenCompensation}>
                  {GH_WORKFORCE_ACTIVATION.resolver_open_compensation}
                </Button>
              </Stack>
              <Typography variant='body2' color='text.secondary'>
                {member.activationReadiness?.member.compensationAmount
                  ? `${member.activationReadiness.member.compensationCurrency ?? ''} ${member.activationReadiness.member.compensationAmount}`
                  : 'Sin compensación vigente.'}
              </Typography>
            </Box>

            <Divider />

            <Box>
              <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={2}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
                    {GH_WORKFORCE_ACTIVATION.resolver_external_identity_section}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {member.activationReadiness?.member.notionUserId ?? 'Sin usuario Notion reconciliado.'}
                  </Typography>
                </Box>
                <Button size='small' variant='tonal' startIcon={<i className='tabler-brand-notion' />} onClick={onOpenExternalIdentity}>
                  {GH_WORKFORCE_ACTIVATION.resolver_external_identity_open}
                </Button>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant='subtitle1' sx={{ fontWeight: 700, mb: 1 }}>
                {GH_WORKFORCE_ACTIVATION.resolver_payment_section}
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                {GH_WORKFORCE_ACTIVATION.resolver_payment_hint}
              </Typography>
              <PaymentProfilesPanel
                constrainedBeneficiary={{
                  beneficiaryType: 'member',
                  beneficiaryId: member.memberId,
                  beneficiaryName: member.displayName
                }}
                allowCreate
                onActionComplete={async () => {
                  const response = await fetch(`${intakeApiBasePath}/${member.memberId}/activation-readiness`).catch(() => null)

                  if (response?.ok) {
                    await onSaved((await response.json()) as WorkforceActivationReadiness)
                  }
                }}
              />
            </Box>
          </Stack>
        </Box>
      </Stack>
    </Drawer>
  )
}

export default WorkforceIntakeRemediationDrawer
