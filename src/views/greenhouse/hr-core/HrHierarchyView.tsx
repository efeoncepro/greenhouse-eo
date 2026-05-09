'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import { toast } from 'sonner'

import { getMicrocopy } from '@/lib/copy'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomTextField from '@core/components/mui/TextField'

import EmptyState from '@components/greenhouse/EmptyState'
import { HorizontalWithSubtitle } from '@/components/card-statistics'
import type {
  HrHierarchyDelegationRecord,
  HrHierarchyHistoryRecord,
  HrHierarchyGovernanceProposal,
  HrHierarchyGovernanceResponse,
  HrHierarchyRecord,
  HrHierarchyResponse,
  HrMemberOption,
  HrMemberOptionsResponse
} from '@/types/hr-core'
import { getInitials } from '@/utils/getInitials'
import {
  formatDate as formatGreenhouseDate,
  formatDateTime as formatGreenhouseDateTime,
  formatNumber as formatGreenhouseNumber
} from '@/lib/format'

const GREENHOUSE_COPY = getMicrocopy()

type MemberChoice = {
  memberId: string
  displayName: string
  roleTitle: string | null
  active: boolean
}

type ChangeSupervisorForm = {
  memberId: string
  supervisorMemberId: string
  reason: string
  effectiveFrom: string
}

type ReassignDirectReportsForm = {
  currentSupervisorMemberId: string
  nextSupervisorMemberId: string
  reason: string
  effectiveFrom: string
}

type DelegationForm = {
  supervisorMemberId: string
  delegateMemberId: string
  effectiveFrom: string
  effectiveTo: string
}

type ApiError = { error?: string }

const todayIso = () => {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offset * 60_000)

  return local.toISOString().slice(0, 10)
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—'

  return formatGreenhouseDate(value, { dateStyle: 'medium' })
}

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '—'

  return formatGreenhouseDateTime(value, { dateStyle: 'medium', timeStyle: 'short' })
}

const formatCount = (value: number) => formatGreenhouseNumber(value, 'es-CL')

type GovernanceActionState =
  | { kind: 'run' }
  | { kind: 'resolve'; proposalId: string; resolution: 'approve' | 'reject' | 'dismiss' }
  | null

const GOVERNANCE_PROPOSAL_STATUS_LABELS: Record<HrHierarchyGovernanceProposal['status'], string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  dismissed: 'Descartada',
  auto_applied: 'Aplicada automáticamente'
}

const GOVERNANCE_PROPOSAL_STATUS_COLORS: Record<HrHierarchyGovernanceProposal['status'], 'warning' | 'success' | 'error' | 'secondary' | 'info'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  dismissed: 'secondary',
  auto_applied: 'info'
}

const GOVERNANCE_POLICY_ACTION_LABELS: Record<HrHierarchyGovernanceProposal['policyAction'], string> = {
  review_required: 'Revisión requerida',
  blocked_manual_precedence: 'Precedencia manual',
  auto_apply_allowed: 'Autoaplicación permitida',
  no_action: 'Sin acción'
}

const GOVERNANCE_POLICY_ACTION_COLORS: Record<HrHierarchyGovernanceProposal['policyAction'], 'warning' | 'error' | 'success' | 'default'> = {
  review_required: 'warning',
  blocked_manual_precedence: 'error',
  auto_apply_allowed: 'success',
  no_action: 'default'
}

const GOVERNANCE_SEVERITY_LABELS: Record<HrHierarchyGovernanceProposal['severity'], string> = {
  info: 'Informativa',
  warning: 'Advertencia',
  error: 'Crítica'
}

const GOVERNANCE_SEVERITY_COLORS: Record<HrHierarchyGovernanceProposal['severity'], 'info' | 'warning' | 'error'> = {
  info: 'info',
  warning: 'warning',
  error: 'error'
}

const GOVERNANCE_RUN_STATUS_LABELS: Record<string, string> = {
  running: 'En curso',
  succeeded: 'Exitosa',
  partial: 'Parcial',
  failed: 'Fallida'
}

const GOVERNANCE_RUN_STATUS_COLORS: Record<string, 'info' | 'success' | 'warning' | 'error' | 'secondary'> = {
  running: 'info',
  succeeded: 'success',
  partial: 'warning',
  failed: 'error'
}

const GOVERNANCE_SYNC_MODE_LABELS: Record<string, string> = {
  manual: 'Manual',
  poll: 'Programada',
  webhook: 'Webhook'
}

const buildMemberChoices = (items: HrHierarchyRecord[], options: HrMemberOption[]) => {
  const byId = new Map<string, MemberChoice>()

  for (const option of options) {
    byId.set(option.memberId, {
      memberId: option.memberId,
      displayName: option.displayName,
      roleTitle: option.roleTitle,
      active: true
    })
  }

  for (const item of items) {
    byId.set(item.memberId, {
      memberId: item.memberId,
      displayName: item.memberName,
      roleTitle: item.roleTitle,
      active: item.memberActive
    })
  }

  return Array.from(byId.values()).sort((a, b) => a.displayName.localeCompare(b.displayName))
}

const renderMemberOption = (option: MemberChoice) => (
  <Stack direction='row' spacing={1.5} alignItems='center' sx={{ width: '100%' }}>
    <CustomAvatar skin='light' color='info' size={30}>
      {getInitials(option.displayName)}
    </CustomAvatar>
    <Stack spacing={0} sx={{ minWidth: 0, flex: 1 }}>
      <Typography variant='body2' fontWeight={500} noWrap>
        {option.displayName}
      </Typography>
      <Typography variant='caption' color='text.secondary' noWrap>
        {option.roleTitle ?? 'Sin cargo visible'}
      </Typography>
    </Stack>
    {!option.active && <Chip label='Inactivo' size='small' variant='outlined' />}
  </Stack>
)

const MemberChoiceRow = ({ option }: { option: MemberChoice }) => renderMemberOption(option)

const SectionTitle = ({
  icon,
  title,
  subtitle,
  action,
  titleId
}: {
  icon: string
  title: string
  subtitle: string
  action?: ReactNode
  titleId?: string
}) => (
  <CardHeader
    title={title}
    titleTypographyProps={titleId ? { id: titleId } : undefined}
    subheader={subtitle}
    avatar={
      <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
        <i className={icon} style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
      </Avatar>
    }
    action={action}
  />
)

const EMPTY_MEMBER_FORM: ChangeSupervisorForm = {
  memberId: '',
  supervisorMemberId: '',
  reason: '',
  effectiveFrom: todayIso()
}

const EMPTY_REASSIGN_FORM: ReassignDirectReportsForm = {
  currentSupervisorMemberId: '',
  nextSupervisorMemberId: '',
  reason: '',
  effectiveFrom: todayIso()
}

const EMPTY_DELEGATION_FORM: DelegationForm = {
  supervisorMemberId: '',
  delegateMemberId: '',
  effectiveFrom: todayIso(),
  effectiveTo: ''
}

const HrHierarchyView = () => {
  const [hierarchy, setHierarchy] = useState<HrHierarchyResponse | null>(null)
  const [hierarchyLoading, setHierarchyLoading] = useState(true)
  const [hierarchyError, setHierarchyError] = useState<string | null>(null)

  const [memberOptions, setMemberOptions] = useState<HrMemberOption[]>([])
  const [memberOptionsLoading, setMemberOptionsLoading] = useState(false)

  const [search, setSearch] = useState('')
  const [supervisorFilterId, setSupervisorFilterId] = useState('')
  const [withoutSupervisor, setWithoutSupervisor] = useState(false)
  const [includeInactive, setIncludeInactive] = useState(false)

  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [historyRows, setHistoryRows] = useState<HrHierarchyHistoryRecord[]>([])
  const [delegationRows, setDelegationRows] = useState<HrHierarchyDelegationRecord[]>([])
  const [panelLoading, setPanelLoading] = useState(false)
  const [panelError, setPanelError] = useState<string | null>(null)
  const [governance, setGovernance] = useState<HrHierarchyGovernanceResponse | null>(null)
  const [governanceLoading, setGovernanceLoading] = useState(true)
  const [governanceError, setGovernanceError] = useState<string | null>(null)
  const [governanceAction, setGovernanceAction] = useState<GovernanceActionState>(null)

  const [changeDialogOpen, setChangeDialogOpen] = useState(false)
  const [changeForm, setChangeForm] = useState<ChangeSupervisorForm>(EMPTY_MEMBER_FORM)
  const [changeValidationAttempted, setChangeValidationAttempted] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkForm, setBulkForm] = useState<ReassignDirectReportsForm>(EMPTY_REASSIGN_FORM)
  const [bulkValidationAttempted, setBulkValidationAttempted] = useState(false)
  const [delegationDialogOpen, setDelegationDialogOpen] = useState(false)
  const [delegationForm, setDelegationForm] = useState<DelegationForm>(EMPTY_DELEGATION_FORM)
  const [savingAction, setSavingAction] = useState<'change' | 'bulk' | 'delegation' | 'revoke' | null>(null)

  const loadHierarchy = useCallback(async (signal?: AbortSignal) => {
    setHierarchyLoading(true)
    setHierarchyError(null)

    try {
      const params = new URLSearchParams()

      if (search.trim()) params.set('search', search.trim())
      if (supervisorFilterId) params.set('supervisorMemberId', supervisorFilterId)
      if (withoutSupervisor) params.set('withoutSupervisor', 'true')
      if (includeInactive) params.set('includeInactive', 'true')

      const res = await fetch(`/api/hr/core/hierarchy${params.toString() ? `?${params.toString()}` : ''}`, {
        signal
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as ApiError

        throw new Error(data.error || 'No pudimos cargar la jerarquía.')
      }

      const payload = (await res.json()) as HrHierarchyResponse

      setHierarchy(payload)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return

      setHierarchyError(error instanceof Error ? error.message : 'No pudimos cargar la jerarquía.')
    } finally {
      setHierarchyLoading(false)
    }
  }, [includeInactive, search, supervisorFilterId, withoutSupervisor])

  const loadMemberOptions = useCallback(async () => {
    setMemberOptionsLoading(true)

    try {
      const res = await fetch('/api/hr/core/members/options', { signal: AbortSignal.timeout(5000) })

      if (!res.ok) return

      const payload = (await res.json()) as HrMemberOptionsResponse

      setMemberOptions(payload.members ?? [])
    } catch {
      // leave the selector backed by hierarchy rows when the options endpoint is unavailable
    } finally {
      setMemberOptionsLoading(false)
    }
  }, [])

  const loadGovernance = useCallback(async (signal?: AbortSignal) => {
    setGovernanceLoading(true)
    setGovernanceError(null)

    try {
      const res = await fetch('/api/hr/core/hierarchy/governance?limit=20', { signal })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as ApiError

        throw new Error(data.error || 'No pudimos cargar la gobernanza de jerarquía.')
      }

      const payload = (await res.json()) as HrHierarchyGovernanceResponse

      setGovernance(payload)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return

      setGovernanceError(error instanceof Error ? error.message : 'No pudimos cargar la gobernanza de jerarquía.')
    } finally {
      setGovernanceLoading(false)
    }
  }, [])

  const loadPanelData = useCallback(async (memberId: string, signal?: AbortSignal) => {
    if (!memberId) {
      setHistoryRows([])
      setDelegationRows([])
      setPanelError(null)
      setPanelLoading(false)

      return
    }

    setPanelLoading(true)
    setPanelError(null)

    const [historyResult, delegationResult] = await Promise.allSettled([
      fetch(`/api/hr/core/hierarchy/history?memberId=${encodeURIComponent(memberId)}&limit=20`, { signal }),
      fetch(`/api/hr/core/hierarchy/delegations?supervisorMemberId=${encodeURIComponent(memberId)}&includeInactive=true`, {
        signal
      })
    ])

    if (historyResult.status === 'fulfilled') {
      const response = historyResult.value

      if (response.ok) {
        const payload = (await response.json()) as { history?: HrHierarchyHistoryRecord[] }

        setHistoryRows(payload.history ?? [])
      } else {
        const data = (await response.json().catch(() => ({}))) as ApiError

        setPanelError(data.error || 'No pudimos cargar el historial de auditoría.')
      }
    } else if (!(historyResult.reason instanceof DOMException && historyResult.reason.name === 'AbortError')) {
      setPanelError('No pudimos cargar el historial de auditoría.')
    }

    if (delegationResult.status === 'fulfilled') {
      const response = delegationResult.value

      if (response.ok) {
        const payload = (await response.json()) as { delegations?: HrHierarchyDelegationRecord[] }

        setDelegationRows(payload.delegations ?? [])
      } else {
        const data = (await response.json().catch(() => ({}))) as ApiError

        setPanelError(prev => prev || data.error || 'No pudimos cargar las delegaciones temporales.')
      }
    } else if (!(delegationResult.reason instanceof DOMException && delegationResult.reason.name === 'AbortError')) {
      setPanelError(prev => prev || 'No pudimos cargar las delegaciones temporales.')
    }

    setPanelLoading(false)
  }, [])

  useEffect(() => {
    void loadMemberOptions()
  }, [loadMemberOptions])

  useEffect(() => {
    const controller = new AbortController()

    void loadGovernance(controller.signal)

    return () => controller.abort()
  }, [loadGovernance])

  useEffect(() => {
    const controller = new AbortController()

    void loadHierarchy(controller.signal)

    return () => controller.abort()
  }, [loadHierarchy])

  useEffect(() => {
    if (!hierarchy?.items.length) {
      if (selectedMemberId) setSelectedMemberId('')

      return
    }

    setSelectedMemberId(current => {
      if (current && hierarchy.items.some(item => item.memberId === current)) {
        return current
      }

      return hierarchy.items[0]?.memberId ?? ''
    })
  }, [hierarchy?.items, selectedMemberId])

  useEffect(() => {
    if (!selectedMemberId) return

    const controller = new AbortController()

    void loadPanelData(selectedMemberId, controller.signal)

    return () => controller.abort()
  }, [loadPanelData, selectedMemberId])

  const memberChoices = useMemo(
    () => buildMemberChoices(hierarchy?.items ?? [], memberOptions),
    [hierarchy?.items, memberOptions]
  )

  const selectedMember = useMemo(
    () => memberChoices.find(member => member.memberId === selectedMemberId) ?? null,
    [memberChoices, selectedMemberId]
  )

  const selectedRow = useMemo(
    () => hierarchy?.items.find(item => item.memberId === selectedMemberId) ?? null,
    [hierarchy?.items, selectedMemberId]
  )

  const supervisorOptions = useMemo(
    () => memberChoices.filter(member => member.memberId !== changeForm.memberId),
    [changeForm.memberId, memberChoices]
  )

  const bulkSupervisorOptions = useMemo(
    () => memberChoices.filter(member => member.memberId !== bulkForm.currentSupervisorMemberId),
    [bulkForm.currentSupervisorMemberId, memberChoices]
  )

  const delegationSupervisorOptions = useMemo(
    () => memberChoices.filter(member => member.memberId !== delegationForm.delegateMemberId),
    [delegationForm.delegateMemberId, memberChoices]
  )

  const filterSupervisorValue = useMemo(
    () => memberChoices.find(member => member.memberId === supervisorFilterId) ?? null,
    [memberChoices, supervisorFilterId]
  )

  const changeMemberValue = useMemo(
    () => memberChoices.find(member => member.memberId === changeForm.memberId) ?? null,
    [changeForm.memberId, memberChoices]
  )

  const changeSupervisorValue = useMemo(
    () => supervisorOptions.find(member => member.memberId === changeForm.supervisorMemberId) ?? null,
    [changeForm.supervisorMemberId, supervisorOptions]
  )

  const bulkCurrentSupervisorValue = useMemo(
    () => memberChoices.find(member => member.memberId === bulkForm.currentSupervisorMemberId) ?? null,
    [bulkForm.currentSupervisorMemberId, memberChoices]
  )

  const bulkNextSupervisorValue = useMemo(
    () => bulkSupervisorOptions.find(member => member.memberId === bulkForm.nextSupervisorMemberId) ?? null,
    [bulkForm.nextSupervisorMemberId, bulkSupervisorOptions]
  )

  const delegationSupervisorValue = useMemo(
    () => delegationSupervisorOptions.find(member => member.memberId === delegationForm.supervisorMemberId) ?? null,
    [delegationForm.supervisorMemberId, delegationSupervisorOptions]
  )

  const delegationDelegateValue = useMemo(
    () => memberChoices.find(member => member.memberId === delegationForm.delegateMemberId) ?? null,
    [delegationForm.delegateMemberId, memberChoices]
  )

  const summary = hierarchy?.summary ?? {
    total: 0,
    active: 0,
    roots: 0,
    withoutSupervisor: 0,
    delegatedApprovals: 0
  }

  const currentDirectDelegations = delegationRows.filter(row => row.active)

  const openChangeDialog = useCallback(
    (row?: HrHierarchyRecord | null) => {
      const target = row ?? selectedRow

      if (!target) return

      setChangeValidationAttempted(false)
      setChangeForm({
        memberId: target.memberId,
        supervisorMemberId: target.supervisorMemberId ?? '',
        reason: '',
        effectiveFrom: todayIso()
      })
      setChangeDialogOpen(true)
    },
    [selectedRow]
  )

  const openBulkDialog = useCallback(
    (row?: HrHierarchyRecord | null) => {
      const target = row ?? selectedRow

      if (!target) return

      setBulkValidationAttempted(false)
      setBulkForm({
        currentSupervisorMemberId: target.memberId,
        nextSupervisorMemberId: '',
        reason: '',
        effectiveFrom: todayIso()
      })
      setBulkDialogOpen(true)
    },
    [selectedRow]
  )

  const openDelegationDialog = useCallback(
    (row?: HrHierarchyRecord | null) => {
      const target = row ?? selectedRow

      if (!target) return

      setDelegationForm({
        supervisorMemberId: target.memberId,
        delegateMemberId: '',
        effectiveFrom: todayIso(),
        effectiveTo: ''
      })
      setDelegationDialogOpen(true)
    },
    [selectedRow]
  )

  const submitChangeSupervisor = useCallback(async () => {
    if (!changeForm.memberId || !changeForm.reason.trim()) {
      setChangeValidationAttempted(true)

      return
    }

    setSavingAction('change')

    try {
      const res = await fetch('/api/hr/core/hierarchy/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: changeForm.memberId,
          supervisorMemberId: changeForm.supervisorMemberId || null,
          reason: changeForm.reason.trim(),
          effectiveFrom: changeForm.effectiveFrom || null
        })
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as ApiError

        throw new Error(data.error || 'No pudimos guardar el cambio de supervisor.')
      }

      toast.success('Supervisor actualizado.')
      setChangeDialogOpen(false)
      await Promise.all([loadHierarchy(), loadPanelData(selectedMemberId)])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No pudimos guardar el cambio de supervisor.')
    } finally {
      setSavingAction(null)
    }
  }, [changeForm, loadHierarchy, loadPanelData, selectedMemberId])

  const submitBulkReassign = useCallback(async () => {
    if (!bulkForm.currentSupervisorMemberId || !bulkForm.reason.trim()) {
      setBulkValidationAttempted(true)

      return
    }

    setSavingAction('bulk')

    try {
      const res = await fetch('/api/hr/core/hierarchy/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'direct_reports',
          currentSupervisorMemberId: bulkForm.currentSupervisorMemberId,
          supervisorMemberId: bulkForm.nextSupervisorMemberId || null,
          reason: bulkForm.reason.trim(),
          effectiveFrom: bulkForm.effectiveFrom || null
        })
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as ApiError

        throw new Error(data.error || 'No pudimos reasignar los reportes.')
      }

      toast.success('Reportes directos reasignados.')
      setBulkDialogOpen(false)
      await Promise.all([loadHierarchy(), loadPanelData(selectedMemberId)])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No pudimos reasignar los reportes.')
    } finally {
      setSavingAction(null)
    }
  }, [bulkForm, loadHierarchy, loadPanelData, selectedMemberId])

  const submitDelegation = useCallback(async () => {
    if (!delegationForm.supervisorMemberId || !delegationForm.delegateMemberId) return

    setSavingAction('delegation')

    try {
      const res = await fetch('/api/hr/core/hierarchy/delegations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supervisorMemberId: delegationForm.supervisorMemberId,
          delegateMemberId: delegationForm.delegateMemberId,
          effectiveFrom: delegationForm.effectiveFrom || null,
          effectiveTo: delegationForm.effectiveTo || null
        })
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as ApiError

        throw new Error(data.error || 'No pudimos crear la delegación.')
      }

      toast.success('Delegación temporal creada. La nueva delegación reemplaza la activa anterior.')
      setDelegationDialogOpen(false)
      await Promise.all([loadHierarchy(), loadPanelData(selectedMemberId)])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No pudimos crear la delegación.')
    } finally {
      setSavingAction(null)
    }
  }, [delegationForm, loadHierarchy, loadPanelData, selectedMemberId])

  const revokeDelegation = useCallback(
    async (responsibilityId: string) => {
      setSavingAction('revoke')

      try {
        const res = await fetch('/api/hr/core/hierarchy/delegations', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ responsibilityId })
        })

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as ApiError

          throw new Error(data.error || 'No pudimos revocar la delegación.')
        }

        toast.success('Delegación revocada.')
        await Promise.all([loadHierarchy(), loadPanelData(selectedMemberId)])
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No pudimos revocar la delegación.')
      } finally {
        setSavingAction(null)
      }
    },
    [loadHierarchy, loadPanelData, selectedMemberId]
  )

  const runGovernanceScan = useCallback(async () => {
    setGovernanceAction({ kind: 'run' })

    try {
      const res = await fetch('/api/hr/core/hierarchy/governance/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as ApiError

        throw new Error(data.error || 'No pudimos ejecutar la revisión de jerarquía.')
      }

      toast.success('Revisión de jerarquía ejecutada.')
      await Promise.all([
        loadGovernance(),
        loadHierarchy(),
        selectedMemberId ? loadPanelData(selectedMemberId) : Promise.resolve()
      ])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No pudimos ejecutar la revisión de jerarquía.')
    } finally {
      setGovernanceAction(null)
    }
  }, [loadGovernance, loadHierarchy, loadPanelData, selectedMemberId])

  const resolveGovernanceProposal = useCallback(
    async (proposalId: string, resolution: 'approve' | 'reject' | 'dismiss') => {
      setGovernanceAction({ kind: 'resolve', proposalId, resolution })

      try {
        const res = await fetch(`/api/hr/core/hierarchy/governance/proposals/${proposalId}/resolve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolution })
        })

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as ApiError

          throw new Error(data.error || 'No pudimos resolver la propuesta.')
        }

        const resolved = (await res.json()) as HrHierarchyGovernanceProposal

        toast.success(
          resolution === 'approve'
            ? 'Propuesta aprobada.'
            : resolution === 'reject'
              ? 'Propuesta rechazada.'
              : 'Propuesta descartada.'
        )

        setGovernance(prev =>
          prev
            ? {
                ...prev,
                proposals: prev.proposals.map(item => (item.proposalId === resolved.proposalId ? resolved : item))
              }
            : prev
        )

        await Promise.all([
          loadGovernance(),
          loadHierarchy(),
          selectedMemberId ? loadPanelData(selectedMemberId) : Promise.resolve()
        ])
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No pudimos resolver la propuesta.')
      } finally {
        setGovernanceAction(null)
      }
    },
    [loadGovernance, loadHierarchy, loadPanelData, selectedMemberId]
  )

  const activeHierarchyItems = useMemo(
    () => (includeInactive ? hierarchy?.items ?? [] : (hierarchy?.items ?? []).filter(item => item.memberActive)),
    [hierarchy?.items, includeInactive]
  )

  const governanceSummary = governance?.summary ?? {
    pending: 0,
    approved: 0,
    rejected: 0,
    dismissed: 0,
    autoApplied: 0
  }

  const governanceProposals = governance?.proposals ?? []

  const isGovernanceRunning = governanceAction?.kind === 'run'

  const isResolvingGovernanceProposal = useCallback(
    (proposalId: string, resolution: 'approve' | 'reject' | 'dismiss') =>
      governanceAction?.kind === 'resolve' &&
      governanceAction.proposalId === proposalId &&
      governanceAction.resolution === resolution,
    [governanceAction]
  )

  const canSubmitDelegation = Boolean(delegationForm.supervisorMemberId && delegationForm.delegateMemberId)

  const changeReasonError = changeValidationAttempted && !changeForm.reason.trim() ? 'La razón es obligatoria para guardar este cambio.' : ''

  const changeMemberError = changeValidationAttempted && !changeForm.memberId ? 'Selecciona a la persona cuya supervisión quieres cambiar.' : ''

  const bulkReasonError = bulkValidationAttempted && !bulkForm.reason.trim() ? 'La razón es obligatoria para reasignar los reportes.' : ''

  const bulkCurrentSupervisorError =
    bulkValidationAttempted && !bulkForm.currentSupervisorMemberId ? 'Selecciona al supervisor cuyos reportes directos vas a mover.' : ''

  if (hierarchyLoading && !hierarchy) {
    return (
      <Stack spacing={6}>
        <Skeleton variant='rounded' height={52} />
        <Grid container spacing={6}>
          {[0, 1, 2, 3].map(index => (
            <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={index}>
              <Skeleton variant='rounded' height={120} />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Skeleton variant='rounded' height={560} />
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Skeleton variant='rounded' height={560} />
          </Grid>
        </Grid>
      </Stack>
    )
  }

  return (
    <Stack spacing={6}>
      <Stack direction='row' justifyContent='space-between' alignItems='flex-start' spacing={3} flexWrap='wrap'>
        <Box>
          <Typography variant='h4'>Jerarquía HR</Typography>
          <Typography variant='body2' color='text.secondary'>
            Supervisión, reportes directos, subárbol y delegaciones temporales.
          </Typography>
        </Box>

        <Stack direction='row' spacing={1.5} flexWrap='wrap'>
          <Button
            variant='tonal'
            color='secondary'
            startIcon={<i className='tabler-refresh' />}
            onClick={() => {
              void loadHierarchy()
              if (selectedMemberId) void loadPanelData(selectedMemberId)
            }}
          >
            Actualizar
          </Button>
          <Button
            variant='contained'
            startIcon={<i className='tabler-user-scan' />}
            disabled={!selectedRow}
            onClick={() => openChangeDialog(selectedRow)}
          >
            Cambiar supervisor
          </Button>
        </Stack>
      </Stack>

      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <SectionTitle
          icon='tabler-shield-search'
          title='Gobernanza de jerarquía'
          subtitle='Política vigente, última revisión y propuestas de drift pendientes.'
          action={
            <Button
              variant='tonal'
              color='primary'
              size='small'
              startIcon={isGovernanceRunning ? <CircularProgress size={14} color='inherit' /> : <i className='tabler-refresh' />}
              onClick={() => void runGovernanceScan()}
              disabled={isGovernanceRunning || governanceLoading}
            >
              Ejecutar revisión
            </Button>
          }
        />
        <Divider />
        <CardContent>
          {governanceError && (
            <Alert
              severity='error'
              sx={{ mb: 3 }}
              action={
                <Button color='inherit' size='small' onClick={() => void loadGovernance()}>
                  Reintentar
                </Button>
              }
            >
              {governanceError}
            </Alert>
          )}

          {governanceLoading && !governance ? (
            <Stack spacing={3}>
              <Grid container spacing={3}>
                {[0, 1].map(index => (
                  <Grid size={{ xs: 12, lg: index === 0 ? 7 : 5 }} key={index}>
                    <Skeleton variant='rounded' height={index === 0 ? 224 : 224} />
                  </Grid>
                ))}
              </Grid>
              <Stack direction='row' spacing={1.5} flexWrap='wrap'>
                {[0, 1, 2, 3, 4].map(index => (
                  <Skeleton key={index} variant='rounded' width={148} height={32} />
                ))}
              </Stack>
              <Skeleton variant='rounded' height={320} />
            </Stack>
          ) : governance ? (
            <Stack spacing={3}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, lg: 7 }}>
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      border: theme => `1px solid ${theme.palette.divider}`,
                      bgcolor: 'background.paper',
                      height: '100%'
                    }}
                  >
                    <Stack spacing={2}>
                      <Stack direction='row' justifyContent='space-between' spacing={2} flexWrap='wrap' alignItems='flex-start'>
                        <Box>
                          <Typography variant='subtitle1' fontWeight={600}>
                            Política vigente
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            La línea manual de Greenhouse prevalece por defecto; lo externo entra como revisión auditable.
                          </Typography>
                        </Box>

                        <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                          <Chip label={`Canónica: ${governance.policy.canonicalSource}`} size='small' variant='tonal' color='primary' />
                          <Chip label={`Externa: ${governance.policy.externalSource}`} size='small' variant='tonal' color='secondary' />
                        </Stack>
                      </Stack>

                      <Stack spacing={1.25}>
                        {governance.policy.precedence.map((rule, index) => (
                          <Stack key={`${rule}-${index}`} direction='row' spacing={1} alignItems='flex-start'>
                            <i
                              className='tabler-point-filled'
                              style={{ color: 'var(--mui-palette-primary-main)', fontSize: 18, marginTop: 2 }}
                            />
                            <Typography variant='body2' color='text.primary'>
                              {rule}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Stack>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, lg: 5 }}>
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      border: theme => `1px solid ${theme.palette.divider}`,
                      bgcolor: 'background.paper',
                      height: '100%'
                    }}
                  >
                    <Stack spacing={2}>
                      <Stack direction='row' justifyContent='space-between' spacing={2} flexWrap='wrap' alignItems='flex-start'>
                        <Box>
                          <Typography variant='subtitle1' fontWeight={600}>
                            Último análisis
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            Última corrida de revisión sobre la jerarquía activa.
                          </Typography>
                        </Box>

                        <Chip
                          label={governance.lastRun ? GOVERNANCE_RUN_STATUS_LABELS[governance.lastRun.status] ?? governance.lastRun.status : 'Sin corridas'}
                          size='small'
                          variant='tonal'
                          color={governance.lastRun ? GOVERNANCE_RUN_STATUS_COLORS[governance.lastRun.status] ?? 'secondary' : 'secondary'}
                        />
                      </Stack>

                      {governance.lastRun ? (
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant='caption' color='text.secondary'>
                              Registros leídos
                            </Typography>
                            <Typography variant='body1' fontWeight={600}>
                              {formatCount(governance.lastRun.recordsRead)}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant='caption' color='text.secondary'>
                              Propuestas detectadas
                            </Typography>
                            <Typography variant='body1' fontWeight={600}>
                              {formatCount(governance.lastRun.proposalsDetected)}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant='caption' color='text.secondary'>
                              Modo
                            </Typography>
                            <Typography variant='body1' fontWeight={600}>
                              {GOVERNANCE_SYNC_MODE_LABELS[governance.lastRun.syncMode] ?? governance.lastRun.syncMode}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant='caption' color='text.secondary'>
                              Estado
                            </Typography>
                            <Typography variant='body1' fontWeight={600}>
                              {GOVERNANCE_RUN_STATUS_LABELS[governance.lastRun.status] ?? governance.lastRun.status}
                            </Typography>
                          </Grid>
                        </Grid>
                      ) : (
                        <EmptyState
                          icon='tabler-history-off'
                          title='Aún no hay corridas'
                          description='Ejecuta una revisión para detectar propuestas de gobernanza en la jerarquía.'
                          minHeight={180}
                        />
                      )}

                      {governance.lastRun && (
                        <Stack spacing={0.75}>
                          <Typography variant='caption' color='text.secondary'>
                            Inicio: {formatDateTime(governance.lastRun.startedAt)}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            Término: {formatDateTime(governance.lastRun.finishedAt)}
                          </Typography>
                          {governance.lastRun.notes && (
                            <Typography variant='caption' color='text.secondary'>
                              {governance.lastRun.notes}
                            </Typography>
                          )}
                        </Stack>
                      )}
                    </Stack>
                  </Box>
                </Grid>
              </Grid>

              <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                <Chip label={`Pendientes: ${formatCount(governanceSummary.pending)}`} size='small' color='warning' variant='tonal' />
                <Chip label={`Aprobadas: ${formatCount(governanceSummary.approved)}`} size='small' color='success' variant='tonal' />
                <Chip label={`Rechazadas: ${formatCount(governanceSummary.rejected)}`} size='small' color='error' variant='tonal' />
                <Chip label={`Descartadas: ${formatCount(governanceSummary.dismissed)}`} size='small' color='secondary' variant='tonal' />
                <Chip label={`Autoaplicadas: ${formatCount(governanceSummary.autoApplied)}`} size='small' color='info' variant='tonal' />
              </Stack>

              <Box
                sx={{
                  borderRadius: 2,
                  border: theme => `1px solid ${theme.palette.divider}`,
                  overflow: 'hidden',
                  bgcolor: 'background.paper'
                }}
              >
                <Box sx={{ p: 2.5, pb: 2 }}>
                  <Stack direction='row' justifyContent='space-between' spacing={2} flexWrap='wrap' alignItems='flex-start'>
                    <Box>
                      <Typography variant='subtitle1' fontWeight={600}>
                        Propuestas de gobernanza
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {governanceProposals.length
                          ? `${formatCount(governanceProposals.length)} propuestas visibles en esta revisión.`
                          : 'No hay propuestas pendientes para revisar.'}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
                <Divider />

                {governanceLoading && governance ? (
                  <Box sx={{ p: 2.5 }}>
                    <Stack spacing={1.5}>
                      {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} variant='rounded' height={64} />
                      ))}
                    </Stack>
                  </Box>
                ) : governanceProposals.length > 0 ? (
                  <TableContainer>
                    <Table size='small' stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Miembro</TableCell>
                          <TableCell>Cambio propuesto</TableCell>
                          <TableCell>Estado</TableCell>
                          <TableCell>Gobernanza</TableCell>
                          <TableCell>Detección</TableCell>
                          <TableCell align='right'>Acciones</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {governanceProposals.map(proposal => {
                          const pending = proposal.status === 'pending'
                          const resolutionLabel = proposal.resolutionNote ? proposal.resolutionNote : 'Sin nota de resolución.'

                          return (
                            <TableRow
                              key={proposal.proposalId}
                              hover
                              sx={{
                                '& td': {
                                  borderBottomColor: 'divider'
                                }
                              }}
                            >
                              <TableCell>
                                <Stack spacing={0.75}>
                                  <Stack spacing={0.25}>
                                    <Typography variant='body2' fontWeight={600} noWrap>
                                      {proposal.memberName}
                                    </Typography>
                                    <Typography variant='caption' color='text.secondary' noWrap>
                                      Origen: {proposal.sourceSystem}
                                    </Typography>
                                  </Stack>

                                  <Stack direction='row' spacing={0.75} flexWrap='wrap' useFlexGap>
                                    <Chip
                                      label={proposal.sourceMemberName ?? proposal.sourceMemberEmail ?? 'Fuente no identificada'}
                                      size='small'
                                      variant='tonal'
                                      color='info'
                                    />
                                    <Chip
                                      label={proposal.sourceSyncRunId ? `Corrida ${proposal.sourceSyncRunId.slice(0, 8)}` : 'Sin corrida'}
                                      size='small'
                                      variant='tonal'
                                      color='secondary'
                                    />
                                  </Stack>
                                </Stack>
                              </TableCell>

                              <TableCell>
                                <Stack spacing={0.5}>
                                  <Typography variant='body2' fontWeight={500} noWrap>
                                    Actual: {proposal.currentSupervisorName ?? 'Sin supervisor'}
                                  </Typography>
                                  <Typography variant='body2' color='text.secondary' noWrap>
                                    Propuesto: {proposal.proposedSupervisorName ?? 'Sin supervisor'}
                                  </Typography>
                                  <Typography variant='caption' color='text.secondary' noWrap>
                                    {proposal.sourceSupervisorName ? `Fuente: ${proposal.sourceSupervisorName}` : 'Sin supervisor externo resuelto'}
                                  </Typography>
                                </Stack>
                              </TableCell>

                              <TableCell>
                                <Stack spacing={0.75} alignItems='flex-start'>
                                  <Chip
                                    label={GOVERNANCE_PROPOSAL_STATUS_LABELS[proposal.status] ?? proposal.status}
                                    size='small'
                                    color={GOVERNANCE_PROPOSAL_STATUS_COLORS[proposal.status] ?? 'secondary'}
                                    variant='tonal'
                                  />
                                  <Typography variant='caption' color='text.secondary'>
                                    Veces detectada: {formatCount(proposal.occurrenceCount)}
                                  </Typography>
                                </Stack>
                              </TableCell>

                              <TableCell>
                                <Stack spacing={0.75} alignItems='flex-start'>
                                  <Chip
                                    label={GOVERNANCE_POLICY_ACTION_LABELS[proposal.policyAction] ?? proposal.policyAction}
                                    size='small'
                                    color={GOVERNANCE_POLICY_ACTION_COLORS[proposal.policyAction] ?? 'default'}
                                    variant='tonal'
                                  />
                                  <Chip
                                    label={GOVERNANCE_SEVERITY_LABELS[proposal.severity] ?? proposal.severity}
                                    size='small'
                                    color={GOVERNANCE_SEVERITY_COLORS[proposal.severity] ?? 'info'}
                                    variant='tonal'
                                  />
                                </Stack>
                              </TableCell>

                              <TableCell>
                                <Stack spacing={0.5}>
                                  <Typography variant='body2' noWrap>
                                    Primera detección: {formatDateTime(proposal.firstDetectedAt)}
                                  </Typography>
                                  <Typography variant='body2' color='text.secondary' noWrap>
                                    Última detección: {formatDateTime(proposal.lastDetectedAt)}
                                  </Typography>
                                  {proposal.resolvedAt && (
                                    <Typography variant='caption' color='text.secondary' noWrap>
                                      Resuelta: {formatDateTime(proposal.resolvedAt)}
                                    </Typography>
                                  )}
                                  {!pending && (
                                    <Typography variant='caption' color='text.secondary'>
                                      {resolutionLabel}
                                    </Typography>
                                  )}
                                </Stack>
                              </TableCell>

                              <TableCell align='right'>
                                {pending ? (
                                  <Stack direction='row' spacing={0.75} justifyContent='flex-end' flexWrap='wrap' useFlexGap>
                                    <Button
                                      size='small'
                                      variant='tonal'
                                      color='success'
                                      startIcon={
                                        isResolvingGovernanceProposal(proposal.proposalId, 'approve') ? (
                                          <CircularProgress size={14} color='inherit' />
                                        ) : (
                                          <i className='tabler-check' />
                                        )
                                      }
                                      disabled={Boolean(governanceAction)}
                                      onClick={() => void resolveGovernanceProposal(proposal.proposalId, 'approve')}
                                    >
                                      Aprobar
                                    </Button>
                                    <Button
                                      size='small'
                                      variant='tonal'
                                      color='error'
                                      startIcon={
                                        isResolvingGovernanceProposal(proposal.proposalId, 'reject') ? (
                                          <CircularProgress size={14} color='inherit' />
                                        ) : (
                                          <i className='tabler-x' />
                                        )
                                      }
                                      disabled={Boolean(governanceAction)}
                                      onClick={() => void resolveGovernanceProposal(proposal.proposalId, 'reject')}
                                    >
                                      Rechazar
                                    </Button>
                                    <Button
                                      size='small'
                                      variant='text'
                                      color='secondary'
                                      startIcon={
                                        isResolvingGovernanceProposal(proposal.proposalId, 'dismiss') ? (
                                          <CircularProgress size={14} color='inherit' />
                                        ) : (
                                          <i className='tabler-eye-off' />
                                        )
                                      }
                                      disabled={Boolean(governanceAction)}
                                      onClick={() => void resolveGovernanceProposal(proposal.proposalId, 'dismiss')}
                                    >
                                      Descartar
                                    </Button>
                                  </Stack>
                                ) : (
                                  <Stack spacing={0.5} alignItems='flex-end'>
                                    <Chip
                                      label={GOVERNANCE_PROPOSAL_STATUS_LABELS[proposal.status] ?? proposal.status}
                                      size='small'
                                      color={GOVERNANCE_PROPOSAL_STATUS_COLORS[proposal.status] ?? 'secondary'}
                                      variant='tonal'
                                    />
                                    <Typography variant='caption' color='text.secondary' align='right'>
                                      {resolutionLabel}
                                    </Typography>
                                  </Stack>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box sx={{ p: 2.5 }}>
                    <EmptyState
                      icon='tabler-shield-check'
                      title='Sin propuestas pendientes'
                      description='Ejecuta una revisión para encontrar diferencias entre la fuente externa y la jerarquía vigente.'
                      minHeight={220}
                      action={
                        <Button variant='outlined' size='small' onClick={() => void runGovernanceScan()} disabled={isGovernanceRunning}>
                          Ejecutar revisión
                        </Button>
                      }
                    />
                  </Box>
                )}
              </Box>
            </Stack>
          ) : null}
        </CardContent>
      </Card>

      {hierarchyError && (
        <Alert severity='error' action={<Button color='inherit' size='small' onClick={() => void loadHierarchy()}>Reintentar</Button>}>
          {hierarchyError}
        </Alert>
      )}

      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <HorizontalWithSubtitle
            title='Miembros'
            stats={formatCount(summary.total)}
            avatarIcon='tabler-sitemap'
            avatarColor='primary'
            subtitle='Nodos visibles en la jerarquía'
            statusLabel={`${formatCount(summary.active)} activos`}
            statusColor='success'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <HorizontalWithSubtitle
            title='Raíces'
            stats={formatCount(summary.roots)}
            avatarIcon='tabler-tree'
            avatarColor='info'
            subtitle='Personas sin supervisor'
            statusLabel={`${formatCount(summary.withoutSupervisor)} sin supervisor`}
            statusColor='warning'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <HorizontalWithSubtitle
            title='Subárbol seleccionado'
            stats={selectedRow ? formatCount(selectedRow.subtreeSize) : '—'}
            avatarIcon='tabler-branch'
            avatarColor='secondary'
            subtitle='Descendientes bajo la persona elegida'
            statusLabel={selectedRow ? `${formatCount(selectedRow.directReportsCount)} directos` : 'Sin selección'}
            statusColor='info'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <HorizontalWithSubtitle
            title='Delegaciones'
            stats={formatCount(summary.delegatedApprovals)}
            avatarIcon='tabler-shield-check'
            avatarColor='success'
            subtitle='Aprobaciones delegadas activas'
            statusLabel={`${formatCount(currentDirectDelegations.length)} vigentes`}
            statusColor='primary'
          />
        </Grid>
      </Grid>

      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <SectionTitle
          icon='tabler-filter'
          title='Filtros'
          subtitle='Busca una persona, limita por supervisor o enfoca raíces e inactivos.'
        />
        <Divider />
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 5 }}>
              <CustomTextField
                fullWidth
                size='small'
                label='Búsqueda'
                placeholder='Buscar por nombre, cargo o departamento'
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <Autocomplete
                disablePortal
                options={memberChoices}
                value={filterSupervisorValue}
                loading={memberOptionsLoading}
                onChange={(_, value) => setSupervisorFilterId(value?.memberId ?? '')}
                getOptionLabel={option => option.displayName}
                isOptionEqualToValue={(option, value) => option.memberId === value.memberId}
                renderOption={(props, option) => (
                  <Box component='li' {...props} key={option.memberId}>
                    <MemberChoiceRow option={option} />
                  </Box>
                )}
                renderInput={params => (
                  <CustomTextField
                    {...params}
                    label='Supervisor'
                    placeholder='Filtrar por supervisor'
                    size='small'
                    helperText='Muestra las personas que dependen de quien elijas.'
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {memberOptionsLoading ? <CircularProgress color='inherit' size={18} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      )
                    }}
                  />
                )}
                disabled={withoutSupervisor}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={withoutSupervisor}
                    onChange={(_, checked) => {
                      setWithoutSupervisor(checked)
                      if (checked) setSupervisorFilterId('')
                    }}
                  />
                }
                label='Sin supervisor'
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={includeInactive}
                    onChange={(_, checked) => setIncludeInactive(checked)}
                  />
                }
                label='Incluir inactivos'
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={6} alignItems='flex-start'>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
            <SectionTitle
              icon='tabler-network'
              title='Jerarquía'
              subtitle={hierarchy?.items.length ? `${hierarchy.items.length} miembros encontrados` : 'Sin resultados para los filtros actuales'}
            />
            <Divider />
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              {!hierarchyError && activeHierarchyItems.length === 0 && !hierarchyLoading && (
                <Box sx={{ p: 3 }}>
                  <EmptyState
                    icon='tabler-network-off'
                    title='No hay coincidencias'
                    description='Ajusta los filtros para ver miembros, supervisores y subárboles relacionados.'
                    minHeight={240}
                  />
                </Box>
              )}

              {(hierarchyLoading || activeHierarchyItems.length > 0) && (
                <TableContainer sx={{ maxHeight: 760 }}>
                  <Table size='small' stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Miembro</TableCell>
                        <TableCell>Supervisor</TableCell>
                        <TableCell align='center'>Directos</TableCell>
                        <TableCell align='center'>Subárbol</TableCell>
                        <TableCell>Delegación</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell align='right'>Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {hierarchyLoading && !hierarchy?.items.length
                        ? Array.from({ length: 4 }).map((_, index) => (
                            <TableRow key={index}>
                              <TableCell colSpan={7}>
                                <Skeleton variant='rounded' height={42} />
                              </TableCell>
                            </TableRow>
                          ))
                        : activeHierarchyItems.map(row => {
                            const rowSelected = row.memberId === selectedMemberId

                            return (
                              <TableRow
                                key={row.reportingLineId}
                                hover
                                selected={rowSelected}
                                sx={{
                                  '& td': {
                                    borderBottomColor: 'divider'
                                  }
                                }}
                              >
                                <TableCell>
                                  <Stack spacing={0.5}>
                                    <Stack direction='row' spacing={1.5} alignItems='center'>
                                      <CustomAvatar
                                        src={row.memberAvatarUrl || undefined}
                                        skin={row.memberAvatarUrl ? undefined : 'light'}
                                        color='info'
                                        size={34}
                                      >
                                        {!row.memberAvatarUrl ? getInitials(row.memberName) : null}
                                      </CustomAvatar>
                                      <Stack spacing={0}>
                                        <Typography variant='body2' fontWeight={600} noWrap>
                                          {row.memberName}
                                        </Typography>
                                        <Typography variant='caption' color='text.secondary' noWrap>
                                          {row.roleTitle ?? 'Sin cargo visible'}
                                        </Typography>
                                      </Stack>
                                    </Stack>
                                    <Typography variant='caption' color='text.secondary' noWrap>
                                      {row.departmentName ?? 'Sin departamento'} · Nivel {row.depth}
                                    </Typography>
                                  </Stack>
                                </TableCell>

                                <TableCell>
                                  <Stack spacing={0.25}>
                                    <Typography variant='body2' fontWeight={500} noWrap>
                                      {row.supervisorName ?? 'Sin supervisor'}
                                    </Typography>
                                    <Typography variant='caption' color='text.secondary' noWrap>
                                      {row.supervisorActive === false ? 'Supervisor inactivo' : row.isRoot ? 'Raíz' : 'Vigente'}
                                    </Typography>
                                  </Stack>
                                </TableCell>

                                <TableCell align='center'>
                                  <Stack spacing={0.25} alignItems='center'>
                                    <Typography variant='body2' fontWeight={600}>
                                      {formatCount(row.directReportsCount)}
                                    </Typography>
                                    <Typography variant='caption' color='text.secondary'>
                                      directos
                                    </Typography>
                                  </Stack>
                                </TableCell>

                                <TableCell align='center'>
                                  <Stack spacing={0.25} alignItems='center'>
                                    <Typography variant='body2' fontWeight={600}>
                                      {formatCount(row.subtreeSize)}
                                    </Typography>
                                    <Typography variant='caption' color='text.secondary'>
                                      descendientes
                                    </Typography>
                                  </Stack>
                                </TableCell>

                                <TableCell>
                                  {row.delegation ? (
                                    <Stack spacing={0.25}>
                                      <Chip
                                        label={row.delegation.delegateMemberName ?? row.delegation.delegateMemberId}
                                        size='small'
                                        color='success'
                                        variant='tonal'
                                      />
                                      <Typography variant='caption' color='text.secondary'>
                                        Desde {formatDate(row.delegation.effectiveFrom)}
                                        {row.delegation.effectiveTo ? ` · hasta ${formatDate(row.delegation.effectiveTo)}` : ''}
                                      </Typography>
                                    </Stack>
                                  ) : (
                                    <Typography variant='body2' color='text.secondary'>
                                      Sin delegación temporal
                                    </Typography>
                                  )}
                                </TableCell>

                                <TableCell>
                                  <Stack spacing={0.75} alignItems='flex-start'>
                                    <Chip
                                      label={row.memberActive ? 'Activo' : 'Inactivo'}
                                      size='small'
                                      color={row.memberActive ? 'success' : 'secondary'}
                                      variant='tonal'
                                    />
                                    {row.isRoot && <Chip label='Raíz' size='small' color='info' variant='tonal' />}
                                  </Stack>
                                </TableCell>

                                <TableCell align='right'>
                                  <Stack direction='row' spacing={0.75} justifyContent='flex-end' flexWrap='wrap' useFlexGap>
                                    <Button
                                      size='small'
                                      variant='text'
                                      onClick={() => openChangeDialog(row)}
                                      startIcon={<i className='tabler-user-scan' />}
                                    >
                                      Cambiar
                                    </Button>
                                    <Button
                                      size='small'
                                      variant='text'
                                      onClick={() => openBulkDialog(row)}
                                      startIcon={<i className='tabler-users-group' />}
                                    >
                                      Reasignar
                                    </Button>
                                    <Button
                                      size='small'
                                      variant='text'
                                      onClick={() => setSelectedMemberId(row.memberId)}
                                      startIcon={<i className='tabler-list-search' />}
                                    >
                                      Auditar
                                    </Button>
                                  </Stack>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={6}>
            <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
              <SectionTitle
                icon='tabler-clipboard-text'
                title='Panel auditado'
                subtitle='Revisa la trazabilidad y actúa sobre la persona seleccionada.'
                action={
                  <Button
                    variant='tonal'
                    size='small'
                    startIcon={<i className='tabler-user-scan' />}
                    disabled={!selectedRow}
                    onClick={() => openChangeDialog(selectedRow)}
                  >
                    Cambiar supervisor
                  </Button>
                }
              />
              <Divider />
              <CardContent>
                <Stack spacing={3}>
                  <Autocomplete
                    disablePortal
                    options={memberChoices}
                    value={selectedMember}
                    loading={memberOptionsLoading}
                    onChange={(_, value) => setSelectedMemberId(value?.memberId ?? '')}
                    getOptionLabel={option => option.displayName}
                    isOptionEqualToValue={(option, value) => option.memberId === value.memberId}
                    renderOption={(props, option) => (
                      <Box component='li' {...props} key={option.memberId}>
                        <MemberChoiceRow option={option} />
                      </Box>
                    )}
                    renderInput={params => (
                      <CustomTextField
                        {...params}
                        label='Miembro auditado'
                        placeholder='Buscar persona'
                        size='small'
                        helperText='El historial y las delegaciones se enfocan en esta persona.'
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {memberOptionsLoading ? <CircularProgress color='inherit' size={18} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          )
                        }}
                      />
                    )}
                  />

                  {selectedRow ? (
                    <Box
                      sx={{
                        p: 2.5,
                        borderRadius: 2,
                        border: theme => `1px solid ${theme.palette.divider}`,
                        bgcolor: 'background.paper'
                      }}
                    >
                      <Stack spacing={1.5}>
                        <Stack direction='row' spacing={1.5} alignItems='center'>
                          <CustomAvatar
                            src={selectedRow.memberAvatarUrl || undefined}
                            skin={selectedRow.memberAvatarUrl ? undefined : 'light'}
                            color='info'
                            size={42}
                          >
                            {!selectedRow.memberAvatarUrl ? getInitials(selectedRow.memberName) : null}
                          </CustomAvatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant='subtitle1' fontWeight={600} noWrap>
                              {selectedRow.memberName}
                            </Typography>
                            <Typography variant='body2' color='text.secondary' noWrap>
                              {selectedRow.roleTitle ?? 'Sin cargo visible'}
                            </Typography>
                          </Box>
                        </Stack>

                        <Stack direction='row' spacing={1} flexWrap='wrap'>
                          <Chip
                            label={selectedRow.memberActive ? 'Activo' : 'Inactivo'}
                            size='small'
                            color={selectedRow.memberActive ? 'success' : 'secondary'}
                            variant='tonal'
                          />
                          <Chip
                            label={selectedRow.supervisorName ?? 'Sin supervisor'}
                            size='small'
                            color='info'
                            variant='tonal'
                          />
                          {selectedRow.delegation && (
                            <Chip
                              label={`Delega en ${selectedRow.delegation.delegateMemberName ?? selectedRow.delegation.delegateMemberId}`}
                              size='small'
                              color='success'
                              variant='tonal'
                            />
                          )}
                        </Stack>

                        <Grid container spacing={2}>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant='caption' color='text.secondary'>
                              Directos
                            </Typography>
                            <Typography variant='body1' fontWeight={600}>
                              {formatCount(selectedRow.directReportsCount)}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant='caption' color='text.secondary'>
                              Subárbol
                            </Typography>
                            <Typography variant='body1' fontWeight={600}>
                              {formatCount(selectedRow.subtreeSize)}
                            </Typography>
                          </Grid>
                        </Grid>

                        <Stack direction='row' spacing={1} flexWrap='wrap'>
                          <Button variant='tonal' size='small' onClick={() => openChangeDialog(selectedRow)}>
                            Cambiar supervisor
                          </Button>
                          <Button variant='tonal' size='small' onClick={() => openBulkDialog(selectedRow)}>
                            Reasignar reportes
                          </Button>
                          <Button variant='tonal' size='small' onClick={() => openDelegationDialog(selectedRow)}>
                            Nueva delegación
                          </Button>
                        </Stack>
                      </Stack>
                    </Box>
                  ) : (
                    <EmptyState
                      icon='tabler-user-question'
                      title='Selecciona un miembro'
                      description='El panel mostrará su auditoría, sus delegaciones temporales y las acciones de edición.'
                      minHeight={220}
                    />
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
              <SectionTitle
                icon='tabler-history'
                title='Historial auditado'
                subtitle='Cambios de supervisor y trazabilidad de cada línea.'
                action={
                  <Button
                    variant='tonal'
                    size='small'
                    startIcon={<i className='tabler-refresh' />}
                    onClick={() => {
                      if (selectedMemberId) void loadPanelData(selectedMemberId)
                    }}
                  >
                    Refrescar
                  </Button>
                }
              />
              <Divider />
              <CardContent>
                {panelError && (
                  <Alert severity='warning' sx={{ mb: 2 }}>
                    {panelError}
                  </Alert>
                )}

                {panelLoading && !historyRows.length ? (
                  <Stack spacing={1.5}>
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} variant='rounded' height={76} />
                    ))}
                  </Stack>
                ) : historyRows.length > 0 ? (
                  <Stack spacing={1.5}>
                    {historyRows.map(row => (
                      <Box
                        key={row.reportingLineId + row.createdAt}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          border: theme => `1px solid ${theme.palette.divider}`
                        }}
                      >
                        <Stack spacing={1}>
                          <Stack direction='row' justifyContent='space-between' spacing={2}>
                            <Typography variant='body2' fontWeight={600} noWrap>
                              {row.memberName}
                            </Typography>
                            <Typography variant='caption' color='text.secondary' noWrap>
                              {formatDateTime(row.createdAt)}
                            </Typography>
                          </Stack>
                          <Typography variant='body2' color='text.secondary'>
                            {row.previousSupervisorName ?? 'Sin supervisor'} → {row.supervisorName ?? 'Sin supervisor'}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {row.changeReason} · {row.changedByName ?? 'Sistema'}
                          </Typography>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <EmptyState
                    icon='tabler-history-off'
                    title='Sin cambios registrados'
                    description='La auditoría aparecerá aquí cuando esta persona cambie de supervisor o reciba una reasignación.'
                    minHeight={220}
                  />
                )}
              </CardContent>
            </Card>

            <Card
              elevation={0}
              role='region'
              aria-labelledby='hr-hierarchy-delegations-title'
              sx={{ border: theme => `1px solid ${theme.palette.divider}` }}
            >
              <SectionTitle
                icon='tabler-shield-check'
                titleId='hr-hierarchy-delegations-title'
                title='Delegaciones temporales'
                subtitle='Historial completo de delegaciones. Solo una delegación primaria puede quedar activa por supervisor.'
                action={
                  <Button
                    variant='tonal'
                    size='small'
                    startIcon={<i className='tabler-plus' />}
                    disabled={!selectedRow}
                    onClick={() => openDelegationDialog(selectedRow)}
                  >
                    Nueva delegación
                  </Button>
                }
              />
              <Divider />
              <CardContent>
                {panelLoading && !delegationRows.length ? (
                  <Stack spacing={1.5}>
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} variant='rounded' height={72} />
                    ))}
                  </Stack>
                ) : delegationRows.length > 0 ? (
                  <Stack spacing={1.5}>
                    {delegationRows.map(row => (
                      <Box
                        key={row.responsibilityId}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          border: theme => `1px solid ${theme.palette.divider}`
                        }}
                      >
                        <Stack spacing={1}>
                          <Stack direction='row' justifyContent='space-between' spacing={2} alignItems='flex-start'>
                            <Box>
                              <Typography variant='body2' fontWeight={600}>
                                {row.delegateMemberName ?? row.delegateMemberId}
                              </Typography>
                              <Typography variant='caption' color='text.secondary'>
                                Desde {formatDate(row.effectiveFrom)}
                                {row.effectiveTo ? ` · hasta ${formatDate(row.effectiveTo)}` : ''}
                              </Typography>
                            </Box>
                            <Chip
                              label={row.active ? 'Activa' : 'Expirada'}
                              size='small'
                              color={row.active ? 'success' : 'secondary'}
                              variant='tonal'
                            />
                          </Stack>
                          <Typography variant='caption' color='text.secondary'>
                            {row.isPrimary ? 'Delegación primaria' : 'Delegación secundaria'}
                          </Typography>
                          {row.active && (
                            <Button
                              variant='text'
                              color='error'
                              size='small'
                              startIcon={
                                savingAction === 'revoke' ? <CircularProgress size={14} color='inherit' /> : <i className='tabler-trash' />
                              }
                              onClick={() => void revokeDelegation(row.responsibilityId)}
                              disabled={savingAction === 'revoke'}
                              sx={{ alignSelf: 'flex-start' }}
                            >
                              Revocar
                            </Button>
                          )}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <EmptyState
                    icon='tabler-shield-off'
                    title='Sin delegaciones'
                    description='Crea una delegación temporal para que otra persona apruebe en nombre del supervisor.'
                    minHeight={220}
                    action={
                      <Button variant='outlined' size='small' onClick={() => openDelegationDialog(selectedRow)} disabled={!selectedRow}>
                        Crear delegación
                      </Button>
                    }
                  />
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      <Dialog open={changeDialogOpen} onClose={() => setChangeDialogOpen(false)} maxWidth='sm' fullWidth closeAfterTransition={false}>
        <DialogTitle>Cambiar supervisor</DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {changeValidationAttempted && (!changeForm.memberId || !changeForm.reason.trim()) && (
              <Alert severity='error' variant='outlined'>
                Revisa los campos obligatorios antes de guardar el cambio.
              </Alert>
            )}

            <Autocomplete
              disablePortal
              options={memberChoices}
              value={changeMemberValue}
              onChange={(_, value) => {
                setChangeForm(prev => ({
                  ...prev,
                  memberId: value?.memberId ?? '',
                  supervisorMemberId: value?.memberId === prev.supervisorMemberId ? '' : prev.supervisorMemberId
                }))
              }}
              getOptionLabel={option => option.displayName}
              isOptionEqualToValue={(option, value) => option.memberId === value.memberId}
              renderOption={(props, option) => (
                <Box component='li' {...props} key={option.memberId}>
                  <MemberChoiceRow option={option} />
                </Box>
              )}
              renderInput={params => (
                <CustomTextField
                  {...params}
                  label='Miembro'
                  placeholder='Buscar persona'
                  size='small'
                  error={Boolean(changeMemberError)}
                  helperText={changeMemberError || 'La persona cuya línea de reporte vas a cambiar.'}
                />
              )}
            />

            <Autocomplete
              disablePortal
              options={supervisorOptions}
              value={changeSupervisorValue}
              onChange={(_, value) => setChangeForm(prev => ({ ...prev, supervisorMemberId: value?.memberId ?? '' }))}
              getOptionLabel={option => option.displayName}
              isOptionEqualToValue={(option, value) => option.memberId === value.memberId}
              renderOption={(props, option) => (
                <Box component='li' {...props} key={option.memberId}>
                  <MemberChoiceRow option={option} />
                </Box>
              )}
              renderInput={params => (
                <CustomTextField
                  {...params}
                  label='Nuevo supervisor'
                  placeholder='Sin supervisor'
                  size='small'
                  helperText='Deja el campo vacío para dejar la persona sin supervisor directo.'
                />
              )}
            />

            <CustomTextField
              fullWidth
              size='small'
              label='Razón'
              multiline
              minRows={3}
              value={changeForm.reason}
              onChange={event => setChangeForm(prev => ({ ...prev, reason: event.target.value }))}
              error={Boolean(changeReasonError)}
              helperText={changeReasonError || 'Obligatoria para auditoría.'}
            />

            <CustomTextField
              fullWidth
              size='small'
              label='Vigente desde'
              type='date'
              value={changeForm.effectiveFrom}
              onChange={event => setChangeForm(prev => ({ ...prev, effectiveFrom: event.target.value }))}
              InputLabelProps={{ shrink: true }}
              helperText='Si no cambias la fecha, usamos el día actual.'
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant='text' color='secondary' onClick={() => setChangeDialogOpen(false)}>{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button variant='contained' onClick={() => void submitChangeSupervisor()} disabled={savingAction === 'change'}>
            {savingAction === 'change' ? <CircularProgress size={18} color='inherit' /> : 'Guardar cambio'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)} maxWidth='sm' fullWidth closeAfterTransition={false}>
        <DialogTitle>Reasignar reportes directos</DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {bulkValidationAttempted && (!bulkForm.currentSupervisorMemberId || !bulkForm.reason.trim()) && (
              <Alert severity='error' variant='outlined'>
                Revisa los campos obligatorios antes de reasignar los reportes.
              </Alert>
            )}

            <Autocomplete
              disablePortal
              options={memberChoices}
              value={bulkCurrentSupervisorValue}
              onChange={(_, value) =>
                setBulkForm(prev => ({
                  ...prev,
                  currentSupervisorMemberId: value?.memberId ?? '',
                  nextSupervisorMemberId: value?.memberId === prev.nextSupervisorMemberId ? '' : prev.nextSupervisorMemberId
                }))
              }
              getOptionLabel={option => option.displayName}
              isOptionEqualToValue={(option, value) => option.memberId === value.memberId}
              renderOption={(props, option) => (
                <Box component='li' {...props} key={option.memberId}>
                  <MemberChoiceRow option={option} />
                </Box>
              )}
              renderInput={params => (
                <CustomTextField
                  {...params}
                  label='Supervisor actual'
                  placeholder='Persona a reemplazar'
                  size='small'
                  error={Boolean(bulkCurrentSupervisorError)}
                  helperText={bulkCurrentSupervisorError || 'Se reasignan los reportes directos de esta persona.'}
                />
              )}
            />

            <Autocomplete
              disablePortal
              options={bulkSupervisorOptions}
              value={bulkNextSupervisorValue}
              onChange={(_, value) => setBulkForm(prev => ({ ...prev, nextSupervisorMemberId: value?.memberId ?? '' }))}
              getOptionLabel={option => option.displayName}
              isOptionEqualToValue={(option, value) => option.memberId === value.memberId}
              renderOption={(props, option) => (
                <Box component='li' {...props} key={option.memberId}>
                  <MemberChoiceRow option={option} />
                </Box>
              )}
              renderInput={params => (
                <CustomTextField
                  {...params}
                  label='Nuevo supervisor'
                  placeholder='Sin supervisor'
                  size='small'
                  helperText='Deja vacío para cortar la cadena de supervisión.'
                />
              )}
            />

            <CustomTextField
              fullWidth
              size='small'
              label='Razón'
              multiline
              minRows={3}
              value={bulkForm.reason}
              onChange={event => setBulkForm(prev => ({ ...prev, reason: event.target.value }))}
              error={Boolean(bulkReasonError)}
              helperText={bulkReasonError || 'Describe por qué se mueve el equipo.'}
            />

            <CustomTextField
              fullWidth
              size='small'
              label='Vigente desde'
              type='date'
              value={bulkForm.effectiveFrom}
              onChange={event => setBulkForm(prev => ({ ...prev, effectiveFrom: event.target.value }))}
              InputLabelProps={{ shrink: true }}
              helperText='La reasignación entra en vigor en esta fecha.'
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant='text' color='secondary' onClick={() => setBulkDialogOpen(false)}>{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button variant='contained' onClick={() => void submitBulkReassign()} disabled={savingAction === 'bulk'}>
            {savingAction === 'bulk' ? <CircularProgress size={18} color='inherit' /> : 'Reasignar reportes'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={delegationDialogOpen}
        onClose={() => setDelegationDialogOpen(false)}
        maxWidth='sm'
        fullWidth
        closeAfterTransition={false}
      >
        <DialogTitle>Nueva delegación temporal</DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Autocomplete
              disablePortal
              options={delegationSupervisorOptions}
              value={delegationSupervisorValue}
              onChange={(_, value) => setDelegationForm(prev => ({ ...prev, supervisorMemberId: value?.memberId ?? '' }))}
              getOptionLabel={option => option.displayName}
              isOptionEqualToValue={(option, value) => option.memberId === value.memberId}
              renderOption={(props, option) => (
                <Box component='li' {...props} key={option.memberId}>
                  <MemberChoiceRow option={option} />
                </Box>
              )}
              renderInput={params => (
                <CustomTextField
                  {...params}
                  label='Supervisor'
                  placeholder='Persona que delega'
                  size='small'
                  helperText='La delegación se registrará sobre esta persona.'
                />
              )}
            />

            <Autocomplete
              disablePortal
              options={memberChoices}
              value={delegationDelegateValue}
              onChange={(_, value) => setDelegationForm(prev => ({ ...prev, delegateMemberId: value?.memberId ?? '' }))}
              getOptionLabel={option => option.displayName}
              isOptionEqualToValue={(option, value) => option.memberId === value.memberId}
              renderOption={(props, option) => (
                <Box component='li' {...props} key={option.memberId}>
                  <MemberChoiceRow option={option} />
                </Box>
              )}
              renderInput={params => (
                <CustomTextField
                  {...params}
                  label='Delegado'
                  placeholder='Persona que recibirá la aprobación'
                  size='small'
                  helperText='La persona elegida podrá actuar temporalmente en nombre del supervisor.'
                />
              )}
            />

            <CustomTextField
              fullWidth
              size='small'
              label='Vigente desde'
              type='date'
              value={delegationForm.effectiveFrom}
              onChange={event => setDelegationForm(prev => ({ ...prev, effectiveFrom: event.target.value }))}
              InputLabelProps={{ shrink: true }}
            />

            <CustomTextField
              fullWidth
              size='small'
              label='Vigente hasta'
              type='date'
              value={delegationForm.effectiveTo}
              onChange={event => setDelegationForm(prev => ({ ...prev, effectiveTo: event.target.value }))}
              InputLabelProps={{ shrink: true }}
              helperText='Opcional. Si lo dejas vacío, la delegación queda abierta hasta que la revocas.'
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant='text' color='secondary' onClick={() => setDelegationDialogOpen(false)}>{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button
            variant='contained'
            onClick={() => void submitDelegation()}
            disabled={!canSubmitDelegation || savingAction === 'delegation'}
          >
            {savingAction === 'delegation' ? <CircularProgress size={18} color='inherit' /> : 'Crear delegación'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

export default HrHierarchyView
