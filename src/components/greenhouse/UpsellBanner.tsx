'use client'

import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import { GH_COLORS } from '@/config/greenhouse-nomenclature'
import { GH_TEAM } from '@/lib/copy/client-portal'

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
      sx={theme => ({
        p: 2,
        borderRadius: 3,
        bgcolor: theme.palette.warning.lighterOpacity,
        border: `1px solid ${alpha(theme.palette.warning.main, 0.24)}`
      })}
    >
      <Stack direction='row' spacing={1.5} alignItems='flex-start' sx={{ minWidth: 0 }}>
        <Box
          sx={theme => ({
            width: 36,
            height: 36,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: alpha(theme.palette.warning.main, 0.14),
            color: theme.palette.warning.main,
            flexShrink: 0
          })}
        >
          <i className='tabler-users-plus text-[18px]' />
        </Box>

        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
          <Typography variant='subtitle2' sx={{ color: GH_COLORS.role.media.textDark }}>
            {GH_TEAM.cta_title.replace('{percent}', String(utilizationPercent))}
          </Typography>
          <Typography variant='body2' sx={{ color: theme => theme.palette.warning.main }}>
            {GH_TEAM.cta_subtitle}
          </Typography>
        </Stack>
      </Stack>

      <Button
        variant='outlined'
        onClick={onRequest}
        sx={theme => ({
          alignSelf: { xs: 'stretch', sm: 'center' },
          color: theme.palette.warning.main,
          borderColor: theme.palette.warning.main,
          minWidth: { sm: 190 }
        })}
      >
        {GH_TEAM.cta_button}
      </Button>
    </Stack>
  )
}

export default UpsellBanner
