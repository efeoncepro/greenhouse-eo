'use client'

import { useCallback } from 'react'

import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import { GH_RELEASE_ADMIN } from '@/lib/copy/release-admin'
import { formatDateTime } from '@/lib/format'
import CustomChip from '@core/components/mui/Chip'
import type { ReleaseManifest } from '@/lib/release/manifest-store'
import type { ReleaseState } from '@/lib/release/state-machine'

/**
 * TASK-854 Slice 1 — Drawer manifest viewer para /admin/releases.
 *
 * Anchor right, width 480px desktop / 100% mobile. Sticky header con título +
 * close button. Sections: estado, metadata, comando rollback con copy-to-clipboard.
 *
 * Microinteractions canonical (greenhouse-microinteractions-auditor):
 *  - Focus trap automático MUI Drawer
 *  - Escape cierra
 *  - Toast feedback en copy success (3s auto-dismiss)
 *  - aria-labelledby drawer title
 */

const STATE_CHIP_COLOR: Record<ReleaseState, 'success' | 'warning' | 'error' | 'info'> = {
  preflight: 'info',
  ready: 'info',
  deploying: 'info',
  verifying: 'info',
  released: 'success',
  degraded: 'warning',
  aborted: 'error',
  rolled_back: 'error'
}

const STATE_CHIP_LABEL: Record<ReleaseState, string> = {
  preflight: GH_RELEASE_ADMIN.state_label_preflight,
  ready: GH_RELEASE_ADMIN.state_label_ready,
  deploying: GH_RELEASE_ADMIN.state_label_deploying,
  verifying: GH_RELEASE_ADMIN.state_label_verifying,
  released: GH_RELEASE_ADMIN.state_label_released,
  degraded: GH_RELEASE_ADMIN.state_label_degraded,
  aborted: GH_RELEASE_ADMIN.state_label_aborted,
  rolled_back: GH_RELEASE_ADMIN.state_label_rolled_back
}

const formatDurationLabel = (startedAt: string, completedAt: string | null): string => {
  if (!completedAt) return GH_RELEASE_ADMIN.duration_pending

  const ms = Date.parse(completedAt) - Date.parse(startedAt)

  if (!Number.isFinite(ms) || ms < 0) return GH_RELEASE_ADMIN.duration_pending

  const minutes = Math.round(ms / 60_000)

  if (minutes < 1) return '<1 min'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60

  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`
}

interface MetadataRowProps {
  label: string
  value: string | null
}

const MetadataRow = ({ label, value }: MetadataRowProps) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      py: 1.5,
      gap: 2
    }}
  >
    <Typography
      variant='body2'
      color='text.secondary'
      sx={{ minWidth: 140, flexShrink: 0 }}
    >
      {label}
    </Typography>
    <Typography
      variant='body2'
      sx={{
        textAlign: 'right',
        wordBreak: 'break-all',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '0.02em'
      }}
    >
      {value ?? GH_RELEASE_ADMIN.duration_pending}
    </Typography>
  </Box>
)

interface ReleaseDrawerProps {
  release: ReleaseManifest | null
  open: boolean
  onClose: () => void
}

const ReleaseDrawer = ({ release, open, onClose }: ReleaseDrawerProps) => {
  const handleCopyRollback = useCallback(async () => {
    if (!release) return
    const command = GH_RELEASE_ADMIN.rollback_command_template(release.releaseId)

    try {
      await navigator.clipboard.writeText(command)
      toast.success(GH_RELEASE_ADMIN.rollback_copy_success, { duration: 3000 })
    } catch {
      // Clipboard API can fail in non-secure contexts; show graceful fallback.
      toast.error('No se pudo copiar al portapapeles')
    }
  }, [release])

  if (!release) return null

  const titleId = 'admin-release-drawer-title'
  const stateColor = STATE_CHIP_COLOR[release.state]
  const stateLabel = STATE_CHIP_LABEL[release.state]
  const rollbackCommand = GH_RELEASE_ADMIN.rollback_command_template(release.releaseId)

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      role='dialog'
      aria-labelledby={titleId}
      aria-modal='true'
      sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 480 } } }}
    >
      <Box sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography
            id={titleId}
            variant='h5'
            sx={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' }}
          >
            {GH_RELEASE_ADMIN.drawer_title_template(release.targetSha)}
          </Typography>
          <IconButton onClick={onClose} aria-label={GH_RELEASE_ADMIN.drawer_close_aria}>
            <i className='tabler-x' aria-hidden='true' />
          </IconButton>
        </Box>

        <Box sx={{ mb: 4 }}>
          <CustomChip
            round='true'
            size='medium'
            label={stateLabel}
            color={stateColor}
            variant='tonal'
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 1, mt: 2 }}>
          {GH_RELEASE_ADMIN.drawer_section_metadata}
        </Typography>

        <MetadataRow label={GH_RELEASE_ADMIN.drawer_release_id} value={release.releaseId} />
        <MetadataRow label={GH_RELEASE_ADMIN.drawer_target_sha} value={release.targetSha} />
        <MetadataRow label={GH_RELEASE_ADMIN.drawer_target_branch} value={release.targetBranch} />
        <MetadataRow label={GH_RELEASE_ADMIN.drawer_source_branch} value={release.sourceBranch} />
        <MetadataRow label={GH_RELEASE_ADMIN.drawer_attempt} value={`#${release.attemptN}`} />
        <MetadataRow label={GH_RELEASE_ADMIN.drawer_triggered_by} value={release.triggeredBy} />
        <MetadataRow label={GH_RELEASE_ADMIN.drawer_started} value={formatDateTime(release.startedAt)} />
        <MetadataRow
          label={GH_RELEASE_ADMIN.drawer_completed}
          value={release.completedAt ? formatDateTime(release.completedAt) : null}
        />
        <MetadataRow
          label={GH_RELEASE_ADMIN.drawer_duration}
          value={formatDurationLabel(release.startedAt, release.completedAt)}
        />

        {release.vercelDeploymentUrl ? (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 1, mt: 2 }}>
              {GH_RELEASE_ADMIN.drawer_section_links}
            </Typography>
            <MetadataRow label={GH_RELEASE_ADMIN.drawer_vercel_url} value={release.vercelDeploymentUrl} />
          </>
        ) : null}

        <Divider sx={{ my: 2 }} />

        <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 1, mt: 2 }}>
          {GH_RELEASE_ADMIN.drawer_section_rollback}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
            p: 2,
            borderRadius: t => t.shape.customBorderRadius?.sm ?? 4,
            bgcolor: 'action.hover',
            mb: 1
          }}
        >
          <Box
            component='code'
            sx={{
              flexGrow: 1,
              fontSize: '0.8rem',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.02em',
              wordBreak: 'break-all'
            }}
          >
            {rollbackCommand}
          </Box>
          <IconButton
            size='small'
            onClick={handleCopyRollback}
            aria-label={GH_RELEASE_ADMIN.rollback_copy_aria}
          >
            <i className='tabler-copy' aria-hidden='true' />
          </IconButton>
        </Box>

        <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
          {GH_RELEASE_ADMIN.rollback_explainer}
        </Typography>
      </Box>
    </Drawer>
  )
}

export default ReleaseDrawer
