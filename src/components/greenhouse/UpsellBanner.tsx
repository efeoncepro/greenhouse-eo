'use client'

import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import { GH_COLORS, GH_TEAM } from '@/config/greenhouse-nomenclature'

type UpsellBannerProps = {
  utilizationPercent: number
  onRequest: () => void
}

const UpsellBanner = ({ utilizationPercent, onRequest }: UpsellBannerProps) => {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      justifyContent='space-between'
      sx={{
        p: 2,
        borderRadius: 3,
        bgcolor: GH_COLORS.semantic.warning.bg,
        border: `1px solid ${alpha(GH_COLORS.semantic.warning.source, 0.24)}`
      }}
    >
      <Stack direction='row' spacing={1.5} alignItems='flex-start' sx={{ minWidth: 0 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: alpha(GH_COLORS.semantic.warning.source, 0.14),
            color: GH_COLORS.semantic.warning.text,
            flexShrink: 0
          }}
        >
          <i className='tabler-users-plus text-[18px]' />
        </Box>

        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
          <Typography variant='subtitle2' sx={{ color: GH_COLORS.role.media.textDark }}>
            {GH_TEAM.cta_title.replace('{percent}', String(utilizationPercent))}
          </Typography>
          <Typography variant='body2' sx={{ color: GH_COLORS.semantic.warning.text }}>
            {GH_TEAM.cta_subtitle}
          </Typography>
        </Stack>
      </Stack>

      <Button
        variant='outlined'
        onClick={onRequest}
        sx={{
          alignSelf: { xs: 'stretch', sm: 'center' },
          color: GH_COLORS.semantic.warning.text,
          borderColor: GH_COLORS.semantic.warning.source,
          minWidth: { sm: 190 }
        }}
      >
        {GH_TEAM.cta_button}
      </Button>
    </Stack>
  )
}

export default UpsellBanner
