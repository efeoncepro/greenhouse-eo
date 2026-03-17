'use client'

import { useCallback, useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import { GH_AGENCY, GH_COLORS } from '@/config/greenhouse-nomenclature'
import { CSC_PHASE_LABELS, type CscPhase } from '@/lib/ico-engine/metric-registry'

// ─── Types ──────────────────────────────────────────────────────────────────

interface StuckAsset {
  taskSourceId: string
  taskName: string
  spaceId: string
  projectSourceId: string | null
  faseCsc: string
  hoursSinceUpdate: number
  daysSinceUpdate: number
  severity: 'warning' | 'danger'
}

type Props = {
  open: boolean
  spaceId: string
  onClose: () => void
}

// ─── Component ──────────────────────────────────────────────────────────────

const StuckAssetsDrawer = ({ open, spaceId, onClose }: Props) => {
  const [assets, setAssets] = useState<StuckAsset[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAssets = useCallback(async () => {
    if (!spaceId) return

    setLoading(true)

    try {
      const res = await fetch(`/api/ico-engine/stuck-assets?spaceId=${encodeURIComponent(spaceId)}`)

      if (res.ok) {
        const data = await res.json()

        setAssets(data.assets ?? [])
      }
    } catch {
      setAssets([])
    } finally {
      setLoading(false)
    }
  }, [spaceId])

  useEffect(() => {
    if (open) fetchAssets()
  }, [open, fetchAssets])

  const COL = {
    color: GH_COLORS.neutral.textSecondary,
    fontSize: '0.7rem',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em'
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}
    >
      {/* Header */}
      <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ p: 3 }}>
        <Stack>
          <Typography variant='h6' sx={{ fontWeight: 600, color: GH_COLORS.neutral.textPrimary }}>
            {GH_AGENCY.ico_stuck_drawer_title}
          </Typography>
          <Typography variant='body2' sx={{ color: GH_COLORS.neutral.textSecondary }}>
            {spaceId}
          </Typography>
        </Stack>
        <IconButton onClick={onClose} aria-label='Cerrar'>
          <i className='tabler-x' />
        </IconButton>
      </Stack>

      <Divider />

      {/* Content */}
      <Box sx={{ p: 3, overflow: 'auto', flex: 1 }}>
        {loading ? (
          <Stack spacing={2}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant='rounded' height={56} />
            ))}
          </Stack>
        ) : assets.length === 0 ? (
          <Stack alignItems='center' justifyContent='center' sx={{ py: 8 }} role='status'>
            <i className='tabler-check-circle' style={{ fontSize: '2.5rem', color: GH_COLORS.semaphore.green.source }} />
            <Typography variant='body2' sx={{ color: GH_COLORS.neutral.textSecondary, mt: 2, textAlign: 'center' }}>
              {GH_AGENCY.ico_stuck_empty}
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={0}>
            {/* Column headers */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1.5fr 80px 70px 70px', px: 1, py: 1, gap: 1 }}>
              <Typography sx={COL}>{GH_AGENCY.ico_stuck_col_task}</Typography>
              <Typography sx={COL}>{GH_AGENCY.ico_stuck_col_phase}</Typography>
              <Typography sx={COL}>{GH_AGENCY.ico_stuck_col_days}</Typography>
              <Typography sx={COL}>{GH_AGENCY.ico_stuck_col_severity}</Typography>
            </Box>

            <Divider />

            {/* Rows */}
            {assets.map((asset, idx) => (
              <Box key={asset.taskSourceId}>
                {idx > 0 && <Divider />}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 80px 70px 70px',
                    alignItems: 'center',
                    px: 1,
                    py: 1.5,
                    gap: 1,
                    '&:hover': { bgcolor: GH_COLORS.neutral.bgSurface }
                  }}
                >
                  {/* Task name */}
                  <Typography variant='body2' noWrap sx={{ fontWeight: 500, color: GH_COLORS.neutral.textPrimary }}>
                    {asset.taskName || asset.taskSourceId}
                  </Typography>

                  {/* CSC Phase */}
                  <Typography variant='caption' sx={{ color: GH_COLORS.neutral.textSecondary }}>
                    {CSC_PHASE_LABELS[asset.faseCsc as CscPhase] ?? asset.faseCsc}
                  </Typography>

                  {/* Days stuck */}
                  <Typography variant='body2' sx={{ fontWeight: 500, color: GH_COLORS.neutral.textPrimary }}>
                    {asset.daysSinceUpdate}d
                  </Typography>

                  {/* Severity */}
                  <CustomChip
                    round='true'
                    size='small'
                    color={asset.severity === 'danger' ? 'error' : 'warning'}
                    variant='tonal'
                    label={asset.severity === 'danger' ? GH_AGENCY.ico_stuck_severity_danger : GH_AGENCY.ico_stuck_severity_warning}
                    sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600 }}
                  />
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Drawer>
  )
}

export default StuckAssetsDrawer
