'use client'

import Tooltip from '@mui/material/Tooltip'

import CustomChip from '@core/components/mui/Chip'

// TASK-412 — inline chip that marks entries belonging to a reliquidation
// (version > 1). Renders nothing for v1 entries so the default table stays
// visually clean.

interface Props {
  version: number
  reliquidatedAt?: string | null
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return null

  try {
    return new Date(value).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  } catch {
    return null
  }
}

const ReliquidationBadge = ({ version, reliquidatedAt }: Props) => {
  if (version <= 1) return null

  const tooltipText = reliquidatedAt
    ? `Versión ${version} generada el ${formatDate(reliquidatedAt) ?? reliquidatedAt}`
    : `Versión ${version} creada por una reapertura del período.`

  return (
    <Tooltip title={tooltipText}>
      <span>
        <CustomChip
          round='true'
          size='small'
          color='warning'
          label={`v${version} reliquidada`}
          icon={<i className='tabler-arrow-back-up' />}
          sx={{ height: 18, fontSize: '0.65rem' }}
        />
      </span>
    </Tooltip>
  )
}

export default ReliquidationBadge
