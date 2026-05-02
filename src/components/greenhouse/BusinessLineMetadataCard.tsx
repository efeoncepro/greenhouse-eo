'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'

import { BrandWordmark } from '@/components/greenhouse'
import type { BusinessLineMetadata } from '@/types/business-line'

type Props = {
  metadata: BusinessLineMetadata
  onClick?: (metadata: BusinessLineMetadata) => void
}

const BusinessLineMetadataCard = ({ metadata, onClick }: Props) => {
  return (
    <Box
      onClick={onClick ? () => onClick(metadata) : undefined}
      sx={{
        p: 3,
        height: '100%',
        borderRadius: 3,
        border: theme => `1px solid ${theme.palette.divider}`,
        borderLeftColor: metadata.colorHex,
        borderLeftWidth: 4,
        borderLeftStyle: 'solid',
        bgcolor: 'background.paper',
        transition: 'box-shadow 0.2s',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { boxShadow: 2 } : undefined
      }}
    >
      <Stack spacing={2}>
        {/* Header: wordmark + loop phase */}
        <Stack direction='row' justifyContent='space-between' alignItems='flex-start' gap={2}>
          <Stack spacing={0.5}>
            <Box sx={{ minHeight: 26, display: 'flex', alignItems: 'center' }}>
              <BrandWordmark brand={metadata.label} height={22} maxWidth={120} />
            </Box>
            {metadata.loopPhaseLabel && (
              <CustomChip
                round='true'
                size='small'
                variant='tonal'
                color='secondary'
                label={metadata.loopPhaseLabel}
              />
            )}
          </Stack>
          {/* Color swatch */}
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 2,
              bgcolor: metadata.colorHex,
              border: theme => `1px solid ${alpha(theme.palette.common.black, 0.08)}`,
              flexShrink: 0
            }}
          />
        </Stack>

        {/* Claim */}
        {metadata.claim && (
          <Typography variant='subtitle2' fontStyle='italic' color='text.secondary'>
            {metadata.claim}
          </Typography>
        )}

        {/* Lead */}
        {metadata.leadName && (
          <Stack direction='row' spacing={1} alignItems='center'>
            <i className='tabler-user text-base' style={{ color: metadata.colorHex }} />
            <Typography variant='body2' color='text.secondary'>
              {metadata.leadName}
            </Typography>
          </Stack>
        )}

        {/* Description */}
        {metadata.description && (
          <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.6 }}>
            {metadata.description}
          </Typography>
        )}

        {/* Footer: module_code + icon */}
        <Stack direction='row' justifyContent='space-between' alignItems='center'>
          <Typography variant='monoId' color='text.disabled'>
            {metadata.moduleCode}
          </Typography>
          {metadata.iconName && (
            <i className={`tabler-${metadata.iconName} text-base`} style={{ color: metadata.colorHex, opacity: 0.6 }} />
          )}
        </Stack>
      </Stack>
    </Box>
  )
}

export default BusinessLineMetadataCard
