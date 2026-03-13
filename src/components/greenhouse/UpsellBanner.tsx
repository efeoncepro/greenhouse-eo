'use client'

import Button from '@mui/material/Button'
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
      spacing={1.5}
      sx={{
        p: 2.5,
        borderRadius: 3,
        bgcolor: GH_COLORS.semantic.warning.bg,
        border: `1px solid ${alpha(GH_COLORS.semantic.warning.source, 0.24)}`
      }}
    >
      <Typography variant='subtitle2' sx={{ color: GH_COLORS.role.media.textDark }}>
        {GH_TEAM.cta_title.replace('{percent}', String(utilizationPercent))}
      </Typography>
      <Typography variant='body2' sx={{ color: GH_COLORS.semantic.warning.text }}>
        {GH_TEAM.cta_subtitle}
      </Typography>
      <Button
        variant='outlined'
        onClick={onRequest}
        sx={{
          alignSelf: 'flex-start',
          color: GH_COLORS.semantic.warning.text,
          borderColor: GH_COLORS.semantic.warning.source
        }}
      >
        {GH_TEAM.cta_button}
      </Button>
    </Stack>
  )
}

export default UpsellBanner
