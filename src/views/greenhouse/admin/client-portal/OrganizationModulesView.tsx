'use client'

import { useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import DataTableShell from '@/components/greenhouse/data-table/DataTableShell'
import EmptyState from '@/components/greenhouse/EmptyState'
import { GH_CLIENT_PORTAL_ADMIN } from '@/lib/copy/client-portal-admin'

/**
 * TASK-826 Slice 7 — UI admin para gestión de module_assignments per organization.
 *
 * Surface canónica EFEONCE_ADMIN. Layout per guidance greenhouse-ux + modern-ui:
 *
 *   - Card outlined con CardHeader title + subtitle + CTA primario "Habilitar módulo"
 *   - Tabla con chip status (tonal + iconos) y 3-dot menu de acciones por row
 *   - Dialog Enable con form base + Switch override expandible (warning Alert)
 *   - Confirm dialogs para destructive ops (expire, churn-with-typing-confirm)
 *   - Sonner toast feedback + optimistic refresh
 */

interface AssignmentItem {
  assignmentId: string
  organizationId: string
  moduleKey: string
  moduleDisplayLabel: string | null
  moduleApplicabilityScope: string | null
  moduleTier: string | null
  status: string
  source: string
  effectiveFrom: string | null
  effectiveTo: string | null
  expiresAt: string | null
  approvedByUserId: string | null
  approvedAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

interface CatalogOption {
  moduleKey: string
  displayLabel: string
  applicabilityScope: string
  tier: string
}

interface OrganizationModulesViewProps {
  organizationId: string
  organizationName: string
  initialAssignments: AssignmentItem[]
  catalog: CatalogOption[]
}

const STATUS_CHIP: Record<
  string,
  { label: string; color: 'default' | 'success' | 'warning' | 'info' | 'error' }
> = {
  pending: { label: GH_CLIENT_PORTAL_ADMIN.status_label_pending, color: 'default' },
  active: { label: GH_CLIENT_PORTAL_ADMIN.status_label_active, color: 'success' },
  pilot: { label: GH_CLIENT_PORTAL_ADMIN.status_label_pilot, color: 'warning' },
  paused: { label: GH_CLIENT_PORTAL_ADMIN.status_label_paused, color: 'info' },
  expired: { label: GH_CLIENT_PORTAL_ADMIN.status_label_expired, color: 'default' },
  churned: { label: GH_CLIENT_PORTAL_ADMIN.status_label_churned, color: 'error' }
}

const SOURCE_LABEL: Record<string, string> = {
  lifecycle_case_provision: GH_CLIENT_PORTAL_ADMIN.source_label_lifecycle_case_provision,
  commercial_terms_cascade: GH_CLIENT_PORTAL_ADMIN.source_label_commercial_terms_cascade,
  manual_admin: GH_CLIENT_PORTAL_ADMIN.source_label_manual_admin,
  self_service_request: GH_CLIENT_PORTAL_ADMIN.source_label_self_service_request,
  migration_backfill: GH_CLIENT_PORTAL_ADMIN.source_label_migration_backfill,
  default_business_line: GH_CLIENT_PORTAL_ADMIN.source_label_default_business_line
}

const isTerminal = (status: string) => status === 'expired' || status === 'churned'

const todayIso = () => new Date().toISOString().slice(0, 10)

type DialogState =
  | { kind: 'closed' }
  | { kind: 'enable' }
  | { kind: 'pause' | 'resume' | 'expire'; assignment: AssignmentItem }
  | { kind: 'churn'; assignment: AssignmentItem; typedConfirm: string }

const OrganizationModulesView = ({
  organizationId,
  organizationName,
  initialAssignments,
  catalog
}: OrganizationModulesViewProps) => {
  const [assignments, setAssignments] = useState<AssignmentItem[]>(initialAssignments)
  const [dialog, setDialog] = useState<DialogState>({ kind: 'closed' })
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; row: AssignmentItem } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Enable form state
  const [enableForm, setEnableForm] = useState({
    moduleKey: '',
    source: 'manual_admin',
    status: 'active' as 'pending' | 'active' | 'pilot',
    effectiveFrom: todayIso(),
    expiresAt: '',
    reason: '',
    overrideEnabled: false,
    overrideReason: ''
  })

  const [enableError, setEnableError] = useState<string | null>(null)

  const resetEnableForm = () => {
    setEnableForm({
      moduleKey: '',
      source: 'manual_admin',
      status: 'active',
      effectiveFrom: todayIso(),
      expiresAt: '',
      reason: '',
      overrideEnabled: false,
      overrideReason: ''
    })
    setEnableError(null)
  }

  const subtitle = useMemo(
    () => GH_CLIENT_PORTAL_ADMIN.modules_subtitle_template(organizationName),
    [organizationName]
  )

  const refreshAssignments = async () => {
    try {
      const res = await fetch(
        `/api/admin/client-portal/organizations/${organizationId}/modules`,
        { cache: 'no-store' }
      )

      if (!res.ok) return
      const json = (await res.json()) as { items: AssignmentItem[] }

      setAssignments(json.items)
    } catch {
      // Silent — table optimistic state already shows latest local view
    }
  }

  const handleEnableSubmit = async () => {
    setEnableError(null)

    if (!enableForm.moduleKey) {
      setEnableError(GH_CLIENT_PORTAL_ADMIN.error_validation_required_field_template('Módulo'))

      return
    }

    if (enableForm.status === 'pilot' && !enableForm.expiresAt) {
      setEnableError(
        GH_CLIENT_PORTAL_ADMIN.error_validation_required_field_template('Fecha de expiración')
      )

      return
    }

    if (enableForm.overrideEnabled && enableForm.overrideReason.trim().length < 20) {
      setEnableError('La razón del override debe tener al menos 20 caracteres.')

      return
    }

    setSubmitting(true)

    try {
      const res = await fetch(
        `/api/admin/client-portal/organizations/${organizationId}/modules`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            moduleKey: enableForm.moduleKey,
            source: enableForm.source,
            status: enableForm.status,
            effectiveFrom: enableForm.effectiveFrom,
            expiresAt: enableForm.expiresAt
              ? new Date(`${enableForm.expiresAt}T00:00:00Z`).toISOString()
              : undefined,
            reason: enableForm.reason.trim() || undefined,
            overrideBusinessLineMismatch: enableForm.overrideEnabled,
            overrideReason: enableForm.overrideEnabled ? enableForm.overrideReason.trim() : undefined
          })
        }
      )

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 403 && json?.details?.moduleApplicabilityScope) {
          // BusinessLineMismatch — auto-enable override switch and show inline alert
          setEnableForm(prev => ({ ...prev, overrideEnabled: true }))
          setEnableError(GH_CLIENT_PORTAL_ADMIN.error_business_line_mismatch)

          return
        }

        setEnableError(json?.error || GH_CLIENT_PORTAL_ADMIN.error_load_failed)

        return
      }

      toast.success(
        json?.idempotent
          ? GH_CLIENT_PORTAL_ADMIN.feedback_idempotent_noop
          : GH_CLIENT_PORTAL_ADMIN.feedback_module_enabled
      )

      setDialog({ kind: 'closed' })
      resetEnableForm()
      await refreshAssignments()
    } catch (error) {
      setEnableError(
        error instanceof Error ? error.message : GH_CLIENT_PORTAL_ADMIN.error_load_failed
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handlePatchOperation = async (
    assignmentId: string,
    operation: 'pause' | 'resume' | 'expire' | 'churn',
    feedbackKey: keyof typeof GH_CLIENT_PORTAL_ADMIN
  ) => {
    setSubmitting(true)

    try {
      const res = await fetch(`/api/admin/client-portal/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation })
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast.error(json?.error || GH_CLIENT_PORTAL_ADMIN.error_action_failed_template(operation))

        return
      }

      toast.success(
        json?.idempotent
          ? GH_CLIENT_PORTAL_ADMIN.feedback_idempotent_noop
          : (GH_CLIENT_PORTAL_ADMIN[feedbackKey] as string)
      )

      setDialog({ kind: 'closed' })
      await refreshAssignments()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : GH_CLIENT_PORTAL_ADMIN.error_action_failed_template(operation)
      )
    } finally {
      setSubmitting(false)
    }
  }

  const closeMenu = () => setMenuAnchor(null)

  const handleMenuItemAction = (
    operation: 'pause' | 'resume' | 'expire' | 'churn',
    row: AssignmentItem
  ) => {
    closeMenu()

    if (operation === 'churn') {
      setDialog({ kind: 'churn', assignment: row, typedConfirm: '' })

      return
    }

    setDialog({ kind: operation, assignment: row })
  }

  return (
    <Stack spacing={3}>
      <Card variant='outlined'>
        <CardHeader
          title={GH_CLIENT_PORTAL_ADMIN.modules_title}
          subheader={subtitle}
          action={
            <Button
              variant='contained'
              onClick={() => setDialog({ kind: 'enable' })}
              startIcon={<i className='tabler-plus' />}
            >
              {GH_CLIENT_PORTAL_ADMIN.action_enable}
            </Button>
          }
        />
        <CardContent>
          {assignments.length === 0 ? (
            <EmptyState
              title={GH_CLIENT_PORTAL_ADMIN.modules_empty_title}
              description={GH_CLIENT_PORTAL_ADMIN.modules_empty_body}
              action={
                <Button
                  variant='contained'
                  startIcon={<i className='tabler-plus' />}
                  onClick={() => setDialog({ kind: 'enable' })}
                >
                  {GH_CLIENT_PORTAL_ADMIN.action_enable}
                </Button>
              }
            />
          ) : (
            <DataTableShell
              identifier='client-portal-org-modules'
              ariaLabel={`Module assignments para ${organizationName}`}
            >
              <Table size='small'>
                <caption className='sr-only'>
                  Module assignments para {organizationName}
                </caption>
                <TableHead>
                  <TableRow>
                    <TableCell scope='col'>{GH_CLIENT_PORTAL_ADMIN.column_module}</TableCell>
                    <TableCell scope='col'>{GH_CLIENT_PORTAL_ADMIN.column_status}</TableCell>
                    <TableCell scope='col'>{GH_CLIENT_PORTAL_ADMIN.column_source}</TableCell>
                    <TableCell scope='col'>{GH_CLIENT_PORTAL_ADMIN.column_applicability}</TableCell>
                    <TableCell scope='col'>{GH_CLIENT_PORTAL_ADMIN.column_tier}</TableCell>
                    <TableCell scope='col'>{GH_CLIENT_PORTAL_ADMIN.column_effective_from}</TableCell>
                    <TableCell scope='col'>{GH_CLIENT_PORTAL_ADMIN.column_expires_at}</TableCell>
                    <TableCell scope='col' align='right'>
                      {GH_CLIENT_PORTAL_ADMIN.column_actions}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assignments.map(row => {
                    const statusChip = STATUS_CHIP[row.status] ?? {
                      label: row.status,
                      color: 'default' as const
                    }

                    return (
                      <TableRow key={row.assignmentId} hover>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography variant='body2' fontWeight={500}>
                              {row.moduleDisplayLabel ?? row.moduleKey}
                            </Typography>
                            <Box component='code' sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                              {row.moduleKey}
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={statusChip.label}
                            size='small'
                            color={statusChip.color}
                            variant='outlined'
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant='caption' color='text.secondary'>
                            {SOURCE_LABEL[row.source] ?? row.source}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={row.moduleApplicabilityScope ?? '—'}
                            size='small'
                            variant='outlined'
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant='caption'>{row.moduleTier ?? '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant='caption'>
                            {row.effectiveFrom ? row.effectiveFrom.slice(0, 10) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant='caption'>
                            {row.expiresAt ? row.expiresAt.slice(0, 10) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align='right'>
                          <IconButton
                            size='small'
                            aria-label={`Acciones para ${row.moduleKey}`}
                            onClick={e => setMenuAnchor({ el: e.currentTarget, row })}
                            disabled={isTerminal(row.status)}
                          >
                            <i className='tabler-dots-vertical' />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </DataTableShell>
          )}
        </CardContent>
      </Card>

      {/* Actions menu */}
      <Menu
        anchorEl={menuAnchor?.el ?? null}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {menuAnchor && menuAnchor.row.status === 'active' && (
          <MenuItem onClick={() => handleMenuItemAction('pause', menuAnchor.row)}>
            <i className='tabler-player-pause' style={{ marginRight: 8 }} />
            {GH_CLIENT_PORTAL_ADMIN.action_pause}
          </MenuItem>
        )}
        {menuAnchor && menuAnchor.row.status === 'paused' && (
          <MenuItem onClick={() => handleMenuItemAction('resume', menuAnchor.row)}>
            <i className='tabler-player-play' style={{ marginRight: 8 }} />
            {GH_CLIENT_PORTAL_ADMIN.action_resume}
          </MenuItem>
        )}
        {menuAnchor &&
          ['active', 'pilot', 'paused', 'pending'].includes(menuAnchor.row.status) && (
            <MenuItem onClick={() => handleMenuItemAction('expire', menuAnchor.row)}>
              <i className='tabler-circle-x' style={{ marginRight: 8 }} />
              {GH_CLIENT_PORTAL_ADMIN.action_expire}
            </MenuItem>
          )}
        {menuAnchor && (
          <MenuItem
            onClick={() => handleMenuItemAction('churn', menuAnchor.row)}
            sx={{ color: 'error.main' }}
          >
            <i className='tabler-arrow-down-right' style={{ marginRight: 8 }} />
            {GH_CLIENT_PORTAL_ADMIN.action_churn}
          </MenuItem>
        )}
      </Menu>

      {/* Enable dialog */}
      <Dialog
        open={dialog.kind === 'enable'}
        onClose={() => !submitting && setDialog({ kind: 'closed' })}
        maxWidth='sm'
        fullWidth
        aria-labelledby='enable-dialog-title'
      >
        <DialogTitle id='enable-dialog-title'>
          {GH_CLIENT_PORTAL_ADMIN.enable_dialog_title}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Typography variant='body2' color='text.secondary'>
              {GH_CLIENT_PORTAL_ADMIN.enable_dialog_subtitle}
            </Typography>

            <TextField
              select
              required
              label={GH_CLIENT_PORTAL_ADMIN.enable_module_key_label}
              value={enableForm.moduleKey}
              onChange={e => setEnableForm(prev => ({ ...prev, moduleKey: e.target.value }))}
              fullWidth
            >
              <MenuItem value='' disabled>
                Selecciona…
              </MenuItem>
              {catalog.map(opt => (
                <MenuItem key={opt.moduleKey} value={opt.moduleKey}>
                  {opt.displayLabel}{' '}
                  <Typography component='span' variant='caption' color='text.secondary' sx={{ ml: 1 }}>
                    ({opt.applicabilityScope} · {opt.tier})
                  </Typography>
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              required
              label={GH_CLIENT_PORTAL_ADMIN.enable_source_label}
              value={enableForm.source}
              onChange={e => setEnableForm(prev => ({ ...prev, source: e.target.value }))}
              fullWidth
            >
              {Object.entries(SOURCE_LABEL).map(([key, label]) => (
                <MenuItem key={key} value={key}>
                  {label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label={GH_CLIENT_PORTAL_ADMIN.enable_status_label}
              value={enableForm.status}
              onChange={e =>
                setEnableForm(prev => ({
                  ...prev,
                  status: e.target.value as typeof prev.status
                }))
              }
              fullWidth
            >
              <MenuItem value='active'>{GH_CLIENT_PORTAL_ADMIN.status_label_active}</MenuItem>
              <MenuItem value='pilot'>{GH_CLIENT_PORTAL_ADMIN.status_label_pilot}</MenuItem>
              <MenuItem value='pending'>{GH_CLIENT_PORTAL_ADMIN.status_label_pending}</MenuItem>
            </TextField>

            <TextField
              type='date'
              label={GH_CLIENT_PORTAL_ADMIN.enable_effective_from_label}
              value={enableForm.effectiveFrom}
              onChange={e => setEnableForm(prev => ({ ...prev, effectiveFrom: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <TextField
              type='date'
              label={GH_CLIENT_PORTAL_ADMIN.enable_expires_at_label}
              value={enableForm.expiresAt}
              onChange={e => setEnableForm(prev => ({ ...prev, expiresAt: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              helperText={
                enableForm.status === 'pilot'
                  ? GH_CLIENT_PORTAL_ADMIN.enable_expires_at_helper_pilot
                  : undefined
              }
              fullWidth
            />

            <TextField
              label={GH_CLIENT_PORTAL_ADMIN.enable_reason_label}
              value={enableForm.reason}
              onChange={e => setEnableForm(prev => ({ ...prev, reason: e.target.value }))}
              multiline
              minRows={2}
              fullWidth
            />

            <Divider />

            <FormControlLabel
              control={
                <Switch
                  checked={enableForm.overrideEnabled}
                  onChange={(_, checked) =>
                    setEnableForm(prev => ({ ...prev, overrideEnabled: checked }))
                  }
                />
              }
              label={GH_CLIENT_PORTAL_ADMIN.enable_override_toggle}
            />

            {enableForm.overrideEnabled && (
              <Stack spacing={2}>
                <Alert severity='warning' icon={<i className='tabler-alert-triangle' />}>
                  {GH_CLIENT_PORTAL_ADMIN.enable_override_help}
                </Alert>
                <TextField
                  required
                  label={GH_CLIENT_PORTAL_ADMIN.enable_override_reason_label}
                  value={enableForm.overrideReason}
                  onChange={e =>
                    setEnableForm(prev => ({ ...prev, overrideReason: e.target.value }))
                  }
                  multiline
                  minRows={3}
                  fullWidth
                  helperText={`${enableForm.overrideReason.trim().length} / 20`}
                />
              </Stack>
            )}

            {enableError && <Alert severity='error'>{enableError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDialog({ kind: 'closed' })
              resetEnableForm()
            }}
            disabled={submitting}
          >
            {GH_CLIENT_PORTAL_ADMIN.action_cancel}
          </Button>
          <Button
            onClick={handleEnableSubmit}
            variant='contained'
            disabled={submitting || !enableForm.moduleKey}
          >
            {GH_CLIENT_PORTAL_ADMIN.action_confirm}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pause / Resume / Expire confirm */}
      <Dialog
        open={dialog.kind === 'pause' || dialog.kind === 'resume' || dialog.kind === 'expire'}
        onClose={() => !submitting && setDialog({ kind: 'closed' })}
        maxWidth='xs'
        fullWidth
        aria-labelledby='confirm-dialog-title'
      >
        {(dialog.kind === 'pause' || dialog.kind === 'resume' || dialog.kind === 'expire') && (
          <>
            <DialogTitle id='confirm-dialog-title'>
              {dialog.kind === 'pause' && GH_CLIENT_PORTAL_ADMIN.confirm_pause_title}
              {dialog.kind === 'resume' && GH_CLIENT_PORTAL_ADMIN.confirm_resume_title}
              {dialog.kind === 'expire' && GH_CLIENT_PORTAL_ADMIN.confirm_expire_title}
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ pt: 1 }}>
                <Alert severity={dialog.kind === 'expire' ? 'warning' : 'info'}>
                  {dialog.kind === 'pause' && GH_CLIENT_PORTAL_ADMIN.confirm_pause_body}
                  {dialog.kind === 'resume' && GH_CLIENT_PORTAL_ADMIN.confirm_resume_body}
                  {dialog.kind === 'expire' && GH_CLIENT_PORTAL_ADMIN.confirm_expire_body}
                </Alert>
                <Box>
                  <Typography variant='caption' color='text.secondary'>
                    Módulo:
                  </Typography>
                  <Typography variant='body2'>
                    {dialog.assignment.moduleDisplayLabel ?? dialog.assignment.moduleKey}
                  </Typography>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialog({ kind: 'closed' })} disabled={submitting}>
                {GH_CLIENT_PORTAL_ADMIN.action_cancel}
              </Button>
              <Button
                variant='contained'
                color={dialog.kind === 'expire' ? 'warning' : 'primary'}
                disabled={submitting}
                onClick={() => {
                  const feedbackMap = {
                    pause: 'feedback_module_paused' as const,
                    resume: 'feedback_module_resumed' as const,
                    expire: 'feedback_module_expired' as const
                  }

                  handlePatchOperation(dialog.assignment.assignmentId, dialog.kind, feedbackMap[dialog.kind])
                }}
              >
                {GH_CLIENT_PORTAL_ADMIN.action_confirm}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Churn confirm with typing */}
      <Dialog
        open={dialog.kind === 'churn'}
        onClose={() => !submitting && setDialog({ kind: 'closed' })}
        maxWidth='sm'
        fullWidth
        aria-labelledby='churn-dialog-title'
      >
        {dialog.kind === 'churn' && (
          <>
            <DialogTitle id='churn-dialog-title'>
              {GH_CLIENT_PORTAL_ADMIN.confirm_churn_title}
            </DialogTitle>
            <DialogContent>
              <Stack spacing={3} sx={{ pt: 1 }}>
                <Alert severity='error' icon={<i className='tabler-alert-triangle' />}>
                  {GH_CLIENT_PORTAL_ADMIN.confirm_churn_body}
                </Alert>
                <Box>
                  <Typography variant='caption' color='text.secondary'>
                    Módulo:
                  </Typography>
                  <Typography variant='body2' fontWeight={500}>
                    {dialog.assignment.moduleDisplayLabel ?? dialog.assignment.moduleKey}
                  </Typography>
                  <Box component='code' sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}>
                    {dialog.assignment.moduleKey}
                  </Box>
                </Box>
                <TextField
                  label={GH_CLIENT_PORTAL_ADMIN.confirm_churn_typing_label}
                  value={dialog.typedConfirm}
                  onChange={e =>
                    setDialog({ ...dialog, typedConfirm: e.target.value })
                  }
                  fullWidth
                  autoFocus
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialog({ kind: 'closed' })} disabled={submitting}>
                {GH_CLIENT_PORTAL_ADMIN.action_cancel}
              </Button>
              <Button
                variant='contained'
                color='error'
                disabled={submitting || dialog.typedConfirm !== dialog.assignment.moduleKey}
                onClick={() =>
                  handlePatchOperation(
                    dialog.assignment.assignmentId,
                    'churn',
                    'feedback_module_churned'
                  )
                }
              >
                {GH_CLIENT_PORTAL_ADMIN.action_confirm}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Stack>
  )
}

export default OrganizationModulesView
